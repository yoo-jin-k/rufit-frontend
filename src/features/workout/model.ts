export type WorkoutSet = { id: string; weight: string; reps: string; completed: boolean };
export type Exercise = { id: string; name: string; sets: WorkoutSet[] };
export type Workout = { id: string; startedAt: number; finishedAt?: number; exercises: Exercise[] };
export function startWorkout(id: string, now: number): Workout {
  return { id, startedAt: now, exercises: [] };
}
export function addExercise(workout: Workout, id: string, name: string): Workout {
  if (workout.finishedAt !== undefined) throw new Error('종료한 운동은 수정할 수 없습니다.');
  if (!name.trim()) throw new Error('운동 이름을 입력해 주세요.');
  if (workout.exercises.some(e => e.id === id)) throw new Error('중복된 운동입니다.');
  return { ...workout, exercises: [...workout.exercises, { id, name: name.trim(), sets: [{ id: `${id}-1`, weight: '', reps: '', completed: false }] }] };
}
export function validSet(set: WorkoutSet): boolean {
  return /^\d+(\.\d{1,2})?$/.test(set.weight) && Number(set.weight) <= 1500 &&
    /^\d+$/.test(set.reps) && Number(set.reps) > 0 && Number(set.reps) <= 1000;
}
export function updateSet(workout: Workout, exerciseId: string, setId: string, patch: Partial<Pick<WorkoutSet, 'weight' | 'reps' | 'completed'>>): Workout {
  if (workout.finishedAt !== undefined) throw new Error('종료한 운동은 수정할 수 없습니다.');
  return { ...workout, exercises: workout.exercises.map(e => e.id !== exerciseId ? e : { ...e, sets: e.sets.map(s => s.id !== setId ? s : { ...s, ...patch }) }) };
}
export function finishWorkout(workout: Workout, now: number): Workout {
  if (workout.finishedAt !== undefined) throw new Error('이미 종료한 운동입니다.');
  if (!workout.exercises.length || workout.exercises.some(e => !e.sets.length || e.sets.some(s => !validSet(s))))
    throw new Error('모든 세트에 무게(0~1500kg)와 횟수(1~1000)를 입력해 주세요.');
  if (now < workout.startedAt) throw new Error('종료 시간이 시작 시간보다 빠릅니다.');
  return { ...workout, finishedAt: now };
}
