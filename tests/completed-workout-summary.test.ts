import test from 'node:test';
import assert from 'node:assert/strict';
import { completedWorkoutsOnDay, completedWorkoutSummary, dailyWorkoutSummary } from '../src/features/workout/completedWorkoutSummary.ts';
import type { Workout } from '../src/features/workout/model.ts';
const now = new Date(2026, 10, 3, 13).getTime();
const workout: Workout = {
  id: 'saved', startedAt: now - 120000, finishedAt: now,
  exercises: [
    { id: 'a', catalogId: '00000000-0000-4000-8000-000000000001', name: '스쿼트', sets: [
      { id: 'a1', weight: '20', reps: '10', completed: true },
      { id: 'a2', weight: '100', reps: '10', completed: false },
    ] },
    { id: 'b', catalogId: '00000000-0000-4000-8000-000000000002', name: '벤치프레스', sets: [
      { id: 'b1', weight: '30', reps: '12', completed: true },
    ] },
  ],
};
test('저장한 여러 종목을 한 세션 요약으로 묶고 완료한 세트만 중량에 합산합니다', () => {
  assert.deepEqual(completedWorkoutSummary(workout), { duration: '2분', volume: '560', parts: '하체, 가슴', exercises: '2개 | 스쿼트 외 1개' });
});
test('오늘의 운동은 날짜 지정 기록을 우선하고 각 운동 세션을 따로 유지합니다', () => {
  const second = { ...workout, id: 'second', startedAt: now - 60000 };
  const result = completedWorkoutsOnDay([workout, second, { ...workout, id: 'past', recordDate: '2026-11-02' }, { ...workout, id: 'running', finishedAt: undefined }], now);
  assert.deepEqual(result.map(item => item.id), ['second', 'saved']);
  assert.equal(completedWorkoutsOnDay([workout], new Date(2026, 10, 4).getTime()).length, 0);
});
test('수동 입력은 측정하지 않은 시간을 표시하고 한 종목에는 외 문구를 붙이지 않습니다', () => {
  const summary = completedWorkoutSummary({ ...workout, entryMode: 'manual', exercises: [workout.exercises[0]] });
  assert.equal(summary.duration, '시간 미측정');
  assert.equal(summary.exercises, '1개 | 스쿼트');
});

test('같은 날 여러 번 저장해도 하루 합계 한 개로 요약하고 동일 종목은 중복 집계하지 않습니다', () => {
  const second = { ...workout, id: 'second' };
  const original = JSON.stringify([workout, second]);
  assert.deepEqual(dailyWorkoutSummary([workout, second]), { duration: '4분', volume: '1,120', parts: '하체, 가슴', exercises: '2개 | 스쿼트 외 1개' });
  assert.equal(JSON.stringify([workout, second]), original);
  assert.equal(dailyWorkoutSummary([workout, { ...second, entryMode: 'manual' }]).duration, '2분 · 일부 시간 미측정');
});
