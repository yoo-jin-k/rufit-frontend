import { StyleSheet } from 'react-native';
import { size, text, tokens } from '../theme/tokens';
const c = tokens.color;
/** 기존 화면 틀의 공통 스타일입니다. 새 화면과 같은 디자인 토큰을 사용합니다. */
export const ui = StyleSheet.create({
  page: { flex: 1, backgroundColor: c.bg.default },
  content: {
    width: '100%',
    maxWidth: size.contentMax,
    alignSelf: 'center',
    paddingHorizontal: tokens.size.screenPadding,
    paddingTop: tokens.space[8],
    paddingBottom: tokens.space[24],
    gap: tokens.space[16],
    flexGrow: 1,
  },
  title: { ...text.titleL, color: c.text.primary },
  heading: { ...text.headline, color: c.text.primary },
  body: { ...text.body, color: c.text.primary },
  muted: { ...text.caption, color: c.text.secondary },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[12] },
  between: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.space[8],
    flexWrap: 'wrap',
  },
  card: {
    backgroundColor: c.bg.surface,
    borderRadius: tokens.radius.xl,
    padding: tokens.space[16],
    gap: tokens.space[12],
  },
  input: {
    ...text.bodyMedium,
    borderWidth: 1,
    borderColor: c.line.input,
    borderRadius: tokens.radius.md,
    minHeight: tokens.size.input,
    paddingHorizontal: tokens.space[16],
    paddingVertical: 12,
    color: c.text.primary,
    backgroundColor: c.bg.default,
  },
  dock: {
    width: '100%',
    maxWidth: size.contentMax,
    alignSelf: 'center',
    paddingHorizontal: tokens.size.screenPadding,
    paddingVertical: tokens.space[12],
    gap: tokens.space[8],
    backgroundColor: c.bg.default,
  },
  error: { ...text.caption, color: c.danger.default },
  line: { height: 1, backgroundColor: c.line.default },
});
