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
  // 한 줄 입력칸은 줄 높이를 두지 않고 높이를 고정합니다. iOS에서 줄 높이가 있으면
  // 입력한 글자가 안내 글자(placeholder)보다 아래에 그려져, 입력을 시작할 때 글자가 위아래로 움직입니다.
  input: {
    ...text.bodyMedium,
    lineHeight: undefined,
    borderWidth: 1,
    borderColor: c.line.input,
    borderRadius: tokens.radius.md,
    height: tokens.size.input,
    paddingHorizontal: tokens.space[16],
    paddingVertical: 0,
    color: c.text.primary,
    backgroundColor: c.bg.default,
  },
  /** 여러 줄 입력칸은 줄 사이가 붙지 않게 줄 높이를 되살리고 내용만큼 늘어납니다. */
  inputMultiline: {
    lineHeight: text.bodyMedium.lineHeight,
    height: undefined,
    minHeight: tokens.size.input,
    paddingVertical: 12,
    textAlignVertical: 'top',
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
