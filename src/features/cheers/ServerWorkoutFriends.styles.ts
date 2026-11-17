import { StyleSheet } from 'react-native';
import { ui } from '../../components/ScreenLayout.styles';

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
  flex: { flex: 1, minWidth: 100 },
  profile: { flexDirection: 'row', gap: 10, alignItems: 'center', minHeight: 44 },
  group: { ...ui.muted, fontWeight: '700', marginTop: 4 },
});
