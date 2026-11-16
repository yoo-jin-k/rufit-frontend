import { StyleSheet } from 'react-native';
import { tokens } from '../../theme/tokens';

const c = tokens.color;

/** RestTimerSheet의 정적 스타일입니다. 웹과 네이티브에서 같은 토큰과 수치를 사용합니다. */
export const s = StyleSheet.create({
  stepper: {
    backgroundColor: c.bg.surface,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space[12],
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[8],
  },
  stepButton: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    borderColor: c.line.input,
    backgroundColor: c.bg.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: {
    minWidth: 52,
    textAlign: 'center',
    color: c.text.primary,
    fontVariant: ['tabular-nums'],
  },
  links: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: tokens.space[24],
    paddingBottom: tokens.space[8],
  },
  link: { color: c.text.secondary, textDecorationLine: 'underline' },
});
