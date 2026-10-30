// 빈 초안을0으로 바꾸지 않습니다. 붙여넣기도 같은 정수·범위 규칙으로 검사합니다.
export function parseRestInput(input: string) {
  if (!/^\d{1,4}$/.test(input) || Number(input) > 3600)
    throw new Error('0~3600초를 입력해 주세요.');
  return Number(input);
}
