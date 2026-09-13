import type { Workout } from './model.ts';
export type WorkoutArchive = { schemaVersion: 1; current: Workout | null; history: Workout[] };
export const emptyArchive = (): WorkoutArchive => ({ schemaVersion: 1, current: null, history: [] });
type Storage = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> };
const key = 'rufit.local-workouts.v1';
const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
function isWorkout(value: unknown): value is Workout {
  if (!object(value) || typeof value.id !== 'string' || !finite(value.startedAt) ||
    (value.finishedAt !== undefined && (!finite(value.finishedAt) || value.finishedAt < value.startedAt)) || !Array.isArray(value.exercises)) return false;
  return value.exercises.every(e => object(e) && typeof e.id === 'string' && typeof e.name === 'string' &&
    (e.catalogId === undefined || typeof e.catalogId === 'string') && Array.isArray(e.sets) &&
    e.sets.every(s => object(s) && typeof s.id === 'string' && typeof s.weight === 'string' && typeof s.reps === 'string' && typeof s.completed === 'boolean'));
}
export function decodeArchive(raw: string | null): WorkoutArchive {
  if (raw === null) return emptyArchive();
  const value: unknown = JSON.parse(raw);
  if (!object(value) || value.schemaVersion !== 1 || !(value.current === null || isWorkout(value.current)) ||
    !Array.isArray(value.history) || !value.history.every(w => isWorkout(w) && w.finishedAt !== undefined))
    throw new Error('저장된 기록을 읽을 수 없습니다. 기존 데이터는 보존했습니다.');
  return value as WorkoutArchive;
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
