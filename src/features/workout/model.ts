export type WorkoutSet = { id: string; weight: string; reps: string; completed: boolean };
export type Exercise = { id: string; name: string; catalogId?: string; sets: WorkoutSet[] };
export type RestTimer = { setId: string; startedAt: number; durationMs: number };
export type Workout = { id: string; startedAt: number; finishedAt?: number; pausedAt?: number; pausedDurationMs?: number; restTimer?: RestTimer; exercises: Exercise[] };
export const DEFAULT_REST_MS = 90_000;
export const MAX_REST_MS = 30 * 60_000;
export function startWorkout(id: string, now: number): Workout {
  return { id, startedAt: now, exercises: [] };
}
export const MAX_WORKOUT_SETS = 300;
function editable(workout: Workout) {
  if (workout.finishedAt !== undefined) throw new Error('종료한 운동은 수정할 수 없습니다.');
}
export function elapsedWorkoutMs(workout: Workout, now: number): number {
  return Math.max(0, (workout.finishedAt ?? workout.pausedAt ?? now) - workout.startedAt - (workout.pausedDurationMs ?? 0));
}
export function formatWorkoutTime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map(n => String(n).padStart(2, '0')).join(':');
}
export function formatRestTime(milliseconds: number): string {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
export function restRemainingMs(workout: Workout, now: number): number {
  const timer = workout.restTimer;
  if (!timer) return 0;
  return Math.max(0, timer.startedAt + timer.durationMs - now);
}
export function clearRestTimer(workout: Workout): Workout {
  editable(workout);
  if (!workout.restTimer) return workout;
  const { restTimer: _restTimer, ...rest } = workout;
  return rest;
}
export function extendRestTimer(workout: Workout, additionalMs: number): Workout {
  editable(workout);
  if (!workout.restTimer) throw new Error('진행 중인 휴식 타이머가 없습니다.');
  if (!Number.isSafeInteger(additionalMs) || additionalMs <= 0 || workout.restTimer.durationMs + additionalMs > MAX_REST_MS)
    throw new Error('휴식 시간은 최대 30분까지 설정할 수 있습니다.');
  return { ...workout, restTimer: { ...workout.restTimer, durationMs: workout.restTimer.durationMs + additionalMs } };
}
export function pauseWorkout(workout: Workout, now: number): Workout {
  editable(workout);
  if (workout.pausedAt !== undefined) return workout;
  if (!Number.isSafeInteger(now) || now < workout.startedAt + (workout.pausedDurationMs ?? 0)) throw new Error('운동 시각을 확인해 주세요.');
  return { ...workout, pausedAt: now };
}
export function resumeWorkout(workout: Workout, now: number): Workout {
  editable(workout);
  if (workout.pausedAt === undefined) return workout;
  if (!Number.isSafeInteger(now) || now < workout.pausedAt) throw new Error('진행 시각이 정지 시각보다 빠릅니다.');
  const { pausedAt, ...rest } = workout;
  return { ...rest, pausedDurationMs: (workout.pausedDurationMs ?? 0) + now - pausedAt };
}
function capacity(workout: Workout) {
  if (workout.exercises.reduce((count, e) => count + e.sets.length, 0) >= MAX_WORKOUT_SETS)
    throw new Error('한 운동에는 최대 300세트까지 기록할 수 있습니다.');
}
export function addExercise(workout: Workout, id: string, name: string, catalogId?: string): Workout {
  editable(workout);
  capacity(workout);
  if (!name.trim() || name.trim().length > 80) throw new Error('운동 이름을 입력해 주세요.');
  if (workout.exercises.some(e => e.id === id)) throw new Error('중복된 운동입니다.');
  return { ...workout, exercises: [...workout.exercises, { id, name: name.trim(), ...(catalogId ? { catalogId } : {}), sets: [{ id: `${id}-1`, weight: '', reps: '', completed: false }] }] };
}
export function addSet(workout: Workout, exerciseId: string, newId: string, sourceId?: string): Workout {
  editable(workout);
  capacity(workout);
  const exercise = workout.exercises.find(e => e.id === exerciseId);
  if (!exercise) throw new Error('종목을 찾을 수 없습니다.');
  if (!newId || workout.exercises.some(e => e.sets.some(s => s.id === newId))) throw new Error('중복되거나 비어 있는 세트 ID입니다.');
  const index = sourceId === undefined ? exercise.sets.length - 1 : exercise.sets.findIndex(s => s.id === sourceId);
  if (sourceId !== undefined && index < 0) throw new Error('세트를 찾을 수 없습니다.');
  const source = sourceId === undefined ? undefined : exercise.sets[index];
  const set: WorkoutSet = { id: newId, weight: source?.weight ?? '', reps: source?.reps ?? '', completed: false };
  return { ...workout, exercises: workout.exercises.map(e => e !== exercise ? e : {
    ...e, sets: [...e.sets.slice(0, index + 1), set, ...e.sets.slice(index + 1)],
  }) };
}
export function removeSet(workout: Workout, exerciseId: string, setId: string): Workout {
  editable(workout);
  if (!workout.exercises.find(e => e.id === exerciseId)?.sets.some(s => s.id === setId)) throw new Error('세트를 찾을 수 없습니다.');
  const next = { ...workout, exercises: workout.exercises.map(e => e.id !== exerciseId ? e : { ...e, sets: e.sets.filter(s => s.id !== setId) }) };
  if (next.restTimer?.setId !== setId) return next;
  const { restTimer: _restTimer, ...rest } = next;
  return rest;
}
export function validSet(set: WorkoutSet): boolean {
  return /^\d+(\.\d{1,2})?$/.test(set.weight) && Number(set.weight) <= 1500 &&
    /^\d+$/.test(set.reps) && Number(set.reps) > 0 && Number(set.reps) <= 1000;
}
export function updateSet(workout: Workout, exerciseId: string, setId: string, patch: Partial<Pick<WorkoutSet, 'weight' | 'reps' | 'completed'>>): Workout {
  if (workout.finishedAt !== undefined) throw new Error('종료한 운동은 수정할 수 없습니다.');
  const target = workout.exercises.find(e => e.id === exerciseId)?.sets.find(s => s.id === setId);
  if (!target) throw new Error('세트를 찾을 수 없습니다.');
  const updated = { ...target, ...patch };
  if (patch.completed === true && !validSet(updated)) throw new Error('무게와 횟수를 올바르게 입력해 주세요.');
  if (updated.completed && !validSet(updated)) updated.completed = false;
  const next = { ...workout, exercises: workout.exercises.map(e => e.id !== exerciseId ? e : { ...e, sets: e.sets.map(s => s.id !== setId ? s : updated) }) };
  if (updated.completed || next.restTimer?.setId !== setId) return next;
  const { restTimer: _restTimer, ...rest } = next;
  return rest;
}
export function setCompletedWithRest(workout: Workout, exerciseId: string, setId: string, completed: boolean, now: number, durationMs = DEFAULT_REST_MS): Workout {
  const next = updateSet(workout, exerciseId, setId, { completed });
  if (!completed) return next;
  if (!Number.isSafeInteger(now) || now < workout.startedAt) throw new Error('휴식 시작 시각을 확인해 주세요.');
  if (!Number.isSafeInteger(durationMs) || durationMs <= 0 || durationMs > MAX_REST_MS) throw new Error('휴식 시간은 1초 이상 30분 이하로 설정해 주세요.');
  return { ...next, restTimer: { setId, startedAt: now, durationMs } };
}
export class IncompleteSetsError extends Error {
  constructor() { super('미완료 세트를 제외하고 종료할까요?'); }
}
export function finishWorkout(workout: Workout, now: number, discardIncomplete = false): Workout {
  if (workout.finishedAt !== undefined) throw new Error('이미 종료한 운동입니다.');
  const sets = workout.exercises.flatMap(e => e.sets);
  const completed = sets.filter(s => s.completed);
  if (!completed.length || completed.some(s => !validSet(s))) throw new Error('올바르게 입력하고 완료한 세트가 1개 이상 필요합니다.');
  if (!Number.isSafeInteger(now) || now < (workout.pausedAt ?? workout.startedAt)) throw new Error('종료 시각을 확인해 주세요.');
  if (completed.length !== sets.length && !discardIncomplete) throw new IncompleteSetsError();
  const resumed = resumeWorkout(workout, now);
  const { restTimer: _restTimer, ...withoutRestTimer } = resumed;
  return { ...withoutRestTimer, finishedAt: now, exercises: workout.exercises.map(e => ({ ...e, sets: e.sets.filter(s => s.completed) })).filter(e => e.sets.length > 0) };
}
