import { BottomNavigation, type MainTab } from '../../components/BottomNavigation';
import { ScreenLayout, ui } from '../../components/ScreenLayout';
/**
 * 날짜별 체중 입력, 기존 값 수정, 변화 그래프를 연결합니다.
 * 삼대 기록과 별도의 저장 키를 사용하며 저장이 성공한 뒤에만 그래프를 갱신합니다.
 */
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button } from '../../components/Button';
import { today } from '../strength/model';
import { MeasurementDate } from '../strength/MeasurementDate';
import { TrendChart } from '../strength/TrendChart';
import {
  decodeWeight,
  saveWeight,
  weightRecord,
  weightStorageKey,
  type WeightRecord,
} from './model';
export function BodyWeightScreen({
  onClose,
  onNavigate,
}: {
  onClose: () => void;
  onNavigate?: (tab: MainTab) => void;
}) {
  const [range, setRange] = useState<1 | 3 | 'all'>(1);
  const [editing, setEditing] = useState(false);
  const [records, setRecords] = useState<WeightRecord[]>([]);
  const [date, setDate] = useState(today);
  const [weight, setWeight] = useState('');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const lock = useRef(false);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(weightStorageKey)
      .then(decodeWeight)
      .then((value) => {
        if (active) {
          setRecords(value);
          setReady(true);
          const current = value.find((r) => r.date === today());
          if (current) setWeight(String(current.weight));
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
    const current = records.find((r) => r.date === value);
    setWeight(current ? String(current.weight) : '');
    setNotice('');
    setError('');
  }
  async function save() {
    if (!ready || lock.current) return;
    try {
      const next = saveWeight(records, weightRecord(date, weight));
      lock.current = true;
      setBusy(true);
      setError('');
      setNotice('');
      // 삼대 기록과 별도의 저장 키를 사용하고 저장 성공 후에만 그래프를 갱신합니다.
      await AsyncStorage.setItem(weightStorageKey, JSON.stringify({ version: 1, records: next }));
      setRecords(next);
      setEditing(false);
      setNotice(`${date} 체중을 저장했습니다.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장하지 못했습니다. 다시 시도해 주세요.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const [anchor] = useState(today);
  const cutoff = new Date(`${anchor}T12:00:00`);
  if (range !== 'all') cutoff.setMonth(cutoff.getMonth() - range);
  const visibleRecords =
    range === 'all'
      ? records
      : records.filter((r) => new Date(`${r.date}T12:00:00`).getTime() >= cutoff.getTime());
  const existing = records.some((r) => r.date === date);
  const latest = records.at(-1);
  return (
    <SafeAreaView style={ui.page}>
      <ScreenLayout
        title={editing ? '체중 기록 입력' : '체중 측정'}
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
            <Text style={ui.muted}>체중 (kg)</Text>
            <TextInput
              accessibilityLabel="체중 kg"
              keyboardType="decimal-pad"
              placeholder="예: 72.5"
              value={weight}
              editable={ready && !busy}
              onChangeText={setWeight}
              style={[ui.input, { fontSize: 28, fontWeight: '700', minHeight: 72 }]}
            />
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
                <Text style={{ fontSize: 36, fontWeight: '700' }}>{latest.weight} kg</Text>
              </View>
            )}
            <View style={[ui.row, { backgroundColor: '#F5F5F7', borderRadius: 10, padding: 3 }]}>
              {([1, 3, 'all'] as const).map((value) => (
                <Pressable
                  key={value}
                  accessibilityRole="tab"
                  aria-selected={range === value}
                  onPress={() => setRange(value)}
                  style={{
                    flex: 1,
                    minHeight: 44,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: range === value ? 'white' : 'transparent',
                    borderRadius: 8,
                  }}
                >
                  <Text style={ui.muted}>{value === 'all' ? '전체' : `${value}개월`}</Text>
                </Pressable>
              ))}
            </View>
            <TrendChart
              compact
              zeroBaseline={false}
              name="체중"
              points={visibleRecords.map((r) => ({ date: r.date, value: r.weight }))}
              onSelect={(value) => {
                if (!busy) {
                  selectDate(value);
                  setEditing(true);
                }
              }}
            />
            <View style={ui.card}>
              {[...records].reverse().map((record) => (
                <Button
                  key={record.date}
                  title={`${record.date}　${record.weight} kg`}
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
