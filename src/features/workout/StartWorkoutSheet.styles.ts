import { StyleSheet } from 'react-native';
import { tokens } from '../../theme/tokens';

const c = tokens.color;

/** StartWorkoutSheet의 정적 스타일입니다. 웹과 네이티브에서 같은 토큰과 수치를 사용합니다. */
export const s = StyleSheet.create({
  cards: { gap: tokens.space[8] },
  card: {
    minWidth: 108,
    paddingHorizontal: tokens.space[16],
    paddingVertical: tokens.space[12],
    borderRadius: tokens.radius.md,
    backgroundColor: c.bg.surface,
    gap: 2,
  },
  cardOn: { backgroundColor: c.bg.inverse },
  rows: { maxHeight: 280 },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[12] },
  actions: { flexDirection: 'row', gap: tokens.space[8] },
  action: { flex: 1 },
});
