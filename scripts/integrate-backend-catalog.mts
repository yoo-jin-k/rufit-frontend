import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { createAuthApi } from '../src/features/auth/authApi.ts';
import { AuthCoordinator } from '../src/features/auth/authCoordinator.ts';
import type { SessionStore } from '../src/features/auth/secureSessionStore.ts';
import type { StoredSession } from '../src/features/auth/types.ts';
import { exerciseCatalog } from '../src/features/exercises/catalog.ts';

const baseUrl = process.env.RUFIT_AUTH_INTEGRATION_URL ?? 'http://127.0.0.1:8096';
const root = new URL(baseUrl);
if (
  root.protocol !== 'http:' ||
  !['127.0.0.1', 'localhost', '[::1]'].includes(root.hostname) ||
  root.username ||
  root.password
)
  throw new Error('통합 시험은 loopback HTTP 서버만 사용할 수 있습니다.');

function memoryStore(): SessionStore & { value: StoredSession | null } {
  return {
    value: null,
    async save(value) {
      this.value = value;
    },
    async clear() {
      this.value = null;
    },
    async hasSavedSession() {
      return this.value !== null;
    },
  };
}
async function createPkce() {
  const verifier = randomBytes(32).toString('base64url');
  return { verifier, challenge: createHash('sha256').update(verifier).digest('base64url') };
}
const browser = {
  open: async (authorizationUrl: string) => {
    let current = new URL(authorizationUrl);
    current.searchParams.set('fixtureUser', 'alice');
    for (let redirects = 0; redirects < 4; redirects++) {
      if (current.protocol === 'rufit:')
        return { type: 'success' as const, url: current.toString() };
      if (current.origin !== root.origin) throw new Error('fixture 서버 밖으로 이동하지 않습니다.');
      const response = await fetch(current, {
        method: 'GET',
        redirect: 'manual',
        credentials: 'omit',
      });
      if (![301, 302, 303, 307, 308].includes(response.status))
        throw new Error('fake 공급자 redirect 응답을 확인하지 못했습니다.');
      const location = response.headers.get('Location');
      if (!location) throw new Error('fake 공급자 redirect 위치가 없습니다.');
      current = new URL(location, current);
    }
    throw new Error('fake 공급자 redirect 횟수가 너무 많습니다.');
  },
};

const coordinator = new AuthCoordinator({
  api: createAuthApi({ baseUrl, fetch, allowInsecureHttp: true }),
  fetch,
  store: memoryStore(),
  createPkce,
  browser,
  logoutWaitMs: 1000,
});
let createdWorkoutId: string | null = null;

try {
  const health = await fetch(new URL('/actuator/health', root), {
    redirect: 'error',
    credentials: 'omit',
  });
  assert.equal(health.status, 200);
  await coordinator.login('GOOGLE', 'IOS', 'rufit://auth/callback');
  assert.equal(coordinator.getState().kind, 'signed-in');
  const session = coordinator.getSession();
  if (!session) throw new Error('새 로그인 세션을 확인하지 못했습니다.');
  const api = session.api;

  const first = await api.exercises({ page: 0, size: 100 });
  const second = await api.exercises({ page: 1, size: 100 });
  assert.deepEqual(
    { total: first.totalElements, size: first.size, hasNext: first.hasNext },
    { total: 110, size: 100, hasNext: true },
  );
  assert.deepEqual(
    { total: second.totalElements, page: second.page, hasNext: second.hasNext },
    { total: 110, page: 1, hasNext: false },
  );
  const remote = [...first.items, ...second.items];
  assert.equal(remote.length, 110);
  assert.equal(new Set(remote.map((item) => item.id)).size, 110);
  const comparable = (
    items: ReadonlyArray<{
      id: string;
      name: string;
      bodyPart: string;
      equipment: string;
      recommendedRestSeconds?: number | null;
    }>,
  ) =>
    items
      .map(({ id, name, bodyPart, equipment, recommendedRestSeconds }) => ({
        id,
        name,
        bodyPart,
        equipment,
        recommendedRestSeconds,
      }))
      .sort((left, right) => left.id.localeCompare(right.id));
  assert.deepEqual(comparable(remote), comparable(exerciseCatalog));

  const alias = await api.exercises({
    query: 'kettlebell swing',
    bodyPart: 'FULL_BODY',
    equipment: 'OTHER',
  });
  assert.equal(alias.totalElements, 1);
  assert.equal(alias.items[0].name, '케틀벨 스윙');
  const normalized = await api.exercises({
    query: 'ＤＵＭＢＢＥＬＬ＿ＦＬＹ',
    bodyPart: 'CHEST',
    equipment: 'DUMBBELL',
  });
  assert.equal(normalized.totalElements, 1);
  assert.equal(normalized.items[0].name, '덤벨 플라이');

  const newExercise = exerciseCatalog.find(
    (item) => item.id === '4e043528-5b74-5bd1-bb8f-e6dcceb15fbb',
  );
  assert.ok(newExercise);
  assert.equal(newExercise.recommendedRestSeconds, null);
  const rest = await api.exerciseRest(newExercise.id);
  assert.deepEqual(
    {
      recommended: rest.recommendedRestSeconds,
      effective: rest.effectiveRestSeconds,
      source: rest.source,
    },
    { recommended: null, effective: 90, source: 'DEFAULT' },
  );

  let workout = await api.start(randomUUID());
  createdWorkoutId = workout.id;
  workout = await api.replaceSets(workout.id, workout.version, [
    {
      exerciseId: newExercise.id,
      exerciseName: '클라이언트 표기는 서버 ID로 확인',
      weight: 10,
      reps: 5,
    },
  ]);
  workout = await api.completeSet(workout.id, workout.version, 0, true);
  workout = await api.finish(workout.id, workout.version);
  const recorded = await api.exerciseHistoryById(newExercise.id, 0, 10);
  assert.equal(recorded.items[0].workoutId, workout.id);
  assert.equal(recorded.items[0].sets[0].exerciseId, newExercise.id);
  assert.equal(recorded.items[0].sets[0].exerciseName, newExercise.name);
  await api.deleteHistory(workout.id, workout.version, true);
  createdWorkoutId = null;

  console.log(
    'PASS: 새 FE 로그인 + 실제 API 100+10 페이지·원본110·별칭/복합필터·null휴식·신규운동 기록 재조회. 비밀값 출력 없음.',
  );
} finally {
  const session = coordinator.getSession();
  if (session && createdWorkoutId) {
    try {
      const workout = await session.api.workout(createdWorkoutId);
      if (workout.finishedAt) await session.api.deleteHistory(workout.id, workout.version, true);
      else if (!workout.cancelledAt) await session.api.cancel(workout.id, workout.version, true);
    } catch {
      /* 이 시험이 만든 기록만 best-effort로 정리한다. */
    }
  }
  if (coordinator.getSession()) await coordinator.logout().catch(() => {});
}
