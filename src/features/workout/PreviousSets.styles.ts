import { StyleSheet } from 'react-native';
import { tokens } from '../../theme/tokens';

const c = tokens.color;

/** PreviousSets의 정적 스타일입니다. 웹과 네이티브에서 같은 토큰과 수치를 사용합니다. */
export const s = StyleSheet.create({
  item: {
    backgroundColor: c.bg.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
    padding: tokens.space[16],
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[12],
  },
  itemOn: { backgroundColor: c.bg.default, borderColor: c.text.primary },
});
