export type SetInput = { exerciseName: string; weight: number; reps: number };
export type WorkoutSnapshot = {
  id: string; startedAt: string; finishedAt: string | null; cancelledAt: string | null;
  version: number; sets: SetInput[]; completedSetIndexes: number[]; restEndsAt: string | null;
};
export type Routine = { id: string; title: string; version: number; sets: SetInput[] };
export type Page<T> = { items: T[]; page: number; size: number; totalElements: number; hasNext: boolean };
export type ExerciseRecord = { workoutId: string; finishedAt: string; sets: SetInput[] };
export type DaySummary = { date: string; workouts: number; completedSets: number; volumeKgReps: number; durationSeconds: number };
export type Calendar = { month: string; zone: string; days: DaySummary[]; workoutDays: number; workouts: number; completedSets: number; volumeKgReps: number; durationSeconds: number };
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly outcomeUnknown: boolean;
  constructor(status: number, code: string, message: string, outcomeUnknown = false) {
    super(message); this.name = 'ApiError'; this.status = status; this.code = code; this.outcomeUnknown = outcomeUnknown;
  }
}
type Options = { baseUrl: string; getAccessToken: () => string | null | Promise<string | null>; fetch?: typeof fetch; timeoutMs?: number };
const segment = encodeURIComponent;
const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
export function createRufitApi(options: Options) {
  const base = new URL(options.baseUrl);
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash)
    throw new Error('API 주소 형식을 확인해 주세요.');
  const baseUrl = base.toString().replace(/\/$/, '');
  const transport = options.fetch ?? fetch;
  const timeoutMs = options.timeoutMs ?? 15000;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('요청 대기 시간을 확인해 주세요.');
  async function request<T>(method: string, path: string, body?: unknown, extraHeaders?: Record<string, string>): Promise<T> {
    const token = await options.getAccessToken();
    if (!token) throw new ApiError(401, 'AUTHENTICATION_REQUIRED', '로그인이 필요합니다.');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await transport(`${baseUrl}/api/v1${path}`, {
        method, signal: controller.signal, credentials: 'omit', redirect: 'error',
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...extraHeaders },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      if (response.status === 204) return null as T;
      let value: unknown;
      try { value = await response.json(); } catch {
        throw new ApiError(response.status, 'INVALID_RESPONSE', '서버 응답을 읽지 못했습니다. 최신 기록을 다시 확인해 주세요.', method !== 'GET');
      }
      if (!response.ok) {
        const code = object(value) && typeof value.code === 'string' ? value.code : 'HTTP_ERROR';
        const message = object(value) && typeof value.detail === 'string' ? value.detail : '요청을 처리하지 못했습니다.';
        throw new ApiError(response.status, code, message, method !== 'GET' && response.status >= 500);
      }
      return value as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(0, controller.signal.aborted ? 'TIMEOUT' : 'NETWORK_ERROR',
        '연결을 확인한 뒤 최신 기록을 다시 조회해 주세요.', method !== 'GET');
    } finally { clearTimeout(timeout); }
  }
  const workoutPath = (id: string) => `/workouts/${segment(id)}`;
  return {
    start: (idempotencyKey: string) => request<WorkoutSnapshot>('POST', '/workouts', undefined, { 'Idempotency-Key': idempotencyKey }),
    active: () => request<WorkoutSnapshot | null>('GET', '/workouts/active'),
    workout: (id: string) => request<WorkoutSnapshot>('GET', workoutPath(id)),
    history: (page = 0, size = 20) => request<Page<WorkoutSnapshot>>('GET', `/workouts?page=${page}&size=${size}`),
    replaceSets: (id: string, version: number, sets: SetInput[]) => request<WorkoutSnapshot>('PUT', `${workoutPath(id)}/exercises`, { version, sets }),
    appendSet: (id: string, version: number, set: SetInput) => request<WorkoutSnapshot>('POST', `${workoutPath(id)}/sets`, { version, set }),
    editSet: (id: string, version: number, index: number, set: SetInput) => request<WorkoutSnapshot>('PUT', `${workoutPath(id)}/sets/${index}`, { version, set }),
    removeSet: (id: string, version: number, index: number) => request<WorkoutSnapshot>('POST', `${workoutPath(id)}/sets/${index}/remove`, { version }),
    completeSet: (id: string, version: number, index: number, completed: boolean, restSeconds: number) =>
      request<WorkoutSnapshot>('PUT', `${workoutPath(id)}/sets/${index}/completion`, { version, completed, restSeconds }),
    skipRest: (id: string, version: number) => request<WorkoutSnapshot>('POST', `${workoutPath(id)}/rest/skip`, { version }),
    finish: (id: string, version: number, discardIncomplete = false) => request<WorkoutSnapshot>('POST', `${workoutPath(id)}/finish`, { version, discardIncomplete }),
    cancel: (id: string, version: number, confirmed: true) => request<WorkoutSnapshot>('POST', `${workoutPath(id)}/cancel`, { version, confirmed }),
    exerciseHistory: (exerciseName: string, page = 0, size = 10) => request<Page<ExerciseRecord> & { exerciseName: string }>('GET', `/workouts/exercise-history?exerciseName=${segment(exerciseName)}&page=${page}&size=${size}`),
    calendar: (month: string, zone = 'Asia/Seoul') => request<Calendar>('GET', `/workouts/calendar?month=${segment(month)}&zone=${segment(zone)}`),
    routines: (page = 0) => request<Routine[]>('GET', `/routines?page=${page}`),
    routine: (id: string) => request<Routine>('GET', `/routines/${segment(id)}`),
    createRoutine: (title: string, sets: SetInput[]) => request<Routine>('POST', '/routines', { title, sets }),
    updateRoutine: (id: string, version: number, title: string, sets: SetInput[]) => request<Routine>('PUT', `/routines/${segment(id)}`, { version, title, sets }),
    startRoutine: (id: string) => request<WorkoutSnapshot>('POST', `/routines/${segment(id)}/start`),
  };
}
