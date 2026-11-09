import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError, createRufitApi } from '../src/api/client.ts';
test('검색 허용은 명시적 PUT으로만 전달하고 검색어를 URL 인코딩합니다', async () => {
  const calls: { url: string; method: string; body: string | undefined }[] = [];
  const api = createRufitApi({ baseUrl: 'https://api.example.test', getAccessToken: () => 'test-token', fetch: async (url, init) => {
    calls.push({ url: String(url), method: init?.method ?? 'GET', body: init?.body as string | undefined });
    return Response.json({ memberId: null, nickname: null, discoverable: false, version: 0 });
  } });
  await api.directorySettings();
  assert.equal(calls[0].method, 'GET');
  assert.equal(calls[0].body, undefined);
  const edit = { nickname: '루핏회원', discoverable: false, version: 3 };
  await api.updateDirectory(edit);
  assert.equal(calls[1].method, 'PUT');
  assert.deepEqual(JSON.parse(calls[1].body!), edit);
  await api.searchDirectory('루핏%&_');
  const url = new URL(calls[2].url);
  assert.equal(url.pathname, '/api/v1/social/directory/search');
  assert.equal(url.searchParams.get('q'), '루핏%&_');
  assert.equal(url.searchParams.size, 3);
});
test('로그인 없이 친구 검색 요청을 전송하지 않습니다', async () => {
  let calls = 0;
  const api = createRufitApi({ baseUrl: 'https://api.example.test', getAccessToken: () => null, fetch: async () => { calls++; return Response.json({}); } });
  await assert.rejects(api.searchDirectory('루핏'), (error: unknown) => error instanceof ApiError && error.status === 401);
  assert.equal(calls, 0);
});

test('친구 요청 키와 응답 동작을 보존하고 차단 해제는 본인 API로 전송합니다', async () => {
  const calls: { url: string; method: string; body: unknown }[] = [];
  const api = createRufitApi({ baseUrl: 'https://api.example.test', getAccessToken: () => 'test-token', fetch: async (url, init) => {
    calls.push({ url: String(url), method: init?.method ?? 'GET', body: init?.body ? JSON.parse(String(init.body)) : null });
    return new Response(null, { status: 204 });
  } });
  await api.sendFriendRequest('same-request-id', 'public-member-id');
  await api.respondFriendRequest('request/id', 'ACCEPT');
  await api.unblockMember('public-member-id');
  assert.deepEqual(calls[0].body, { requestId: 'same-request-id', targetId: 'public-member-id' });
  assert.ok(calls[1].url.endsWith('/social/requests/request%2Fid/respond'));
  assert.deepEqual(calls[1].body, { action: 'ACCEPT' });
  assert.equal(calls[2].method, 'DELETE');
});

test('친구 해제·공개 프로필·신고는 공개 회원 ID와 정해진 요청 형식만 사용합니다', async () => {
  const calls: { url: string; method: string; body: unknown }[] = [];
  const api = createRufitApi({ baseUrl: 'https://api.example.test', getAccessToken: () => 'test-token', fetch: async (url, init) => {
    calls.push({ url: String(url), method: init?.method ?? 'GET', body: init?.body ? JSON.parse(String(init.body)) : null });
    return init?.method === 'DELETE' ? new Response(null, { status: 204 }) : Response.json({});
  } });
  await api.removeFriend('member/id');
  await api.memberProfile('member/id');
  await api.reportMember('stable-report-id', 'member/id', 'HARASSMENT');
  assert.deepEqual(calls, [
    { url: 'https://api.example.test/api/v1/social/friends/member%2Fid', method: 'DELETE', body: null },
    { url: 'https://api.example.test/api/v1/social/members/member%2Fid', method: 'GET', body: null },
    { url: 'https://api.example.test/api/v1/social/reports', method: 'POST', body: { requestId: 'stable-report-id', targetId: 'member/id', reason: 'HARASSMENT' } },
  ]);
});
