/**
 * Figma 03-05 ~ 03-14 운동 진행 화면입니다.
 * 지금 하는 종목만 펼쳐 세트 표를 보여 주고, 끝난 종목과 다음 종목은 한 줄로 접습니다.
 * 하단에는 휴식 막대와 '종목 추가'·'세트 완료' 버튼을 고정합니다. 일시정지 중에는 이어서 하기 안내 카드를 보여 줍니다.
 */
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { Button } from '../../components/Button';
import { FooterRow, Screen } from '../../components/kit/Screen';
import {
  BottomSheet,
  ConfirmDialog,
  EmptyCard,
  ListGroup,
  ListRow,
  PhotoPlaceholder,
  Toast,
} from '../../components/kit/Surfaces';
import { text, tokens } from '../../theme/tokens';
import { bodyParts, equipmentLabels, findCatalogExercise } from '../exercises/catalog';
import { elapsedWorkoutMs, type Exercise, type Workout, type WorkoutSet } from './model';
import { previousExercises } from './previousSetModel';
import { formatRest } from './RestSetting';
import { RestTimerDock } from './RestTimerDock';
import { SetCountControl, SetHeader, SetRow } from './SetRow';
import { setFieldErrors } from './setRowView';
import { SortableSets } from './SortableSets';
import { formatNumber } from './recordFormat';
import type { restTimerView } from './timerView';

const c = tokens.color;

/** 운동 시간 표시: 1시간 미만은 14:20, 넘으면 1:02:05 */
export function clock(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const sec = String(seconds % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${String(m).padStart(2, '0')}:${sec}`;
}

const done = (e: Exercise) => e.sets.length > 0 && e.sets.every((set) => set.completed);
const volumeOf = (sets: WorkoutSet[]) =>
  sets.reduce((sum, set) => sum + (set.completed ? (Number(set.weight) || 0) * (Number(set.reps) || 0) : 0), 0);

/** 종목 사진 자리와 이름·설명 한 줄입니다(Figma ExerciseRow). */
function ExerciseLine({ name, meta, trailing }: { name: string; meta: string; trailing?: ReactNode }) {
  return (
    <View style={s.exerciseLine}>
      <PhotoPlaceholder style={s.thumb} radius={tokens.radius.md} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text numberOfLines={1} style={[text.bodyBold, { color: c.text.primary }]}>{name}</Text>
        <Text numberOfLines={1} style={[text.label, { color: c.text.secondary }]}>{meta}</Text>
      </View>
      {trailing}
    </View>
  );
}

export type SessionActions = {
  onChangeSet(exerciseId: string, setId: string, patch: Partial<Pick<WorkoutSet, 'weight' | 'reps'>>): void;
  onCompleteSet(exerciseId: string, setId: string, completed: boolean): void;
  onCompleteAll(exerciseId: string, completed: boolean): void;
  onAddSet(exerciseId: string, afterSetId?: string): void;
  onRemoveSet(exerciseId: string, setId: string): void;
  onMoveSet(exerciseId: string, setId: string, target: number): void;
  onRemoveExercise(exerciseId: string): void;
  onRestSettings(exerciseId: string): void;
  onLoadPrevious(exerciseId: string): void;
  onAddExercise(): void;
  onTogglePause(): void;
  onFinish(): void;
  onAdjustRest(seconds: -10 | 10): void;
  onToggleRestPause(): void;
  onSkipRest(): void;
};

export function WorkoutSession({
  workout,
  history,
  now,
  ready,
  rest,
  restView,
  restSecondsFor,
  restSourceFor,
  commonRest,
  status,
  error,
  actions,
}: {
  workout: Workout;
  history: Workout[];
  now: number;
  ready: boolean;
  rest: { exerciseId: string; pausedAt?: number } | null;
  restView: ReturnType<typeof restTimerView> | null;
  restSecondsFor(exercise: Exercise): number;
  /** 휴식 시간의 출처(개인 설정·공통 설정·권장·기본)입니다. 종목별 휴식 시간 목록에 씁니다. */
  restSourceFor?(exercise: Exercise): string;
  /** 설정 화면의 공통 휴식 시간입니다. 정하지 않았으면 비웁니다. */
  commonRest?: number;
  status?: ReactNode;
  error?: string;
  actions: SessionActions;
}) {
  const paused = workout.pausedAt !== undefined;
  const firstOpen = workout.exercises.find((e) => !done(e)) ?? workout.exercises.at(-1);
  const [focusId, setFocusId] = useState(firstOpen?.id);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [restList, setRestList] = useState(false);
  // 펼친 종목이 지워졌거나 아직 고르지 않았으면 첫 미완료 종목을 펼칩니다.
  const focus = workout.exercises.find((e) => e.id === focusId) ?? firstOpen;
  const totalSets = workout.exercises.reduce((n, e) => n + e.sets.length, 0);
  const completedSets = workout.exercises.reduce((n, e) => n + e.sets.filter((set) => set.completed).length, 0);
  const volume = workout.exercises.reduce((n, e) => n + volumeOf(e.sets), 0);
  const focusIndex = focus ? workout.exercises.indexOf(focus) : -1;
  const nextOpen = workout.exercises.find((e, i) => i > focusIndex && !done(e)) ?? workout.exercises.find((e) => e !== focus && !done(e));
  const currentSet = focus?.sets.find((set) => !set.completed);
  const menuExercise = workout.exercises.find((e) => e.id === menuId);
  const removeExercise = workout.exercises.find((e) => e.id === removeId);

  function previousFor(e: Exercise) {
    return previousExercises(history, e)[0]?.exercise;
  }
  function meta(e: Exercise) {
    const item = findCatalogExercise(e.catalogId);
    return [item && bodyParts[item.bodyPart], item && equipmentLabels[item.equipment], `휴식 ${restSecondsFor(e)}초`]
      .filter(Boolean)
      .join(' · ');
  }
  function completeCurrent() {
    if (!focus) return;
    if (!currentSet) {
      if (nextOpen) setFocusId(nextOpen.id);
      return;
    }
    const errors = setFieldErrors(currentSet);
    if (errors.weight || errors.reps) {
      setToast(errors.weight || errors.reps);
      return;
    }
    actions.onCompleteSet(focus.id, currentSet.id, true);
    if (focus.sets.filter((set) => !set.completed).length === 1) setToast(`${focus.name} ${focus.sets.length}세트를 모두 완료했어요`);
  }

  const restExercise = rest ? workout.exercises.find((e) => e.id === rest.exerciseId) : undefined;
  const allDone = workout.exercises.length > 0 && workout.exercises.every(done);
  const primaryLabel = !focus ? '종목 추가' : currentSet ? '세트 완료' : nextOpen ? '다음 종목' : '운동 종료';
  return (
    <Screen
      edges={['top']}
      keyboard="cover"
      header={
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={[text.caption, { color: paused ? c.accent.default : c.text.secondary }]}>
              {paused ? '일시정지됨' : '운동 기록 중'}
            </Text>
            <Text
              accessibilityLabel={`운동 시간 ${formatRest(Math.floor(elapsedWorkoutMs(workout, now) / 1000))}`}
              style={[text.display, s.digits, { color: paused ? c.text.muted : c.text.primary }]}
            >
              {clock(Math.floor(elapsedWorkoutMs(workout, now) / 1000))}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={paused ? '운동 이어서 하기' : '운동 일시정지'}
            onPress={actions.onTogglePause}
            style={[s.round, paused && s.roundOn]}
          >
            <AppIcon name={paused ? 'play' : 'pause'} color={paused ? c.text.inverse : c.text.primary} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="운동 종료" onPress={actions.onFinish} hitSlop={10} style={s.end}>
            <Text style={[text.captionBold, { color: c.text.secondary }]}>종료</Text>
          </Pressable>
        </View>
      }
      footer={
        <>
          {rest && restView && !paused && (
            <RestTimerDock
              view={restView}
              paused={rest.pausedAt !== undefined}
              total={restExercise ? restSecondsFor(restExercise) : undefined}
              onSettings={() => setRestList(true)}
              onTogglePause={actions.onToggleRestPause}
              onAdjust={actions.onAdjustRest}
              onClose={actions.onSkipRest}
            />
          )}
          {!paused && (
            <FooterRow>
              <Button title="종목 추가" variant="secondary" fullWidth={false} disabled={!ready} onPress={actions.onAddExercise} />
              <Button
                title={primaryLabel}
                fullWidth={false}
                style={{ flex: 1 }}
                disabled={!ready}
                onPress={!focus ? actions.onAddExercise : allDone && !currentSet && !nextOpen ? actions.onFinish : completeCurrent}
              />
            </FooterRow>
          )}
        </>
      }
    >
      {status}
      {!!error && (
        <Text accessibilityRole="alert" style={[text.caption, { color: c.danger.default }]}>
          {error}
        </Text>
      )}
      {paused && (
        <View style={s.pausedCard}>
          <Text style={[text.bodyBold, { color: c.text.primary }]}>운동을 잠시 멈췄어요</Text>
          <Text style={[text.caption, { color: c.text.secondary }]}>시간은 멈추고, 입력한 세트는 그대로 저장돼 있어요</Text>
          <FooterRow>
            <Button title="이어서 하기" size="sm" fullWidth={false} style={{ flex: 1 }} onPress={actions.onTogglePause} />
            <Button title="운동 종료" size="sm" variant="secondary" fullWidth={false} style={{ flex: 1 }} onPress={actions.onFinish} />
          </FooterRow>
        </View>
      )}
      {!workout.exercises.length && (
        <EmptyCard icon="dumbbell" title="어떤 운동부터 할까요?" body="종목을 추가하고 세트를 기록해요" />
      )}
      {workout.exercises.map((e) => {
        const prev = previousFor(e);
        const finishedCount = e.sets.filter((set) => set.completed).length;
        if (paused || e !== focus) {
          const isDone = done(e);
          const lastSet = prev?.sets.at(-1);
          return (
            <Pressable
              key={e.id}
              accessibilityRole="button"
              accessibilityLabel={`${e.name} 펼치기`}
              disabled={paused}
              onPress={() => setFocusId(e.id)}
              style={[s.collapsed, isDone && s.collapsedDone]}
            >
              {isDone ? (
                <>
                  <View style={s.doneMark}>
                    <AppIcon name="check" size={16} color={c.text.inverse} strokeWidth={2.2} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={[text.bodyBold, { color: c.text.primary }]}>{e.name}</Text>
                    <Text numberOfLines={1} style={[text.label, { color: c.text.secondary }]}>
                      {finishedCount}/{e.sets.length}세트 완료
                      {paused ? '' : ` · ${e.sets.map((set) => set.weight).filter(Boolean).join('·')}kg`}
                    </Text>
                  </View>
                  {!paused && <AppIcon name="chevron-right" color={c.text.muted} />}
                </>
              ) : paused ? (
                <>
                  <View style={s.openMark} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={[text.bodyBold, { color: c.text.primary }]}>{e.name}</Text>
                    <Text style={[text.label, { color: c.text.secondary }]}>
                      {finishedCount}/{e.sets.length}세트 완료
                    </Text>
                  </View>
                </>
              ) : (
                <ExerciseLine
                  name={e.name}
                  meta={`${finishedCount}/${e.sets.length}세트${lastSet ? ` · 지난번 ${lastSet.weight}kg × ${lastSet.reps}회` : ''}`}
                  trailing={<AppIcon name="chevron-right" color={c.text.muted} />}
                />
              )}
            </Pressable>
          );
        }
        return (
          <View key={e.id} style={s.focus}>
            <ExerciseLine
              name={e.name}
              meta={meta(e)}
              trailing={
                <Pressable accessibilityRole="button" accessibilityLabel={`${e.name} 더보기`} onPress={() => setMenuId(e.id)} hitSlop={10} style={s.dots}>
                  <AppIcon name="dots" color={c.text.secondary} />
                </Pressable>
              }
            />
            <SetHeader name={e.name} allCompleted={done(e)} onCompleteAll={() => actions.onCompleteAll(e.id, !done(e))} />
            <SortableSets sets={e.sets} name={e.name} disabled={false} onMove={(setId, target) => actions.onMoveSet(e.id, setId, target)}>
              {(set, i, handle) => (
                <SetRow
                  key={set.id}
                  dragHandle={handle}
                  set={set}
                  index={i}
                  exerciseName={e.name}
                  previous={prev?.sets[i] ? `${prev.sets[i].weight}×${prev.sets[i].reps}` : undefined}
                  current={set.id === currentSet?.id}
                  finished={false}
                  onChange={(patch) => actions.onChangeSet(e.id, set.id, patch)}
                  onComplete={() => actions.onCompleteSet(e.id, set.id, !set.completed)}
                  onDelete={() => actions.onRemoveSet(e.id, set.id)}
                  onDuplicate={() => actions.onAddSet(e.id, set.id)}
                />
              )}
            </SortableSets>
            <SetCountControl
              name={e.name}
              count={e.sets.length}
              onAdd={() => actions.onAddSet(e.id, e.sets.at(-1)?.id)}
              onRemove={() => {
                const last = e.sets.at(-1);
                if (last) actions.onRemoveSet(e.id, last.id);
              }}
              onLoad={() => actions.onLoadPrevious(e.id)}
            />
          </View>
        );
      })}
      {!paused && completedSets > 0 && workout.exercises.some(done) && (
        <View style={s.summary}>
          <Text style={[text.captionBold, { color: c.text.primary, flex: 1 }]}>
            지금까지 {completedSets}세트 · {formatNumber(volume)}kg
          </Text>
          <Text style={[text.label, { color: c.text.secondary }]}>전체 {totalSets}세트</Text>
        </View>
      )}
      {!!toast && <Toast message={toast} onHide={() => setToast('')} />}
      <BottomSheet visible={!!menuExercise} title={menuExercise?.name ?? ''} onClose={() => setMenuId(null)}>
        {menuExercise && (
          <ListGroup>
            <ListRow icon="timer" label="휴식 시간" value={`${restSecondsFor(menuExercise)}초`}
              onPress={() => { setMenuId(null); actions.onRestSettings(menuExercise.id); }} />
            <ListRow icon="trash" label="종목 빼기" accessibilityLabel={`${menuExercise.name} 종목 제거`} danger trailing="none"
              onPress={() => { setMenuId(null); setRemoveId(menuExercise.id); }} />
          </ListGroup>
        )}
      </BottomSheet>
      <BottomSheet
        visible={restList}
        title="종목별 휴식 시간"
        subtitle={commonRest !== undefined ? `설정의 공통 휴식 시간: ${commonRest}초` : '종목마다 권장 휴식 시간을 써요'}
        onClose={() => setRestList(false)}
      >
        <ListGroup>
          {workout.exercises.map((e) => (
            <ListRow
              key={e.id}
              label={e.name}
              value={restSourceFor?.(e) === '공통 설정' ? '공통 사용' : `${restSecondsFor(e)}초`}
              onPress={() => {
                setRestList(false);
                actions.onRestSettings(e.id);
              }}
            />
          ))}
        </ListGroup>
        <Button title="완료" onPress={() => setRestList(false)} />
      </BottomSheet>
      <ConfirmDialog
        visible={!!removeExercise}
        title={`${removeExercise?.name ?? ''}를 뺄까요?`}
        message={
          removeExercise && removeExercise.sets.some((set) => set.completed)
            ? `완료한 ${removeExercise.sets.filter((set) => set.completed).length}세트 기록도 함께 지워져요`
            : '이 종목의 입력 세트가 함께 지워져요'
        }
        confirmLabel="빼기"
        tone="danger"
        onCancel={() => setRemoveId(null)}
        onConfirm={() => {
          if (removeExercise) actions.onRemoveExercise(removeExercise.id);
          setRemoveId(null);
        }}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[12], paddingTop: tokens.space[8] },
  digits: { fontVariant: ['tabular-nums'] },
  round: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.bg.surface, alignItems: 'center', justifyContent: 'center' },
  roundOn: { backgroundColor: c.bg.inverse },
  end: { minHeight: 44, justifyContent: 'center' },
  exerciseLine: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[12], minHeight: 68 },
  thumb: { width: 44, height: 44 },
  dots: { width: 32, height: 44, alignItems: 'center', justifyContent: 'center' },
  focus: {
    borderWidth: 1,
    borderColor: c.line.default,
    borderRadius: tokens.radius.xl,
    padding: tokens.space[16],
    paddingTop: 0,
    gap: tokens.space[4],
  },
  collapsed: {
    backgroundColor: c.bg.surface,
    borderRadius: tokens.radius.xl,
    paddingHorizontal: tokens.space[12],
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[12],
    minHeight: 68,
  },
  collapsedDone: { minHeight: 68, paddingHorizontal: tokens.space[16] },
  doneMark: { width: 24, height: 24, borderRadius: 12, backgroundColor: c.bg.inverse, alignItems: 'center', justifyContent: 'center' },
  openMark: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: c.line.strong, backgroundColor: c.bg.default },
  pausedCard: { backgroundColor: c.bg.surface, borderRadius: tokens.radius.xl, padding: tokens.space[16], gap: 6 },
  summary: {
    backgroundColor: c.bg.surface,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space[16],
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
  },
});
