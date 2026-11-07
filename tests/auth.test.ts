import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import { ApiError } from '../src/api/client.ts';
import { createAuthApi, type AuthApi } from '../src/features/auth/authApi.ts';
import { AuthCoordinator, parseHandoffUrl } from '../src/features/auth/authCoordinator.ts';
import type { SessionStore } from '../src/features/auth/secureSessionStore.ts';
import type { SessionTokens, StoredSession } from '../src/features/auth/types.ts';

const attemptId = '11111111-1111-4111-8111-111111111111';
const sessionId = '22222222-2222-4222-8222-222222222222';
const handoff = 'H'.repeat(43);
const verifier = 'V'.repeat(43);
const challenge = 'C'.repeat(43);
const refresh = 'R'.repeat(43);
const tokens: SessionTokens = {
  account: { id: 'opaque-account', isNewAccount: true, profileStatus: 'MISSING' },
  sessionId,
  tokenType: 'Bearer',
  accessToken: 'signed-access-token',
  accessTokenExpiresAt: '2099-01-01T00:10:00Z',
  refreshToken: refresh,
  refreshTokenExpiresAt: '2099-01-15T00:00:00Z',
};

function memoryStore(): SessionStore & { value: StoredSession | null; clears: number } {
  return {
    value: null,
    clears: 0,
    async save(value) {
      this.value = value;
    },
    async clear() {
      this.value = null;
      this.clears++;
    },
    async load() { return this.value; },
    async hasSavedSession() {
      return this.value !== null;
    },
  };
}

test('인증 전용 HTTP는 Bearer 없이 시작·교환하고 /me 검증 뒤 보안 저장한다', async (t) => {
  const requests: { url: string; authorization?: string }[] = [];
  const server = createServer(async (request, response) => {
    requests.push({ url: request.url!, authorization: request.headers.authorization });
    response.setHeader('Content-Type', 'application/json');
    if (request.url === '/api/v1/auth/login-attempts') {
      response.statusCode = 201;
      response.end(
        JSON.stringify({
          attemptId,
          authorizationUrl: `http://127.0.0.1:${(server.address() as { port: number }).port}/fake-provider`,
          expiresAt: '2099-01-01T00:05:00Z',
        }),
      );
      return;
    }
    if (request.url === '/api/v1/auth/session-exchanges') {
      response.end(JSON.stringify(tokens));
      return;
    }
    if (
      request.url === '/api/v1/me' &&
      request.headers.authorization === `Bearer ${tokens.accessToken}`
    ) {
      response.end(JSON.stringify({ id: tokens.account.id }));
      return;
    }
    if (request.url === '/api/v1/auth/logout') {
      response.statusCode = 204;
      response.end();
      return;
    }
    response.statusCode = 404;
    response.end(JSON.stringify({ code: 'NOT_FOUND' }));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const root = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const store = memoryStore();
  const coordinator = new AuthCoordinator({
    api: createAuthApi({ baseUrl: root, allowInsecureHttp: true }),
    store,
    fetch,
    createPkce: async () => ({ verifier, challenge }),
    browser: {
      open: async () => ({
        type: 'success',
        url: `rufit://auth/callback?attemptId=${attemptId}&handoffCode=${handoff}`,
      }),
    },
  });
  await coordinator.login('KAKAO', 'IOS', 'rufit://auth/callback');
  assert.deepEqual(coordinator.getState(), {
    kind: 'signed-in',
    accountId: 'opaque-account',
    provider: 'KAKAO',
  });
  assert.equal(store.value?.refreshToken, refresh);
  assert.equal(JSON.stringify(store.value).includes(tokens.accessToken), false);
  assert.equal(
    requests
      .filter((request) => request.url.startsWith('/api/v1/auth'))
      .every((request) => request.authorization === undefined),
    true,
  );
  assert.equal(
    requests.find((request) => request.url === '/api/v1/me')?.authorization,
    `Bearer ${tokens.accessToken}`,
  );
  await coordinator.logout();
  assert.equal(store.value, null);
});

test('복귀 주소·시도·handoff를 원문 토큰 노출 없이 엄격히 확인한다', () => {
  assert.deepEqual(
    parseHandoffUrl(
      `rufit://auth/callback?attemptId=${attemptId}&handoffCode=${handoff}`,
      'rufit://auth/callback',
      attemptId,
    ),
    { kind: 'success', handoffCode: handoff },
  );
  assert.throws(
    () =>
      parseHandoffUrl(
        `rufit://other/callback?attemptId=${attemptId}&handoffCode=${handoff}`,
        'rufit://auth/callback',
        attemptId,
      ),
    /복귀 주소/,
  );
  assert.throws(
    () =>
      parseHandoffUrl(
        `rufit://auth/callback?attemptId=22222222-2222-4222-8222-222222222222&handoffCode=${handoff}`,
        'rufit://auth/callback',
        attemptId,
      ),
    /다른 로그인/,
  );
});

test('취소된 이전 시작 응답은 새 시도의 브라우저·소유권을 건드리지 않는다', async () => {
  const pending: ((value: {
    attemptId: string;
    authorizationUrl: string;
    expiresAt: string;
  }) => void)[] = [];
  const api = {
    server: 'https://api.example.com',
    startLogin: () => new Promise((resolve) => pending.push(resolve)),
    exchange: async () => tokens,
    refresh: async () => tokens,
    logout: async () => {},
  } as AuthApi;
  let opened = 0;
  const coordinator = new AuthCoordinator({
    api,
    store: memoryStore(),
    createPkce: async () => ({ verifier, challenge }),
    browser: {
      open: async () => {
        opened++;
        return { type: 'cancel' };
      },
    },
  });
  const first = coordinator.login('KAKAO', 'IOS', 'rufit://auth/callback');
  await Promise.resolve();
  coordinator.cancelLogin();
  const second = coordinator.login('GOOGLE', 'IOS', 'rufit://auth/callback');
  await Promise.resolve();
  pending[0]({
    attemptId,
    authorizationUrl: 'https://kauth.kakao.com/oauth/authorize',
    expiresAt: '2099-01-01T00:00:00Z',
  });
  await first;
  assert.equal(opened, 0);
  pending[1]({
    attemptId,
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    expiresAt: '2099-01-01T00:00:00Z',
  });
  await second;
  assert.equal(opened, 1);
  assert.equal(coordinator.getState().kind, 'signed-out');
});

test('보안 저장 삭제 실패 뒤 logout 재시도는 서버 비밀을 재전송하지 않고 로컬만 정리한다', async () => {
  let failClear = true;
  let logoutCalls = 0;
  const store = memoryStore();
  store.clear = async function () {
    this.clears++;
    if (failClear) {
      failClear = false;
      throw new Error('secure store failure');
    }
    this.value = null;
  };
  const api = {
    server: 'https://api.example.com',
    startLogin: async () => ({
      attemptId,
      authorizationUrl: 'https://kauth.kakao.com/oauth/authorize',
      expiresAt: '2099-01-01T00:00:00Z',
    }),
    exchange: async () => tokens,
    refresh: async () => tokens,
    logout: async () => {
      logoutCalls++;
    },
  } as AuthApi;
  const coordinator = new AuthCoordinator({
    api,
    store,
    createPkce: async () => ({ verifier, challenge }),
    createSession: async () =>
      ({
        scope: Object.freeze({ server: api.server, accountId: tokens.account.id }),
        api: Object.freeze({}),
        isActive: () => true,
        saveDraft: async () => {
          throw new Error();
        },
        close: () => {},
      }) as never,
    browser: {
      open: async () => ({
        type: 'success',
        url: `rufit://auth/callback?attemptId=${attemptId}&handoffCode=${handoff}`,
      }),
    },
  });
  await coordinator.login('KAKAO', 'IOS', 'rufit://auth/callback');
  await coordinator.logout();
  assert.deepEqual(coordinator.getState(), {
    kind: 'error',
    reason: 'logout-local',
    message: '로그아웃을 완료하지 못했어요. 다시 시도해 주세요.',
    action: 'retry-logout',
  });
  await coordinator.logout();
  assert.equal(coordinator.getState().kind, 'signed-out');
  assert.equal(logoutCalls, 1);
});

test('보안 저장 쓰기가 실패하면 세션을 공개하지 않고 성공 화면도 만들지 않는다', async () => {
  const store = memoryStore();
  store.save = async () => {
    throw new Error('native secret');
  };
  let closed = false;
  const api = {
    server: 'https://api.example.com',
    startLogin: async () => ({
      attemptId,
      authorizationUrl: 'https://kauth.kakao.com/oauth/authorize',
      expiresAt: '2099-01-01T00:00:00Z',
    }),
    exchange: async () => tokens,
    refresh: async () => tokens,
    logout: async () => {},
  } as AuthApi;
  const coordinator = new AuthCoordinator({
    api,
    store,
    createPkce: async () => ({ verifier, challenge }),
    createSession: async () =>
      ({
        scope: Object.freeze({ server: api.server, accountId: tokens.account.id }),
        api: Object.freeze({}),
        isActive: () => !closed,
        saveDraft: async () => {
          throw new Error();
        },
        close: () => {
          closed = true;
        },
      }) as never,
    browser: {
      open: async () => ({
        type: 'success',
        url: `rufit://auth/callback?attemptId=${attemptId}&handoffCode=${handoff}`,
      }),
    },
  });
  await coordinator.login('KAKAO', 'IOS', 'rufit://auth/callback');
  assert.deepEqual(coordinator.getState(), {
    kind: 'error',
    reason: 'secure-store',
    message:
      '로그인 정보를 안전하게 저장하지 못했어요. 기기 상태를 확인한 뒤 다시 로그인해 주세요.',
    action: 'retry-login',
    provider: 'KAKAO',
  });
  assert.equal(coordinator.getSession(), null);
  assert.equal(closed, true);
  assert.equal(JSON.stringify(coordinator.getState()).includes('native secret'), false);
});

test('변조된 복귀 응답은 분류하고 다시 시도할 때만 새 login attempt를 만든다', async () => {
  let starts = 0;
  let opens = 0;
  const api = {
    server: 'https://api.example.com',
    startLogin: async () => {
      starts++;
      return {
        attemptId,
        authorizationUrl: 'https://kauth.kakao.com/oauth/authorize',
        expiresAt: '2099-01-01T00:00:00Z',
      };
    },
    exchange: async () => tokens,
    refresh: async () => tokens,
    logout: async () => {},
  } as AuthApi;
  const coordinator = new AuthCoordinator({
    api,
    store: memoryStore(),
    createPkce: async () => ({ verifier, challenge }),
    browser: {
      open: async () =>
        ++opens === 1
          ? {
              type: 'success',
              url: `rufit://auth/callback?attemptId=${attemptId}&handoffCode=short`,
            }
          : { type: 'cancel' },
    },
  });
  await coordinator.login('KAKAO', 'IOS', 'rufit://auth/callback');
  assert.deepEqual(coordinator.getState(), {
    kind: 'error',
    reason: 'rejected-callback',
    message: '로그인 교환 코드를 확인하지 못했습니다.',
    action: 'retry-login',
    provider: 'KAKAO',
  });
  assert.equal(starts, 1);
  await coordinator.login('KAKAO', 'IOS', 'rufit://auth/callback');
  assert.equal(starts, 2);
  assert.equal(coordinator.getState().kind, 'signed-out');
});

test('동시 refresh는 한 요청에 합류하고 같은 계정·sessionId만 보안 저장 후 교체한다', async () => {
  let resolveRefresh!: (value: SessionTokens) => void;
  let refreshCalls = 0;
  const nextTokens = {
    ...tokens,
    accessToken: 'rotated-access',
    refreshToken: 'N'.repeat(43),
    account: { ...tokens.account, isNewAccount: false },
  };
  const api = {
    server: 'https://api.example.com',
    startLogin: async () => ({
      attemptId,
      authorizationUrl: 'https://kauth.kakao.com/oauth/authorize',
      expiresAt: '2099-01-01T00:00:00Z',
    }),
    exchange: async () => tokens,
    refresh: () => {
      refreshCalls++;
      return new Promise<SessionTokens>((resolve) => {
        resolveRefresh = resolve;
      });
    },
    logout: async () => {},
  } as AuthApi;
  const store = memoryStore();
  const coordinator = new AuthCoordinator({
    api,
    store,
    createPkce: async () => ({ verifier, challenge }),
    createSession: async ({ getAccessToken }) =>
      ({
        scope: Object.freeze({ server: api.server, accountId: tokens.account.id }),
        api: Object.freeze({ token: await getAccessToken() }),
        isActive: () => true,
        saveDraft: async () => {
          throw new Error();
        },
        close: () => {},
      }) as never,
    browser: {
      open: async () => ({
        type: 'success',
        url: `rufit://auth/callback?attemptId=${attemptId}&handoffCode=${handoff}`,
      }),
    },
  });
  await coordinator.login('KAKAO', 'IOS', 'rufit://auth/callback');
  const first = coordinator.refresh();
  const second = coordinator.refresh();
  assert.equal(first, second);
  assert.equal(refreshCalls, 1);
  resolveRefresh(nextTokens);
  await first;
  assert.equal(store.value?.refreshToken, nextTokens.refreshToken);
  assert.deepEqual(coordinator.getState(), {
    kind: 'signed-in',
    accountId: tokens.account.id,
    provider: 'KAKAO',
  });
});

test('인증 응답 크기와 refresh 43자 계약을 거부 경계에서 검사한다', async () => {
  const api = createAuthApi({
    baseUrl: 'https://api.example.com',
    fetch: async () => new Response('x'.repeat(16385), { status: 200 }),
  });
  await assert.rejects(() => api.refresh('R'.repeat(42)), /저장된 로그인/);
  await assert.rejects(
    () => api.refresh(refresh),
    (error: unknown) =>
      error instanceof Error && error.message === '인증 서버 응답을 읽지 못했습니다.',
  );
});

test('결과를 알 수 없는 session exchange는 자동 재시도하거나 로그인 성공으로 공개하지 않는다', async () => {
  let exchangeCalls = 0;
  const store = memoryStore();
  const api = {
    server: 'https://api.example.com',
    startLogin: async () => ({
      attemptId,
      authorizationUrl: 'https://kauth.kakao.com/oauth/authorize',
      expiresAt: '2099-01-01T00:00:00Z',
    }),
    exchange: async () => {
      exchangeCalls++;
      throw new ApiError(0, 'NETWORK_ERROR', '인증 서버 연결을 확인해 주세요.', true);
    },
    refresh: async () => tokens,
    logout: async () => {},
  } as AuthApi;
  const coordinator = new AuthCoordinator({
    api,
    store,
    createPkce: async () => ({ verifier, challenge }),
    browser: {
      open: async () => ({
        type: 'success',
        url: `rufit://auth/callback?attemptId=${attemptId}&handoffCode=${handoff}`,
      }),
    },
  });
  await coordinator.login('KAKAO', 'IOS', 'rufit://auth/callback');
  assert.equal(exchangeCalls, 1);
  const errorState = coordinator.getState();
  assert.equal(errorState.kind, 'error');
  assert.equal(errorState.kind === 'error' && errorState.reason, 'login-failed');
  assert.equal(coordinator.getSession(), null);
  assert.equal(store.value, null);
  coordinator.showLoginSelection();
  assert.equal(coordinator.getState().kind, 'signed-out');
  assert.equal(exchangeCalls, 1);
});

test('취소 뒤 늦게 도착한 session exchange는 보안 저장과 성공 상태를 만들지 않는다', async () => {
  let resolveExchange!: (value: SessionTokens) => void;
  let exchangeStarted!: () => void;
  const started = new Promise<void>((resolve) => {
    exchangeStarted = resolve;
  });
  const store = memoryStore();
  const api = {
    server: 'https://api.example.com',
    startLogin: async () => ({
      attemptId,
      authorizationUrl: 'https://kauth.kakao.com/oauth/authorize',
      expiresAt: '2099-01-01T00:00:00Z',
    }),
    exchange: () => {
      exchangeStarted();
      return new Promise<SessionTokens>((resolve) => {
        resolveExchange = resolve;
      });
    },
    refresh: async () => tokens,
    logout: async () => {},
  } as AuthApi;
  const coordinator = new AuthCoordinator({
    api,
    store,
    createPkce: async () => ({ verifier, challenge }),
    browser: {
      open: async () => ({
        type: 'success',
        url: `rufit://auth/callback?attemptId=${attemptId}&handoffCode=${handoff}`,
      }),
    },
  });
  const login = coordinator.login('KAKAO', 'IOS', 'rufit://auth/callback');
  await started;
  coordinator.cancelLogin();
  resolveExchange(tokens);
  await login;
  assert.equal(coordinator.getState().kind, 'signed-out');
  assert.equal(coordinator.getSession(), null);
  assert.equal(store.value, null);
});

test('refresh가 다른 계정이나 sessionId를 반환하면 기존 세션을 닫고 다시 로그인을 요구한다', async (t) => {
  const cases: [string, SessionTokens][] = [
    [
      '다른 account.id',
      {
        ...tokens,
        account: { ...tokens.account, id: 'other-account' },
        accessToken: 'other-access',
        refreshToken: 'N'.repeat(43),
      },
    ],
    [
      '같은 계정의 다른 sessionId',
      {
        ...tokens,
        sessionId: '33333333-3333-4333-8333-333333333333',
        accessToken: 'other-session-access',
        refreshToken: 'S'.repeat(43),
      },
    ],
  ];
  for (const [name, changed] of cases)
    await t.test(name, async () => {
      const store = memoryStore();
      let closed = false;
      const api = {
        server: 'https://api.example.com',
        startLogin: async () => ({
          attemptId,
          authorizationUrl: 'https://kauth.kakao.com/oauth/authorize',
          expiresAt: '2099-01-01T00:00:00Z',
        }),
        exchange: async () => tokens,
        refresh: async () => changed,
        logout: async () => {},
      } as AuthApi;
      const coordinator = new AuthCoordinator({
        api,
        store,
        createPkce: async () => ({ verifier, challenge }),
        createSession: async () =>
          ({
            scope: Object.freeze({ server: api.server, accountId: tokens.account.id }),
            api: Object.freeze({}),
            isActive: () => !closed,
            saveDraft: async () => {
              throw new Error();
            },
            close: () => {
              closed = true;
            },
          }) as never,
        browser: {
          open: async () => ({
            type: 'success',
            url: `rufit://auth/callback?attemptId=${attemptId}&handoffCode=${handoff}`,
          }),
        },
      });
      await coordinator.login('KAKAO', 'IOS', 'rufit://auth/callback');
      await coordinator.refresh();
      assert.equal(closed, true);
      assert.equal(store.value, null);
      assert.equal(coordinator.getState().kind, 'error');
      assert.equal(coordinator.getSession(), null);
    });
});

test('logout 서버 응답이 제한 시간을 넘으면 로컬 로그아웃을 끝내고 서버 미확인으로 구분한다', async () => {
  const store = memoryStore();
  let logoutCalls = 0;
  const api = {
    server: 'https://api.example.com',
    startLogin: async () => ({
      attemptId,
      authorizationUrl: 'https://kauth.kakao.com/oauth/authorize',
      expiresAt: '2099-01-01T00:00:00Z',
    }),
    exchange: async () => tokens,
    refresh: async () => tokens,
    logout: () => {
      logoutCalls++;
      return new Promise<void>(() => {});
    },
  } as AuthApi;
  const coordinator = new AuthCoordinator({
    api,
    store,
    logoutWaitMs: 5,
    createPkce: async () => ({ verifier, challenge }),
    createSession: async () =>
      ({
        scope: Object.freeze({ server: api.server, accountId: tokens.account.id }),
        api: Object.freeze({}),
        isActive: () => true,
        saveDraft: async () => {
          throw new Error();
        },
        close: () => {},
      }) as never,
    browser: {
      open: async () => ({
        type: 'success',
        url: `rufit://auth/callback?attemptId=${attemptId}&handoffCode=${handoff}`,
      }),
    },
  });
  await coordinator.login('KAKAO', 'IOS', 'rufit://auth/callback');
  await coordinator.logout();
  assert.equal(logoutCalls, 1);
  assert.equal(store.value, null);
  assert.deepEqual(coordinator.getState(), {
    kind: 'signed-out',
    notice: '이 기기에서 로그아웃했어요. 서버 세션 종료는 아직 확인되지 않았어요.',
  });
});


function restoreSetup() {
  const store = memoryStore();
  store.value = { schemaVersion: 1, server: 'https://api.example.com', provider: 'GOOGLE',
    account: tokens.account, sessionId: tokens.sessionId, accessTokenExpiresAt: tokens.accessTokenExpiresAt,
    refreshToken: tokens.refreshToken, refreshTokenExpiresAt: tokens.refreshTokenExpiresAt };
  let calls = 0;
  const api: AuthApi = { server: 'https://api.example.com', refresh: async () => { calls++; return tokens; },
    startLogin: async () => { throw new Error('복원에서 호출하면 안 됩니다.'); },
    exchange: async () => { throw new Error('복원에서 호출하면 안 됩니다.'); }, logout: async () => {} };
  const coordinator = new AuthCoordinator({ api, store, createPkce: async () => ({ verifier, challenge }),
    browser: { open: async () => ({ type: 'cancel' }) },
    fetch: async () => new Response(JSON.stringify({ id: tokens.account.id }), { status: 200 }),
  });
  return { store, api, coordinator, calls: () => calls };
}
test('재실행 시 보안 저장 토큰을 갱신하고 계정 검증 뒤 로그인 상태를 복원합니다', async () => {
  const setup = restoreSetup();
  await Promise.all([setup.coordinator.restore(), setup.coordinator.restore()]);
  assert.equal(setup.calls(), 1);
  assert.equal(setup.coordinator.getState().kind, 'signed-in');
  assert.equal(setup.coordinator.getSession()?.scope.accountId, tokens.account.id);
});
test('다른 서버·만료·계정 불일치는 로그인 복원을 거부합니다', async () => {
  for (const field of ['server', 'expiry', 'account']) {
    const setup = restoreSetup();
    if (field === 'server') setup.store.value!.server = 'https://other.example.com';
    if (field === 'expiry') setup.store.value!.refreshTokenExpiresAt = '2000-01-01T00:00:00Z';
    if (field === 'account') setup.store.value!.account = { ...tokens.account, id: 'different' };
    await setup.coordinator.restore();
    assert.equal(setup.coordinator.getSession(), null);
    assert.equal(setup.coordinator.getState().kind, 'signed-out');
    assert.equal(setup.store.value, null);
    if (field !== 'account') assert.equal(setup.calls(), 0);
  }
});
test('로그인 복원을 취소한 뒤 도착한 응답은 세션을 되살리지 않습니다', async () => {
  const setup = restoreSetup();
  let complete!: (value: SessionTokens) => void;
  let started!: () => void;
  const ready = new Promise<void>((resolve) => { started = resolve; });
  setup.api.refresh = () => { started(); return new Promise((resolve) => { complete = resolve; }); };
  const pending = setup.coordinator.restore();
  await ready;
  setup.coordinator.cancelLogin(); complete(tokens); await pending;
  assert.equal(setup.coordinator.getSession(), null);
  assert.equal(setup.coordinator.getState().kind, 'signed-out');
});

// 이메일 로그인도 기존 보안 저장과 /me 검증을 거치며 암호를 저장하지 않습니다.
test('이메일 로그인과 연결 요청은 인증 경계를 지키고 같은 회원을 유지한다', async () => {
  const seen: { path: string; auth: string | null }[] = [];
  const transport: typeof fetch = async (url, init) => {
    const path = new URL(String(url)).pathname;
    const headers = new Headers(init?.headers);
    seen.push({ path, auth: headers.get('Authorization') });
    const value = path === '/api/v1/auth/email/login' ? tokens
      : path === '/api/v1/me' ? { id: tokens.account.id }
      : path === '/api/v1/account/login-methods' ? { email: 'test@example.test', providers: ['KAKAO'] }
      : path === '/api/v1/account/email-link-requests' ? { requestId: attemptId, expiresAt: '2099-01-01T00:10:00Z' }
      : null;
    return new Response(value === null ? null : JSON.stringify(value), { status: value === null ? 204 : 200 });
  };
  const store = memoryStore();
  const coordinator = new AuthCoordinator({ api: createAuthApi({ baseUrl: 'https://api.rufit.test', fetch: transport }),
    fetch: transport, store, createPkce: async () => ({ verifier, challenge }), browser: { open: async () => ({ type: 'cancel' }) } });
  await coordinator.emailLogin('test@example.test', 'test password only');
  assert.equal(coordinator.getState().kind, 'signed-in');
  assert.equal(store.value?.provider, 'EMAIL');
  assert.equal(JSON.stringify(store.value).includes('test password only'), false);
  assert.deepEqual(await coordinator.loginMethods(), { email: 'test@example.test', providers: ['KAKAO'] });
  await coordinator.emailRequest('another@example.test', 'LINK');
  assert.equal(seen.find(r => r.path.endsWith('/email/login'))?.auth, null);
  assert.equal(seen.find(r => r.path.endsWith('/email-link-requests'))?.auth, `Bearer ${tokens.accessToken}`);
});

test('이메일 로그인 중 취소하면 늦은 응답으로 계정을 되살리지 않는다', async () => {
  let resolve!: (response: Response) => void;
  const transport: typeof fetch = () => new Promise<Response>(done => { resolve = done; });
  const store = memoryStore();
  const coordinator = new AuthCoordinator({ api: createAuthApi({ baseUrl: 'https://api.rufit.test', fetch: transport }),
    fetch: transport, store, createPkce: async () => ({ verifier, challenge }), browser: { open: async () => ({ type: 'cancel' }) } });
  const pending = coordinator.emailLogin('test@example.test', 'test password only');
  coordinator.cancelLogin();
  resolve(new Response(JSON.stringify(tokens), { status: 200 }));
  await pending;
  assert.equal(coordinator.getState().kind, 'signed-out');
  assert.equal(store.value, null);
});


test('로그아웃 상태의 연결 방법 조회는 동기 예외로 화면을 중단하지 않는다', async () => {
  const coordinator = new AuthCoordinator({ api: createAuthApi({ baseUrl: 'https://api.rufit.test' }),
    store: memoryStore(), createPkce: async () => ({ verifier, challenge }), browser: { open: async () => ({ type: 'cancel' }) } });
  let pending!: Promise<unknown>;
  assert.doesNotThrow(() => { pending = coordinator.loginMethods(); });
  await assert.rejects(pending, /로그인이 필요/);
});

test('연결 인증 충돌에서만 카카오 이메일을 표시하고 미제공 상태를 구분합니다', async () => {
  for (const [fields, expected] of [
    [{ verifiedKakaoEmail: 'member@example.test' }, /방금 인증한 카카오계정 이메일: member@example.test/],
    [{ verifiedKakaoEmail: '123456789' }, /이미 가입되었거나/],
    [{ kakaoEmailUnavailable: true }, /이메일이 제공되지 않아/],
    [{ verifiedKakaoMemberId: '123456789' }, /이미 가입되었거나/],
  ] as const) {
    const api = createAuthApi({ baseUrl: 'https://api.rufit.test', fetch: async () =>
      new Response(JSON.stringify({ code: 'LOGIN_METHOD_CONFLICT', ...fields }),
        { status: 409, headers: { 'Content-Type': 'application/problem+json' } }) });
    await assert.rejects(api.account.finishLink(attemptId, handoff, verifier, 'test-access'), expected);
    await assert.rejects(api.account.login('member@example.test', 'unused-password'),
      error => error instanceof Error && !error.message.includes('member@example.test'));
  }
});

test('기존 계정 통합은 명시적 확인과 현재 인증으로만 별도 경로에 요청합니다', async () => {
  const calls: { url: string; authorization: string | null; body: unknown }[] = [];
  const api=createAuthApi({ baseUrl: 'https://api.rufit.test', fetch: async (url, options) => {
    calls.push({ url: String(url), authorization: new Headers(options?.headers).get('Authorization'), body: JSON.parse(String(options?.body)) });
    return new Response(null,{status:204});
  }});
  await api.account.finishMerge(attemptId,handoff,verifier,'test-access');
  assert.equal(calls[0].url,'https://api.rufit.test/api/v1/account/social-merge-exchanges');
  assert.equal(calls[0].authorization,'Bearer test-access');
  assert.deepEqual(calls[0].body,{attemptId,handoffCode:handoff,codeVerifier:verifier,confirmMerge:true});
});
