import { BottomNavigation, type MainTab } from '../../components/BottomNavigation';
import { ScreenLayout, ui } from '../../components/ScreenLayout';
/**
 * 벤치프레스·스쿼트·데드리프트 중량을 날짜별로 작성하고 수정합니다.
 * 이 기능의 기록은 현재 기기에 저장되며 서버와 자동 동기화되지 않습니다.
 */
import { useEffect, useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
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
const empty = (): Record<Lift, string> => ({ bench: '', squat: '', deadlift: '' });
export function StrengthScreen({
  onClose,
  onNavigate,
}: {
  onClose: () => void;
  onNavigate?: (tab: MainTab) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [records, setRecords] = useState<Measurement[]>([]);
  const [date, setDate] = useState(today);
  const [input, setInput] = useState(empty);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const lock = useRef(false);
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
      setEditing(false);
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
    <SafeAreaView style={ui.page}>
      <ScreenLayout
        title={editing ? '삼대 기록 입력' : '삼대 측정'}
        onBack={() => {
          if (!busy) {
            if (editing) setEditing(false);
            else onClose();
          }
        }}
        footer={
          <Button
            title={editing ? (busy ? '저장 중…' : '저장하기') : '측정 기록 추가'}
            disabled={!ready || busy}
            onPress={() => {
              if (editing) void save();
              else {
                selectDate(today());
                setEditing(true);
              }
            }}
          />
        }
      >
        {editing ? (
          <>
            <Text style={ui.muted}>측정 날짜</Text>
            <MeasurementDate value={date} onChange={selectDate} disabled={!ready || busy} />
            {lifts.map((lift) => (
              <View key={lift} style={{ gap: 8 }}>
                <Text style={ui.muted}>{labels[lift]} (kg)</Text>
                <TextInput
                  accessibilityLabel={`${labels[lift]} 중량 kg`}
                  value={input[lift]}
                  onChangeText={(value) => setInput((current) => ({ ...current, [lift]: value }))}
                  keyboardType="decimal-pad"
                  placeholder="예: 60"
                  editable={ready && !busy}
                  style={ui.input}
                />
              </View>
            ))}
            <View style={[ui.card, ui.between]}>
              <Text style={ui.heading}>삼대 합계</Text>
              <Text style={ui.title}>
                {lifts.reduce((n, key) => n + (Number(input[key]) || 0), 0)} kg
              </Text>
            </View>
            <Text style={ui.muted}>
              {existing
                ? '같은 날짜에 다시 저장하면 기록이 수정돼요.'
                : '날짜와 실제 측정값을 입력해 주세요.'}
            </Text>
          </>
        ) : (
          <>
            {latest && (
              <View style={{ gap: 8 }}>
                <Text style={ui.muted}>최근 기록 · {latest.date}</Text>
                <Text style={{ fontSize: 36, fontWeight: '700' }}>{total(latest)} kg</Text>
              </View>
            )}
            <StrengthChart
              records={records}
              onSelect={(record) => {
                if (!busy) {
                  selectDate(record.date);
                  setEditing(true);
                }
              }}
            />
            <View style={ui.card}>
              {[...records].reverse().map((record) => (
                <Button
                  key={record.date}
                  title={`${record.date}　${total(record)} kg`}
                  secondary
                  onPress={() => {
                    selectDate(record.date);
                    setEditing(true);
                  }}
                />
              ))}
              {!records.length && <Text style={ui.muted}>아직 측정 기록이 없어요.</Text>}
            </View>
          </>
        )}
        {!!error && (
          <Text accessibilityRole="alert" style={ui.error}>
            {error}
          </Text>
        )}
        {!!notice && (
          <Text accessibilityLiveRegion="polite" style={ui.muted}>
            {notice}
          </Text>
        )}
        <Text style={ui.muted}>이 기기에 저장됩니다. 다른 기기와 자동 동기화되지 않습니다.</Text>
      </ScreenLayout>
      {!editing && onNavigate && <BottomNavigation value="analysis" onChange={onNavigate} />}
    </SafeAreaView>
  );
}
