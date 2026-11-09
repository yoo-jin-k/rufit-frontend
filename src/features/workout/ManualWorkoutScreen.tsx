import { AppModal as Modal } from '../../components/AppModal';
/**
 * Figma 04 지난 운동 입력 화면입니다. 지난 날짜의 종목과 세트를 입력하는 임시 작성 화면입니다.
 * 저장 버튼을 누르기 전까지 입력값은 이 화면의 메모리에만 있으며, 닫을 때 버림 여부를 확인합니다.
 * 현재 진행 중인 운동과 휴식 타이머는 변경하지 않습니다.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { Button } from '../../components/Button';
import { NavBar, Screen } from '../../components/kit/Screen';
import { BottomSheet, ConfirmDialog, EmptyCard, ListGroup, ListRow } from '../../components/kit/Surfaces';
import { text, tokens } from '../../theme/tokens';
import { DateField } from '../calendar/DateField';
import { bodyParts, equipmentLabels, findCatalogExercise } from '../exercises/catalog';
import { ExerciseMedia } from '../exercises/ExerciseMedia';
import { ExercisePicker } from '../exercises/ExercisePicker';
import { PreviousSets } from './PreviousSets';
import { importPreviousSets, previousExercises } from './previousSetModel';
import { SetCountControl, SetHeader, SetRow } from './SetRow';
import { SortableSets } from './SortableSets';
import { addExercise, addSet, removeSet, moveSet, startWorkout, updateSet, type Workout } from './model';
import { completeManualWorkout } from './manualWorkout';
let sequence = 0;
const id = () => `manual-${Date.now()}-${++sequence}`;
export function ManualWorkoutScreen({
  initialDate,
  history,
  onClose,
  onSave,
}: {
  initialDate: string;
  history: Workout[];
  onClose: () => void;
  onSave: (workout: Workout) => void;
}) {
  const [loadExerciseId, setLoadExerciseId] = useState<string | null>(null);
  const [date, setDate] = useState(initialDate);
  const [draft, setDraft] = useState(() => startWorkout(id(), Date.now()));
  const [picker, setPicker] = useState(false);
  const [error, setError] = useState('');
  const [confirmClose, setConfirmClose] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const menuExercise = draft.exercises.find((e) => e.id === menuId);
  function change(fn: (w: Workout) => Workout) {
    try {
      setDraft(fn(draft));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '입력값을 확인해 주세요.');
    }
  }
  const close = () => (draft.exercises.length ? setConfirmClose(true) : onClose());
  const dayLabel = `${Number(date.slice(5, 7))}월 ${Number(date.slice(8))}일`;
  const totalSets = draft.exercises.reduce((n, e) => n + e.sets.length, 0);
  const filledSets = draft.exercises.reduce((n, e) => n + e.sets.filter((set) => set.weight && set.reps).length, 0);
  return (
    <Modal
      visible
      animationType="slide"
      onRequestClose={close}
    >
      <Screen
        keyboard="cover"
        header={<NavBar title="과거 기록 추가" leading="close" onLeading={close} />}
        footer={
          draft.exercises.length ? (
            <Button
              title="저장"
              accessibilityLabel={`${dayLabel}에 저장`}
              onPress={() => {
                try {
                  onSave(completeManualWorkout(draft, date));
                } catch (e) {
                  setError(e instanceof Error ? e.message : '기록을 추가하지 못했습니다.');
                }
              }}
            />
          ) : (
            <Button title="종목 추가" onPress={() => setPicker(true)} />
          )
        }
      >
        <DateField label="날짜" accessibilityLabel="운동한 날짜" value={date} onChange={setDate} />
        {!draft.exercises.length && (
          <>
            <EmptyCard icon="dumbbell" title="어떤 운동을 했나요?" body="종목을 추가하고 세트를 입력해요" />
            <Text style={[text.label, { color: tokens.color.text.muted }]}>
              운동 날짜는 {dayLabel}로, 저장 시각과 따로 기록돼요. 운동 시간은 재지 않아요.
            </Text>
          </>
        )}
        {draft.exercises.map((exercise) => {
          const item = findCatalogExercise(exercise.catalogId);
          const prev = previousExercises(history, exercise)[0]?.exercise;
          return (
            <View key={exercise.id} style={{ gap: tokens.space[4] }}>
              <View style={ms.exercise}>
                <ExerciseMedia exercise={item} size={44} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={[text.bodyBold, { color: tokens.color.text.primary }]}>{exercise.name}</Text>
                  <Text style={[text.label, { color: tokens.color.text.secondary }]}>
                    {item ? `${bodyParts[item.bodyPart]} · ${equipmentLabels[item.equipment]}` : '직접 입력한 종목'}
                  </Text>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={`${exercise.name} 더보기`} hitSlop={10}
                  onPress={() => setMenuId(exercise.id)} style={ms.dots}>
                  <AppIcon name="dots" color={tokens.color.text.secondary} />
                </Pressable>
              </View>
              <SetHeader name={exercise.name} manual />
              <SortableSets sets={exercise.sets} name={exercise.name} disabled={false}
                onMove={(setId, target) => change((w) => moveSet(w, exercise.id, setId, target))}>
                {(set, index, handle) => <SetRow key={set.id} set={set} index={index} manual
                  dragHandle={handle} exerciseName={exercise.name} finished={false}
                  previous={prev?.sets[index] ? `${prev.sets[index].weight}×${prev.sets[index].reps}` : undefined}
                  onChange={(patch) => change((w) => updateSet(w, exercise.id, set.id, patch))}
                  onComplete={() => change((w) => updateSet(w, exercise.id, set.id, { completed: !set.completed }))}
                  onDelete={() => change((w) => removeSet(w, exercise.id, set.id))}
                  onDuplicate={() => change((w) => addSet(w, exercise.id, id(), set.id))} />}
              </SortableSets>
              <SetCountControl
                name={exercise.name}
                count={exercise.sets.length}
                onAdd={() => change((w) => addSet(w, exercise.id, id(), exercise.sets.at(-1)?.id))}
                onRemove={() => {
                  const last = exercise.sets.at(-1);
                  if (last) change((w) => removeSet(w, exercise.id, last.id));
                }}
                onLoad={() => setLoadExerciseId(exercise.id)}
              />
            </View>
          );
        })}
        {!!draft.exercises.length && (
          <>
            <Button title="종목 추가" variant="soft" size="md" icon={<AppIcon name="plus" />} onPress={() => setPicker(true)} />
            <Text style={[text.label, { color: tokens.color.text.muted }]}>
              {totalSets}세트 중 {filledSets}세트 입력됨 · 무게와 횟수를 모두 입력해야 저장돼요
            </Text>
          </>
        )}
        {!!error && (
          <Text accessibilityRole="alert" style={[text.caption, { color: tokens.color.danger.default }]}>
            {error}
          </Text>
        )}
      </Screen>
      <BottomSheet visible={!!menuExercise} title={menuExercise?.name ?? ''} onClose={() => setMenuId(null)}>
        {menuExercise && (
          <ListGroup>
            <ListRow icon="trash" label="종목 삭제" accessibilityLabel={`${menuExercise.name} 종목 삭제`} danger trailing="none"
              onPress={() => {
                setMenuId(null);
                change((w) => ({ ...w, exercises: w.exercises.filter((e) => e.id !== menuExercise.id) }));
              }} />
          </ListGroup>
        )}
      </BottomSheet>
      <ConfirmDialog
        visible={confirmClose}
        title="입력한 내용을 버릴까요?"
        message={`${dayLabel} 기록은 저장되지 않아요`}
        cancelLabel="계속 입력"
        confirmLabel="입력 버리고 닫기"
        tone="danger"
        onCancel={() => setConfirmClose(false)}
        onConfirm={onClose}
      />
      {draft.exercises.find((exercise) => exercise.id === loadExerciseId) && (
        <PreviousSets history={history} target={draft.exercises.find((exercise) => exercise.id === loadExerciseId)!}
          onClose={() => setLoadExerciseId(null)} onLoad={(source, replace) => {
            setDraft(importPreviousSets(draft, loadExerciseId!, source, id, replace));
            setError('');
          }} />
      )}
      <ExercisePicker
        visible={picker}
        title={`${dayLabel} · 종목 선택`}
        history={history}
        selectedIds={draft.exercises.flatMap((e) => (e.catalogId ? [e.catalogId] : []))}
        onClose={() => setPicker(false)}
        onSelect={(exercises) => {
          change((w) => exercises.reduce((current, exercise) => addExercise(current, id(), exercise.name, exercise.id), w));
          setPicker(false);
        }}
      />
    </Modal>
  );
}

const ms = StyleSheet.create({
  exercise: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[12], minHeight: 68 },
  dots: { width: 32, height: 44, alignItems: 'center', justifyContent: 'center' },
});
