import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addExercise, addSet, finishWorkout, startWorkout, updateSet } from '../src/features/workout/model.ts';
import { applyPreviousExerciseRecord, findPreviousExerciseRecord } from '../src/features/workout/previousRecord.ts';

function historyRecord(id: string, finishedAt: number, name = '스쿼트', catalogId = 'catalog-squat', weight = '60') {
  let workout = addExercise(startWorkout(id, finishedAt - 100), 'e', name, catalogId);
  workout = updateSet(workout, 'e', 'e-1', { weight, reps: '10', completed: true });
  return finishWorkout(workout, finishedAt);
}

test('같은 카탈로그 종목의 가장 최근 완료 기록을 찾는다', () => {
  const current = addExercise(startWorkout('now', 500), 'current', '스쿼트', 'catalog-squat').exercises[0];
  const previous = findPreviousExerciseRecord([historyRecord('old', 200, '스쿼트', 'catalog-squat', '50'), historyRecord('new', 400, 'Back Squat', 'catalog-squat', '70')], current);
  assert.equal(previous?.workoutId, 'new');
  assert.deepEqual(previous?.sets, [{ weight: '70', reps: '10' }]);
});

test('카탈로그 ID가 없으면 정리한 이름으로 이전 기록을 찾는다', () => {
  const current = addExercise(startWorkout('now', 500), 'current', '  푸시업  ').exercises[0];
  const previous = findPreviousExerciseRecord([historyRecord('old', 300, '푸시업', '', '0')], current);
  assert.equal(previous?.exerciseName, '푸시업');
});

test('이전 세트를 현재 운동에 미완료 복사하고 과거 기록은 바꾸지 않는다', () => {
  const historical = historyRecord('old', 300);
  const previous = findPreviousExerciseRecord([historical], addExercise(startWorkout('now', 500), 'current', '스쿼트', 'catalog-squat').exercises[0]);
  assert.ok(previous);
  let current = addExercise(startWorkout('now', 500), 'current', '스쿼트', 'catalog-squat');
  current = addSet(current, 'current', 'extra', 'current-1');
  const applied = applyPreviousExerciseRecord(current, 'current', previous, 'copied');
  assert.deepEqual(applied.exercises[0].sets, [{ id: 'copied:0', weight: '60', reps: '10', completed: false }]);
  assert.equal(current.exercises[0].sets.length, 2);
  assert.equal(historical.exercises[0].sets[0].completed, true);
});

test('종료 운동·없는 종목·빈 이전 기록은 적용하지 않는다', () => {
  const historical = historyRecord('old', 300);
  const previous = findPreviousExerciseRecord([historical], addExercise(startWorkout('now', 500), 'current', '스쿼트', 'catalog-squat').exercises[0]);
  assert.ok(previous);
  const current = addExercise(startWorkout('now', 500), 'current', '스쿼트', 'catalog-squat');
  assert.throws(() => applyPreviousExerciseRecord(current, 'missing', previous, 'copy'));
  assert.throws(() => applyPreviousExerciseRecord(current, 'current', { ...previous, sets: [] }, 'copy'));
  assert.throws(() => applyPreviousExerciseRecord(finishWorkout(updateSet(current, 'current', 'current-1', { weight: '1', reps: '1', completed: true }), 600), 'current', previous, 'copy'));
});
