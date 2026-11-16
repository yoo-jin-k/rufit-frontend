import { StyleSheet } from 'react-native';
import { tokens } from '../../theme/tokens';

const c = tokens.color;

/** ProfileScreen의 정적 스타일입니다. 웹과 네이티브에서 같은 토큰과 수치를 사용합니다. */
export const ps = StyleSheet.create({
  me: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[16] },
  stats: { flexDirection: 'row', gap: tokens.space[20] },
  stat: { flexDirection: 'row', alignItems: 'baseline', gap: 4, minHeight: 32 },
  actions: { flexDirection: 'row', gap: tokens.space[8] },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderColor: c.line.default },
  tab: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderColor: 'transparent',
    marginBottom: -1,
  },
  tabOn: { borderColor: c.text.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  cell: {
    width: '32.4%',
    aspectRatio: 1,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: c.line.input,
  },
  cellImage: { width: '100%', height: '100%' },
  cellText: {
    padding: 8,
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.bg.surface,
  },
  count: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: c.bg.inverse,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  recordRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[12], minHeight: 56 },
  recordThumb: {
    width: 52,
    height: 52,
    borderRadius: tokens.radius.md,
    backgroundColor: c.line.input,
  },
  recordIcon: { backgroundColor: c.bg.surface, alignItems: 'center', justifyContent: 'center' },
  daySummary: {
    backgroundColor: c.bg.surface,
    borderRadius: tokens.radius.xl,
    padding: tokens.space[16],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  choice: {
    backgroundColor: c.bg.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
    padding: tokens.space[16],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  choiceOn: { backgroundColor: c.bg.default, borderColor: c.text.primary },
});
