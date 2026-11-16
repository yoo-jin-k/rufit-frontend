import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createWorkoutStorage,
  emptyArchive,
  remember,
  restoredPauseTime,
} from '../src/features/workout/storage.ts';
import {
  addExercise,
  finishWorkout,
  startWorkout,
  updateSet,
  type Workout,
} from '../src/features/workout/model.ts';
import {
  recentWorkouts,
  startCard,
  workoutFromTemplate,
} from '../src/features/workout/startSheetModel.ts';

function disk() {
  const items = new Map<string, string>();
  return {
    getItem: async (key: string) => items.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      items.set(key, value);
    },
  };
}

test('앱을 껐다 켜면 마지막으로 켜져 있던 시각에 운동을 멈춥니다', async () => {
  const store = disk();
  const realNow = Date.now;
  try {
    Date.now = () => 10_000;
    await createWorkoutStorage(store, true).save(
      remember(emptyArchive(), startWorkout('w', 1_000)),
    );
    await createWorkoutStorage(store, true).touch(70_000);
    Date.now = () => 500_000;
    const restored = (await createWorkoutStorage(store, true).load()).current!;
    assert.equal(restored.pausedAt, 70_000, '꺼져 있던 시간은 운동 시간에 넣지 않습니다');
  } finally {
    Date.now = realNow;
  }
});

test('켜져 있던 시각 기록이 없거나 이상하면 마지막 저장 시각을 씁니다', () => {
  assert.equal(restoredPauseTime(5_000, Number.NaN, 9_000), 5_000);
  assert.equal(restoredPauseTime(5_000, 3_000, 9_000), 5_000);
  assert.equal(restoredPauseTime(5_000, 8_000, 9_000), 8_000);
  assert.equal(
    restoredPauseTime(5_000, 50_000, 9_000),
    9_000,
    '미래 시각은 지금 시각으로 자릅니다',
  );
});

function finished(id: string, startedAt: number, recordDate?: string): Workout {
  let w = addExercise(
    startWorkout(id, startedAt),
    `${id}-e`,
    '스쿼트',
    '00000000-0000-4000-8000-000000000001',
  );
  w = updateSet(w, `${id}-e`, `${id}-e-1`, { weight: '60', reps: '10', completed: true });
  w = finishWorkout(w, startedAt + 3_600_000);
  return recordDate ? { ...w, recordDate } : w;
}

test('최근 운동은 종료한 기록만 최근 날짜 순으로 보여 줍니다', () => {
  const running = startWorkout('run', 9e12);
  const empty: Workout = { ...startWorkout('empty', 1), finishedAt: 2 };
  const list = recentWorkouts([
    finished('a', Date.UTC(2026, 8, 1)),
    running,
    empty,
    finished('b', Date.UTC(2026, 8, 3)),
  ]);
  assert.deepEqual(
    list.map((w) => w.id),
    ['b', 'a'],
  );
  const card = startCard(list[0]!);
  assert.equal(card.parts, '하체');
  assert.equal(card.meta, '1종목 · 1시간 0분');
  assert.deepEqual([card.rows[0]!.sets, card.rows[0]!.weight, card.rows[0]!.reps], [1, '60', '10']);
});

test('불러오기는 종목과 무게·횟수만 복사하고 완료 표시와 원본은 그대로 둡니다', () => {
  const source = finished('a', 1_000);
  let n = 0;
  const copy = workoutFromTemplate(source, 'new', 99_000, () => `x${++n}`);
  assert.equal(copy.id, 'new');
  assert.equal(copy.startedAt, 99_000);
  assert.equal(copy.finishedAt, undefined);
  assert.deepEqual(
    copy.exercises.map((e) => [e.name, e.catalogId]),
    [['스쿼트', '00000000-0000-4000-8000-000000000001']],
  );
  assert.deepEqual(copy.exercises[0]!.sets, [
    { id: 'x1-1', weight: '60', reps: '10', completed: false },
  ]);
  assert.equal(source.exercises[0]!.sets[0]!.completed, true);
});
