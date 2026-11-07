/**
 * 프로필 편집에서 입력 중인 닉네임의 사용 가능 여부를 자동으로 확인합니다.
 * 입력이 멈춘 뒤 잠시 기다렸다가 서버에 묻고, 늦게 도착한 이전 응답은 무시합니다.
 * 중복 기준은 서버와 같이 대소문자와 앞뒤 공백을 무시합니다.
 */
import { useEffect, useState } from 'react';
import type { RufitSession } from '../../api/session';

export type NicknameStatus = 'idle' | 'short' | 'checking' | 'available' | 'taken' | 'error';

/** 입력을 멈춘 뒤 서버에 확인하기까지 기다리는 시간입니다. */
const checkDelayMs = 400;

/** 상태별로 입력칸 아래에 보여 줄 안내 문구입니다. 표시할 내용이 없으면 빈 문자열입니다. */
export function nicknameMessage(status: NicknameStatus) {
  switch (status) {
    case 'short':
      return '닉네임은 2자 이상 입력해 주세요.';
    case 'checking':
      return '사용할 수 있는 닉네임인지 확인하고 있어요.';
    case 'available':
      return '사용할 수 있는 닉네임입니다.';
    case 'taken':
      return '이미 사용 중인 닉네임입니다.';
    case 'error':
      return '닉네임을 확인하지 못했어요. 저장할 때 다시 확인합니다.';
    default:
      return '';
  }
}

/** 서버 확인 없이 정할 수 있는 상태(로그인 안 함·변경 없음·너무 짧음)를 먼저 판단합니다. */
export function localNicknameStatus(
  name: string,
  current: string,
  signedIn: boolean,
): NicknameStatus | null {
  const trimmed = name.trim();
  if (!signedIn) return 'idle';
  if (trimmed.toLowerCase() === current.trim().toLowerCase()) return 'idle';
  if (trimmed.length < 2) return 'short';
  return null;
}

export function useNicknameAvailability(
  session: RufitSession | null,
  name: string,
  current: string,
): NicknameStatus {
  const trimmed = name.trim();
  const local = localNicknameStatus(name, current, !!session?.isActive());
  const [result, setResult] = useState<{ nickname: string; status: NicknameStatus } | null>(null);
  useEffect(() => {
    if (local || !session) return;
    let active = true;
    const timer = setTimeout(() => {
      session.api
        .nicknameAvailability(trimmed)
        .then((value) => {
          if (active) setResult({ nickname: trimmed, status: value.available ? 'available' : 'taken' });
        })
        .catch(() => {
          if (active) setResult({ nickname: trimmed, status: 'error' });
        });
    }, checkDelayMs);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [local, session, trimmed]);
  if (local) return local;
  return result?.nickname === trimmed ? result.status : 'checking';
}
