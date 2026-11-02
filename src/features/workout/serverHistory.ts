import type { WorkoutSnapshot } from '../../api/client.ts';
import type { RufitSession } from '../../api/session.ts';
import { isWorkout } from './storage.ts';
import { validSet, type Workout } from './model.ts';

/** 서버 원본을 기기 기록과 다른 ID로 표시합니다. 조회만으로 기존 기록을 덮어쓰지 않습니다. */
export function serverWorkout(snapshot: WorkoutSnapshot): Workout {
  if (!snapshot || typeof snapshot.id !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(snapshot.id)
    || !snapshot.finishedAt || snapshot.cancelledAt !== null || !Array.isArray(snapshot.sets)
    || !Array.isArray(snapshot.completedSetIndexes) || snapshot.sets.length === 0
    || snapshot.completedSetIndexes.length !== snapshot.sets.length
    || new Set(snapshot.completedSetIndexes).size !== snapshot.sets.length
    || snapshot.completedSetIndexes.some((index) => !Number.isInteger(index) || index < 0 || index >= snapshot.sets.length))
    throw new Error('서버 운동 기록의 형식을 확인하지 못했습니다.');
  const workout: Workout = { id: `server:${snapshot.id}`, startedAt: Date.parse(snapshot.startedAt),
    finishedAt: Date.parse(snapshot.finishedAt), pausedDurationMs: snapshot.pausedDurationMs ?? 0, exercises: [] };
  snapshot.sets.forEach((set, index) => {
    if (!set || typeof set.exerciseName !== 'string' || !set.exerciseName.trim()
      || typeof set.weight !== 'number' || typeof set.reps !== 'number'
      || !validSet({ id: 'validation', weight: String(set.weight), reps: String(set.reps), completed: true }))
      throw new Error('서버 세트 값을 확인하지 못했습니다.');
    let exercise = workout.exercises.at(-1);
    if (!exercise || exercise.name !== set.exerciseName || exercise.catalogId !== (set.exerciseId ?? undefined)) {
      exercise = { id: `${snapshot.id}:exercise:${index}`, name: set.exerciseName,
        ...(set.exerciseId ? { catalogId: set.exerciseId } : {}), sets: [] };
      workout.exercises.push(exercise);
    }
    exercise.sets.push({ id: `${snapshot.id}:set:${index}`, weight: String(set.weight), reps: String(set.reps), completed: true });
  });
  if (!isWorkout(workout)) throw new Error('서버 운동 기록의 날짜와 세트 값을 확인하지 못했습니다.');
  return workout;
}

/** 응답을 기다리는 중 로그아웃한 경우 결과를 폐기합니다. 재로그인한 다른 계정에 전달하지 않습니다. */
export async function readServerHistory(session: RufitSession, page: number) {
  if (!session.isActive()) throw new Error('다시 로그인한 뒤 기록을 확인해 주세요.');
  const response = await session.api.history(page, 20);
  if (!session.isActive()) throw new Error('로그인이 변경되어 조회 결과를 사용하지 않았습니다.');
  if (!response || response.page !== page || !Array.isArray(response.items) || typeof response.hasNext !== 'boolean')
    throw new Error('서버 기록 목록을 확인하지 못했습니다.');
  return { records: response.items.map(serverWorkout), hasNext: response.hasNext };
}
