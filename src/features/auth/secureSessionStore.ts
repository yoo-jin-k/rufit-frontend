import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { StoredSession } from './types.ts';

export type SessionStore = {
  save(value: StoredSession): Promise<void>;
  clear(): Promise<void>;
  hasSavedSession(): Promise<boolean>;
};
const key = 'rufit.auth-session.v1';

export function createSecureSessionStore(): SessionStore {
  if (Platform.OS === 'web')
    return {
      save: async () => {
        throw new Error('웹에는 모바일 세션을 저장하지 않습니다.');
      },
      clear: async () => {},
      hasSavedSession: async () => false,
    };
  return {
    save: (value) =>
      SecureStore.setItemAsync(key, JSON.stringify(value), {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      }),
    clear: () => SecureStore.deleteItemAsync(key),
    hasSavedSession: async () => (await SecureStore.getItemAsync(key)) !== null,
  };
}
