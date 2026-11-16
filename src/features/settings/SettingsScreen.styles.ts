import { StyleSheet } from 'react-native';
import { tokens } from '../../theme/tokens';

const c = tokens.color;

/** SettingsScreen의 정적 스타일입니다. 웹과 네이티브에서 같은 토큰과 수치를 사용합니다. */
export const s = StyleSheet.create({
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[16],
    paddingVertical: tokens.space[24],
  },
  round: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: c.line.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  search: {
    minHeight: 48,
    borderRadius: tokens.radius.md,
    backgroundColor: c.bg.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[8],
    paddingHorizontal: tokens.space[16],
  },
  searchInput: { flex: 1, color: c.text.primary, minHeight: 48, outlineWidth: 0 } as object,
  faq: {
    backgroundColor: c.bg.surface,
    borderRadius: tokens.radius.xl,
    padding: tokens.space[16],
    gap: tokens.space[8],
  },
  faqHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
