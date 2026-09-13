import { isRoutine, type Routine } from './model.ts';

export type RoutineLibrary = { schemaVersion: 1; routines: Routine[] };
export const MAX_ROUTINES = 50;
export const emptyRoutineLibrary = (): RoutineLibrary => ({ schemaVersion: 1, routines: [] });
type Storage = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> };
const key = 'rufit.local-routines.v1';
const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

export function decodeRoutineLibrary(raw: string | null): RoutineLibrary {
  if (raw === null) return emptyRoutineLibrary();
  const value: unknown = JSON.parse(raw);
  if (!object(value) || value.schemaVersion !== 1 || !Array.isArray(value.routines) || value.routines.length > MAX_ROUTINES ||
    !value.routines.every(isRoutine) || new Set(value.routines.map(routine => routine.id)).size !== value.routines.length)
    throw new Error('저장된 루틴을 읽을 수 없습니다. 기존 데이터는 보존했습니다.');
  return { schemaVersion: 1, routines: value.routines };
}

export function upsertRoutine(library: RoutineLibrary, routine: Routine): RoutineLibrary {
  if (!isRoutine(routine)) throw new Error('저장할 루틴을 확인해 주세요.');
  const exists = library.routines.some(item => item.id === routine.id);
  if (!exists && library.routines.length >= MAX_ROUTINES) throw new Error('루틴은 최대 50개까지 저장할 수 있습니다.');
  return { ...library, routines: exists ? library.routines.map(item => item.id === routine.id ? routine : item) : [...library.routines, routine] };
}

export function createRoutineStorage(storage: Storage) {
  let tail: Promise<void> = Promise.resolve();
  return {
    async load() { await tail.catch(() => {}); return decodeRoutineLibrary(await storage.getItem(key)); },
    save(value: RoutineLibrary) {
      const snapshot = JSON.stringify(value);
      const pending = tail.catch(() => {}).then(() => storage.setItem(key, snapshot));
      tail = pending;
      return pending;
    },
  };
}
