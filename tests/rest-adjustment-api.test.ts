import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError, createRufitApi, type WorkoutSnapshot } from '../src/api/client.ts';

const id = '11111111-1111-4111-8111-111111111111';
const initial: WorkoutSnapshot = {
  id, startedAt: '2026-09-13T12:30:00Z', finishedAt: null, cancelledAt: null, sourceRoutineId: null,
  version: 12, sets: [{exerciseName: '스쿼트', weight: 1, reps: 2}], completedSetIndexes: [0],
  restEndsAt: '2026-09-13T13:00:00Z', restSetIndex: 0, note: '', pausedAt: null, pausedDurationMs: 0,
};

// 계약의 응답 유실을 재현한다. POST가 적용됐는지는 GET 전까지 추측하지 않는다.
for (const failure of ['network', 'invalid-json', 'storage-unavailable', 'timeout'] as const) {
  test(`휴식 조절 ${failure} 후 POST를 반복하지 않고 조회로 최신 버전을 복구한다`, async () => {
    let server = {...initial};
    const calls: string[] = [];
    let loseResponse = true;
    const api = createRufitApi({baseUrl: 'https://api.example.test', getAccessToken: () => 'test-token', timeoutMs: 20,
      fetch: async (url, init) => {
        calls.push(`${init?.method} ${new URL(String(url)).pathname}`);
        assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer test-token');
        if (init?.method === 'GET') return Response.json(server);
        assert.equal(String(url), `https://api.example.test/api/v1/workouts/${id}/rest/adjust`);
        const body = JSON.parse(String(init?.body));
        assert.deepEqual(Object.keys(body).sort(), ['seconds', 'version']);
        assert.equal(body.version, server.version);
        assert.equal(body.seconds, loseResponse ? 10 : -10);
        server = {...server, version: server.version + 1,
          restEndsAt: new Date(Date.parse(server.restEndsAt!) + body.seconds * 1000).toISOString()};
        if (loseResponse) {
          loseResponse = false;
          if (failure === 'network') throw new Error('response lost after commit');
          if (failure === 'invalid-json') return new Response('{', {status: 200});
          if (failure === 'storage-unavailable') return Response.json({code: 'STORAGE_UNAVAILABLE'}, {status: 503});
          return new Promise((_, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('timeout'))));
        }
        return Response.json(server);
      }});
    await assert.rejects(api.adjustRest(id, 12, 10), (e: unknown) => e instanceof ApiError && e.outcomeUnknown);
    assert.equal(calls.length, 1);
    const recovered = await api.workout(id);
    assert.equal(recovered.version, 13);
    assert.equal(recovered.restEndsAt, '2026-09-13T13:00:10.000Z');
    assert.deepEqual(recovered.sets, initial.sets);
    assert.deepEqual(recovered.completedSetIndexes, [0]);
    assert.equal(recovered.restSetIndex, 0);
    assert.equal(recovered.pausedAt, initial.pausedAt);
    // 조회는 조절 재시도가 아니다. 이후 명시적인 새 -10초 조작만 최신 버전으로 보낸다.
    const next = await api.adjustRest(id, recovered.version, -10);
    assert.equal(next.version, 14);
    assert.equal(Date.parse(next.restEndsAt!), Date.parse(initial.restEndsAt!));
    assert.deepEqual(calls.map(c => c.split(' ')[0]), ['POST', 'GET', 'POST']);
  });
}

test('휴식 충돌과 조회 실패 뒤에도 추가 조절을 자동 전송하지 않는다', async () => {
  const calls: string[] = [];
  const api = createRufitApi({baseUrl: 'https://api.example.test', getAccessToken: () => 'test-token', fetch: async (_, init) => {
    calls.push(init!.method!);
    if (init?.method === 'GET') throw new Error('offline');
    return Response.json({type: 'about:blank', title: 'Conflict', status: 409, detail: 'state changed',
      instance: `/api/v1/workouts/${id}/rest/adjust`, code: 'STATE_CONFLICT'}, {status: 409});
  }});
  await assert.rejects(api.adjustRest(id, 12, 10), (e: unknown) => e instanceof ApiError && e.status === 409 && !e.outcomeUnknown);
  await assert.rejects(api.workout(id), (e: unknown) => e instanceof ApiError && e.code === 'NETWORK_ERROR');
  assert.deepEqual(calls, ['POST', 'GET']);
});
