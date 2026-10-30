import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

const port = Number(process.env.RUFIT_AUTH_MOCK_PORT ?? 8099);
const attempts = new Map<
  string,
  { challenge: string; provider: string; expiresAt: number; handoff?: string }
>();
const sessions = new Map<string, { sessionId: string; accountId: string; access: string }>();
const code = () => randomBytes(32).toString('base64url');
const json = (response: ServerResponse, status: number, value?: unknown) => {
  response.statusCode = status;
  response.setHeader('Cache-Control', 'no-store');
  if (value === undefined) return response.end();
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify(value));
};
async function body(request: IncomingMessage) {
  const parts: Buffer[] = [];
  for await (const part of request) {
    parts.push(Buffer.from(part));
    if (parts.reduce((sum, value) => sum + value.length, 0) > 2048) throw new Error('too-large');
  }
  return JSON.parse(Buffer.concat(parts).toString('utf8')) as Record<string, unknown>;
}
function session(accountId: string, existingSessionId?: string) {
  const refreshToken = code();
  const value = {
    sessionId: existingSessionId ?? randomUUID(),
    accountId,
    access: `mock-access-${code()}`,
  };
  sessions.set(refreshToken, value);
  return {
    account: { id: accountId, isNewAccount: !existingSessionId, profileStatus: 'MISSING' },
    sessionId: value.sessionId,
    tokenType: 'Bearer',
    accessToken: value.access,
    accessTokenExpiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
    refreshToken,
    refreshTokenExpiresAt: new Date(Date.now() + 14 * 24 * 60 * 60_000).toISOString(),
  };
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', `http://127.0.0.1:${port}`);
    if (request.method === 'POST' && url.pathname === '/api/v1/auth/login-attempts') {
      const value = await body(request);
      if (
        !['KAKAO', 'GOOGLE'].includes(String(value.provider)) ||
        !['IOS', 'ANDROID'].includes(String(value.client)) ||
        value.returnRoute !== 'APP_LOGIN' ||
        value.codeChallengeMethod !== 'S256' ||
        !/^[A-Za-z0-9_-]{43}$/.test(String(value.codeChallenge))
      )
        return json(response, 400, { code: 'VALIDATION_FAILED', detail: 'invalid' });
      const attemptId = randomUUID();
      attempts.set(attemptId, {
        challenge: String(value.codeChallenge),
        provider: String(value.provider),
        expiresAt: Date.now() + 5 * 60_000,
      });
      return json(response, 201, {
        attemptId,
        authorizationUrl: `http://127.0.0.1:${port}/fake-provider?attemptId=${attemptId}`,
        expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
      });
    }
    if (request.method === 'GET' && url.pathname === '/fake-provider') {
      const attemptId = url.searchParams.get('attemptId') ?? '';
      const attempt = attempts.get(attemptId);
      if (!attempt || attempt.expiresAt <= Date.now())
        return json(response, 410, { code: 'LOGIN_ATTEMPT_CONFLICT' });
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      response.setHeader('Cache-Control', 'no-store');
      return response.end(
        `<!doctype html><meta name="referrer" content="no-referrer"><title>루핏 개발용 가짜 인증</title><main style="font:16px system-ui;max-width:420px;margin:60px auto;padding:24px"><h1>개발용 가짜 ${attempt.provider} 인증</h1><p>실제 소셜 로그인이 아닙니다. 프론트 계약 시험 전용입니다.</p><p><a href="/fake-provider/callback?attemptId=${attemptId}&result=approve">승인하고 앱으로 돌아가기</a></p><p><a href="/fake-provider/callback?attemptId=${attemptId}&result=cancel">취소하고 앱으로 돌아가기</a></p></main>`,
      );
    }
    if (request.method === 'GET' && url.pathname === '/fake-provider/callback') {
      const attemptId = url.searchParams.get('attemptId') ?? '';
      const attempt = attempts.get(attemptId);
      if (!attempt || attempt.expiresAt <= Date.now())
        return json(response, 410, { code: 'LOGIN_ATTEMPT_CONFLICT' });
      const cancelled = url.searchParams.get('result') === 'cancel';
      if (!cancelled) attempt.handoff ??= code();
      response.statusCode = 302;
      response.setHeader('Cache-Control', 'no-store');
      response.setHeader('Referrer-Policy', 'no-referrer');
      response.setHeader(
        'Location',
        cancelled
          ? `rufit://auth/callback?attemptId=${attemptId}&error=LOGIN_CANCELLED`
          : `rufit://auth/callback?attemptId=${attemptId}&handoffCode=${attempt.handoff}`,
      );
      return response.end();
    }
    if (request.method === 'POST' && url.pathname === '/api/v1/auth/session-exchanges') {
      const value = await body(request);
      const attempt = attempts.get(String(value.attemptId));
      const actual = createHash('sha256').update(String(value.codeVerifier)).digest('base64url');
      if (
        !attempt ||
        attempt.expiresAt <= Date.now() ||
        attempt.handoff !== value.handoffCode ||
        actual !== attempt.challenge
      )
        return json(response, 401, { code: 'AUTHENTICATION_REQUIRED' });
      attempts.delete(String(value.attemptId));
      return json(response, 200, session(`mock-${attempt.provider.toLowerCase()}-account`));
    }
    if (request.method === 'GET' && url.pathname === '/api/v1/me') {
      const access = request.headers.authorization?.replace(/^Bearer /, '');
      const current = [...sessions.values()].find((value) => value.access === access);
      return current
        ? json(response, 200, { id: current.accountId })
        : json(response, 401, { code: 'AUTHENTICATION_REQUIRED' });
    }
    if (request.method === 'POST' && url.pathname === '/api/v1/auth/refresh') {
      const value = await body(request);
      const current = sessions.get(String(value.refreshToken));
      if (!current) return json(response, 401, { code: 'SESSION_EXPIRED' });
      sessions.delete(String(value.refreshToken));
      return json(response, 200, session(current.accountId, current.sessionId));
    }
    if (request.method === 'POST' && url.pathname === '/api/v1/auth/logout') {
      const value = await body(request);
      sessions.delete(String(value.refreshToken));
      return json(response, 204);
    }
    return json(response, 404, { code: 'NOT_FOUND' });
  } catch (error) {
    return json(response, error instanceof Error && error.message === 'too-large' ? 413 : 400, {
      code: 'INVALID_JSON',
    });
  }
});
server.listen(port, '127.0.0.1', () =>
  console.log(`Rufit 개발용 가짜 인증 서버: http://127.0.0.1:${port}`),
);
