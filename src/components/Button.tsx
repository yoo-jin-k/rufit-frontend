import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { buttonStyles as styles } from './Button.styles';
import { tokens } from '../theme/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'soft' | 'danger' | 'kakao' | 'apple' | 'google';
export type ButtonSize = 'lg' | 'md' | 'sm';

// 밝은 바탕 버튼은 검정 글자, 어두운 바탕 버튼은 흰 글자를 씁니다.
const darkLabel: ButtonVariant[] = ['secondary', 'soft', 'google'];

/**
 * Figma Button 컴포넌트입니다. 예전 `secondary` 속성은 회색 바탕(soft)으로 그대로 동작합니다.
 * loading은 해당 명령을 처리하는 동안에만 쓰며, 버튼 폭은 상태가 바뀌어도 유지합니다.
 */
export function Button({
  title,
  onPress,
  variant,
  size = 'lg',
  icon,
  fullWidth = true,
  secondary = false,
  disabled = false,
  loading = false,
  loadingLabel = '처리 중…',
  compact = false,
  accessibilityLabel,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** 글자 앞에 놓을 20px 아이콘입니다. 색은 호출하는 쪽에서 버튼 글자색에 맞춥니다. */
  icon?: ReactNode;
  fullWidth?: boolean;
  secondary?: boolean;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  compact?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const kind: ButtonVariant = variant ?? (secondary ? 'soft' : 'primary');
  const blocked = disabled || loading;
  const showDisabled = disabled && !loading;
  const dark = darkLabel.includes(kind);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: blocked, busy: loading }}
      aria-busy={loading}
      disabled={blocked}
      onPress={onPress}
      style={(state) => [
        styles.button,
        fullWidth && styles.fullWidth,
        size !== 'lg' && styles[size],
        compact && styles.compact,
        kind !== 'primary' && styles[kind],
        state.pressed && !blocked && (dark ? styles.lightPressed : kind === 'primary' && styles.pressed),
        showDisabled && styles.disabled,
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator
            color={dark ? tokens.color.text.primary : tokens.color.text.inverse}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
          />
        ) : (
          icon
        )}
        <Text
          style={[
            styles.text,
            size === 'md' && styles.mdText,
            size === 'sm' && styles.smText,
            dark && styles.darkText,
            kind === 'kakao' && styles.kakaoText,
            showDisabled && styles.disabledText,
          ]}
        >
          {loading ? loadingLabel : title}
        </Text>
      </View>
    </Pressable>
  );
}
