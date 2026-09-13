import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startWorkout, addExercise, updateSet, finishWorkout, validSet, addSet, removeSet } from '../src/features/workout/model.ts';
test('운동 시작 → 종목 → 입력 → 종료, 원본 보존', () => {
  const original = startWorkout('w', 100);
  const added = addExercise(original, 'e', ' 스쿼트 ');
  const edited = updateSet(added, 'e', 'e-1', { weight: '60', reps: '10', completed: true });
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
  const w = finishWorkout(updateSet(addExercise(startWorkout('w', 0), 'e', '푸시업'), 'e', 'e-1', {weight:'0', reps:'10', completed:true}), 1);
  assert.throws(() => updateSet(w, 'e', 'e-1', {reps:'20'}));
  assert.throws(() => addExercise(w, 'new', '스쿼트'));
  assert.throws(() => finishWorkout(w, 2));
});
test('빈 이름, 중복 id, 역전 시간 거부', () => {
  assert.throws(() => addExercise(startWorkout('w', 0), 'e', ' '));
  const w = addExercise(startWorkout('w', 100), 'e', '스쿼트');
  assert.throws(() => addExercise(w, 'e', '스쿼트'));
  assert.throws(() => finishWorkout(updateSet(w, 'e', 'e-1', {weight:'1',reps:'1',completed:true}), 0));
});

test('1kg 2회 세트를 복제하고 각각 수정·삭제하며 원본과 완료 상태를 보존한다', () => {
  const original = updateSet(addExercise(startWorkout('w', 0), 'e', '스쿼트', 'catalog-squat'), 'e', 'e-1', { weight: '1', reps: '2', completed: true });
  const copied = addSet(original, 'e', 'e-2', 'e-1');
  assert.deepEqual(copied.exercises[0].sets, [original.exercises[0].sets[0], { id: 'e-2', weight: '1', reps: '2', completed: false }]);
  assert.equal(copied.exercises[0].catalogId, 'catalog-squat');
  const edited = updateSet(copied, 'e', 'e-2', { weight: '3' });
  assert.equal(edited.exercises[0].sets[0].weight, '1');
  assert.equal(copied.exercises[0].sets[1].weight, '1');
  const inserted = addSet(edited, 'e', 'e-middle', 'e-1');
  assert.deepEqual(inserted.exercises[0].sets.map(s => s.id), ['e-1', 'e-middle', 'e-2']);
  const removed = removeSet(inserted, 'e', 'e-middle');
  assert.deepEqual(removed.exercises[0].sets.map(s => s.id), ['e-1', 'e-2']);
  assert.equal(original.exercises[0].sets.length, 1);
});
test('마지막 세트 삭제 후 빈 세트를 다시 추가하고 완료되지 않은 입력도 복구한다', () => {
  const initial = addExercise(startWorkout('w', 0), 'e', '스쿼트');
  const removed = removeSet(initial, 'e', 'e-1');
  assert.equal(removed.exercises.length, 1);
  assert.equal(removed.exercises[0].sets.length, 0);
  const added = addSet(removed, 'e', 'fresh');
  assert.deepEqual(added.exercises[0].sets, [{id: 'fresh', weight: '', reps: '', completed: false}]);
  const partial = updateSet(added, 'e', 'fresh', {weight: '1.'});
  assert.equal(addSet(partial, 'e', 'copy', 'fresh').exercises[0].sets[1].weight, '1.');
});
test('삭제·복제는 잘못된 ID와 종료된 운동을 거부한다', () => {
  const w = addExercise(startWorkout('w', 0), 'e', '스쿼트');
  assert.throws(() => addSet(w, 'e', 'e-1', 'e-1'));
  assert.throws(() => addSet(w, 'e', '', 'e-1'));
  assert.throws(() => addSet(w, 'e', 'new', 'missing'));
  assert.throws(() => addSet(w, 'missing', 'new'));
  assert.throws(() => removeSet(w, 'e', 'missing'));
  assert.throws(() => removeSet(w, 'missing', 'e-1'));
  const finished = finishWorkout(updateSet(w, 'e', 'e-1', {weight: '1', reps: '2', completed: true}), 1);
  assert.throws(() => addSet(finished, 'e', 'new', 'e-1'));
  assert.throws(() => removeSet(finished, 'e', 'e-1'));
});
test('전체 300세트 한도를 지키고 삭제하면 다시 추가할 수 있다', () => {
  let w = addExercise(startWorkout('w', 0), 'e', '스쿼트');
  for (let i = 2; i <= 300; i++) w = addSet(w, 'e', `s${i}`, 'e-1');
  assert.equal(w.exercises[0].sets.length, 300);
  assert.throws(() => addSet(w, 'e', 'overflow', 'e-1'), /300/);
  assert.throws(() => addExercise(w, 'another', '벤치프레스'), /300/);
  assert.equal(addSet(removeSet(w, 'e', 's2'), 'e', 'replacement').exercises[0].sets.length, 300);
});
test('완료한 세트를 잘못된 값으로 수정하면 완료가 해제된다', () => {
  const w = updateSet(addExercise(startWorkout('w', 0), 'e', '스쿼트'), 'e', 'e-1', {weight: '1', reps: '2', completed: true});
  const edited = updateSet(w, 'e', 'e-1', {reps: ''});
  assert.equal(edited.exercises[0].sets[0].completed, false);
  assert.throws(() => finishWorkout(edited, 1));
});
