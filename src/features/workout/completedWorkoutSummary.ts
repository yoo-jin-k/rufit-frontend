import { localDay } from '../calendar/model.ts';
import { bodyParts, findCatalogExercise } from '../exercises/catalog.ts';
import { elapsedWorkoutMs, type Workout } from './model.ts';

/** 과거 날짜로 입력한 기록과 진행 중인 운동은 오늘의 완료 카드에 섞지 않습니다. */
export function completedWorkoutsOnDay(history: Workout[], now: number) {
  const day = localDay(now);
  return history.filter(workout => workout.finishedAt !== undefined && (workout.recordDate ?? localDay(workout.startedAt)) === day)
    .sort((a, b) => b.startedAt - a.startedAt);
}

/** 한 번 저장한 운동을 카드 하나로 요약합니다. 총중량은 완료 세트의 무게×횟수 합계입니다. */
export function completedWorkoutSummary(workout: Workout) {
  const exercises = workout.exercises.filter(exercise => exercise.sets.some(set => set.completed));
  const parts = [...new Set(exercises.flatMap(exercise => {
    const item = findCatalogExercise(exercise.catalogId);
    return item ? [bodyParts[item.bodyPart]] : [];
  }))];
  const volume = exercises.reduce((total, exercise) => total + exercise.sets.reduce((sum, set) =>
    sum + (set.completed ? Number(set.weight) * Number(set.reps) : 0), 0), 0);
  return {
    duration: workout.entryMode === 'manual' ? '시간 미측정' : `${Math.floor(elapsedWorkoutMs(workout, workout.finishedAt ?? workout.startedAt) / 60000)}분`,
    volume: volume.toLocaleString('ko-KR', { maximumFractionDigits: 2 }),
    parts: parts.join(', '),
    exercises: `${exercises.length}개 | ${exercises[0]?.name ?? '운동'}${exercises.length > 1 ? ` 외 ${exercises.length - 1}개` : ''}`,
  };
}
