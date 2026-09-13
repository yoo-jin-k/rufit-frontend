import type { Workout, WorkoutSet } from './model.ts';
export type WorkoutArchive = { schemaVersion: 2; current: Workout | null; history: Workout[] };
export const emptyArchive = (): WorkoutArchive => ({ schemaVersion: 2, current: null, history: [] });
type Storage = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> };
const key = 'rufit.local-workouts.v1';
const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const safeInteger = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value);
type StoredExercise = { sets: WorkoutSet[] };
export function isWorkout(value: unknown): value is Workout {
  if (!object(value) || typeof value.id !== 'string' || !finite(value.startedAt) ||
    (value.finishedAt !== undefined && (!finite(value.finishedAt) || value.finishedAt < value.startedAt)) || !Array.isArray(value.exercises)) return false;
  if (value.pausedAt !== undefined && (!finite(value.pausedAt) || value.pausedAt < value.startedAt || value.finishedAt !== undefined)) return false;
  if (value.pausedDurationMs !== undefined && (!finite(value.pausedDurationMs) || !safeInteger(value.pausedDurationMs) || value.pausedDurationMs < 0)) return false;
  const until = value.finishedAt ?? value.pausedAt;
  if (finite(until) && ((value.pausedDurationMs as number | undefined) ?? 0) > until - value.startedAt) return false;
  const exercisesValid = value.exercises.every(e => object(e) && typeof e.id === 'string' && typeof e.name === 'string' &&
    (e.catalogId === undefined || typeof e.catalogId === 'string') && Array.isArray(e.sets) &&
    e.sets.every(s => object(s) && typeof s.id === 'string' && typeof s.weight === 'string' && typeof s.reps === 'string' && typeof s.completed === 'boolean'));
  if (!exercisesValid) return false;
  const timer = value.restTimer;
  if (timer !== undefined) {
    if (!object(timer) || typeof timer.setId !== 'string' || !timer.setId ||
      !safeInteger(timer.startedAt) || timer.startedAt < value.startedAt ||
      !safeInteger(timer.durationMs) || timer.durationMs <= 0 || timer.durationMs > 30 * 60_000 || value.finishedAt !== undefined) return false;
    const exercises = value.exercises as StoredExercise[];
    const target = exercises.flatMap(e => e.sets).find(s => s.id === timer.setId);
    if (!target?.completed) return false;
  }
  return true;
}
export function decodeArchive(raw: string | null): WorkoutArchive {
  if (raw === null) return emptyArchive();
  const value: unknown = JSON.parse(raw);
  if (!object(value) || ![1, 2].includes(value.schemaVersion as number) || !(value.current === null || isWorkout(value.current)) ||
    !Array.isArray(value.history) || !value.history.every(w => isWorkout(w) && w.finishedAt !== undefined))
    throw new Error('저장된 기록을 읽을 수 없습니다. 기존 데이터는 보존했습니다.');
  return { schemaVersion: 2, current: value.current as Workout | null, history: value.history as Workout[] };
}
export function remember(archive: WorkoutArchive, workout: Workout | null): WorkoutArchive {
  return { ...archive, current: workout, history: workout?.finishedAt === undefined ? archive.history :
    [...archive.history.filter(w => w.id !== workout.id), workout] };
}
export function createWorkoutStorage(storage: Storage) {
  let tail: Promise<void> = Promise.resolve();
  return {
    async load() { await tail.catch(() => {}); return decodeArchive(await storage.getItem(key)); },
    save(value: WorkoutArchive) {
      const snapshot = JSON.stringify(value);
      const pending = tail.catch(() => {}).then(() => storage.setItem(key, snapshot));
      tail = pending;
      return pending;
    },
  };
}
