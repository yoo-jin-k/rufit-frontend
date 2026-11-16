import { StyleSheet } from 'react-native';
import { tokens } from '../../theme/tokens';

const c = tokens.color;

/** WorkoutCalendar의 정적 스타일입니다. 웹과 네이티브에서 같은 토큰과 수치를 사용합니다. */
export const s = StyleSheet.create({
  wrap: { gap: tokens.space[12] },
  block: { gap: 10 },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  arrows: { flexDirection: 'row', marginRight: -10 },
  arrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  toggle: { minHeight: 28, alignItems: 'center', justifyContent: 'center', marginTop: -6 },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  weekDay: {
    width: 44,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    borderRadius: tokens.radius.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  weekSelected: { borderColor: c.text.primary },
  weekCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plain: { backgroundColor: c.bg.default, borderWidth: 1, borderColor: c.line.input },
  done: { backgroundColor: c.bg.inverse },
  todayRing: { backgroundColor: c.bg.default, borderWidth: 1.5, borderColor: c.accent.default },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: c.accent.default },
  hidden: { opacity: 0 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { width: '14.2857%', textAlign: 'center', color: c.text.muted, paddingVertical: 8 },
  monthCell: { width: '14.2857%', height: 48, alignItems: 'center', justifyContent: 'center' },
  ring: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  ringOn: { borderColor: c.text.primary },
  monthCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progress: {
    backgroundColor: c.bg.surface,
    borderRadius: tokens.radius.xl,
    padding: tokens.space[16],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
