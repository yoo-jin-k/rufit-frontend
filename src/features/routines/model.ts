import type { Workout, WorkoutSet } from '../workout/model.ts';

export type RoutineSet = Pick<WorkoutSet, 'weight' | 'reps'>;
export type RoutineExercise = { id: string; name: string; catalogId?: string; sets: RoutineSet[] };
export type Routine = { id: string; name: string; createdAt: number; updatedAt: number; exercises: RoutineExercise[] };

const safeTime = (value: number) => Number.isSafeInteger(value) && value >= 0;
const validRoutineSet = (set: RoutineSet) => /^\d+(\.\d{1,2})?$/.test(set.weight) && Number(set.weight) <= 1500 && /^\d+$/.test(set.reps) && Number(set.reps) > 0 && Number(set.reps) <= 1000;

export function defaultRoutineName(workout: Workout): string {
  const names = workout.exercises.slice(0, 2).map(e => e.name.trim()).filter(Boolean);
  return names.length ? `${names.join(' · ')} 루틴` : '내 운동 루틴';
}

export function routineFromWorkout(workout: Workout, id: string, now: number, name = defaultRoutineName(workout)): Routine {
  if (workout.finishedAt === undefined) throw new Error('완료한 운동만 루틴으로 저장할 수 있습니다.');
  if (!id.trim()) throw new Error('루틴 ID가 필요합니다.');
  if (!safeTime(now)) throw new Error('루틴 저장 시각을 확인해 주세요.');
  const cleanName = name.trim();
  if (!cleanName || cleanName.length > 60) throw new Error('루틴 이름은 1~60자로 입력해 주세요.');
  const exercises = workout.exercises.map((exercise, exerciseIndex) => ({
    id: `${id}:exercise:${exerciseIndex}`,
    name: exercise.name,
    ...(exercise.catalogId ? { catalogId: exercise.catalogId } : {}),
    sets: exercise.sets.map(set => ({ weight: set.weight, reps: set.reps })),
  }));
  if (!exercises.length || exercises.some(exercise => !exercise.sets.length || exercise.sets.some(set => !validRoutineSet(set))))
    throw new Error('완료한 세트가 있는 운동만 루틴으로 저장할 수 있습니다.');
  return { id: id.trim(), name: cleanName, createdAt: now, updatedAt: now, exercises };
}

export function startWorkoutFromRoutine(routine: Routine, workoutId: string, now: number): Workout {
  if (!isRoutine(routine)) throw new Error('루틴을 읽을 수 없습니다.');
  if (!workoutId.trim() || !safeTime(now)) throw new Error('운동 시작 정보를 확인해 주세요.');
  return {
    id: workoutId,
    startedAt: now,
    exercises: routine.exercises.map((exercise, exerciseIndex) => ({
      id: `${workoutId}:exercise:${exerciseIndex}`,
      name: exercise.name,
      ...(exercise.catalogId ? { catalogId: exercise.catalogId } : {}),
      sets: exercise.sets.map((set, setIndex) => ({
        id: `${workoutId}:exercise:${exerciseIndex}:set:${setIndex}`,
        weight: set.weight,
        reps: set.reps,
        completed: false,
      })),
    })),
  };
}

export function isRoutine(value: unknown): value is Routine {
  if (typeof value !== 'object' || value === null) return false;
  const routine = value as Partial<Routine>;
  if (typeof routine.id !== 'string' || !routine.id.trim() || typeof routine.name !== 'string' || !routine.name.trim() || routine.name.length > 60 ||
    typeof routine.createdAt !== 'number' || !safeTime(routine.createdAt) || typeof routine.updatedAt !== 'number' || !safeTime(routine.updatedAt) || routine.updatedAt < routine.createdAt || !Array.isArray(routine.exercises) || !routine.exercises.length) return false;
  return routine.exercises.every(exercise => typeof exercise === 'object' && exercise !== null && typeof exercise.id === 'string' && !!exercise.id &&
    typeof exercise.name === 'string' && !!exercise.name.trim() && exercise.name.length <= 80 &&
    (exercise.catalogId === undefined || typeof exercise.catalogId === 'string') && Array.isArray(exercise.sets) && !!exercise.sets.length &&
    exercise.sets.every(set => typeof set === 'object' && set !== null && typeof set.weight === 'string' && typeof set.reps === 'string' && validRoutineSet(set)));
}
