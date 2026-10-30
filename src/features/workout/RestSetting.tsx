import { useRef, useState } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../../components/Button';
import { colors, spacing, typography } from '../../theme/tokens';
import { setInputStyles as fieldStyles } from './SetInput.styles';
import { parseRestInput } from './restSettingView';

export const formatRest = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
// 펼칠 때만 적용값을 초안으로 복사합니다. 회전/저장 상태 변경으로 편집값을 다시 초기화하지 않습니다.
export function RestSetting({
  name,
  seconds,
  source,
  recommended,
  finished,
  onSave,
}: {
  name: string;
  seconds: number;
  source: string;
  recommended?: number;
  finished: boolean;
  onSave(seconds: number | null): void;
}) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [focused, setFocused] = useState(false);
  const field = useRef<TextInput>(null);
  const title = `휴식 ${seconds === 0 ? '끄기' : formatRest(seconds)} · ${source}`;
  if (finished) return <Text style={s.description}>{title}</Text>;
  if (!editing)
    return (
      <View style={s.section}>
        <Button
          title={title}
          accessibilityLabel={`${name} ${title}`}
          secondary
          onPress={() => {
            setInput(String(seconds));
            setError('');
            setEditing(true);
          }}
        />
        {source === '개인 설정' && <Text style={s.description}>다음 세트부터 적용됩니다.</Text>}
      </View>
    );
  function fail(message: string) {
    setError(message);
    field.current?.focus();
    if (Platform.OS === 'ios' && message !== error)
      AccessibilityInfo.announceForAccessibility(message);
  }
  function save(value: number | null) {
    // 값 적용 후 접습니다. 비동기 디스크 저장 성공 여부는 LocalSaveStatus가 별도로 표시합니다.
    try {
      onSave(value);
      setEditing(false);
      setError('');
    } catch (e) {
      fail(e instanceof Error ? e.message : '휴식 설정을 확인해 주세요.');
    }
  }
  return (
    <View style={s.section}>
      <Text style={s.label}>휴식시간 (초)</Text>
      <TextInput
        ref={field}
        autoFocus
        accessibilityLabel={`${name} 휴식시간 초`}
        aria-invalid={!!error}
        keyboardType="number-pad"
        maxLength={4}
        value={input}
        onChangeText={setInput}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[fieldStyles.input, focused && fieldStyles.focus, !!error && fieldStyles.invalid]}
      />
      {!!error && (
        <Text
          accessibilityRole={Platform.OS === 'web' ? 'alert' : 'text'}
          accessibilityLiveRegion={Platform.OS === 'android' ? 'assertive' : undefined}
          style={fieldStyles.error}
        >
          {error}
        </Text>
      )}
      <Text style={s.description}>0은 끄기 · 최대3600초</Text>
      <Text style={s.description}>다음 세트부터 적용해요. 현재 휴식은 그대로 유지됩니다.</Text>
      <Button
        title="휴식시간 저장"
        onPress={() => {
          try {
            save(parseRestInput(input));
          } catch (e) {
            fail((e as Error).message);
          }
        }}
      />
      <Button
        title={
          recommended !== undefined
            ? `권장 휴식시간 사용 (${recommended === 0 ? '끄기' : formatRest(recommended)})`
            : '기본 휴식시간 사용 (1:30)'
        }
        secondary
        onPress={() => save(null)}
      />
      <Button
        title="설정 취소"
        secondary
        onPress={() => {
          setEditing(false);
          setError('');
        }}
      />
    </View>
  );
}
const s = StyleSheet.create({
  section: { gap: spacing.sm },
  label: { ...typography.body, color: colors.text },
  description: { ...typography.caption, color: colors.textSecondary },
});
