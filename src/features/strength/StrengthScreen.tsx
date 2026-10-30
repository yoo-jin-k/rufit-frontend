/**
 * 벤치프레스·스쿼트·데드리프트 중량을 날짜별로 작성하고 수정합니다.
 * 이 기능의 기록은 현재 기기에 저장되며 서버와 자동 동기화되지 않습니다.
 */
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button } from '../../components/Button';
import {
  decode,
  labels,
  lifts,
  measurement,
  storageKey,
  today,
  total,
  upsert,
  type Lift,
  type Measurement,
} from './model';
import { MeasurementDate } from './MeasurementDate';
import { StrengthChart } from './StrengthChart';
import { s } from './styles';
const empty = (): Record<Lift, string> => ({ bench: '', squat: '', deadlift: '' });
export function StrengthScreen({ onClose }: { onClose: () => void }) {
  const [records, setRecords] = useState<Measurement[]>([]);
  const [date, setDate] = useState(today);
  const [input, setInput] = useState(empty);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const lock = useRef(false);
  const scroll = useRef<ScrollView>(null);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(storageKey)
      .then(decode)
      .then((value) => {
        if (active) {
          setRecords(value);
          const current = value.find((r) => r.date === today());
          if (current)
            setInput({
              bench: String(current.bench),
              squat: String(current.squat),
              deadlift: String(current.deadlift),
            });
          setReady(true);
        }
      })
      .catch(() => {
        if (active)
          setError(
            '기록을 불러오지 못했습니다. 기존 데이터는 보존했습니다. 닫은 뒤 다시 열어 주세요.',
          );
      });
    return () => {
      active = false;
    };
  }, []);
  function selectDate(value: string) {
    setDate(value);
    const record = records.find((r) => r.date === value);
    setInput(
      record
        ? {
            bench: String(record.bench),
            squat: String(record.squat),
            deadlift: String(record.deadlift),
          }
        : empty(),
    );
    setNotice('');
    setError('');
  }
  async function save() {
    if (!ready || lock.current) return;
    try {
      const next = upsert(records, measurement(date, input));
      lock.current = true;
      setBusy(true);
      setError('');
      setNotice('');
      // 저장 완료 후에만 그래프를 갱신합니다. 실패 시 입력값을 보존하여 재시도합니다.
      await AsyncStorage.setItem(storageKey, JSON.stringify({ version: 1, records: next }));
      setRecords(next);
      setNotice(`${date} 기록을 저장했습니다.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장하지 못했습니다. 다시 시도해 주세요.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const existing = records.some((r) => r.date === date);
  const latest = records.at(-1);
  return (
    <SafeAreaView style={s.page}>
      <KeyboardAvoidingView style={s.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scroll}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.content}
        >
          <View style={s.row}>
            <Text style={s.title}>삼대측정</Text>
            <Button title="닫기" secondary disabled={busy} onPress={onClose} />
          </View>
          <Text style={s.muted}>
            벤치프레스 · 스쿼트 · 데드리프트{'\n'}나의 중량 변화를 날짜별로 기록해요.
          </Text>
          {latest && (
            <View style={s.card}>
              <Text style={s.muted}>최근 삼대 합계 · {latest.date}</Text>
              <Text style={s.total}>{total(latest)} kg</Text>
            </View>
          )}
          <View style={s.card}>
            <Text style={s.heading}>{existing ? '측정 기록 수정' : '새 측정 기록'}</Text>
            <Text style={s.muted}>측정 날짜</Text>
            <MeasurementDate value={date} onChange={selectDate} disabled={!ready || busy} />
            <View style={s.row}>
              {lifts.map((lift) => (
                <View key={lift} style={s.field}>
                  <Text style={s.muted}>{labels[lift]} (kg)</Text>
                  <TextInput
                    accessibilityLabel={`${labels[lift]} 중량 kg`}
                    value={input[lift]}
                    onChangeText={(value) => {
                      setInput((current) => ({ ...current, [lift]: value }));
                      setNotice('');
                    }}
                    keyboardType="decimal-pad"
                    placeholder="예: 60"
                    editable={ready && !busy}
                    style={s.input}
                  />
                </View>
              ))}
            </View>
            <Text style={s.muted}>
              세 종목 모두 실제 측정 중량을 입력해 주세요. 같은 날짜는 기존 기록을 수정합니다.
            </Text>
            {!!error && (
              <Text accessibilityRole="alert" style={s.error}>
                {error}
              </Text>
            )}
            {!!notice && (
              <Text accessibilityLiveRegion="polite" style={s.success}>
                {notice}
              </Text>
            )}
            <Button
              title={
                !ready
                  ? error
                    ? '기록을 불러올 수 없음'
                    : '기록 불러오는 중'
                  : busy
                    ? '저장 중…'
                    : existing
                      ? '이 날짜 기록 수정'
                      : '측정 기록 저장'
              }
              disabled={!ready || busy}
              onPress={() => void save()}
            />
          </View>
          <StrengthChart
            records={records}
            onSelect={(record) => {
              if (!busy) {
                selectDate(record.date);
                scroll.current?.scrollTo({ y: 0, animated: true });
              }
            }}
          />
          <Text style={s.muted}>이 기기에 저장됩니다. 다른 기기와 자동 동기화되지 않습니다.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
