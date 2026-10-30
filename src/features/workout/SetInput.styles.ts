import { StyleSheet } from 'react-native';
import { colors, radius, spacing, typography, size } from '../../theme/tokens';
// 세트와 휴식 설정이 같은 입력 크기·포커스·오류 표시를 사용합니다.
export const setInputStyles = StyleSheet.create({
  input: {
    ...typography.body,
    color: colors.text,
    textAlign: 'center',
    borderWidth: size.borderWidth,
    borderColor: colors.inputBorder,
    borderRadius: radius.input,
    minHeight: size.controlMin,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  focus: {
    outlineColor: colors.focus,
    outlineWidth: size.focusWidth,
    outlineOffset: size.focusOffset,
    outlineStyle: 'solid',
    borderColor: colors.focus,
    borderWidth: size.focusWidth,
    padding: spacing.md - (size.focusWidth - size.borderWidth),
  },
  invalid: { borderColor: colors.danger },
  error: { ...typography.caption, color: colors.danger },
});
