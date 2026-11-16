import { StyleSheet } from 'react-native';
import { tokens } from '../../theme/tokens';

const c = tokens.color;

/** StrengthScreen의 정적 스타일입니다. 웹과 네이티브에서 같은 토큰과 수치를 사용합니다. */
export const s = StyleSheet.create({
  sum: {
    backgroundColor: c.bg.surface,
    borderRadius: tokens.radius.md,
    padding: tokens.space[16],
    flexDirection: 'row',
    alignItems: 'center',
  },
  headline: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[12], minHeight: 52 },
  rowLine: { borderTopWidth: 1, borderColor: c.line.default },
});
