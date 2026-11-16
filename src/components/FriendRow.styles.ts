import { StyleSheet } from 'react-native';
import { tokens, text } from '../theme/tokens';

/** FriendRow의 정적 스타일입니다. 웹과 네이티브에서 같은 토큰과 수치를 사용합니다. */
export const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[8], minHeight: 64 },
  identity: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[12],
    minHeight: 44,
  },
  name: { ...text.bodyBold, color: tokens.color.text.primary },
  status: { ...text.label, color: tokens.color.text.secondary },
  buttons: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[8], flexShrink: 0 },
});
