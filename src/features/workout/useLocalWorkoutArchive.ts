import { useEffect, useState, useSyncExternalStore } from 'react';
import {
  createArchiveState,
  describeArchiveState,
  type ArchivePersistence,
} from './archiveState.ts';
import { appendManualWorkout } from './manualWorkout.ts';
import { remember } from './storage.ts';
import type { Exercise, Workout } from './model.ts';
import {
  setDefaultRest,
  applyRestSettings,
  completeWithRest,
  completeAllWithRest,
  exerciseRest,
  setPersonalRest,
  adjustLocalRest,
} from './localRest.ts';

// 훅 생명주기와 저장 상태를 연결합니다. 재렌더/창 크기 변경으로 상태 객체를 다시 만들지 않습니다.
export function useLocalWorkoutArchive(storage: ArchivePersistence, now = Date.now) {
  const [controller] = useState(() => createArchiveState(storage));
  const value = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  useEffect(() => controller.connect(), [controller]);
  const archive = value.archive;
  const setWorkout = (next: Workout | null | ((current: Workout | null) => Workout | null)) => {
    controller.change((current) =>
      remember(current, typeof next === 'function' ? next(current.current) : next),
    );
  };
  return {
    workout: archive.current,
    history: archive.history,
    rest: archive.rest,
    restFor: (exercise: Exercise) => exerciseRest(archive, exercise),
    setWorkout,
    addManualWorkout: (workout: Workout) =>
      controller.change((current) => appendManualWorkout(current, workout)),
    completeSet: (exerciseId: string, setId: string, completed: boolean) =>
      controller.change((current) =>
        completeWithRest(current, exerciseId, setId, completed, now()),
      ),
    completeAllSets: (exerciseId: string, completed: boolean) =>
      controller.change((current) => completeAllWithRest(current, exerciseId, completed, now())),
    applyRest: (exercise: Exercise, seconds: number | null, all: boolean) =>
      controller.change((current) => applyRestSettings(current, exercise, seconds, all, now())),
    defaultRest: archive.personalRest['defaults:rest'],
    saveDefaultRest: (seconds: number | null) =>
      controller.change((current) => setDefaultRest(current, seconds)),
    saveRest: (exercise: Exercise, seconds: number | null) =>
      controller.change((current) => setPersonalRest(current, exercise, seconds)),
    adjustRest: (seconds: number) =>
      controller.change((current) => adjustLocalRest(current, seconds, now())),
    skipRest: () => controller.change((current) => ({ ...current, rest: null })),
    state: value.state,
    ready: value.ready,
    retryPending: value.retryPending,
    unsavedAfterFailure: value.unsavedAfterFailure,
    ...describeArchiveState(value),
    retry: controller.retry,
  };
}
