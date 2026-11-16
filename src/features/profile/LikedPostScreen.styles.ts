import { StyleSheet } from 'react-native';
import { tokens } from '../../theme/tokens';

/** LikedPostScreen의 정적 스타일입니다. 웹과 네이티브에서 같은 토큰과 수치를 사용합니다. */
export const s = StyleSheet.create({
  author: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[12] },
  photo: { width: '100%', aspectRatio: 1 },
  cheer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
