import type { StoredSession } from './types.ts';
/** 보안 저장소의 값도 검증합니다. 다른 서버로 토큰을 보내거나 만료된 계정을 복원하지 않습니다. */
export function decodeStoredSession(raw: string | null): StoredSession | null {
  if (raw === null) return null;
  const value = JSON.parse(raw);
  if (value?.schemaVersion !== 1 || !['KAKAO', 'GOOGLE', 'EMAIL'].includes(value.provider)
    || typeof value.server !== 'string' || typeof value.account?.id !== 'string' || !value.account.id.trim()
    || typeof value.sessionId !== 'string' || !value.sessionId
    || typeof value.refreshToken !== 'string' || !/^[\x21-\x7E]{1,4096}$/.test(value.refreshToken)
    || typeof value.refreshTokenExpiresAt !== 'string' || !Number.isFinite(Date.parse(value.refreshTokenExpiresAt)))
    throw new Error('저장된 로그인 정보를 확인하지 못했습니다. 다시 로그인해 주세요.');
  const url = new URL(value.server);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash)
    throw new Error('저장된 서버 주소를 확인하지 못했습니다.');
  return value;
}
