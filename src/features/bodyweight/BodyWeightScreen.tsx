/**
 * Figma 05-06 ~ 05-09 체중입니다. 날짜별 체중 입력·수정과 변화 그래프를 보여 줍니다.
 * 삼대 기록과 별도의 저장 키를 쓰며, 저장이 성공한 뒤에만 그래프를 갱신합니다.
 */
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button } from '../../components/Button';
import { Chip, ChipRow, TextField } from '../../components/kit/Controls';
import { IconButton, NavBar, Screen, SectionTitle } from '../../components/kit/Screen';
import { EmptyCard, Notice } from '../../components/kit/Surfaces';
import { text, tokens } from '../../theme/tokens';
import { DateField } from '../calendar/DateField';
import { today } from '../strength/model';
import { signed } from '../strength/StrengthScreen';
import { TrendChart } from '../strength/TrendChart';
import { formatDay } from '../workout/recordFormat';
import { decodeWeight, saveWeight, weightRecord, weightStorageKey, type WeightRecord } from './model';

const c = tokens.color;
const md = (date: string) => formatDay(date, 'compact').replace(/ .$/, '');
const ranges = [
  { value: 1, label: '1개월', since: '4주 전보다' },
  { value: 3, label: '3개월', since: '3개월 전보다' },
  { value: 'all', label: '전체', since: '처음보다' },
] as const;

/** 비교 기준: 가장 최근 기록에서 months개월 안에 든 가장 오래된 기록입니다. 분석 카드와 같은 기준을 씁니다. */
export function weightBase(records: WeightRecord[], months: number | 'all') {
  const latest = records.at(-1);
  if (!latest || months === 'all') return records[0];
  const cutoff = new Date(`${latest.date}T12:00:00`);
  cutoff.setMonth(cutoff.getMonth() - months);
  return records.find((r) => new Date(`${r.date}T12:00:00`).getTime() >= cutoff.getTime());
}

export function BodyWeightScreen({ onClose }: { onClose: () => void }) {
  const [range, setRange] = useState<1 | 3 | 'all'>(1);
  const [editing, setEditing] = useState(false);
  const [records, setRecords] = useState<WeightRecord[]>([]);
  const [date, setDate] = useState(today);
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
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
    const current = records.find((r) => r.date === value);
    setWeight(current ? String(current.weight) : '');
    setHeight(current?.height === undefined ? '' : String(current.height));
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
      const next = saveWeight(records, weightRecord(date, weight, today(), height));
      lock.current = true;
      setBusy(true);
      setError('');
      // 삼대 기록과 별도의 저장 키를 사용하고 저장 성공 후에만 그래프를 갱신합니다.
      await AsyncStorage.setItem(weightStorageKey, JSON.stringify({ version: 1, records: next }));
      setRecords(next);
      setEditing(false);
      setNotice(`${md(date)} 체중을 저장했어요.`);
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
  const visible =
    range === 'all' ? records : records.filter((r) => new Date(`${r.date}T12:00:00`).getTime() >= cutoff.getTime());
  const latest = records.at(-1);
  const before = records.filter((r) => r.date < date).at(-1);
  const sameDay = records.some((r) => r.date === date);
  if (editing)
    return (
      <Screen
        header={<NavBar title="체중 기록 입력" leading="close" onLeading={() => !busy && setEditing(false)} />}
        footer={<Button title="저장" accessibilityLabel="저장하기" loading={busy} disabled={!ready} onPress={() => void save()} />}
      >
        <DateField label="측정 날짜" accessibilityLabel="측정 날짜" value={date} onChange={selectDate} disabled={!ready || busy} />
        <View style={s.big}>
          <TextInput
            accessibilityLabel="체중 kg"
            keyboardType="decimal-pad"
            placeholder="0.0"
            placeholderTextColor={c.text.disabled}
            value={weight}
            editable={ready && !busy}
            onChangeText={setWeight}
            maxLength={6}
            style={[text.display, s.bigInput, { width: Math.max(96, (weight.length || 3) * 24 + 16) }]}
          />
          <Text style={[text.headline, { color: c.text.secondary }]}>kg</Text>
        </View>
        {before && (
          <Text style={[text.caption, { color: c.text.secondary, textAlign: 'center' }]}>
            지난 기록 {before.weight}kg ({md(before.date)})
          </Text>
        )}
        <Notice body={sameDay ? `${md(date)}에 이미 기록이 있어요. 저장하면 새 값으로 고쳐요` : `${md(date)}에 이미 기록이 있으면 새 값으로 고쳐요`} />
        <TextField
          label="키 (선택)"
          accessibilityLabel="키 cm"
          keyboardType="decimal-pad"
          placeholder="예: 170.5"
          value={height}
          onChangeText={setHeight}
          maxLength={6}
          trailing="cm"
          inputProps={{ editable: ready && !busy }}
        />
        {!!error && <Text accessibilityRole="alert" style={[text.caption, { color: c.danger.default }]}>{error}</Text>}
      </Screen>
    );
  const first = weightBase(records, range);
  const label = ranges.find((r) => r.value === range)!;
  return (
    <Screen
      header={
        <NavBar
          title="체중"
          onLeading={onClose}
          trailing={records.length ? <IconButton icon="plus" label="측정 기록 추가" onPress={() => edit(today())} /> : undefined}
        />
      }
      footer={!records.length && <Button title="첫 기록 입력" accessibilityLabel="측정 기록 추가" disabled={!ready} onPress={() => edit(today())} />}
    >
      {!records.length ? (
        <EmptyCard
          icon="chart"
          title="아직 체중 기록이 없어요"
          body="날짜별로 입력하면 변화를 그래프로 보여 드려요"
          hint="같은 날짜에 다시 저장하면 기존 기록을 고쳐요"
        />
      ) : (
        latest && (
          <>
            <ChipRow>
              {ranges.map((r) => (
                <Chip key={r.label} label={r.label} selected={range === r.value} onPress={() => setRange(r.value)} />
              ))}
            </ChipRow>
            <View style={{ gap: 2 }}>
              <Text style={[text.caption, { color: c.text.secondary }]}>{md(latest.date)}</Text>
              <View style={s.headline}>
                <Text style={[text.titleL, { color: c.text.primary, flex: 1 }]}>
                  {latest.weight}
                  <Text style={[text.bodyMedium, { color: c.text.secondary }]}> kg</Text>
                </Text>
                {first && first !== latest && (
                  <Text style={[text.captionBold, { color: c.accent.default }]}>
                    {label.since} {signed(latest.weight - first.weight)}
                  </Text>
                )}
              </View>
              {latest.height !== undefined && <Text style={[text.label, { color: c.text.secondary }]}>키 {latest.height}cm</Text>}
            </View>
            <TrendChart
              name="체중"
              zeroBaseline={false}
              points={visible.map((r) => ({ date: r.date, value: r.weight }))}
              onSelect={edit}
            />
            <SectionTitle title="측정 기록" right="최근 순" />
            <View>
              {[...records].reverse().map((record, i, list) => {
                const prev = list[i + 1];
                return (
                  <Pressable
                    key={record.date}
                    accessibilityRole="button"
                    accessibilityLabel={`${record.date} ${record.weight}kg 기록 고치기`}
                    onPress={() => edit(record.date)}
                    style={[s.row, i > 0 && s.rowLine]}
                  >
                    <Text style={[text.bodyMedium, { color: c.text.primary, flex: 1 }]}>{md(record.date)}</Text>
                    <Text style={[text.bodyBold, { color: c.text.primary }]}>{record.weight} kg</Text>
                    <Text style={[text.label, s.diff]}>{prev ? signed(record.weight - prev.weight).replace('kg', '') : ''}</Text>
                  </Pressable>
                );
              })}
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
  big: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 4, paddingTop: tokens.space[24] },
  bigInput: { color: c.text.primary, textAlign: 'center', padding: 0, outlineWidth: 0 } as object,
  headline: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[8], minHeight: 52 },
  rowLine: { borderTopWidth: 1, borderColor: c.line.default },
  diff: { color: c.text.muted, width: 40, textAlign: 'right' },
});
