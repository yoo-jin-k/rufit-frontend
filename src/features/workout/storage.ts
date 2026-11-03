/**
 * 기기 내 운동 기록의 형식 검증, 이전 형식 복원, 순차 저장을 담당합니다.
 * 읽기에 실패한 기록을 빈 기록으로 대체하지 않으며, 기존 저장 자료를 보존합니다.
 */
import { validDate } from '../strength/model.ts';
import { finishWorkout, type Workout } from './model.ts';
export type LocalRest = { workoutId: string; exerciseId: string; setId: string; endsAt: number; pausedAt?: number };
export type WorkoutArchive = {
  schemaVersion: 3;
  current: Workout | null;
  history: Workout[];
  rest: LocalRest | null;
  personalRest: Record<string, number>;
};
export const emptyArchive = (): WorkoutArchive => ({
  schemaVersion: 3,
  current: null,
  history: [],
  rest: null,
  personalRest: {},
});
type Storage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};
const key = 'rufit.local-workouts.v1';
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;
const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
// 저장된 운동의 시간과 입력 구조를 검사해 손상된 기록을 잘못 복구하지 않습니다.
export function isWorkout(value: unknown): value is Workout {
  if (
    !object(value) ||
    typeof value.id !== 'string' ||
    !finite(value.startedAt) ||
    (value.finishedAt !== undefined &&
      (!finite(value.finishedAt) || value.finishedAt < value.startedAt)) ||
    !Array.isArray(value.exercises)
  )
    return false;
  if (
    value.recordDate !== undefined &&
    (typeof value.recordDate !== 'string' || !validDate(value.recordDate))
  )
    return false;
  if (
    value.entryMode !== undefined &&
    (value.entryMode !== 'manual' || typeof value.recordDate !== 'string')
  )
    return false;
  if (
    value.pausedAt !== undefined &&
    (!finite(value.pausedAt) || value.pausedAt < value.startedAt || value.finishedAt !== undefined)
  )
    return false;
  if (
    value.pausedDurationMs !== undefined &&
    (!finite(value.pausedDurationMs) ||
      !Number.isSafeInteger(value.pausedDurationMs) ||
      value.pausedDurationMs < 0)
  )
    return false;
  const until = value.finishedAt ?? value.pausedAt;
  if (finite(until) && ((value.pausedDurationMs as number) ?? 0) > until - value.startedAt)
    return false;
  return value.exercises.every(
    (e) =>
      object(e) &&
      typeof e.id === 'string' &&
      typeof e.name === 'string' &&
      (e.catalogId === undefined || typeof e.catalogId === 'string') &&
      Array.isArray(e.sets) &&
      e.sets.every(
        (s) =>
          object(s) &&
          typeof s.id === 'string' &&
          typeof s.weight === 'string' &&
          typeof s.reps === 'string' &&
          typeof s.completed === 'boolean',
      ),
  );
}
// 이전 저장 형식을 보존해 읽고, 잘못된 자료는 빈 기록으로 덮어쓰지 않습니다.
export function decodeArchive(raw: string | null): WorkoutArchive {
  if (raw === null) return emptyArchive();
  const value: unknown = JSON.parse(raw);
  if (
    !object(value) ||
    ![1, 2, 3].includes(value.schemaVersion as number) ||
    !(value.current === null || isWorkout(value.current)) ||
    !Array.isArray(value.history) ||
    !value.history.every((w) => isWorkout(w) && w.finishedAt !== undefined)
  )
    throw new Error('저장된 기록을 읽을 수 없습니다. 기존 데이터는 보존했습니다.');
  const rest = value.schemaVersion === 3 ? value.rest : null;
  const personalRest = value.schemaVersion === 3 ? value.personalRest : {};
  if (
    !object(personalRest) ||
    Array.isArray(personalRest) ||
    Object.values(personalRest).some(
      (v) => !finite(v) || !Number.isSafeInteger(v) || v < 0 || v > 3600,
    ) ||
    (rest !== null &&
      (!object(rest) ||
        typeof rest.workoutId !== 'string' ||
        typeof rest.exerciseId !== 'string' ||
        typeof rest.setId !== 'string' ||
        !finite(rest.endsAt) ||
        !Number.isSafeInteger(rest.endsAt) ||
        (rest.pausedAt !== undefined &&
          (!finite(rest.pausedAt) || !Number.isSafeInteger(rest.pausedAt) ||
            rest.pausedAt < ((value.current as Workout | null)?.startedAt ?? Infinity))) ||
        !restMatches(rest as LocalRest, value.current as Workout | null)))
  )
    throw new Error('휴식 설정을 읽을 수 없습니다. 기존 데이터는 보존했습니다.');
  return {
    schemaVersion: 3,
    current: value.current as Workout | null,
    history: value.history as Workout[],
    rest: rest as LocalRest | null,
    personalRest: personalRest as Record<string, number>,
  };
}
function restMatches(rest: LocalRest, workout: Workout | null) {
  return (
    workout !== null &&
    workout.finishedAt === undefined &&
    workout.id === rest.workoutId &&
    rest.endsAt >= workout.startedAt &&
    workout.exercises
      .find((e) => e.id === rest.exerciseId)
      ?.sets.some((s) => s.id === rest.setId && s.completed) === true
  );
}
// 운동 변경과 이력을 반영하고 사라진/취소한 완료 세트의 휴식을 정리합니다.
export function remember(archive: WorkoutArchive, workout: Workout | null): WorkoutArchive {
  return {
    ...archive,
    current: workout,
    rest: archive.rest && restMatches(archive.rest, workout) ? archive.rest : null,
    history:
      workout?.finishedAt === undefined
        ? archive.history
        : [...archive.history.filter((w) => w.id !== workout.id), workout],
  };
}
// 저장을 순서대로 실행해 느린 이전 저장이 최신 입력을 덮어쓰지 않게 합니다.
export function createWorkoutStorage(storage: Storage) {
  let tail: Promise<void> = Promise.resolve();
  return {
    async load() {
      await tail.catch(() => {});
      return decodeArchive(await storage.getItem(key));
    },
    save(value: WorkoutArchive) {
      const snapshot = JSON.stringify(value);
      const pending = tail.catch(() => {}).then(() => storage.setItem(key, snapshot));
      tail = pending;
      return pending;
    },
  };
}

/** 같은 종료 요청의 재전달은 무시하고, 현재 운동과 이력·휴식을 한 저장본으로 갱신합니다. */
export function finishArchivedWorkout(
  archive: WorkoutArchive, workoutId: string, now: number, discardIncomplete = false,
): WorkoutArchive {
  const current = archive.current;
  if (!current || current.id !== workoutId || current.finishedAt !== undefined) return archive;
  return remember(archive, finishWorkout(current, now, discardIncomplete));
}
