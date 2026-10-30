import { TextInput } from 'react-native';
import { s } from './styles';
export function MeasurementDate({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <TextInput
      accessibilityLabel="측정 날짜 YYYY-MM-DD"
      value={value}
      onChangeText={onChange}
      editable={!disabled}
      placeholder="YYYY-MM-DD"
      maxLength={10}
      style={s.input}
    />
  );
}
