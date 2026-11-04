import assert from 'node:assert/strict';
import {createHash, randomBytes} from 'node:crypto';
import {createAuthApi} from '../src/features/auth/authApi.ts';
import {AuthCoordinator} from '../src/features/auth/authCoordinator.ts';
import type {SessionStore} from '../src/features/auth/secureSessionStore.ts';
import type {AuthClient, SocialProvider, StoredSession} from '../src/features/auth/types.ts';

const baseUrl = process.env.RUFIT_AUTH_INTEGRATION_URL ?? 'http://127.0.0.1:8096';
const root = new URL(baseUrl);
if (root.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(root.hostname) || root.username || root.password)
  throw new Error('통합 시험은 loopback HTTP 서버만 사용할 수 있습니다.');

function memoryStore(): SessionStore & {value: StoredSession | null} {
  return {value: null, async save(value) { this.value = value; }, async clear() { this.value = null; }, async hasSavedSession() { return this.value !== null; }};
}

async function createPkce() {
  const verifier = randomBytes(32).toString('base64url');
  return {verifier, challenge: createHash('sha256').update(verifier).digest('base64url')};
}

function fakeBrowser(fixtureUser: 'alice' | 'bob') {
  return {open: async (authorizationUrl: string) => {
    let current = new URL(authorizationUrl);
    current.searchParams.set('fixtureUser', fixtureUser);
    for (let redirects = 0; redirects < 4; redirects++) {
      if (current.protocol === 'rufit:') return {type: 'success' as const, url: current.toString()};
      if (current.origin !== root.origin) throw new Error('fixture 서버 밖으로 이동하지 않습니다.');
      const response = await fetch(current, {method: 'GET', redirect: 'manual', credentials: 'omit'});
      if (![301, 302, 303, 307, 308].includes(response.status)) throw new Error('fake 공급자 redirect 응답을 확인하지 못했습니다.');
      const location = response.headers.get('Location');
      if (!location) throw new Error('fake 공급자 redirect 위치가 없습니다.');
      current = new URL(location, current);
    }
    throw new Error('fake 공급자 redirect 횟수가 너무 많습니다.');
  }};
}

async function runLogin(provider: SocialProvider, client: AuthClient, fixtureUser: 'alice' | 'bob') {
  const store = memoryStore();
  let accessForRevocationProbe: string | null = null;
  const sessionFetch: typeof fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    if (url.pathname === '/api/v1/me') {
      const authorization = new Headers(init?.headers).get('Authorization');
      if (authorization?.startsWith('Bearer ')) accessForRevocationProbe = authorization.slice(7);
    }
    return fetch(input, init);
  };
  const coordinator = new AuthCoordinator({
    api: createAuthApi({baseUrl, fetch, allowInsecureHttp: true}), fetch: sessionFetch, store, createPkce,
    browser: fakeBrowser(fixtureUser), logoutWaitMs: 1000,
  });
  try {
    await coordinator.login(provider, client, 'rufit://auth/callback');
    const signedIn = coordinator.getState();
    assert.equal(signedIn.kind, 'signed-in');
    if (signedIn.kind !== 'signed-in' || !store.value) throw new Error('로그인 상태를 확인하지 못했습니다.');
    const accountId = signedIn.accountId;
    const sessionId = store.value.sessionId;
    assert.equal(Object.hasOwn(store.value, 'accessToken'), false);
    await coordinator.refresh();
    const refreshed = coordinator.getState();
    assert.equal(refreshed.kind, 'signed-in');
    assert.equal(store.value?.account.id, accountId);
    assert.equal(store.value?.sessionId, sessionId);
    await coordinator.logout();
    assert.equal(coordinator.getState().kind, 'signed-out');
    assert.equal(store.value, null);
    if (!accessForRevocationProbe) throw new Error('폐기 확인용 access를 관찰하지 못했습니다.');
    const revoked = await fetch(new URL('/api/v1/me', root), {redirect: 'error', credentials: 'omit', headers: {Authorization: `Bearer ${accessForRevocationProbe}`}});
    accessForRevocationProbe = null;
    assert.equal(revoked.status, 401);
    return accountId;
  } finally {
    // 중간 assertion 실패에도 이 시나리오가 만든 현재 grant만 닫고 다른 세션은 건드리지 않는다.
    if (coordinator.getSession()) await coordinator.logout().catch(() => {});
    accessForRevocationProbe = null;
  }
}

async function main() {
  const health = await fetch(new URL('/actuator/health', root), {redirect: 'error', credentials: 'omit'});
  assert.equal(health.status, 200);
  const googleAlice = await runLogin('GOOGLE', 'IOS', 'alice');
  const googleBob = await runLogin('GOOGLE', 'IOS', 'bob');
  const kakaoAlice = await runLogin('KAKAO', 'ANDROID', 'alice');
  assert.equal(new Set([googleAlice, googleBob, kakaoAlice]).size, 3);
  console.log('PASS: FE AuthCoordinator + 실제 Spring/fake OAuth의 두 공급자 로그인·계정 구분·me·refresh·logout·로그아웃 후 401. 비밀값 출력 없음.');
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : '인증 통합 시험 실패');
  process.exitCode = 1;
});
