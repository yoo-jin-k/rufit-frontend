/**
 * 세트 입력 시트의 계산입니다. 무게·횟수 증감, 남은 세트 통일, 추천 무게·횟수를 다룹니다.
 * 무게는 kg 문자열로 보관합니다(입력 중인 값을 보존하기 위해 숫자로 바꾸지 않음).
 */
import type { Equipment } from '../../api/client.ts';
import { validSet, type Exercise, type Workout } from './model.ts';
import { previousExercises } from './previousSetModel.ts';

export const MAX_WEIGHT = 1500;
export const MAX_REPS = 1000;

/** 무게를 kg 단위로 더하거나 뺍니다. 0 아래나 최대값 위로는 가지 않고, 소수 둘째 자리까지만 남깁니다. */
export function stepWeight(value: string, delta: number): string {
  const next = Math.min(MAX_WEIGHT, Math.max(0, (Number(value) || 0) + delta));
  return formatWeight(next);
}

/** 횟수를 더하거나 뺍니다. 1회 아래로는 내려가지 않습니다. */
export function stepReps(value: string, delta: number): string {
  const next = Math.min(MAX_REPS, Math.max(1, Math.round(Number(value) || 0) + delta));
  return String(next);
}

export function formatWeight(kg: number): string {
  return String(Math.round(kg * 100) / 100);
}

/** 맨몸 운동은 무게를 받지 않습니다. 저장·검증을 위해 무게는 0으로 둡니다. */
export const weightless = (equipment?: Equipment) => equipment === 'BODYWEIGHT';

/**
 * 고른 세트와 그 뒤 세트 중 아직 완료하지 않은 세트에 같은 무게·횟수를 넣습니다.
 * 앞 세트와 이미 완료한 세트는 그대로 둡니다.
 */
export function fillRemainingSets(
  workout: Workout,
  exerciseId: string,
  setId: string,
): { workout: Workout; count: number } {
  if (workout.finishedAt !== undefined) throw new Error('종료한 운동은 수정할 수 없습니다.');
  const exercise = workout.exercises.find((e) => e.id === exerciseId);
  const start = exercise?.sets.findIndex((set) => set.id === setId) ?? -1;
  if (!exercise || start < 0) throw new Error('세트를 찾을 수 없습니다.');
  const source = exercise.sets[start]!;
  let count = 0;
  const sets = exercise.sets.map((set, index) => {
    if (index < start || (index > start && set.completed)) return set;
    if (index > start) count += 1;
    return index === start ? set : { ...set, weight: source.weight, reps: source.reps };
  });
  return {
    workout: {
      ...workout,
      exercises: workout.exercises.map((e) => (e.id === exerciseId ? { ...e, sets } : e)),
    },
    count,
  };
}

/** 같은 종목의 지난 기록입니다. 시트의 '최근'과 '이전 기록' 목록에 씁니다. */
export function setHistory(history: Workout[], exercise: Exercise, limit = 5) {
  return previousExercises(history, exercise).slice(0, limit);
}

/** 지난 기록에서 같은 순서의 세트, 없으면 마지막 세트를 '최근' 값으로 씁니다. */
export function recentSet(history: Workout[], exercise: Exercise, index: number) {
  const last = previousExercises(history, exercise)[0]?.exercise;
  return last ? (last.sets[index] ?? last.sets.at(-1)) : undefined;
}

/** 처음 하는 종목의 시작값입니다. 빈 바·가벼운 덤벨처럼 자세를 익히기 쉬운 무게로 둡니다. */
const starters: Record<Equipment, { weight: number; reps: number }> = {
  BARBELL: { weight: 20, reps: 10 },
  DUMBBELL: { weight: 5, reps: 12 },
  MACHINE: { weight: 10, reps: 12 },
  CABLE: { weight: 10, reps: 12 },
  BODYWEIGHT: { weight: 0, reps: 10 },
  OTHER: { weight: 5, reps: 10 },
};
const increments: Record<Equipment, number> = {
  BARBELL: 2.5,
  DUMBBELL: 2,
  MACHINE: 5,
  CABLE: 2.5,
  BODYWEIGHT: 0,
  OTHER: 2.5,
};
/** 이 횟수를 넘기면 다음에는 무게를 한 단계 올리고 횟수를 낮춥니다. */
const REP_CEILING = 12;
const REP_RESET = 8;

export type Recommendation = { weight: string; reps: string; basis: 'history' | 'starter' };

/**
 * 추천 무게·횟수입니다.
 * - 지난 기록이 있으면 그때 가장 무거운 세트에서 횟수를 1회 늘립니다. 12회를 넘기면 무게를 한 단계 올리고 8회로 낮춥니다.
 * - 처음 하는 종목은 장비별 시작값을 씁니다.
 */
export function recommendSet(
  history: Workout[],
  exercise: Exercise,
  equipment?: Equipment,
): Recommendation {
  const kind = equipment ?? 'OTHER';
  const last = previousExercises(history, exercise)[0]?.exercise;
  // 웜업 세트는 실제 작업 무게가 아니므로 추천 계산에서 뺍니다.
  const sets = last?.sets.filter((set) => validSet(set) && set.setType !== 'WARMUP') ?? [];
  if (!sets.length) {
    const start = starters[kind];
    return { weight: formatWeight(start.weight), reps: String(start.reps), basis: 'starter' };
  }
  const top = sets.reduce(
    (best, set) => (Number(set.weight) > Number(best.weight) ? set : best),
    sets[0]!,
  );
  const reps = Number(top.reps) + 1;
  const step = increments[kind];
  if (reps > REP_CEILING && step > 0) {
    return { weight: stepWeight(top.weight, step), reps: String(REP_RESET), basis: 'history' };
  }
  return {
    weight: weightless(kind) ? '0' : top.weight,
    reps: String(Math.min(reps, MAX_REPS)),
    basis: 'history',
  };
}

export const recommendationNote =
  '지난 기록이 있으면 가장 무거운 세트에서 1회를 더해요. 12회를 넘기면 무게를 한 단계 올리고 8회로 낮춰요. ' +
  '처음 하는 종목은 자세를 익히기 쉬운 가벼운 시작 무게예요.';
