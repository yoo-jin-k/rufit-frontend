import { StyleSheet } from 'react-native';
import { colors } from '../../theme/tokens';

/** HomeScreen의 정적 스타일입니다. 웹과 네이티브에서 같은 토큰과 수치를 사용합니다. */
export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, gap: 24, width: '100%', maxWidth: 640, alignSelf: 'center' },
  brand: { color: colors.primary, fontSize: 22, fontWeight: '800' },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 44,
    marginVertical: 24,
  },
  card: { backgroundColor: colors.surface, padding: 24, borderRadius: 20, gap: 12 },
  cardTitle: { color: colors.text, fontSize: 20, fontWeight: '700' },
  body: { color: colors.muted, fontSize: 16, lineHeight: 26 },
  caption: { color: colors.muted, fontSize: 14 },
});
