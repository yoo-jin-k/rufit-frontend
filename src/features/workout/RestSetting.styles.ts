import { StyleSheet } from 'react-native';
import { spacing, typography, colors } from '../../theme/tokens';

/** RestSetting의 정적 스타일입니다. 웹과 네이티브에서 같은 토큰과 수치를 사용합니다. */
export const s = StyleSheet.create({
  section: { gap: spacing.sm },
  label: { ...typography.body, color: colors.text },
  description: { ...typography.caption, color: colors.textSecondary },
});
