import { NotificationProvider } from '../features/notifications/NotificationProvider';
import { AppSurface } from '../components/AppSurface';
import { WelcomeScreen } from '../features/auth/WelcomeScreen';
/**
 * 앱의 공통 화면과 인증 상태를 연결하는 최상위 구성 요소입니다.
 * 인증 기능의 활성 여부는 실행 환경 설정을 따르며 게스트 운동 화면도 제공합니다.
 */
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthModal } from '../features/auth/AuthModal';
import {
  authReturnUrl,
  createNativeAuthCoordinator,
  nativeAuthAvailable,
  nativeAuthClient,
} from '../features/auth/nativeAuth';
import type { AuthStatus } from '../features/auth/types';
import { WorkoutScreen } from '../features/workout/WorkoutScreen';

const signedOutSnapshot: AuthStatus = Object.freeze({ kind: 'signed-out' } as const);
const getSignedOutSnapshot = (): AuthStatus => signedOutSnapshot;
const subscribeWithoutAuth = () => () => {};

export default function App() {
  const [showAuth, setShowAuth] = useState(false);
  // 시작 화면의 '이메일로 로그인'으로 연 경우에만 이메일 로그인만 보여 줍니다.
  const [emailOnly, setEmailOnly] = useState(false);
  const [entered, setEntered] = useState(false);
  const baseUrl = process.env.EXPO_PUBLIC_RUFIT_API_URL;
  const demo = __DEV__ && process.env.EXPO_PUBLIC_RUFIT_AUTH_DEMO === 'true';
  const coordinator = useMemo(
    () => (nativeAuthAvailable && baseUrl ? createNativeAuthCoordinator(baseUrl) : null),
    [baseUrl],
  );
  useEffect(() => {
    void coordinator?.restore();
  }, [coordinator]);
  // 앱이 다시 활성화되면 일시 장애로 실패한 로그인 복원을 재시도하고, 만료가 가까운 접근 토큰을 갱신합니다.
  useEffect(() => {
    if (!coordinator) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void coordinator.resume();
    });
    return () => subscription.remove();
  }, [coordinator]);
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
  // 로그인 창에서 방금 로그인에 성공하면 창을 닫아 운동 화면(운동 시작 시트)으로 바로 보냅니다.
  // 이미 로그인한 상태에서 계정 화면을 연 경우에는 닫지 않습니다.
  // 로그인이 만료돼 다시 로그인해야 하면 화면마다 오류 글자를 띄우는 대신 로그인 창을 엽니다.
  // 시작 화면의 카카오·Google 버튼으로 바로 시작한 로그인인지 기억합니다. 취소하면 시작 화면으로 돌아갑니다.
  const [quickStart, setQuickStart] = useState(false);
  const [seenStatus, setSeenStatus] = useState(status);
  if (seenStatus !== status) {
    setSeenStatus(status);
    if (quickStart && status.kind !== 'signing-in') {
      setQuickStart(false);
      if (status.kind === 'signed-out' && status.cancelled) setShowAuth(false);
    }
    if (
      (status.kind === 'error' && status.reason === 'reauth-required') ||
      (status.kind === 'signed-out' && status.reauth)
    ) {
      setEmailOnly(false);
      setShowAuth(true);
      setEntered(true);
    }
  }
  const wasSignedIn = useRef(authLabel === '계정');
  useEffect(() => {
    const signedIn = authLabel === '계정';
    if (signedIn && !wasSignedIn.current) setShowAuth(false);
    wasSignedIn.current = signedIn;
  }, [authLabel]);
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <NotificationProvider
        session={coordinator?.getSession() ?? null}
        accountMode={authLabel === '계정'}
      >
        <AppSurface>
          {entered || authLabel === '계정' ? (
            <WorkoutScreen
              session={coordinator?.getSession() ?? null}
              authLabel={authLabel}
              onOpenAuth={() => {
                setEmailOnly(false);
                setShowAuth(true);
              }}
            />
          ) : (
            <WelcomeScreen
              onLogin={(entry) => {
                setEmailOnly(entry === 'EMAIL');
                setShowAuth(true);
                // 카카오·Google은 같은 버튼을 한 번 더 누르지 않도록 바로 로그인을 시작합니다.
                // 로그인 창은 진행 상황과 취소 버튼을 보여 주고, 취소하면 다른 방법을 고를 수 있습니다.
                if (entry !== 'EMAIL' && enabled[entry] && coordinator && nativeAuthClient) {
                  setQuickStart(true);
                  void coordinator.login(entry, nativeAuthClient, authReturnUrl);
                }
              }}
              onGuest={() => setEntered(true)}
            />
          )}
          <AuthModal
            visible={showAuth}
            onClose={() => setShowAuth(false)}
            coordinator={coordinator}
            status={status}
            enabled={enabled}
            demo={demo}
            emailOnly={emailOnly}
          />
        </AppSurface>
      </NotificationProvider>
    </SafeAreaProvider>
  );
}
