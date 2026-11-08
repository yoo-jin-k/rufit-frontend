/**
 * Figma 05-01 분석입니다. 삼대 측정·체중 카드(작은 그래프 포함)와 이번 달 달성률을 보여 줍니다.
 * 측정 데이터는 진입 시 기기 저장소에서 읽고, 저장되지 않은 샘플 수치는 보여 주지 않습니다.
 */
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppIcon } from '../../components/AppIcon';
import { PageHeader, Screen } from '../../components/kit/Screen';
import { ProgressBar } from '../../components/kit/Surfaces';
import { text, tokens } from '../../theme/tokens';
import { monthlyProgress } from '../calendar/monthlyProgress';
import { localDay } from '../calendar/model';
import type { Workout } from '../workout/model';
import { formatDay, formatNumber } from '../workout/recordFormat';
import { decode, storageKey, total, type Measurement } from '../strength/model';
import { signed } from '../strength/StrengthScreen';
import { TrendChart } from '../strength/TrendChart';
import { decodeWeight, weightStorageKey, type WeightRecord } from '../bodyweight/model';
import { weightBase } from '../bodyweight/BodyWeightScreen';

const c = tokens.color;
const md = (date: string) => formatDay(date, 'compact').replace(/ .$/, '');

function MeasureCard({
  title,
  value,
  delta,
  meta,
  values,
  name,
  onPress,
}: {
  title: string;
  value?: string;
  delta?: string;
  meta: string;
  values: { date: string; value: number }[];
  name: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${title} 보기`} onPress={onPress} style={({ pressed }) => [s.card, pressed && { opacity: 0.85 }]}>
      <View style={s.row}>
        <Text style={[text.caption, { color: c.text.secondary, flex: 1 }]}>{title}</Text>
        <AppIcon name="chevron-right" color={c.text.muted} />
      </View>
      {value ? (
        <View style={s.headline}>
          <Text style={[text.titleL, { color: c.text.primary, flex: 1 }]}>
            {value}
            <Text style={[text.bodyMedium, { color: c.text.secondary }]}> kg</Text>
          </Text>
          {!!delta && <Text style={[text.captionBold, { color: c.accent.default }]}>{delta}</Text>}
        </View>
      ) : (
        <Text style={[text.headline, { color: c.text.primary }]}>첫 기록 남기기</Text>
      )}
      <Text style={[text.label, { color: c.text.secondary }]}>{meta}</Text>
      <TrendChart mini name={name} points={values} zeroBaseline={false} />
    </Pressable>
  );
}

export function AnalysisScreen({
  now,
  history,
  onStrength,
  onWeight,
}: {
  now: number;
  history: Workout[];
  onStrength: () => void;
  onWeight: () => void;
}) {
  const [strength, setStrength] = useState<Measurement[]>([]),
    [weight, setWeight] = useState<WeightRecord[]>([]),
    [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    Promise.all([AsyncStorage.getItem(storageKey).then(decode), AsyncStorage.getItem(weightStorageKey).then(decodeWeight)])
      .then(([s, w]) => {
        if (active) {
          setStrength(s);
          setWeight(w);
        }
      })
      .catch(() => {
        if (active) setError('측정 기록을 불러오지 못했습니다. 측정 화면에서 다시 확인해 주세요.');
      });
    return () => {
      active = false;
    };
  }, []);
  const today = localDay(now);
  const month = monthlyProgress(history, today.slice(0, 7));
  const latest = strength.at(-1),
    previous = strength.at(-2),
    lastWeight = weight.at(-1);
  const pastWeight = weightBase(weight, 1);
  return (
    <Screen edges={['top']} header={<PageHeader subtitle={`${md(today)} 기준`} title="분석" />}>
      <MeasureCard
        title="삼대 측정"
        name="삼대 합계"
        value={latest && formatNumber(total(latest))}
        delta={latest && previous ? `지난번보다 ${signed(total(latest) - total(previous))}` : undefined}
        meta={latest ? `벤치 ${latest.bench} · 스쿼트 ${latest.squat} · 데드리프트 ${latest.deadlift}` : '아직 측정 기록이 없어요'}
        values={strength.map((r) => ({ date: r.date, value: total(r) }))}
        onPress={onStrength}
      />
      <MeasureCard
        title="체중"
        name="체중"
        value={lastWeight && String(lastWeight.weight)}
        delta={lastWeight && pastWeight && pastWeight !== lastWeight ? `4주 전보다 ${signed(lastWeight.weight - pastWeight.weight)}` : undefined}
        meta={lastWeight ? `${md(lastWeight.date)} 측정` : '아직 측정 기록이 없어요'}
        values={weight.map((r) => ({ date: r.date, value: r.weight }))}
        onPress={onWeight}
      />
      <View style={s.card}>
        <View style={s.row}>
          <Text style={[text.caption, { color: c.text.secondary, flex: 1 }]}>{Number(month.month.slice(5))}월 달성률</Text>
          <Text style={[text.captionBold, { color: c.text.primary }]}>
            {month.totalDays}일 중 {month.workoutDays}일
          </Text>
        </View>
        <Text style={[text.titleL, { color: c.text.primary }]}>
          {Math.round(month.percent)}
          <Text style={[text.bodyMedium, { color: c.text.secondary }]}> %</Text>
        </Text>
        <ProgressBar value={month.percent} label={`${Number(month.month.slice(5))}월 달성률`} />
      </View>
      {!!error && <Text accessibilityRole="alert" style={[text.caption, { color: c.danger.default }]}>{error}</Text>}
    </Screen>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: c.bg.surface, borderRadius: tokens.radius.xl, padding: tokens.space[16], gap: tokens.space[4] },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headline: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
});
