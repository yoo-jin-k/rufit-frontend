import test from 'node:test';
import assert from 'node:assert/strict';
import {
  localNicknameStatus,
  nicknameMessage,
} from '../src/features/profile/useNicknameAvailability.ts';

test('로그인하지 않았거나 현재 닉네임과 같으면(대소문자·공백 무시) 서버에 묻지 않습니다', () => {
  assert.equal(localNicknameStatus('새닉네임', '운동하는 나', false), 'idle');
  assert.equal(localNicknameStatus('  RUFIT ', 'rufit', true), 'idle');
});

test('2자 미만은 서버 확인 없이 안내하고, 그 외에는 서버 확인이 필요합니다', () => {
  assert.equal(localNicknameStatus(' a ', '운동하는 나', true), 'short');
  assert.equal(localNicknameStatus('루핏회원', '운동하는 나', true), null);
});

test('사용 가능·불가 결과를 입력칸 아래 안내 문구로 바꿉니다', () => {
  assert.equal(nicknameMessage('available'), '사용할 수 있는 닉네임입니다.');
  assert.equal(nicknameMessage('taken'), '이미 사용 중인 닉네임입니다.');
  assert.equal(nicknameMessage('idle'), '');
});
