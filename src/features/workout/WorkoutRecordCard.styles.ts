import { StyleSheet } from 'react-native';
import { tokens } from '../../theme/tokens';

const c = tokens.color;

/** WorkoutRecordCard의 정적 스타일입니다. 웹과 네이티브에서 같은 토큰과 수치를 사용합니다. */
export const s = StyleSheet.create({
  card: {
    backgroundColor: c.bg.surface,
    borderRadius: tokens.radius.xl,
    padding: tokens.space[16],
    gap: tokens.space[12],
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  titles: { flex: 1, gap: 2 },
  icon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginTop: -4 },
  exercise: { gap: 4 },
  exerciseHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  setLine: { flexDirection: 'row', gap: 12 },
  setIndex: { color: c.text.muted, width: 8 },
  memo: { gap: 6, borderTopWidth: 1, borderColor: c.line.default, paddingTop: tokens.space[12] },
});
