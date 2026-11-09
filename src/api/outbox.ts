/**
 * 서버에 전달할 변경 작업을 보관하고 재시도하는 큐입니다.
 * 응답 유실 시에도 같은 작업 식별자와 내용을 유지하여 중복 변경을 방지합니다.
 */
import { ApiError } from './client.ts';
import type { Draft, WorkoutSnapshot } from './client.ts';
import type { AccountScope, RufitSession } from './session.ts';

export type OutboxStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};
export const MAX_PENDING_DRAFTS = 100;
export type ConflictReason =
  | 'STATE_CONFLICT'
  | 'RESOURCE_UNAVAILABLE'
  | 'REQUEST_REJECTED'
  | 'REMOTE_CHANGED';
const conflictReasons: readonly string[] = [
  'STATE_CONFLICT',
  'RESOURCE_UNAVAILABLE',
  'REQUEST_REJECTED',
  'REMOTE_CHANGED',
];
export type PendingDraft = {
  workoutId: string;
  draft: Draft;
  status: 'pending' | 'conflict';
  remoteVersion: number | null;
  reason?: ConflictReason;
};
export type DraftReceipt = {
  workoutId: string;
  operationId: string;
  appliedVersion: number;
  workout: WorkoutSnapshot;
};
export type FlushOptions = { beforeRemove?: (receipt: DraftReceipt) => Promise<void> };
type Archive = { schemaVersion: 1; scope: AccountScope; entries: PendingDraft[] };
type FlushResult =
  | { kind: 'idle' }
  | { kind: 'saved'; workout: WorkoutSnapshot }
  | {
      kind: 'conflict';
      operationId: string;
      remoteVersion: number | null;
      reason?: ConflictReason;
    };
const queues = new WeakMap<OutboxStorage, Map<string, Promise<unknown>>>();
const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const version = (v: unknown): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const uuid = (v: unknown): v is string =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const sameScope = (a: AccountScope, b: AccountScope) =>
  a.server === b.server && a.accountId === b.accountId;
function validDraft(v: unknown): v is Draft {
  if (
    !object(v) ||
    !uuid(v.operationId) ||
    !version(v.version) ||
    !Array.isArray(v.sets) ||
    v.sets.length > 300
  )
    return false;
  if (v.note != null && (typeof v.note !== 'string' || v.note.length > 2000)) return false;
  if (
    !v.sets.every(
      (s) =>
        object(s) &&
        typeof s.completed === 'boolean' &&
        object(s.set) &&
        (s.set.exerciseId == null || uuid(s.set.exerciseId)) &&
        typeof s.set.exerciseName === 'string' &&
        s.set.exerciseName.trim().length > 0 &&
        s.set.exerciseName.length <= 80 &&
        typeof s.set.weight === 'number' &&
        Number.isFinite(s.set.weight) &&
        s.set.weight >= 0 &&
        s.set.weight <= 1500 &&
        Math.abs(s.set.weight * 100 - Math.round(s.set.weight * 100)) < 1e-8 &&
        typeof s.set.reps === 'number' &&
        Number.isInteger(s.set.reps) &&
        s.set.reps >= 1 &&
        s.set.reps <= 1000,
    )
  )
    return false;
  if (v.restSetIndex === null && v.restEndsAt === null) return true;
  return (
    version(v.restSetIndex) &&
    v.restSetIndex < v.sets.length &&
    v.sets[v.restSetIndex].completed === true &&
    typeof v.restEndsAt === 'string' &&
    Number.isFinite(Date.parse(v.restEndsAt))
  );
}

export function createDraftOutbox(storage: OutboxStorage, scope: AccountScope) {
  scope = { ...scope };
  if (!scope.server || !scope.accountId) throw new Error('확인된 서버와 계정이 필요합니다.');
  const key = `rufit.draft-outbox.v1:${encodeURIComponent(JSON.stringify([scope.server, scope.accountId]))}`;
  let queue = queues.get(storage);
  if (!queue) {
    queue = new Map();
    queues.set(storage, queue);
  }
  const serial = <T>(work: () => Promise<T>): Promise<T> => {
    const next = (queue.get(key) ?? Promise.resolve()).catch(() => {}).then(work);
    queue.set(key, next);
    return next;
  };
  async function read(): Promise<Archive> {
    const raw = await storage.getItem(key);
    if (raw === null) return { schemaVersion: 1, scope, entries: [] };
    const v: unknown = JSON.parse(raw);
    if (
      !object(v) ||
      v.schemaVersion !== 1 ||
      !object(v.scope) ||
      v.scope.server !== scope.server ||
      v.scope.accountId !== scope.accountId ||
      !Array.isArray(v.entries) ||
      v.entries.length > MAX_PENDING_DRAFTS ||
      !v.entries.every(
        (e) =>
          object(e) &&
          uuid(e.workoutId) &&
          validDraft(e.draft) &&
          (e.status === 'pending' || e.status === 'conflict') &&
          (e.remoteVersion === null || version(e.remoteVersion)) &&
          (e.reason === undefined ||
            (typeof e.reason === 'string' && conflictReasons.includes(e.reason))),
      )
    )
      throw new Error('저장 대기 데이터를 읽지 못했습니다. 기존 데이터는 보존했습니다.');
    const archive = v as Archive;
    if (
      new Set(archive.entries.map((e) => e.workoutId)).size !== archive.entries.length ||
      new Set(archive.entries.map((e) => e.draft.operationId)).size !== archive.entries.length
    )
      throw new Error('저장 대기 데이터가 중복되었습니다. 기존 데이터는 보존했습니다.');
    return archive;
  }
  const write = (archive: Archive) => storage.setItem(key, JSON.stringify(archive));
  return {
    list: () => serial(async () => (await read()).entries),
    enqueue(workoutId: string, draft: Draft) {
      // 디스크 저장을 기다리기 전에 복사하여 이후 입력 수정이 이미 전송한 작업을 바꾸지 않도록 합니다.
      const copy: unknown = JSON.parse(JSON.stringify(draft));
      if (!uuid(workoutId) || !validDraft(copy))
        return Promise.reject(new Error('전송할 운동 기록을 확인해 주세요.'));
      return serial(async () => {
        const archive = await read();
        const existing = archive.entries.find(
          (e) => e.workoutId === workoutId || e.draft.operationId === copy.operationId,
        );
        if (existing) {
          if (
            existing.workoutId === workoutId &&
            JSON.stringify(existing.draft) === JSON.stringify(copy)
          )
            return;
          throw new Error('이전 저장을 먼저 처리해 주세요. 대기 중인 변경 내용은 보존했습니다.');
        }
        if (archive.entries.length >= MAX_PENDING_DRAFTS)
          throw new Error('저장 대기 목록이 가득 찼습니다.');
        archive.entries.push({ workoutId, draft: copy, status: 'pending', remoteVersion: null });
        await write(archive);
      });
    },
    flushOne(session: RufitSession, options: FlushOptions = {}): Promise<FlushResult> {
      return serial(async () => {
        if (!sameScope(scope, session.scope))
          throw new ApiError(
            401,
            'ACCOUNT_CHANGED',
            '다른 계정의 저장 대기 기록은 전송할 수 없습니다.',
          );
        const archive = await read();
        const entry = archive.entries.find((e) => e.status === 'pending');
        if (!entry) return { kind: 'idle' };
        let result;
        try {
          result = await session.saveDraft(entry.workoutId, entry.draft);
        } catch (error) {
          if (
            !(error instanceof ApiError) ||
            error.outcomeUnknown ||
            ![400, 404, 409, 410].includes(error.status)
          )
            throw error;
          entry.status = 'conflict';
          entry.reason =
            error.status === 409
              ? 'STATE_CONFLICT'
              : error.status === 400
                ? 'REQUEST_REJECTED'
                : 'RESOURCE_UNAVAILABLE';
          await write(archive);
          return {
            kind: 'conflict',
            operationId: entry.draft.operationId,
            remoteVersion: null,
            reason: entry.reason,
          };
        }
        if (
          !result ||
          !result.workout ||
          result.workout.id !== entry.workoutId ||
          !version(result.appliedVersion) ||
          result.appliedVersion <= entry.draft.version ||
          !version(result.workout.version) ||
          result.workout.version < result.appliedVersion
        )
          throw new ApiError(200, 'INVALID_RESPONSE', '저장 확인 응답을 읽지 못했습니다.', true);
        if (result.workout.version > result.appliedVersion) {
          entry.status = 'conflict';
          entry.remoteVersion = result.workout.version;
          entry.reason = 'REMOTE_CHANGED';
          await write(archive);
          return {
            kind: 'conflict',
            operationId: entry.draft.operationId,
            remoteVersion: entry.remoteVersion,
            reason: entry.reason,
          };
        }
        // 연결 정보나 수신 확인 저장이 실패하거나 앱이 종료되어도 동일한 작업을 유지합니다.
        await options.beforeRemove?.({
          workoutId: entry.workoutId,
          operationId: entry.draft.operationId,
          appliedVersion: result.appliedVersion,
          workout: result.workout,
        });
        archive.entries = archive.entries.filter((e) => e !== entry);
        await write(archive);
        return { kind: 'saved', workout: result.workout };
      });
    },
    discard(operationId: string, confirmed: true) {
      return serial(async () => {
        if (confirmed !== true) throw new Error('대기 기록 삭제 확인이 필요합니다.');
        const archive = await read();
        archive.entries = archive.entries.filter((e) => e.draft.operationId !== operationId);
        await write(archive);
      });
    },
  };
}
