/** 주간/월간 표시는 바뀌어도 선택 날짜와 실제 기록을 유지합니다. 과거 날짜에만 추가 버튼을 제공합니다. */
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { AppIcon } from '../../components/AppIcon';
import { ui } from '../../components/ScreenLayout';
import { colors } from '../../theme/tokens';
import type { Workout } from '../workout/model';
import { WorkoutHistory } from '../workout/WorkoutHistory';
import { calendarDays, localDay, shiftMonth, workoutsByDay } from './model';
export function WorkoutCalendar({
  history,
  ready,
  now,
  onAdd,
  monthly = false,
}: {
  history: Workout[];
  ready: boolean;
  now: number;
  onAdd?: (date: string) => void;
  monthly?: boolean;
}) {
  const today = localDay(now);
  const [expanded, setExpanded] = useState(monthly);
  const [selected, setSelected] = useState(today);
  const grouped = useMemo(() => workoutsByDay(history), [history]);
  const dates = calendarDays(selected, expanded);
  function move(amount: number) {
    setSelected(shiftMonth(selected.slice(0, 7), amount) + '-01');
  }
  return (
    <View style={{ gap: 20 }}>
      <View style={s.calendar}>
        {expanded && (
          <View style={ui.between}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="이전 달"
              onPress={() => move(-1)}
              style={s.arrow}
            >
              <AppIcon name="back" size={18} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="오늘 날짜로 이동"
              onPress={() => setSelected(today)}
            >
              <Text style={ui.heading}>
                {Number(selected.slice(0, 4))}년 {Number(selected.slice(5, 7))}월
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="다음 달"
              onPress={() => move(1)}
              style={s.arrow}
            >
              <AppIcon name="chevron" size={18} />
            </Pressable>
          </View>
        )}
        <View style={s.grid}>
          {['월', '화', '수', '목', '금', '토', '일'].map((d) => (
            <Text key={d} style={s.weekday}>
              {d}
            </Text>
          ))}
          {dates.map((d) => (
            <Pressable
              key={d}
              accessibilityRole="button"
              accessibilityLabel={`${d}, 완료한 운동 ${grouped[d]?.length ?? 0}회`}
              accessibilityState={{ selected: d === selected }}
              aria-selected={d === selected}
              onPress={() => setSelected(d)}
              style={s.cell}
            >
              <View style={[s.circle, d === selected && s.selected]}>
                <Text
                  style={[
                    s.day,
                    d.slice(0, 7) !== selected.slice(0, 7) && s.other,
                    d === selected && s.white,
                  ]}
                >
                  {Number(d.slice(-2))}
                </Text>
              </View>
              <View style={[s.dot, !grouped[d]?.length && { opacity: 0 }]} />
            </Pressable>
          ))}
        </View>
        {!monthly && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`운동 캘린더 ${expanded ? '접기' : '펼치기'}`}
            accessibilityState={{ expanded }}
            aria-expanded={expanded}
            onPress={() => setExpanded(!expanded)}
            style={s.toggle}
          >
            <Text style={ui.muted}>{expanded ? '주간으로 접기 ⌃' : '월간 달력 보기 ⌄'}</Text>
          </Pressable>
        )}
      </View>
      {(expanded || selected !== today) && (
        <View style={{ gap: 12 }}>
          <Text style={ui.heading}>
            {Number(selected.slice(5, 7))}월 {Number(selected.slice(8))}일 운동
          </Text>
          {!ready ? (
            <Text style={ui.muted}>기록을 불러오고 있어요.</Text>
          ) : (
            <WorkoutHistory records={grouped[selected] ?? []} />
          )}
          {onAdd && ready && selected < today && (
            <Button title="＋ 이 날짜에 기록 추가" secondary onPress={() => onAdd(selected)} />
          )}
        </View>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  calendar: { backgroundColor: colors.primarySoft, borderRadius: 18, padding: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: {
    width: '14.285714%',
    textAlign: 'center',
    fontSize: 11,
    color: colors.muted,
    paddingVertical: 10,
  },
  cell: {
    width: '14.285714%',
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  circle: {
    minWidth: 32,
    minHeight: 32,
    borderRadius: 18,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: { backgroundColor: colors.primary },
  day: { fontSize: 14, color: colors.text },
  white: { color: colors.onPrimary, fontWeight: '700' },
  other: { color: colors.muted },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.text },
  toggle: { minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  arrow: {
    padding: 10,
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
