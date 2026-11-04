import type {AuthStatus, SocialProvider} from './types';

const providerName = {KAKAO: '카카오', GOOGLE: 'Google'} as const;

export function authStatusCopy(status: AuthStatus) {
  if (status.kind === 'signing-in') return status.stage === 'opening'
    ? {title: '로그인 화면을 여는 중…', body: '시스템 브라우저로 이동합니다.'}
    : status.stage === 'browser-pending'
      ? {title: `${providerName[status.provider]}에서 로그인을 진행해 주세요.`, body: '완료하면 루핏으로 돌아옵니다.'}
      : {title: '계정을 확인하고 있어요.', body: '잠시만 기다려 주세요.'};
  if (status.kind === 'refreshing') return {title: '계정을 확인하고 있어요.', body: '운동 기록은 계속 사용할 수 있어요.'};
  if (status.kind === 'signing-out') return {title: '로그아웃 중…', body: '운동 기록은 그대로 유지해요.'};
  if (status.kind === 'error') {
    const title = status.reason === 'logout-local' ? '기기의 로그인 정보를 지우지 못했어요.'
      : status.reason === 'secure-store' ? '로그인 정보를 저장하지 못했어요.'
        : status.reason === 'reauth-required' ? '다시 로그인이 필요해요.'
          : status.reason === 'rejected-callback' ? '로그인 응답을 확인하지 못했어요.' : '로그인하지 못했어요.';
    return {title, body: status.message};
  }
  if (status.kind === 'signed-in') return {title: '로그인했어요.', body: `${providerName[status.provider]} 계정으로 로그인 중`};
  return status.notice ? {title: status.notice.split('.')[0] || '알림', body: status.notice} : null;
}

export function loginRecovery(status: AuthStatus): {label: string; provider: SocialProvider | null} | null {
  if (status.kind !== 'error' || status.action !== 'retry-login') return null;
  return {label: status.provider ? '다시 시도' : '다시 로그인', provider: status.provider ?? null};
}

export function authSessionKey(status: AuthStatus) {
  if (status.kind === 'signed-in' || status.kind === 'refreshing') return `${status.accountId}:${status.provider}`;
  return null;
}

export function logoutConfirmation(_current: boolean, action: 'open' | 'reset') {
  return action === 'open';
}

export function authContentBottomPadding(bottomInset: number, designPadding: number) {
  return Math.max(bottomInset, designPadding);
}

export function providerAccessibilityLabel(provider: SocialProvider) {
  return provider === 'KAKAO' ? '카카오 로그인' : 'Sign in with Google';
}

export const signedInLocalNotice = '운동 기록은 이 기기에 보관돼요. 로그인해도 자동으로 동기화되지 않아요.';
export const restartLoginNotice = '앱을 다시 열면 다시 로그인해야 해요.';
