import { StyleSheet } from 'react-native';
import { tokens } from '../../theme/tokens';

const c = tokens.color;

/** RestTimerDock의 정적 스타일입니다. 웹과 네이티브에서 같은 토큰과 수치를 사용합니다. */
export const s = StyleSheet.create({
  bar: {
    backgroundColor: c.bg.inverse,
    borderRadius: tokens.radius.xl,
    paddingTop: 14,
    paddingBottom: tokens.space[12],
    paddingHorizontal: tokens.space[16],
    gap: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[12] },
  time: { flex: 1, minWidth: 0 },
  digits: { fontVariant: ['tabular-nums'] },
  pill: {
    minHeight: 36,
    paddingHorizontal: tokens.space[12],
    borderRadius: tokens.radius.sm,
    backgroundColor: c.bg.inverseSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: { height: 3, borderRadius: 2, backgroundColor: c.bg.inverseSoft, overflow: 'hidden' },
  fill: { height: 3, backgroundColor: c.accent.default },
});
