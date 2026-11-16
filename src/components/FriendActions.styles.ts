import { tokens, text } from '../theme/tokens';
import { StyleSheet } from 'react-native';

/** FriendActions의 정적 스타일입니다. 웹과 네이티브에서 같은 토큰과 수치를 사용합니다. */
export const s = StyleSheet.create({
  more: { width: 32, height: 44, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: tokens.color.bg.dim },
  sheet: {
    width: '100%',
    maxWidth: 640,
    maxHeight: '90%',
    alignSelf: 'center',
    backgroundColor: tokens.color.bg.default,
    borderTopLeftRadius: tokens.radius['2xl'],
    borderTopRightRadius: tokens.radius['2xl'],
  },
  content: { padding: 20, gap: 14 },
  footer: { padding: 20, paddingTop: 8 },
  heading: { ...text.titleM, color: tokens.color.text.primary },
  body: { ...text.body, color: tokens.color.text.primary },
  muted: { ...text.caption, color: tokens.color.text.secondary },
  error: { color: tokens.color.danger.default },
  reason: { minHeight: 44, justifyContent: 'center' },
});
