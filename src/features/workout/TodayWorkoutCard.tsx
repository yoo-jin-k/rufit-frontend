/**
 * 홈의 요약 카드입니다. 오늘 기록이 있으면 검정 '오늘의 운동' 카드, 없으면 가장 최근 운동 카드,
 * 기록이 하나도 없으면 첫 운동 안내 카드를 보여 줍니다. 여러 번 저장한 오늘 운동도 카드 하나로 합칩니다.
 * 오늘 카드를 누르면 기록별 전체 내용을 한 화면(02-07)에 모두 보여 줍니다.
 */
import { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { AppModal } from '../../components/AppModal';
import { NavBar, Screen } from '../../components/kit/Screen';
import { LogoMark } from '../../components/kit/Surfaces';
import { text, tokens } from '../../theme/tokens';
import { localDay } from '../calendar/model';
import type { Journal } from '../profile/journalModel';
import type { Workout } from './model';
import { completedWorkoutsOnDay } from './completedWorkoutSummary';
import { StatTriplet, WorkoutDetail } from './WorkoutDetail';
import { WorkoutRecordCard } from './WorkoutRecordCard';
import {
  completedSets,
  formatDay,
  formatNumber,
  workoutDay,
  workoutMinutes,
  workoutParts,
  workoutVolume,
} from './recordFormat';

const c = tokens.color;

/** 여러 기록을 하루 합계로 묶습니다. 시간을 재지 않은 직접 입력 기록은 시간 합계에서 뺍니다. */
export function dayTotals(records: Workout[]) {
  const minutes = records.reduce((sum, w) => sum + (workoutMinutes(w) ?? 0), 0);
  const measured = records.some((w) => workoutMinutes(w) !== null);
  return {
    minutes: measured ? minutes : null,
    volume: records.reduce((sum, w) => sum + workoutVolume(w), 0),
    sets: records.reduce((sum, w) => sum + completedSets(w), 0),
    parts: [...new Set(records.flatMap(workoutParts))],
    exercises: [...new Set(records.flatMap((w) => w.exercises.filter((e) => e.sets.some((set) => set.completed)).map((e) => e.name)))],
  };
}

function Values({ minutes, volume, inverse }: { minutes: number | null; volume: number; inverse?: boolean }) {
  const main = inverse ? c.text.inverse : c.text.primary;
  const unit = inverse ? c.text.inverse : c.text.secondary;
  return (
    <View style={s.values}>
      {minutes !== null && (
        <Text style={[text.titleL, { color: main }]}>
          {minutes}
          <Text style={[text.bodyMedium, { color: unit }]}> 분</Text>
        </Text>
      )}
      <Text style={[text.titleL, { color: main }]}>
        {formatNumber(volume)}
        <Text style={[text.bodyMedium, { color: unit }]}> kg</Text>
      </Text>
    </View>
  );
}

export function TodayWorkoutCard({ history, now, journals, onJournal, onDelete }: {
  onDelete?: (id: string) => void;
  history: Workout[]; now: number; journals: Journal[]; onJournal: (workout: Workout) => void;
}) {
  const pending = useRef<Workout | null>(null);
  function afterClose() { const target = pending.current; pending.current = null; if (target) onJournal(target); }
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<Workout | null>(null);
  const records = completedWorkoutsOnDay(history, now);
  const today = localDay(now);
  if (!records.length) {
    const last = history
      .filter((w) => w.finishedAt !== undefined && workoutDay(w) < today)
      .sort((a, b) => workoutDay(b).localeCompare(workoutDay(a)) || b.startedAt - a.startedAt)[0];
    if (!last)
      return (
        <View style={s.card}>
          <LogoMark size={44} />
          <View style={{ gap: 4, marginTop: 8 }}>
            <Text style={[text.headline, { color: c.text.primary }]}>첫 운동을 기록해 보세요</Text>
            <Text style={[text.caption, { color: c.text.secondary }]}>운동을 마치면 이번 주 달력에 표시돼요</Text>
          </View>
        </View>
      );
    const lastDay = workoutDay(last);
    const sameDay = history.filter((w) => w.finishedAt !== undefined && workoutDay(w) === lastDay);
    const totals = dayTotals(sameDay);
    return (
      <>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`지난 운동 ${formatDay(lastDay)} 기록 보기`}
          onPress={() => setDetail(last)}
          style={({ pressed }) => [s.card, pressed && s.pressed]}
        >
          <View style={s.head}>
            <Text style={[text.caption, { color: c.text.secondary, flex: 1 }]}>지난 운동 · {formatDay(lastDay, 'compact')}</Text>
            <AppIcon name="chevron-right" color={c.text.muted} />
          </View>
          <Values minutes={totals.minutes} volume={totals.volume} />
          <Text style={[text.caption, { color: c.text.secondary }]}>
            {[totals.parts.join(' · '), totals.exercises.join(', '), `${totals.sets}세트`].filter(Boolean).join(' · ')}
          </Text>
        </Pressable>
        <WorkoutDetail
          visible={!!detail}
          workout={detail}
          journal={detail ? journals.find((j) => j.workoutId === detail.id) : undefined}
          onClose={() => setDetail(null)}
          onJournal={onJournal}
          onDelete={onDelete}
        />
      </>
    );
  }
  const totals = dayTotals(records);
  return <>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="오늘의 운동 전체 기록 보기"
      onPress={() => setOpen(true)}
      style={({ pressed }) => [s.card, s.inverse, pressed && s.pressed]}
    >
      <View style={s.head}>
        <Text style={[text.caption, { color: c.text.muted, flex: 1 }]}>오늘의 운동</Text>
        <AppIcon name="chevron-right" color={c.text.inverse} />
      </View>
      <Values minutes={totals.minutes} volume={totals.volume} inverse />
      <Text style={[text.caption, { color: c.text.muted }]}>
        {[...totals.parts, `${totals.sets}세트`].join(' · ')}
      </Text>
    </Pressable>
    <AppModal visible={open} animationType="slide" onRequestClose={() => setOpen(false)} onDismiss={afterClose}>
      <Screen header={<NavBar title={`${formatDay(today, 'compact').replace(/ .$/, '')} 기록`} onLeading={() => setOpen(false)} />}>
        <StatTriplet
          size="titleL"
          items={[
            { value: totals.minutes === null ? '-' : String(totals.minutes), label: '분 운동' },
            { value: formatNumber(totals.volume), label: 'kg 볼륨' },
            { value: String(totals.sets), label: '세트' },
          ]}
        />
        {/* 상세 화면을 한 번 더 열지 않도록 기록별 세트와 메모를 이 화면에 모두 표시합니다. */}
        {records.map(workout => (
          <WorkoutRecordCard key={workout.id} workout={workout}
            journal={journals.find(j => j.workoutId === workout.id)}
            onDelete={onDelete && (id => { onDelete(id); if (records.length === 1) setOpen(false); })}
            onJournal={target => { pending.current = target; setOpen(false); if (Platform.OS !== 'ios') afterClose(); }} />
        ))}
      </Screen>
    </AppModal>
  </>;
}

const s = StyleSheet.create({
  card: { backgroundColor: c.bg.surface, borderRadius: tokens.radius.xl, padding: tokens.space[20], gap: 6 },
  inverse: { backgroundColor: c.bg.inverse },
  pressed: { opacity: 0.88 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  values: { flexDirection: 'row', alignItems: 'baseline', gap: tokens.space[12], flexWrap: 'wrap' },
});
