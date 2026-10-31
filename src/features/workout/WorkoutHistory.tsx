import { LikeButton } from '../../components/LikeButton';
import type { Journal } from '../profile/journalModel';
import { Button } from '../../components/Button';
/** 홈·프로필·달력이 같은 기록 요약과 상세 화면을 사용합니다. 샘플 기록을 실제 데이터로 섞지 않습니다. */
import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon } from '../../components/AppIcon';
import { ScreenLayout, ui } from '../../components/ScreenLayout';
import { elapsedWorkoutMs, type Workout } from './model';
import { localDay } from '../calendar/model';
export const workoutDate = (w: Workout) => w.recordDate ?? localDay(w.startedAt);
export const workoutSummary = (w: Workout) =>
  `${w.entryMode === 'manual' ? '시간 미측정' : `${Math.floor(elapsedWorkoutMs(w, w.finishedAt ?? w.startedAt) / 60000)}분`} · ${w.exercises.length}종목 · ${w.exercises.reduce((n, e) => n + e.sets.filter((s) => s.completed).length, 0)}세트`;
export function WorkoutHistory({
  records,
  journals = [],
  onJournal,
}: {
  records: Workout[];
  journals?: Journal[];
  onJournal?: (w: Workout) => void;
}) {
  const [detail, setDetail] = useState<Workout | null>(null);
  return (
    <View style={{ gap: 8 }}>
      {records.length ? (
        [...records]
          .sort((a, b) => workoutDate(b).localeCompare(workoutDate(a)) || b.startedAt - a.startedAt)
          .map((w) => (
            <Pressable
              key={w.id}
              accessibilityRole="button"
              accessibilityLabel={`${workoutDate(w)} 운동 기록 보기`}
              onPress={() => setDetail(w)}
              style={[ui.card, ui.row]}
            >
              <AppIcon name="workout" />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={ui.muted}>{workoutDate(w)}</Text>
                <Text style={ui.heading}>
                  {w.exercises[0]?.name ?? '운동'}
                  {w.exercises.length > 1 ? ' 외' : ''}
                </Text>
                <Text style={ui.muted}>{workoutSummary(w)}</Text>
              </View>
              <AppIcon name="chevron" size={16} />
            </Pressable>
          ))
      ) : (
        <Text style={ui.muted}>아직 기록한 운동이 없어요.</Text>
      )}
      <Modal visible={!!detail} animationType="slide" onRequestClose={() => setDetail(null)}>
        {detail && (
          <SafeAreaView style={ui.page}>
            <ScreenLayout title="운동 기록" onBack={() => setDetail(null)}>
              <Text style={ui.title}>{workoutDate(detail)}</Text>
              <Text style={ui.muted}>{workoutSummary(detail)}</Text>
              {detail.exercises.map((e) => (
                <View key={e.id} style={ui.card}>
                  <Text style={ui.heading}>{e.name}</Text>
                  {e.sets
                    .filter((s) => s.completed)
                    .map((s, i) => (
                      <Text key={s.id} style={ui.body}>
                        {i + 1}세트　{s.weight} kg　×　{s.reps} 회
                      </Text>
                    ))}
                </View>
              ))}
              {journals.find((j) => j.workoutId === detail.id) && (
                <View style={ui.card}>
                  <Text style={ui.heading}>오운완 메모</Text>
                  <LikeButton post={`own:${detail.id}`} />
                  <Text style={ui.body}>
                    {journals.find((j) => j.workoutId === detail.id)?.memo ||
                      '메모 없이 남긴 기록입니다.'}
                  </Text>
                </View>
              )}
              {onJournal && (
                <Button
                  title="오운완 작성·수정"
                  secondary
                  onPress={() => {
                    onJournal(detail);
                    setDetail(null);
                  }}
                />
              )}
            </ScreenLayout>
          </SafeAreaView>
        )}
      </Modal>
    </View>
  );
}
