import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRufitApi, ApiError } from '../src/api/client.ts';
test('로그인 없이는 네트워크 요청을 보내지 않는다', async () => {
  const api = createRufitApi({ baseUrl:'https://api.example.test', getAccessToken:() => null, fetch:async () => { throw new Error('must not fetch'); } });
  await assert.rejects(api.active(), (e: unknown) => e instanceof ApiError && e.status === 401);
});
test('204 복구 결과와 요청별 갱신 토큰을 지원한다', async () => {
  let token = 'first'; const seen: string[] = [];
  const api = createRufitApi({ baseUrl:'https://api.example.test', getAccessToken:() => token, fetch:async (_, init) => {
    seen.push(new Headers(init?.headers).get('Authorization')!);
    assert.equal(init?.credentials, 'omit'); return new Response(null, {status:204});
  } });
  assert.equal(await api.active(), null); token = 'second'; await api.active();
  assert.deepEqual(seen, ['Bearer first', 'Bearer second']);
});
test('충돌 코드를 보존하고 쓰기를 자동 재시도하지 않는다', async () => {
  let calls = 0;
  const api = createRufitApi({ baseUrl:'https://api.example.test', getAccessToken:() => 'token', fetch:async () => {
    calls++; return Response.json({code:'INCOMPLETE_SETS_CONFIRMATION_REQUIRED', detail:'확인 필요'}, {status:409});
  } });
  await assert.rejects(api.finish('w', 1), (e: unknown) => e instanceof ApiError && e.code === 'INCOMPLETE_SETS_CONFIRMATION_REQUIRED' && !e.outcomeUnknown);
  assert.equal(calls, 1);
});
test('연결이 끊긴 쓰기는 결과가 불명확한 상태로 구분한다', async () => {
  let calls = 0;
  const api = createRufitApi({ baseUrl:'https://api.example.test', getAccessToken:() => 'token', fetch:async () => { calls++; throw new Error('connection lost'); } });
  await assert.rejects(api.start('same-key'), (e: unknown) => e instanceof ApiError && e.outcomeUnknown && e.code === 'NETWORK_ERROR');
  assert.equal(calls, 1);
});
test('시간 초과가 요청을 중단한다', async () => {
  const api = createRufitApi({ baseUrl:'https://api.example.test', timeoutMs:5, getAccessToken:() => 'token', fetch:async (_, init) => new Promise((_, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
  }) });
  await assert.rejects(api.active(), (e: unknown) => e instanceof ApiError && e.code === 'TIMEOUT' && !e.outcomeUnknown);
});
