import { StyleSheet } from 'react-native';
import { tokens, size, text } from '../theme/tokens';

/** BottomNavigation의 정적 스타일입니다. 웹과 네이티브에서 같은 토큰과 수치를 사용합니다. */
export const s = StyleSheet.create({
  border: {
    borderTopWidth: 1,
    borderColor: tokens.color.line.default,
    backgroundColor: tokens.color.bg.default,
  },
  bar: { flexDirection: 'row', width: '100%', maxWidth: size.contentMax, alignSelf: 'center' },
  item: {
    flex: 1,
    minHeight: tokens.size.tabbar,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingTop: 6,
  },
  label: { ...text.tab, color: tokens.color.text.muted },
  active: { fontWeight: '700', color: tokens.color.text.primary },
});
