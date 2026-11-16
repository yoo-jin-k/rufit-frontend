import { StyleSheet } from 'react-native';
import { tokens, text } from '../../theme/tokens';

/** WorkoutFriends의 정적 스타일입니다. 웹과 네이티브에서 같은 토큰과 수치를 사용합니다. */
export const s = StyleSheet.create({
  card: { gap: tokens.space[12] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  title: { ...text.bodyBold, color: tokens.color.text.primary },
  muted: { ...text.label, color: tokens.color.text.secondary },
  name: { ...text.callout, color: tokens.color.text.primary, flexShrink: 1 },
  member: {
    width: 160,
    backgroundColor: tokens.color.bg.surface,
    borderRadius: tokens.radius.xl,
    padding: tokens.space[12],
    gap: 4,
  },
  avatar: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  cheer: {
    minHeight: 36,
    paddingHorizontal: 4,
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  empty: {
    backgroundColor: tokens.color.bg.surface,
    borderRadius: tokens.radius.xl,
    padding: tokens.space[16],
    gap: 2,
  },
  overlay: { flex: 1, backgroundColor: tokens.color.bg.dim, justifyContent: 'flex-end' },
  sheet: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    maxHeight: '85%',
    backgroundColor: tokens.color.bg.default,
    borderTopLeftRadius: tokens.radius['2xl'],
    borderTopRightRadius: tokens.radius['2xl'],
    padding: 20,
    gap: 16,
  },
});
