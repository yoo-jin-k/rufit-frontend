import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { colors } from '../../theme/tokens';
import { addExercise, finishWorkout, startWorkout, updateSet, IncompleteSetsError } from './model';
import { useWorkoutArchive } from './useWorkoutArchive';
let counter = 0;
const nextId = () => `${Date.now()}-${++counter}`;
export function WorkoutScreen() {
  const { workout, setWorkout, history, ready, status, failed, retry } = useWorkoutArchive();
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  function act(fn: () => void) { try { fn(); setError(''); } catch (e) { setError(e instanceof Error ? e.message : '다시 시도해 주세요.'); } }
  return <SafeAreaView style={s.page}><KeyboardAvoidingView style={s.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
      <Text style={s.brand}>루핏</Text><Text style={s.title}>오늘의 운동</Text>
      <Text style={s.muted}>작은 기록이 쌓여, 나의 변화가 됩니다.</Text>
      {!ready ? <Text>{status}</Text> : !workout ? <View style={s.card}><Text style={s.heading}>내 페이스로 시작해요</Text><Button title="자유 운동 시작" onPress={() => setWorkout(startWorkout(nextId(), Date.now()))} /></View> : <>
        <Text style={s.heading}>{workout.finishedAt !== undefined ? '오늘도 해냈어요!' : '운동 기록 중'}</Text>
        {workout.exercises.map(e => <View style={s.card} key={e.id}><Text style={s.heading}>{e.name}</Text>
          {e.sets.map((set, i) => <View style={s.row} key={set.id}><Text>{i + 1}세트</Text>
            <TextInput style={s.input} accessibilityLabel={`${e.name} ${i + 1}세트 무게`} placeholder="kg" keyboardType="decimal-pad" value={set.weight} editable={workout.finishedAt === undefined} onChangeText={weight => setWorkout(updateSet(workout, e.id, set.id, { weight }))} />
            <TextInput style={s.input} accessibilityLabel={`${e.name} ${i + 1}세트 횟수`} placeholder="회" keyboardType="number-pad" value={set.reps} editable={workout.finishedAt === undefined} onChangeText={reps => setWorkout(updateSet(workout, e.id, set.id, { reps }))} />
            <Button title={set.completed ? '완료 취소' : '세트 완료'} secondary={set.completed} disabled={workout.finishedAt !== undefined} onPress={() => act(() => setWorkout(updateSet(workout, e.id, set.id, { completed: !set.completed })))} />
          </View>)}
        </View>)}
        {workout.finishedAt === undefined ? <>
          <View style={s.card}><TextInput style={s.input} accessibilityLabel="추가할 운동 이름" placeholder="운동 이름 (예: 스쿼트)" value={name} maxLength={80} onChangeText={setName} />
          <Button title="운동 추가" secondary onPress={() => act(() => { setWorkout(addExercise(workout, nextId(), name)); setName(''); })} /></View>
          {confirmFinish ? <View style={s.card}><Text>미완료 세트를 제외하고 종료할까요?</Text>
            <Button title="완료한 세트만 저장하고 종료" onPress={() => act(() => { setWorkout(finishWorkout(workout, Date.now(), true)); setConfirmFinish(false); })} />
            <Button title="계속 운동하기" secondary onPress={() => setConfirmFinish(false)} /></View> :
            <Button title="운동 종료" onPress={() => { try { setWorkout(finishWorkout(workout, Date.now())); setError(''); } catch (e) {
              if (e instanceof IncompleteSetsError) setConfirmFinish(true); else setError(e instanceof Error ? e.message : '다시 시도해 주세요.');
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
    <View style={s.nav}><Text style={s.brand}>운동</Text></View>
  </KeyboardAvoidingView></SafeAreaView>;
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background }, content: { padding: 24, gap: 18, maxWidth: 640, width: '100%', alignSelf: 'center' },
  brand: { color: colors.primary, fontWeight: '800', fontSize: 20 }, title: { color: colors.text, fontWeight: '800', fontSize: 30 },
  heading: { color: colors.text, fontWeight: '700', fontSize: 20 }, muted: { color: colors.muted, lineHeight: 22, fontSize: 14 },
  card: { backgroundColor: colors.surface, borderRadius: 18, padding: 20, gap: 16 }, row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  input: { flexGrow: 1, minWidth: 64, minHeight: 48, borderColor: colors.border, borderWidth: 1, borderRadius: 10, padding: 12, color: colors.text, backgroundColor: colors.surface, fontSize: 16 },
  error: { color: '#B42318', lineHeight: 24 }, nav: { borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 16, alignItems: 'center' },
});
