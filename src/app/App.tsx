import { AppSurface } from '../components/AppSurface';
import { WelcomeScreen } from '../features/auth/WelcomeScreen';
/**
 * 앱의 공통 화면과 인증 상태를 연결하는 최상위 구성 요소입니다.
 * 인증 기능의 활성 여부는 실행 환경 설정을 따르며 게스트 운동 화면도 제공합니다.
 */
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthModal } from '../features/auth/AuthModal';
import { createNativeAuthCoordinator, nativeAuthAvailable } from '../features/auth/nativeAuth';
import type { AuthStatus } from '../features/auth/types';
import { WorkoutScreen } from '../features/workout/WorkoutScreen';

const signedOutSnapshot: AuthStatus = Object.freeze({ kind: 'signed-out' } as const);
const getSignedOutSnapshot = (): AuthStatus => signedOutSnapshot;
const subscribeWithoutAuth = () => () => {};

export default function App() {
  const [showAuth, setShowAuth] = useState(false);
  const [entered, setEntered] = useState(false);
  const baseUrl = process.env.EXPO_PUBLIC_RUFIT_API_URL;
  const demo = __DEV__ && process.env.EXPO_PUBLIC_RUFIT_AUTH_DEMO === 'true';
  const coordinator = useMemo(
    () => (nativeAuthAvailable && baseUrl ? createNativeAuthCoordinator(baseUrl) : null),
    [baseUrl],
  );
  useEffect(() => { void coordinator?.restore(); }, [coordinator]);
  const status = useSyncExternalStore(
    coordinator?.subscribe ?? subscribeWithoutAuth,
    coordinator?.getState ?? getSignedOutSnapshot,
  );
  const enabled = {
    KAKAO: nativeAuthAvailable && process.env.EXPO_PUBLIC_RUFIT_KAKAO_ENABLED === 'true',
    GOOGLE: nativeAuthAvailable && process.env.EXPO_PUBLIC_RUFIT_GOOGLE_ENABLED === 'true',
  };
  const authLabel =
    status.kind === 'signed-in' || status.kind === 'refreshing' || status.kind === 'signing-out'
      ? '계정'
      : '로그인';
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AppSurface>
        {entered || authLabel === '계정' ? (
          <WorkoutScreen session={coordinator?.getSession() ?? null} authLabel={authLabel} onOpenAuth={() => setShowAuth(true)} />
        ) : (
          <WelcomeScreen onLogin={() => setShowAuth(true)} onGuest={() => setEntered(true)} />
        )}
        <AuthModal
          visible={showAuth}
          onClose={() => setShowAuth(false)}
          coordinator={coordinator}
          status={status}
          enabled={enabled}
          demo={demo}
        />
      </AppSurface>
    </SafeAreaProvider>
  );
}
