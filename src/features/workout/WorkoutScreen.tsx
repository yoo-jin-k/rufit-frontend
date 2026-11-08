import { journalDraftStorage, type JournalDraft } from '../profile/journalDraftStorage';
import { AppModal as Modal } from '../../components/AppModal';
import { useServerLive } from '../cheers/useServerLive';
import { ServerWorkoutFriends } from '../cheers/ServerWorkoutFriends';
import { WorkoutFriends, useWorkoutPresence } from '../cheers/WorkoutFriends';
import type { RufitSession } from '../../api/session';
import { ServerHistoryScreen } from './ServerHistoryScreen';
import { PreviousSets } from './PreviousSets';
import { importPreviousSets } from './previousSetModel';
import { NotificationButton } from '../../components/NotificationButton';
import { BottomNavigation, type MainTab } from '../../components/BottomNavigation';
import { AnalysisScreen } from '../analysis/AnalysisScreen';
import { ProfileScreen } from '../profile/ProfileScreen';
import { SettingsScreen } from '../settings/SettingsScreen';
import { JournalComposer } from '../profile/JournalComposer';
import { useProfile } from '../profile/useProfile';
import { upsertJournal, type Journal } from '../profile/journalModel';
import { JournalSaved } from '../profile/JournalSaved';
/**
 * 운동 화면의 진입점으로 캘린더, 실시간 기록, 수동 기록, 측정 화면을 연결합니다.
 * 실시간 운동은 기존 저장 훅을 통해 변경하며, 다른 화면을 열어도 타이머와 진행 상태를 유지합니다.
 * 월간 달성률은 종료 명령 이후 기기 저장이 성공한 경우에만 표시합니다.
 */
import { MonthlyCompletion } from '../calendar/MonthlyCompletion';
import { completionMonthFor, monthlyProgress } from '../calendar/monthlyProgress';
import { ManualWorkoutScreen } from './ManualWorkoutScreen';
import { BodyWeightScreen } from '../bodyweight/BodyWeightScreen';
import { StrengthScreen } from '../strength/StrengthScreen';
import { useEffect, useState } from 'react';
import { BottomSheet, ConfirmDialog } from '../../components/kit/Surfaces';
import { WorkoutHome } from './WorkoutHome';
import { WorkoutSession, type SessionActions } from './WorkoutSession';
import { text, tokens } from '../../theme/tokens';
import {
  AppState,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button } from '../../components/Button';
import { ExercisePicker } from '../exercises/ExercisePicker';
import { findCatalogExercise } from '../exercises/catalog';
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
  IncompleteSetsError,
  type Workout,
} from './model';
import { useWorkoutArchive } from './useWorkoutArchive';
import { RestTimerSheet } from './RestTimerSheet';
import { recommendedRest } from '../exercises/recommendedRest';
import { restTimerView } from './timerView';
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
  const [savedJournal, setSavedJournal] = useState<{ journal: Journal; account: boolean } | null>(null);
  const [completionMonth, setCompletionMonth] = useState<string | null>(null);
  const [manualDate, setManualDate] = useState<string | null>(null);
  const [showWeight, setShowWeight] = useState(false);
  const [showStrength, setShowStrength] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [confirmEmpty, setConfirmEmpty] = useState(false);

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
  const status = (
    <LocalSaveStatus
      state={state}
      ready={ready}
      unsavedAfterFailure={unsavedAfterFailure}
      retryPending={retryPending}
      onRetry={retry}
    />
  );
  const sessionActions: SessionActions = {
    onChangeSet: (exerciseId, setId, patch) => act((w) => updateSet(w, exerciseId, setId, patch)),
    onCompleteSet: (exerciseId, setId, completed) => {
      try {
        completeSet(exerciseId, setId, completed);
        setNow(Date.now());
        setError('');
        setConfirmFinish(false);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : '세트를 확인해 주세요.');
      }
    },
    onCompleteAll: (exerciseId, completed) => {
      try {
        completeAllSets(exerciseId, completed);
        setNow(Date.now());
        setError('');
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : '세트를 확인해 주세요.');
      }
    },
    onAddSet: (exerciseId, afterSetId) => act((w) => addSet(w, exerciseId, nextId(), afterSetId)),
    onRemoveSet: (exerciseId, setId) => act((w) => removeSet(w, exerciseId, setId)),
    onMoveSet: (exerciseId, setId, target) => act((w) => moveSet(w, exerciseId, setId, target)),
    onRemoveExercise: (exerciseId) => act((w) => removeExercise(w, exerciseId)),
    onRestSettings: setRestSettingsId,
    onLoadPrevious: setLoadExerciseId,
    onAddExercise: () => setShowPicker(true),
    onTogglePause: () =>
      act((w) => (w.pausedAt !== undefined ? resumeWorkout(w, Date.now()) : pauseWorkout(w, Date.now()))),
    onFinish: requestFinish,
    onAdjustRest: (seconds) => {
      adjustRest(seconds);
      setNow(Date.now());
    },
    onToggleRestPause: () => {
      if (rest?.pausedAt !== undefined) resumeRest();
      else pauseRest();
      setNow(Date.now());
    },
    onSkipRest: skipRest,
  };
  const friends = session ? <ServerWorkoutFriends session={session} live={live} /> : <WorkoutFriends enabled={__DEV__} />;
  return (
    <View style={s.page}>
      <View style={s.page}>
        {tab === 'workout' ? (
          !!workout && !finished ? (
            <WorkoutSession
              workout={workout}
              history={history}
              now={now}
              ready={ready}
              rest={rest ?? null}
              restView={restView}
              restSecondsFor={(exercise) => restFor(exercise).seconds}
              restSourceFor={(exercise) => restFor(exercise).source}
              commonRest={defaultRest ?? undefined}
              status={state !== 'saved' ? status : undefined}
              error={error}
              actions={sessionActions}
            />
          ) : (
            <WorkoutHome
              history={history}
              ready={ready}
              now={now}
              journals={profile.value.journals}
              headerActions={<NotificationButton />}
              friends={friends}
              status={
                <>
                  {state !== 'saved' && status}
                  {!!error && (
                    <Text accessibilityRole="alert" style={s.error}>
                      {error}
                    </Text>
                  )}
                </>
              }
              onStart={() => {
                setWorkout(startWorkout(nextId(), Date.now()));
                setShowPicker(true);
              }}
              onManual={setManualDate}
              onJournal={setJournalWorkout}
              onDelete={deleteWorkout}
            />
          )
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
          <View style={s.dock}>
            <LocalSaveStatus
              state={state}
              ready={ready}
              unsavedAfterFailure={unsavedAfterFailure}
              retryPending={retryPending}
              onRetry={retry}
            />
          </View>
        )}
        <BottomSheet
          visible={confirmEmpty}
          title="운동을 끝낼까요?"
          subtitle="완료한 세트가 없어요. 시간만 저장하거나 기록 없이 끝낼 수 있어요."
          onClose={() => setConfirmEmpty(false)}
        >
          <Button title="시간 기록 저장하고 종료" onPress={() => {
            try { completeWorkout(false, true); } catch (cause) { setError(cause instanceof Error ? cause.message : '종료하지 못했습니다.'); }
          }} />
          <Button title="기록 없이 종료" variant="secondary" onPress={() => {
            setWorkout(null); setConfirmEmpty(false); setError('');
          }} />
          <Button title="계속하기" variant="soft" onPress={() => setConfirmEmpty(false)} />
        </BottomSheet>
        {/* 운동 진행 화면은 집중을 위해 하단 메뉴를 숨깁니다(Figma 03 섹션). */}
        {!(tab === 'workout' && !!workout && !finished) && <BottomNavigation value={tab} onChange={setTab} />}
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
        <ConfirmDialog
          visible={confirmFinish}
          title="운동을 끝낼까요?"
          message={`완료하지 않은 세트 ${total - completed}개는 기록에 남지 않아요`}
          cancelLabel="계속하기"
          confirmLabel="종료하기"
          onCancel={() => setConfirmFinish(false)}
          onConfirm={() => {
            try {
              completeWorkout(true);
            } catch (e) {
              setError(e instanceof Error ? e.message : '다시 시도해 주세요.');
              setConfirmFinish(false);
            }
          }}
        />
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
              // 저장 완료 화면(03-18)에서 프로필로 갈지 홈으로 갈지 고릅니다.
              setSavedJournal({ journal: j, account: !!accountSaved });
            }}
          />
        )}
        <JournalSaved
          journal={savedJournal?.journal ?? null}
          accountSaved={!!savedJournal?.account}
          onProfile={() => {
            setSavedJournal(null);
            setTab('profile');
          }}
          onHome={() => {
            setSavedJournal(null);
            setTab('workout');
          }}
        />
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
            <BodyWeightScreen onClose={() => setShowWeight(false)} />
          )}
        </Modal>
        <Modal
          visible={showStrength}
          animationType="slide"
          onRequestClose={() => setShowStrength(false)}
        >
          {showStrength && (
            <StrengthScreen onClose={() => setShowStrength(false)} />
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
          history={history}
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
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: tokens.color.bg.default },
  error: { ...text.caption, color: tokens.color.danger.default },
  dock: { paddingHorizontal: tokens.size.screenPadding, paddingVertical: tokens.space[8], backgroundColor: tokens.color.bg.default },
});
