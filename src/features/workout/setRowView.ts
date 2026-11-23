import { size } from '../../theme/tokens.ts';
import { validSet, type WorkoutSet } from './model.ts';
// 카드 안에서 실제로 측정한 폭을 사용합니다. 회전할 때 입력/동작 노드는 옮기지 않습니다.
export const stackedSetRow = (width: number, fontScale: number) =>
  width < size.setRowInlineMin || fontScale >= size.largeTextScale;
// 도메인의 검증 규칙을 그대로 사용하며 완료를 누른 뒤에만 필드별 설명을 표시합니다.
// 시간 종목(timed)은 같은 칸에 초를 담으므로 안내 문구만 초 단위로 바꿉니다.
export function setFieldErrors(set: WorkoutSet, timed = false) {
  return {
    weight: validSet({ ...set, reps: '1' })
      ? ''
      : '무게는 0~1500kg, 소수 둘째 자리까지 입력해 주세요.',
    reps: validSet({ ...set, weight: '0' })
      ? ''
      : timed
        ? '시간은 1~1000초로 입력해 주세요.'
        : '횟수는 1~1000회로 입력해 주세요.',
  };
}
