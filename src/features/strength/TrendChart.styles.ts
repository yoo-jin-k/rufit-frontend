import { StyleSheet } from 'react-native';
import { tokens } from '../../theme/tokens';

const c = tokens.color;

/** TrendChart의 정적 스타일입니다. 웹과 네이티브에서 같은 토큰과 수치를 사용합니다. */
export const s = StyleSheet.create({
  card: {
    backgroundColor: c.bg.surface,
    borderRadius: tokens.radius.xl,
    padding: tokens.space[16],
    gap: 4,
  },
  hit: { position: 'absolute', width: 44, height: 44 },
  axis: { height: 18 },
  axisLabel: { position: 'absolute', width: 40, textAlign: 'center', color: c.text.muted },
});
