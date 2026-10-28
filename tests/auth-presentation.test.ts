import assert from 'node:assert/strict';
import test from 'node:test';
import {authContentBottomPadding, authSessionKey, authStatusCopy, loginRecovery, logoutConfirmation, providerAccessibilityLabel, restartLoginNotice, signedInLocalNotice} from '../src/features/auth/authPresentation.ts';
import type {AuthErrorReason, AuthStatus} from '../src/features/auth/types.ts';

test('보안저장·만료·변조응답 오류를 서로 다른 제목과 명시적 복구로 표시한다', () => {
  const titles: Record<AuthErrorReason, string> = {
    'secure-store': '로그인 정보를 저장하지 못했어요.',
    'reauth-required': '다시 로그인이 필요해요.',
    'rejected-callback': '로그인 응답을 확인하지 못했어요.',
    'login-failed': '로그인하지 못했어요.',
    'logout-local': '기기의 로그인 정보를 지우지 못했어요.',
  };
  for (const [reason, title] of Object.entries(titles) as [AuthErrorReason, string][]) {
    const status: AuthStatus = {kind: 'error', reason, message: '안내', action: reason === 'logout-local' ? 'retry-logout' : 'retry-login'};
    assert.equal(authStatusCopy(status)?.title, title);
  }
  assert.deepEqual(loginRecovery({kind: 'error', reason: 'rejected-callback', message: '안내', action: 'retry-login', provider: 'KAKAO'}), {label: '다시 시도', provider: 'KAKAO'});
  assert.deepEqual(loginRecovery({kind: 'error', reason: 'reauth-required', message: '안내', action: 'retry-login'}), {label: '다시 로그인', provider: null});
  const network = authStatusCopy({kind: 'error', reason: 'reauth-required', message: '서버 연결을 확인해 주세요.', action: 'retry-login'});
  const expired = authStatusCopy({kind: 'error', reason: 'reauth-required', message: '세션이 만료되었습니다.', action: 'retry-login'});
  assert.equal(network?.title, '다시 로그인이 필요해요.');
  assert.equal(expired?.title, '다시 로그인이 필요해요.');
  assert.doesNotMatch(network?.title ?? '', /만료/);
});

test('로그아웃 확인은 닫힘·세션 교체 reset에서 닫히고 현재 세션의 open에서만 열린다', () => {
  assert.equal(logoutConfirmation(false, 'open'), true);
  assert.equal(logoutConfirmation(true, 'reset'), false);
  assert.equal(authSessionKey({kind: 'signed-in', accountId: 'account', provider: 'KAKAO'}), 'account:KAKAO');
  assert.equal(authSessionKey({kind: 'refreshing', accountId: 'account', provider: 'KAKAO'}), 'account:KAKAO');
  assert.equal(authSessionKey({kind: 'signed-in', accountId: 'account', provider: 'GOOGLE'}), 'account:GOOGLE');
  assert.equal(authSessionKey({kind: 'signed-out'}), null);
});

test('로그인 계정에도 기기 보관·비동기화·재실행 재로그인 안내를 유지한다', () => {
  assert.match(signedInLocalNotice, /이 기기에 보관/);
  assert.match(signedInLocalNotice, /자동으로 동기화되지 않/);
  assert.match(restartLoginNotice, /앱을 다시 열면 다시 로그인/);
});

test('하단 inset은 디자인 여백과 중복 합산하지 않고 공식 Google 이름을 그대로 읽는다', () => {
  assert.equal(authContentBottomPadding(34, 20), 34);
  assert.equal(authContentBottomPadding(10, 20), 20);
  assert.equal(providerAccessibilityLabel('GOOGLE'), 'Sign in with Google');
  assert.equal(providerAccessibilityLabel('KAKAO'), '카카오 로그인');
});
