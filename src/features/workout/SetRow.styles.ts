import {StyleSheet} from 'react-native';
import {colors, radius, spacing, typography, size} from '../../theme/tokens';
export const setRowStyles = StyleSheet.create({
  row: {gap: spacing.md}, label: {...typography.caption, color: colors.textSecondary},
  controls: {flexDirection: 'row', gap: spacing.xs, alignItems: 'flex-start'}, stacked: {flexDirection: 'column', gap: spacing.md},
  inputs: {flexGrow: 1, flexShrink: 1, flexBasis: 0, flexDirection: 'row', gap: spacing.sm, minWidth: 0}, inputsStacked: {flexGrow: 0, flexShrink: 0, flexBasis: 'auto', width: '100%'},
  field: {flex: 1, minWidth: size.setInputMin, gap: spacing.xs},
  input: {...typography.body, color: colors.text, textAlign: 'center', borderWidth: size.borderWidth,
    borderColor: colors.inputBorder, borderRadius: radius.input, minHeight: size.controlMin, padding: spacing.md, backgroundColor: colors.surface},
  focus: {outlineColor: colors.focus, outlineWidth: size.focusWidth, outlineOffset: size.focusOffset, outlineStyle: 'solid',
    borderColor: colors.focus, borderWidth: size.focusWidth, padding: spacing.md - (size.focusWidth - size.borderWidth)},
  invalid: {borderColor: colors.danger}, error: {...typography.caption, color: colors.danger},
  actions: {flexDirection: 'row', gap: spacing.xs, width: size.controlMin * 3 + spacing.xs * 2},
  actionsStacked: {width: '100%', gap: spacing.sm}, action: {flex: 1, minWidth: size.controlMin},
});
