/**
 * 세트의 '횟수 칸' 값과 서버 세트 필드를 서로 바꿉니다.
 * 앱 안에서는 무게·횟수 종목과 시간 종목 모두 세트의 reps 칸(문자열)에 숫자를 담고,
 * 서버로 보낼 때만 시간 종목이면 durationSeconds(초), 아니면 reps(회)로 나눕니다.
 */
import { isTimedExercise } from '../exercises/catalog.ts';

export type ServerCount = { reps?: number | null; durationSeconds?: number | null };

/** 서버로 보낼 횟수·시간 필드입니다. 시간 종목은 reps를 null로 비웁니다. */
export function toServerCount(catalogId: string | null | undefined, value: string): ServerCount {
  const n = Number(value);
  return isTimedExercise(catalogId) ? { reps: null, durationSeconds: n } : { reps: n };
}

/** 서버 세트의 횟수 또는 시간(초)입니다. 둘 다 없으면 undefined입니다. */
export function fromServerCount(set: ServerCount): number | undefined {
  const value = set.durationSeconds ?? set.reps;
  return typeof value === 'number' ? value : undefined;
}

/** 화면에 붙이는 단위입니다. 시간 종목은 초, 나머지는 회입니다. */
export const countUnit = (timed: boolean) => (timed ? '초' : '회');
/** 입력 칸 이름입니다. */
export const countName = (timed: boolean) => (timed ? '시간' : '횟수');

/**
 * 기록 목록에 쓰는 세트 한 줄입니다. 시간 종목은 '30초', 나머지는 '60kg × 10회'처럼 씁니다.
 * weightText는 단위(kg·lbs)를 붙여 이미 바꾼 무게 글자입니다.
 */
export function setValueText(timed: boolean, weightText: string, reps: string): string {
  return timed ? `${reps}초` : `${weightText} × ${reps}회`;
}
