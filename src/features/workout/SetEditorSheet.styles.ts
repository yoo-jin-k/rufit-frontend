import { StyleSheet } from 'react-native';
import { tokens } from '../../theme/tokens';

const c = tokens.color;

/** SetEditorSheet의 정적 스타일입니다. 웹과 네이티브에서 같은 토큰과 수치를 사용합니다. */
export const s = StyleSheet.create({
  fields: { flexDirection: 'row', gap: tokens.space[16] },
  field: { flex: 1, gap: tokens.space[8] },
  unitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space[8],
    minHeight: 28,
  },
  unitToggle: {
    flexDirection: 'row',
    borderRadius: tokens.radius.sm,
    backgroundColor: c.bg.surface,
    padding: 2,
  },
  unitOption: { paddingHorizontal: tokens.space[8], paddingVertical: 2, borderRadius: 6 },
  unitOptionOn: { backgroundColor: c.bg.default },
  hint: { color: c.text.muted, textAlign: 'center', minHeight: 18 },
  value: {
    color: c.text.primary,
    textAlign: 'center',
    paddingVertical: tokens.space[4],
    borderBottomWidth: 1,
    borderBottomColor: c.line.input,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    borderRadius: tokens.radius.full,
    backgroundColor: c.bg.surface,
  },
  stepButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[8] },
  chipLabel: { color: c.text.secondary, width: 28 },
  chip: {
    paddingHorizontal: tokens.space[12],
    minHeight: 32,
    justifyContent: 'center',
    borderRadius: tokens.radius.full,
    backgroundColor: c.bg.surface,
  },
  more: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 2 },
  history: {
    backgroundColor: c.bg.surface,
    borderRadius: tokens.radius.md,
    padding: tokens.space[16],
    gap: tokens.space[12],
  },
  historyHead: { flexDirection: 'row', alignItems: 'center' },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[12],
    minHeight: 40,
    borderRadius: tokens.radius.sm,
    paddingHorizontal: tokens.space[4],
  },
  historyIndex: { width: 20, color: c.text.muted },
  historyValue: { flex: 1, color: c.text.primary },
  actions: { flexDirection: 'row', gap: tokens.space[8] },
  action: { flex: 1 },
});
