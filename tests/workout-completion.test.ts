import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate as turn } from 'node:timers/promises';
import { createArchiveState } from '../src/features/workout/archiveState.ts';
import { createWorkoutStorage, emptyArchive, remember, finishArchivedWorkout } from '../src/features/workout/storage.ts';
import { addExercise, addSet, startWorkout, updateSet, elapsedWorkoutMs } from '../src/features/workout/model.ts';
import { completionMonthFor, monthlyProgress } from '../src/features/calendar/monthlyProgress.ts';

function fixture() {
  const start = new Date(2026, 9, 31, 23, 55).getTime();
  const workout = updateSet(addExercise(startWorkout('test-completion', start), 'squat', '스쿼트'), 'squat', 'squat-1', {
    weight: '20', reps: '10', completed: true,
  });
  return { workout, end: start + 10 * 60000 };
}

test('월말 자정을 넘겨 종료해도 완료 안내와 달력은 시작한 달에 집계합니다', () => {
  const { workout, end } = fixture();
  const saved = finishArchivedWorkout(remember(emptyArchive(), workout), workout.id, end);
  assert.equal(completionMonthFor(saved.current!), '2026-10');
  assert.equal(monthlyProgress(saved.history, completionMonthFor(saved.current!)).workoutDays, 1);
  assert.equal(monthlyProgress(saved.history, '2026-11').workoutDays, 0);
  assert.equal(completionMonthFor({ ...workout, recordDate: '2026-09-20' }), '2026-09');
});

test('종료 재전달과 재실행에도 기록 하나와 고정된 운동 시간을 보존합니다', async () => {
  const { workout, end } = fixture();
  let raw: string | null = null;
  const disk = { getItem: async () => raw, setItem: async (_: string, value: string) => { raw = value; } };
  const saved = finishArchivedWorkout(remember(emptyArchive(), workout), workout.id, end);
  assert.equal(finishArchivedWorkout(saved, workout.id, end + 60000), saved);
  await createWorkoutStorage(disk).save(saved);
  const restored = await createWorkoutStorage(disk).load();
  assert.equal(restored.history.length, 1);
  assert.equal(elapsedWorkoutMs(restored.current!, end + 3600000), 600000);
  assert.deepEqual(restored.current, restored.history[0]);
  assert.equal(finishArchivedWorkout(restored, workout.id, end + 3600000), restored);
  const next = remember(restored, startWorkout('next', end + 1));
  assert.equal(finishArchivedWorkout(next, workout.id, end + 2), next);
});

test('미완료 제외 확인 전에는 원본을 보존하고 확인 후에는 완료 세트와 휴식을 함께 정리합니다', () => {
  const { workout, end } = fixture();
  const draft = addExercise(addSet(workout, 'squat', 'squat-2', 'squat-1'), 'bench', '벤치프레스');
  const archive = { ...remember(emptyArchive(), draft), rest: { workoutId: workout.id, exerciseId: 'squat', setId: 'squat-1', endsAt: end + 90000 } };
  assert.throws(() => finishArchivedWorkout(archive, workout.id, end));
  assert.equal(archive.current!.finishedAt, undefined);
  const saved = finishArchivedWorkout(archive, workout.id, end, true);
  assert.equal(saved.rest, null);
  assert.equal(saved.current!.exercises.length, 1);
  assert.equal(saved.current!.exercises[0].sets.length, 1);
  assert.equal(archive.current!.exercises.length, 2);
});

test('저장 실패 뒤 완료 연타는 새 쓰기를 만들지 않고 재시도로 동일 기록을 저장합니다', async () => {
  const { workout, end } = fixture();
  let writes = 0;
  const state = createArchiveState({
    load: async () => remember(emptyArchive(), workout),
    save: async () => { if (++writes === 1) throw new Error('test storage unavailable'); },
  });
  const disconnect = state.connect();
  try {
    await turn();
    state.change(a => finishArchivedWorkout(a, workout.id, end));
    await turn();
    assert.equal(state.getSnapshot().state, 'save-error');
    state.change(a => finishArchivedWorkout(a, workout.id, end + 1));
    await turn();
    assert.equal(writes, 1);
    assert.equal(state.getSnapshot().state, 'save-error');
    await state.retry();
    assert.equal(writes, 2);
    assert.equal(state.getSnapshot().state, 'saved');
    assert.equal(state.getSnapshot().archive.history.length, 1);
    assert.equal(state.getSnapshot().archive.current!.finishedAt, end);
  } finally { disconnect(); }
});

test('빈 운동 종료는 이전 기록을 보존하고 운동일 수를 추가하지 않습니다', async () => {
  const { workout, end } = fixture();
  const completed = finishArchivedWorkout(remember(emptyArchive(), workout), workout.id, end);
  const running = remember(completed, startWorkout('empty-session', end + 1));
  const cancelled = remember(running, null);
  assert.equal(cancelled.current, null);
  assert.equal(cancelled.rest, null);
  assert.deepEqual(cancelled.history, completed.history);
  assert.equal(monthlyProgress(cancelled.history, '2026-10').workoutDays, 1);
  let raw: string | null = null;
  const storage = createWorkoutStorage({ getItem: async () => raw, setItem: async (_, value) => { raw = value; } });
  await storage.save(cancelled);
  assert.equal((await storage.load()).current, null);
});
