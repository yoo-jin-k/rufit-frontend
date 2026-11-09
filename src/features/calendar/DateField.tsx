/**
 * Figma 날짜 칸(달력 아이콘 · 11월 5일 (목) · 펼침 화살표)입니다.
 * 누르면 월간 달력 시트가 열리고, 오늘 이후 날짜는 고를 수 없습니다. 기기마다 다른 날짜 입력 대신 같은 달력을 씁니다.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { BottomSheet } from '../../components/kit/Surfaces';
import { text, tokens } from '../../theme/tokens';
import { formatDay } from '../workout/recordFormat';
import { localDay, shiftMonth } from './model';
import { MonthGrid } from './WorkoutCalendar';

const c = tokens.color;

export function DateField({
  label,
  value,
  onChange,
  disabled,
  accessibilityLabel = '날짜',
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(value.slice(0, 7));
  // 시트를 여는 순간의 오늘 날짜를 기준으로 미래 날짜를 막습니다.
  const [today, setToday] = useState(() => localDay(Date.now()));
  return (
    <View style={s.field}>
      {!!label && <Text style={[text.label, { color: c.text.secondary }]}>{label}</Text>}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${accessibilityLabel}, ${formatDay(value, 'short')}, 바꾸기`}
        disabled={disabled}
        onPress={() => {
          setMonth(value.slice(0, 7));
          setToday(localDay(Date.now()));
          setOpen(true);
        }}
        style={[s.box, open && s.boxOpen]}
      >
        <AppIcon name="calendar" />
        <Text style={[text.bodyBold, { color: c.text.primary, flex: 1 }]}>{formatDay(value, 'short')}</Text>
        <AppIcon name="chevron-down" color={c.text.secondary} />
      </Pressable>
      <BottomSheet visible={open} title="날짜 선택" onClose={() => setOpen(false)}>
        <View style={s.head}>
          <Text style={[text.bodyBold, { color: c.text.primary, flex: 1 }]}>
            {Number(month.slice(0, 4))}년 {Number(month.slice(5))}월
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel="이전 달" onPress={() => setMonth(shiftMonth(month, -1))} style={s.arrow}>
            <AppIcon name="chevron-left" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="다음 달"
            disabled={month >= today.slice(0, 7)}
            onPress={() => setMonth(shiftMonth(month, 1))}
            style={s.arrow}
          >
            <AppIcon name="chevron-right" color={month >= today.slice(0, 7) ? c.text.disabled : c.text.primary} />
          </Pressable>
        </View>
        <MonthGrid
          month={month}
          today={today}
          selected={value}
          grouped={{}}
          disableFuture
          onSelect={(day) => {
            onChange(day);
            setOpen(false);
          }}
        />
      </BottomSheet>
    </View>
  );
}

const s = StyleSheet.create({
  field: { gap: tokens.space[8] },
  box: {
    minHeight: tokens.size.input,
    borderWidth: 1,
    borderColor: c.line.input,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space[16],
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[12],
    backgroundColor: c.bg.default,
  },
  boxOpen: { borderColor: c.text.primary },
  head: { flexDirection: 'row', alignItems: 'center' },
  arrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
