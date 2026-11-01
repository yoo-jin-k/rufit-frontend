import test from 'node:test';
import assert from 'node:assert/strict';
import { startWorkout, addExercise, addSet, updateSet, removeSet, moveSet } from '../src/features/workout/model.ts';
test('마지막 세트 복제·이동·삭제는 입력과 완료 상태, 원본을 보존합니다', () => {
  let workout = addExercise(startWorkout('w', 1), 'e', '스쿼트');
  workout = updateSet(workout, 'e', 'e-1', { weight: '20', reps: '10', completed: true });
  const copied = addSet(workout, 'e', 'second', 'e-1');
  assert.deepEqual(copied.exercises[0].sets[1], { id: 'second', weight: '20', reps: '10', completed: false });
  const moved = moveSet(copied, 'e', 'second', 0);
  assert.deepEqual(moved.exercises[0].sets.map((s) => s.id), ['second', 'e-1']);
  assert.equal(moved.exercises[0].sets[1].completed, true);
  assert.equal(copied.exercises[0].sets[0].id, 'e-1');
  const removed = removeSet(moved, 'e', moved.exercises[0].sets.at(-1)!.id);
  assert.deepEqual(removed.exercises[0].sets.map((s) => s.id), ['second']);
  assert.throws(() => moveSet(moved, 'e', 'missing', 0));
  assert.throws(() => moveSet(moved, 'e', 'second', 2));
  assert.throws(() => moveSet({ ...moved, finishedAt: 2 }, 'e', 'second', 1));
});
