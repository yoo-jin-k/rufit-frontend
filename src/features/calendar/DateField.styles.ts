import { StyleSheet } from 'react-native';
import { tokens } from '../../theme/tokens';

const c = tokens.color;

/** DateField의 정적 스타일입니다. 웹과 네이티브에서 같은 토큰과 수치를 사용합니다. */
export const s = StyleSheet.create({
  field: { gap: tokens.space[8] },
  box: {
    minHeight: tokens.size.input,
    borderWidth: 1,
    borderColor: c.line.input,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space[16],
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[12],
    backgroundColor: c.bg.default,
  },
  boxOpen: { borderColor: c.text.primary },
  head: { flexDirection: 'row', alignItems: 'center' },
  arrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
