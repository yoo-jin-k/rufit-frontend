import { StyleSheet } from 'react-native';
import { colors, radius, spacing, typography, size } from '../../theme/tokens';
export const timerStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.md,
    borderRadius: radius.card,
  },
  phase: { ...typography.caption, color: colors.primary },
  time: { ...typography.timer, color: colors.text, fontVariant: ['tabular-nums'], flexShrink: 1 },
  heading: { ...typography.heading, color: colors.text },
  description: { ...typography.caption, color: colors.textSecondary },
  adjustments: { flexDirection: 'row', gap: spacing.sm },
  stacked: { flexDirection: 'column' },
  action: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 },
  stackedAction: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto' },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.bottom,
    maxWidth: size.contentMax,
    width: '100%',
    alignSelf: 'center',
  },
});
