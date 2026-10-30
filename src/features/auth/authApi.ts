import { ApiError } from '../../api/client.ts';
import type { AuthClient, LoginAttempt, SessionTokens, SocialProvider } from './types.ts';

type Options = {
  baseUrl: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
  allowInsecureHttp?: boolean;
};
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;
const uuid = (value: unknown): value is string =>
  typeof value === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
const date = (value: unknown): value is string =>
  typeof value === 'string' && Number.isFinite(Date.parse(value));
const token = (value: unknown, max: number) =>
  typeof value === 'string' &&
  value.length > 0 &&
  value.length <= max &&
  /^[\x21-\x7E]+$/.test(value);

function baseUrl(value: string, _allowInsecureHttp = false) {
  const url = new URL(value);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error('API 주소 형식을 확인해 주세요.');
  if (url.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
    throw new Error('로그인 서버에는 HTTPS가 필요합니다.');
  return url.toString().replace(/\/$/, '');
}

function loginAttempt(
  value: unknown,
  provider: SocialProvider,
  allowLoopback: boolean,
): LoginAttempt {
  if (
    !object(value) ||
    !uuid(value.attemptId) ||
    typeof value.authorizationUrl !== 'string' ||
    !date(value.expiresAt)
  )
    throw new ApiError(200, 'INVALID_RESPONSE', '로그인 시작 응답을 확인하지 못했습니다.');
  const url = new URL(value.authorizationUrl);
  const expectedHost = provider === 'GOOGLE' ? 'accounts.google.com' : 'kauth.kakao.com';
  const loopback = allowLoopback && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (
    url.username ||
    url.password ||
    url.hash ||
    (!(url.protocol === 'https:' && url.hostname === expectedHost) &&
      !(loopback && url.protocol === 'http:'))
  )
    throw new ApiError(200, 'INVALID_RESPONSE', '안전한 로그인 주소를 확인하지 못했습니다.');
  return {
    attemptId: value.attemptId,
    authorizationUrl: url.toString(),
    expiresAt: value.expiresAt,
  };
}

export function validateSessionTokens(value: unknown): SessionTokens {
  if (
    !object(value) ||
    !object(value.account) ||
    typeof value.account.id !== 'string' ||
    !value.account.id.trim() ||
    value.account.id.length > 100 ||
    typeof value.account.isNewAccount !== 'boolean' ||
    !['MISSING', 'PRESENT'].includes(value.account.profileStatus as string) ||
    !uuid(value.sessionId) ||
    value.tokenType !== 'Bearer' ||
    !token(value.accessToken, 4096) ||
    !date(value.accessTokenExpiresAt) ||
    typeof value.refreshToken !== 'string' ||
    !/^[A-Za-z0-9_-]{43}$/.test(value.refreshToken) ||
    !date(value.refreshTokenExpiresAt) ||
    Date.parse(value.accessTokenExpiresAt as string) <= Date.now() ||
    Date.parse(value.refreshTokenExpiresAt as string) <= Date.now()
  )
    throw new ApiError(200, 'INVALID_RESPONSE', '로그인 세션 응답을 확인하지 못했습니다.');
  return value as SessionTokens;
}

export function createAuthApi(options: Options) {
  const root = baseUrl(options.baseUrl, options.allowInsecureHttp);
  const transport = options.fetch ?? fetch;
  const timeoutMs = options.timeoutMs ?? 15000;
  async function post(path: string, body: unknown, unknownOnFailure = false): Promise<unknown> {
    const encoded = JSON.stringify(body);
    if (new TextEncoder().encode(encoded).length > 2048)
      throw new Error('인증 요청이 너무 큽니다.');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await transport(`${root}/api/v1/auth${path}`, {
        method: 'POST',
        signal: controller.signal,
        credentials: 'omit',
        redirect: 'error',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: encoded,
      });
      if (response.status === 204) return null;
      let value: unknown;
      try {
        const declared = Number(response.headers.get('Content-Length'));
        if (Number.isFinite(declared) && declared > 16384) throw new Error();
        const raw = await response.text();
        if (new TextEncoder().encode(raw).length > 16384) throw new Error();
        value = JSON.parse(raw);
      } catch {
        throw new ApiError(
          response.status,
          'INVALID_RESPONSE',
          '인증 서버 응답을 읽지 못했습니다.',
          unknownOnFailure,
        );
      }
      if (!response.ok) {
        const code = object(value) && typeof value.code === 'string' ? value.code : 'HTTP_ERROR';
        const message =
          code === 'AUTH_PROVIDER_UNAVAILABLE'
            ? '이 로그인 방법은 아직 사용할 수 없습니다.'
            : code === 'RATE_LIMITED'
              ? '로그인 요청이 많습니다. 잠시 후 다시 시도해 주세요.'
              : code === 'SESSION_EXPIRED'
                ? '로그인 시간이 만료되었습니다.'
                : '인증 요청을 처리하지 못했습니다.';
        throw new ApiError(
          response.status,
          code,
          message,
          unknownOnFailure && response.status >= 500,
        );
      }
      return value;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        0,
        controller.signal.aborted ? 'TIMEOUT' : 'NETWORK_ERROR',
        '인증 서버 연결을 확인해 주세요.',
        unknownOnFailure,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
  return {
    server: root,
    startLogin: async (provider: SocialProvider, client: AuthClient, codeChallenge: string) => {
      if (!/^[A-Za-z0-9_-]{43}$/.test(codeChallenge))
        throw new Error('로그인 보안 값을 만들지 못했습니다.');
      return loginAttempt(
        await post('/login-attempts', {
          provider,
          client,
          returnRoute: 'APP_LOGIN',
          codeChallenge,
          codeChallengeMethod: 'S256',
        }),
        provider,
        !!options.allowInsecureHttp,
      );
    },
    exchange: async (attemptId: string, handoffCode: string, codeVerifier: string) => {
      if (
        !uuid(attemptId) ||
        !/^[A-Za-z0-9_-]{43}$/.test(handoffCode) ||
        !/^[A-Za-z0-9._~-]{43,128}$/.test(codeVerifier)
      )
        throw new Error('로그인 교환 값을 확인하지 못했습니다.');
      return validateSessionTokens(
        await post('/session-exchanges', { attemptId, handoffCode, codeVerifier }, true),
      );
    },
    refresh: async (refreshToken: string) => {
      if (!/^[A-Za-z0-9_-]{43}$/.test(refreshToken))
        throw new Error('저장된 로그인 정보를 확인하지 못했습니다.');
      return validateSessionTokens(await post('/refresh', { refreshToken }, true));
    },
    logout: async (refreshToken: string) => {
      if (!/^[A-Za-z0-9_-]{43}$/.test(refreshToken))
        throw new Error('저장된 로그인 정보를 확인하지 못했습니다.');
      await post('/logout', { refreshToken }, true);
    },
  };
}
export type AuthApi = ReturnType<typeof createAuthApi>;
