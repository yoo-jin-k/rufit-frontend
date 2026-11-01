import { recommendedRest } from '../exercises/recommendedRest.ts';
import { findCatalogExercise } from '../exercises/catalog.ts';
import { updateSet, type Exercise } from './model.ts';
import { remember, type WorkoutArchive } from './storage.ts';

function preferenceKey(exercise: Exercise) {
  return exercise.catalogId
    ? `catalog:${exercise.catalogId}`
    : `name:${exercise.name.normalize('NFKC').trim()}`;
}
// 개인값(0초 포함), 공통 설정, 종목 권장값, 기본 90초 순으로 결정합니다.
export function exerciseRest(archive: WorkoutArchive, exercise: Exercise) {
  const key = preferenceKey(exercise);
  const personal = Object.hasOwn(archive.personalRest, key) ? archive.personalRest[key] : undefined;
  const recommended = recommendedRest(findCatalogExercise(exercise.catalogId));
  return {
    seconds: personal ?? archive.personalRest['defaults:rest'] ?? recommended ?? 90,
    source:
      personal !== undefined
        ? '개인 설정'
        : archive.personalRest['defaults:rest'] !== undefined
          ? '공통 설정'
          : recommended !== undefined
            ? '권장'
            : '기본',
    recommended,
  };
}
// 종목별 개인 시간을 저장합니다. null이면 추천 사용으로 복귀하며 현재 휴식은 유지합니다.
export function setPersonalRest(
  archive: WorkoutArchive,
  exercise: Exercise,
  seconds: number | null,
): WorkoutArchive {
  if (seconds !== null && (!Number.isSafeInteger(seconds) || seconds < 0 || seconds > 3600))
    throw new Error('휴식시간은 0~3600초로 입력해 주세요.');
  const personalRest = { ...archive.personalRest };
  if (seconds === null) delete personalRest[preferenceKey(exercise)];
  else personalRest[preferenceKey(exercise)] = seconds;
  return { ...archive, personalRest };
}
// 세트 완료와 휴식 대상/종료시각을 같은 저장본으로 만들어 함께 저장합니다.
export function completeWithRest(
  archive: WorkoutArchive,
  exerciseId: string,
  setId: string,
  completed: boolean,
  now: number,
): WorkoutArchive {
  const workout = archive.current;
  const exercise = workout?.exercises.find((e) => e.id === exerciseId);
  const set = exercise?.sets.find((s) => s.id === setId);
  if (!workout || !exercise || !set) throw new Error('완료할 세트를 찾을 수 없습니다.');
  if (!Number.isSafeInteger(now)) throw new Error('휴식 시각을 확인해 주세요.');
  const result = remember(archive, updateSet(workout, exerciseId, setId, { completed }));
  if (!completed || set.completed) return result;
  const seconds = exerciseRest(archive, exercise).seconds;
  return {
    ...result,
    rest:
      seconds === 0
        ? null
        : { workoutId: workout.id, exerciseId, setId, endsAt: now + seconds * 1000 },
  };
}
// ±10초 버튼은 남은 시간을 조절합니다. 만료 후에는 현재부터 계산합니다.
export function adjustLocalRest(
  archive: WorkoutArchive,
  seconds: number,
  now: number,
): WorkoutArchive {
  if (!archive.rest) return archive;
  if (!Number.isSafeInteger(seconds) || !Number.isSafeInteger(now))
    throw new Error('휴식 시각을 확인해 주세요.');
  const remaining = Math.max(0, archive.rest.endsAt - now);
  return {
    ...archive,
    rest: {
      ...archive.rest,
      endsAt: now + Math.min(3600000, Math.max(0, remaining + seconds * 1000)),
    },
  };
}

/** 공통 휴식값을 저장합니다. 종목별 개인 설정과 이미 진행 중인 휴식은 변경하지 않습니다. */
export function setDefaultRest(archive: WorkoutArchive, seconds: number | null): WorkoutArchive {
  if (seconds !== null && (!Number.isSafeInteger(seconds) || seconds < 0 || seconds > 3600))
    throw new Error('휴식시간은 0~3600초로 입력해 주세요.');
  const personalRest = { ...archive.personalRest };
  if (seconds === null) delete personalRest['defaults:rest'];
  else personalRest['defaults:rest'] = seconds;
  return { ...archive, personalRest };
}

/** 한 종목의 전체 체크를 한 번의 저장으로 처리합니다. 검증 실패 시 일부 세트만 완료되지 않습니다. */
export function completeAllWithRest(archive: WorkoutArchive, exerciseId: string, completed: boolean, now: number): WorkoutArchive {
  const exercise = archive.current?.exercises.find((item) => item.id === exerciseId);
  if (!exercise?.sets.length) throw new Error('완료할 세트가 없습니다.');
  return exercise.sets.reduce((current, set) => completeWithRest(current, exerciseId, set.id, completed, now), archive);
}

/** 설정 창에서 선택한 범위에 적용합니다. 실행 중인 대상 휴식은 선택한 시간으로 다시 시작합니다. */
export function applyRestSettings(archive: WorkoutArchive, exercise: Exercise, seconds: number | null, all: boolean, now: number): WorkoutArchive {
  if (!Number.isSafeInteger(now)) throw new Error('휴식 시각을 확인해 주세요.');
  let next = setPersonalRest(archive, exercise, seconds);
  if (all) {
    // 모든 종목 적용은 과거 개인 예외도 해제하여 다음에 추가한 종목까지 같은 설정을 사용합니다.
    next = { ...next, personalRest: seconds === null ? {} : { 'defaults:rest': seconds } };
  } else if (seconds === null) {
    // 공통 설정이 있어도 이 종목의 권장값을 명시적으로 선택할 수 있습니다.
    next = setPersonalRest(next, exercise, recommendedRest(findCatalogExercise(exercise.catalogId)) ?? 90);
  }
  if (next.rest && (all || next.rest.exerciseId === exercise.id)) {
    const target = next.current?.exercises.find((item) => item.id === next.rest?.exerciseId);
    const duration = target ? exerciseRest(next, target).seconds : 0;
    next = { ...next, rest: duration ? { ...next.rest, endsAt: now + duration * 1000 } : null };
  }
  return next;
}
