import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { fetch as expoFetch } from 'expo/fetch';
import { createAuthApi } from './authApi';
import { AuthCoordinator } from './authCoordinator';
import { createHandoffPkce } from './pkce';
import { createSecureSessionStore } from './secureSessionStore';
import { createWebAuthBrowser, createWebSessionStore } from './webAuth';
import type { AuthClient } from './types';

const localWeb = Platform.OS === 'web' && typeof window !== 'undefined'
  && ['localhost', '127.0.0.1'].includes(window.location.hostname)
  && process.env.EXPO_PUBLIC_RUFIT_WEB_LOGIN_ENABLED === 'true';
export const nativeAuthAvailable = Platform.OS === 'ios' || Platform.OS === 'android' || localWeb;
export const nativeAuthClient: AuthClient | null =
  Platform.OS === 'ios' ? 'IOS' : Platform.OS === 'android' ? 'ANDROID' : localWeb ? 'WEB' : null;
export const authReturnUrl = localWeb ? `${window.location.origin}/auth/callback.html` : AuthSession.makeRedirectUri({
  scheme: 'rufit',
  path: 'auth/callback',
});
const nativeFetch = expoFetch as typeof fetch;

export function createNativeAuthCoordinator(baseUrl: string) {
  if (localWeb) {
    const transport = window.fetch.bind(window);
    return new AuthCoordinator({
      api: createAuthApi({ baseUrl, fetch: transport }),
      fetch: transport,
      store: createWebSessionStore(window.sessionStorage),
      createPkce: createHandoffPkce,
      browser: createWebAuthBrowser(window),
    });
  }
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
