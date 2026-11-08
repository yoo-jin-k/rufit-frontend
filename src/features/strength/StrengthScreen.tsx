/**
 * Figma 05-02 ~ 05-05 삼대 측정입니다. 벤치프레스·스쿼트·데드리프트 중량을 날짜별로 입력하고 고칩니다.
 * 이 기록은 현재 기기에 저장되며 서버와 자동 동기화되지 않습니다.
 */
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button } from '../../components/Button';
import { Segmented, TextField } from '../../components/kit/Controls';
import { IconButton, NavBar, Screen, SectionTitle } from '../../components/kit/Screen';
import { EmptyCard } from '../../components/kit/Surfaces';
import { text, tokens } from '../../theme/tokens';
import { DateField } from '../calendar/DateField';
import { formatDay, formatNumber } from '../workout/recordFormat';
import { decode, labels, lifts, measurement, storageKey, today, total, upsert, type Lift, type Measurement } from './model';
import { TrendChart } from './TrendChart';

const c = tokens.color;
const empty = (): Record<Lift, string> => ({ bench: '', squat: '', deadlift: '' });
const shortLabels: Record<Lift | 'total', string> = { total: '합계', bench: '벤치', squat: '스쿼트', deadlift: '데드' };
const md = (date: string) => formatDay(date, 'compact').replace(/ .$/, '');

/** 변화량을 '+12.5kg', '−1.2kg'처럼 부호와 함께 씁니다. */
export function signed(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded > 0 ? '+' : rounded < 0 ? '−' : '±'}${formatNumber(Math.abs(rounded))}kg`;
}

export function StrengthScreen({ onClose }: { onClose: () => void }) {
  const [editing, setEditing] = useState(false);
  const [series, setSeries] = useState<Lift | 'total'>('total');
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
          setReady(true);
        }
      })
      .catch(() => {
        if (active) setError('기록을 불러오지 못했습니다. 기존 데이터는 보존했습니다. 닫은 뒤 다시 열어 주세요.');
      });
    return () => {
      active = false;
    };
  }, []);
  function selectDate(value: string) {
    setDate(value);
    const record = records.find((r) => r.date === value);
    setInput(record ? { bench: String(record.bench), squat: String(record.squat), deadlift: String(record.deadlift) } : empty());
    setNotice('');
    setError('');
  }
  function edit(value: string) {
    if (busy) return;
    selectDate(value);
    setEditing(true);
  }
  async function save() {
    if (!ready || lock.current) return;
    try {
      const next = upsert(records, measurement(date, input));
      lock.current = true;
      setBusy(true);
      setError('');
      // 저장 완료 후에만 그래프를 갱신합니다. 실패 시 입력값을 보존하여 재시도합니다.
      await AsyncStorage.setItem(storageKey, JSON.stringify({ version: 1, records: next }));
      setRecords(next);
      setEditing(false);
      setNotice(`${md(date)} 기록을 저장했어요.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장하지 못했습니다. 다시 시도해 주세요.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const valueOf = (r: Measurement) => (series === 'total' ? total(r) : r[series]);
  const latest = records.at(-1);
  const previous = records.at(-2);
  const existing = records.some((r) => r.date === date);
  const sum = lifts.reduce((n, key) => n + (Number(input[key]) || 0), 0);
  if (editing)
    return (
      <Screen
        header={<NavBar title="삼대 기록 입력" leading="close" onLeading={() => !busy && setEditing(false)} />}
        footer={<Button title="저장" accessibilityLabel="저장하기" loading={busy} disabled={!ready} onPress={() => void save()} />}
      >
        <DateField label="측정 날짜" accessibilityLabel="측정 날짜" value={date} onChange={selectDate} disabled={!ready || busy} />
        {lifts.map((lift) => (
          <TextField
            key={lift}
            label={labels[lift]}
            accessibilityLabel={`${labels[lift]} 중량 kg`}
            value={input[lift]}
            onChangeText={(value) => setInput((current) => ({ ...current, [lift]: value }))}
            keyboardType="decimal-pad"
            placeholder="0"
            trailing="kg"
            inputProps={{ editable: ready && !busy }}
          />
        ))}
        <View style={s.sum}>
          <Text style={[text.callout, { color: c.text.secondary, flex: 1 }]}>합계</Text>
          <Text style={[text.titleM, { color: c.text.primary }]}>
            {formatNumber(sum)}
            <Text style={[text.caption, { color: c.text.secondary }]}> kg</Text>
          </Text>
        </View>
        <Text style={[text.label, { color: c.text.muted }]}>
          {existing ? '같은 날짜에 다시 저장하면 기존 기록을 고쳐요.' : '무게는 kg, 소수 둘째 자리까지 입력할 수 있어요.'}
        </Text>
        {!!error && <Text accessibilityRole="alert" style={[text.caption, { color: c.danger.default }]}>{error}</Text>}
      </Screen>
    );
  return (
    <Screen
      header={
        <NavBar
          title="삼대 측정"
          onLeading={onClose}
          trailing={records.length ? <IconButton icon="plus" label="측정 기록 추가" onPress={() => edit(today())} /> : undefined}
        />
      }
      footer={!records.length && <Button title="첫 기록 입력" accessibilityLabel="측정 기록 추가" disabled={!ready} onPress={() => edit(today())} />}
    >
      {!records.length ? (
        <EmptyCard
          icon="chart"
          title="아직 삼대 기록이 없어요"
          body="날짜별로 입력하면 변화를 그래프로 보여 드려요"
          hint="같은 날짜에 다시 저장하면 기존 기록을 고쳐요"
        />
      ) : (
        latest && (
          <>
            <Segmented
              label="그래프 종목"
              items={(['total', ...lifts] as const).map((key) => ({ value: key, label: shortLabels[key] }))}
              value={series}
              onChange={setSeries}
            />
            <View style={{ gap: 2 }}>
              <Text style={[text.caption, { color: c.text.secondary }]}>
                {md(latest.date)} · {series === 'total' ? '벤치 + 스쿼트 + 데드리프트' : labels[series]}
              </Text>
              <View style={s.headline}>
                <Text style={[text.titleL, { color: c.text.primary, flex: 1 }]}>
                  {formatNumber(valueOf(latest))}
                  <Text style={[text.bodyMedium, { color: c.text.secondary }]}> kg</Text>
                </Text>
                {previous && (
                  <Text style={[text.captionBold, { color: c.accent.default }]}>
                    지난번보다 {signed(valueOf(latest) - valueOf(previous))}
                  </Text>
                )}
              </View>
            </View>
            <TrendChart
              name={series === 'total' ? '삼대 합계' : labels[series]}
              points={records.map((r) => ({ date: r.date, value: valueOf(r) }))}
              zeroBaseline={false}
              onSelect={edit}
            />
            <SectionTitle title="측정 기록" right="최근 순" />
            <View>
              {[...records].reverse().map((record, i) => (
                <Pressable
                  key={record.date}
                  accessibilityRole="button"
                  accessibilityLabel={`${record.date} ${total(record)}kg 기록 고치기`}
                  onPress={() => edit(record.date)}
                  style={[s.row, i > 0 && s.rowLine]}
                >
                  <Text style={[text.bodyMedium, { color: c.text.primary, flex: 1 }]}>{md(record.date)}</Text>
                  {series === 'total' && (
                    <Text style={[text.label, { color: c.text.muted }]}>
                      {record.bench} · {record.squat} · {record.deadlift}
                    </Text>
                  )}
                  <Text style={[text.bodyBold, { color: c.text.primary, minWidth: 64, textAlign: 'right' }]}>
                    {formatNumber(valueOf(record))} kg
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )
      )}
      {!!error && <Text accessibilityRole="alert" style={[text.caption, { color: c.danger.default }]}>{error}</Text>}
      {!!notice && <Text accessibilityLiveRegion="polite" style={[text.caption, { color: c.text.secondary }]}>{notice}</Text>}
      <Text style={[text.label, { color: c.text.muted }]}>이 기기에 저장됩니다. 다른 기기와 자동 동기화되지 않습니다.</Text>
    </Screen>
  );
}

const s = StyleSheet.create({
  sum: {
    backgroundColor: c.bg.surface,
    borderRadius: tokens.radius.md,
    padding: tokens.space[16],
    flexDirection: 'row',
    alignItems: 'center',
  },
  headline: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[12], minHeight: 52 },
  rowLine: { borderTopWidth: 1, borderColor: c.line.default },
});
