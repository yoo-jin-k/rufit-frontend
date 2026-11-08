/** 저장 사진과 기본 아이콘을 같은 원형 크기로 표시합니다(Figma Avatar: 사진이 없으면 회색 원과 사람 아이콘). */
import { Image, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { tokens } from '../../theme/tokens';
export function ProfileAvatar({ photo, size = 64 }: { photo?: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: tokens.color.bg.surface, alignItems: 'center', justifyContent: 'center' }}>
    {photo ? <Image source={{ uri: photo }} accessibilityLabel="내 프로필 사진" accessible style={{ width: size, height: size }} resizeMode="cover" /> : <AppIcon name="person" size={size * 0.42} color={tokens.color.text.secondary} />}
  </View>;
}
