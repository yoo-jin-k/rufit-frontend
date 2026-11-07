import { journalDraftStorage, type JournalDraft } from '../profile/journalDraftStorage';
import { AppIcon } from '../../components/AppIcon';
import { ReceivedCheersButton } from '../cheers/ReceivedCheersButton';
import { AppModal as Modal } from '../../components/AppModal';
import { useServerLive } from '../cheers/useServerLive';
import { ServerWorkoutFriends } from '../cheers/ServerWorkoutFriends';
import { TodayWorkoutCard } from './TodayWorkoutCard';
import { WorkoutFriends, useWorkoutPresence } from '../cheers/WorkoutFriends';
import type { RufitSession } from '../../api/session';
import { ServerHistoryScreen } from './ServerHistoryScreen';
import { PreviousSets } from './PreviousSets';
import { importPreviousSets } from './previousSetModel';
import { SetControls } from './SetControls';
import { SortableSets } from './SortableSets';
import { NotificationButton } from '../../components/NotificationButton';
import { BottomNavigation, type MainTab } from '../../components/BottomNavigation';
import { ui } from '../../components/ScreenLayout';
import { AnalysisScreen } from '../analysis/AnalysisScreen';
import { ProfileScreen } from '../profile/ProfileScreen';
import { SettingsScreen } from '../settings/SettingsScreen';
import { JournalComposer } from '../profile/JournalComposer';
import { useProfile } from '../profile/useProfile';
import { upsertJournal } from '../profile/journalModel';
import { WorkoutHistory, workoutDate } from './WorkoutHistory';
/**
 * 운동 화면의 진입점으로 캘린더, 실시간 기록, 수동 기록, 측정 화면을 연결합니다.
 * 실시간 운동은 기존 저장 훅을 통해 변경하며, 다른 화면을 열어도 타이머와 진행 상태를 유지합니다.
 * 월간 달성률은 종료 명령 이후 기기 저장이 성공한 경우에만 표시합니다.
 */
import { MonthlyCompletion } from '../calendar/MonthlyCompletion';
import { completionMonthFor, monthlyProgress } from '../calendar/monthlyProgress';
import { ManualWorkoutScreen } from './ManualWorkoutScreen';
import { WorkoutCalendar } from '../calendar/WorkoutCalendar';
import { BodyWeightScreen } from '../bodyweight/BodyWeightScreen';
import { StrengthScreen } from '../strength/StrengthScreen';
import { useEffect, useState } from 'react';
import {
  AppState,

  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { colors, radius, spacing, typography } from '../../theme/tokens';
import { ExercisePicker } from '../exercises/ExercisePicker';
import { findCatalogExercise, type CatalogExercise } from '../exercises/catalog';
import {
  addExercise,
  addSet,
  removeSet,
  removeExercise,
  moveSet,
  startWorkout,
  updateSet,
  pauseWorkout,
  resumeWorkout,
  elapsedWorkoutMs,
  IncompleteSetsError,
  type Workout,
} from './model';
import { useWorkoutArchive } from './useWorkoutArchive';
import { formatRest } from './RestSetting';
import { RestTimerDock } from './RestTimerDock';
import { RestTimerSheet } from './RestTimerSheet';
import { recommendedRest } from '../exercises/recommendedRest';
import { restTimerView, workoutViewport } from './timerView';
import { timerStyles } from './TimerCard.styles';
import { SetRow } from './SetRow';
import { LocalSaveStatus } from './LocalSaveStatus';
let counter = 0;
const nextId = () => `${Date.now()}-${++counter}`;
export function WorkoutScreen({
  session = null,
  authLabel = '로그인',
  onOpenAuth,
}: {
  session?: RufitSession | null;
  authLabel?: string;
  onOpenAuth?: () => void;
}) {
  const {
    workout,
    setWorkout,
    addManualWorkout,
    finishCurrentWorkout,
    deleteWorkout,
    history,
    rest,
    restFor,
    completeSet,
    completeAllSets,
    applyRest,
    defaultRest,
    saveDefaultRest,
    adjustRest,
    skipRest,
    pauseRest,
    resumeRest,
    ready,
    state,
    unsavedAfterFailure,
    retry,
    retryPending,
  } = useWorkoutArchive();
  useWorkoutPresence(
    ready && workout && workout.finishedAt === undefined ? workout.id : null,
    __DEV__ && !session,
  );
  const live = useServerLive(
    session,
    ready && workout && workout.finishedAt === undefined ? workout.id : null,
  );
  const [serverHistory, setServerHistory] = useState(false);
  const [tab, setTab] = useState<MainTab>('workout');
  const accountKey = session ? `${session.scope.server}:${session.scope.accountId}` : null;
  // 로그인이 완료되어 계정이 바뀌면 설정 등 다른 메뉴에 있었더라도 메인 홈으로 이동합니다.
  const [seenAccount, setSeenAccount] = useState(accountKey);
  if (seenAccount !== accountKey) {
    setSeenAccount(accountKey);
    if (accountKey) setTab('workout');
  }
  const profile = useProfile();
  const [journalRevision, setJournalRevision] = useState(0);
  const [journalDestination, setJournalDestination] = useState<'account' | 'device'>('account');
  const [restoredDraft, setRestoredDraft] = useState<JournalDraft | null>(null);
  const draftScope = session ? `${session.scope.server}:${session.scope.accountId}` : 'guest';
  const [journalWorkout, setJournalWorkout] = useState<Workout | null>(null);
  const [completionMonth, setCompletionMonth] = useState<string | null>(null);
  const [manualDate, setManualDate] = useState<string | null>(null);
  const [showWeight, setShowWeight] = useState(false);
  const [showStrength, setShowStrength] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [draggingSet, setDraggingSet] = useState(false);

  const [removeExerciseId, setRemoveExerciseId] = useState<string | null>(null);
  const [restSettingsId, setRestSettingsId] = useState<string | null>(null);
  const [loadExerciseId, setLoadExerciseId] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void journalDraftStorage.load(draftScope).then(draft => {
      if (active && draft) { setRestoredDraft(draft); setJournalWorkout(draft.workout); }
    }).catch(() => { if (active) setError('작성 중인 오운완을 불러오지 못했습니다. 기존 자료는 보존했습니다.'); });
    return () => { active = false; };
  }, [draftScope]);
  const [now, setNow] = useState(Date.now);
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const viewport = workoutViewport(window.width, insets.left, insets.right, window.fontScale);
  const restView = rest ? restTimerView(rest.endsAt, rest.pausedAt ?? now) : null;
  // 표시만 주기적으로 갱신합니다. 접기·회전·백그라운드 전환은 운동을 자동 정지하지 않습니다.
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const tick = setInterval(refresh, 1000);
    const foreground = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearInterval(tick);
      foreground.remove();
    };
  }, []);
  // 저장 성공 상태에서만 팝업을 표시하며 실패 시 기존 재시도 안내를 유지합니다.
  function completeWorkout(discardIncomplete = false, timeOnly = false) {
    if (!workout || workout.finishedAt !== undefined) return;
    finishCurrentWorkout(workout.id, discardIncomplete, timeOnly);
    setCompletionMonth(completionMonthFor(workout));
    setNow(Date.now());
    setConfirmFinish(false);
    setConfirmEmpty(false);
    setError('');
  }
  function change(fn: (current: Workout) => Workout) {
    setWorkout((current) => {
      if (!current) throw new Error('운동을 먼저 시작해 주세요.');
      return fn(current);
    });
    setNow(Date.now());
    setConfirmFinish(false);
    setError('');
  }
  function act(fn: (current: Workout) => Workout) {
    try {
      change(fn);
    } catch (e) {
      setError(e instanceof Error ? e.message : '다시 시도해 주세요.');
    }
  }
  // 종료 요청은 상단에서 처리하며 미완료 세트 확인은 스크롤 위치와 무관하게 표시합니다.
  function requestFinish() {
    // 완료 세트가 없는 운동은 기록을 만들지 않고 종료할 수 있습니다.
    if (!workout?.exercises.some(e => e.sets.some(set => set.completed))) {
      setConfirmEmpty(true);
      return;
    }
    try {
      completeWorkout();
    } catch (e) {
      if (e instanceof IncompleteSetsError) {
        setError('');
        setConfirmFinish(true);
      } else setError(e instanceof Error ? e.message : '다시 시도해 주세요.');
    }
  }
  const restExercise = workout?.exercises.find((e) => e.id === restSettingsId);
  const finished = workout?.finishedAt !== undefined;
  const total = workout?.exercises.reduce((count, e) => count + e.sets.length, 0) ?? 0;
  const completed =
    workout?.exercises.reduce(
      (count, e) => count + e.sets.filter((set) => set.completed).length,
      0,
    ) ?? 0;
  return (
    <SafeAreaView style={s.page}>
      <KeyboardAvoidingView style={s.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {tab === 'workout' ? (
          <>
            {!!workout && !finished && (
              <View style={s.activeHeader}>
                <View style={ui.between}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.headerHint}>운동 기록 중</Text>
                    <Text style={s.headerTitle}>
                      운동 시간 {formatRest(Math.floor(elapsedWorkoutMs(workout, now) / 1000))}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={requestFinish}
                    style={s.headerAction}
                  >
                    <Text style={s.headerTitle}>운동 종료</Text>
                  </Pressable>
                </View>
                <View style={ui.between}>
                  <Text style={s.headerHint}>
                    {completed} / {total}세트 완료
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    style={s.headerAction}
                    onPress={() =>
                      act((w) =>
                        w.pausedAt !== undefined
                          ? resumeWorkout(w, Date.now())
                          : pauseWorkout(w, Date.now()),
                      )
                    }
                  >
                    <Text style={s.headerHint}>
                      {workout.pausedAt !== undefined ? '운동 시작' : '일시정지'}
                    </Text>
                  </Pressable>
                  <View style={{ backgroundColor: colors.surface, borderRadius: 24, flexDirection: 'row', alignItems: 'center' }}>
                    <NotificationButton /><ReceivedCheersButton live={live} workout={workout?.id} />
                  </View>
                </View>
                {!!error && (
                  <Text accessibilityRole="alert" style={{ color: '#FFD0D0', lineHeight: 21 }}>
                    {error}
                  </Text>
                )}
              </View>
            )}
            <ScrollView
              scrollEnabled={!draggingSet}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={[
                timerStyles.content,
                { paddingHorizontal: viewport.contentPadding, paddingTop: viewport.contentPadding },
                workout && !finished ? { paddingBottom: 80 } : undefined,
              ]}
            >
              {(!workout || finished) && (
                <>
                  <View style={{ gap: 6 }}>
                    <Text style={s.muted}>
                      {new Date(now).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        weekday: 'long',
                      })}
                    </Text>
                    <View style={ui.between}>
                      <Text style={s.title}>오늘</Text>
                      {/* 알림 아이콘을 하트 바로 왼쪽에 붙여 한 묶음으로 둡니다. */}
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <NotificationButton /><ReceivedCheersButton live={live} workout={workout?.id} />
                      </View>
                    </View>
                  </View>
                  <WorkoutCalendar
                    history={history}
                    ready={ready}
                    now={now}
                    onAdd={setManualDate}
                  />
                  <>
                    {session ? (
                      <ServerWorkoutFriends session={session} live={live} />
                    ) : (
                      <WorkoutFriends enabled={__DEV__} />
                    )}
                  </>
                  <Text style={s.heading}>오늘의 운동</Text>
                </>
              )}
              {!!workout && !finished && (
                <>
                  {session ? (
                    <ServerWorkoutFriends session={session} live={live} />
                  ) : (
                    <WorkoutFriends workout={workout.id} enabled={__DEV__} />
                  )}
                </>
              )}
              <LocalSaveStatus
                state={state}
                ready={ready}
                unsavedAfterFailure={unsavedAfterFailure}
                retryPending={retryPending}
                onRetry={retry}
              />
              {!ready ? null : !workout || finished ? (
                <>
                  <TodayWorkoutCard
                    history={history}
                    now={now}
                    journals={profile.value.journals}
                    onJournal={setJournalWorkout}
                    onDelete={deleteWorkout}
                  />
                  <View style={ui.between}>
                    <Text style={s.heading}>최근 운동</Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setTab('profile')}
                      style={{ padding: 12 }}
                    >
                      <Text style={s.muted}>전체 보기</Text>
                    </Pressable>
                  </View>
                  <WorkoutHistory
                    records={[...history]
                      .sort(
                        (a, b) =>
                          workoutDate(b).localeCompare(workoutDate(a)) || b.startedAt - a.startedAt,
                      )
                      .slice(0, 3)}
                  />
                </>
              ) : (
                <>
                  {!workout.exercises.length && (
                    <View style={s.empty}>
                      <Text style={s.heading}>어떤 운동부터 할까요?</Text>
                      <Text style={s.muted}>사진과 운동 부위를 보고 종목을 선택해요.</Text>
                    </View>
                  )}
                  {workout.exercises.map((e) => {
                    const catalog = findCatalogExercise(e.catalogId);
                    return (
                      <View style={s.card} key={e.id}>
                        <WorkoutExerciseHeader
                          onRemove={() => setRemoveExerciseId(e.id)}
                          name={e.name}
                          catalog={catalog}
                          fontScale={window.fontScale}
                        />
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`${e.name} 휴식시간 설정`}
                          style={{ minHeight: 44, justifyContent: 'center' }}
                          onPress={() => setRestSettingsId(e.id)}
                        >
                          <Text style={s.muted}>
                            휴식 {formatRest(restFor(e).seconds)} · {restFor(e).source} ›
                          </Text>
                        </Pressable>
                        <SetControls
                          allCompleted={e.sets.length > 0 && e.sets.every((set) => set.completed)}
                          onCompleteAll={() => {
                            try {
                              completeAllSets(e.id, !e.sets.every((set) => set.completed));
                              setNow(Date.now());
                              setError('');
                            } catch (error) {
                              setError(
                                error instanceof Error ? error.message : '세트를 확인해 주세요.',
                              );
                            }
                          }}
                          onLoad={() => setLoadExerciseId(e.id)}
                          name={e.name}
                          count={e.sets.length}
                          disabled={finished}
                          onAdd={() => act((w) => addSet(w, e.id, nextId(), e.sets.at(-1)?.id))}
                          onRemove={() => {
                            const last = e.sets.at(-1);
                            if (last) act((w) => removeSet(w, e.id, last.id));
                          }}
                        />
                        <View style={{ flexDirection: 'row', paddingLeft: 56, paddingRight: 48 }}>
                          <Text style={[s.muted, { flex: 1, textAlign: 'center' }]}>무게 kg</Text>
                          <Text style={[s.muted, { flex: 1, textAlign: 'center' }]}>횟수</Text>
                        </View>
                        <SortableSets
                          onDraggingChange={setDraggingSet}
                          sets={e.sets}
                          name={e.name}
                          disabled={finished}
                          onMove={(setId, target) => act((w) => moveSet(w, e.id, setId, target))}
                        >
                          {(set, i, handle) => (
                            <SetRow
                              key={set.id}
                              dragHandle={handle}
                              set={set}
                              index={i}
                              exerciseName={e.name}
                              fontScale={window.fontScale}
                              finished={finished}
                              onChange={(patch) => act((w) => updateSet(w, e.id, set.id, patch))}
                              onComplete={() => {
                                try {
                                  completeSet(e.id, set.id, !set.completed);
                                  setNow(Date.now());
                                  setError('');
                                  setConfirmFinish(false);
                                } catch (error) {
                                  setError(
                                    error instanceof Error
                                      ? error.message
                                      : '세트를 확인해 주세요.',
                                  );
                                }
                              }}
                              onDelete={() => act((w) => removeSet(w, e.id, set.id))}
                              onDuplicate={() => act((w) => addSet(w, e.id, nextId(), set.id))}
                            />
                          )}
                        </SortableSets>
                        {!e.sets.length && (
                          <Text style={s.muted}>＋ 버튼으로 세트를 추가해 주세요.</Text>
                        )}
                      </View>
                    );
                  })}
                </>
              )}
              {!!error && (!workout || finished) && (
                <Text accessibilityRole="alert" style={s.error}>
                  {error}
                </Text>
              )}
            </ScrollView>
            {/* 하단 조작부는 목록 밖에 있어 스크롤해도 같은 위치를 유지합니다. */}
            {workout && !finished ? (
              <View style={s.activeDock} pointerEvents="box-none">
                {/* 버튼 주변의 투명 영역은 스크롤 터치를 가로채지 않습니다. */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="종목 추가"
                  disabled={!ready}
                  style={s.addExercise}
                  onPress={() => setShowPicker(true)}
                >
                  <Text style={s.plus}>＋</Text>
                </Pressable>
                {rest && restView && (
                  <RestTimerDock
                    view={restView}
                    paused={rest.pausedAt !== undefined}
                    onSettings={() => setRestSettingsId(rest.exerciseId)}
                    onTogglePause={() => {
                      if (rest.pausedAt !== undefined) resumeRest();
                      else pauseRest();
                      setNow(Date.now());
                    }}
                    onAdjust={(seconds) => {
                      adjustRest(seconds);
                      setNow(Date.now());
                    }}
                    onClose={skipRest}
                  />
                )}
              </View>
            ) : (
              <View style={ui.dock}>
                <Button
                  title="운동 시작하기"
                  disabled={!ready}
                  onPress={() => {
                    setWorkout(startWorkout(nextId(), Date.now()));
                    setShowPicker(true);
                  }}
                />
              </View>
            )}
          </>
        ) : tab === 'analysis' ? (
          <AnalysisScreen
            key={`${showStrength}-${showWeight}`}
            now={now}
            history={history}
            onStrength={() => setShowStrength(true)}
            onWeight={() => setShowWeight(true)}
          />
        ) : tab === 'profile' ? (
          <ProfileScreen
            key={`${session ? `${session.scope.server}:${session.scope.accountId}` : 'guest'}:${journalRevision}`}
            initialJournalSource={journalDestination}
            session={session}
            now={now}
            history={history}
            profile={profile}
            onJournal={setJournalWorkout}
          />
        ) : (
          <SettingsScreen
            live={session ? live : undefined}
            onServerHistory={session?.isActive() ? () => setServerHistory(true) : undefined}
            defaultRest={defaultRest}
            onRest={saveDefaultRest}
            nickname={profile.value.nickname}
            history={history}
            onProfile={() => setTab('profile')}
            authLabel={authLabel}
            onAuth={() => {
              if (workout && !finished) act(w => pauseWorkout(w, Date.now()));
              onOpenAuth?.();
            }}
          />
        )}
        {tab !== 'workout' && state !== 'saved' && (
          <View style={ui.dock}>
            <LocalSaveStatus
              state={state}
              ready={ready}
              unsavedAfterFailure={unsavedAfterFailure}
              retryPending={retryPending}
              onRetry={retry}
            />
          </View>
        )}
        <Modal visible={confirmEmpty} transparent animationType="fade" onRequestClose={() => setConfirmEmpty(false)}>
          <View style={s.confirmBackdrop}><View style={s.card}>
            <Text style={s.heading}>운동을 종료할까요?</Text>
            <Text style={s.muted}>완료한 세트가 없습니다. 시간만 저장해 오운완을 남기거나, 기록 없이 종료할 수 있습니다. 미완료 세트는 저장하지 않습니다.</Text>
            <Button title="계속 운동하기" onPress={() => setConfirmEmpty(false)} />
            <Button title="시간 기록 저장하고 종료" onPress={() => {
              try { completeWorkout(false, true); } catch (cause) { setError(cause instanceof Error ? cause.message : '종료하지 못했습니다.'); }
            }} />
            <Button title="기록 없이 종료" secondary onPress={() => {
              setWorkout(null); setConfirmEmpty(false); setError('');
            }} />
          </View></View>
        </Modal>
        <BottomNavigation value={tab} onChange={setTab} />
        <Modal
          visible={!!removeExerciseId}
          transparent
          animationType="fade"
          onRequestClose={() => setRemoveExerciseId(null)}
        >
          <View style={s.confirmBackdrop}>
            <View style={s.card}>
              <Text style={s.heading}>이 종목을 현재 운동에서 뺄까요?</Text>
              <Text style={s.muted}>
                이 종목의 입력 세트가 함께 제거됩니다. 이전에 저장한 운동 기록은 유지됩니다.
              </Text>
              <Button title="계속 운동하기" onPress={() => setRemoveExerciseId(null)} />
              <Button
                title="현재 운동에서 종목 제거"
                secondary
                onPress={() => {
                  act((w) => removeExercise(w, removeExerciseId!));
                  setRemoveExerciseId(null);
                }}
              />
            </View>
          </View>
        </Modal>
        {serverHistory && session?.isActive() && (
          <ServerHistoryScreen
            key={`${session.scope.server}:${session.scope.accountId}`}
            session={session}
            history={history}
            onChanged={() => setNow(Date.now())}
            onClose={() => setServerHistory(false)}
          />
        )}
        {restExercise && (
          <RestTimerSheet
            key={restExercise.id}
            name={restExercise.name}
            seconds={restFor(restExercise).seconds}
            recommended={recommendedRest(findCatalogExercise(restExercise.catalogId)) ?? 90}
            onClose={() => setRestSettingsId(null)}
            onApply={(seconds, all) => {
              applyRest(restExercise, seconds, all);
              setNow(Date.now());
            }}
          />
        )}
        <Modal
          visible={confirmFinish}
          transparent
          animationType="fade"
          onRequestClose={() => setConfirmFinish(false)}
        >
          <View style={s.confirmBackdrop}>
            <View style={s.card}>
              <Text style={s.heading}>미완료 세트를 제외하고 종료할까요?</Text>
              {!!error && (
                <Text accessibilityRole="alert" style={s.error}>
                  {error}
                </Text>
              )}
              <Button
                title="완료한 세트만 저장하고 종료"
                onPress={() => {
                  try {
                    completeWorkout(true);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : '다시 시도해 주세요.');
                  }
                }}
              />
              <Button title="계속 운동하기" secondary onPress={() => setConfirmFinish(false)} />
            </View>
          </View>
        </Modal>
        {journalWorkout && (
          <JournalComposer
            key={session ? `${session.scope.server}:${session.scope.accountId}` : 'guest'}
            session={session}
            workout={journalWorkout}
            nickname={profile.value.nickname}
            restoredDraft={restoredDraft?.workout.id === journalWorkout.id ? restoredDraft : null}
            initial={profile.value.journals.find((j) => j.workoutId === journalWorkout.id)}
            onClose={() => { setJournalWorkout(null); setRestoredDraft(null); }}
            onSave={async (j, accountSaved) => {
              if (!accountSaved) await profile.save(upsertJournal(profile.value, j));
              // 프로필에서 저장해도 목록을 다시 조회하고 선택한 저장 위치를 표시합니다.
              setJournalDestination(accountSaved ? 'account' : 'device');
              setJournalRevision((value) => value + 1);
              setTab('profile');
            }}
          />
        )}
        <MonthlyCompletion
          progress={
            completionMonth && finished && state === 'saved'
              ? monthlyProgress(history, completionMonth)
              : null
          }
          workout={workout}
          onJournal={() => {
            setCompletionMonth(null);
            if (workout) setJournalWorkout(workout);
          }}
          onClose={() => setCompletionMonth(null)}
        />
        {manualDate && (
          <ManualWorkoutScreen
            initialDate={manualDate}
            history={history}
            onClose={() => setManualDate(null)}
            onSave={(record) => {
              addManualWorkout(record);
              setManualDate(null);
            }}
          />
        )}
        <Modal
          visible={showWeight}
          animationType="slide"
          onRequestClose={() => setShowWeight(false)}
        >
          {showWeight && (
            <BodyWeightScreen
              onClose={() => setShowWeight(false)}
              onNavigate={(next) => {
                setShowWeight(false);
                setTab(next);
              }}
            />
          )}
        </Modal>
        <Modal
          visible={showStrength}
          animationType="slide"
          onRequestClose={() => setShowStrength(false)}
        >
          {showStrength && (
            <StrengthScreen
              onClose={() => setShowStrength(false)}
              onNavigate={(next) => {
                setShowStrength(false);
                setTab(next);
              }}
            />
          )}
        </Modal>
        {workout?.exercises.find((exercise) => exercise.id === loadExerciseId) && (
          <PreviousSets
            history={history}
            target={workout.exercises.find((exercise) => exercise.id === loadExerciseId)!}
            onClose={() => setLoadExerciseId(null)}
            onLoad={(source, replace) => {
              change((current) =>
                importPreviousSets(current, loadExerciseId!, source, nextId, replace),
              );
            }}
          />
        )}
        <ExercisePicker
          visible={showPicker}
          selectedIds={workout?.exercises.flatMap((e) => (e.catalogId ? [e.catalogId] : [])) ?? []}
          onClose={() => setShowPicker(false)}
          onSelect={(exercises) =>
            change((w) =>
              exercises.reduce(
                (current, exercise) => addExercise(current, nextId(), exercise.name, exercise.id),
                w,
              ),
            )
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function WorkoutExerciseHeader({
  name,
  onRemove,
}: {
  name: string;
  onRemove(): void;
  catalog?: CatalogExercise;
  fontScale: number;
}) {
  return (
    <View style={s.exerciseHeader}>
      <Text style={[s.heading, { flex: 1 }]}>{name}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${name} 종목 제거`}
        onPress={onRemove}
        style={{ minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'center' }}
      >
        <AppIcon name="close" size={18} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  activeHeader: {
    backgroundColor: colors.text,
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 2,
  },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  headerHint: { color: '#E5E5E8', fontSize: 13 },
  headerAction: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  activeDock: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingHorizontal: 16,
    position: 'relative',
    zIndex: 2,
  },
  addExercise: {
    position: 'absolute',
    right: 16,
    top: -64,
    zIndex: 3,
    elevation: 4,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignSelf: 'flex-end',
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plus: { color: '#FFFFFF', fontSize: 32, lineHeight: 38 },
  confirmBackdrop: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#00000066' },
  page: { flex: 1, backgroundColor: colors.background },
  topline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 6,
  },
  intro: { gap: 8, marginBottom: 4 },
  authEntry: {
    minWidth: 48,
    minHeight: 48,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authEntryText: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  brand: { ...typography.heading, color: colors.primary },
  title: { ...typography.title, color: colors.text },
  heading: { ...typography.heading, color: colors.text },
  muted: { ...typography.caption, color: colors.textSecondary },
  summary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progress: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  empty: { paddingVertical: 24, gap: 10 },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 4,
    marginBottom: 4,
  },
  exerciseHeaderStacked: { flexDirection: 'column', alignItems: 'flex-start' },
  exerciseInfo: { flex: 1, width: '100%', minWidth: 0, gap: 4 },
  hint: { fontSize: 12, lineHeight: 20, color: colors.muted, textAlign: 'center' },
  error: { color: '#B42318', lineHeight: 24 },
});
