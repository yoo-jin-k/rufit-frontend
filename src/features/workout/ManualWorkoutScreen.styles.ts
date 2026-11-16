import { StyleSheet } from 'react-native';
import { tokens } from '../../theme/tokens';

/** ManualWorkoutScreen의 정적 스타일입니다. 웹과 네이티브에서 같은 토큰과 수치를 사용합니다. */
export const ms = StyleSheet.create({
  exercise: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[12], minHeight: 68 },
  dots: { width: 32, height: 44, alignItems: 'center', justifyContent: 'center' },
});
