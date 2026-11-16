import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addExercise,
  addSet,
  finishWorkout,
  startWorkout,
  updateSet,
  type Workout,
} from '../src/features/workout/model.ts';
import {
  fillRemainingSets,
  recentSet,
  recommendSet,
  stepReps,
  stepWeight,
  weightless,
} from '../src/features/workout/setEditorModel.ts';

const SQUAT = '00000000-0000-4000-8000-000000000001';

function threeSets(): Workout {
  let w = addExercise(startWorkout('w', 0), 'e', '스쿼트', SQUAT);
  w = addSet(w, 'e', 's2');
  w = addSet(w, 'e', 's3');
  return w;
}

test('무게는 0~1500kg, 횟수는 1회 이상으로만 증감합니다', () => {
  assert.equal(stepWeight('5', 0.5), '5.5');
  assert.equal(stepWeight('0.5', -5), '0');
  assert.equal(stepWeight('', 5), '5');
  assert.equal(stepWeight('1498', 5), '1500');
  assert.equal(stepWeight('22.25', 0.5), '22.75');
  assert.equal(stepReps('1', -1), '1');
  assert.equal(stepReps('', 5), '5');
  assert.equal(stepReps('15', -5), '10');
});

test('남은 세트 통일은 고른 세트 뒤의 완료하지 않은 세트에만 적용합니다', () => {
  let w = threeSets();
  const [s1, s2] = w.exercises[0]!.sets.map((s) => s.id);
  w = updateSet(w, 'e', s1!, { weight: '40', reps: '12' });
  w = updateSet(w, 'e', s2!, { weight: '50', reps: '10' });
  const result = fillRemainingSets(w, 'e', s2!);
  const sets = result.workout.exercises[0]!.sets;
  assert.deepEqual(
    sets.map((s) => [s.weight, s.reps]),
    [
      ['40', '12'],
      ['50', '10'],
      ['50', '10'],
    ],
    '1세트는 그대로',
  );
  assert.equal(result.count, 1);
});

test('남은 세트 통일은 이미 완료한 뒤쪽 세트를 덮어쓰지 않습니다', () => {
  let w = threeSets();
  const [s1, , s3] = w.exercises[0]!.sets.map((s) => s.id);
  w = updateSet(w, 'e', s3!, { weight: '30', reps: '8', completed: true });
  w = updateSet(w, 'e', s1!, { weight: '60', reps: '5' });
  const result = fillRemainingSets(w, 'e', s1!);
  assert.deepEqual(
    result.workout.exercises[0]!.sets.map((s) => [s.weight, s.reps, s.completed]),
    [
      ['60', '5', false],
      ['60', '5', false],
      ['30', '8', true],
    ],
  );
  assert.equal(result.count, 1);
});

function past(sets: [string, string][]): Workout {
  let w = addExercise(startWorkout('p', 1_000), 'pe', '스쿼트', SQUAT);
  sets.forEach(([weight, reps], i) => {
    if (i > 0) w = addSet(w, 'pe', `pe-${i + 1}`);
    w = updateSet(w, 'pe', w.exercises[0]!.sets[i]!.id, { weight, reps, completed: true });
  });
  return finishWorkout(w, 2_000);
}

test('처음 하는 종목은 장비별 시작값을 추천합니다', () => {
  const target = threeSets().exercises[0]!;
  assert.deepEqual(recommendSet([], target, 'BARBELL'), {
    weight: '20',
    reps: '10',
    basis: 'starter',
  });
  assert.deepEqual(recommendSet([], target, 'BODYWEIGHT'), {
    weight: '0',
    reps: '10',
    basis: 'starter',
  });
  assert.deepEqual(recommendSet([], target, undefined), {
    weight: '5',
    reps: '10',
    basis: 'starter',
  });
});

test('지난 기록이 있으면 가장 무거운 세트에서 1회 더, 12회를 넘기면 무게를 올립니다', () => {
  const target = threeSets().exercises[0]!;
  assert.deepEqual(
    recommendSet(
      [
        past([
          ['60', '10'],
          ['70', '8'],
        ]),
      ],
      target,
      'BARBELL',
    ),
    { weight: '70', reps: '9', basis: 'history' },
  );
  assert.deepEqual(recommendSet([past([['60', '12']])], target, 'BARBELL'), {
    weight: '62.5',
    reps: '8',
    basis: 'history',
  });
});

test('최근 값은 지난 기록의 같은 순서 세트, 없으면 마지막 세트입니다', () => {
  const history = [
    past([
      ['60', '10'],
      ['65', '8'],
    ]),
  ];
  const target = threeSets().exercises[0]!;
  assert.deepEqual(
    [recentSet(history, target, 1)?.weight, recentSet(history, target, 1)?.reps],
    ['65', '8'],
  );
  assert.equal(recentSet(history, target, 2)?.weight, '65');
  assert.equal(recentSet([], target, 0), undefined);
});

test('맨몸 장비만 무게를 받지 않습니다', () => {
  assert.equal(weightless('BODYWEIGHT'), true);
  assert.equal(weightless('BARBELL'), false);
  assert.equal(weightless(undefined), false);
});
