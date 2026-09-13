import {size} from '../../theme/tokens.ts';
import {validSet, type WorkoutSet} from './model.ts';
// 카드 안에서 실제로 측정한 폭을 사용한다. 회전할 때 입력/동작 노드는 옮기지 않는다.
export const stackedSetRow = (width: number, fontScale: number) => width < size.setRowInlineMin || fontScale >= size.largeTextScale;
// 도메인의 검증 규칙을 그대로 사용하며 완료를 누른 뒤에만 필드별 설명을 표시한다.
export function setFieldErrors(set: WorkoutSet) {
  return {
    weight: validSet({...set, reps: '1'}) ? '' : '무게는 0~1500kg, 소수 둘째 자리까지 입력해 주세요.',
    reps: validSet({...set, weight: '0'}) ? '' : '횟수는 1~1000회로 입력해 주세요.',
  };
}
