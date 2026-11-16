import { StyleSheet } from 'react-native';
import { tokens } from '../../theme/tokens';

const c = tokens.color;

/** WorkoutSession의 정적 스타일입니다. 웹과 네이티브에서 같은 토큰과 수치를 사용합니다. */
export const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[12],
    paddingTop: tokens.space[8],
  },
  digits: { fontVariant: ['tabular-nums'] },
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundOn: { backgroundColor: c.bg.inverse },
  end: { minHeight: 44, justifyContent: 'center' },
  exerciseLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[12],
    minHeight: 68,
  },
  thumb: { width: 44, height: 44 },
  detailPage: { flex: 1, backgroundColor: c.bg.default },
  dots: { width: 32, height: 44, alignItems: 'center', justifyContent: 'center' },
  focus: {
    borderWidth: 1,
    borderColor: c.line.default,
    borderRadius: tokens.radius.xl,
    padding: tokens.space[16],
    paddingTop: 0,
    gap: tokens.space[4],
  },
  collapsed: {
    backgroundColor: c.bg.surface,
    borderRadius: tokens.radius.xl,
    paddingHorizontal: tokens.space[12],
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[12],
    minHeight: 68,
  },
  collapsedDone: { minHeight: 68, paddingHorizontal: tokens.space[16] },
  doneMark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: c.bg.inverse,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openMark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: c.line.strong,
    backgroundColor: c.bg.default,
  },
  pausedCard: {
    backgroundColor: c.bg.surface,
    borderRadius: tokens.radius.xl,
    padding: tokens.space[16],
    gap: 6,
  },
  summary: {
    backgroundColor: c.bg.surface,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space[16],
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
  },
});
