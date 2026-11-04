import { AppModal as Modal } from '../../components/AppModal';
import { useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Image,

  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { colors, radius, size, spacing, typography } from '../../theme/tokens';
import type { AuthCoordinator } from './authCoordinator';
import {
  authContentBottomPadding,
  authSessionKey,
  authStatusCopy,
  loginRecovery,
  logoutConfirmation,
  providerAccessibilityLabel,
  restartLoginNotice,
  signedInLocalNotice,
} from './authPresentation';
import { authReturnUrl, nativeAuthClient } from './nativeAuth';
import type { AuthStatus, SocialProvider } from './types';

const logo = require('../../../assets/brand/rufit-logo-v1.png');
const kakaoButton = require('../../../assets/brand/kakao-login-ko.png');
const googleButton =
  Platform.OS === 'ios'
    ? require('../../../assets/brand/google-signin-ios-light.png')
    : require('../../../assets/brand/google-signin-android-web-light.png');
const providerName = { KAKAO: '카카오', GOOGLE: 'Google' } as const;

function ProviderButton({
  provider,
  disabled,
  onPress,
}: {
  provider: SocialProvider;
  disabled: boolean;
  onPress(): void;
}) {
  const image = provider === 'KAKAO' ? kakaoButton : googleButton;
  const label = providerAccessibilityLabel(provider);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.providerButton,
        provider === 'KAKAO' ? s.kakao : s.google,
        disabled && s.providerDisabled,
        pressed && !disabled && s.providerPressed,
      ]}
    >
      <Image
        source={image}
        resizeMode="contain"
        style={provider === 'KAKAO' ? s.kakaoImage : s.googleImage}
        accessible={false}
      />
    </Pressable>
  );
}

/** iOS 인증 브라우저 위에 별도 네이티브 시트를 겹치지 않도록 앱 내부 화면으로 표시합니다. */
function AuthPresentation({ visible, onClose, children }: {
  visible: boolean; onClose(): void; children: ReactNode;
}) {
  if (Platform.OS === 'ios') return visible ? (
    <View accessibilityViewIsModal style={[StyleSheet.absoluteFill, { zIndex: 1000, backgroundColor: colors.surface }]}>
      {children}
    </View>
  ) : null;
  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}>{children}</Modal>;
}

export function AuthModal({
  visible,
  onClose,
  coordinator,
  status,
  enabled,
  demo,
}: {
  visible: boolean;
  onClose(): void;
  coordinator: AuthCoordinator | null;
  status: AuthStatus;
  enabled: Record<SocialProvider, boolean>;
  demo: boolean;
}) {
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  const [confirmLogout, updateLogoutConfirmation] = useReducer(logoutConfirmation, false);
  const signedIn =
    status.kind === 'signed-in' || status.kind === 'refreshing' || status.kind === 'signing-out';
  const busy =
    status.kind === 'signing-in' || status.kind === 'refreshing' || status.kind === 'signing-out';
  const authLocked = busy || (status.kind === 'error' && status.action === 'retry-logout');
  const anyProviderEnabled = enabled.KAKAO || enabled.GOOGLE;
  const padding =
    window.width < size.mediumWindow
      ? spacing.lg
      : window.width < size.wideWindow
        ? spacing.xl
        : spacing.xxl;
  const copy = useMemo(() => authStatusCopy(status), [status]);
  const recovery = useMemo(() => loginRecovery(status), [status]);
  const sessionKey = authSessionKey(status);
  useEffect(() => {
    if (!visible || !copy || !['error', 'signed-in'].includes(status.kind)) return;
    if (Platform.OS === 'ios')
      AccessibilityInfo.announceForAccessibility(`${copy.title} ${copy.body}`);
  }, [copy, status.kind, visible]);
  useEffect(() => {
    if (visible) scroll.current?.scrollTo({ y: 0, animated: false });
  }, [signedIn, visible]);
  useEffect(() => {
    updateLogoutConfirmation('reset');
  }, [sessionKey, visible]);
  const previousStatus = useRef(status.kind);
  useEffect(() => {
    // 새 로그인이 완료된 경우에만 닫습니다. 사용자가 연 계정 관리 화면은 유지합니다.
    if (previousStatus.current === 'signing-in' && status.kind === 'signed-in') onClose();
    previousStatus.current = status.kind;
  }, [status.kind, onClose]);
  function login(provider: SocialProvider) {
    if (!coordinator || !nativeAuthClient) return;
    void coordinator.login(provider, nativeAuthClient, authReturnUrl);
  }
  function closeToWorkout() {
    if (status.kind === 'signing-in') coordinator?.cancelLogin();
    onClose();
  }
  function recoverLogin() {
    if (recovery?.provider && enabled[recovery.provider]) login(recovery.provider);
    else coordinator?.showLoginSelection();
  }
  return (
    <AuthPresentation visible={visible} onClose={closeToWorkout}>
      <SafeAreaView style={s.page} edges={['top', 'left', 'right']}>
        <ScrollView
          ref={scroll}
          contentContainerStyle={[
            s.content,
            {
              paddingHorizontal: padding,
              paddingBottom: authContentBottomPadding(insets.bottom, padding),
            },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <Button
            title="뒤로"
            secondary
            accessibilityLabel="운동 기록으로 돌아가기"
            onPress={closeToWorkout}
          />
          <Image source={logo} resizeMode="contain" style={s.logo} accessibilityLabel="루핏" />
          {Platform.OS === 'web' && !coordinator ? (
            <>
              <Text style={s.title}>로그인은 모바일 앱에서 이용할 수 있어요.</Text>
              <Text style={s.body}>웹에서는 로그인 없이 운동을 기록할 수 있어요.</Text>
              <Button title="운동 기록으로 돌아가기" onPress={closeToWorkout} />
            </>
          ) : signedIn ? (
            <>
              <Text style={s.title}>내 계정</Text>
              <View style={s.card}>
                <Text style={s.heading}>루핏 회원</Text>
                <Text style={s.body}>
                  {status.kind !== 'signing-out' && 'provider' in status
                    ? `${providerName[status.provider]} 계정`
                    : '확인된 계정'}
                </Text>
              </View>
              {copy && (
                <View accessibilityLiveRegion="polite" style={s.status}>
                  <Text style={s.heading}>{copy.title}</Text>
                  <Text style={s.body}>{copy.body}</Text>
                </View>
              )}
              <Text style={s.localNotice}>{signedInLocalNotice}</Text>
              <Text style={s.localNotice}>{Platform.OS === 'web' ? '로컬 웹 시험용 로그인입니다. 새로고침하면 복원하며, 탭을 닫으면 종료됩니다.' : restartLoginNotice}</Text>
              {confirmLogout ? (
                <View style={s.card}>
                  <Text style={s.heading}>로그아웃할까요?</Text>
                  <Text style={s.body}>
                    이 기기의 로그인 정보를 지워요. 운동 기록은 남아 있어요.
                  </Text>
                  <Button
                    title="로그아웃"
                    loading={status.kind === 'signing-out'}
                    onPress={() => void coordinator?.logout()}
                  />
                  <Button
                    title="취소"
                    secondary
                    onPress={() => updateLogoutConfirmation('reset')}
                  />
                </View>
              ) : (
                <Button
                  title="로그아웃"
                  secondary
                  disabled={busy}
                  onPress={() => updateLogoutConfirmation('open')}
                />
              )}
              <Button title="운동 기록으로 돌아가기" onPress={closeToWorkout} />
            </>
          ) : (
            <>
              <Text style={s.title}>루핏에 로그인</Text>
              <Text style={s.body}>사용할 계정을 선택해 주세요.</Text>
              {copy && (
                <View
                  accessibilityRole={status.kind === 'error' ? 'alert' : undefined}
                  accessibilityLiveRegion="polite"
                  style={[s.status, status.kind === 'error' && s.errorStatus]}
                >
                  <Text style={s.heading}>{copy.title}</Text>
                  <Text style={s.body}>{copy.body}</Text>
                </View>
              )}
              {status.kind === 'error' && status.action === 'retry-logout' && (
                <Button title="로그아웃 다시 시도" onPress={() => void coordinator?.logout()} />
              )}
              {recovery && (
                <Button
                  title={
                    recovery.provider && enabled[recovery.provider] ? recovery.label : '다시 로그인'
                  }
                  onPress={recoverLogin}
                />
              )}
              {!anyProviderEnabled && (
                <View style={s.status}>
                  <Text style={s.heading}>지금은 로그인을 사용할 수 없어요.</Text>
                  <Text style={s.body}>로그인 없이 운동 기록을 계속할 수 있어요.</Text>
                </View>
              )}
              {anyProviderEnabled && (
                <View style={s.providers}>
                  <ProviderButton
                    provider="KAKAO"
                    disabled={authLocked || !coordinator || !enabled.KAKAO}
                    onPress={() => login('KAKAO')}
                  />
                  {!enabled.KAKAO && (
                    <Text style={s.caption}>지금은 카카오 로그인을 사용할 수 없어요.</Text>
                  )}
                  <ProviderButton
                    provider="GOOGLE"
                    disabled={authLocked || !coordinator || !enabled.GOOGLE}
                    onPress={() => login('GOOGLE')}
                  />
                  {!enabled.GOOGLE && (
                    <Text style={s.caption}>지금은 Google 로그인을 사용할 수 없어요.</Text>
                  )}
                </View>
              )}
              <Text style={s.caption}>로그인은 시스템 브라우저에서 진행돼요.</Text>
              <Text style={s.caption}>
                처음 로그인하면 루핏 계정이 만들어져요. 로그인 방법이 다르면 별도 계정으로 처리돼요.
              </Text>
              {busy && status.kind === 'signing-in' && (
                <Button title="로그인 취소" secondary onPress={() => coordinator?.cancelLogin()} />
              )}
              {demo && coordinator && !busy && (
                <View style={s.demo}>
                  <Text style={s.heading}>개발용 가짜 인증</Text>
                  <Text style={s.caption}>
                    실제 카카오·Google 로그인이 아닙니다. HTTP 계약 시험에서만 사용합니다.
                  </Text>
                  <Button
                    title="개발용 카카오 흐름 시험"
                    secondary
                    onPress={() => login('KAKAO')}
                  />
                  <Button
                    title="개발용 Google 흐름 시험"
                    secondary
                    onPress={() => login('GOOGLE')}
                  />
                </View>
              )}
              <Button title="로그인 없이 계속하기" secondary onPress={closeToWorkout} />
              <Text style={s.localNotice}>{signedInLocalNotice}</Text>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </AuthPresentation>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.surface },
  content: {
    width: '100%',
    maxWidth: size.contentMax,
    alignSelf: 'center',
    paddingTop: spacing.md,
    gap: spacing.xxl,
  },
  logo: { width: 160, height: 57, maxWidth: '100%', alignSelf: 'flex-start' },
  title: { ...typography.title, color: colors.text },
  body: { ...typography.body, color: colors.textSecondary },
  heading: { ...typography.heading, color: colors.text },
  caption: { ...typography.caption, color: colors.textSecondary },
  providers: { width: '100%', maxWidth: 400, alignSelf: 'center', gap: spacing.md },
  providerButton: {
    height: 68,
    width: 288,
    maxWidth: '100%',
    alignSelf: 'center',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kakao: { backgroundColor: '#FEE500', borderRadius: 10 },
  google: { backgroundColor: '#FFFFFF', borderRadius: 6 },
  kakaoImage: { height: 68, width: 288, maxWidth: '100%' },
  googleImage: { height: 68, width: 288, maxWidth: '100%' },
  providerDisabled: { opacity: 0.45 },
  providerPressed: { opacity: 0.76 },
  status: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.status,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  errorStatus: { backgroundColor: colors.dangerSurface },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.md,
  },
  demo: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.inputBorder,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.md,
  },
  localNotice: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
});
