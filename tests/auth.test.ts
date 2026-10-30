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
