import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_BODY_KG, formatKcal, latestBodyKg, workoutCalories } from '../src/features/calories/model.ts';
import { addExercise, finishWorkout, startWorkout, updateSet, type Workout } from '../src/features/workout/model.ts';

function done(minutes: number): Workout {
  let w = addExercise(startWorkout('w', 0), 'a', '스쿼트', 'sq');
  w = addExercise(w, 'b', '푸시업', 'pu');
  w = updateSet(w, 'a', 'a-1', { weight: '60', reps: '10', completed: true });
  w = updateSet(w, 'b', 'b-1', { weight: '0', reps: '10', completed: true });
  return finishWorkout(w, minutes * 60_000);
}

test('MET 3.5 × 체중 × 시간으로 계산하고 완료 세트 비율로 종목에 나눕니다', () => {
  const result = workoutCalories(done(60), 80, 0)!;
  assert.equal(Math.round(result.total), 280);
  assert.equal(Math.round(result.byExercise.a!), 140);
  assert.equal(Math.round(result.byExercise.b!), 140);
});

test('체중이 이상하면 기본 체중, 직접 입력 기록은 계산하지 않습니다', () => {
  assert.equal(Math.round(workoutCalories(done(60), Number.NaN, 0)!.total), Math.round(3.5 * DEFAULT_BODY_KG));
  assert.equal(workoutCalories({ ...done(60), entryMode: 'manual' }, 70, 0), null);
});

test('진행 중인 운동은 지금 시각까지, 종목이 없어도 시간만큼 계산합니다', () => {
  assert.equal(Math.round(workoutCalories(startWorkout('w', 0), 70, 30 * 60_000)!.total), Math.round(3.5 * 70 * 0.5));
});

test('체중은 가장 최근 기록, 없으면 70kg 추정이고 표기는 반올림합니다', () => {
  assert.deepEqual(latestBodyKg([{ date: '2026-11-01', weight: 72 }, { date: '2026-11-10', weight: 71.5 }]), { kg: 71.5, estimated: false });
  assert.deepEqual(latestBodyKg([]), { kg: 70, estimated: true });
  assert.equal(formatKcal(1234.6), '약 1,235kcal');
});
