import { StyleSheet } from 'react-native';
import { tokens } from '../../theme/tokens';

const c = tokens.color;

/** WelcomeScreen의 정적 스타일입니다. 웹과 네이티브에서 같은 토큰과 수치를 사용합니다. */
export const s = StyleSheet.create({
  hero: { gap: tokens.space[12], paddingTop: tokens.space[32] },
  card: {
    backgroundColor: c.bg.surface,
    borderRadius: tokens.radius.xl,
    padding: tokens.space[16],
    gap: tokens.space[12],
    marginTop: tokens.space[16],
  },
  cardHead: { flexDirection: 'row', alignItems: 'center' },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center', gap: 6 },
  circle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  done: { backgroundColor: c.bg.inverse },
  plain: { backgroundColor: c.bg.default, borderWidth: 1, borderColor: c.line.input },
  links: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: tokens.space[12],
    minHeight: 36,
  },
  link: { color: c.text.secondary, textDecorationLine: 'underline' },
});
