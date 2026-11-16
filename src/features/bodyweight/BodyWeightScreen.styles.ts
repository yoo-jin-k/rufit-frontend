import { StyleSheet } from 'react-native';
import { tokens } from '../../theme/tokens';

const c = tokens.color;

/** BodyWeightScreen의 정적 스타일입니다. 웹과 네이티브에서 같은 토큰과 수치를 사용합니다. */
export const s = StyleSheet.create({
  big: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 4,
    paddingTop: tokens.space[24],
  },
  bigInput: { color: c.text.primary, textAlign: 'center', padding: 0, outlineWidth: 0 } as object,
  headline: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[8], minHeight: 52 },
  rowLine: { borderTopWidth: 1, borderColor: c.line.default },
  diff: { color: c.text.muted, width: 40, textAlign: 'right' },
});
