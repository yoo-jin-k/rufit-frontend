/**
 * Figma 02-08 운동 기록 상세입니다. 사진(오운완), 운동 시간·총 볼륨·완료 세트, 종목별 세트, 오운완 메모를 보여 줍니다.
 * 오른쪽 위 더보기에서 오운완 작성·수정과 기록 삭제를 고릅니다.
 */
import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { AppModal } from '../../components/AppModal';
import { LikeButton } from '../../components/LikeButton';
import { IconButton, NavBar, Screen } from '../../components/kit/Screen';
import { BottomSheet, ConfirmDialog, ListGroup, ListRow, PhotoPlaceholder } from '../../components/kit/Surfaces';
import { text, tokens } from '../../theme/tokens';
import { bodyParts, equipmentLabels, findCatalogExercise } from '../exercises/catalog';
import type { Journal } from '../profile/journalModel';
import type { Workout } from './model';
import { completedSets, formatNumber, recordTitle, workoutMinutes, workoutVolume } from './recordFormat';

const c = tokens.color;

/** 큰 숫자 세 칸(시간·볼륨·세트)입니다. 화면 폭에 맞춰 같은 폭으로 나눕니다. */
export function StatTriplet({ items, size = 'titleM' }: { items: { value: string; label: string }[]; size?: 'titleM' | 'titleL' }) {
  return (
    <View style={s.stats}>
      {items.map((item) => (
        <View key={item.label} style={s.stat}>
          <Text style={[text[size], { color: c.text.primary }]}>{item.value}</Text>
          <Text style={[text.label, { color: c.text.secondary }]}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

export function WorkoutDetail({
  workout,
  journal,
  visible,
  onClose,
  onJournal,
  onDelete,
}: {
  workout: Workout | null;
  journal?: Journal;
  visible: boolean;
  onClose: () => void;
  onJournal?: (workout: Workout) => void;
  onDelete?: (id: string) => void;
}) {
  const [menu, setMenu] = useState(false);
  const [confirm, setConfirm] = useState(false);
  if (!workout) return null;
  const minutes = workoutMinutes(workout);
  const photo = journal?.photos?.[0] ?? journal?.photo;
  const exercises = workout.exercises.filter((e) => e.sets.some((set) => set.completed));
  const hasMenu = !!onJournal || !!onDelete;
  return (
    <AppModal visible={visible} animationType="slide" onRequestClose={onClose}>
      <Screen
        header={
          <NavBar
            title={recordTitle(workout)}
            onLeading={onClose}
            trailing={hasMenu && <IconButton icon="dots" label="더보기" onPress={() => setMenu(true)} />}
          />
        }
      >
        {photo ? (
          <Image source={{ uri: photo }} accessibilityLabel="오운완 사진" style={s.photo} resizeMode="cover" />
        ) : (
          <PhotoPlaceholder style={s.photo} />
        )}
        <StatTriplet
          items={[
            { value: minutes === null ? '미측정' : `${minutes}분`, label: '운동 시간' },
            { value: `${formatNumber(workoutVolume(workout))}kg`, label: '총 볼륨' },
            { value: `${completedSets(workout)}세트`, label: '완료 세트' },
          ]}
        />
        {exercises.map((exercise) => {
          const item = findCatalogExercise(exercise.catalogId);
          return (
            <View key={exercise.id} style={s.exercise}>
              <View style={s.between}>
                <Text style={[text.bodyBold, { color: c.text.primary, flex: 1 }]}>{exercise.name}</Text>
                {item && (
                  <Text style={[text.label, { color: c.text.muted }]}>
                    {bodyParts[item.bodyPart]} · {equipmentLabels[item.equipment]}
                  </Text>
                )}
              </View>
              {exercise.sets
                .filter((set) => set.completed)
                .map((set, index) => (
                  <View key={set.id} style={s.setRow}>
                    <Text style={[text.caption, { color: c.text.secondary, flex: 1 }]}>{index + 1}세트</Text>
                    <Text style={[text.calloutBold, { color: c.text.primary }]}>
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
          <View style={{ gap: 6 }}>
            <View style={s.between}>
              <Text style={[text.label, { color: c.text.muted }]}>오운완 메모</Text>
              <LikeButton post={`own:${workout.id}`} />
            </View>
            <Text style={[text.bodyMedium, { color: c.text.primary }]}>{journal.memo || '메모 없이 남긴 기록입니다.'}</Text>
          </View>
        )}
      </Screen>
      <BottomSheet visible={menu} title="기록 관리" onClose={() => setMenu(false)}>
        <ListGroup>
          {onJournal && (
            <ListRow
              icon="pencil"
              label={journal ? '오운완 수정' : '오운완 작성'}
              onPress={() => {
                setMenu(false);
                onClose();
                onJournal(workout);
              }}
            />
          )}
          {onDelete && (
            <ListRow icon="trash" label="기록 삭제" danger trailing="none" onPress={() => { setMenu(false); setConfirm(true); }} />
          )}
        </ListGroup>
      </BottomSheet>
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
          onClose();
        }}
      />
    </AppModal>
  );
}

const s = StyleSheet.create({
  photo: { width: '100%', aspectRatio: 362 / 200, borderRadius: tokens.radius.xl },
  stats: { flexDirection: 'row', gap: tokens.space[12] },
  stat: { flex: 1, gap: 0 },
  exercise: { gap: tokens.space[8] },
  between: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  setRow: {
    backgroundColor: c.bg.surface,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space[16],
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
  },
});
