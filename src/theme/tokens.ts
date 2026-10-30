// 단일 스타일 원본. DS-01 v1 값이며 웹 Sass 생성물은 직접 수정하지 않습니다.
export const colors = {
  background: '#F5F6F8',
  surface: '#FFFFFF',
  text: '#18232B',
  muted: '#697880',
  primary: '#246B53',
  border: '#E2E8E5',
  primarySoft: '#E7F0EB',
  onPrimary: '#FFFFFF',
  primaryPressed: '#1B513F',
  textSecondary: '#52636B',
  danger: '#B42318',
  dangerSurface: '#FEF3F2',
  inputBorder: '#78888F',
  focus: '#246B53',
  disabledText: '#697880',
  disabledSurface: '#E9EDEF',
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
export const radius = { button: 14, input: 12, status: 16, card: 20 };
export const typography = {
  title: { fontSize: 24, lineHeight: 32, fontWeight: '700' },
  timer: { fontSize: 32, lineHeight: 40, fontWeight: '700' },
  heading: { fontSize: 18, lineHeight: 26, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  button: { fontSize: 16, lineHeight: 24, fontWeight: '700' },
  caption: { fontSize: 14, lineHeight: 22, fontWeight: '400' },
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
