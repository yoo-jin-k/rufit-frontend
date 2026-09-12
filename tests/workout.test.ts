import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startWorkout, addExercise, updateSet, finishWorkout, validSet } from '../src/features/workout/model.ts';
test('운동 시작 → 종목 → 입력 → 종료, 원본 보존', () => {
  const original = startWorkout('w', 100);
  const added = addExercise(original, 'e', ' 스쿼트 ');
  const edited = updateSet(added, 'e', 'e-1', { weight: '60', reps: '10' });
  assert.equal(finishWorkout(edited, 200).finishedAt, 200);
  assert.equal(original.exercises.length, 0);
  assert.equal(added.exercises[0].sets[0].weight, '');
});
test('빈 운동이나 잘못 입력한 세트는 종료 불가', () => {
  assert.throws(() => finishWorkout(startWorkout('w', 0), 1));
  const w = addExercise(startWorkout('w', 0), 'e', '스쿼트');
  assert.throws(() => finishWorkout(w, 1));
  for (const [weight, reps] of [['', '1'], ['-1','1'], ['1','0'], ['1','1.5'], ['Infinity','2'], ['1501','1'], ['1','1001']])
    assert.equal(validSet({id:'s', weight, reps, completed:false}), false);
  assert.equal(validSet({id:'s', weight:'0', reps:'10', completed:false}), true);
});
test('종료된 운동 수정 및 중복 종료 금지', () => {
  const w = finishWorkout(updateSet(addExercise(startWorkout('w', 0), 'e', '푸시업'), 'e', 'e-1', {weight:'0', reps:'10'}), 1);
  assert.throws(() => updateSet(w, 'e', 'e-1', {reps:'20'}));
  assert.throws(() => addExercise(w, 'new', '스쿼트'));
  assert.throws(() => finishWorkout(w, 2));
});
test('빈 이름, 중복 id, 역전 시간 거부', () => {
  assert.throws(() => addExercise(startWorkout('w', 0), 'e', ' '));
  const w = addExercise(startWorkout('w', 100), 'e', '스쿼트');
  assert.throws(() => addExercise(w, 'e', '스쿼트'));
  assert.throws(() => finishWorkout(updateSet(w, 'e', 'e-1', {weight:'1',reps:'1'}), 0));
});
