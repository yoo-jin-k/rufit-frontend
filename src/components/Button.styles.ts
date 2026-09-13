import { StyleSheet } from 'react-native';
import { colors, radius, spacing, typography, size, interaction } from '../theme/tokens';
// 기존 수치를 보존한 네이티브 스타일. DS-01 시각/로딩 규격은 후속 기능에서 적용한다.
export const buttonStyles = StyleSheet.create({
  button: {minHeight: size.controlMin, padding: spacing.buttonPadding,
    borderRadius: radius.button, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center'},
  secondary: {backgroundColor: colors.primarySoft},
  pressed: {opacity: interaction.pressedOpacity},
  disabled: {opacity: interaction.disabledOpacity},
  text: {...typography.button, color: colors.onPrimary},
  secondaryText: {color: colors.primary},
});
