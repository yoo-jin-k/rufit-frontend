/** 운동 기록을 화면 문구로 바꾸는 함수입니다. 홈·기록 상세·프로필이 같은 표현을 씁니다. */
import { bodyParts, findCatalogExercise } from '../exercises/catalog.ts';
import { localDay } from '../calendar/model.ts';
import { elapsedWorkoutMs, type Workout } from './model.ts';

const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

/** 완료 세트만 셉니다. 진행 중 입력은 기록 요약에 넣지 않습니다. */
export function completedSets(workout: Workout) {
  return workout.exercises.reduce((n, e) => n + e.sets.filter((set) => set.completed).length, 0);
}

/** 총 볼륨(무게×횟수 합계)입니다. 숫자가 아닌 입력은 0으로 봅니다. */
export function workoutVolume(workout: Workout) {
  return workout.exercises.reduce(
    (total, e) =>
      total + e.sets.reduce((sum, set) => sum + (set.completed ? (Number(set.weight) || 0) * (Number(set.reps) || 0) : 0), 0),
    0,
  );
}

export const formatNumber = (value: number) => value.toLocaleString('ko-KR', { maximumFractionDigits: 1 });

/** 운동한 부위를 중복 없이 나열합니다(예: 가슴 · 어깨). */
export function workoutParts(workout: Workout) {
  return [
    ...new Set(
      workout.exercises
        .filter((e) => e.sets.some((set) => set.completed))
        .flatMap((e) => {
          const item = findCatalogExercise(e.catalogId);
          return item ? [bodyParts[item.bodyPart]] : [];
        }),
    ),
  ];
}

/** 운동 시간(분)입니다. 직접 입력한 기록은 시간을 재지 않았으므로 null입니다. */
export function workoutMinutes(workout: Workout) {
  if (workout.entryMode === 'manual') return null;
  return Math.floor(elapsedWorkoutMs(workout, workout.finishedAt ?? workout.startedAt) / 60000);
}

/** 기록 제목: 측정한 운동은 시작 시각(오전 7:10 운동), 직접 입력한 기록은 '직접 입력한 운동'입니다. */
export function recordTitle(workout: Workout) {
  if (workout.entryMode === 'manual') return '직접 입력한 운동';
  const started = new Date(workout.startedAt).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' });
  return `${started} 운동`;
}

/** 기록 요약 한 줄: 32분 · 2,264kg · 가슴 · 어깨 */
export function recordMeta(workout: Workout) {
  const minutes = workoutMinutes(workout);
  return [
    minutes === null ? '시간 미측정' : `${minutes}분`,
    `${formatNumber(workoutVolume(workout))}kg`,
    ...workoutParts(workout),
  ].join(' · ');
}

/** 날짜 문자열(2026-11-08)을 '11월 8일 일요일'처럼 바꿉니다. short면 '11월 8일 (일)'입니다. */
export function formatDay(day: string, style: 'long' | 'short' | 'compact' = 'long') {
  const [y, m, d] = day.split('-').map(Number);
  const weekday = weekdays[new Date(y, m - 1, d, 12).getDay()];
  if (style === 'short') return `${m}월 ${d}일 (${weekday})`;
  if (style === 'compact') return `${m}월 ${d}일 ${weekday}`;
  return `${m}월 ${d}일 ${weekday}요일`;
}

export const workoutDay = (workout: Workout) => workout.recordDate ?? localDay(workout.startedAt);
