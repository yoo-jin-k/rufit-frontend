import type { Draft } from '../../api/client.ts';
import {
  MAX_WORKOUT_SETS,
  validSet,
  type Exercise,
  type Workout,
  type WorkoutSet,
} from './model.ts';

export type RowIdentity = { exerciseId: string; setId: string };
export type RestTarget = RowIdentity & { endsAt: string };
export type DraftContext = {
  operationId: string;
  version: number;
  // Both fields are explicit: an omitted value must not erase remote metadata.
  note: string;
  rest: RestTarget | null;
};
export type DraftIssue = {
  code: 'FINISHED' | 'CONTEXT' | 'IDENTITY' | 'EXERCISE' | 'SET_INPUT' | 'CAPACITY' | 'REST_TARGET';
  message: string;
  exerciseId?: string;
  setId?: string;
};
export type DraftPreparation =
  | { kind: 'blocked'; issues: DraftIssue[] }
  | {
      kind: 'ready';
      draft: Draft;
      // rows[i] identifies the local row represented by draft.sets[i].
      rows: RowIdentity[];
      // Keep the original strings and empty groups; never replace the form with a numeric response.
      source: Workout;
    };
const uuid = (value: string) => /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
function validInstant(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?Z$/.exec(value);
  if (!match) return false;
  const date = new Date(value);
  const actual = [
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
  ];
  return actual.every((part, index) => part === Number(match[index + 1]));
}

/** Pure preparation only. Save the local form first, then enqueue a ready draft in its verified account scope. */
export function prepareWorkoutDraft(workout: Workout, context: DraftContext): DraftPreparation {
  const issues: DraftIssue[] = [];
  const restShape =
    context.rest === null ||
    (typeof context.rest === 'object' &&
      context.rest !== null &&
      typeof context.rest.exerciseId === 'string' &&
      typeof context.rest.setId === 'string' &&
      typeof context.rest.endsAt === 'string');
  if (workout.finishedAt !== undefined)
    issues.push({
      code: 'FINISHED',
      message: '종료한 운동은 진행 중 초안으로 전송할 수 없습니다.',
    });
  if (
    !uuid(context.operationId) ||
    !Number.isSafeInteger(context.version) ||
    context.version < 0 ||
    typeof context.note !== 'string' ||
    context.note.length > 2000 ||
    !restShape
  )
    issues.push({
      code: 'CONTEXT',
      message: '저장 작업 번호, 서버 버전, 메모와 휴식 상태를 확인해 주세요.',
    });
  const exerciseIds = new Set<string>();
  const setIds = new Set<string>();
  const rows: RowIdentity[] = [];
  const entries: { exercise: Exercise; set: WorkoutSet }[] = [];
  for (const exercise of workout.exercises) {
    if (!exercise.id.trim() || exerciseIds.has(exercise.id))
      issues.push({
        code: 'IDENTITY',
        exerciseId: exercise.id,
        message: '종목의 기록 식별자가 비어 있거나 중복되었습니다.',
      });
    exerciseIds.add(exercise.id);
    if (
      !exercise.name.trim() ||
      exercise.name.trim().length > 80 ||
      (exercise.catalogId !== undefined && !uuid(exercise.catalogId))
    )
      issues.push({
        code: 'EXERCISE',
        exerciseId: exercise.id,
        message: '종목 이름과 목록 식별자를 확인해 주세요.',
      });
    for (const set of exercise.sets) {
      const row = { exerciseId: exercise.id, setId: set.id };
      rows.push(row);
      if (!set.id.trim() || setIds.has(set.id))
        issues.push({
          code: 'IDENTITY',
          ...row,
          message: '세트 식별자가 비어 있거나 중복되었습니다.',
        });
      setIds.add(set.id);
      if (!validSet(set))
        issues.push({
          code: 'SET_INPUT',
          ...row,
          message: '무게와 횟수 입력을 마친 뒤 서버에 저장할 수 있습니다.',
        });
      entries.push({ exercise, set });
    }
  }
  if (rows.length > MAX_WORKOUT_SETS)
    issues.push({ code: 'CAPACITY', message: '한 운동에는 최대 300세트까지 기록할 수 있습니다.' });
  let restSetIndex: number | null = null;
  let restEndsAt: string | null = null;
  if (restShape && context.rest) {
    const target = context.rest;
    const index = rows.findIndex(
      (row) => row.exerciseId === target.exerciseId && row.setId === target.setId,
    );
    if (index < 0 || !entries[index].set.completed || !validInstant(target.endsAt))
      issues.push({
        code: 'REST_TARGET',
        exerciseId: target.exerciseId,
        setId: target.setId,
        message:
          '휴식 대상 세트와 종료 시각을 확인해 주세요. 휴식 종료는 명시적으로 처리해야 합니다.',
      });
    else {
      restSetIndex = index;
      restEndsAt = target.endsAt;
    }
  }
  // No partial draft is exposed: omitting an unfinished row could delete a previously saved server row.
  if (issues.length) return { kind: 'blocked', issues };
  const sets: Draft['sets'] = entries.map(({ exercise, set }) => ({
    set: {
      exerciseId: exercise.catalogId ?? null,
      exerciseName: exercise.name.trim(),
      weight: Number(set.weight),
      reps: Number(set.reps),
    },
    completed: set.completed,
  }));
  return {
    kind: 'ready',
    rows,
    draft: {
      operationId: context.operationId,
      version: context.version,
      note: context.note,
      sets,
      restSetIndex,
      restEndsAt,
    },
    source: {
      ...workout,
      exercises: workout.exercises.map((exercise) => ({
        ...exercise,
        sets: exercise.sets.map((set) => ({ ...set })),
      })),
    },
  };
}
