import { StyleSheet } from 'react-native';
import { ui } from '../../components/ScreenLayout.styles';
import { tokens } from '../../theme/tokens';

/** ServerWorkoutFriends의 정적 스타일입니다. 웹과 네이티브에서 같은 토큰과 수치를 사용합니다. */
export const s = StyleSheet.create({
  card: { gap: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'wrap',
  },
  // 운동 중 회원 줄: 왼쪽은 회원 정보, 오른쪽 끝은 응원 버튼으로 한 줄에 고정합니다.
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex: { flex: 1, minWidth: 100 },
  cheer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.color.bg.surface,
  },
  // 보낸 응원은 포인트 색 원으로 채워 표시합니다. 다시 눌러 취소하면 연회색(cheer)으로 돌아갑니다.
  cheerSent: { backgroundColor: tokens.color.accent.default },
  cheerPressed: { transform: [{ scale: 0.92 }] },
  cheerEmoji: { fontSize: 22, lineHeight: 28 },
  profile: { flexDirection: 'row', gap: 10, alignItems: 'center', minHeight: 44 },
  group: { ...ui.muted, fontWeight: '700', marginTop: 4 },
});
