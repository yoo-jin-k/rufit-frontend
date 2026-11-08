import { StyleSheet } from 'react-native';
import { text, tokens } from '../theme/tokens';

const c = tokens.color;
// Figma Button 컴포넌트(종류 8 × 크기 3)와 같은 값입니다. 높이는 최소값으로 두어 큰 글자에서도 잘리지 않습니다.
export const buttonStyles = StyleSheet.create({
  button: {
    minHeight: tokens.size.buttonLg,
    paddingHorizontal: tokens.space[20],
    paddingVertical: tokens.space[8],
    borderRadius: tokens.radius.lg,
    backgroundColor: c.bg.inverse,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 0,
  },
  fullWidth: { width: '100%' },
  md: { minHeight: tokens.size.buttonMd, borderRadius: tokens.radius.md, paddingHorizontal: tokens.space[16] },
  sm: { minHeight: tokens.size.buttonSm, borderRadius: tokens.radius.md, paddingHorizontal: tokens.space[12] },
  compact: { paddingHorizontal: tokens.space[4] },
  secondary: { backgroundColor: c.bg.default, borderWidth: 1, borderColor: c.line.input },
  soft: { backgroundColor: c.bg.surface },
  danger: { backgroundColor: c.danger.default },
  kakao: { backgroundColor: c.brand.kakao },
  apple: { backgroundColor: c.bg.inverse },
  google: { backgroundColor: c.bg.default, borderWidth: 1, borderColor: c.line.input },
  pressed: { backgroundColor: c.bg.inverseSoft },
  lightPressed: { backgroundColor: c.line.default },
  disabled: { backgroundColor: c.bg.disabled, borderWidth: 0 },
  text: { ...text.button, color: c.text.inverse, textAlign: 'center', flexShrink: 1, minWidth: 0 },
  mdText: text.calloutBold,
  smText: text.captionBold,
  darkText: { color: c.text.primary },
  kakaoText: { color: c.brand.kakaoText },
  disabledText: { color: c.text.inverse },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space[8],
    maxWidth: '100%',
  },
});
