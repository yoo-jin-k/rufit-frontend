import {ManualWorkoutScreen} from './ManualWorkoutScreen';
import {WorkoutCalendar} from '../calendar/WorkoutCalendar';
import {BodyWeightScreen} from '../bodyweight/BodyWeightScreen';
import {StrengthScreen} from '../strength/StrengthScreen';
import { useEffect, useState } from 'react';
import { AppState, Modal, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { colors, radius, spacing, typography } from '../../theme/tokens';
import { ExercisePicker } from '../exercises/ExercisePicker';
import { bodyParts, equipmentLabels, findCatalogExercise, type CatalogExercise } from '../exercises/catalog';
import { ExerciseMedia } from '../exercises/ExerciseMedia';
import {stackedExerciseItem} from '../exercises/exercisePickerView';
import { addExercise, addSet, removeSet, finishWorkout, startWorkout, updateSet, pauseWorkout, resumeWorkout, elapsedWorkoutMs, formatWorkoutTime, IncompleteSetsError, type Workout } from './model';
import { useWorkoutArchive } from './useWorkoutArchive';
import { RestSetting, formatRest } from './RestSetting';
import {WorkoutTimerCard} from './WorkoutTimerCard';
import {RestTimerCard} from './RestTimerCard';
import {restTimerView, workoutViewport} from './timerView';
import {timerStyles} from './TimerCard.styles';
import {SetRow} from './SetRow';
import {LocalSaveStatus} from './LocalSaveStatus';
let counter = 0;
const nextId = () => `${Date.now()}-${++counter}`;
export function WorkoutScreen({authLabel = '로그인', onOpenAuth}: {authLabel?: string; onOpenAuth?: () => void}) {
  const { workout, setWorkout, addManualWorkout, history, rest, restFor, completeSet, saveRest, adjustRest, skipRest, ready, state, unsavedAfterFailure, retry, retryPending } = useWorkoutArchive();
  const [manualDate,setManualDate]=useState<string|null>(null);
  const [showWeight, setShowWeight] = useState(false);
  const [showStrength, setShowStrength] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now);
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const viewport = workoutViewport(window.width, insets.left, insets.right, window.fontScale);
  const restView = rest ? restTimerView(rest.endsAt, now) : null;
  // 표시만 주기적으로 갱신한다. 접기·회전·백그라운드 전환은 운동을 자동 정지하지 않는다.
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const tick = setInterval(refresh, 1000);
    const foreground = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => { clearInterval(tick); foreground.remove(); };
  }, []);
  function change(fn: (current: Workout) => Workout) {
    setWorkout(current => { if (!current) throw new Error('운동을 먼저 시작해 주세요.'); return fn(current); });
    setNow(Date.now());
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
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[timerStyles.content, {paddingHorizontal: viewport.contentPadding, paddingTop: viewport.contentPadding}]}>
      <View style={s.topline}><Text style={s.brand}>루핏</Text>{onOpenAuth
        ? <Pressable accessibilityRole="button" accessibilityLabel={`${authLabel} 화면 열기`} onPress={onOpenAuth} style={s.authEntry}><Text style={s.authEntryText}>{authLabel}</Text></Pressable>
        : <Text style={s.muted}>나의 운동 노트</Text>}</View>
      <WorkoutCalendar history={history} ready={ready} now={now} onAdd={setManualDate} />
      <Button title="삼대측정 ↗" secondary onPress={() => setShowStrength(true)} />
      <Button title="체중측정 ↗" secondary onPress={() => setShowWeight(true)} />
      <View style={s.intro}><Text style={s.title}>오늘의 운동</Text><Text style={s.muted}>작은 기록이 쌓여, 나의 변화가 됩니다.</Text></View>
      <LocalSaveStatus state={state} ready={ready} unsavedAfterFailure={unsavedAfterFailure} retryPending={retryPending} onRetry={retry} />
      {!ready ? null : !workout ? <View style={s.card}><Text style={s.heading}>내 페이스로 시작해요</Text><Text style={s.muted}>종목을 고르고 오늘의 무게와 횟수를 기록해요.</Text><Button title="자유 운동 시작" onPress={() => setWorkout(startWorkout(nextId(), Date.now()))} /></View> : <>
        <View style={s.summary}><Text style={s.heading}>{finished ? '오늘도 해냈어요!' : '운동 기록 중'}</Text><Text style={s.progress}>{completed} / {total}세트 완료</Text></View>
        <WorkoutTimerCard phase={finished ? 'finished' : workout.pausedAt !== undefined ? 'paused' : 'running'}
          elapsedLabel={formatWorkoutTime(elapsedWorkoutMs(workout, now))}
          onPause={() => act(w => pauseWorkout(w, Date.now()))} onResume={() => act(w => resumeWorkout(w, Date.now()))} />
        {rest && restView && <RestTimerCard phase={restView.phase} remainingLabel={formatRest(restView.seconds)}
          exerciseName={workout.exercises.find(e => e.id === rest.exerciseId)?.name ?? ''}
          canSubtract={restView.canSubtract} canAdd={restView.canAdd} stackActions={viewport.stackRestActions}
          onAdjust={seconds => {adjustRest(seconds);setNow(Date.now());}} onSkip={skipRest} />}
        {!workout.exercises.length && <View style={s.empty}><Text style={s.heading}>어떤 운동부터 할까요?</Text><Text style={s.muted}>사진과 운동 부위를 보고 종목을 선택해요.</Text></View>}
        {workout.exercises.map(e => {
          const catalog = findCatalogExercise(e.catalogId);
          return <View style={s.card} key={e.id}>
            <WorkoutExerciseHeader name={e.name} catalog={catalog} fontScale={window.fontScale} />
            <RestSetting name={e.name} {...restFor(e)} finished={finished} onSave={seconds => saveRest(e, seconds)} />
            {e.sets.map((set, i) => <SetRow key={set.id} set={set} index={i} exerciseName={e.name} fontScale={window.fontScale} finished={finished}
              onChange={patch => act(w => updateSet(w, e.id, set.id, patch))}
              onComplete={() => {
                try {completeSet(e.id, set.id, !set.completed);setNow(Date.now());setError('');setConfirmFinish(false);} catch (error) {setError(error instanceof Error ? error.message : '세트를 확인해 주세요.');}
              }} onDelete={() => act(w => removeSet(w, e.id, set.id))} onDuplicate={() => act(w => addSet(w, e.id, nextId(), set.id))} />)}
            {!e.sets.length && <><Text style={s.muted}>세트가 없어요. 새 세트를 추가해 주세요.</Text>{!finished && <Button title={`${e.name} 세트 추가`} secondary onPress={() => act(w => addSet(w, e.id, nextId()))} />}</>}
          </View>;
        })}
        {!finished ? <>
          <Text style={s.hint}>복제하면 같은 무게·횟수의 세트가 추가됩니다.</Text>
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
      {history.length > 0 && <Button title={`이전 기록 ${history.length}개 ${showHistory ? '접기' : '보기'}`} secondary onPress={() => setShowHistory(!showHistory)} />}
      {showHistory && [...history].reverse().map(w => <View key={w.id} style={s.card}>
        <Text style={s.heading}>{w.recordDate ?? new Date(w.startedAt).toLocaleDateString()} 운동</Text>
        <Text style={s.muted}>{w.entryMode==='manual'?'나중에 입력한 기록 · 운동시간 미측정':`운동시간 ${formatWorkoutTime(elapsedWorkoutMs(w, now))}`}</Text>
        {w.exercises.map(e => <Text key={e.id}>{e.name}: {e.sets.map(set => `${set.weight}kg × ${set.reps}회`).join(', ')}</Text>)}
      </View>)}
      <Text style={s.muted}>기록은 이 기기에 보관됩니다. 다른 기기와 자동으로 동기화되지 않습니다.</Text>
    </ScrollView>
    {manualDate && <ManualWorkoutScreen initialDate={manualDate} onClose={()=>setManualDate(null)} onSave={record=>{addManualWorkout(record);setManualDate(null);}}/>}
    <Modal visible={showWeight} animationType="slide" onRequestClose={() => setShowWeight(false)}>{showWeight && <BodyWeightScreen onClose={() => setShowWeight(false)} />}</Modal>
    <Modal visible={showStrength} animationType="slide" onRequestClose={() => setShowStrength(false)}>{showStrength && <StrengthScreen onClose={() => setShowStrength(false)} />}</Modal>
    <ExercisePicker visible={showPicker} selectedIds={workout?.exercises.flatMap(e => e.catalogId ? [e.catalogId] : []) ?? []} onClose={() => setShowPicker(false)} onSelect={exercise => change(w => addExercise(w, nextId(), exercise.name, exercise.id))} />
  </KeyboardAvoidingView></SafeAreaView>;
}

function WorkoutExerciseHeader({name, catalog, fontScale}: {name: string; catalog?: CatalogExercise; fontScale: number}) {
  const [availableWidth, setAvailableWidth] = useState(0);
  const stacked = stackedExerciseItem(availableWidth, fontScale);
  return <View testID="workout-exercise-header" onLayout={event => setAvailableWidth(event.nativeEvent.layout.width)}
    style={[s.exerciseHeader, stacked && s.exerciseHeaderStacked]}>
    <ExerciseMedia exercise={catalog} />
    <View style={s.exerciseInfo}><Text style={s.heading}>{name}</Text><Text style={s.muted}>{catalog ? `${bodyParts[catalog.bodyPart]} · ${equipmentLabels[catalog.equipment]}` : '직접 추가한 종목'}</Text></View>
  </View>;
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  topline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 6 }, intro: { gap: 8, marginBottom: 4 },
  authEntry: {minWidth: 48, minHeight: 48, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center'}, authEntryText: {...typography.caption, color: colors.primary, fontWeight: '700'},
  brand: { ...typography.heading, color: colors.primary }, title: { ...typography.title, color: colors.text },
  heading: { ...typography.heading, color: colors.text }, muted: { ...typography.caption, color: colors.textSecondary },
  summary: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' }, progress: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  empty: { paddingVertical: 24, gap: 10 }, card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.lg, gap: spacing.lg },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 4, marginBottom: 4 },
  exerciseHeaderStacked: {flexDirection: 'column', alignItems: 'flex-start'}, exerciseInfo: { flex: 1, width: '100%', minWidth: 0, gap: 4 },
  hint: { fontSize: 12, lineHeight: 20, color: colors.muted, textAlign: 'center' }, error: { color: '#B42318', lineHeight: 24 },
});
