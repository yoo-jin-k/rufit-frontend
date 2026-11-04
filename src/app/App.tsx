import {useMemo, useState, useSyncExternalStore} from 'react';
import {StatusBar} from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {AuthModal} from '../features/auth/AuthModal';
import {createNativeAuthCoordinator, nativeAuthAvailable} from '../features/auth/nativeAuth';
import type {AuthStatus} from '../features/auth/types';
import { WorkoutScreen } from '../features/workout/WorkoutScreen';

const signedOutSnapshot: AuthStatus = Object.freeze({kind: 'signed-out'} as const);
const getSignedOutSnapshot = (): AuthStatus => signedOutSnapshot;
const subscribeWithoutAuth = () => () => {};

export default function App() {
  const [showAuth, setShowAuth] = useState(false);
  const baseUrl = process.env.EXPO_PUBLIC_RUFIT_API_URL;
  const demo = __DEV__ && process.env.EXPO_PUBLIC_RUFIT_AUTH_DEMO === 'true';
  const coordinator = useMemo(() => nativeAuthAvailable && baseUrl ? createNativeAuthCoordinator(baseUrl) : null, [baseUrl]);
  const status = useSyncExternalStore(coordinator?.subscribe ?? subscribeWithoutAuth, coordinator?.getState ?? getSignedOutSnapshot);
  const enabled = {
    KAKAO: nativeAuthAvailable && process.env.EXPO_PUBLIC_RUFIT_KAKAO_ENABLED === 'true',
    GOOGLE: nativeAuthAvailable && process.env.EXPO_PUBLIC_RUFIT_GOOGLE_ENABLED === 'true',
  };
  const authLabel = status.kind === 'signed-in' || status.kind === 'refreshing' || status.kind === 'signing-out' ? '계정' : '로그인';
  return <SafeAreaProvider><StatusBar style="dark" />
    <WorkoutScreen authLabel={authLabel} onOpenAuth={() => setShowAuth(true)} />
    <AuthModal visible={showAuth} onClose={() => setShowAuth(false)} coordinator={coordinator} status={status} enabled={enabled} demo={demo} />
  </SafeAreaProvider>;
}
