/**
 * 주간/월간 운동 달력입니다. 펼치거나 접어도 선택 날짜와 실제 기록을 유지합니다.
 * 운동한 날은 검정 체크(월간은 검정 원), 오늘은 파란 테두리, 선택한 날은 테두리 상자로 표시합니다.
 */
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { EmptyCard } from '../../components/kit/Surfaces';
import { text, tokens } from '../../theme/tokens';
import type { Workout } from '../workout/model';
import { WorkoutRecordCard } from '../workout/WorkoutRecordCard';
import { formatDay } from '../workout/recordFormat';
import { calendarDays, localDay, shiftMonth, workoutsByDay } from './model';
import { monthlyProgress } from './monthlyProgress';

const c = tokens.color;
const weekdayNames = ['월', '화', '수', '목', '금', '토', '일'];

export function WorkoutCalendar({
  history,
  ready,
  now,
  monthly = false,
  selected: selectedProp,
  onSelect,
  expanded: expandedProp,
  onExpand,
  onOpenRecord,
  renderDay,
}: {
  history: Workout[];
  ready: boolean;
  now: number;
  /** 프로필 달력처럼 항상 월간으로만 보여 줄 때 씁니다. */
  monthly?: boolean;
  selected?: string;
  onSelect?: (day: string) => void;
  expanded?: boolean;
  onExpand?: (expanded: boolean) => void;
  onOpenRecord?: (workout: Workout) => void;
  /** 선택한 날짜 아래 내용을 화면마다 다르게 그릴 때 씁니다. 없으면 기록 카드 목록을 보여 줍니다. */
  renderDay?: (day: string, records: Workout[]) => ReactNode;
}) {
  const today = localDay(now);
  const [ownExpanded, setOwnExpanded] = useState(monthly);
  const [ownSelected, setOwnSelected] = useState(today);
  const expanded = monthly || (expandedProp ?? ownExpanded);
  const selected = selectedProp ?? ownSelected;
  const select = (day: string) => (onSelect ? onSelect(day) : setOwnSelected(day));
  const expand = (value: boolean) => (onExpand ? onExpand(value) : setOwnExpanded(value));
  const grouped = useMemo(() => workoutsByDay(history), [history]);
  const week = calendarDays(selected, false);
  const weekCount = week.filter((d) => grouped[d]?.length).length;
  const month = selected.slice(0, 7);
  const move = (amount: number) => select(shiftMonth(month, amount) + '-01');
  const records = grouped[selected] ?? [];
  return (
    <View style={s.wrap}>
      {expanded ? (
        <View style={s.block}>
          <View style={s.rowBetween}>
            <Pressable accessibilityRole="button" accessibilityLabel="오늘 날짜로 이동" onPress={() => select(today)}>
              <Text style={[text.bodyBold, { color: c.text.primary }]}>
                {Number(month.slice(0, 4))}년 {Number(month.slice(5, 7))}월
              </Text>
            </Pressable>
            <View style={s.arrows}>
              <Pressable accessibilityRole="button" accessibilityLabel="이전 달" onPress={() => move(-1)} style={s.arrow}>
                <AppIcon name="chevron-left" />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="다음 달" onPress={() => move(1)} style={s.arrow}>
                <AppIcon name="chevron-right" />
              </Pressable>
            </View>
          </View>
          <MonthGrid month={month} today={today} selected={selected} grouped={grouped} onSelect={select} />
        </View>
      ) : (
        <View style={s.block}>
          <View style={s.rowBetween}>
            <Text style={[text.bodyBold, { color: c.text.primary, flex: 1 }]}>
              {week.includes(today) ? '이번 주' : `${formatDay(week[0], 'compact').replace(/ .$/, '')} 주`}
            </Text>
            <Text style={[text.caption, { color: c.text.secondary }]}>{weekCount}일 운동</Text>
          </View>
          <WeekStrip days={week} today={today} selected={selected} grouped={grouped} onSelect={select} />
        </View>
      )}
      {!monthly && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`운동 캘린더 ${expanded ? '접기' : '펼치기'}`}
          accessibilityState={{ expanded }}
          aria-expanded={expanded}
          onPress={() => expand(!expanded)}
          style={s.toggle}
        >
          <AppIcon name={expanded ? 'chevron-up' : 'chevron-down'} color={c.text.secondary} />
        </Pressable>
      )}
      {renderDay ? (
        renderDay(selected, records)
      ) : expanded && selected === today && !monthly ? (
        <MonthProgressCard history={history} month={month} />
      ) : (
        selected !== today && (
          <DayRecords day={selected} records={records} ready={ready} onOpenRecord={onOpenRecord} />
        )
      )}
    </View>
  );
}

/** 선택한 날짜의 기록 목록입니다. 기록이 없으면 빈 상태 카드를 보여 줍니다. */
export function DayRecords({
  day,
  records,
  ready,
  onOpenRecord,
}: {
  day: string;
  records: Workout[];
  ready: boolean;
  onOpenRecord?: (workout: Workout) => void;
}) {
  return (
    <View style={s.block}>
      <View style={s.rowBetween}>
        <Text accessibilityRole="header" style={[text.headline, { color: c.text.primary, flex: 1 }]}>
          {formatDay(day)}
        </Text>
        {!!records.length && <Text style={[text.caption, { color: c.text.secondary }]}>{records.length}개 운동</Text>}
      </View>
      {!ready ? (
        <Text style={[text.caption, { color: c.text.secondary }]}>기록을 불러오고 있어요.</Text>
      ) : records.length ? (
        records.map((w) => (
          <WorkoutRecordCard key={w.id} workout={w} onPress={onOpenRecord && (() => onOpenRecord(w))} />
        ))
      ) : (
        <EmptyCard icon="calendar" title="이날은 기록이 없어요" body="운동했다면 지금 기록해도 돼요" />
      )}
    </View>
  );
}

/** 월간 달력 아래의 달성률 카드입니다. 같은 날 여러 번 운동해도 하루로 셉니다. */
export function MonthProgressCard({ history, month }: { history: Workout[]; month: string }) {
  const progress = monthlyProgress(history, month);
  return (
    <View style={{ gap: tokens.space[12] }}>
      <View style={s.progress}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[text.label, { color: c.text.secondary }]}>{Number(month.slice(5))}월 달성률</Text>
          <Text style={[text.captionBold, { color: c.text.primary }]}>
            {progress.totalDays}일 중 {progress.workoutDays}일 운동
          </Text>
        </View>
        <Text style={[text.titleM, { color: c.text.primary }]}>
          {Math.round(progress.percent)}
          <Text style={[text.caption, { color: c.text.secondary }]}> %</Text>
        </Text>
      </View>
      <Text style={[text.label, { color: c.text.muted }]}>날짜를 누르면 그날 기록을 볼 수 있어요</Text>
    </View>
  );
}

/** Figma WeekDay 7개입니다. 화면 폭에 맞춰 칸 사이 간격이 늘거나 줄어듭니다. */
export function WeekStrip({
  days,
  today,
  selected,
  grouped,
  onSelect,
}: {
  days: string[];
  today: string;
  selected: string;
  grouped: Record<string, Workout[]>;
  onSelect: (day: string) => void;
}) {
  return (
    <View style={s.week}>
      {days.map((d, i) => {
        const done = !!grouped[d]?.length;
        const isToday = d === today;
        const isSelected = d === selected && !isToday;
        return (
          <Pressable
            key={d}
            accessibilityRole="button"
            accessibilityLabel={`${d}, 완료한 운동 ${grouped[d]?.length ?? 0}회`}
            accessibilityState={{ selected: d === selected }}
            aria-selected={d === selected}
            onPress={() => onSelect(d)}
            style={[s.weekDay, isSelected && s.weekSelected]}
          >
            <Text style={[text.label, { color: c.text.muted }]}>{weekdayNames[i]}</Text>
            <View style={[s.weekCircle, done ? s.done : isToday ? s.todayRing : s.plain]}>
              {done ? (
                <AppIcon name="check" size={18} color={c.text.inverse} strokeWidth={2} />
              ) : (
                <Text style={[isToday ? text.captionBold : text.caption, { color: isToday ? c.text.primary : c.text.muted }]}>
                  {Number(d.slice(-2))}
                </Text>
              )}
            </View>
            <View style={[s.dot, !(isToday && !done) && s.hidden]} />
          </Pressable>
        );
      })}
    </View>
  );
}

/** Figma MonthDay 격자입니다. 이번 달이 아닌 칸은 비워 둡니다. */
export function MonthGrid({
  month,
  today,
  selected,
  grouped,
  onSelect,
  disableFuture = false,
}: {
  month: string;
  today: string;
  selected: string;
  grouped: Record<string, Workout[]>;
  onSelect: (day: string) => void;
  /** 날짜 고르기에서 오늘 이후 날짜를 누를 수 없게 합니다. */
  disableFuture?: boolean;
}) {
  const days = calendarDays(`${month}-01`, true);
  return (
    <View>
      <View style={s.grid}>
        {weekdayNames.map((d) => (
          <Text key={d} style={[text.label, s.weekday]}>
            {d}
          </Text>
        ))}
      </View>
      <View style={s.grid}>
        {days.map((d) => {
          if (d.slice(0, 7) !== month) return <View key={d} style={s.monthCell} />;
          const done = !!grouped[d]?.length;
          const future = d > today;
          const isSelected = d === selected && d !== today;
          return (
            <Pressable
              key={d}
              accessibilityRole="button"
              accessibilityLabel={`${d}, 완료한 운동 ${grouped[d]?.length ?? 0}회`}
              accessibilityState={{ selected: d === selected, disabled: disableFuture && future }}
              aria-selected={d === selected}
              disabled={disableFuture && future}
              onPress={() => onSelect(d)}
              style={s.monthCell}
            >
              <View style={[s.ring, isSelected && s.ringOn]}>
                <View style={[s.monthCircle, done ? s.done : d === today ? s.todayRing : null]}>
                  <Text
                    style={[
                      done || d === today ? text.captionBold : text.caption,
                      { color: done ? c.text.inverse : future ? c.text.disabled : c.text.primary },
                    ]}
                  >
                    {Number(d.slice(-2))}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: tokens.space[12] },
  block: { gap: 10 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  arrows: { flexDirection: 'row', marginRight: -10 },
  arrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  toggle: { minHeight: 28, alignItems: 'center', justifyContent: 'center', marginTop: -6 },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  weekDay: {
    width: 44,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    borderRadius: tokens.radius.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  weekSelected: { borderColor: c.text.primary },
  weekCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  plain: { backgroundColor: c.bg.default, borderWidth: 1, borderColor: c.line.input },
  done: { backgroundColor: c.bg.inverse },
  todayRing: { backgroundColor: c.bg.default, borderWidth: 1.5, borderColor: c.accent.default },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: c.accent.default },
  hidden: { opacity: 0 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { width: '14.2857%', textAlign: 'center', color: c.text.muted, paddingVertical: 8 },
  monthCell: { width: '14.2857%', height: 48, alignItems: 'center', justifyContent: 'center' },
  ring: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  ringOn: { borderColor: c.text.primary },
  monthCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  progress: {
    backgroundColor: c.bg.surface,
    borderRadius: tokens.radius.xl,
    padding: tokens.space[16],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});

