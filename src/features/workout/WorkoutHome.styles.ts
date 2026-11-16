import { StyleSheet } from 'react-native';
import { tokens } from '../../theme/tokens';

const c = tokens.color;

/** WorkoutHome의 정적 스타일입니다. 웹과 네이티브에서 같은 토큰과 수치를 사용합니다. */
export const s = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: tokens.space[12] },
  tile: {
    flex: 1,
    backgroundColor: c.bg.surface,
    borderRadius: tokens.radius.xl,
    padding: tokens.space[16],
    gap: tokens.space[8],
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 22,
    maxWidth: 140,
  },
  bar: { width: 12, height: 3, borderRadius: 3, backgroundColor: c.line.default },
});
