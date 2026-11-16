import { StyleSheet } from 'react-native';
import { spacing, radius, colors, typography } from '../../theme/tokens';

/** LocalSaveStatus의 정적 스타일입니다. 웹과 네이티브에서 같은 토큰과 수치를 사용합니다. */
export const s = StyleSheet.create({
  status: { gap: spacing.sm },
  warning: {
    padding: spacing.lg,
    borderRadius: radius.status,
    backgroundColor: colors.dangerSurface,
  },
  title: { ...typography.button, color: colors.danger },
  normal: { ...typography.caption, color: colors.textSecondary },
  description: { ...typography.caption, color: colors.text },
  announcement: { position: 'absolute', width: 1, height: 1, overflow: 'hidden' },
});
