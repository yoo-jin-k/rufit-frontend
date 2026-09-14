import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addExercise, finishWorkout, startWorkout, updateSet } from '../src/features/workout/model.ts';
import { defaultRoutineName, isRoutine, routineFromWorkout, startWorkoutFromRoutine } from '../src/features/routines/model.ts';

function completedWorkout() {
  let workout = addExercise(startWorkout('w', 1_000), 'squat', '스쿼트', 'catalog-squat');
  workout = updateSet(workout, 'squat', 'squat-1', { weight: '60', reps: '10', completed: true });
  workout = addExercise(workout, 'bench', '벤치프레스', 'catalog-bench');
  workout = updateSet(workout, 'bench', 'bench-1', { weight: '40', reps: '8', completed: true });
  return finishWorkout(workout, 2_000);
}

test('완료 운동을 루틴으로 저장하고 새 운동은 독립된 복사본으로 시작한다', () => {
  const source = completedWorkout();
  const routine = routineFromWorkout(source, 'r1', 3_000);
  assert.equal(routine.name, '스쿼트 · 벤치프레스 루틴');
  assert.equal(routine.exercises[0].sets[0].weight, '60');
  const started = startWorkoutFromRoutine(routine, 'w2', 4_000);
  assert.equal(started.exercises.length, 2);
  assert.deepEqual(started.exercises[0].sets[0], { id: 'w2:exercise:0:set:0', weight: '60', reps: '10', completed: false });
  const changed = updateSet(started, started.exercises[0].id, started.exercises[0].sets[0].id, { weight: '65' });
  assert.equal(changed.exercises[0].sets[0].weight, '65');
  assert.equal(routine.exercises[0].sets[0].weight, '60');
  assert.equal(source.exercises[0].sets[0].weight, '60');
});

test('루틴 이름을 지정할 수 있고 원본 운동 메타데이터를 바꾸지 않는다', () => {
  const source = completedWorkout();
  const routine = routineFromWorkout(source, 'r1', 3_000, '  월요일 힘내자  ');
  assert.equal(routine.name, '월요일 힘내자');
  assert.equal(routine.exercises[0].catalogId, 'catalog-squat');
  assert.equal(source.exercises[0].id, 'squat');
  assert.equal(defaultRoutineName(source), '스쿼트 · 벤치프레스 루틴');
});

test('진행 중 운동·빈 이름·잘못된 시각은 루틴 저장을 거부한다', () => {
  const active = addExercise(startWorkout('w', 1_000), 'e', '스쿼트');
  assert.throws(() => routineFromWorkout(active, 'r', 2_000));
  const completed = completedWorkout();
  assert.throws(() => routineFromWorkout(completed, '', 3_000));
  assert.throws(() => routineFromWorkout(completed, 'r', -1));
  assert.throws(() => routineFromWorkout(completed, 'r', 3_000, ' '));
});

test('손상된 루틴과 잘못된 시작 정보는 거부한다', () => {
  const routine = routineFromWorkout(completedWorkout(), 'r1', 3_000);
  assert.equal(isRoutine(routine), true);
  assert.equal(isRoutine({ ...routine, exercises: [] }), false);
  assert.equal(isRoutine({ ...routine, exercises: [{ ...routine.exercises[0], sets: [{ weight: '-1', reps: '10' }] }] }), false);
  assert.throws(() => startWorkoutFromRoutine({ ...routine, exercises: [] }, 'w2', 4_000));
  assert.throws(() => startWorkoutFromRoutine(routine, '', 4_000));
});
