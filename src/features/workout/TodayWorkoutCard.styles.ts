import { StyleSheet } from 'react-native';
import { tokens } from '../../theme/tokens';

const c = tokens.color;

/** TodayWorkoutCard의 정적 스타일입니다. 웹과 네이티브에서 같은 토큰과 수치를 사용합니다. */
export const s = StyleSheet.create({
  card: {
    backgroundColor: c.bg.surface,
    borderRadius: tokens.radius.xl,
    padding: tokens.space[20],
    gap: 6,
  },
  inverse: { backgroundColor: c.bg.inverse },
  pressed: { opacity: 0.88 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  values: { flexDirection: 'row', alignItems: 'baseline', gap: tokens.space[12], flexWrap: 'wrap' },
});
