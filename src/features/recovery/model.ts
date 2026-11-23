/**
 * 근육 회복도 계산입니다. 완료한 세트 기록만으로 부위별 회복 예정 시각을 추정합니다.
 * 기준 시간과 조정 규칙은 노션 「루핏 · 근육 회복도 기능 조사와 설계안」의 추정치를 따릅니다.
 * 연구 평균을 바탕으로 한 예상치이며 실제 몸 상태를 대신하지 않습니다.
 */
import type { BodyPart } from '../../api/client.ts';
import type { CatalogExercise } from '../exercises/catalog.ts';
import { validSet, type Workout } from '../workout/model.ts';

// 스트레칭은 근육을 지치게 하는 운동이 아니라 회복 계산에서 뺍니다.
export type RecoveryPart = Exclude<BodyPart, 'FULL_BODY' | 'STRETCH'>;
export const recoveryParts: RecoveryPart[] = ['LEGS', 'BACK', 'CHEST', 'SHOULDERS', 'ARMS', 'CORE'];

/** 부위별 기본 회복 시간(시간)입니다. 큰 근육일수록 길게 둡니다. */
export const baseRecoveryHours: Record<RecoveryPart, number> = {
  LEGS: 72,
  BACK: 60,
  CHEST: 60,
  SHOULDERS: 48,
  ARMS: 48,
  CORE: 36,
};

const HOUR = 3_600_000;
/** 이보다 오래된 운동은 회복이 끝난 것으로 봅니다(최대 회복 시간과 같음). */
export const MAX_RECOVERY_HOURS = 7 * 24;
/** 무거운 바벨 운동이 들어가면 회복이 더 걸립니다. */
const HEAVY_EXTRA_HOURS = 12;
/** 회복 전에 다시 운동하면 남은 피로의 이 비율만큼 더 걸린다고 봅니다. */
const CARRY_OVER = 0.5;
// 전신 운동은 한 세트를 여러 부위에 반씩 나눠 셉니다.
const FULL_BODY_SHARE: RecoveryPart[] = ['LEGS', 'BACK', 'SHOULDERS', 'CORE'];

export type PartRecovery = {
  part: RecoveryPart;
  /** 0~100. 100이면 회복이 끝났습니다. */
  percent: number;
  /** 회복 예정 시각(ms). 회복이 끝났거나 기록이 없으면 null입니다. */
  readyAt: number | null;
  /** 마지막으로 이 부위를 운동한 시각과 대표 종목입니다. */
  lastTrainedAt: number | null;
  lastExercise: string | null;
};

export function volumeFactor(sets: number) {
  if (sets <= 5) return 0.75;
  if (sets <= 10) return 1;
  return 1.25;
}

/** 운동을 끝낸 시각입니다. 과거 기록 추가처럼 시각이 없으면 그날 정오로 봅니다. */
function workoutTime(workout: Workout) {
  if (workout.finishedAt) return workout.finishedAt;
  if (workout.recordDate) return new Date(`${workout.recordDate}T12:00:00`).getTime();
  return null;
}

type Session = { time: number; sets: number; heavy: boolean; exercise: string; best: number };

export function muscleRecovery(
  history: Workout[],
  catalog: readonly CatalogExercise[],
  now: number,
): PartRecovery[] {
  const byId = new Map(catalog.map((exercise) => [exercise.id, exercise]));
  const sessions = new Map<RecoveryPart, Session[]>(recoveryParts.map((part) => [part, []]));
  for (const workout of history) {
    const recorded = workoutTime(workout);
    // 끝나지 않은 운동과 일주일보다 오래된 운동은 계산하지 않습니다.
    if (recorded === null || now - recorded > MAX_RECOVERY_HOURS * HOUR) continue;
    // 기기 시계 차이로 조금 뒤 시각이 찍혀 있으면 방금 끝난 운동으로 봅니다.
    const time = Math.min(recorded, now);
    const perPart = new Map<RecoveryPart, Session>();
    for (const exercise of workout.exercises) {
      const info = exercise.catalogId ? byId.get(exercise.catalogId) : undefined;
      // 직접 만든 종목은 부위를 알 수 없어, 스트레칭은 피로가 쌓이지 않아 제외합니다.
      if (!info || info.bodyPart === 'STRETCH') continue;
      const done = exercise.sets.filter((set) => set.completed && validSet(set)).length;
      if (!done) continue;
      const shares: [RecoveryPart, number][] =
        info.bodyPart === 'FULL_BODY'
          ? FULL_BODY_SHARE.map((part) => [part, done / 2])
          : [[info.bodyPart, done]];
      for (const [part, sets] of shares) {
        const current = perPart.get(part) ?? {
          time,
          sets: 0,
          heavy: false,
          exercise: info.name,
          best: 0,
        };
        // 대표 종목은 그 부위에서 세트를 가장 많이 한 종목입니다.
        if (sets > current.best) {
          current.best = sets;
          current.exercise = info.name;
        }
        current.sets += sets;
        current.heavy ||= info.equipment === 'BARBELL';
        perPart.set(part, current);
      }
    }
    for (const [part, session] of perPart) sessions.get(part)!.push(session);
  }

  return recoveryParts.map((part) => {
    const list = sessions.get(part)!.sort((a, b) => a.time - b.time);
    let readyAt = 0,
      startedAt = 0;
    let last: Session | null = null;
    for (const session of list) {
      const hours =
        baseRecoveryHours[part] * volumeFactor(session.sets) +
        (session.heavy ? HEAVY_EXTRA_HOURS : 0);
      const leftover = Math.max(0, readyAt - session.time);
      readyAt = Math.min(
        session.time + hours * HOUR + leftover * CARRY_OVER,
        session.time + MAX_RECOVERY_HOURS * HOUR,
      );
      startedAt = session.time;
      last = session;
    }
    if (!last)
      return { part, percent: 100, readyAt: null, lastTrainedAt: null, lastExercise: null };
    const recovered = now >= readyAt;
    const percent = recovered
      ? 100
      : Math.max(0, Math.min(99, Math.floor(((now - startedAt) / (readyAt - startedAt)) * 100)));
    return {
      part,
      percent,
      readyAt: recovered ? null : readyAt,
      lastTrainedAt: last.time,
      lastExercise: last.exercise,
    };
  });
}

/** 회복 단계입니다. 그림 색과 글자에 같이 씁니다. */
export type RecoveryLevel = 'fresh' | 'recovering' | 'almost' | 'ready';
export function recoveryLevel(percent: number): RecoveryLevel {
  if (percent >= 100) return 'ready';
  if (percent >= 67) return 'almost';
  if (percent >= 34) return 'recovering';
  return 'fresh';
}

/** 예) '오늘 오후 3시', '내일 오전 9시', '11월 25일 오후 3시' */
export function formatReadyAt(readyAt: number, now: number) {
  const target = new Date(readyAt);
  const startOfDay = (value: Date) =>
    new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const days = Math.round((startOfDay(target) - startOfDay(new Date(now))) / (24 * HOUR));
  const hour = target.getHours();
  const clock = `${hour < 12 ? '오전' : '오후'} ${hour % 12 || 12}시`;
  const day =
    days === 0
      ? '오늘'
      : days === 1
        ? '내일'
        : days === 2
          ? '모레'
          : `${target.getMonth() + 1}월 ${target.getDate()}일`;
  return `${day} ${clock}`;
}
