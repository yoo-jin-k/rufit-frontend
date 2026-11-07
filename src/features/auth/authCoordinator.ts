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
  LoginProvider,
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
  /** 실행 중 갱신이 일시 장애로 실패했을 때 다시 시도할 때까지 기다리는 시간입니다. */
  refreshRetryMs?: number;
};
type Runtime = { tokens: SessionTokens; provider: LoginProvider; session: RufitSession };

/** 접근 토큰 만료 이 시간 전에 미리 갱신합니다. */
const refreshMarginMs = 60_000;
/** 짧은 만료 응답에서도 갱신 요청이 연달아 나가지 않도록 두는 최소 간격입니다. */
const minRefreshDelayMs = 10_000;
/** setTimeout이 넘치지 않도록 예약 시간을 약 24일로 제한합니다. */
const maxTimerMs = 2_147_483_647;

/**
 * 일시 장애인지 판별합니다. 타임아웃·네트워크 단절·요청 제한·5xx·응답 해석 실패처럼
 * 서버가 세션 폐기를 알려 주지 않은 경우에는 저장된 갱신 자격 증명을 지우지 않습니다.
 * 서버가 401·403·형식 오류(400 INVALID_INPUT)로 만료·폐기를 명시한 경우, 계정 불일치,
 * 앱이 직접 확인한 만료·서버 변경·저장값 손상은 확정 실패로 보고 다시 로그인을 안내합니다.
 */
export function isTransientAuthFailure(error: unknown) {
  if (!(error instanceof ApiError) || error.code === 'ACCOUNT_CHANGED') return false;
  return !(
    error.status === 401 ||
    error.status === 403 ||
    (error.status === 400 && error.code === 'INVALID_INPUT')
  );
}

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
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
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

  /**
   * 재실행 시 갱신 토큰을 교환하고 /me까지 확인한 뒤 로그인 상태를 공개합니다.
   * 일시 장애로 실패하면 저장된 로그인 정보를 유지하고, 다음 resume()에서 다시 시도합니다.
   * 서버가 만료·폐기를 명시했거나 저장값이 맞지 않을 때만 저장된 정보를 지웁니다.
   */
  async restore() {
    if (this.runtime || this.activeOperation !== null || this.pendingLocalLogout || !this.options.store.load) return;
    const operation = ++this.epoch;
    this.activeOperation = operation;
    try {
      let stored: StoredSession | null;
      try {
        stored = await this.options.store.load();
      } catch {
        // 기기 잠금 등으로 보안 저장소를 잠시 읽지 못한 경우이며, 저장값이 잘못됐다는 근거가 아닙니다.
        throw new ApiError(0, 'STORE_UNAVAILABLE', '기기의 로그인 정보를 읽지 못했습니다.');
      }
      const saved = stored === null ? null : decodeStoredSession(JSON.stringify(stored));
      if (operation !== this.epoch || !saved) return;
      if (saved.server.replace(/\/$/, '') !== this.options.api.server.replace(/\/$/, '')
        || Date.parse(saved.refreshTokenExpiresAt) <= Date.now())
        throw new Error('로그인 정보가 만료되었거나 서버가 변경되었습니다. 다시 로그인해 주세요.');
      this.publish({ kind: 'signing-in', provider: saved.provider, stage: 'verifying' });
      const tokens = await this.options.api.refresh(saved.refreshToken);
      if (tokens.account.id !== saved.account.id || tokens.sessionId !== saved.sessionId)
        throw new Error('복원한 로그인 계정이 일치하지 않습니다. 다시 로그인해 주세요.');
      // 복원이 취소됐더라도 서버는 이미 토큰을 교체했으므로, 새 토큰은 /me 확인 전에 저장합니다.
      await this.persistRotated(saved.refreshToken, tokens, saved.provider);
      if (operation !== this.epoch) return;
      await this.accept(tokens, saved.provider, operation);
    } catch (error) {
      if (operation !== this.epoch) return;
      if (isTransientAuthFailure(error)) {
        this.publish({
          kind: 'signed-out',
          notice: '서버에 연결하지 못해 로그인을 확인하지 못했어요. 연결되면 앱을 다시 열 때 자동으로 확인해요. 기기 기록은 유지됩니다.',
        });
        return;
      }
      await this.serialStore(() => this.options.store.clear()).catch(() => {});
      if (operation === this.epoch) this.publish({ kind: 'signed-out', notice: '로그인을 복원하지 못했습니다. 다시 로그인해 주세요. 기기 기록은 유지됩니다.' });
    } finally {
      if (this.activeOperation === operation) this.activeOperation = null;
    }
  }

  /**
   * 앱이 다시 활성화될 때 호출합니다. 로그인 정보가 없으면 저장된 로그인 복원을 다시 시도하고,
   * 로그인 중이면 만료가 가까운 접근 토큰만 갱신합니다. 진행 중인 작업과는 합류하거나 건너뜁니다.
   */
  resume(): Promise<void> {
    const current = this.runtime;
    if (!current) return this.restore();
    if (Date.parse(current.tokens.accessTokenExpiresAt) - Date.now() <= refreshMarginMs)
      return this.refresh();
    return Promise.resolve();
  }

  private toStored(tokens: SessionTokens, provider: LoginProvider): StoredSession {
    return {
      schemaVersion: 1,
      server: this.options.api.server,
      provider,
      account: tokens.account,
      sessionId: tokens.sessionId,
      accessTokenExpiresAt: tokens.accessTokenExpiresAt,
      refreshToken: tokens.refreshToken,
      refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
    };
  }

  /**
   * 서버는 이미 쓴 갱신 토큰이 다시 오면 세션 전체를 폐기합니다. 그래서 토큰 교체 직후
   * /me 확인 같은 후속 요청보다 먼저 새 토큰을 저장합니다. 저장소에 교체 전 토큰이 그대로 있을 때만
   * 바꾸므로, 그사이 로그아웃이나 다른 계정 로그인으로 바뀐 저장값은 덮어쓰지 않습니다.
   */
  private persistRotated(previousRefreshToken: string, tokens: SessionTokens, provider: LoginProvider) {
    return this.serialStore(async () => {
      if (!this.options.store.load) return;
      let current: StoredSession | null;
      try {
        current = await this.options.store.load();
      } catch {
        throw new ApiError(0, 'STORE_UNAVAILABLE', '기기의 로그인 정보를 읽지 못했습니다.');
      }
      if (current?.refreshToken !== previousRefreshToken || current.sessionId !== tokens.sessionId) return;
      await this.options.store.save(this.toStored(tokens, provider));
    });
  }

  private clearRefreshTimer() {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.refreshTimer = null;
  }

  /** 접근 토큰 만료 전에 갱신을 예약합니다. 앱이 백그라운드에 있던 동안 놓친 갱신은 resume()이 맡습니다. */
  private scheduleRefresh(delayMs?: number) {
    this.clearRefreshTimer();
    const current = this.runtime;
    if (!current) return;
    const untilRefresh =
      delayMs ?? Date.parse(current.tokens.accessTokenExpiresAt) - Date.now() - refreshMarginMs;
    const timer = setTimeout(() => {
      this.refreshTimer = null;
      if (this.runtime) void this.refresh();
    }, Math.min(Math.max(untilRefresh, minRefreshDelayMs), maxTimerMs));
    // 테스트·Node 환경에서 예약 작업이 프로세스 종료를 막지 않게 합니다. 앱 런타임에는 없는 기능입니다.
    (timer as { unref?: () => void }).unref?.();
    this.refreshTimer = timer;
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

  private accountApi() {
    if (!this.options.api.account) throw new Error('이메일 로그인을 사용할 수 없습니다.');
    return this.options.api.account;
  }

  /** 이메일도 소셜 로그인과 같은 검증·보안 저장·계정 격리 경로로 공개합니다. */
  async emailLogin(email: string, password: string) {
    return this.emailSignIn(() => this.accountApi().login(email, password));
  }
  private async emailSignIn(work: () => Promise<SessionTokens | null>) {
    if (this.activeOperation !== null || this.runtime || this.pendingLocalLogout) throw new Error('현재 로그인 작업을 먼저 마쳐 주세요.');
    const operation = ++this.epoch;
    this.activeOperation = operation;
    this.publish({ kind: 'signing-in', provider: 'EMAIL', stage: 'verifying' });
    try {
      const tokens = await work();
      if (tokens && operation === this.epoch) await this.accept(tokens, 'EMAIL', operation);
    } catch (error) {
      if (operation === this.epoch) this.publish({ kind: 'error', reason: 'login-failed', action: 'retry-login', provider: 'EMAIL',
        message: error instanceof Error ? error.message : '로그인을 완료하지 못했습니다.' });
      throw error;
    } finally { if (this.activeOperation === operation) this.activeOperation = null; }
  }
  emailRequest(email: string, purpose: 'REGISTER' | 'RESET' | 'LINK') {
    if (purpose === 'LINK' && !this.runtime) throw new Error('로그인이 필요합니다.');
    return this.accountApi().request(email, purpose, this.runtime?.tokens.accessToken);
  }
  async emailConfirm(purpose: 'REGISTER' | 'RESET' | 'LINK', requestId: string, verificationToken: string, password: string) {
    if (purpose === 'REGISTER') return this.emailSignIn(() => this.accountApi().confirm(purpose, requestId, verificationToken, password));
    const current = this.runtime;
    if (purpose === 'LINK' && !current) throw new Error('로그인이 필요합니다.');
    await this.accountApi().confirm(purpose, requestId, verificationToken, password, current?.tokens.accessToken);
    if (purpose === 'LINK' && current !== this.runtime) throw new Error('계정이 바뀌었습니다. 다시 확인해 주세요.');
  }
  // 로그아웃과 겹친 조회도 Promise 거절로 전달하여 화면 렌더를 중단하지 않습니다.
  async loginMethods() {
    if (!this.runtime) throw new Error('로그인이 필요합니다.');
    return this.accountApi().methods(this.runtime.tokens.accessToken);
  }
  async linkSocial(provider: SocialProvider, client: AuthClient, returnUrl: string, merge = false) {
    if (this.activeOperation !== null || this.refreshPromise || !this.runtime) throw new Error('다른 로그인 작업이 끝난 후 다시 시도해 주세요.');
    const current = this.runtime;
    const operation = ++this.epoch;
    this.activeOperation = operation;
    try {
      this.options.browser.prepare?.();
      const pkce = await this.options.createPkce();
      if (operation !== this.epoch) return;
      const attempt = await this.accountApi().startLink(provider, client, pkce.challenge, current.tokens.accessToken);
      if (operation !== this.epoch) return;
      const result = await this.options.browser.open(attempt.authorizationUrl, returnUrl);
      if (operation !== this.epoch) return;
      if (result.type !== 'success') throw new Error('계정 연결을 취소했습니다.');
      const handoff = parseHandoffUrl(result.url, returnUrl, attempt.attemptId);
      if (handoff.kind === 'cancelled') throw new Error('계정 연결을 취소했습니다.');
      // 통합은 화면에서 명시적으로 선택한 경우에만 별도 API로 요청합니다.
      const api = this.accountApi();
      if (merge) await api.finishMerge(attempt.attemptId, handoff.handoffCode, pkce.verifier, current.tokens.accessToken);
      else await api.finishLink(attempt.attemptId, handoff.handoffCode, pkce.verifier, current.tokens.accessToken);
      if (current !== this.runtime || operation !== this.epoch) throw new Error('계정이 바뀌었습니다. 연결 상태를 다시 확인해 주세요.');
    } finally {
      if (this.activeOperation === operation) { this.activeOperation = null; await this.options.browser.close?.(); }
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
    provider: LoginProvider,
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
    const stored = this.toStored(tokens, provider);
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
    else this.scheduleRefresh();
  }

  /**
   * 실행 중 접근 토큰을 갱신합니다. 동시 요청은 한 번의 갱신으로 합칩니다.
   * 일시 장애면 현재 세션과 저장된 로그인을 유지하고 잠시 뒤 다시 시도합니다.
   * 서버가 만료·폐기를 명시했거나 다른 계정이 돌아오면 세션을 닫고 다시 로그인을 요구합니다.
   */
  refresh() {
    if (this.refreshPromise) return this.refreshPromise;
    const current = this.runtime;
    if (!current) return Promise.reject(new Error('로그인이 필요합니다.'));
    const operation = this.epoch;
    this.clearRefreshTimer();
    this.publish({
      kind: 'refreshing',
      accountId: current.tokens.account.id,
      provider: current.provider,
    });
    this.refreshPromise = this.options.api
      .refresh(current.tokens.refreshToken)
      .then(async (tokens) => {
        if (
          tokens.account.id !== current.tokens.account.id ||
          tokens.sessionId !== current.tokens.sessionId
        )
          throw new ApiError(200, 'ACCOUNT_CHANGED', '갱신된 세션의 계정을 확인하지 못했습니다.');
        await this.persistRotated(current.tokens.refreshToken, tokens, current.provider);
        // /me 확인이 일시 장애로 실패해도 다음 갱신은 새 갱신 토큰으로 하도록 메모리 상태도 바꿉니다.
        if (operation === this.epoch && this.runtime === current) this.runtime = { ...current, tokens };
        await this.accept(tokens, current.provider, operation, this.runtime ?? current);
      })
      .catch(async (error) => {
        if (operation !== this.epoch) return;
        const latest = this.runtime;
        if (latest && isTransientAuthFailure(error)) {
          this.publish({ kind: 'signed-in', accountId: latest.tokens.account.id, provider: latest.provider });
          this.scheduleRefresh(this.options.refreshRetryMs ?? 30_000);
          return;
        }
        this.clearRefreshTimer();
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
    this.clearRefreshTimer();
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
