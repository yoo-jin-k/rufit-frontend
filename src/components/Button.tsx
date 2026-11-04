import {ActivityIndicator, Pressable, Text, View} from 'react-native';
import {buttonStyles as styles} from './Button.styles';
import {colors} from '../theme/tokens';

// 자동저장이 아니라 해당 명령을 처리하는 동안에만 loading을 쓴다. 컨테이너 폭은 상태가 바뀌어도 유지한다.
export function Button({title, onPress, secondary = false, disabled = false, loading = false, loadingLabel = '처리 중…', compact = false, accessibilityLabel}: {
  title: string; onPress: () => void; secondary?: boolean; disabled?: boolean; loading?: boolean;
  loadingLabel?: string; compact?: boolean; accessibilityLabel?: string;
}) {
  const blocked = disabled || loading;
  const showDisabled = disabled && !loading;
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? title}
    accessibilityState={{disabled: blocked, busy: loading}} aria-busy={loading} disabled={blocked} onPress={onPress}
    style={({pressed}) => [styles.button, compact && styles.compact, secondary && styles.secondary,
      pressed && !blocked && (secondary ? styles.secondaryPressed : styles.pressed), showDisabled && styles.disabled]}>
    <View style={styles.content}>
      {loading && <ActivityIndicator color={secondary ? colors.primary : colors.onPrimary} accessible={false} importantForAccessibility="no-hide-descendants" />}
      <Text style={[styles.text, secondary && styles.secondaryText, showDisabled && styles.disabledText]}>{loading ? loadingLabel : title}</Text>
    </View>
  </Pressable>;
}
