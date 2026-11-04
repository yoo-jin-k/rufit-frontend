import {StyleSheet} from 'react-native';
import {colors, radius, spacing, typography, size} from '../theme/tokens';
// 네이티브는 같은 토큰을 StyleSheet로 읽는다. 높이는 최소값만 두어 큰 글자가 잘리지 않게 한다.
export const buttonStyles = StyleSheet.create({
  button: {minHeight: size.controlMin, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderRadius: radius.button, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', width: '100%', minWidth: 0},
  compact: {paddingHorizontal: spacing.xs},
  secondary: {backgroundColor: colors.primarySoft},
  pressed: {backgroundColor: colors.primaryPressed},
  secondaryPressed: {backgroundColor: colors.border},
  disabled: {backgroundColor: colors.disabledSurface},
  text: {...typography.button, color: colors.onPrimary, textAlign: 'center', flexShrink: 1, minWidth: 0},
  secondaryText: {color: colors.primary},
  disabledText: {color: colors.disabledText},
  content: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, width: '100%'},
});
