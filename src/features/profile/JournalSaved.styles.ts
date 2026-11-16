import { StyleSheet } from 'react-native';
import { tokens } from '../../theme/tokens';

const c = tokens.color;

/** JournalSaved의 정적 스타일입니다. 웹과 네이티브에서 같은 토큰과 수치를 사용합니다. */
export const s = StyleSheet.create({
  center: { alignItems: 'center', gap: tokens.space[8], paddingBottom: tokens.space[8] },
  photo: { width: '66%', maxWidth: 240, aspectRatio: 240 / 300, borderRadius: tokens.radius.xl },
  check: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: c.bg.inverse,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: tokens.space[8],
  },
});
