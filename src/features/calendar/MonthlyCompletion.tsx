import { AppModal as Modal } from '../../components/AppModal';
/** 운동 저장 성공 이후에만 표시합니다. 오운완 작성은 별도 흐름이며 건너뛰어도 운동을 삭제하지 않습니다. */
import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenLayout, ui } from '../../components/ScreenLayout';
import { AppIcon } from '../../components/AppIcon';
import { Button } from '../../components/Button';
import { colors } from '../../theme/tokens';
import type { monthlyProgress } from './monthlyProgress';
import { elapsedWorkoutMs, type Workout } from '../workout/model';
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
  const sets =
    workout?.exercises.reduce((n, e) => n + e.sets.filter((s) => s.completed).length, 0) ?? 0;
  return (
    <Modal visible={!openingJournal} animationType="fade" onRequestClose={onClose}
      onDismiss={() => { if (openingJournal) { setOpeningJournal(false); onJournal?.(); } }}>
      <SafeAreaView style={ui.page}>
        <ScreenLayout
          footer={
            <>
              {onJournal && <Button title="◎ 오운완 기록하기" onPress={() => { if (Platform.OS === 'ios') setOpeningJournal(true); else onJournal(); }} />}
              <Button title="다음에 할게요" secondary onPress={onClose} />
            </>
          }
        >
          <View style={{ alignItems: 'center', gap: 20, paddingVertical: 36 }}>
            <View style={s.check}>
              <AppIcon name="check" color="white" size={28} />
            </View>
            <Text style={ui.title}>오늘도 해냈어요</Text>
            <Text style={ui.muted}>운동 기록이 이 기기에 저장되었습니다.</Text>
          </View>
          <View
            style={[
              ui.row,
              {
                justifyContent: 'space-around',
                paddingVertical: 20,
                borderTopWidth: 1,
                borderBottomWidth: 1,
                borderColor: colors.border,
              },
            ]}
          >
            {[
              {
                label: '운동 시간',
                value: `${workout ? Math.floor(elapsedWorkoutMs(workout, workout.finishedAt ?? workout.startedAt) / 60000) : 0}분`,
              },
              { label: '완료 세트', value: `${sets}세트` },
              { label: '종목', value: `${workout?.exercises.length ?? 0}개` },
            ].map((v) => (
              <View key={v.label} style={{ gap: 8 }}>
                <Text style={ui.muted}>{v.label}</Text>
                <Text style={ui.title}>{v.value}</Text>
              </View>
            ))}
          </View>
          <View style={ui.card}>
            <Text style={ui.muted}>{Number(progress.month.slice(5))}월 달성률</Text>
            <View style={ui.between}>
              <Text style={ui.title}>{progress.percent}%</Text>
              <Text style={ui.muted}>
                {progress.totalDays}일 중 {progress.workoutDays}일 운동
              </Text>
            </View>
            <View
              accessibilityRole="progressbar"
              accessibilityLabel="이번 달 운동 달성률"
              accessibilityValue={{ min: 0, max: 100, now: progress.percent }}
              style={s.track}
            >
              <View style={[s.fill, { width: `${progress.percent}%` }]} />
            </View>
            <Text style={ui.muted}>같은 날 여러 번 운동해도 하루로 계산해요.</Text>
          </View>
        </ScreenLayout>
      </SafeAreaView>
    </Modal>
  );
}
const s = StyleSheet.create({
  check: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: { height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, backgroundColor: colors.text },
});
