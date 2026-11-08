import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createWorkoutStorage,
  emptyArchive,
  remember,
  decodeArchive,
  finishArchivedWorkout,
  removeArchivedWorkout,
  pauseRestoredWorkout,
} from '../src/features/workout/storage.ts';
import {
  startWorkout,
  addExercise,
  updateSet,
  finishWorkout,
  IncompleteSetsError,
  elapsedWorkoutMs,
  resumeWorkout,
} from '../src/features/workout/model.ts';
test('입력 중인 빈 값과 완료 이력을 저장하고 다시 읽는다', async () => {
  let raw: string | null = null;
  const adapter = {
    getItem: async () => raw,
    setItem: async (_: string, value: string) => {
      raw = value;
    },
  };
  const storage = createWorkoutStorage(adapter);
  const draft = addExercise(startWorkout('w', 0), 'e', '스쿼트');
  await storage.save(remember(emptyArchive(), draft));
  assert.deepEqual((await createWorkoutStorage(adapter).load()).current, draft);
  const finished = finishWorkout(
    updateSet(draft, 'e', 'e-1', { weight: '0', reps: '10', completed: true }),
    100,
  );
  const archived = remember(remember(emptyArchive(), finished), null);
  await storage.save(archived);
  const recovered = await storage.load();
  assert.equal(recovered.current, null);
  assert.deepEqual(recovered.history, [finished]);
});
test('느린 이전 저장이 최신 입력을 덮어쓰지 않는다', async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let began!: () => void;
  const started = new Promise<void>((resolve) => {
    began = resolve;
  });
  let calls = 0;
  let raw: string | null = null;
  const storage = createWorkoutStorage({
    getItem: async () => raw,
    setItem: async (_, value) => {
      if (++calls === 1) {
        began();
        await gate;
      }
      raw = value;
    },
  });
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
  const storage = createWorkoutStorage({
    getItem: async () => raw,
    setItem: async (_, value) => {
      if (++attempts === 1) throw new Error('disk full');
      raw = value;
    },
  });
  const archive = remember(emptyArchive(), startWorkout('w', 0));
  await assert.rejects(storage.save(archive));
  await storage.save(archive);
  assert.deepEqual(await storage.load(), archive);
});
test('손상된 데이터는 빈 기록으로 바꾸지 않고 오류를 반환한다', () => {
  for (const raw of [
    '{',
    '{}',
    '{"schemaVersion":2}',
    '{"schemaVersion":1,"current":{"id":"w"},"history":[]}',
  ])
    assert.throws(() => decodeArchive(raw));
});
test('종료 시 미완료 세트 제외는 확인이 필요하다', () => {
  const first = updateSet(addExercise(startWorkout('w', 0), 'e', '스쿼트'), 'e', 'e-1', {
    weight: '40',
    reps: '10',
    completed: true,
  });
  const partial = addExercise(first, 'other', '푸시업');
  assert.throws(() => finishWorkout(partial, 100), IncompleteSetsError);
  assert.equal(finishWorkout(partial, 100, true).exercises.length, 1);
  assert.equal(partial.exercises.length, 2);
  assert.throws(() => updateSet(partial, 'other', 'other-1', { completed: true }));
});


test('시간만 기록한 운동도 저장·복구하고 선택한 기록만 삭제한다', () => {
  const draft = addExercise(startWorkout('time-only', 1000), 'e', '스쿼트');
  const saved = finishArchivedWorkout(remember(emptyArchive(), draft), draft.id, 61000, false, true);
  assert.equal(saved.history.length, 1);
  assert.equal(saved.history[0].exercises.length, 0);
  assert.equal(elapsedWorkoutMs(saved.history[0], 90000), 60000);
  assert.deepEqual(decodeArchive(JSON.stringify(saved)), saved);
  const ongoing = startWorkout('next', 62000);
  const removed = removeArchivedWorkout(remember(saved, ongoing), draft.id);
  assert.equal(removed.history.length, 0);
  assert.equal(removed.current?.id, ongoing.id);
  assert.equal(saved.history.length, 1);
});

test('복구한 운동은 저장 시점에 멈추고 시작 버튼 이후에만 시간이 증가한다', () => {
  const saved = remember(emptyArchive(), startWorkout('w', 1000));
  const restored = pauseRestoredWorkout(saved, 31000);
  assert.equal(elapsedWorkoutMs(restored.current!, 999999), 30000);
  assert.equal(elapsedWorkoutMs(resumeWorkout(restored.current!, 100000), 101000), 31000);
  assert.equal(pauseRestoredWorkout(restored, 200000), restored);
});
