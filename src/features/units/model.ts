/**
 * 무게 단위(kg·lb) 변환입니다. 기록은 언제나 kg 문자열로 저장하고 화면에서만 단위를 바꿉니다.
 * lb로 입력한 값은 kg 소수 둘째 자리로 저장하고, 다시 lb로 보여 줄 때 소수 첫째 자리로 반올림해
 * 입력한 숫자가 그대로 보이게 합니다(예: 45lb → 20.41kg → 45lb).
 */
import type { WeightUnit } from '../../api/client.ts';

export const KG_PER_LB = 0.45359237;
export const unitLabel = (unit: WeightUnit) => (unit === 'LB' ? 'lbs' : 'kg');

const round = (value: number, digits: number) => {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
};

/** 저장된 kg 문자열을 화면 단위로 바꿉니다. 비었거나 숫자가 아니면 그대로 둡니다. */
export function displayWeight(kg: string, unit: WeightUnit): string {
  if (unit === 'KG' || kg.trim() === '' || !Number.isFinite(Number(kg))) return kg;
  return String(round(Number(kg) / KG_PER_LB, 1));
}

/** 화면 단위로 입력한 값을 저장할 kg 문자열로 바꿉니다. 잘못된 입력은 검사에서 걸리도록 그대로 둡니다. */
export function toKg(input: string, unit: WeightUnit): string {
  // 입력 중인 '45.'처럼 끝이 점인 값도 숫자로 봅니다.
  if (unit === 'KG' || input.trim() === '' || !/^\d+(\.\d*)?$/.test(input.trim())) return input;
  return String(round(Number(input) * KG_PER_LB, 2));
}

/** 다른 단위로 바꾼 참고값입니다(예: 5kg → "= 11 lbs"). */
export function otherUnitHint(kg: string, unit: WeightUnit): string {
  if (kg.trim() === '' || !Number.isFinite(Number(kg))) return '';
  return unit === 'KG'
    ? `= ${round(Number(kg) / KG_PER_LB, 1)} lbs`
    : `= ${round(Number(kg), 2)} kg`;
}

/** 무게와 단위를 함께 씁니다(예: 60kg, 132.3lbs). */
export function formatWeight(kg: string, unit: WeightUnit): string {
  return `${displayWeight(kg, unit)}${unitLabel(unit)}`;
}

/** 화면 단위로 delta만큼 더하거나 뺀 kg 문자열입니다. 0~1500kg 안에 둡니다. */
export function stepWeightIn(kg: string, delta: number, unit: WeightUnit): string {
  const shown = Number(displayWeight(kg, unit)) || 0;
  const next = Math.max(0, shown + delta);
  const asKg = unit === 'LB' ? next * KG_PER_LB : next;
  return String(round(Math.min(1500, asKg), 2));
}

/** 총 볼륨(무게×횟수 합, kg)을 고른 단위의 숫자 문자열로 씁니다(예: 2,264). 단위 글자는 붙이지 않습니다. */
export function volumeNumber(kg: number, unit: WeightUnit): string {
  const value = unit === 'LB' ? kg / KG_PER_LB : kg;
  return Math.round(value).toLocaleString('ko-KR');
}

/** 증감 버튼 크기입니다. kg는 0.5·5, lb는 1·5입니다. */
export const weightSteps = (unit: WeightUnit): [number, number] => (unit === 'LB' ? [1, 5] : [0.5, 5]);
