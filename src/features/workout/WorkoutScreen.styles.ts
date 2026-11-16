import { tokens, text } from '../../theme/tokens';
import { StyleSheet } from 'react-native';

/** WorkoutScreen의 정적 스타일입니다. 웹과 네이티브에서 같은 토큰과 수치를 사용합니다. */
export const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: tokens.color.bg.default },
  error: { ...text.caption, color: tokens.color.danger.default },
  dock: {
    paddingHorizontal: tokens.size.screenPadding,
    paddingVertical: tokens.space[8],
    backgroundColor: tokens.color.bg.default,
  },
});
