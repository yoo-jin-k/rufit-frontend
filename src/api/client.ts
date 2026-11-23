/** FRIENDS는 친구에게만, PUBLIC은 친구가 아닌 회원에게도 운동 중 상태를 보여 줍니다. */
export type LiveScope = 'FRIENDS' | 'PUBLIC';
export type LiveWorkouts = {
  sharing: boolean;
  scope?: LiveScope;
  workoutId: string | null;
  /** 서버가 친구 먼저, 같은 묶음 안에서는 지금 운동 볼륨(kg)이 큰 순서로 보내 줍니다. */
  items: {
    memberId: string;
    nickname: string;
    workoutId: string;
    sent: boolean;
    friend?: boolean;
    volume?: number;
    avatar?: string | null;
  }[];
  received: { memberId: string; nickname: string }[];
};
export type ServerPost = {
  id: string;
  sourceId: string | null;
  memberId: string;
  nickname: string;
  memo: string;
  date: string;
  summary: string;
  visibility: 'PRIVATE' | 'FRIENDS' | 'PUBLIC';
  version: number;
  photos: string[];
  thumbnail: string | null;
  likes: number;
  liked: boolean;
  mine: boolean;
  /** 상세를 연 다른 회원 수입니다. 예전 서버는 보내지 않아 없을 수 있습니다. */
  views?: number;
};
export type PostEdit = {
  version: number;
  memo: string;
  date: string;
  summary: string;
  visibility: 'PRIVATE' | 'FRIENDS' | 'PUBLIC';
  photos: string[];
};
export type ServerNotification = {
  id: string;
  type: 'FRIEND_REQUEST' | 'FRIEND_ACCEPTED' | 'POST_LIKED' | 'WORKOUT_CHEER';
  actorId: string;
  actorNickname: string;
  requestId: string | null;
  postId?: string | null;
  workoutId?: string | null;
  createdAt: string;
  read: boolean;
};
export type ReportReason = 'SPAM' | 'HARASSMENT' | 'INAPPROPRIATE' | 'OTHER';
export type MemberProfile = {
  memberId: string;
  nickname: string;
  relationship: 'SELF' | 'FRIEND' | 'INCOMING' | 'OUTGOING' | 'NONE';
  /** 공개 프로필의 한 줄 소개와 작은 사진(data URI)입니다. 저장하지 않았으면 null입니다. */
  bio?: string | null;
  avatar?: string | null;
};
/** 검색·친구 목록 한 줄입니다. */
export type SocialMember = {
  memberId: string;
  nickname: string;
  bio?: string | null;
  avatar?: string | null;
};
export type FriendRequest = {
  id: string;
  requesterId: string;
  targetId: string;
  requesterNickname: string;
  targetNickname: string;
  state: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
};
export type FriendRequests = { incoming: FriendRequest[]; outgoing: FriendRequest[] };
export type SocialMembers = { items: SocialMember[] };
/** 검색 허용은 별도의 명시적 저장으로만 변경하며 기기 프로필을 자동 공개하지 않습니다. */
/** 닉네임 사용 가능 여부 확인 결과입니다. nickname은 앞뒤 공백을 제거한 값입니다. */
export type NicknameAvailability = { nickname: string; available: boolean };
export type DirectorySettings = {
  memberId: string | null;
  nickname: string | null;
  discoverable: boolean;
  version: number;
  /** 공개 프로필을 한 번도 저장하지 않았으면 null입니다. */
  bio?: string | null;
  hasAvatar?: boolean;
};
export type DirectoryEdit = { nickname: string; discoverable: boolean; version: number };
export type DirectoryResults = {
  items: SocialMember[];
  page: number;
  size: number;
  hasNext: boolean;
};
export type SetType = 'NORMAL' | 'WARMUP' | 'DROP' | 'FAILURE';
export type SetInput = {
  exerciseId?: string | null;
  exerciseName: string;
  weight: number;
  /** 횟수입니다. 스트레칭·플랭크처럼 시간으로 기록하는 세트는 비우고 durationSeconds를 씁니다. */
  reps?: number | null;
  /** 시간(초) 1~3600. 시간 세트는 무게 0, 횟수 없음으로 보냅니다. */
  durationSeconds?: number | null;
  /** 생략하면 서버가 NORMAL로 저장합니다. */
  setType?: SetType;
  /** 운동 자각도 5~10. 생략하면 미입력입니다. */
  rpe?: number | null;
};
export type MeasurementKind = 'weight' | 'strength';
export type ServerMeasurement = {
  date: string;
  version: number;
  weight: number | null;
  bench: number | null;
  squat: number | null;
  deadlift: number | null;
};
export type MeasurementEdit = {
  version: number;
  weight?: number;
  bench?: number;
  squat?: number;
  deadlift?: number;
};
export type OfflineWorkoutImport = {
  startedAt: string;
  finishedAt: string;
  sets: { set: SetInput; completed: boolean }[];
  note: string;
  confirmed: true;
  pausedDurationMs: number;
  recordDate?: string;
  entryMode?: 'manual';
};
export type WorkoutSnapshot = {
  recordDate?: string | null;
  entryMode?: 'manual' | null;
  id: string;
  startedAt: string;
  finishedAt: string | null;
  cancelledAt: string | null;
  sourceRoutineId: string | null;
  version: number;
  sets: SetInput[];
  completedSetIndexes: number[];
  restEndsAt: string | null;
  restSetIndex: number | null;
  note: string;
  pausedAt?: string | null;
  pausedDurationMs?: number;
};
export type Draft = {
  note?: string | null;
  operationId: string;
  version: number;
  sets: { set: SetInput; completed: boolean }[];
  restSetIndex: number | null;
  restEndsAt: string | null;
};
export type DraftSave = { workout: WorkoutSnapshot; appliedVersion: number; replayed: boolean };
export type BodyPart =
  | 'CHEST'
  | 'BACK'
  | 'SHOULDERS'
  | 'LEGS'
  | 'ARMS'
  | 'CORE'
  | 'FULL_BODY'
  | 'STRETCH';
export type Equipment = 'BARBELL' | 'DUMBBELL' | 'MACHINE' | 'CABLE' | 'BODYWEIGHT' | 'OTHER';
export type ExerciseInput = { name: string; bodyPart: BodyPart; equipment: Equipment };
export type Exercise = ExerciseInput & {
  id: string;
  custom: boolean;
  archivedAt: string | null;
  version: number;
  recommendedRestSeconds?: number | null;
};
export type ExerciseSearch = {
  query?: string;
  bodyPart?: BodyPart;
  equipment?: Equipment;
  page?: number;
  size?: number;
  includeArchived?: boolean;
};
export type ProfileFields = {
  nickname: string;
  bio: string;
  experience: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | null;
  goals: ('GENERAL_FITNESS' | 'STRENGTH' | 'MUSCLE_GAIN' | 'WEIGHT_MANAGEMENT')[];
};
export type Profile = ProfileFields & { version: number; visibility: 'PRIVATE' };
export type ExerciseRest = {
  exerciseId: string;
  version: number;
  recommendedRestSeconds: number | null;
  personalRestSeconds: number | null;
  effectiveRestSeconds: number;
  source: 'RECOMMENDED' | 'PERSONAL' | 'DEFAULT';
};
export type RestPreferences = { version: number; defaultRestSeconds: number };
export type WeightUnit = 'KG' | 'LB';
export type UnitPreferences = { version: number; weightUnit: WeightUnit };
export type ExerciseFavorite = { exerciseId: string; createdAt: string };
export type Routine = {
  id: string;
  title: string;
  version: number;
  sets: SetInput[];
  sourceRoutineId: string | null;
  sourceWorkoutId: string | null;
};
export type Page<T> = {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  hasNext: boolean;
};
export type ExerciseRecord = { workoutId: string; finishedAt: string; sets: SetInput[] };
export type PreviousExerciseSets = {
  items: { exerciseId: string; exerciseName: string; record: ExerciseRecord | null }[];
};
export type WorkoutSummary = {
  workoutId: string;
  version: number;
  startedAt: string;
  finishedAt: string;
  durationSeconds: number;
  completedSets: number;
  totalReps: number;
  volumeKgReps: number;
  exercises: {
    exerciseId: string | null;
    exerciseName: string;
    completedSets: number;
    totalReps: number;
    volumeKgReps: number;
    heaviestWeight: number;
    repsAtHeaviestWeight: number;
  }[];
};
export type ExerciseStatistics = {
  exerciseId: string | null;
  exerciseName: string;
  workouts: number;
  completedSets: number;
  totalReps: number;
  volumeKgReps: number;
  lastPerformedAt: string | null;
  heaviestSet: {
    workoutId: string;
    finishedAt: string;
    setIndex: number;
    weight: number;
    reps: number;
  } | null;
};
export type DaySummary = {
  date: string;
  workouts: number;
  completedSets: number;
  volumeKgReps: number;
  durationSeconds: number;
};
export type Calendar = {
  month: string;
  zone: string;
  days: DaySummary[];
  workoutDays: number;
  workouts: number;
  completedSets: number;
  volumeKgReps: number;
  durationSeconds: number;
};
export type WeeklyCalendar = Omit<Calendar, 'month'> & { weekStart: string; weekEnd: string };
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly outcomeUnknown: boolean;
  readonly requestId: string | null;
  constructor(
    status: number,
    code: string,
    message: string,
    outcomeUnknown = false,
    requestId: string | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.outcomeUnknown = outcomeUnknown;
    this.requestId = requestId;
  }
}
type Options = {
  baseUrl: string;
  getAccessToken: () => string | null | Promise<string | null>;
  fetch?: typeof fetch;
  timeoutMs?: number;
  allowInsecureHttp?: boolean;
  /** 서버가 401(로그인 만료)로 응답했을 때 알립니다. 로그인 갱신이나 로그인 창 열기에 씁니다. */
  onUnauthorized?: () => void;
};
const segment = encodeURIComponent;
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;
export function createRufitApi(options: Options) {
  const base = new URL(options.baseUrl);
  if (
    !['http:', 'https:'].includes(base.protocol) ||
    base.username ||
    base.password ||
    base.search ||
    base.hash
  )
    throw new Error('API 주소 형식을 확인해 주세요.');
  if (
    base.protocol === 'http:' &&
    !['localhost', '127.0.0.1', '[::1]'].includes(base.hostname) &&
    !options.allowInsecureHttp
  )
    throw new Error('로그인 토큰을 보내는 서버 주소에는 HTTPS가 필요합니다.');
  const baseUrl = base.toString().replace(/\/$/, '');
  const transport = options.fetch ?? fetch;
  const timeoutMs = options.timeoutMs ?? 15000;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0)
    throw new Error('요청 대기 시간을 확인해 주세요.');
  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    extraHeaders?: Record<string, string>,
  ): Promise<T> {
    const token = await options.getAccessToken();
    if (!token) throw new ApiError(401, 'AUTHENTICATION_REQUIRED', '로그인이 필요합니다.');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await transport(`${baseUrl}/api/v1${path}`, {
        method,
        signal: controller.signal,
        credentials: 'omit',
        redirect: 'error',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...extraHeaders,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const responseId = response.headers.get('X-Request-Id');
      const requestId =
        responseId &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(responseId)
          ? responseId
          : null;
      if (response.status === 204) return null as T;
      let value: unknown;
      try {
        value = await response.json();
      } catch {
        throw new ApiError(
          response.status,
          'INVALID_RESPONSE',
          '서버 응답을 읽지 못했습니다. 최신 기록을 다시 확인해 주세요.',
          method !== 'GET',
          requestId,
        );
      }
      if (!response.ok) {
        if (response.status === 401) options.onUnauthorized?.();
        const code = object(value) && typeof value.code === 'string' ? value.code : 'HTTP_ERROR';
        const message =
          object(value) && typeof value.detail === 'string'
            ? value.detail
            : '요청을 처리하지 못했습니다.';
        throw new ApiError(
          response.status,
          code,
          message,
          method !== 'GET' && response.status >= 500,
          requestId,
        );
      }
      return value as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        0,
        controller.signal.aborted ? 'TIMEOUT' : 'NETWORK_ERROR',
        '연결을 확인한 뒤 최신 기록을 다시 조회해 주세요.',
        method !== 'GET',
      );
    } finally {
      clearTimeout(timeout);
    }
  }
  const workoutPath = (id: string) => `/workouts/${segment(id)}`;
  return {
    restPreferences: () => request<RestPreferences>('GET', '/preferences/rest'),
    saveRestPreferences: (version: number, defaultRestSeconds: number) =>
      request<RestPreferences>('PUT', '/preferences/rest', { version, defaultRestSeconds }),
    unitPreferences: () => request<UnitPreferences>('GET', '/preferences/units'),
    saveUnitPreferences: (version: number, weightUnit: WeightUnit) =>
      request<UnitPreferences>('PUT', '/preferences/units', { version, weightUnit }),
    exerciseFavorites: () =>
      request<{ favorites: ExerciseFavorite[] }>('GET', '/exercises/favorites'),
    addExerciseFavorite: (exerciseId: string) =>
      request<ExerciseFavorite>('PUT', `/exercises/${segment(exerciseId)}/favorite`),
    removeExerciseFavorite: (exerciseId: string) =>
      request<void>('DELETE', `/exercises/${segment(exerciseId)}/favorite`),
    profile: () => request<Profile>('GET', '/profile'),
    createProfile: (profile: ProfileFields, idempotencyKey: string) =>
      request<Profile>('POST', '/profile', profile, { 'Idempotency-Key': idempotencyKey }),
    updateProfile: (version: number, profile: ProfileFields) =>
      request<Profile>('PUT', '/profile', { version, profile }),
    me: () => request<{ id: string }>('GET', '/me'),
    exerciseStatisticsById: (exerciseId: string) =>
      request<ExerciseStatistics>(
        'GET',
        `/workouts/exercise-statistics?exerciseId=${segment(exerciseId)}`,
      ),
    exerciseStatisticsByName: (exerciseName: string) =>
      request<ExerciseStatistics>(
        'GET',
        `/workouts/exercise-statistics?exerciseName=${segment(exerciseName)}`,
      ),
    updateNote: (id: string, version: number, note: string) =>
      request<WorkoutSnapshot>('PUT', `${workoutPath(id)}/note`, { version, note }),
    saveDraft: (id: string, draft: Draft) =>
      request<DraftSave>('PUT', `${workoutPath(id)}/draft`, draft),
    exercises: (search: ExerciseSearch = {}) => {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(search))
        if (value !== undefined) params.set(key, String(value));
      return request<Page<Exercise>>('GET', `/exercises?${params}`);
    },
    exercise: (id: string) => request<Exercise>('GET', `/exercises/${segment(id)}`),
    createExercise: (input: ExerciseInput, idempotencyKey: string) =>
      request<Exercise>('POST', '/exercises', input, { 'Idempotency-Key': idempotencyKey }),
    updateExercise: (id: string, version: number, input: ExerciseInput) =>
      request<Exercise>('PUT', `/exercises/${segment(id)}`, { version, ...input }),
    archiveExercise: (id: string, version: number) =>
      request<Exercise>('POST', `/exercises/${segment(id)}/archive`, { version }),
    restoreExercise: (id: string, version: number) =>
      request<Exercise>('POST', `/exercises/${segment(id)}/restore`, { version }),
    exerciseHistoryById: (exerciseId: string, page = 0, size = 10) =>
      request<Page<ExerciseRecord> & { exerciseName: string }>(
        'GET',
        `/workouts/exercise-history?exerciseId=${segment(exerciseId)}&page=${page}&size=${size}`,
      ),
    previousSets: (exerciseIds: readonly string[]) =>
      request<PreviousExerciseSets>(
        'GET',
        `/workouts/previous-sets?exerciseIds=${segment(exerciseIds.join(','))}`,
      ),
    routineFromWorkout: (
      workoutId: string,
      version: number,
      title: string,
      idempotencyKey: string,
    ) =>
      request<Routine>(
        'POST',
        `/routines/from-workout/${segment(workoutId)}`,
        { version, title },
        { 'Idempotency-Key': idempotencyKey },
      ),
    copyRoutine: (id: string, version: number, title: string, idempotencyKey: string) =>
      request<Routine>(
        'POST',
        `/routines/${segment(id)}/copy`,
        { version, title },
        { 'Idempotency-Key': idempotencyKey },
      ),
    deleteRoutine: (id: string, version: number, confirmed: true) =>
      request<null>('POST', `/routines/${segment(id)}/delete`, { version, confirmed }),
    start: (idempotencyKey: string) =>
      request<WorkoutSnapshot>('POST', '/workouts', undefined, {
        'Idempotency-Key': idempotencyKey,
      }),
    active: () => request<WorkoutSnapshot | null>('GET', '/workouts/active'),
    workoutSummary: (id: string) => request<WorkoutSummary>('GET', `${workoutPath(id)}/summary`),
    workout: (id: string) => request<WorkoutSnapshot>('GET', workoutPath(id)),
    importWorkout: (key: string, body: OfflineWorkoutImport) =>
      request<{ workout: WorkoutSnapshot; importedVersion: number; replayed: boolean }>(
        'POST',
        '/workouts/import',
        body,
        { 'Idempotency-Key': key },
      ),
    measurements: (kind: MeasurementKind, page = 0) =>
      request<Page<ServerMeasurement>>('GET', `/measurements/${kind}?page=${page}&size=100`),
    saveMeasurement: (kind: MeasurementKind, date: string, body: MeasurementEdit) =>
      request<ServerMeasurement>('PUT', `/measurements/${kind}/${segment(date)}`, body),
    history: (page = 0, size = 20) =>
      request<Page<WorkoutSnapshot>>('GET', `/workouts?page=${page}&size=${size}`),
    dailyHistory: (date: string, zone = 'Asia/Seoul', page = 0, size = 20) =>
      request<Page<WorkoutSnapshot>>(
        'GET',
        `/workouts?date=${segment(date)}&zone=${segment(zone)}&page=${page}&size=${size}`,
      ),
    replaceSets: (id: string, version: number, sets: SetInput[]) =>
      request<WorkoutSnapshot>('PUT', `${workoutPath(id)}/exercises`, { version, sets }),
    appendSet: (id: string, version: number, set: SetInput) =>
      request<WorkoutSnapshot>('POST', `${workoutPath(id)}/sets`, { version, set }),
    editSet: (id: string, version: number, index: number, set: SetInput) =>
      request<WorkoutSnapshot>('PUT', `${workoutPath(id)}/sets/${index}`, { version, set }),
    removeSet: (id: string, version: number, index: number) =>
      request<WorkoutSnapshot>('POST', `${workoutPath(id)}/sets/${index}/remove`, { version }),
    completeSet: (
      id: string,
      version: number,
      index: number,
      completed: boolean,
      restSeconds?: number | null,
    ) =>
      request<WorkoutSnapshot>('PUT', `${workoutPath(id)}/sets/${index}/completion`, {
        version,
        completed,
        restSeconds,
      }),
    exerciseRest: (id: string) => request<ExerciseRest>('GET', `/exercises/${segment(id)}/rest`),
    saveExerciseRest: (
      id: string,
      version: number,
      mode: 'RECOMMENDED' | 'PERSONAL',
      restSeconds?: number | null,
    ) =>
      request<ExerciseRest>('PUT', `/exercises/${segment(id)}/rest`, {
        version,
        mode,
        restSeconds,
      }),
    skipRest: (id: string, version: number) =>
      request<WorkoutSnapshot>('POST', `${workoutPath(id)}/rest/skip`, { version }),
    // 조절은 한 번만 전송합니다. 응답 유실·409 뒤에는 workout 조회로 확인하고 새 사용자 조작에 최신 버전을 사용합니다.
    adjustRest: (id: string, version: number, seconds: -10 | 10) =>
      request<WorkoutSnapshot>('POST', `${workoutPath(id)}/rest/adjust`, { version, seconds }),
    pause: (id: string, version: number) =>
      request<WorkoutSnapshot>('POST', `${workoutPath(id)}/pause`, { version }),
    resume: (id: string, version: number) =>
      request<WorkoutSnapshot>('POST', `${workoutPath(id)}/resume`, { version }),
    finish: (id: string, version: number, discardIncomplete = false) =>
      request<WorkoutSnapshot>('POST', `${workoutPath(id)}/finish`, { version, discardIncomplete }),
    cancel: (id: string, version: number, confirmed: true) =>
      request<WorkoutSnapshot>('POST', `${workoutPath(id)}/cancel`, { version, confirmed }),
    correctHistory: (id: string, version: number, sets: SetInput[]) =>
      request<WorkoutSnapshot>('PUT', `${workoutPath(id)}/history`, { version, sets }),
    deleteHistory: (id: string, version: number, confirmed: true) =>
      request<null>('POST', `${workoutPath(id)}/delete`, { version, confirmed }),
    exerciseHistory: (exerciseName: string, page = 0, size = 10) =>
      request<Page<ExerciseRecord> & { exerciseName: string }>(
        'GET',
        `/workouts/exercise-history?exerciseName=${segment(exerciseName)}&page=${page}&size=${size}`,
      ),
    weeklyCalendar: (date: string, zone = 'Asia/Seoul') =>
      request<WeeklyCalendar>(
        'GET',
        `/workouts/calendar/week?date=${segment(date)}&zone=${segment(zone)}`,
      ),
    calendar: (month: string, zone = 'Asia/Seoul') =>
      request<Calendar>('GET', `/workouts/calendar?month=${segment(month)}&zone=${segment(zone)}`),
    friendRequests: () => request<FriendRequests>('GET', '/social/requests'),
    sendFriendRequest: (requestId: string, targetId: string) =>
      request<FriendRequest>('POST', '/social/requests', { requestId, targetId }),
    respondFriendRequest: (id: string, action: 'ACCEPT' | 'REJECT' | 'CANCEL') =>
      request<FriendRequest>('POST', `/social/requests/${segment(id)}/respond`, { action }),
    removeFriend: (id: string) => request<null>('DELETE', `/social/friends/${segment(id)}`),
    /** 회원 탈퇴: 계정과 서버에 저장한 기록을 모두 지웁니다. 되돌릴 수 없습니다. */
    deleteAccount: () => request<null>('DELETE', '/account'),
    memberProfile: (id: string) => request<MemberProfile>('GET', `/social/members/${segment(id)}`),
    reportMember: (requestId: string, targetId: string, reason: ReportReason) =>
      request<{ id: string; status: 'RECEIVED' }>('POST', '/social/reports', {
        requestId,
        targetId,
        reason,
      }),
    savePost: (source: string, body: PostEdit) =>
      request<ServerPost>('PUT', `/social/posts/mine/${segment(source)}`, body),
    ownPost: (source: string) =>
      request<ServerPost>('GET', `/social/posts/mine/${segment(source)}`),
    post: (id: string) => request<ServerPost>('GET', `/social/posts/${segment(id)}`),
    /** 소셜 피드: 볼 수 있는 다른 회원의 글을 최신순으로 30개씩. following이면 친구(팔로잉) 글만. */
    feed: (following = false, page = 0) =>
      request<{ items: ServerPost[]; hasNext: boolean; total: number }>(
        'GET',
        `/social/posts/feed?page=${page}${following ? '&following=true' : ''}`,
      ),
    posts: (memberId?: string, page = 0) =>
      request<{ items: ServerPost[]; hasNext: boolean; total: number }>(
        'GET',
        `/social/posts?page=${page}${memberId ? `&memberId=${segment(memberId)}` : ''}`,
      ),
    likePost: (id: string, liked: boolean) =>
      request<ServerPost>('PUT', `/social/posts/${segment(id)}/like`, { liked }),
    liveWorkouts: () => request<LiveWorkouts>('GET', '/social/live'),
    shareLiveWorkout: (enabled: boolean, scope?: LiveScope) =>
      request<void>('PUT', '/social/live/sharing', { enabled, scope }),
    liveHeartbeat: (id: string, active: boolean, volume?: number) =>
      request<void>('PUT', `/social/live/mine/${segment(id)}`, { active, volume }),
    /** 보낸 응원을 취소합니다. 상대에게 간 응원 알림도 함께 지워집니다. */
    cancelCheer: (memberId: string, workoutId: string) =>
      request<void>('DELETE', `/social/live/${segment(memberId)}/${segment(workoutId)}/cheer`),
    cheerWorkout: (memberId: string, workoutId: string) =>
      request<void>('POST', `/social/live/${segment(memberId)}/${segment(workoutId)}/cheer`),
    deletePost: (id: string, version: number) =>
      request<void>('DELETE', `/social/posts/${segment(id)}?version=${version}`),
    hidePost: (id: string) => request<void>('POST', `/social/posts/${segment(id)}/hide`),
    notifications: (before?: string) =>
      request<{ items: ServerNotification[]; unreadCount: number; hasNext: boolean }>(
        'GET',
        `/social/notifications${before ? `?before=${encodeURIComponent(before)}` : ''}`,
      ),
    readNotification: (id: string) =>
      request<void>('POST', `/social/notifications/${segment(id)}/read`),
    friends: () => request<SocialMembers>('GET', '/social/friends'),
    blockedMembers: () => request<SocialMembers>('GET', '/social/blocks'),
    blockMember: (id: string) => request<null>('POST', `/social/blocks/${segment(id)}`),
    unblockMember: (id: string) => request<null>('DELETE', `/social/blocks/${segment(id)}`),
    directorySettings: () => request<DirectorySettings>('GET', '/social/directory/me'),
    updateDirectory: (edit: DirectoryEdit) =>
      request<DirectorySettings>('PUT', '/social/directory/me', edit),
    /** 대소문자와 앞뒤 공백을 무시하고 다른 회원이 같은 닉네임을 쓰는지 확인합니다. */
    nicknameAvailability: (nickname: string) =>
      request<NicknameAvailability>(
        'GET',
        `/social/directory/nickname-availability?nickname=${segment(nickname)}`,
      ),
    /** 친구 검색·친구 목록에 보일 사진과 한 줄 소개를 통째로 바꿉니다. avatar가 null이면 지웁니다. */
    updatePublicProfile: (bio: string, avatar: string | null) =>
      request<{ bio: string; avatar: string | null }>('PUT', '/social/directory/me/profile', {
        bio,
        avatar,
      }),
    searchDirectory: (query: string, page = 0, size = 20) =>
      request<DirectoryResults>(
        'GET',
        `/social/directory/search?q=${segment(query)}&page=${page}&size=${size}`,
      ),
    routines: (page = 0) => request<Routine[]>('GET', `/routines?page=${page}`),
    routine: (id: string) => request<Routine>('GET', `/routines/${segment(id)}`),
    createRoutine: (title: string, sets: SetInput[], idempotencyKey?: string) =>
      request<Routine>(
        'POST',
        '/routines',
        { title, sets },
        idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
      ),
    searchRoutines: (query = '', page = 0, size = 20) =>
      request<Page<Routine>>(
        'GET',
        `/routines/search?query=${segment(query)}&page=${page}&size=${size}`,
      ),
    updateRoutine: (id: string, version: number, title: string, sets: SetInput[]) =>
      request<Routine>('PUT', `/routines/${segment(id)}`, { version, title, sets }),
    startRoutine: (id: string, idempotencyKey: string) =>
      request<WorkoutSnapshot>('POST', `/routines/${segment(id)}/start`, undefined, {
        'Idempotency-Key': idempotencyKey,
      }),
  };
}
