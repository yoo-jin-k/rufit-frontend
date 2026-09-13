import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorkoutStorage, emptyArchive, remember, decodeArchive } from '../src/features/workout/storage.ts';
import { startWorkout, addExercise, updateSet, finishWorkout, IncompleteSetsError, setCompletedWithRest } from '../src/features/workout/model.ts';
test('입력 중인 빈 값과 완료 이력을 저장하고 다시 읽는다', async () => {
  let raw: string | null = null;
  const adapter = { getItem: async () => raw, setItem: async (_: string, value: string) => { raw = value; } };
  const storage = createWorkoutStorage(adapter);
  const draft = addExercise(startWorkout('w', 0), 'e', '스쿼트');
  await storage.save(remember(emptyArchive(), draft));
  assert.deepEqual((await createWorkoutStorage(adapter).load()).current, draft);
  const finished = finishWorkout(updateSet(draft, 'e', 'e-1', { weight: '0', reps: '10', completed: true }), 100);
  const archived = remember(remember(emptyArchive(), finished), null);
  await storage.save(archived);
  const recovered = await storage.load();
  assert.equal(recovered.current, null);
  assert.deepEqual(recovered.history, [finished]);
});
test('느린 이전 저장이 최신 입력을 덮어쓰지 않는다', async () => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let began!: () => void;
  const started = new Promise<void>(resolve => { began = resolve; });
  let calls = 0;
  let raw: string | null = null;
  const storage = createWorkoutStorage({ getItem: async () => raw, setItem: async (_, value) => {
    if (++calls === 1) { began(); await gate; }
    raw = value;
  } });
  const first = storage.save(remember(emptyArchive(), startWorkout('first', 0)));
  const second = storage.save(remember(emptyArchive(), startWorkout('second', 1)));
  await started;
  assert.equal(calls, 1);
  release();
  await Promise.all([first, second]);
  assert.equal((await storage.load()).current?.id, 'second');
});
test('저장 실패를 알리고 재시도는 진행한다', async () => {
  let attempts = 0;
  let raw: string | null = null;
  const storage = createWorkoutStorage({ getItem: async () => raw, setItem: async (_, value) => {
    if (++attempts === 1) throw new Error('disk full'); raw = value;
  } });
  const archive = remember(emptyArchive(), startWorkout('w', 0));
  await assert.rejects(storage.save(archive));
  await storage.save(archive);
  assert.deepEqual(await storage.load(), archive);
});
test('손상된 데이터는 빈 기록으로 바꾸지 않고 오류를 반환한다', () => {
  for (const raw of ['{', '{}', '{"schemaVersion":2}', '{"schemaVersion":1,"current":{"id":"w"},"history":[]}'])
    assert.throws(() => decodeArchive(raw));
});
test('종료 시 미완료 세트 제외는 확인이 필요하다', () => {
  const first = updateSet(addExercise(startWorkout('w', 0), 'e', '스쿼트'), 'e', 'e-1', { weight: '40', reps: '10', completed: true });
  const partial = addExercise(first, 'other', '푸시업');
  assert.throws(() => finishWorkout(partial, 100), IncompleteSetsError);
  assert.equal(finishWorkout(partial, 100, true).exercises.length, 1);
  assert.equal(partial.exercises.length, 2);
  assert.throws(() => updateSet(partial, 'other', 'other-1', { completed: true }));
});
test('휴식 타이머도 앱 재시작 뒤 복구하고 손상된 타이머는 거부한다', async () => {
  let raw: string | null = null;
  const adapter = { getItem: async () => raw, setItem: async (_: string, value: string) => { raw = value; } };
  const storage = createWorkoutStorage(adapter);
  const input = updateSet(addExercise(startWorkout('w', 1_000), 'e', '스쿼트'), 'e', 'e-1', { weight: '60', reps: '10' });
  const resting = setCompletedWithRest(input, 'e', 'e-1', true, 2_000);
  await storage.save(remember(emptyArchive(), resting));
  assert.deepEqual((await storage.load()).current?.restTimer, { setId: 'e-1', startedAt: 2_000, durationMs: 90_000 });
  const corrupt = JSON.stringify({ schemaVersion: 2, current: { ...resting, restTimer: { ...resting.restTimer, setId: 'missing' } }, history: [] });
  assert.throws(() => decodeArchive(corrupt), /저장된 기록/);
});
