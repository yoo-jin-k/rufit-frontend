/**
 * 기기 저장의 읽기·쓰기·실패·재시도 상태를 관리합니다.
 * 세대 번호를 비교하여 오래된 저장 응답이 최신 화면 상태를 덮어쓰지 않도록 합니다.
 * 재시도에서는 이미 계산한 저장본을 사용하여 세트 완료 등의 명령을 중복 실행하지 않습니다.
 */
import { emptyArchive, type WorkoutArchive } from './storage.ts';

export type SavePhase = 'loading' | 'load-error' | 'saving' | 'saved' | 'save-error';
export type ArchiveState = {
  archive: WorkoutArchive;
  state: SavePhase;
  ready: boolean;
  retryPending: boolean;
  unsavedAfterFailure: boolean;
  generation: number;
};
export type ArchivePersistence = {
  load(): Promise<WorkoutArchive>;
  save(value: WorkoutArchive): Promise<void>;
};

// 기기 저장의 비동기 상태만 관리합니다. 운동 명령과 표시 문구는 여기에서 해석하지 않습니다.
export function createArchiveState(storage: ArchivePersistence) {
  let snapshot: ArchiveState = {
    archive: emptyArchive(),
    state: 'loading',
    ready: false,
    retryPending: false,
    unsavedAfterFailure: false,
    generation: 0,
  };
  const listeners = new Set<() => void>();
  let active = false;
  let epoch = 0;
  let reading: Promise<WorkoutArchive> | null = null;
  let applyingRead: { epoch: number; promise: Promise<void> } | null = null;
  let latestWrite: { generation: number; promise: Promise<void> } | null = null;
  let retrying: Promise<void> | null = null;
  const current = (run: number) => active && epoch === run;
  const patch = (value: Partial<ArchiveState>) => {
    snapshot = { ...snapshot, ...value };
    listeners.forEach((listener) => listener());
  };
  function read(run: number): Promise<void> {
    if (applyingRead?.epoch === run) return applyingRead.promise;
    if (!reading) {
      const pending = Promise.resolve().then(() => storage.load());
      reading = pending;
      void pending.then(
        () => {
          if (reading === pending) reading = null;
        },
        () => {
          if (reading === pending) reading = null;
        },
      );
    }
    // StrictMode의 effect 재실행은 실제 읽기를 공유하되 현 생명주기만 결과를 받습니다.
    const promise = reading
      .then(
        (archive) => {
          if (current(run) && !snapshot.ready) patch({ archive, ready: true, state: 'saved' });
        },
        () => {
          if (current(run) && !snapshot.ready) patch({ state: 'load-error' });
        },
      )
      .finally(() => {
        if (applyingRead?.promise === promise) applyingRead = null;
      });
    applyingRead = { epoch: run, promise };
    return promise;
  }
  function observeWrite(write: NonNullable<typeof latestWrite>, run: number): Promise<void> {
    return write.promise.then(
      () => {
        if (current(run) && write.generation === snapshot.generation)
          patch({ state: 'saved', unsavedAfterFailure: false });
      },
      () => {
        if (current(run) && write.generation === snapshot.generation)
          patch({ state: 'save-error', unsavedAfterFailure: true });
      },
    );
  }
  function save(archive: WorkoutArchive): Promise<void> {
    const generation = snapshot.generation + 1;
    // 이미 계산한 저장본을 큐에 넣습니다. 재시도에서도 +10초/세트완료를 다시 실행하지 않습니다.
    const write = { generation, promise: Promise.resolve().then(() => storage.save(archive)) };
    latestWrite = write;
    patch({ archive, generation, state: 'saving' });
    return observeWrite(write, epoch);
  }
  function retry(): Promise<void> {
    if (!active) return Promise.resolve();
    if (retrying) return retrying;
    if (snapshot.ready && snapshot.state === 'saved') return Promise.resolve();
    const run = epoch;
    let operation: Promise<void>;
    if (!snapshot.ready) {
      patch({ state: 'loading', retryPending: true });
      operation = read(run);
    } else {
      patch({ retryPending: true });
      operation =
        snapshot.state === 'saving' && latestWrite
          ? observeWrite(latestWrite, run)
          : save(snapshot.archive);
    }
    const pending = operation.finally(() => {
      if (retrying === pending) {
        retrying = null;
        if (current(run)) patch({ retryPending: false });
      }
    });
    retrying = pending;
    return pending;
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    connect() {
      const run = ++epoch;
      active = true;
      if (!snapshot.ready) {
        patch({ state: 'loading' });
        void read(run);
      } else if (snapshot.state === 'saving' && latestWrite) void observeWrite(latestWrite, run);
      return () => {
        if (epoch !== run) return;
        active = false;
        epoch++;
        retrying = null;
        // 진행 중 쓰기는 취소하지 않습니다. UI 연결만 해제하고 재연결 때 최신 결과를 다시 관찰합니다.
        snapshot = { ...snapshot, retryPending: false };
      };
    },
    change(transform: (archive: WorkoutArchive) => WorkoutArchive) {
      if (active && snapshot.ready) void save(transform(snapshot.archive));
    },
    retry,
  };
}

// 기존 화면에 명시적 상태를 매핑합니다. 실패 기억은 최신 성공 전까지 새 입력/재시도 중에도 표시합니다.
export function describeArchiveState(value: ArchiveState) {
  const status: Record<SavePhase, string> = {
    loading: value.retryPending
      ? '기록을 다시 불러오는 중입니다. 기존 기록은 보존되어 있습니다.'
      : '기록 불러오는 중',
    'load-error': '기록을 불러오지 못했습니다. 기존 기록은 보존되어 있습니다.',
    saving: value.unsavedAfterFailure
      ? '저장하지 못한 입력이 있습니다. 기기에 다시 저장 중입니다.'
      : '기기에 저장 중',
    saved: '기기에 저장됨',
    'save-error': '저장하지 못했습니다. 다시 저장해 주세요.',
  };
  return {
    status: status[value.state],
    failed:
      value.state === 'load-error' ||
      value.unsavedAfterFailure ||
      (!value.ready && value.retryPending),
  };
}
