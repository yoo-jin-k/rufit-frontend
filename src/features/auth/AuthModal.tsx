import { EmailAccountPanel } from './EmailAccountPanel';
import { AppModal as Modal } from '../../components/AppModal';
import { useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
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
import { NavBar } from '../../components/kit/Screen';
import { colors, size, spacing } from '../../theme/tokens';
import { ConfirmDialog, LogoMark } from '../../components/kit/Surfaces';
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
import { s } from './AuthModal.styles';
import { GoogleLogo } from './GoogleLogo';

const kakaoButton = require('../../../assets/brand/kakao-login-ko.png');
const providerName = { KAKAO: '카카오', GOOGLE: 'Google', EMAIL: '이메일' } as const;

function ProviderButton({
  provider,
  disabled,
  onPress,
}: {
  provider: SocialProvider;
  disabled: boolean;
  onPress(): void;
}) {
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
      {provider === 'KAKAO' ? (
        <Image source={kakaoButton} resizeMode="contain" style={s.kakaoImage} accessible={false} />
      ) : (
        <View style={s.googleContent}>
          <GoogleLogo />
          <Text style={s.googleText}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

/** iOS 인증 브라우저 위에 별도 네이티브 시트를 겹치지 않도록 앱 내부 화면으로 표시합니다. */
function AuthPresentation({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose(): void;
  children: ReactNode;
}) {
  if (Platform.OS === 'ios')
    return visible ? (
      <View
        accessibilityViewIsModal
        style={[StyleSheet.absoluteFill, { zIndex: 1000, backgroundColor: colors.surface }]}
      >
        {children}
      </View>
    ) : null;
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {children}
    </Modal>
  );
}

export function AuthModal({
  visible,
  onClose,
  coordinator,
  status,
  enabled,
  demo,
  emailOnly = false,
}: {
  visible: boolean;
  onClose(): void;
  coordinator: AuthCoordinator | null;
  status: AuthStatus;
  enabled: Record<SocialProvider, boolean>;
  demo: boolean;
  /** 시작 화면의 '이메일로 로그인'으로 열면 카카오·Google 버튼과 안내를 숨기고 이메일 로그인만 보여 줍니다. */
  emailOnly?: boolean;
}) {
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  const [confirmLogout, updateLogoutConfirmation] = useReducer(logoutConfirmation, false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  async function deleteAccount() {
    if (!coordinator || deleting) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await coordinator.deleteAccount();
    } catch (cause) {
      setDeleteError(
        cause instanceof Error ? cause.message : '탈퇴하지 못했어요. 잠시 후 다시 시도해 주세요.',
      );
    } finally {
      setConfirmDelete(false);
      setDeleting(false);
    }
  }
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
        {/* 다른 화면과 같은 왼쪽 위 ‹ 뒤로 아이콘입니다. 스크롤해도 위에 고정됩니다. */}
        <View style={{ paddingHorizontal: padding }}>
          <NavBar leading="back" onLeading={closeToWorkout} />
        </View>
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
          <LogoMark size={36} />
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
              {coordinator && (
                <EmailAccountPanel
                  key={sessionKey}
                  coordinator={coordinator}
                  signedIn
                  enabled={enabled}
                />
              )}
              <Text style={s.localNotice}>{signedInLocalNotice}</Text>
              <Text style={s.localNotice}>
                {Platform.OS === 'web'
                  ? '로컬 웹 시험용 로그인입니다. 새로고침하면 복원하며, 탭을 닫으면 종료됩니다.'
                  : restartLoginNotice}
              </Text>
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
              {!!deleteError && (
                <Text accessibilityRole="alert" style={[s.body, { color: colors.danger }]}>
                  {deleteError}
                </Text>
              )}
              {/* 되돌릴 수 없는 동작이라 눈에 덜 띄는 글자 버튼으로 맨 아래에 둡니다. */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="회원 탈퇴"
                disabled={busy || deleting}
                hitSlop={8}
                onPress={() => setConfirmDelete(true)}
                style={{ alignSelf: 'center', paddingVertical: spacing.sm }}
              >
                <Text style={[s.localNotice, { textDecorationLine: 'underline' }]}>회원 탈퇴</Text>
              </Pressable>
              <ConfirmDialog
                visible={confirmDelete}
                title="회원 탈퇴할까요?"
                message="계정과 서버에 저장한 운동 기록·프로필·오운완·친구 관계가 모두 지워지고 되돌릴 수 없어요."
                confirmLabel="탈퇴하기"
                tone="danger"
                busy={deleting}
                onCancel={() => setConfirmDelete(false)}
                onConfirm={() => void deleteAccount()}
              />
            </>
          ) : (
            <>
              <Text style={s.title}>{emailOnly ? '이메일로 로그인' : '루핏에 로그인'}</Text>
              <Text style={s.body}>
                {emailOnly
                  ? '가입한 이메일과 비밀번호를 입력해 주세요.'
                  : '사용할 계정을 선택해 주세요.'}
              </Text>
              {coordinator && (
                <EmailAccountPanel coordinator={coordinator} signedIn={false} enabled={enabled} />
              )}
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
              {!emailOnly && !anyProviderEnabled && (
                <View style={s.status}>
                  <Text style={s.heading}>지금은 로그인을 사용할 수 없어요.</Text>
                  <Text style={s.body}>로그인 없이 운동 기록을 계속할 수 있어요.</Text>
                </View>
              )}
              {!emailOnly && anyProviderEnabled && (
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
              {!emailOnly && (
                <>
                  <Text style={s.caption}>로그인은 시스템 브라우저에서 진행돼요.</Text>
                  <Text style={s.caption}>
                    처음 로그인하면 루핏 계정이 만들어져요. 같은 기록으로 이용하려면 로그인 후 계정
                    관리에서 다른 로그인 방법을 연결해 주세요.
                  </Text>
                </>
              )}
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
