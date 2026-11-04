import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Button } from '../../components/Button';
import { colors } from '../../theme/tokens';

export const formatRest = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
export function RestSetting({ name, seconds, source, recommended, finished, onSave }: {
  name: string; seconds: number; source: string; recommended?: number; finished: boolean; onSave(seconds: number | null): void;
}) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const title = `휴식 ${seconds === 0 ? '끄기' : formatRest(seconds)} · ${source}`;
  if (finished) return <Text style={{color: colors.muted}}>{title}</Text>;
  if (!editing) return <Button title={`${name} ${title}`} secondary onPress={() => {setInput(String(seconds));setError('');setEditing(true);}} />;
  function save(value: number | null) {
    try {onSave(value);setEditing(false);setError('');} catch (e) {setError(e instanceof Error ? e.message : '휴식 설정을 확인해 주세요.');}
  }
  return <View style={{gap: 8}}>
    <Text>{name} 휴식시간 · 초 단위 (0은 끄기)</Text>
    <TextInput accessibilityLabel={`${name} 휴식시간 초`} keyboardType="number-pad" maxLength={4} value={input} onChangeText={setInput}
      style={{minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, color: colors.text}} />
    <Button title="휴식시간 저장" onPress={() => {if (!/^\d+$/.test(input)) setError('0~3600초를 입력해 주세요.');else save(Number(input));}} />
    <Button title={recommended !== undefined ? `권장 휴식시간 사용 (${formatRest(recommended)})` : '기본 휴식시간 사용 (1:30)'} secondary onPress={() => save(null)} />
    <Button title="설정 취소" secondary onPress={() => setEditing(false)} />
    {!!error && <Text accessibilityRole="alert" style={{color: '#B42318'}}>{error}</Text>}
  </View>;
}
