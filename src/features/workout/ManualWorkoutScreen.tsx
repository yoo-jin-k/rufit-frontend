import { ScreenLayout } from '../../components/ScreenLayout';
/**
 * 지난 운동의 종목과 세트를 입력하는 임시 작성 화면입니다.
 * 저장 버튼을 누르기 전까지 입력값은 이 화면의 메모리에만 있으며, 닫을 때 버림 여부를 확인합니다.
 * 현재 진행 중인 운동과 휴식 타이머는 변경하지 않습니다.
 */
import { useState } from 'react';
import { Modal, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { ExercisePicker } from '../exercises/ExercisePicker';
import { MeasurementDate } from '../strength/MeasurementDate';
import { s } from '../strength/styles';
import { addExercise, addSet, removeSet, startWorkout, updateSet, type Workout } from './model';
import { completeManualWorkout, manualFieldErrors } from './manualWorkout';
let sequence = 0;
const id = () => `manual-${Date.now()}-${++sequence}`;
export function ManualWorkoutScreen({
  initialDate,
  onClose,
  onSave,
}: {
  initialDate: string;
  onClose: () => void;
  onSave: (workout: Workout) => void;
}) {
  const [date, setDate] = useState(initialDate);
  const [draft, setDraft] = useState(() => startWorkout(id(), Date.now()));
  const [picker, setPicker] = useState(false);
  const [error, setError] = useState('');
  const [confirmClose, setConfirmClose] = useState(false);
  function change(fn: (w: Workout) => Workout) {
    try {
      setDraft(fn(draft));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '입력값을 확인해 주세요.');
    }
  }
  return (
    <Modal
      visible
      animationType="slide"
      onRequestClose={() => (draft.exercises.length ? setConfirmClose(true) : onClose())}
    >
      <SafeAreaView style={s.page}>
        <ScreenLayout
          title="지난 운동 입력"
          onBack={() => (draft.exercises.length ? setConfirmClose(true) : onClose())}
          footer={
            <Button
              title={`${Number(date.slice(5, 7))}월 ${Number(date.slice(8))}일에 저장`}
              disabled={!draft.exercises.length}
              onPress={() => {
                try {
                  onSave(completeManualWorkout(draft, date));
                } catch (e) {
                  setError(e instanceof Error ? e.message : '기록을 추가하지 못했습니다.');
                }
              }}
            />
          }
        >
          <Text style={s.muted}>
            놓친 운동을 날짜별로 입력해요. 현재 운동과 타이머는 그대로 유지됩니다.
          </Text>
          <View style={s.card}>
            <Text style={s.heading}>운동한 날짜</Text>
            <MeasurementDate value={date} onChange={setDate} />
          </View>
          {draft.exercises.map((exercise) => (
            <View key={exercise.id} style={s.card}>
              <Text style={s.heading}>{exercise.name}</Text>
              <Text style={s.muted}>
                무게와 횟수를 모두 입력해 주세요. 연한 예시는 저장되지 않습니다.
              </Text>
              {exercise.sets.map((set, index) => (
                <View key={set.id} style={{ gap: 8 }}>
                  <Text style={s.muted}>{index + 1}세트</Text>
                  <View style={s.row}>
                    <View style={s.field}>
                      <Text style={s.muted}>무게 (kg)</Text>
                      <TextInput
                        style={s.input}
                        aria-invalid={!!error && !!manualFieldErrors(set).weight}
                        accessibilityLabel={`${exercise.name} ${index + 1}세트 무게`}
                        keyboardType="decimal-pad"
                        placeholder="예: 0"
                        value={set.weight}
                        onChangeText={(weight) =>
                          change((w) => updateSet(w, exercise.id, set.id, { weight }))
                        }
                      />
                      {!!error && !!manualFieldErrors(set).weight && (
                        <Text style={s.error}>{manualFieldErrors(set).weight}</Text>
                      )}
                    </View>
                    <View style={s.field}>
                      <Text style={s.muted}>횟수</Text>
                      <TextInput
                        style={s.input}
                        aria-invalid={!!error && !!manualFieldErrors(set).reps}
                        accessibilityLabel={`${exercise.name} ${index + 1}세트 횟수`}
                        keyboardType="number-pad"
                        placeholder="예: 10"
                        value={set.reps}
                        onChangeText={(reps) =>
                          change((w) => updateSet(w, exercise.id, set.id, { reps }))
                        }
                      />
                      {!!error && !!manualFieldErrors(set).reps && (
                        <Text style={s.error}>{manualFieldErrors(set).reps}</Text>
                      )}
                    </View>
                  </View>
                  <Button
                    title={`${index + 1}세트 삭제`}
                    secondary
                    onPress={() => change((w) => removeSet(w, exercise.id, set.id))}
                  />
                </View>
              ))}
              <Button
                title={`${exercise.name} 세트 추가`}
                secondary
                onPress={() => change((w) => addSet(w, exercise.id, id()))}
              />
              <Button
                title={`${exercise.name} 종목 삭제`}
                secondary
                onPress={() =>
                  change((w) => ({
                    ...w,
                    exercises: w.exercises.filter((e) => e.id !== exercise.id),
                  }))
                }
              />
            </View>
          ))}
          <Button title="＋ 종목 추가" secondary onPress={() => setPicker(true)} />
          {!!error && (
            <Text accessibilityRole="alert" style={s.error}>
              {error}
            </Text>
          )}
          <Text style={s.muted}>
            입력한 모든 세트를 완료 기록으로 추가합니다. 운동시간은 측정하지 않습니다.
          </Text>
          {confirmClose ? (
            <View style={s.card}>
              <Text style={s.muted}>입력 중인 내용을 버리고 닫을까요?</Text>
              <Button title="입력 버리고 닫기" secondary onPress={onClose} />
              <Button title="계속 입력" onPress={() => setConfirmClose(false)} />
            </View>
          ) : (
            <Button
              title="닫기"
              secondary
              onPress={() => (draft.exercises.length ? setConfirmClose(true) : onClose())}
            />
          )}
        </ScreenLayout>
        <ExercisePicker
          visible={picker}
          selectedIds={draft.exercises.flatMap((e) => (e.catalogId ? [e.catalogId] : []))}
          onClose={() => setPicker(false)}
          onSelect={(exercises) => {
            change((w) => exercises.reduce((current, exercise) => addExercise(current, id(), exercise.name, exercise.id), w));
            setPicker(false);
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}
