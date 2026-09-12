import { createServer } from 'node:http';
import { generateKeyPairSync, randomUUID, sign } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { Buffer } from 'node:buffer';
import process from 'node:process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { createRufitApi, ApiError } from '../src/api/client.ts';

const jar = process.env.RUFIT_BACKEND_JAR ?? fileURLToPath(new URL('../../rufit-backend/target/rufit-backend-0.0.1-SNAPSHOT.jar', import.meta.url));
if (!existsSync(jar)) throw new Error('검증된 백엔드 JAR가 필요합니다. 먼저 백엔드에서 mvnw verify를 실행해 주세요.');
if (!process.env.DB_URL || !process.env.DB_USERNAME || !process.env.DB_PASSWORD) throw new Error('전용 테스트 DB 환경변수가 필요합니다.');
const pair = generateKeyPairSync('rsa', { modulusLength:2048 });
const publicKey = { ...pair.publicKey.export({format:'jwk'}), kid:'client-integration', alg:'RS256', use:'sig' };
const jwks = createServer((_, response) => { response.writeHead(200, {'Content-Type':'application/json'}); response.end(JSON.stringify({keys:[publicKey]})); });
jwks.listen(0, '127.0.0.1'); await once(jwks, 'listening');
const jwksAddress = jwks.address();
if (!jwksAddress || typeof jwksAddress === 'string') throw new Error('JWKS address unavailable');
const probe = createServer(); probe.listen(0, '127.0.0.1'); await once(probe, 'listening');
const address = probe.address();
if (!address || typeof address === 'string') throw new Error('API address unavailable');
await new Promise<void>(resolve => probe.close(() => resolve()));
const baseUrl = `http://127.0.0.1:${address.port}`;
const issuer = 'https://client-test.rufit.test';
const run = randomUUID();
function token(subject: string) {
  const encoded = [
    {alg:'RS256', typ:'JWT', kid:'client-integration'},
    {iss:issuer, sub:subject, aud:'rufit-api', iat:Math.floor(Date.now()/1000), exp:Math.floor(Date.now()/1000)+600},
  ].map(value => Buffer.from(JSON.stringify(value)).toString('base64url')).join('.');
  return `${encoded}.${sign('RSA-SHA256', Buffer.from(encoded), pair.privateKey).toString('base64url')}`;
}
const java = process.env.JAVA_HOME ? `${process.env.JAVA_HOME}/bin/java` : 'java';
const backend = spawn(java, ['-jar', jar, `--server.port=${address.port}`], {
  env:{...process.env, SPRING_PROFILES_ACTIVE:'oidc', RUFIT_AUTH_ISSUER:issuer,
    RUFIT_AUTH_JWK_SET_URI:`http://127.0.0.1:${jwksAddress.port}`, RUFIT_AUTH_AUDIENCE:'rufit-api'},
  stdio:['ignore','pipe','pipe'],
});
let logs = '';
backend.stdout.on('data', chunk => { logs = (logs+chunk).slice(-12000); });
backend.stderr.on('data', chunk => { logs = (logs+chunk).slice(-12000); });
try {
  let ready = false;
  for (let i=0; i<120; i++) {
    if (backend.exitCode !== null) throw new Error(`백엔드 시작 실패 (${backend.exitCode})`);
    try { if ((await fetch(`${baseUrl}/actuator/health`)).ok) { ready = true; break; } } catch { /* wait for startup */ }
    await delay(250);
  }
  if (!ready) throw new Error('백엔드 시작 대기 시간 초과');
  const api = createRufitApi({baseUrl, getAccessToken:() => token(`alice-${run}`)});
  const other = createRufitApi({baseUrl, getAccessToken:() => token(`bob-${run}`)});
  assert.equal(await api.active(), null);
  const key = randomUUID();
  let workout = await api.start(key);
  assert.equal((await api.start(key)).id, workout.id);
  workout = await api.replaceSets(workout.id, workout.version, [{exerciseName:'스쿼트', weight:40.5, reps:10}]);
  workout = await api.completeSet(workout.id, workout.version, 0, true, 90);
  assert.ok(workout.restEndsAt);
  workout = await api.appendSet(workout.id, workout.version, {exerciseName:'푸시업', weight:0, reps:8});
  const staleVersion = workout.version;
  workout = await api.editSet(workout.id, workout.version, 1, {exerciseName:'푸시업', weight:0, reps:12});
  await assert.rejects(api.removeSet(workout.id, staleVersion, 0), (e:unknown) => e instanceof ApiError && e.status === 409);
  assert.deepEqual((await api.active())?.completedSetIndexes, [0]);
  await assert.rejects(other.workout(workout.id), (e:unknown) => e instanceof ApiError && e.status === 404);
  await assert.rejects(api.finish(workout.id, workout.version), (e:unknown) => e instanceof ApiError && e.code === 'INCOMPLETE_SETS_CONFIRMATION_REQUIRED');
  workout = await api.finish(workout.id, workout.version, true);
  assert.equal(workout.sets.length, 1); assert.ok(workout.finishedAt);
  assert.equal(await api.active(), null);
  assert.equal((await api.history()).totalElements, 1);
  assert.equal((await api.exerciseHistory('스쿼트')).items[0].sets[0].weight, 40.5);
  const month = workout.startedAt.slice(0,7);
  assert.equal((await api.calendar(month, 'UTC')).volumeKgReps, 405);
  let routine = await api.createRoutine('검증 루틴', [{exerciseName:'스쿼트', weight:30, reps:8}]);
  routine = await api.updateRoutine(routine.id, routine.version, '수정 루틴', [{exerciseName:'스쿼트', weight:35, reps:10}]);
  assert.equal((await api.routine(routine.id)).title, '수정 루틴');
  assert.equal((await api.routines()).length, 1);
  const routineStartKey = randomUUID();
  let second = await api.startRoutine(routine.id, routineStartKey);
  assert.equal(second.sourceRoutineId, routine.id);
  second = await api.completeSet(second.id, second.version, 0, true, 60);
  assert.deepEqual((await api.startRoutine(routine.id, routineStartKey)).completedSetIndexes, [0]);
  second = await api.skipRest(second.id, second.version); assert.equal(second.restEndsAt, null);
  second = await api.removeSet(second.id, second.version, 0); assert.equal(second.sets.length, 0);
  second = await api.cancel(second.id, second.version, true); assert.ok(second.cancelledAt);
  assert.equal(await api.active(), null);
  workout = await api.correctHistory(workout.id, workout.version, [{exerciseName:'스쿼트', weight:50, reps:10}]);
  assert.equal((await api.calendar(month, 'UTC')).volumeKgReps, 500);
  await api.deleteHistory(workout.id, workout.version, true);
  assert.equal((await api.history()).totalElements, 0);
  await assert.rejects(api.start(key), (e:unknown) => e instanceof ApiError && e.code === 'RESOURCE_DELETED');
  console.log('PASS: typed client → signed OIDC → PostgreSQL, workouts/routines/history/calendar/rest/recovery/ownership/conflicts');
} catch (error) {
  const diagnostics = logs.split('\n').filter(line => /ERROR|Caused by:/.test(line)).slice(-8).join('\n');
  if (diagnostics) console.error(diagnostics);
  throw error;
} finally {
  if (backend.exitCode === null) { backend.kill('SIGTERM'); await once(backend, 'exit'); }
  await new Promise<void>(resolve => jwks.close(() => resolve()));
}
