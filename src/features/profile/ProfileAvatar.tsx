/** 저장 사진과 기본 아이콘을 같은 원형 크기로 표시합니다. */
import { Image, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
export function ProfileAvatar({ photo, size = 64 }: { photo?: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
    {photo ? <Image source={{ uri: photo }} accessibilityLabel="내 프로필 사진" accessible style={{ width: size, height: size }} resizeMode="cover" /> : <AppIcon name="profile" size={size / 2} />}
  </View>;
}
