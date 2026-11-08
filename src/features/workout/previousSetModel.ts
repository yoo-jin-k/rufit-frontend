/** 같은 카탈로그 종목의 완료 기록만 찾습니다. 직접 입력한 종목은 공백을 정리한 이름으로 비교합니다. */
import { validSet, MAX_WORKOUT_SETS, type Exercise, type Workout } from './model.ts';
export function previousExercises(history: Workout[], target: Exercise) {
  const normalize = (name: string) => name.normalize('NFKC').replace(/\s/g, '').toLowerCase();
  return history.filter((record) => record.finishedAt !== undefined).flatMap((record) =>
    record.exercises.filter((exercise) =>
      (exercise.catalogId && target.catalogId ? exercise.catalogId === target.catalogId : normalize(exercise.name) === normalize(target.name)) &&
      exercise.sets.length > 0 && exercise.sets.every(validSet),
    ).map((exercise) => ({ record, exercise })),
  ).sort((a, b) => (b.record.recordDate ?? new Date(b.record.startedAt).toLocaleDateString('sv-SE'))
    .localeCompare(a.record.recordDate ?? new Date(a.record.startedAt).toLocaleDateString('sv-SE')));
}
/** 이전 기록 원본은 보존하고 새 ID와 미완료 상태로 복사합니다. 전체 교체도 확인 버튼을 통해서만 호출합니다. */
export function importPreviousSets(workout: Workout, exerciseId: string, source: Exercise, nextId: () => string, replace: boolean): Workout {
  const target = workout.exercises.find((exercise) => exercise.id === exerciseId);
  if (workout.finishedAt !== undefined || !target) throw new Error('기록 중인 운동에만 불러올 수 있습니다.');
  if (!source.sets.length || !source.sets.every(validSet)) throw new Error('이전 세트의 무게와 횟수를 확인해 주세요.');
  const count = workout.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0)
    + source.sets.length - (replace ? target.sets.length : 0);
  if (count > MAX_WORKOUT_SETS) throw new Error('한 운동 기록에는 300세트까지 입력할 수 있습니다.');
  const ids = new Set(workout.exercises.flatMap((exercise) => exercise.sets.map((set) => set.id)));
  const copied = source.sets.map((set) => {
    const id = nextId();
    if (!id || ids.has(id)) throw new Error('중복된 세트 ID입니다. 다시 시도해 주세요.');
    ids.add(id);
    return { ...set, id, completed: false };
  });
  return {
    ...workout, exercises: workout.exercises.map((exercise) => exercise.id === exerciseId
      ? { ...exercise, sets: [...(replace ? [] : exercise.sets), ...copied] } : exercise)
  };
}
