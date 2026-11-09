// 단일 스타일 원본입니다. Figma 「Rufit 2.0」 변수 52개와 같은 값이며, 웹 Sass 생성물은 직접 수정하지 않습니다.
// 새 화면은 `tokens`와 `text`를 쓰고, 기존 이름(colors·spacing·radius·typography·size)은 같은 값을 가리키도록 유지합니다.

/** Figma 변수 그대로의 값입니다. 코드 이름은 Figma Dev Mode의 tokens.* 이름과 같습니다. */
export const tokens = {
  color: {
    bg: {
      default: '#FFFFFF',
      surface: '#F5F5F6',
      inverse: '#111113',
      inverseSoft: '#2A2A2E',
      disabled: '#D4D4D8',
      dim: 'rgba(0, 0, 0, 0.4)',
    },
    line: { default: '#EAEAEC', input: '#E4E4E7', strong: '#D4D4D8' },
    text: {
      primary: '#111113',
      secondary: '#6B6B73',
      muted: '#A1A1AA',
      disabled: '#C4C4CC',
      inverse: '#FFFFFF',
    },
    // 포인트 색은 오늘·달성률·로고 점처럼 화면의 10% 이하에만 씁니다.
    accent: { default: '#2F5BFF' },
    danger: { default: '#D92D20', surface: '#FEF3F2' },
    brand: { kakao: '#FEE500', kakaoText: '#191919' },
  },
  space: { 4: 4, 8: 8, 12: 12, 16: 16, 20: 20, 24: 24, 32: 32 },
  radius: { sm: 8, md: 12, lg: 14, xl: 16, '2xl': 24, full: 999 },
  size: {
    buttonLg: 56,
    buttonMd: 48,
    buttonSm: 36,
    input: 52,
    touch: 44,
    navbar: 44,
    tabbar: 49,
    safeTop: 62,
    safeBottom: 34,
    screenPadding: 20,
    icon: 20,
  },
  fontSize: {
    display: 36,
    titleL: 28,
    titleM: 24,
    headline: 17,
    body: 15,
    button: 16,
    callout: 14,
    caption: 13,
    label: 12,
    tab: 11,
  },
} as const;

/** 글자 간격 -1%를 크기별 픽셀 값으로 바꿉니다. Figma 텍스트 스타일과 같은 계산입니다. */
const tracking = (fontSize: number, percent = -1) => (fontSize * percent) / 100;
const style = (fontSize: number, weight: '400' | '500' | '700', lineHeight: number, percent = -1) => ({
  fontSize,
  fontWeight: weight,
  lineHeight: Math.round(fontSize * lineHeight),
  letterSpacing: tracking(fontSize, percent),
});
const f = tokens.fontSize;

/** Figma 텍스트 스타일 14개입니다. 글꼴은 기기 기본 글꼴(iOS는 SF·Apple SD Gothic Neo)을 씁니다. */
export const text = {
  display: style(f.display, '700', 1.2, -2),
  titleL: style(f.titleL, '700', 1.3, -2),
  titleM: style(f.titleM, '700', 1.35, -2),
  headline: style(f.headline, '700', 1.4),
  body: style(f.body, '400', 1.45),
  bodyMedium: style(f.body, '500', 1.45),
  bodyBold: style(f.body, '700', 1.45),
  button: style(f.button, '700', 1.4),
  callout: style(f.callout, '500', 1.45),
  calloutBold: style(f.callout, '700', 1.45),
  caption: style(f.caption, '500', 1.45),
  captionBold: style(f.caption, '700', 1.45),
  label: style(f.label, '500', 1.4),
  tab: style(f.tab, '500', 1.3),
} as const;

const c = tokens.color;
// 기존 화면이 쓰는 이름입니다. 값은 모두 위 Figma 변수를 가리킵니다.
export const colors = {
  background: c.bg.default,
  surface: c.bg.default,
  text: c.text.primary,
  muted: c.text.secondary,
  primary: c.bg.inverse,
  border: c.line.default,
  primarySoft: c.bg.surface,
  onPrimary: c.text.inverse,
  primaryPressed: c.bg.inverseSoft,
  textSecondary: c.text.secondary,
  danger: c.danger.default,
  dangerSurface: c.danger.surface,
  inputBorder: c.line.input,
  focus: c.text.primary,
  disabledText: c.text.inverse,
  disabledSurface: c.bg.disabled,
  accent: c.accent.default,
  placeholder: c.text.muted,
};
export const spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  bottom: 32,
  touch: 48,
};
export const radius = { button: tokens.radius.lg, input: tokens.radius.md, status: tokens.radius.xl, card: tokens.radius.xl };
export const typography = {
  title: { fontSize: f.titleL, lineHeight: 36, fontWeight: '700' },
  timer: { fontSize: f.display, lineHeight: 43, fontWeight: '700' },
  heading: { fontSize: f.headline, lineHeight: 24, fontWeight: '700' },
  body: { fontSize: f.body, lineHeight: 22, fontWeight: '400' },
  button: { fontSize: f.button, lineHeight: 22, fontWeight: '700' },
  caption: { fontSize: f.caption, lineHeight: 19, fontWeight: '400' },
} as const;
export const size = {
  controlMin: 48,
  contentMax: 640,
  mediumWindow: 375,
  wideWindow: 640,
  setRowInlineMin: 316,
  setInputMin: 64,
  borderWidth: 1,
  largeTextScale: 1.3,
  focusWidth: 2,
  focusOffset: 2,
};
