export type SocialProvider = 'KAKAO' | 'GOOGLE';
export type LoginProvider = SocialProvider | 'EMAIL';
export type AuthClient = 'IOS' | 'ANDROID' | 'WEB';

export type LoginAttempt = {
  attemptId: string;
  authorizationUrl: string;
  expiresAt: string;
};

export type SessionTokens = {
  account: { id: string; isNewAccount: boolean; profileStatus: 'MISSING' | 'PRESENT' };
  sessionId: string;
  tokenType: 'Bearer';
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
};

export type StoredSession = Omit<SessionTokens, 'accessToken' | 'tokenType'> & {
  schemaVersion: 1;
  server: string;
  provider: LoginProvider;
};

export type AuthErrorReason =
  | 'login-failed'
  | 'rejected-callback'
  | 'secure-store'
  | 'reauth-required'
  | 'logout-local';

export type AuthStatus =
  /** reauth는 저장된 로그인이 만료돼 다시 로그인해야 하는 경우입니다. 앱이 로그인 창을 엽니다. */
  /** cancelled는 사용자가 카카오·Google 로그인을 취소한 경우입니다. */
  | { kind: 'signed-out'; notice?: string; reauth?: boolean; cancelled?: boolean }
  | {
      kind: 'signing-in';
      provider: LoginProvider;
      stage: 'opening' | 'browser-pending' | 'verifying';
    }
  | { kind: 'signed-in'; accountId: string; provider: LoginProvider }
  | { kind: 'refreshing'; accountId: string; provider: LoginProvider }
  | { kind: 'signing-out'; accountId: string }
  | {
      kind: 'error';
      message: string;
      reason: AuthErrorReason;
      action: 'retry-login' | 'retry-logout';
      provider?: LoginProvider;
    };
