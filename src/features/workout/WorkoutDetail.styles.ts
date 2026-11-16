import { StyleSheet } from 'react-native';
import { tokens } from '../../theme/tokens';

const c = tokens.color;

/** WorkoutDetail의 정적 스타일입니다. 웹과 네이티브에서 같은 토큰과 수치를 사용합니다. */
export const s = StyleSheet.create({
  photo: { width: '100%', aspectRatio: 362 / 200, borderRadius: tokens.radius.xl },
  stats: { flexDirection: 'row', gap: tokens.space[12] },
  stat: { flex: 1, gap: 0 },
  exercise: { gap: tokens.space[8] },
  between: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  setRow: {
    backgroundColor: c.bg.surface,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space[16],
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
  },
});
