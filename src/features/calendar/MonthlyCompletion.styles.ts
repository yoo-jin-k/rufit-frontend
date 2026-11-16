import { StyleSheet } from 'react-native';
import { tokens } from '../../theme/tokens';

const c = tokens.color;

/** MonthlyCompletion의 정적 스타일입니다. 웹과 네이티브에서 같은 토큰과 수치를 사용합니다. */
export const s = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: tokens.space[8],
    paddingTop: tokens.space[24],
    paddingBottom: tokens.space[8],
  },
  check: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: c.bg.inverse,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.space[8],
  },
  tiles: { flexDirection: 'row', gap: 10 },
  tile: {
    flex: 1,
    backgroundColor: c.bg.surface,
    borderRadius: tokens.radius.xl,
    paddingVertical: tokens.space[16],
    alignItems: 'center',
    gap: 2,
  },
  card: {
    backgroundColor: c.bg.surface,
    borderRadius: tokens.radius.xl,
    padding: tokens.space[16],
    gap: tokens.space[8],
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  later: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
