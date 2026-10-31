/** 친구 행 전용 작은 버튼입니다. 글씨는 줄이되 터치 영역 높이는 44px로 유지합니다. */
import { Pressable, Text, View } from 'react-native';
import { colors } from '../theme/tokens';
export function SocialButton({
  title,
  label,
  onPress,
  secondary = false,
  disabled = false,
}: {
  title: string;
  label?: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ?? title}
      disabled={disabled}
      accessibilityState={{ disabled }}
      onPress={onPress}
      style={{ minHeight: 44, justifyContent: 'center', opacity: disabled ? 0.45 : 1 }}
    >
      <View
        style={{
          minHeight: 28,
          borderRadius: 7,
          paddingHorizontal: 8,
          paddingVertical: 5,
          justifyContent: 'center',
          backgroundColor: secondary ? colors.primarySoft : colors.primary,
        }}
      >
        <Text
          style={{
            fontSize: 11,
            lineHeight: 17,
            fontWeight: '600',
            color: secondary ? colors.text : colors.onPrimary,
          }}
        >
          {title}
        </Text>
      </View>
    </Pressable>
  );
}
