import { Pressable, Text } from 'react-native';
import { buttonStyles as styles } from './Button.styles';
// 공통 버튼의 기존 동작을 보존한다. 스타일 값은 tokens.ts, 플랫폼 적용은 Button.styles에서 관리한다.
export function Button({title, onPress, secondary = false, disabled = false}: {
  title: string; onPress: () => void; secondary?: boolean; disabled?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress}
    style={({pressed}) => [styles.button, secondary && styles.secondary, disabled ? styles.disabled : pressed && styles.pressed]}>
    <Text style={[styles.text, secondary && styles.secondaryText]}>{title}</Text>
  </Pressable>;
}
