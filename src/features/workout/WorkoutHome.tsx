/**
 * Figma 02-01 ~ 02-06 운동 홈입니다. 위에서부터 날짜·제목, 이번 주(펼치면 월간), 요약 카드, 통계 두 칸, 친구 영역,
 * 하단 '운동 시작하기' 순서입니다. 지난 날짜를 고르면 그날 기록을 보여 주고, 기록이 없으면 하단 버튼이 '과거 기록 추가'로 바뀝니다.
 */
import { useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { Button } from '../../components/Button';
import { PageHeader, Screen } from '../../components/kit/Screen';
import { ProgressBar } from '../../components/kit/Surfaces';
import { text, tokens } from '../../theme/tokens';
import { calendarDays, localDay, workoutsByDay } from '../calendar/model';
import { monthlyProgress } from '../calendar/monthlyProgress';
import { WorkoutCalendar } from '../calendar/WorkoutCalendar';
import type { Journal } from '../profile/journalModel';
import type { Workout } from './model';
import { completedSets, formatDay } from './recordFormat';
import { TodayWorkoutCard } from './TodayWorkoutCard';
import { WorkoutDetail } from './WorkoutDetail';

const c = tokens.color;

/** 이번 주 요일별 막대입니다. 완료 세트가 많을수록 높고, 운동하지 않은 날은 낮은 회색 막대입니다. */
function WeekBars({ days, grouped }: { days: string[]; grouped: Record<string, Workout[]> }) {
  const counts = days.map((d) => (grouped[d] ?? []).reduce((n, w) => n + completedSets(w), 0));
  const max = Math.max(1, ...counts);
  return (
    <View accessible={false} style={s.bars}>
      {counts.map((count, i) => (
        <View
          key={days[i]}
          style={[s.bar, count ? { height: 8 + Math.round((count / max) * 12), backgroundColor: c.text.primary } : null]}
        />
      ))}
    </View>
  );
}

export function WorkoutHome({
  history,
  ready,
  now,
  journals,
  headerActions,
  friends,
  status,
  onStart,
  onManual,
  onJournal,
  onDelete,
}: {
  history: Workout[];
  ready: boolean;
  now: number;
  journals: Journal[];
  /** 제목 오른쪽 알림 버튼입니다. */
  headerActions: ReactNode;
  /** 지금 운동 중인 친구 영역입니다(로그인 여부에 따라 다른 화면). */
  friends: ReactNode;
  /** 저장 실패·오류 안내입니다. 있을 때만 보여 줍니다. */
  status?: ReactNode;
  onStart: () => void;
  onManual: (day: string) => void;
  onJournal: (workout: Workout) => void;
  onDelete?: (id: string) => void;
}) {
  const today = localDay(now);
  const [selected, setSelected] = useState(today);
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<Workout | null>(null);
  const grouped = useMemo(() => workoutsByDay(history), [history]);
  const week = calendarDays(today, false);
  const weekCount = week.filter((d) => grouped[d]?.length).length;
  const progress = monthlyProgress(history, today.slice(0, 7));
  const pastEmpty = selected < today && !grouped[selected]?.length;
  const showSummary = selected === today && !expanded;
  return (
    <Screen
      edges={['top']}
      header={<PageHeader subtitle={formatDay(today)} title="오늘" actions={headerActions} />}
      footer={
        pastEmpty ? (
          <Button
            title="과거 기록 추가"
            icon={<AppIcon name="dumbbell" color={c.text.inverse} />}
            disabled={!ready}
            onPress={() => onManual(selected)}
          />
        ) : (
          <Button
            title="운동 시작하기"
            icon={<AppIcon name="dumbbell" color={c.text.inverse} />}
            disabled={!ready}
            onPress={onStart}
          />
        )
      }
    >
      <WorkoutCalendar
        history={history}
        ready={ready}
        now={now}
        selected={selected}
        onSelect={setSelected}
        expanded={expanded}
        onExpand={setExpanded}
        onOpenRecord={setDetail}
      />
      {status}
      {showSummary && (
        <>
          <TodayWorkoutCard history={history} now={now} journals={journals} onJournal={onJournal} onDelete={onDelete} />
          <View style={s.tiles}>
            <View style={s.tile}>
              <Text style={[text.caption, { color: c.text.secondary }]}>{Number(today.slice(5, 7))}월 달성률</Text>
              <Text style={[text.titleL, { color: c.text.primary }]}>
                {Math.round(progress.percent)}
                <Text style={[text.bodyMedium, { color: c.text.secondary }]}> %</Text>
              </Text>
              <ProgressBar value={progress.percent} label={`${Number(today.slice(5, 7))}월 달성률`} />
              <Text style={[text.label, { color: c.text.secondary }]}>
                {progress.totalDays}일 중 {progress.workoutDays}일
              </Text>
            </View>
            <View style={s.tile}>
              <Text style={[text.caption, { color: c.text.secondary }]}>이번 주</Text>
              <Text style={[text.titleL, { color: c.text.primary }]}>
                {weekCount}
                <Text style={[text.bodyMedium, { color: c.text.secondary }]}> 회</Text>
              </Text>
              <WeekBars days={week} grouped={grouped} />
            </View>
          </View>
          {friends}
        </>
      )}
      <WorkoutDetail
        visible={!!detail}
        workout={detail}
        journal={detail ? journals.find((j) => j.workoutId === detail.id) : undefined}
        onClose={() => setDetail(null)}
        onJournal={onJournal}
        onDelete={onDelete}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: tokens.space[12] },
  tile: {
    flex: 1,
    backgroundColor: c.bg.surface,
    borderRadius: tokens.radius.xl,
    padding: tokens.space[16],
    gap: tokens.space[8],
  },
  bars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 22, maxWidth: 140 },
  bar: { width: 12, height: 3, borderRadius: 3, backgroundColor: c.line.default },
});
