import { StyleSheet } from 'react-native';
import { colors, text } from '../theme/tokens';

/** NotificationButton의 정적 스타일입니다. 웹과 네이티브에서 같은 토큰과 수치를 사용합니다. */
export const s = StyleSheet.create({
  likeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  unread: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  trigger: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  dot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.accent,
    borderWidth: 1,
    borderColor: colors.surface,
  },
  page: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, width: '100%', maxWidth: 640, alignSelf: 'center', padding: 20, gap: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...text.titleL, color: colors.text, flexShrink: 0 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  footer: { paddingTop: 8 },
  body: { ...text.bodyMedium, color: colors.text },
  muted: { ...text.label, color: colors.muted },
  error: { color: colors.danger },
  card: { backgroundColor: colors.primarySoft, padding: 16, borderRadius: 16, gap: 12 },
  actions: { flexDirection: 'row', gap: 10 },
});
