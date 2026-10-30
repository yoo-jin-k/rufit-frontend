// 단일 스타일 원본. DS-01 v1 값이며 웹 Sass 생성물은 직접 수정하지 않습니다.
export const colors = {
  background: '#FFFFFF',
  surface: '#FFFFFF',
  text: '#111113',
  muted: '#777780',
  primary: '#111113',
  border: '#E7E7EC',
  primarySoft: '#F5F5F7',
  onPrimary: '#FFFFFF',
  primaryPressed: '#303034',
  textSecondary: '#71717C',
  danger: '#B42318',
  dangerSurface: '#FEF3F2',
  inputBorder: '#DCDCE2',
  focus: '#111113',
  disabledText: '#777780',
  disabledSurface: '#F0F0F3',
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
export const radius = { button: 12, input: 12, status: 16, card: 18 };
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
