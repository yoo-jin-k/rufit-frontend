import { StyleSheet } from 'react-native';
import { tokens } from '../../theme/tokens';

/** ExerciseMedia의 정적 스타일입니다. 웹과 네이티브에서 같은 토큰과 수치를 사용합니다. */
export const s = StyleSheet.create({
  picture: {
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.color.line.input,
    overflow: 'hidden',
  },
  expanded: { width: '100%', aspectRatio: 362 / 200, borderRadius: tokens.radius.xl },
  // 구매한 GIF의 흰 배경과 이어지도록 회색 대신 흰색을 깔아 줍니다.
  animation: { backgroundColor: tokens.color.bg.default },
  fill: { width: '100%', height: '100%' },
  // 목록 칸을 반으로 나눠 사진 위·아래(또는 좌·우) 가장자리 색을 깔아 줍니다.
  edge: { flex: 1 },
  fallback: {
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.color.line.input,
  },
});
