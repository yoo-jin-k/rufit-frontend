/**
 * 로그인 시도부터 세션 확인, 갱신, 로그아웃까지의 상태 전이를 조율합니다.
 * 화면은 이 조정자의 상태를 구독하며 토큰 저장과 네트워크 요청을 직접 수행하지 않습니다.
 */
import { decodeStoredSession } from './storedSession.ts';
import { ApiError } from '../../api/client.ts';
import { createRufitSession, type RufitSession } from '../../api/session.ts';
import type { AuthApi } from './authApi.ts';
import type { SessionStore } from './secureSessionStore.ts';
import type {
  AuthClient,
  AuthErrorReason,
  AuthStatus,
  SessionTokens,
  SocialProvider,
  StoredSession,
} from './types.ts';

type BrowserResult =
  | { type: 'success'; url: string }
  | { type: 'cancel' | 'dismiss' | 'locked' | 'opened' }
  | { type: 'error'; url?: string };
type Browser = {
  prepare?(): void;
  open(url: string, returnUrl: string): Promise<BrowserResult>;
  close?(): Promise<void> | void;
};
type Options = {
  api: AuthApi;
  browser: Browser;
  store: SessionStore;
  createPkce(): Promise<{ verifier: string; challenge: string }>;
  createSession?: typeof createRufitSession;
  fetch?: typeof fetch;
  logoutWaitMs?: number;
};
type Runtime = { tokens: SessionTokens; provider: SocialProvider; session: RufitSession };

class AuthFlowError extends Error {
  readonly reason: AuthErrorReason;
  constructor(reason: AuthErrorReason, message: string) {
    super(message);
    this.reason = reason;
  }
}

function sameReturnRoute(actual: URL, expected: URL) {
  return (
    actual.protocol === expected.protocol &&
    actual.hostname === expected.hostname &&
    actual.port === expected.port &&
    actual.pathname === expected.pathname
  );
}

export function parseHandoffUrl(value: string, returnUrl: string, attemptId: string) {
  const url = new URL(value);
  const expected = new URL(returnUrl);
  if (!sameReturnRoute(url, expected))
    throw new AuthFlowError('rejected-callback', '로그인 복귀 주소가 올바르지 않습니다.');
  const returnedAttempt = url.searchParams.get('attemptId');
  const error = url.searchParams.get('error');
  const returnedCodes = url.searchParams.getAll('handoffCode');
  if (
    url.searchParams.getAll('attemptId').length !== 1 ||
    url.searchParams.getAll('error').length > 1 ||
    returnedCodes.length > 1 ||
    (error && returnedCodes.length)
  )
    throw new AuthFlowError('rejected-callback', '로그인 복귀 값을 확인하지 못했습니다.');
  if (returnedAttempt !== attemptId)
    throw new AuthFlowError('rejected-callback', '다른 로그인 시도의 응답입니다.');
  if (error === 'LOGIN_CANCELLED') return { kind: 'cancelled' } as const;
  if (error) throw new AuthFlowError('rejected-callback', '소셜 로그인을 완료하지 못했습니다.');
  const handoffCode = returnedCodes[0];
  if (!handoffCode || !/^[A-Za-z0-9_-]{43}$/.test(handoffCode))
    throw new AuthFlowError('rejected-callback', '로그인 교환 코드를 확인하지 못했습니다.');
  return { kind: 'success', handoffCode } as const;
}

export class AuthCoordinator {
  private options: Options;
  private state: AuthStatus = { kind: 'signed-out' };
  private listeners = new Set<(state: AuthStatus) => void>();
  private epoch = 0;
  private runtime: Runtime | null = null;
  private activeOperation: number | null = null;
  private pendingLocalLogout = false;
  private refreshPromise: Promise<void> | null = null;
  private storageQueue: Promise<unknown> = Promise.resolve();
  constructor(options: Options) {
    this.options = options;
  }

  getState = () => this.state;
  subscribe = (listener: (state: AuthStatus) => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  getSession = () => this.runtime?.session ?? null;
  private publish(state: AuthStatus) {
    this.state = state;
    for (const listener of this.listeners) listener(state);
  }
  private serialStore<T>(work: () => Promise<T>) {
    const next = this.storageQueue.catch(() => {}).then(work);
    this.storageQueue = next;
    return next;
  }

  /** 재실행 시 갱신 토큰을 교환하고 /me까지 확인한 뒤 로그인 상태를 공개합니다. */
  async restore() {
    if (this.runtime || this.activeOperation !== null || this.pendingLocalLogout || !this.options.store.load) return;
    const operation = ++this.epoch;
    this.activeOperation = operation;
    try {
      const stored = await this.options.store.load();
      const saved = stored === null ? null : decodeStoredSession(JSON.stringify(stored));
      if (operation !== this.epoch || !saved) return;
      if (saved.server.replace(/\/$/, '') !== this.options.api.server.replace(/\/$/, '')
        || Date.parse(saved.refreshTokenExpiresAt) <= Date.now())
        throw new Error('로그인 정보가 만료되었거나 서버가 변경되었습니다. 다시 로그인해 주세요.');
      this.publish({ kind: 'signing-in', provider: saved.provider, stage: 'verifying' });
      const tokens = await this.options.api.refresh(saved.refreshToken);
      if (operation !== this.epoch) return;
      if (tokens.account.id !== saved.account.id || tokens.sessionId !== saved.sessionId)
        throw new Error('복원한 로그인 계정이 일치하지 않습니다. 다시 로그인해 주세요.');
      await this.accept(tokens, saved.provider, operation);
    } catch {
      if (operation !== this.epoch) return;
      // 교환 응답이 유실되면 이전 토큰을 재사용하지 않고 다시 로그인하도록 안내합니다.
      await this.serialStore(() => this.options.store.clear()).catch(() => {});
      if (operation === this.epoch) this.publish({ kind: 'signed-out', notice: '로그인을 복원하지 못했습니다. 다시 로그인해 주세요. 기기 기록은 유지됩니다.' });
    } finally {
      if (this.activeOperation === operation) this.activeOperation = null;
    }
  }

  async login(provider: SocialProvider, client: AuthClient, returnUrl: string) {
    if (this.activeOperation !== null) return;
    if (this.pendingLocalLogout) throw new Error('로그아웃 정리를 먼저 완료해 주세요.');
    if (this.runtime) throw new Error('먼저 현재 계정에서 로그아웃해 주세요.');
    const operation = ++this.epoch;
    this.activeOperation = operation;
    this.publish({ kind: 'signing-in', provider, stage: 'opening' });
    try {
      this.options.browser.prepare?.();
      const pkce = await this.options.createPkce();
      if (operation !== this.epoch) return;
      const attempt = await this.options.api.startLogin(provider, client, pkce.challenge);
      if (operation !== this.epoch) return;
      if (Date.parse(attempt.expiresAt) <= Date.now())
        throw new Error('로그인 시도가 만료되었습니다. 다시 시도해 주세요.');
      if (operation !== this.epoch) return;
      this.publish({ kind: 'signing-in', provider, stage: 'browser-pending' });
      const result = await this.options.browser.open(attempt.authorizationUrl, returnUrl);
      if (operation !== this.epoch) return;
      if (result.type === 'cancel' || result.type === 'dismiss') {
        this.publish({
          kind: 'signed-out',
          notice: '로그인을 취소했어요. 기기 운동 기록은 그대로예요.',
        });
        return;
      }
      if (result.type !== 'success')
        throw new Error('로그인 브라우저에서 앱으로 돌아오지 못했습니다.');
      const handoff = parseHandoffUrl(result.url, returnUrl, attempt.attemptId);
      if (handoff.kind === 'cancelled') {
        this.publish({
          kind: 'signed-out',
          notice: '로그인을 취소했어요. 기기 운동 기록은 그대로예요.',
        });
        return;
      }
      if (operation !== this.epoch) return;
      this.publish({ kind: 'signing-in', provider, stage: 'verifying' });
      const tokens = await this.options.api.exchange(
        attempt.attemptId,
        handoff.handoffCode,
        pkce.verifier,
      );
      if (operation !== this.epoch) return;
      await this.accept(tokens, provider, operation);
    } catch (error) {
      if (operation === this.epoch)
        this.publish({
          kind: 'error',
          reason: error instanceof AuthFlowError ? error.reason : 'login-failed',
          message: error instanceof Error ? error.message : '로그인을 완료하지 못했습니다.',
          action: 'retry-login',
          provider,
        });
    } finally {
      if (this.activeOperation === operation) {
        this.activeOperation = null;
        await this.options.browser.close?.();
      }
    }
  }

  cancelLogin() {
    if (this.activeOperation === null) return;
    ++this.epoch;
    this.activeOperation = null;
    void this.options.browser.close?.();
    this.publish({ kind: 'signed-out', notice: '로그인을 취소했어요. 운동 기록은 그대로예요.' });
  }

  showLoginSelection() {
    if (this.state.kind === 'error' && this.state.action === 'retry-login')
      this.publish({ kind: 'signed-out' });
  }

  private async accept(
    tokens: SessionTokens,
    provider: SocialProvider,
    operation: number,
    previous?: Runtime,
  ) {
    if (
      previous &&
      (tokens.account.id !== previous.tokens.account.id ||
        tokens.sessionId !== previous.tokens.sessionId)
    )
      throw new ApiError(200, 'ACCOUNT_CHANGED', '갱신된 세션의 계정을 확인하지 못했습니다.');
    const session = await (this.options.createSession ?? createRufitSession)({
      baseUrl: this.options.api.server,
      getAccessToken: () => tokens.accessToken,
      fetch: this.options.fetch,
      allowInsecureHttp: new URL(this.options.api.server).protocol === 'http:',
    });
    if (session.scope.accountId !== tokens.account.id) {
      session.close();
      throw new ApiError(200, 'ACCOUNT_CHANGED', '로그인 계정 확인 결과가 다릅니다.');
    }
    const stored: StoredSession = {
      schemaVersion: 1,
      server: this.options.api.server,
      provider,
      account: tokens.account,
      sessionId: tokens.sessionId,
      accessTokenExpiresAt: tokens.accessTokenExpiresAt,
      refreshToken: tokens.refreshToken,
      refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
    };
    try {
      await this.serialStore(async () => {
        if (operation !== this.epoch) return;
        await this.options.store.save(stored);
        if (operation !== this.epoch) {
          await this.options.store.clear();
          return;
        }
        previous?.session.close();
        this.runtime = { tokens, provider, session };
        this.publish({ kind: 'signed-in', accountId: tokens.account.id, provider });
      });
    } catch {
      session.close();
      throw new AuthFlowError(
        'secure-store',
        '로그인 정보를 안전하게 저장하지 못했어요. 기기 상태를 확인한 뒤 다시 로그인해 주세요.',
      );
    }
    if (operation !== this.epoch || this.runtime?.session !== session) session.close();
  }

  refresh() {
    if (this.refreshPromise) return this.refreshPromise;
    const current = this.runtime;
    if (!current) return Promise.reject(new Error('로그인이 필요합니다.'));
    const operation = this.epoch;
    this.publish({
      kind: 'refreshing',
      accountId: current.tokens.account.id,
      provider: current.provider,
    });
    this.refreshPromise = this.options.api
      .refresh(current.tokens.refreshToken)
      .then((tokens) => this.accept(tokens, current.provider, operation, current))
      .catch(async (error) => {
        if (operation !== this.epoch) return;
        current.session.close();
        this.runtime = null;
        ++this.epoch;
        await this.serialStore(() => this.options.store.clear()).catch(() => {});
        this.publish({
          kind: 'error',
          reason: 'reauth-required',
          message:
            error instanceof Error
              ? `${error.message} 다시 로그인해 주세요.`
              : '세션을 갱신하지 못했습니다. 다시 로그인해 주세요.',
          action: 'retry-login',
          provider: current.provider,
        });
      })
      .finally(() => {
        this.refreshPromise = null;
      });
    return this.refreshPromise;
  }

  async logout() {
    if (this.activeOperation !== null) this.cancelLogin();
    const current = this.runtime;
    if (!current && this.pendingLocalLogout) {
      try {
        await this.serialStore(() => this.options.store.clear());
        this.pendingLocalLogout = false;
        this.publish({
          kind: 'signed-out',
          notice: '이 기기에서 로그아웃했어요. 서버 세션 종료는 아직 확인되지 않았어요.',
        });
      } catch {
        this.publish({
          kind: 'error',
          reason: 'logout-local',
          message: '로그아웃을 완료하지 못했어요. 다시 시도해 주세요.',
          action: 'retry-logout',
        });
      }
      return;
    }
    if (!current) {
      this.publish({ kind: 'signed-out' });
      return;
    }
    ++this.epoch;
    current.session.close();
    this.runtime = null;
    this.publish({ kind: 'signing-out', accountId: current.tokens.account.id });
    let localCleared = false;
    let serverConfirmed = false;
    let waitTimer: ReturnType<typeof setTimeout> | undefined;
    try {
      const local = this.serialStore(async () => {
        await this.options.store.clear();
        localCleared = true;
      });
      const server = this.options.api
        .logout(current.tokens.refreshToken)
        .then(() => {
          serverConfirmed = true;
        })
        .catch(() => {});
      const wait = new Promise<void>((resolve) => {
        waitTimer = setTimeout(resolve, this.options.logoutWaitMs ?? 5000);
      });
      await Promise.all([local, Promise.race([server, wait])]);
    } catch {
      this.pendingLocalLogout = true;
      this.publish({
        kind: 'error',
        reason: 'logout-local',
        message: '로그아웃을 완료하지 못했어요. 다시 시도해 주세요.',
        action: 'retry-logout',
      });
      return;
    } finally {
      if (waitTimer) clearTimeout(waitTimer);
    }
    if (!localCleared) {
      this.pendingLocalLogout = true;
      this.publish({
        kind: 'error',
        reason: 'logout-local',
        message: '로그아웃을 완료하지 못했어요. 다시 시도해 주세요.',
        action: 'retry-logout',
      });
    } else
      this.publish({
        kind: 'signed-out',
        notice: serverConfirmed
          ? '이 기기에서 로그아웃했어요.'
          : '이 기기에서 로그아웃했어요. 서버 세션 종료는 아직 확인되지 않았어요.',
      });
  }
}
