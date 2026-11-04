import {size, spacing} from '../../theme/tokens.ts';

// 기종명이 아니라 safe area를 뺀 실제 창으로 배치를 결정한다. 이 계산은 운동/저장 상태를 변경하지 않는다.
export function workoutViewport(width: number, leftInset: number, rightInset: number, fontScale: number) {
  const available = Math.max(0, width - leftInset - rightInset);
  return {
    contentPadding: available < size.mediumWindow ? spacing.lg : available < size.wideWindow ? spacing.xl : spacing.xxl,
    stackRestActions: fontScale >= size.largeTextScale,
  };
}
// 표시와 경계 버튼을 같은 초 단위로 맞춘다. 실제 저장 계산은 localRest의 절대시각을 사용한다.
export function restTimerView(endsAt: number, now: number) {
  const seconds = Math.max(0, Math.ceil((endsAt - now) / 1000));
  return {seconds, phase: seconds === 0 ? 'expired' as const : 'active' as const,
    canSubtract: seconds > 0, canAdd: seconds < 3600};
}
// 긴 시간은 글자를 줄이지 않고 콜론 뒤에서 줄바꿈할 수 있다. 접근성 이름은 원래 문자열을 쓴다.
export const wrappableTime = (label: string) => label.replace(/:/g, ':\u200B');
