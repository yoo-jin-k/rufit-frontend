/** 운동 기록 한 건의 요약·종목별 세트·오운완 메모를 카드 하나에 모두 보여줍니다. 편집·삭제는 카드 오른쪽 위 아이콘으로 제공합니다. */
import { Alert, Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { LikeButton } from '../../components/LikeButton';
import { ui } from '../../components/ScreenLayout';
import { colors } from '../../theme/tokens';
import type { Journal } from '../profile/journalModel';
import { completedWorkoutSummary } from './completedWorkoutSummary';
import type { Workout } from './model';

export function WorkoutRecordCard({ workout, journal, onJournal, onDelete }: {
  workout: Workout;
  journal?: Journal;
  onJournal?: (workout: Workout) => void;
  onDelete?: (id: string) => void;
}) {
  const summary = completedWorkoutSummary(workout);
  const started = new Date(workout.startedAt).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' });
  const title = workout.entryMode === 'manual' ? '직접 입력한 운동' : `${started} 운동`;
  const exercises = workout.exercises.filter((exercise) => exercise.sets.some((set) => set.completed));
  function confirmDelete() {
    Alert.alert('이 운동 기록을 삭제할까요?', '선택한 운동 기록만 삭제합니다. 이미 작성한 오운완은 유지됩니다.', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => onDelete?.(workout.id) },
    ]);
  }
  return (
    <View style={ui.card}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 4 }}>
        <View style={{ flex: 1, gap: 4, paddingTop: 10 }}>
          <Text style={ui.heading}>{title}</Text>
          <Text style={ui.muted}>
            {summary.duration} · {summary.volume} kg{summary.parts ? ` · ${summary.parts}` : ''}
          </Text>
        </View>
        {onJournal && (
          <Pressable accessibilityRole="button" accessibilityLabel={`${title} 오운완 작성·수정`}
            onPress={() => onJournal(workout)} style={iconButton}>
            <AppIcon name="edit" size={18} color={colors.text} />
          </Pressable>
        )}
        {onDelete && (
          <Pressable accessibilityRole="button" accessibilityLabel={`${title} 기록 삭제`}
            onPress={confirmDelete} style={iconButton}>
            <AppIcon name="close" size={18} color={colors.text} />
          </Pressable>
        )}
      </View>
      {exercises.map((exercise) => (
        <View key={exercise.id} style={{ gap: 4 }}>
          <Text style={[ui.body, { fontWeight: '700' }]}>{exercise.name}</Text>
          {exercise.sets
            .filter((set) => set.completed)
            .map((set, index) => (
              <Text key={set.id} style={ui.muted}>
                {index + 1}세트　{set.weight} kg × {set.reps}회
              </Text>
            ))}
        </View>
      ))}
      {!exercises.length && <Text style={ui.muted}>완료한 세트 없이 시간만 기록했어요.</Text>}
      {journal && (
        <View style={{ gap: 6 }}>
          <View style={ui.between}>
            <Text style={[ui.body, { fontWeight: '700' }]}>오운완 메모</Text>
            <LikeButton post={`own:${workout.id}`} />
          </View>
          <Text style={ui.body}>{journal.memo || '메모 없이 남긴 기록입니다.'}</Text>
        </View>
      )}
    </View>
  );
}

const iconButton = { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' } as const;
