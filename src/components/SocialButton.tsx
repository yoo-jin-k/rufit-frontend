/** 친구 줄 오른쪽의 작은 버튼입니다(Figma Button sm: 높이 36). 검정은 주요 동작, 흰 테두리는 보조 동작입니다. */
import { Button } from './Button';
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
    <Button
      title={title}
      accessibilityLabel={label ?? title}
      size="sm"
      fullWidth={false}
      variant={secondary ? 'secondary' : 'primary'}
      disabled={disabled}
      onPress={onPress}
    />
  );
}
