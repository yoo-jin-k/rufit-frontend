import { findCatalogExercise } from '../exercises/catalog.ts';
import { updateSet, type Exercise } from './model.ts';
import { remember, type WorkoutArchive } from './storage.ts';

function preferenceKey(exercise: Exercise) {
  return exercise.catalogId ? `catalog:${exercise.catalogId}` : `name:${exercise.name.normalize('NFKC').trim()}`;
}
export function exerciseRest(archive: WorkoutArchive, exercise: Exercise) {
  const key = preferenceKey(exercise);
  const personal = Object.hasOwn(archive.personalRest, key) ? archive.personalRest[key] : undefined;
  const recommended = findCatalogExercise(exercise.catalogId)?.recommendedRestSeconds;
  return {seconds: personal ?? recommended ?? 90, source: personal !== undefined ? '개인 설정' : recommended !== undefined ? '권장' : '기본', recommended};
}
export function setPersonalRest(archive: WorkoutArchive, exercise: Exercise, seconds: number | null): WorkoutArchive {
  if (seconds !== null && (!Number.isSafeInteger(seconds) || seconds < 0 || seconds > 3600)) throw new Error('휴식시간은 0~3600초로 입력해 주세요.');
  const personalRest = {...archive.personalRest};
  if (seconds === null) delete personalRest[preferenceKey(exercise)];
  else personalRest[preferenceKey(exercise)] = seconds;
  return {...archive, personalRest};
}
export function completeWithRest(archive: WorkoutArchive, exerciseId: string, setId: string, completed: boolean, now: number): WorkoutArchive {
  const workout = archive.current;
  const exercise = workout?.exercises.find(e => e.id === exerciseId);
  const set = exercise?.sets.find(s => s.id === setId);
  if (!workout || !exercise || !set) throw new Error('완료할 세트를 찾을 수 없습니다.');
  if (!Number.isSafeInteger(now)) throw new Error('휴식 시각을 확인해 주세요.');
  const result = remember(archive, updateSet(workout, exerciseId, setId, {completed}));
  if (!completed || set.completed) return result;
  const seconds = exerciseRest(archive, exercise).seconds;
  return {...result, rest: seconds === 0 ? null : {workoutId: workout.id, exerciseId, setId, endsAt: now + seconds * 1000}};
}
export function adjustLocalRest(archive: WorkoutArchive, seconds: number, now: number): WorkoutArchive {
  if (!archive.rest) return archive;
  if (!Number.isSafeInteger(seconds) || !Number.isSafeInteger(now)) throw new Error('휴식 시각을 확인해 주세요.');
  return {...archive, rest: {...archive.rest, endsAt: Math.min(now + 3600000, Math.max(now, archive.rest.endsAt + seconds * 1000))}};
}
