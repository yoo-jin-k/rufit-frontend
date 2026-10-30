import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { fetch as expoFetch } from 'expo/fetch';
import { createAuthApi } from './authApi';
import { AuthCoordinator } from './authCoordinator';
import { createHandoffPkce } from './pkce';
import { createSecureSessionStore } from './secureSessionStore';
import type { AuthClient } from './types';

export const nativeAuthAvailable = Platform.OS === 'ios' || Platform.OS === 'android';
export const nativeAuthClient: AuthClient | null =
  Platform.OS === 'ios' ? 'IOS' : Platform.OS === 'android' ? 'ANDROID' : null;
export const authReturnUrl = AuthSession.makeRedirectUri({
  scheme: 'rufit',
  path: 'auth/callback',
});
const nativeFetch = expoFetch as typeof fetch;

export function createNativeAuthCoordinator(baseUrl: string) {
  // 기본 RN fetch는 redirect:error를 지키지 않을 수 있어 인증 비밀값 전송에는 Expo native fetch만 사용합니다.
  const api = createAuthApi({ baseUrl, fetch: nativeFetch, allowInsecureHttp: __DEV__ });
  return new AuthCoordinator({
    api,
    fetch: nativeFetch,
    store: createSecureSessionStore(),
    createPkce: createHandoffPkce,
    browser: {
      open: (url, returnUrl) => WebBrowser.openAuthSessionAsync(url, returnUrl),
      close: () => WebBrowser.dismissAuthSession(),
    },
  });
}
