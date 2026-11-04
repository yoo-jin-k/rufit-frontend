import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setImmediate as turn} from 'node:timers/promises';
import {createArchiveState, describeArchiveState} from '../src/features/workout/archiveState.ts';
import {createWorkoutStorage, emptyArchive, remember} from '../src/features/workout/storage.ts';
import {startWorkout, addExercise, updateSet, finishWorkout} from '../src/features/workout/model.ts';

function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => {resolve = yes; reject = no;});
  return {promise, resolve, reject};
}
const failure = () => new Error('storage unavailable');
function controlled() {
  const writes: ReturnType<typeof deferred<void>>[] = [];
  const saved: unknown[] = [];
  const state = createArchiveState({load: async () => emptyArchive(), save: value => {
    saved.push(value); const gate = deferred<void>(); writes.push(gate); return gate.promise;
  }});
  state.connect();
  return {state, writes, saved};
}

test('SS01/02 읽기와 재시도는 한 번만 실행하고 재실패 뒤 다시 접근할 수 있다', async () => {
  const reads: ReturnType<typeof deferred<ReturnType<typeof emptyArchive>>>[] = [];
  let writes = 0;
  const state = createArchiveState({load: () => {const gate = deferred<ReturnType<typeof emptyArchive>>(); reads.push(gate); return gate.promise;}, save: async () => {writes++;}});
  state.connect(); const first = state.retry(); assert.equal(state.retry(), first);
  state.change(a => remember(a, startWorkout('forbidden', 0)));
  await turn(); assert.equal(reads.length, 1); assert.equal(writes, 0);
  reads[0].reject(failure()); await first;
  assert.equal(state.getSnapshot().state, 'load-error'); assert.equal(state.getSnapshot().retryPending, false);
  const second = state.retry(); await turn(); reads[1].reject(failure()); await second;
  assert.equal(state.getSnapshot().ready, false);
  const third = state.retry(); await turn(); reads[2].resolve(emptyArchive()); await third;
  assert.equal(state.getSnapshot().state, 'saved'); assert.equal(state.getSnapshot().ready, true); assert.equal(writes, 0);
});

test('SS03 손상된 JSON과 미지원 스키마는 원문을 덮어쓰지 않는다', async () => {
  for (const raw of ['{', '{"schemaVersion":99,"current":null,"history":[]}']) {
    let writes = 0;
    const state = createArchiveState(createWorkoutStorage({getItem: async () => raw, setItem: async () => {writes++;}}));
    state.connect(); await turn(); assert.equal(state.getSnapshot().state, 'load-error');
    await state.retry(); assert.equal(state.getSnapshot().state, 'load-error'); assert.equal(writes, 0);
  }
});

test('SS04/05 실패 후 연속 재시도는 같은 저장본만 한번 저장하고 성공 전 실패 기억을 유지한다', async () => {
  const {state, writes, saved} = controlled(); await turn();
  let actions = 0;
  state.change(a => {actions++; return remember(a, startWorkout('w', 0));}); await turn();
  writes[0].reject(failure()); await turn();
  const first = state.retry(); assert.equal(state.retry(), first); await turn();
  assert.equal(writes.length, 2); assert.equal(actions, 1); assert.deepEqual(saved[1], saved[0]);
  assert.equal(state.getSnapshot().state, 'saving'); assert.equal(state.getSnapshot().unsavedAfterFailure, true);
  assert.equal(describeArchiveState(state.getSnapshot()).failed, true);
  assert.notEqual(describeArchiveState(state.getSnapshot()).status, '기기에 저장됨');
  writes[1].resolve(); await first;
  assert.equal(state.getSnapshot().state, 'saved'); assert.equal(state.getSnapshot().retryPending, false);
  assert.equal(state.getSnapshot().unsavedAfterFailure, false);
});

test('SS06 재시도 중 새 입력이 생기면 이전 성공이 최신 실패를 가리지 않는다', async () => {
  const {state, writes} = controlled(); await turn();
  state.change(a => remember(a, startWorkout('first', 0))); await turn(); writes[0].reject(failure()); await turn();
  const retry = state.retry(); await turn();
  state.change(a => remember(a, startWorkout('latest', 1))); await turn();
  writes[1].resolve(); await retry;
  assert.equal(state.getSnapshot().state, 'saving'); assert.equal(state.getSnapshot().unsavedAfterFailure, true);
  assert.equal(state.getSnapshot().archive.current!.id, 'latest');
  writes[2].reject(failure()); await turn(); assert.equal(state.getSnapshot().state, 'save-error');
  const retryLatest = state.retry(); await turn(); writes[3].resolve(); await retryLatest;
  assert.equal(state.getSnapshot().state, 'saved');
});

test('SS07 최신 성공 이후 도착한 이전 실패/성공은 최신 결과를 덮지 않는다', async () => {
  const {state, writes} = controlled(); await turn();
  state.change(a => remember(a, startWorkout('old', 0)));
  state.change(a => remember(a, startWorkout('new', 1))); await turn();
  writes[1].resolve(); await turn(); writes[0].reject(failure()); await turn();
  assert.equal(state.getSnapshot().state, 'saved'); assert.equal(state.getSnapshot().unsavedAfterFailure, false);
  assert.equal(state.getSnapshot().archive.current!.id, 'new');
});

test('SS08 실패 후 일반 편집도 실패 기억을 유지하고 진행 중 재시도는 현재 저장에 합류한다', async () => {
  const {state, writes} = controlled(); await turn();
  state.change(a => remember(a, startWorkout('first', 0))); await turn(); writes[0].reject(failure()); await turn();
  state.change(a => remember(a, startWorkout('second', 1))); await turn();
  const joined = state.retry(); assert.equal(state.retry(), joined); assert.equal(writes.length, 2);
  assert.equal(state.getSnapshot().unsavedAfterFailure, true);
  writes[1].reject(failure()); await joined; assert.equal(state.getSnapshot().retryPending, false);
  const retry = state.retry(); await turn(); writes[2].resolve(); await retry;
  assert.equal(state.getSnapshot().state, 'saved');
});

test('SS09 완료 저장 실패 뒤 새 운동을 시작해도 history와 새 입력을 함께 재저장한다', async () => {
  let raw: string | null = null, fail = true;
  const storage = createWorkoutStorage({getItem: async () => raw, setItem: async (_, value) => {if (fail) throw failure(); raw = value;}});
  const state = createArchiveState(storage); state.connect(); await turn();
  const done = finishWorkout(updateSet(addExercise(startWorkout('old', 0), 'e', '스쿼트'), 'e', 'e-1', {weight: '1', reps: '2', completed: true}), 100);
  state.change(a => remember(a, done)); await turn(); assert.equal(state.getSnapshot().state, 'save-error');
  state.change(a => remember(a, null)); state.change(a => remember(a, startWorkout('new', 200))); await turn();
  assert.deepEqual(state.getSnapshot().archive.history, [done]); assert.equal(state.getSnapshot().unsavedAfterFailure, true);
  fail = false; await state.retry(); const reopened = await storage.load();
  assert.deepEqual(reopened.history, [done]); assert.equal(reopened.current!.id, 'new');
});

test('SS10 조회/알림 구독만으로 저장을 실행하지 않으며 snapshot 참조가 안정적이다', async () => {
  const {state, writes} = controlled(); await turn(); const snapshot = state.getSnapshot();
  const stop = state.subscribe(() => {});
  for (let i = 0; i < 10; i++) assert.equal(state.getSnapshot(), snapshot);
  stop(); await turn(); assert.equal(writes.length, 0);
});

test('SS11 해제된 읽기는 적용하지 않고 재연결의 결과만 복구한다', async () => {
  const gate = deferred<ReturnType<typeof emptyArchive>>(); let reads = 0;
  const state = createArchiveState({load: () => {reads++; return gate.promise;}, save: async () => {}});
  const disconnect = state.connect(); await turn(); disconnect();
  gate.resolve(remember(emptyArchive(), startWorkout('old', 0))); await turn();
  assert.equal(state.getSnapshot().ready, false);
  state.connect(); await turn(); assert.equal(reads, 2); assert.equal(state.getSnapshot().archive.current!.id, 'old');
});

test('읽기 생명주기만 교체된 경우 같은 진행중 읽기를 공유한다', async () => {
  const gate = deferred<ReturnType<typeof emptyArchive>>(); let reads = 0;
  const state = createArchiveState({load: () => {reads++; return gate.promise;}, save: async () => {}});
  const disconnect = state.connect(); disconnect(); state.connect(); await turn();
  assert.equal(reads, 1); gate.resolve(emptyArchive()); await turn(); assert.equal(state.getSnapshot().ready, true);
});

test('연결 해제 후 저장 결과는 반영하지 않고 재연결 때 최신 쓰기 결과만 확인한다', async () => {
  const gate = deferred<void>();
  const state = createArchiveState({load: async () => emptyArchive(), save: () => gate.promise});
  const disconnect = state.connect(); await turn(); state.change(a => remember(a, startWorkout('w', 0))); await turn();
  disconnect(); gate.resolve(); await turn(); assert.equal(state.getSnapshot().state, 'saving');
  state.connect(); await turn(); assert.equal(state.getSnapshot().state, 'saved'); assert.equal(state.getSnapshot().archive.current!.id, 'w');
});
