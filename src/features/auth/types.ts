export type SocialProvider = 'KAKAO' | 'GOOGLE';
export type AuthClient = 'IOS' | 'ANDROID';

export type LoginAttempt = {
  attemptId: string;
  authorizationUrl: string;
  expiresAt: string;
};

export type SessionTokens = {
  account: {id: string; isNewAccount: boolean; profileStatus: 'MISSING' | 'PRESENT'};
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
  provider: SocialProvider;
};

export type AuthStatus =
  | {kind: 'signed-out'; notice?: string}
  | {kind: 'signing-in'; provider: SocialProvider; stage: 'opening' | 'browser-pending' | 'verifying'}
  | {kind: 'signed-in'; accountId: string; provider: SocialProvider}
  | {kind: 'refreshing'; accountId: string; provider: SocialProvider}
  | {kind: 'signing-out'; accountId: string}
  | {kind: 'error'; message: string; action?: 'retry-login' | 'retry-logout'};
