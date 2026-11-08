/** 운동 기록 한 건의 요약·종목별 세트·오운완 메모를 카드 하나에 모두 보여줍니다. 오운완 작성과 삭제는 카드 오른쪽 위 아이콘으로 제공합니다. */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { LikeButton } from '../../components/LikeButton';
import { ConfirmDialog } from '../../components/kit/Surfaces';
import { text, tokens } from '../../theme/tokens';
import type { Journal } from '../profile/journalModel';
import { recordMeta, recordTitle } from './recordFormat';
import type { Workout } from './model';

const c = tokens.color;

export function WorkoutRecordCard({ workout, journal, onJournal, onDelete, onPress }: {
  workout: Workout;
  journal?: Journal;
  onJournal?: (workout: Workout) => void;
  onDelete?: (id: string) => void;
  /** 카드를 누르면 상세 화면을 엽니다. 없으면 카드는 눌리지 않습니다. */
  onPress?: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const title = recordTitle(workout);
  const exercises = workout.exercises.filter((exercise) => exercise.sets.some((set) => set.completed));
  const body = (
    <>
      <View style={s.head}>
        <View style={s.titles}>
          <Text style={[text.bodyBold, { color: c.text.primary }]}>{title}</Text>
          <Text style={[text.label, { color: c.text.secondary }]}>{recordMeta(workout)}</Text>
        </View>
        {onJournal && (
          <Pressable accessibilityRole="button" accessibilityLabel={`${title} 오운완 작성·수정`}
            onPress={() => onJournal(workout)} style={s.icon}>
            <AppIcon name="pencil" color={c.text.secondary} />
          </Pressable>
        )}
        {onDelete && (
          <Pressable accessibilityRole="button" accessibilityLabel={`${title} 기록 삭제`}
            onPress={() => setConfirm(true)} style={s.icon}>
            <AppIcon name="close" color={c.text.secondary} />
          </Pressable>
        )}
      </View>
      {exercises.map((exercise) => {
        const sets = exercise.sets.filter((set) => set.completed);
        return (
          <View key={exercise.id} style={s.exercise}>
            <View style={s.exerciseHead}>
              <Text style={[text.calloutBold, { color: c.text.primary, flex: 1 }]}>{exercise.name}</Text>
              <Text style={[text.label, { color: c.text.muted }]}>{sets.length}세트</Text>
            </View>
            {sets.map((set, index) => (
              <View key={set.id} style={s.setLine}>
                <Text style={[text.caption, s.setIndex]}>{index + 1}</Text>
                <Text style={[text.caption, { color: c.text.primary }]}>
                  {set.weight}kg × {set.reps}회
                </Text>
              </View>
            ))}
          </View>
        );
      })}
      {!exercises.length && (
        <Text style={[text.caption, { color: c.text.secondary }]}>완료한 세트 없이 시간만 기록했어요.</Text>
      )}
      {journal && (
        <View style={s.memo}>
          <View style={s.exerciseHead}>
            <Text style={[text.label, { color: c.text.muted, flex: 1 }]}>오운완 메모</Text>
            <LikeButton post={`own:${workout.id}`} />
          </View>
          <Text style={[text.body, { color: c.text.primary }]}>{journal.memo || '메모 없이 남긴 기록입니다.'}</Text>
        </View>
      )}
    </>
  );
  return (
    <>
      {onPress ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`${title} 상세 보기`} onPress={onPress}
          style={({ pressed }) => [s.card, pressed && { opacity: 0.85 }]}>
          {body}
        </Pressable>
      ) : (
        <View style={s.card}>{body}</View>
      )}
      <ConfirmDialog
        visible={confirm}
        title="이 운동 기록을 삭제할까요?"
        message="선택한 운동 기록만 삭제합니다. 이미 작성한 오운완은 유지됩니다."
        confirmLabel="삭제"
        tone="danger"
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          onDelete?.(workout.id);
        }}
      />
    </>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: c.bg.surface, borderRadius: tokens.radius.xl, padding: tokens.space[16], gap: tokens.space[12] },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  titles: { flex: 1, gap: 2 },
  icon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginTop: -4 },
  exercise: { gap: 4 },
  exerciseHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  setLine: { flexDirection: 'row', gap: 12 },
  setIndex: { color: c.text.muted, width: 8 },
  memo: { gap: 6, borderTopWidth: 1, borderColor: c.line.default, paddingTop: tokens.space[12] },
});
