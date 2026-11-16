import { StyleSheet } from 'react-native';
import { tokens } from '../../theme/tokens';

const c = tokens.color;

/** ExerciseDetail의 정적 스타일입니다. 웹과 네이티브에서 같은 토큰과 수치를 사용합니다. */
export const s = StyleSheet.create({
  tags: { flexDirection: 'row', gap: tokens.space[8], flexWrap: 'wrap' },
  tag: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    borderColor: c.line.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  records: { flexDirection: 'row', gap: tokens.space[12] },
  list: { gap: tokens.space[8] },
  item: { flexDirection: 'row', gap: tokens.space[8] },
  marker: { width: 16, textAlign: 'center' },
  itemText: { flex: 1 },
  record: {
    flex: 1,
    backgroundColor: c.bg.surface,
    borderRadius: tokens.radius.xl,
    padding: tokens.space[16],
    gap: 4,
  },
});
