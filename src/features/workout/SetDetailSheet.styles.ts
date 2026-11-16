import { StyleSheet } from 'react-native';
import { tokens } from '../../theme/tokens';

const c = tokens.color;

/** SetDetailSheet의 정적 스타일입니다. 웹과 네이티브에서 같은 토큰과 수치를 사용합니다. */
export const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[8] },
  type: {
    flexBasis: '48%',
    flexGrow: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[8],
    paddingHorizontal: tokens.space[16],
    borderRadius: tokens.radius.md,
    backgroundColor: c.bg.surface,
  },
  typeOn: { backgroundColor: c.bg.inverse },
  scale: { flexDirection: 'row', justifyContent: 'space-between' },
  rpeRow: { flexDirection: 'row', gap: tokens.space[8] },
  rpe: {
    flex: 1,
    minHeight: 44,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  rpeOn: { borderColor: c.text.primary },
});
