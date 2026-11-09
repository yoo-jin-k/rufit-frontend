import test from 'node:test';
import assert from 'node:assert/strict';
import type { RufitSession } from '../src/api/session.ts';
import type { OfflineWorkoutImport, ServerMeasurement } from '../src/api/client.ts';
import type { Workout } from '../src/features/workout/model.ts';
import { uploadWorkout, workoutImportBody } from '../src/features/sync/workoutTransfer.ts';
import {
  compareMeasurements,
  measurementComparisons,
  transferMeasurement,
} from '../src/features/sync/measurementTransfer.ts';
import { weightStorageKey } from '../src/features/bodyweight/model.ts';
import { serverWorkout } from '../src/features/workout/serverHistory.ts';

const id = '11111111-1111-4111-8111-111111111111';
function storage() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: async (key: string) => data.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      data.set(key, value);
    },
  };
}
function session(api: object, accountId = 'owner') {
  let active = true;
  return {
    scope: { server: 'https://example.test', accountId },
    api,
    isActive: () => active,
    close: () => {
      active = false;
    },
  } as unknown as RufitSession;
}
function workout(): Workout {
  return {
    id: 'local-1',
    startedAt: Date.parse('2026-01-10T00:00:00Z'),
    finishedAt: Date.parse('2026-01-10T00:30:00Z'),
    exercises: [
      {
        id: 'exercise-1',
        name: '스쿼트',
        sets: [{ id: 'set-1', weight: '20', reps: '10', completed: true }],
      },
    ],
  };
}
function imported(key: string, body: OfflineWorkoutImport) {
  return {
    replayed: false,
    importedVersion: 1,
    workout: {
      id: key,
      version: 1,
      ...body,
      cancelledAt: null,
      sourceRoutineId: null,
      restEndsAt: null,
      restSetIndex: null,
      sets: body.sets.map((s) => s.set),
      completedSetIndexes: body.sets.map((_, i) => i),
    },
  };
}
const remote = (weight = 70, version = 1): ServerMeasurement => ({
  date: '2026-01-01',
  version,
  weight,
  bench: null,
  squat: null,
  deadlift: null,
});
const local = { date: '2026-01-01', weight: 71 };

// 실제 사용자 저장소와 분리된 메모리 저장소로 실패·재시도·계정 전환을 재현합니다.
test('응답 유실 후에도 같은 전송 번호로 재시도하며 완료한 전송은 반복하지 않습니다', async () => {
  const store = storage();
  const keys: string[] = [];
  const auth = session({
    importWorkout: async (key: string, body: OfflineWorkoutImport) => {
      keys.push(key);
      if (keys.length === 1) throw new Error('응답 유실');
      return imported(key, body);
    },
  });
  await assert.rejects(
    uploadWorkout(store, auth, workout(), () => id),
    /응답 유실/,
  );
  await uploadWorkout(store, auth, workout(), () => {
    throw new Error('번호 재생성 금지');
  });
  assert.equal((await uploadWorkout(store, auth, workout(), () => id)).replayed, true);
  assert.deepEqual(keys, [id, id]);
});
test('다른 계정 전송과 업로드 이후 원본 변경을 차단합니다', async () => {
  const store = storage();
  let calls = 0;
  const api = {
    importWorkout: async (key: string, body: OfflineWorkoutImport) => {
      calls++;
      return imported(key, body);
    },
  };
  await uploadWorkout(store, session(api), workout(), () => id);
  await assert.rejects(
    uploadWorkout(store, session(api, 'other'), workout(), () => id),
    /다른 계정/,
  );
  const changed = workout();
  changed.exercises[0].sets[0].weight = '30';
  await assert.rejects(
    uploadWorkout(store, session(api), changed, () => id),
    /내용이 다릅니다/,
  );
  assert.equal(calls, 1);
});
test('전송 장부 저장 실패 시 네트워크로 보내지 않습니다', async () => {
  const store = storage();
  let called = false;
  const original = store.setItem;
  store.setItem = async (key, value) => {
    if (key.includes('workout-transfers')) throw new Error('저장 공간');
    await original(key, value);
  };
  await assert.rejects(
    uploadWorkout(
      store,
      session({
        importWorkout: () => {
          called = true;
        },
      }),
      workout(),
      () => id,
    ),
    /저장 공간/,
  );
  assert.equal(called, false);
});
test('수동 입력 날짜와 시간 미측정 상태를 왕복 보존하며 미완료 세트는 거부합니다', () => {
  const manual = {
    ...workout(),
    recordDate: '2025-12-31',
    entryMode: 'manual' as const,
    finishedAt: workout().startedAt,
  };
  const body = workoutImportBody(manual);
  const result = serverWorkout(imported(id, body).workout);
  assert.equal(result.recordDate, '2025-12-31');
  assert.equal(result.entryMode, 'manual');
  assert.equal(result.startedAt, result.finishedAt);
  const incomplete = workout();
  incomplete.exercises[0].sets[0].completed = false;
  assert.throws(() => workoutImportBody(incomplete), /완료한/);
});
test('기기·서버 측정값을 비교하고 충돌을 자동으로 덮어쓰지 않습니다', () => {
  assert.equal(compareMeasurements('weight', [local], [remote()])[0].state, 'different');
  assert.equal(compareMeasurements('weight', [local], [remote(71)])[0].state, 'same');
  assert.equal(compareMeasurements('weight', [local], [])[0].state, 'local-only');
  assert.equal(compareMeasurements('weight', [], [remote()])[0].state, 'server-only');
  assert.throws(() => compareMeasurements('weight', [], [remote(), remote()]), /중복/);
});
test('서버 버전 충돌 시 기기 측정값을 보존하며 기대 버전을 전달합니다', async () => {
  const store = storage();
  const raw = JSON.stringify({ version: 1, records: [local] });
  store.data.set(weightStorageKey, raw);
  const row = compareMeasurements('weight', [local], [remote(70, 5)])[0];
  const auth = session({
    saveMeasurement: async (_kind: string, _date: string, body: { version: number }) => {
      assert.equal(body.version, 5);
      throw new Error('버전 충돌');
    },
  });
  await assert.rejects(transferMeasurement(store, auth, row, 'upload'), /버전 충돌/);
  assert.equal(store.data.get(weightStorageKey), raw);
});
test('비교 후 기기 값이 바뀌면 중단하고 다운로드 시 다른 날짜는 보존합니다', async () => {
  const store = storage();
  const row = compareMeasurements('weight', [local], [remote()])[0];
  store.data.set(
    weightStorageKey,
    JSON.stringify({ version: 1, records: [{ ...local, weight: 72 }] }),
  );
  await assert.rejects(transferMeasurement(store, session({}), row, 'download'), /바뀌었습니다/);
  const other = { date: '2025-12-31', weight: 73 };
  store.data.set(weightStorageKey, JSON.stringify({ version: 1, records: [other, local] }));
  await transferMeasurement(store, session({}), row, 'download');
  assert.deepEqual(JSON.parse(store.data.get(weightStorageKey)!).records, [
    other,
    { ...local, weight: 70 },
  ]);
});
test('페이지를 모두 읽으며 조회 중 로그아웃된 결과는 폐기합니다', async () => {
  const store = storage();
  let calls = 0;
  const auth = session({
    measurements: async (_kind: string, page: number) => {
      calls++;
      return {
        page,
        items: [page === 0 ? remote() : { ...remote(), date: '2025-12-31' }],
        hasNext: page === 0,
      };
    },
  });
  assert.equal((await measurementComparisons(store, auth, 'weight')).length, 2);
  assert.equal(calls, 2);
  const closed = session({
    measurements: async () => {
      closed.close();
      return { page: 0, items: [], hasNext: false };
    },
  });
  await assert.rejects(measurementComparisons(store, closed, 'weight'), /로그인이 변경/);
});
test('오래된 소수 셋째 자리 측정값은 서버 전송 전에 거부합니다', async () => {
  const store = storage();
  const invalid = { ...local, weight: 70.123 };
  store.data.set(weightStorageKey, JSON.stringify({ version: 1, records: [invalid] }));
  let called = false;
  await assert.rejects(
    transferMeasurement(
      store,
      session({
        saveMeasurement: () => {
          called = true;
        },
      }),
      { kind: 'weight', date: invalid.date, local: invalid, remote: null, state: 'local-only' },
      'upload',
    ),
    /소수 둘째/,
  );
  assert.equal(called, false);
});
