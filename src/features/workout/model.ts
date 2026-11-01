export type WorkoutSet = { id: string; weight: string; reps: string; completed: boolean };
export type Exercise = { id: string; name: string; catalogId?: string; sets: WorkoutSet[] };
export type Workout = {
  recordDate?: string;
  entryMode?: 'manual';
  id: string;
  startedAt: number;
  finishedAt?: number;
  pausedAt?: number;
  pausedDurationMs?: number;
  exercises: Exercise[];
};
// 새 운동을 시작합니다. 화면 크기 변경이나 재실행에서는 저장된 운동을 복구해야 합니다.
export function startWorkout(id: string, now: number): Workout {
  return { id, startedAt: now, exercises: [] };
}
export const MAX_WORKOUT_SETS = 300;
function editable(workout: Workout) {
  if (workout.finishedAt !== undefined) throw new Error('종료한 운동은 수정할 수 없습니다.');
}
// 시작·종료·정지 시각으로 계산하므로 앱을 닫아도 진행 시간은 이어집니다.
export function elapsedWorkoutMs(workout: Workout, now: number): number {
  return Math.max(
    0,
    (workout.finishedAt ?? workout.pausedAt ?? now) -
    workout.startedAt -
    (workout.pausedDurationMs ?? 0),
  );
}
// 운동시간을 시:분:초로 표시합니다.
export function formatWorkoutTime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map((n) => String(n).padStart(2, '0'))
    .join(':');
}
// 명시적인 정지 버튼에서만 호출해 정지 시각을 보존합니다.
export function pauseWorkout(workout: Workout, now: number): Workout {
  editable(workout);
  if (workout.pausedAt !== undefined) return workout;
  if (!Number.isSafeInteger(now) || now < workout.startedAt + (workout.pausedDurationMs ?? 0))
    throw new Error('운동 시각을 확인해 주세요.');
  return { ...workout, pausedAt: now };
}
// 정지한 구간만 누적하고, 정지하지 않았다면 그대로 반환합니다.
export function resumeWorkout(workout: Workout, now: number): Workout {
  editable(workout);
  if (workout.pausedAt === undefined) return workout;
  if (!Number.isSafeInteger(now) || now < workout.pausedAt)
    throw new Error('진행 시각이 정지 시각보다 빠릅니다.');
  const { pausedAt, ...rest } = workout;
  return { ...rest, pausedDurationMs: (workout.pausedDurationMs ?? 0) + now - pausedAt };
}
function capacity(workout: Workout) {
  if (workout.exercises.reduce((count, e) => count + e.sets.length, 0) >= MAX_WORKOUT_SETS)
    throw new Error('한 운동에는 최대 300세트까지 기록할 수 있습니다.');
}
// 종목과 빈 첫 세트를 추가합니다.
export function addExercise(
  workout: Workout,
  id: string,
  name: string,
  catalogId?: string,
): Workout {
  editable(workout);
  capacity(workout);
  if (!name.trim() || name.trim().length > 80) throw new Error('운동 이름을 입력해 주세요.');
  if (workout.exercises.some((e) => e.id === id)) throw new Error('중복된 운동입니다.');
  return {
    ...workout,
    exercises: [
      ...workout.exercises,
      {
        id,
        name: name.trim(),
        ...(catalogId ? { catalogId } : {}),
        sets: [{ id: `${id}-1`, weight: '', reps: '', completed: false }],
      },
    ],
  };
}
// 선택한 세트의 입력을 복제하되 새 세트의 완료 표시는 초기화합니다.
export function addSet(
  workout: Workout,
  exerciseId: string,
  newId: string,
  sourceId?: string,
): Workout {
  editable(workout);
  capacity(workout);
  const exercise = workout.exercises.find((e) => e.id === exerciseId);
  if (!exercise) throw new Error('종목을 찾을 수 없습니다.');
  if (!newId || workout.exercises.some((e) => e.sets.some((s) => s.id === newId)))
    throw new Error('중복되거나 비어 있는 세트 ID입니다.');
  const index =
    sourceId === undefined
      ? exercise.sets.length - 1
      : exercise.sets.findIndex((s) => s.id === sourceId);
  if (sourceId !== undefined && index < 0) throw new Error('세트를 찾을 수 없습니다.');
  const source = sourceId === undefined ? undefined : exercise.sets[index];
  const set: WorkoutSet = {
    id: newId,
    weight: source?.weight ?? '',
    reps: source?.reps ?? '',
    completed: false,
  };
  return {
    ...workout,
    exercises: workout.exercises.map((e) =>
      e !== exercise
        ? e
        : {
          ...e,
          sets: [...e.sets.slice(0, index + 1), set, ...e.sets.slice(index + 1)],
        },
    ),
  };
}
// 지정한 ID의 세트만 삭제합니다. 휴식 대상 정리는 저장소가 처리합니다.
export function removeSet(workout: Workout, exerciseId: string, setId: string): Workout {
  editable(workout);
  if (!workout.exercises.find((e) => e.id === exerciseId)?.sets.some((s) => s.id === setId))
    throw new Error('세트를 찾을 수 없습니다.');
  return {
    ...workout,
    exercises: workout.exercises.map((e) =>
      e.id !== exerciseId ? e : { ...e, sets: e.sets.filter((s) => s.id !== setId) },
    ),
  };
}
// 무게·횟수의 입력 범위를 확인하며 빈 초안은 완료 처리하지 않습니다.
export function validSet(set: WorkoutSet): boolean {
  return (
    /^\d+(\.\d{1,2})?$/.test(set.weight) &&
    Number(set.weight) <= 1500 &&
    /^\d+$/.test(set.reps) &&
    Number(set.reps) > 0 &&
    Number(set.reps) <= 1000
  );
}
// 입력 문자열을 보존하고 완료할 때만 유효성을 검사합니다.
export function updateSet(
  workout: Workout,
  exerciseId: string,
  setId: string,
  patch: Partial<Pick<WorkoutSet, 'weight' | 'reps' | 'completed'>>,
): Workout {
  if (workout.finishedAt !== undefined) throw new Error('종료한 운동은 수정할 수 없습니다.');
  const target = workout.exercises
    .find((e) => e.id === exerciseId)
    ?.sets.find((s) => s.id === setId);
  if (!target) throw new Error('세트를 찾을 수 없습니다.');
  const updated = { ...target, ...patch };
  if (patch.completed === true && !validSet(updated))
    throw new Error('무게와 횟수를 올바르게 입력해 주세요.');
  if (updated.completed && !validSet(updated)) updated.completed = false;
  return {
    ...workout,
    exercises: workout.exercises.map((e) =>
      e.id !== exerciseId ? e : { ...e, sets: e.sets.map((s) => (s.id !== setId ? s : updated)) },
    ),
  };
}
export class IncompleteSetsError extends Error {
  constructor() {
    super('미완료 세트를 제외하고 종료할까요?');
  }
}
// 미완료 제외 확인 후 기록을 닫고 마지막 정지 구간까지 반영합니다.
export function finishWorkout(workout: Workout, now: number, discardIncomplete = false): Workout {
  if (workout.finishedAt !== undefined) throw new Error('이미 종료한 운동입니다.');
  const sets = workout.exercises.flatMap((e) => e.sets);
  const completed = sets.filter((s) => s.completed);
  if (!completed.length || completed.some((s) => !validSet(s)))
    throw new Error('올바르게 입력하고 완료한 세트가 1개 이상 필요합니다.');
  if (!Number.isSafeInteger(now) || now < (workout.pausedAt ?? workout.startedAt))
    throw new Error('종료 시각을 확인해 주세요.');
  if (completed.length !== sets.length && !discardIncomplete) throw new IncompleteSetsError();
  return {
    ...resumeWorkout(workout, now),
    finishedAt: now,
    exercises: workout.exercises
      .map((e) => ({ ...e, sets: e.sets.filter((s) => s.completed) }))
      .filter((e) => e.sets.length > 0),
  };
}

/** 번호만 다시 매기며 세트 ID·입력값·완료 여부를 유지합니다. 휴식 대상도 기존 ID를 따릅니다. */
export function moveSet(workout: Workout, exerciseId: string, setId: string, targetIndex: number): Workout {
  editable(workout);
  const exercise = workout.exercises.find((item) => item.id === exerciseId);
  const sourceIndex = exercise?.sets.findIndex((set) => set.id === setId) ?? -1;
  if (!exercise || sourceIndex < 0 || !Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= exercise.sets.length)
    throw new Error('이동할 세트 위치를 확인해 주세요.');
  const sets = [...exercise.sets];
  const [moving] = sets.splice(sourceIndex, 1);
  sets.splice(targetIndex, 0, moving);
  return { ...workout, exercises: workout.exercises.map((item) => item.id === exerciseId ? { ...item, sets } : item) };
}

/** 진행 중인 운동에서 종목을 제거합니다. 다른 종목과 완료한 과거 기록은 수정하지 않습니다. */
export function removeExercise(workout: Workout, exerciseId: string): Workout {
  editable(workout);
  if (!workout.exercises.some((exercise) => exercise.id === exerciseId)) throw new Error('종목을 찾을 수 없습니다.');
  return { ...workout, exercises: workout.exercises.filter((exercise) => exercise.id !== exerciseId) };
}
