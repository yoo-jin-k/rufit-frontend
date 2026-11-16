import { StyleSheet } from 'react-native';
import { colors } from '../../theme/tokens';

/** TestUserProfile의 정적 스타일입니다. 웹과 네이티브에서 같은 토큰과 수치를 사용합니다. */
export const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  frame: { flex: 1, width: '100%', maxWidth: 640, alignSelf: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  icon: { width: 40, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, gap: 16, paddingBottom: 32 },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heading: { color: colors.text, fontSize: 15, lineHeight: 22, fontWeight: '700' },
  body: { color: colors.text, fontSize: 13, lineHeight: 21 },
  muted: { color: colors.muted, fontSize: 11, lineHeight: 18 },
  record: { padding: 16, borderRadius: 12, backgroundColor: colors.primarySoft, gap: 6 },
});
