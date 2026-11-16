/**
 * 운동 칼로리 추정입니다. kcal = MET × 체중(kg) × 운동 시간(시간).
 * MET은 2024 Adult Compendium of Physical Activities 값을 씁니다.
 * - 근력 운동(여러 종목, 8~15회 반복, 02054): 3.5
 * - 맨몸 운동(가볍거나 보통 강도, 02030): 3.5
 * 운동 시간은 일시정지를 뺀 실제 시간이고, 휴식 시간도 포함한 세션 기준 값입니다.
 * 종목별 칼로리는 전체를 완료한 세트 수(없으면 전체 세트 수) 비율로 나눕니다. 모든 값은 추정치입니다.
 */
import type { Equipment } from '../../api/client.ts';
import { elapsedWorkoutMs, type Workout } from '../workout/model.ts';

export const DEFAULT_BODY_KG = 70;
export const MET_STRENGTH = 3.5;
export const MET_BODYWEIGHT = 3.5;

export const metFor = (equipment?: Equipment) =>
  equipment === 'BODYWEIGHT' ? MET_BODYWEIGHT : MET_STRENGTH;

/**
 * 운동 한 번의 추정 칼로리입니다. 시간을 재지 않은 직접 입력 기록은 null입니다.
 * equipmentOf로 종목의 장비를 찾아 종목마다 MET을 정합니다.
 */
export function workoutCalories(
  workout: Workout,
  bodyKg: number,
  now: number,
  equipmentOf: (catalogId?: string) => Equipment | undefined = () => undefined,
): { total: number; byExercise: Record<string, number> } | null {
  if (workout.entryMode === 'manual') return null;
  const kg = Number.isFinite(bodyKg) && bodyKg > 0 ? bodyKg : DEFAULT_BODY_KG;
  const hours = elapsedWorkoutMs(workout, workout.finishedAt ?? now) / 3_600_000;
  const weightOf = (sets: Workout['exercises'][number]['sets']) =>
    sets.filter((s) => s.completed).length;
  const anyDone = workout.exercises.some((e) => weightOf(e.sets) > 0);
  const shares = workout.exercises.map((e) => (anyDone ? weightOf(e.sets) : e.sets.length));
  const totalShare = shares.reduce((a, b) => a + b, 0);
  const byExercise: Record<string, number> = {};
  let total = 0;
  workout.exercises.forEach((e, i) => {
    const part = totalShare > 0 ? shares[i]! / totalShare : 0;
    const kcal = metFor(equipmentOf(e.catalogId)) * kg * hours * part;
    byExercise[e.id] = kcal;
    total += kcal;
  });
  // 종목이 없어도 운동 시간만큼은 소모한 것으로 봅니다.
  if (!workout.exercises.length || totalShare === 0) total = MET_STRENGTH * kg * hours;
  return { total, byExercise };
}

/** 화면 표기입니다(예: 약 123kcal). */
export const formatKcal = (kcal: number) => `약 ${Math.round(kcal).toLocaleString('ko-KR')}kcal`;

/** 체중 기록 중 가장 최근 값입니다. 없으면 기본 체중을 쓰고 estimated로 알립니다. */
export function latestBodyKg(records: { date: string; weight: number }[]) {
  const latest = [...records].sort((a, b) => b.date.localeCompare(a.date))[0];
  return latest
    ? { kg: latest.weight, estimated: false }
    : { kg: DEFAULT_BODY_KG, estimated: true };
}
