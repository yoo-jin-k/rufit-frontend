import { AppModal as Modal } from '../../components/AppModal';
import { useRef, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon } from '../../components/AppIcon';
import { ScreenLayout, ui } from '../../components/ScreenLayout';
import type { Journal } from '../profile/journalModel';
import type { Workout } from './model';
import { completedWorkoutsOnDay, dailyWorkoutSummary } from './completedWorkoutSummary';
import { WorkoutHistory } from './WorkoutHistory';

/** 오늘의 모든 완료 기록은 카드 하나로 보여주고 상세에서 저장된 원본 기록을 확인합니다. */
export function TodayWorkoutCard({ history, now, journals, onJournal, onDelete }: {
  onDelete?: (id: string) => void;
  history: Workout[]; now: number; journals: Journal[]; onJournal: (workout: Workout) => void;
}) {
  const pending = useRef<Workout | null>(null);
  function afterClose() { const target = pending.current; pending.current = null; if (target) onJournal(target); }
  const [open, setOpen] = useState(false);
  const records = completedWorkoutsOnDay(history, now);
  if (!records.length) return <View style={ui.card}>
    <Text style={ui.heading}>오늘의 운동을 시작해 보세요</Text>
    <Text style={ui.muted}>운동을 완료하고 저장하면 이곳에 표시됩니다.</Text>
  </View>;
  const summary = dailyWorkoutSummary(records);
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel="오늘의 운동 전체 기록 보기" onPress={() => setOpen(true)} style={ui.card}>
      <View style={ui.between}><Text style={ui.heading}>오늘의 운동</Text><AppIcon name="chevron" size={16} /></View>
      <View style={[ui.row, { flexWrap: 'wrap' }]}><Text style={ui.body}>완료</Text><Text style={ui.muted}>{summary.duration} · {summary.volume} kg</Text></View>
      {!!summary.parts && <Text style={ui.body}>{summary.parts}</Text>}
      <Text style={ui.muted}>{summary.exercises}</Text>
    </Pressable>
    <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)} onDismiss={afterClose}>
      <SafeAreaView style={ui.page}>
        <ScreenLayout title="오늘의 전체 운동 기록" onBack={() => setOpen(false)}>
          <WorkoutHistory records={records} journals={journals} onDelete={onDelete} onJournal={workout => { pending.current = workout; setOpen(false); if (Platform.OS !== 'ios') afterClose(); }} />
        </ScreenLayout>
      </SafeAreaView>
    </Modal>
  </>;
}
