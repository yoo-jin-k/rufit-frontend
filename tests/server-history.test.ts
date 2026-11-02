import test from 'node:test';
import assert from 'node:assert/strict';
import { readServerHistory, serverWorkout } from '../src/features/workout/serverHistory.ts';
import type { WorkoutSnapshot } from '../src/api/client.ts';
import type { RufitSession } from '../src/api/session.ts';
const record: WorkoutSnapshot = {
  id: '11111111-1111-4111-8111-111111111111', version: 1,
  startedAt: '2026-10-30T10:00:00Z', finishedAt: '2026-10-30T10:30:00Z', cancelledAt: null,
  sourceRoutineId: null, note: '', restSetIndex: null, restEndsAt: null,
  sets: [{ exerciseName: '스쿼트', weight: 20, reps: 10 }, { exerciseName: '스쿼트', weight: 30, reps: 8 }],
  completedSetIndexes: [0, 1], pausedDurationMs: 60000,
};
test('서버 기록은 별도 ID와 완료 세트로 변환하며 원본을 보존합니다', () => {
  const before = JSON.stringify(record);
  const result = serverWorkout(record);
  assert.equal(result.id, `server:${record.id}`);
  assert.equal(result.exercises.length, 1);
  assert.equal(result.exercises[0].sets.length, 2);
  assert.equal(result.pausedDurationMs, 60000);
  assert.equal(JSON.stringify(record), before);
  for (const patch of [{ finishedAt: null }, { completedSetIndexes: [0, 0] }, { startedAt: 'bad' }, { sets: [{ exerciseName: '스쿼트', weight: -1, reps: 2 }], completedSetIndexes: [0] }])
    assert.throws(() => serverWorkout({ ...record, ...patch }));
});
test('서버 조회 도중 로그아웃되면 응답을 폐기합니다', async () => {
  let active = true, finish!: (value: unknown) => void;
  const session = { isActive: () => active, api: { history: () => new Promise((resolve) => { finish = resolve; }) } } as unknown as RufitSession;
  const pending = readServerHistory(session, 0);
  active = false;
  finish({ page: 0, items: [record], hasNext: false });
  await assert.rejects(pending, /로그인이 변경/);
  await assert.rejects(readServerHistory(session, 0), /다시 로그인/);
});
test('빈 목록과 다음 페이지를 구분하고 잘못된 페이지 응답을 거부합니다', async () => {
  const response = { page: 0, items: [] as WorkoutSnapshot[], hasNext: false };
  const session = { isActive: () => true, api: { history: async () => response } } as unknown as RufitSession;
  assert.deepEqual(await readServerHistory(session, 0), { records: [], hasNext: false });
  response.items = [record]; response.hasNext = true;
  assert.equal((await readServerHistory(session, 0)).records.length, 1);
  await assert.rejects(readServerHistory(session, 1), /목록/);
});
