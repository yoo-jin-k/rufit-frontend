import { StyleSheet } from 'react-native';
import { size, tokens, text } from '../../theme/tokens';

const c = tokens.color;

/** Screen의 정적 스타일입니다. 웹과 네이티브에서 같은 토큰과 수치를 사용합니다. */
export const s = StyleSheet.create({
  fill: { flex: 1, minHeight: 0 },
  content: {
    width: '100%',
    maxWidth: size.contentMax,
    alignSelf: 'center',
    paddingHorizontal: tokens.size.screenPadding,
    paddingTop: tokens.space[8],
    paddingBottom: tokens.space[24],
    flexGrow: 1,
  },
  header: {
    width: '100%',
    maxWidth: size.contentMax,
    alignSelf: 'center',
    paddingHorizontal: tokens.size.screenPadding,
  },
  footer: {
    width: '100%',
    maxWidth: size.contentMax,
    alignSelf: 'center',
    paddingHorizontal: tokens.size.screenPadding,
    paddingTop: tokens.space[12],
    paddingBottom: tokens.space[8],
    gap: tokens.space[8],
    backgroundColor: c.bg.default,
  },
  footerRow: { flexDirection: 'row', gap: tokens.space[12], alignItems: 'stretch' },
  iconButton: {
    width: tokens.size.touch,
    height: tokens.size.touch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: c.accent.default,
  },
  navbar: {
    height: tokens.size.navbar,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: -12,
  },
  navSide: { width: 88, flexDirection: 'row', alignItems: 'center' },
  navTrailing: { justifyContent: 'flex-end', paddingRight: 4 },
  navTitle: { ...text.headline, color: c.text.primary, flex: 1, textAlign: 'center' },
  navText: { minHeight: tokens.size.touch, justifyContent: 'center', paddingHorizontal: 8 },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: tokens.space[8],
    paddingBottom: tokens.space[8],
    gap: tokens.space[8],
  },
  pageTitles: { flexShrink: 1, gap: 2 },
  pageActions: { flexDirection: 'row', alignItems: 'center', marginRight: -12 },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.space[8],
  },
});
