/**
 * '운동 시작하기' 시트의 계산입니다. 최근 운동을 고르고, 고른 운동의 종목·세트를 새 운동으로 복사합니다.
 */
import { localDay } from '../calendar/model.ts';
import { bodyParts, findCatalogExercise } from '../exercises/catalog.ts';
import { elapsedWorkoutMs, MAX_WORKOUT_SETS, type Workout } from './model.ts';

/** 불러올 수 있는 최근 운동입니다. 종료했고 세트가 하나 이상 있는 기록만, 최근 날짜 순으로 고릅니다. */
export function recentWorkouts(history: Workout[], limit = 10): Workout[] {
  return history
    .filter((w) => w.finishedAt !== undefined && w.exercises.some((e) => e.sets.length > 0))
    .sort((a, b) => dayOf(b).localeCompare(dayOf(a)) || b.startedAt - a.startedAt)
    .slice(0, limit);
}

const dayOf = (w: Workout) => w.recordDate ?? localDay(w.startedAt);

/** 카드에 보여 줄 요약입니다. 부위는 종목 목록에 있는 종목만 셉니다. */
export function startCard(workout: Workout) {
  const exercises = workout.exercises.filter((e) => e.sets.length > 0);
  const parts = [...new Set(exercises.flatMap((e) => {
    const item = findCatalogExercise(e.catalogId);
    return item ? [bodyParts[item.bodyPart]] : [];
  }))];
  const minutes = workout.entryMode === 'manual'
    ? null
    : Math.floor(elapsedWorkoutMs(workout, workout.finishedAt ?? workout.startedAt) / 60000);
  return {
    day: dayOf(workout),
    parts: parts.length ? parts.join(', ') : '운동',
    meta: `${exercises.length}종목${minutes === null ? '' : ` · ${formatMinutes(minutes)}`}`,
    rows: exercises.map((e) => {
      const top = e.sets.reduce((best, set) => (Number(set.weight) || 0) > (Number(best.weight) || 0) ? set : best, e.sets[0]!);
      return {
        id: e.id,
        name: e.name,
        catalogId: e.catalogId,
        sets: e.sets.length,
        /** 가장 무거운 세트의 kg 문자열입니다. 0이면 맨몸 운동처럼 무게 없이 보여 줍니다. */
        weight: Number(top.weight) > 0 ? top.weight : '',
        reps: Number(top.reps) > 0 ? top.reps : '',
      };
    }),
  };
}

function formatMinutes(minutes: number) {
  return minutes >= 60 ? `${Math.floor(minutes / 60)}시간 ${minutes % 60}분` : `${minutes}분`;
}

/**
 * 고른 운동의 종목·세트(무게·횟수)를 복사해 새 운동을 시작합니다. 완료 표시와 원본 기록은 바꾸지 않습니다.
 * 세트가 없는 종목은 건너뛰고, 한 운동의 최대 세트 수를 넘지 않게 자릅니다.
 */
export function workoutFromTemplate(source: Workout, id: string, now: number, nextId: () => string): Workout {
  let remaining = MAX_WORKOUT_SETS;
  const exercises = source.exercises.flatMap((exercise) => {
    if (!exercise.sets.length || remaining <= 0) return [];
    const exerciseId = nextId();
    const sets = exercise.sets.slice(0, remaining).map((set, index) => ({
      id: `${exerciseId}-${index + 1}`,
      weight: set.weight,
      reps: set.reps,
      completed: false,
    }));
    remaining -= sets.length;
    return [{ id: exerciseId, name: exercise.name, ...(exercise.catalogId ? { catalogId: exercise.catalogId } : {}), sets }];
  });
  return { id, startedAt: now, exercises };
}
