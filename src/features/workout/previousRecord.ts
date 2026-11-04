import { MAX_WORKOUT_SETS, validSet, type Exercise, type Workout } from './model.ts';

export type PreviousExerciseRecord = {
  workoutId: string;
  finishedAt: number;
  exerciseName: string;
  sets: { weight: string; reps: string }[];
};

const normalize = (value: string) => value.trim().toLocaleLowerCase('ko-KR').replace(/\s+/g, ' ');

function matches(current: Exercise, candidate: Exercise): boolean {
  if (current.catalogId && candidate.catalogId) return current.catalogId === candidate.catalogId;
  return normalize(current.name) === normalize(candidate.name);
}

export function findPreviousExerciseRecord(history: Workout[], current: Exercise): PreviousExerciseRecord | null {
  const ordered = [...history]
    .filter(workout => workout.finishedAt !== undefined)
    .sort((a, b) => (b.finishedAt ?? b.startedAt) - (a.finishedAt ?? a.startedAt));
  for (const workout of ordered) {
    const exercise = workout.exercises.find(candidate => matches(current, candidate));
    if (!exercise?.sets.length) continue;
    const sets = exercise.sets.filter(validSet).map(set => ({ weight: set.weight, reps: set.reps }));
    if (!sets.length) continue;
    return { workoutId: workout.id, finishedAt: workout.finishedAt ?? workout.startedAt, exerciseName: exercise.name, sets };
  }
  return null;
}

export function applyPreviousExerciseRecord(workout: Workout, exerciseId: string, previous: PreviousExerciseRecord, idPrefix: string): Workout {
  if (workout.finishedAt !== undefined) throw new Error('종료한 운동은 수정할 수 없습니다.');
  const exercise = workout.exercises.find(item => item.id === exerciseId);
  if (!exercise) throw new Error('종목을 찾을 수 없습니다.');
  if (!idPrefix.trim() || !previous.sets.length || previous.sets.some(set => !validSet({ id: 'previous', ...set, completed: false })))
    throw new Error('이전 기록을 불러올 수 없습니다.');
  const otherCount = workout.exercises.reduce((count, item) => count + (item.id === exerciseId ? 0 : item.sets.length), 0);
  if (otherCount + previous.sets.length > MAX_WORKOUT_SETS) throw new Error('한 운동에는 최대 300세트까지 기록할 수 있습니다.');
  const existingIds = new Set(workout.exercises.flatMap(item => item.id === exerciseId ? [] : item.sets.map(set => set.id)));
  const sets = previous.sets.map((set, index) => ({ id: `${idPrefix}:${index}`, weight: set.weight, reps: set.reps, completed: false }));
  if (sets.some(set => existingIds.has(set.id)) || new Set(sets.map(set => set.id)).size !== sets.length) throw new Error('세트 ID가 중복되었습니다.');
  const next = { ...workout, exercises: workout.exercises.map(item => item.id === exerciseId ? { ...item, sets } : item) };
  if (!next.restTimer || exercise.sets.some(set => set.id === next.restTimer?.setId)) {
    const copy = { ...next };
    delete copy.restTimer;
    return copy;
  }
  return next;
}
