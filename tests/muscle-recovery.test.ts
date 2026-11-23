import test from 'node:test';
import assert from 'node:assert/strict';
import { exerciseCatalog } from '../src/features/exercises/catalog.ts';
import {
  formatReadyAt,
  muscleRecovery,
  recoveryLevel,
  volumeFactor,
} from '../src/features/recovery/model.ts';
import type { Workout } from '../src/features/workout/model.ts';

const HOUR = 3_600_000;
const squat = exerciseCatalog.find((e) => e.name === '스쿼트')!;
const legExtension = exerciseCatalog.find((e) => e.name === '레그 익스텐션')!;
const fullBody = exerciseCatalog.find((e) => e.bodyPart === 'FULL_BODY')!;

function workout(
  finishedAt: number,
  catalogId: string,
  name: string,
  sets: number,
  done = true,
): Workout {
  return {
    id: `w-${finishedAt}-${catalogId}`,
    startedAt: finishedAt - HOUR,
    finishedAt,
    exercises: [
      {
        id: 'e',
        name,
        catalogId,
        sets: Array.from({ length: sets }, (_, i) => ({
          id: `s${i}`,
          weight: '60',
          reps: '8',
          completed: done,
        })),
      },
    ],
  };
}
const part = (list: ReturnType<typeof muscleRecovery>, name: string) =>
  list.find((item) => item.part === name)!;

test('기록이 없으면 모든 부위가 회복 완료입니다', () => {
  const result = muscleRecovery([], exerciseCatalog, Date.now());
  assert.equal(result.length, 6);
  assert.ok(result.every((item) => item.percent === 100 && item.readyAt === null));
});

test('하체 바벨 6세트는 72시간 + 무거운 운동 12시간 뒤에 회복됩니다', () => {
  const end = Date.UTC(2026, 10, 20, 9);
  const at = (hours: number) =>
    muscleRecovery([workout(end, squat.id, squat.name, 6)], exerciseCatalog, end + hours * HOUR);
  assert.equal(part(at(0), 'LEGS').readyAt, end + 84 * HOUR);
  assert.equal(part(at(42), 'LEGS').percent, 50);
  assert.equal(part(at(42), 'LEGS').lastExercise, '스쿼트');
  assert.equal(part(at(84), 'LEGS').percent, 100);
  // 다른 부위는 영향을 받지 않습니다.
  assert.equal(part(at(0), 'CHEST').percent, 100);
});

test('세트 수가 적으면 짧게, 많으면 길게 잡습니다', () => {
  assert.equal(volumeFactor(3), 0.75);
  assert.equal(volumeFactor(8), 1);
  assert.equal(volumeFactor(12), 1.25);
  const end = Date.UTC(2026, 10, 20, 9);
  const light = muscleRecovery(
    [workout(end, legExtension.id, legExtension.name, 3)],
    exerciseCatalog,
    end,
  );
  assert.equal(part(light, 'LEGS').readyAt, end + 72 * 0.75 * HOUR);
});

test('완료하지 않은 세트, 직접 만든 종목, 일주일이 지난 기록은 계산하지 않습니다', () => {
  const now = Date.UTC(2026, 10, 20, 9);
  const result = muscleRecovery(
    [
      workout(now - HOUR, squat.id, squat.name, 5, false),
      {
        ...workout(now - HOUR, 'custom', '나만의 운동', 5),
        exercises: [
          {
            id: 'c',
            name: '나만의 운동',
            sets: [{ id: 's', weight: '10', reps: '10', completed: true }],
          },
        ],
      },
      workout(now - 8 * 24 * HOUR, squat.id, squat.name, 10),
    ],
    exerciseCatalog,
    now,
  );
  assert.ok(result.every((item) => item.percent === 100));
});

test('회복 전에 같은 부위를 또 하면 남은 피로의 절반만큼 더 걸립니다', () => {
  const first = Date.UTC(2026, 10, 18, 9);
  const second = first + 24 * HOUR;
  const result = muscleRecovery(
    [workout(first, squat.id, squat.name, 6), workout(second, squat.id, squat.name, 6)],
    exerciseCatalog,
    second,
  );
  // 첫 운동은 84시간 뒤 회복 예정이라 24시간 시점에 60시간이 남아 있습니다.
  assert.equal(part(result, 'LEGS').readyAt, second + (84 + 30) * HOUR);
});

test('전신 운동은 하체·등·어깨·코어에 반씩 나눠 반영합니다', () => {
  const end = Date.UTC(2026, 10, 20, 9);
  const result = muscleRecovery(
    [workout(end, fullBody.id, fullBody.name, 4)],
    exerciseCatalog,
    end,
  );
  for (const name of ['LEGS', 'BACK', 'SHOULDERS', 'CORE'])
    assert.ok(part(result, name).readyAt, name);
  assert.equal(part(result, 'CHEST').readyAt, null);
  assert.equal(part(result, 'ARMS').readyAt, null);
});

test('회복 단계와 회복 예정 시각 문구', () => {
  assert.equal(recoveryLevel(10), 'fresh');
  assert.equal(recoveryLevel(50), 'recovering');
  assert.equal(recoveryLevel(80), 'almost');
  assert.equal(recoveryLevel(100), 'ready');
  const now = new Date(2026, 10, 20, 10).getTime();
  assert.equal(formatReadyAt(new Date(2026, 10, 20, 15).getTime(), now), '오늘 오후 3시');
  assert.equal(formatReadyAt(new Date(2026, 10, 21, 9).getTime(), now), '내일 오전 9시');
  assert.equal(formatReadyAt(new Date(2026, 10, 25, 0).getTime(), now), '11월 25일 오전 12시');
});

test('화면 시계가 운동 종료보다 조금 늦게 흘러도 방금 끝난 운동을 빼지 않습니다', () => {
  const end = Date.UTC(2026, 10, 20, 9);
  const result = muscleRecovery(
    [workout(end, squat.id, squat.name, 6)],
    exerciseCatalog,
    end - 30_000,
  );
  assert.equal(part(result, 'LEGS').percent, 0);
  assert.ok(part(result, 'LEGS').readyAt);
});
