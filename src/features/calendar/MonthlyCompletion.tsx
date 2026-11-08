/**
 * Figma 03-15 운동 완료 화면입니다. 운동 저장에 성공한 뒤에만 보여 줍니다.
 * 오운완 작성은 별도 흐름이며 '나중에 할게요'를 눌러도 운동 기록은 지우지 않습니다.
 */
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { AppModal as Modal } from '../../components/AppModal';
import { Button } from '../../components/Button';
import { NavBar, Screen } from '../../components/kit/Screen';
import { ProgressBar } from '../../components/kit/Surfaces';
import { text, tokens } from '../../theme/tokens';
import type { Workout } from '../workout/model';
import { completedSets, formatDay, formatNumber, workoutMinutes, workoutVolume } from '../workout/recordFormat';
import { localDay } from './model';
import type { monthlyProgress } from './monthlyProgress';

const c = tokens.color;

export function MonthlyCompletion({
  progress,
  workout,
  onClose,
  onJournal,
}: {
  progress: ReturnType<typeof monthlyProgress> | null;
  workout?: Workout | null;
  onClose: () => void;
  onJournal?: () => void;
}) {
  const [openingJournal, setOpeningJournal] = useState(false);
  if (!progress) return null;
  const minutes = workout ? workoutMinutes(workout) ?? 0 : 0;
  const started = workout
    ? `${formatDay(workout.recordDate ?? localDay(workout.startedAt))} · ${new Date(workout.startedAt).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })}`
    : '';
  const tiles = [
    { label: '운동 시간', value: `${minutes}분` },
    { label: '총 볼륨', value: `${workout ? formatNumber(workoutVolume(workout)) : 0}kg` },
    { label: '완료 세트', value: `${workout ? completedSets(workout) : 0}세트` },
  ];
  return (
    <Modal visible={!openingJournal} animationType="fade" onRequestClose={onClose}
      onDismiss={() => { if (openingJournal) { setOpeningJournal(false); onJournal?.(); } }}>
      <Screen
        header={<NavBar leading="close" onLeading={onClose} />}
        footer={
          <>
            {onJournal && (
              <Button title="오운완 기록하기" onPress={() => { if (Platform.OS === 'ios') setOpeningJournal(true); else onJournal(); }} />
            )}
            <Pressable accessibilityRole="button" onPress={onClose} style={s.later}>
              <Text style={[text.calloutBold, { color: c.text.secondary }]}>나중에 할게요</Text>
            </Pressable>
          </>
        }
      >
        <View style={s.hero}>
          <View style={s.check}>
            <AppIcon name="check" color={c.text.inverse} size={40} strokeWidth={2} />
          </View>
          <Text accessibilityRole="header" style={[text.titleM, { color: c.text.primary }]}>오늘도 해냈어요</Text>
          {!!started && <Text style={[text.caption, { color: c.text.secondary }]}>{started}</Text>}
          <Text style={[text.label, { color: c.text.muted }]}>운동 기록이 이 기기에 저장되었습니다.</Text>
        </View>
        <View style={s.tiles}>
          {tiles.map((t) => (
            <View key={t.label} style={s.tile}>
              <Text style={[text.headline, { color: c.text.primary }]}>{t.value}</Text>
              <Text style={[text.label, { color: c.text.secondary }]}>{t.label}</Text>
            </View>
          ))}
        </View>
        <View style={s.card}>
          <View style={s.row}>
            <Text style={[text.label, { color: c.text.secondary, flex: 1 }]}>{Number(progress.month.slice(5))}월 달성률</Text>
            <Text style={[text.captionBold, { color: c.text.primary }]}>
              {progress.totalDays}일 중 {progress.workoutDays}일
            </Text>
          </View>
          <Text style={[text.titleL, { color: c.text.primary }]}>
            {Math.round(progress.percent)}
            <Text style={[text.bodyMedium, { color: c.text.secondary }]}> %</Text>
          </Text>
          <ProgressBar value={progress.percent} label="이번 달 운동 달성률" />
        </View>
        <Text style={[text.label, { color: c.text.muted }]}>같은 날 여러 번 운동해도 하루로 세요</Text>
      </Screen>
    </Modal>
  );
}

const s = StyleSheet.create({
  hero: { alignItems: 'center', gap: tokens.space[8], paddingTop: tokens.space[24], paddingBottom: tokens.space[8] },
  check: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: c.bg.inverse,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.space[8],
  },
  tiles: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, backgroundColor: c.bg.surface, borderRadius: tokens.radius.xl, paddingVertical: tokens.space[16], alignItems: 'center', gap: 2 },
  card: { backgroundColor: c.bg.surface, borderRadius: tokens.radius.xl, padding: tokens.space[16], gap: tokens.space[8] },
  row: { flexDirection: 'row', alignItems: 'center' },
  later: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
