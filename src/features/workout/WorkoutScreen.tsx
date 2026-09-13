import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { colors } from '../../theme/tokens';
import { ExercisePicker } from '../exercises/ExercisePicker';
import { bodyParts, equipmentLabels, findCatalogExercise } from '../exercises/catalog';
import { exerciseImages } from '../exercises/images';
import { addExercise, addSet, removeSet, finishWorkout, startWorkout, updateSet, IncompleteSetsError, type Workout } from './model';
import { useWorkoutArchive } from './useWorkoutArchive';
let counter = 0;
const nextId = () => `${Date.now()}-${++counter}`;
export function WorkoutScreen() {
  const { workout, setWorkout, history, ready, status, failed, retry } = useWorkoutArchive();
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState('');
  function change(fn: (current: Workout) => Workout) {
    setWorkout(current => { if (!current) throw new Error('운동을 먼저 시작해 주세요.'); return fn(current); });
    setConfirmFinish(false);
    setError('');
  }
  function act(fn: (current: Workout) => Workout) {
    try { change(fn); } catch (e) { setError(e instanceof Error ? e.message : '다시 시도해 주세요.'); }
  }
  const finished = workout?.finishedAt !== undefined;
  const total = workout?.exercises.reduce((count, e) => count + e.sets.length, 0) ?? 0;
  const completed = workout?.exercises.reduce((count, e) => count + e.sets.filter(set => set.completed).length, 0) ?? 0;
  return <SafeAreaView style={s.page}><KeyboardAvoidingView style={s.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
      <View style={s.topline}><Text style={s.brand}>루핏</Text><Text style={s.muted}>나의 운동 노트</Text></View>
      <View style={s.intro}><Text style={s.title}>오늘의 운동</Text><Text style={s.muted}>작은 기록이 쌓여, 나의 변화가 됩니다.</Text></View>
      {!ready ? <Text>{status}</Text> : !workout ? <View style={s.card}><Text style={s.heading}>내 페이스로 시작해요</Text><Text style={s.muted}>종목을 고르고 오늘의 무게와 횟수를 기록해요.</Text><Button title="자유 운동 시작" onPress={() => setWorkout(startWorkout(nextId(), Date.now()))} /></View> : <>
        <View style={s.summary}><Text style={s.heading}>{finished ? '오늘도 해냈어요!' : '운동 기록 중'}</Text><Text style={s.progress}>{completed} / {total}세트 완료</Text></View>
        {!workout.exercises.length && <View style={s.empty}><Text style={s.heading}>어떤 운동부터 할까요?</Text><Text style={s.muted}>사진과 운동 부위를 보고 종목을 선택해요.</Text></View>}
        {workout.exercises.map(e => {
          const catalog = findCatalogExercise(e.catalogId);
          return <View style={s.card} key={e.id}>
            <View style={s.exerciseHeader}>
              {catalog && <Image source={exerciseImages[catalog.id]} style={s.picture} resizeMode="contain" accessibilityLabel={`${e.name} 동작 사진`} />}
              <View style={s.exerciseInfo}><Text style={s.heading}>{e.name}</Text><Text style={s.muted}>{catalog ? `${bodyParts[catalog.bodyPart]} · ${equipmentLabels[catalog.equipment]}` : '직접 추가한 종목'}</Text></View>
            </View>
            {!!e.sets.length && <View style={s.labels}><Text style={s.indexLabel}>세트</Text><Text style={s.weightLabel}>무게 kg</Text><Text style={s.repsLabel}>횟수</Text><Text style={s.actionLabel}>완료 · 삭제 · 복제</Text></View>}
            {e.sets.map((set, i) => <View style={[s.row, set.completed && s.completedRow]} key={set.id}>
              <Text style={s.index}>{i + 1}</Text>
              <TextInput style={[s.input, s.weight]} accessibilityLabel={`${e.name} ${i + 1}세트 무게`} placeholder="0" keyboardType="decimal-pad" value={set.weight} editable={!finished} maxLength={7} onChangeText={weight => act(w => updateSet(w, e.id, set.id, { weight }))} />
              <TextInput style={[s.input, s.reps]} accessibilityLabel={`${e.name} ${i + 1}세트 횟수`} placeholder="0" keyboardType="number-pad" value={set.reps} editable={!finished} maxLength={4} onChangeText={reps => act(w => updateSet(w, e.id, set.id, { reps }))} />
              <IconButton label={`${e.name} ${i + 1}세트 ${set.completed ? '완료 취소' : '완료'}`} symbol="✓" selected={set.completed} disabled={finished} onPress={() => act(w => updateSet(w, e.id, set.id, { completed: !w.exercises.find(ex => ex.id === e.id)?.sets.find(s => s.id === set.id)?.completed }))} />
              <IconButton label={`${e.name} ${i + 1}세트 삭제`} symbol="−" disabled={finished} onPress={() => act(w => removeSet(w, e.id, set.id))} />
              <IconButton label={`${e.name} ${i + 1}세트 복제`} symbol="+" disabled={finished} onPress={() => act(w => addSet(w, e.id, nextId(), set.id))} />
            </View>)}
            {!e.sets.length && <><Text style={s.muted}>세트가 없어요. 새 세트를 추가해 주세요.</Text>{!finished && <Button title={`${e.name} 세트 추가`} secondary onPress={() => act(w => addSet(w, e.id, nextId()))} />}</>}
          </View>;
        })}
        {!finished ? <>
          <Text style={s.hint}>＋ 같은 무게·횟수로 세트 추가   − 해당 세트 삭제</Text>
          <Button title="＋ 종목 추가" secondary onPress={() => setShowPicker(true)} />
          {confirmFinish ? <View style={s.card}><Text>미완료 세트를 제외하고 종료할까요?</Text>
            <Button title="완료한 세트만 저장하고 종료" onPress={() => act(w => finishWorkout(w, Date.now(), true))} />
            <Button title="계속 운동하기" secondary onPress={() => setConfirmFinish(false)} /></View> :
            <Button title="운동 종료" onPress={() => { try { change(w => finishWorkout(w, Date.now())); } catch (e) {
              if (e instanceof IncompleteSetsError) { setError(''); setConfirmFinish(true); } else setError(e instanceof Error ? e.message : '다시 시도해 주세요.');
            } }} />}
        </> : <Button title="새 운동 준비" onPress={() => setWorkout(null)} />}
      </>}
      {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
      {ready && <Text accessibilityLiveRegion="polite" style={s.muted}>{status}</Text>}
      {failed && <Button title="다시 시도" secondary onPress={retry} />}
      {history.length > 0 && <Button title={`이전 기록 ${history.length}개 ${showHistory ? '접기' : '보기'}`} secondary onPress={() => setShowHistory(!showHistory)} />}
      {showHistory && [...history].reverse().map(w => <View key={w.id} style={s.card}>
        <Text style={s.heading}>{new Date(w.startedAt).toLocaleDateString()} 운동</Text>
        {w.exercises.map(e => <Text key={e.id}>{e.name}: {e.sets.map(set => `${set.weight}kg × ${set.reps}회`).join(', ')}</Text>)}
      </View>)}
      <Text style={s.muted}>이 기기에 기록을 보관합니다. 서버 동기화는 아직 연결되지 않았습니다.</Text>
    </ScrollView>
    {showPicker && <ExercisePicker selectedIds={workout?.exercises.flatMap(e => e.catalogId ? [e.catalogId] : []) ?? []} onClose={() => setShowPicker(false)} onSelect={exercise => change(w => addExercise(w, nextId(), exercise.name, exercise.id))} />}
  </KeyboardAvoidingView></SafeAreaView>;
}
function IconButton({ label, symbol, selected = false, disabled, onPress }: { label: string; symbol: string; selected?: boolean; disabled: boolean; onPress(): void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled, selected }} disabled={disabled} onPress={onPress} style={({ pressed }) => [s.icon, selected && s.iconSelected, { opacity: disabled ? 0.45 : pressed ? 0.6 : 1 }]}><Text style={[s.iconText, selected && s.iconTextSelected]}>{symbol}</Text></Pressable>;
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background }, content: { padding: 16, paddingBottom: 32, gap: 18, maxWidth: 640, width: '100%', alignSelf: 'center' },
  topline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 6 }, intro: { gap: 8, marginBottom: 4 },
  brand: { color: colors.primary, fontWeight: '800', fontSize: 22 }, title: { color: colors.text, fontWeight: '800', fontSize: 30 },
  heading: { color: colors.text, fontWeight: '700', fontSize: 19, lineHeight: 27 }, muted: { color: colors.muted, lineHeight: 22, fontSize: 13 },
  summary: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' }, progress: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  empty: { paddingVertical: 24, gap: 10 }, card: { backgroundColor: colors.surface, borderRadius: 20, padding: 12, gap: 12 },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 4, marginBottom: 4 }, exerciseInfo: { flex: 1, gap: 4 }, picture: { width: 64, height: 64, borderRadius: 12, backgroundColor: colors.background },
  labels: { flexDirection: 'row', gap: 4, alignItems: 'center' }, indexLabel: { width: 24, fontSize: 10, color: colors.muted, textAlign: 'center' }, weightLabel: { flex: 1, minWidth: 44, fontSize: 11, color: colors.muted, textAlign: 'center' }, repsLabel: { flex: 1, minWidth: 36, fontSize: 11, color: colors.muted, textAlign: 'center' }, actionLabel: { width: 140, fontSize: 10, color: colors.muted, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10 }, completedRow: { backgroundColor: '#F0F7F3' }, index: { width: 24, textAlign: 'center', color: colors.muted, fontSize: 13, fontWeight: '600' },
  input: { minHeight: 48, borderColor: colors.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 4, textAlign: 'center', color: colors.text, backgroundColor: colors.surface, fontSize: 16 }, weight: { flex: 1, minWidth: 44 }, reps: { flex: 1, minWidth: 36 },
  icon: { width: 44, height: 48, borderRadius: 10, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }, iconSelected: { backgroundColor: colors.primary }, iconText: { fontSize: 24, color: colors.primary }, iconTextSelected: { color: '#fff' },
  hint: { fontSize: 12, lineHeight: 20, color: colors.muted, textAlign: 'center' }, error: { color: '#B42318', lineHeight: 24 },
});
