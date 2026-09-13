import { createServer } from 'node:http';
import { createHash, generateKeyPairSync, randomUUID, sign } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { Buffer } from 'node:buffer';
import process from 'node:process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, writeFile, rename, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { testDatabaseEnvironment } from './test-database.ts';
import { createRufitSession } from '../src/api/session.ts';
import { createDraftOutbox } from '../src/api/outbox.ts';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { createRufitApi, ApiError } from '../src/api/client.ts';
import { exerciseCatalog } from '../src/features/exercises/catalog.ts';
import { prepareWorkoutDraft } from '../src/features/workout/draftMapping.ts';
import { createConnectedWorkoutStorage } from '../src/features/workout/connectedStorage.ts';
import { addExercise, addSet, removeSet, startWorkout, updateSet } from '../src/features/workout/model.ts';

const jar = process.env.RUFIT_BACKEND_JAR ?? fileURLToPath(new URL('../../rufit-backend/target/rufit-backend-0.0.1-SNAPSHOT.jar', import.meta.url));
if (!existsSync(jar)) throw new Error('검증된 백엔드 JAR가 필요합니다. 먼저 백엔드에서 mvnw verify를 실행해 주세요.');
const testEnvironment = testDatabaseEnvironment(process.env);
const pair = generateKeyPairSync('rsa', { modulusLength:2048 });
const publicKey = { ...pair.publicKey.export({format:'jwk'}), kid:'client-integration', alg:'RS256', use:'sig' };
let publishedKeys = [publicKey];
let keysUnavailable = false;
const jwks = createServer((_, response) => {
  response.writeHead(keysUnavailable ? 503 : 200, {'Content-Type':'application/json'});
  response.end(JSON.stringify(keysUnavailable ? {error:'test outage'} : {keys:publishedKeys}));
});
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
function token(subject: string, signingPair = pair, kid = 'client-integration') {
  const encoded = [
    {alg:'RS256', typ:'JWT', kid},
    {iss:issuer, sub:subject, aud:'rufit-api', iat:Math.floor(Date.now()/1000), exp:Math.floor(Date.now()/1000)+600},
  ].map(value => Buffer.from(JSON.stringify(value)).toString('base64url')).join('.');
  return `${encoded}.${sign('RSA-SHA256', Buffer.from(encoded), signingPair.privateKey).toString('base64url')}`;
}
const java = process.env.JAVA_HOME ? `${process.env.JAVA_HOME}/bin/java` : 'java';
const backend = spawn(java, ['-jar', jar, `--server.port=${address.port}`, `--spring.datasource.url=${testEnvironment.DB_URL}`, '--spring.datasource.username=rufit_test'], {
  env:{...testEnvironment, SPRING_PROFILES_ACTIVE:'oidc', RUFIT_AUTH_ISSUER:issuer,
    RUFIT_AUTH_JWK_SET_URI:`http://127.0.0.1:${jwksAddress.port}`, RUFIT_AUTH_AUDIENCE:'rufit-api', RUFIT_AUTH_ALLOW_LOCAL_HTTP_JWKS:'true'},
  stdio:['ignore','pipe','pipe'],
});
const outboxDirectory = await mkdtemp(join(tmpdir(), 'rufit-outbox-test-'));
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
  const accountSession = await createRufitSession({baseUrl, getAccessToken:() => token(`alice-${run}`)});
  const otherSession = await createRufitSession({baseUrl, getAccessToken:() => token(`bob-${run}`)});
  const api = accountSession.api;
  const other = otherSession.api;
  assert.equal((await api.me()).id, (await api.me()).id);
  assert.notEqual((await api.me()).id, (await other.me()).id);
  await assert.rejects(api.profile(), (e:unknown) => e instanceof ApiError && e.status === 404);
  const profileKey = randomUUID();
  const profile = await api.createProfile({nickname:'Test athlete',bio:'Test data only',experience:'BEGINNER',goals:['STRENGTH']},profileKey);
  assert.equal(profile.visibility,'PRIVATE');
  const updatedProfile = await api.updateProfile(profile.version,{nickname:'Updated athlete',bio:'',experience:null,goals:[]});
  assert.equal((await api.profile()).nickname,updatedProfile.nickname);
  assert.equal((await api.createProfile({nickname:'Test athlete',bio:'Test data only',experience:'BEGINNER',goals:['STRENGTH']},profileKey)).nickname,'Updated athlete');
  await assert.rejects(other.profile(), (e:unknown) => e instanceof ApiError && e.status === 404);
  const restDefaults = await api.restPreferences();
  assert.deepEqual(restDefaults,{version:0,defaultRestSeconds:90});
  const savedRest = await api.saveRestPreferences(restDefaults.version,180);
  assert.deepEqual(savedRest,{version:1,defaultRestSeconds:180});
  assert.deepEqual(await other.restPreferences(),restDefaults);
  await assert.rejects(api.saveRestPreferences(0,30),(e:unknown) => e instanceof ApiError && e.status === 409);
  assert.deepEqual(await api.restPreferences(),savedRest);
  const sharedCatalog = await api.exercises({size: 100});
  for (const expected of exerciseCatalog) {
    const actual = sharedCatalog.items.find(item => item.id === expected.id);
    assert.ok(actual, `Missing mobile catalog ID: ${expected.id}`);
    assert.deepEqual({name: actual.name, bodyPart: actual.bodyPart, equipment: actual.equipment},
      {name: expected.name, bodyPart: expected.bodyPart, equipment: expected.equipment});
  }
  const filteredSquats = await api.exercises({query: '스쿼트', bodyPart: 'LEGS', equipment: 'DUMBBELL'});
  assert.equal(filteredSquats.totalElements, 1);
  assert.equal(filteredSquats.items[0].id, '00000000-0000-4000-8000-000000000012');
  assert.equal(await api.active(), null);
  const key = randomUUID();
  let workout = await api.start(key);
  assert.equal((await api.start(key)).id, workout.id);
  const rotatedPair = generateKeyPairSync('rsa', {modulusLength:2048});
  const rotatedToken = () => token(`alice-${run}`,rotatedPair,'rotated-client-integration');
  const rotatingApi = createRufitApi({baseUrl,getAccessToken:rotatedToken});
  keysUnavailable = true;
  try {
    await assert.rejects(rotatingApi.updateNote(workout.id,workout.version,'Unverified write'),(e:unknown) =>
      e instanceof ApiError && e.status === 503 && e.code === 'AUTHENTICATION_UNAVAILABLE' && e.outcomeUnknown && e.requestId !== null);
  } finally { keysUnavailable = false; }
  publishedKeys = [publicKey,{...rotatedPair.publicKey.export({format:'jwk'}),kid:'rotated-client-integration',alg:'RS256',use:'sig'}];
  const rotatedSession = await createRufitSession({baseUrl,getAccessToken:rotatedToken});
  assert.deepEqual(rotatedSession.scope,accountSession.scope);
  const afterKeyRecovery = await rotatedSession.api.workout(workout.id);
  assert.equal(afterKeyRecovery.note,'');assert.equal(afterKeyRecovery.version,workout.version);
  workout = await rotatedSession.api.replaceSets(workout.id, workout.version, [{exerciseName:'스쿼트', weight:40.5, reps:10}]);
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
  const resultSummary = await api.workoutSummary(workout.id);
  assert.equal(resultSummary.completedSets,1); assert.equal(resultSummary.volumeKgReps,405);
  assert.equal(resultSummary.exercises[0].exerciseName,'스쿼트');
  assert.equal(await api.active(), null);
  assert.equal((await api.history()).totalElements, 1);
  const recordedDate = workout.startedAt.slice(0,10);
  const daily = await api.dailyHistory(recordedDate, 'UTC');
  assert.equal(daily.totalElements, 1); assert.equal(daily.items[0]?.id, workout.id);
  assert.equal((await other.dailyHistory(recordedDate, 'UTC')).totalElements, 0);
  await assert.rejects(api.dailyHistory('2026-02-29', 'UTC'), (e:unknown) => e instanceof ApiError && e.status === 400 && typeof e.requestId === 'string' && /^[0-9a-f-]{36}$/.test(e.requestId));
  assert.equal((await api.exerciseHistory('스쿼트')).items[0].sets[0].weight, 40.5);
  const month = workout.startedAt.slice(0,7);
  assert.equal((await api.calendar(month, 'UTC')).volumeKgReps, 405);
  const week = await api.weeklyCalendar(recordedDate,'UTC');
  assert.equal(week.days.length,7);assert.equal(week.workouts,1);assert.equal(week.volumeKgReps,405);
  assert.equal(week.days.find(day => day.date===recordedDate)?.workouts,1);
  assert.equal((await other.weeklyCalendar(recordedDate,'UTC')).workouts,0);
  let routine = await api.createRoutine('검증 루틴', [{exerciseName:'스쿼트', weight:30, reps:8}]);
  routine = await api.updateRoutine(routine.id, routine.version, '수정 루틴', [{exerciseName:'스쿼트', weight:35, reps:10}]);
  assert.equal((await api.routine(routine.id)).title, '수정 루틴');
  assert.equal((await api.routines()).length, 1);
  const foundRoutines = await api.searchRoutines('수정',0,1);
  assert.equal(foundRoutines.totalElements,1);assert.equal(foundRoutines.hasNext,false);
  assert.equal(foundRoutines.items[0].id,routine.id);
  assert.equal((await other.searchRoutines('수정')).totalElements,0);
  assert.equal((await api.searchRoutines('%')).totalElements,0);
  const routineStartKey = randomUUID();
  let second = await api.startRoutine(routine.id, routineStartKey);
  assert.equal(second.sourceRoutineId, routine.id);
  second = await api.completeSet(second.id, second.version, 0, true, 60);
  assert.deepEqual((await api.startRoutine(routine.id, routineStartKey)).completedSetIndexes, [0]);
  second = await api.skipRest(second.id, second.version); assert.equal(second.restEndsAt, null);
  second = await api.removeSet(second.id, second.version, 0); assert.equal(second.sets.length, 0);
  second = await api.cancel(second.id, second.version, true); assert.ok(second.cancelledAt);
  assert.equal(await api.active(), null);
  const workoutRoutineKey = randomUUID(); const originalWorkoutVersion = workout.version;
  const fromWorkout = await api.routineFromWorkout(workout.id,workout.version,'Saved from workout',workoutRoutineKey);
  assert.equal(fromWorkout.sourceWorkoutId,workout.id);assert.equal(fromWorkout.sourceRoutineId,null);
  assert.equal(fromWorkout.sets[0].weight,40.5);
  await assert.rejects(other.routineFromWorkout(workout.id,workout.version,'Other owner',randomUUID()), (e:unknown) => e instanceof ApiError && e.status===404);
  workout = await api.correctHistory(workout.id, workout.version, [{exerciseName:'스쿼트', weight:50, reps:10}]);
  assert.equal((await api.calendar(month, 'UTC')).volumeKgReps, 500);
  assert.equal((await api.weeklyCalendar(recordedDate,'UTC')).volumeKgReps,500);
  await api.deleteHistory(workout.id, workout.version, true);
  assert.equal((await api.routineFromWorkout(workout.id,originalWorkoutVersion,'Retry after deletion',workoutRoutineKey)).id,fromWorkout.id);
  const fromRecordedRoutine = await api.startRoutine(fromWorkout.id,randomUUID());
  assert.equal(fromRecordedRoutine.sets[0].weight,40.5);assert.deepEqual(fromRecordedRoutine.completedSetIndexes,[]);
  await api.cancel(fromRecordedRoutine.id,fromRecordedRoutine.version,true);
  assert.equal((await api.history()).totalElements, 0);
  assert.equal((await api.dailyHistory(recordedDate, 'UTC')).totalElements, 0);
  assert.equal((await api.weeklyCalendar(recordedDate,'UTC')).workouts,0);
  await assert.rejects(api.start(key), (e:unknown) => e instanceof ApiError && e.code === 'RESOURCE_DELETED');
  const exerciseKey = randomUUID();
  let exercise = await api.createExercise({name:'검증 운동', bodyPart:'LEGS', equipment:'BARBELL'}, exerciseKey);
  assert.equal((await api.createExercise({name:'검증 운동', bodyPart:'LEGS', equipment:'BARBELL'}, exerciseKey)).id, exercise.id);
  assert.equal((await api.exercises({query:'검증', bodyPart:'LEGS'})).totalElements, 1);
  await assert.rejects(other.exercise(exercise.id), (e:unknown) => e instanceof ApiError && e.status === 404);
  exercise = await api.updateExercise(exercise.id, exercise.version, {name:'수정 운동', bodyPart:'LEGS', equipment:'DUMBBELL'});
  const routineKey = randomUUID();
  const templateSets = [{exerciseId:exercise.id, exerciseName:'client name ignored', weight:20, reps:5}];
  const template = await api.createRoutine('식별자 루틴', templateSets, routineKey);
  assert.equal(template.sets[0].exerciseName, '수정 운동');
  assert.equal((await api.createRoutine('식별자 루틴', templateSets, routineKey)).id, template.id);
  let draftWorkout = await api.startRoutine(template.id, randomUUID());
  const draft = {operationId:randomUUID(), version:draftWorkout.version,
    sets:[{set:templateSets[0], completed:true}], restSetIndex:0, restEndsAt:new Date(Date.now()+60000).toISOString()};
  // Lose the acknowledgement after the real server committed the operation.
  const lostResponse = createRufitApi({baseUrl, getAccessToken:() => token(`alice-${run}`), fetch:async (input, init) => {
    const response = await fetch(input, init); assert.equal(response.status, 200);
    await response.arrayBuffer(); throw new Error('simulated lost acknowledgement');
  }});
  await assert.rejects(lostResponse.saveDraft(draftWorkout.id, draft), (e:unknown) => e instanceof ApiError && e.outcomeUnknown);
  const recovered = await api.saveDraft(draftWorkout.id, draft);
  assert.equal(recovered.replayed, true);
  assert.equal(recovered.appliedVersion, recovered.workout.version);
  assert.equal(recovered.workout.restSetIndex, 0);
  assert.deepEqual(recovered.workout.completedSetIndexes, [0]);
  draftWorkout = await api.finish(draftWorkout.id, recovered.workout.version);
  assert.equal((await api.exerciseHistoryById(exercise.id)).items[0].sets[0].exerciseId, exercise.id);
  const publicExerciseId = '00000000-0000-4000-8000-000000000001';
  const previousSets = await api.previousSets([publicExerciseId,exercise.id,exercise.id]);
  assert.equal(previousSets.items.length,2);assert.equal(previousSets.items[0].record,null);
  assert.equal(previousSets.items[1].record?.workoutId,draftWorkout.id);
  assert.equal(previousSets.items[1].record?.sets[0].weight,20);
  await assert.rejects(other.previousSets([exercise.id]),(e:unknown) => e instanceof ApiError && e.status === 404);
  const replayAfterFinish = await api.saveDraft(draftWorkout.id, draft);
  assert.ok(replayAfterFinish.workout.version > replayAfterFinish.appliedVersion);
  const copyKey = randomUUID();
  const copied = await api.copyRoutine(template.id,template.version,'Copied routine',copyKey);
  assert.equal(copied.sourceRoutineId,template.id);
  assert.equal(copied.sets[0].exerciseId,exercise.id);
  await api.deleteRoutine(template.id, template.version, true);
  assert.equal((await api.copyRoutine(template.id,template.version,'Copied routine',copyKey)).id,copied.id);
  assert.equal((await api.workout(draftWorkout.id)).sourceRoutineId, template.id);
  await assert.rejects(api.createRoutine('식별자 루틴', templateSets, routineKey), (e:unknown) => e instanceof ApiError && e.status === 410);
  exercise = await api.archiveExercise(exercise.id, exercise.version);
  assert.ok(exercise.archivedAt);
  assert.equal((await api.exercises({query:'수정 운동'})).totalElements, 0);
  assert.equal((await api.exercises({query:'수정 운동', includeArchived:true})).totalElements, 1);
  exercise = await api.restoreExercise(exercise.id, exercise.version);
  assert.equal(exercise.archivedAt, null);
  const filename = (key: string) => join(outboxDirectory, createHash('sha256').update(key).digest('hex'));
  const disk = {
    getItem: async (key: string) => { try { return await readFile(filename(key),'utf8'); } catch (e:unknown) {
      if (e && typeof e === 'object' && 'code' in e && e.code === 'ENOENT') return null; throw e;
    } },
    setItem: async (key: string, value: string) => { await writeFile(filename(key)+'.tmp',value); await rename(filename(key)+'.tmp',filename(key)); },
  };
  const verified = await createRufitSession({baseUrl,getAccessToken:() => token(`alice-${run}`)});
  let queuedWorkout = await api.start(randomUUID());
  const queuedDraft = {note:'Kept through lost acknowledgement',operationId:randomUUID(),version:queuedWorkout.version,sets:[{set:templateSets[0],completed:true}],restSetIndex:null,restEndsAt:null};
  const outbox = createDraftOutbox(disk,verified.scope);
  await outbox.enqueue(queuedWorkout.id,queuedDraft);
  const lossySession = await createRufitSession({baseUrl,getAccessToken:() => token(`alice-${run}`),fetch:async (input, init) => {
    const response = await fetch(input,init);
    if (String(input).endsWith('/draft')) { assert.equal(response.status,200); await response.arrayBuffer(); throw new Error('lost ack'); }
    return response;
  }});
  await assert.rejects(outbox.flushOne(lossySession), (e:unknown) => e instanceof ApiError && e.outcomeUnknown);
  lossySession.close();
  const restoredOutbox = createDraftOutbox(disk,verified.scope);
  assert.equal((await restoredOutbox.list())[0].draft.operationId,queuedDraft.operationId);
  const synced = await restoredOutbox.flushOne(verified);
  assert.equal(synced.kind,'saved');
  if (synced.kind !== 'saved') throw new Error('Expected saved outbox');
  queuedWorkout = await api.finish(queuedWorkout.id,synced.workout.version);
  assert.ok(queuedWorkout.finishedAt); assert.equal((await restoredOutbox.list()).length,0);
  assert.equal(queuedWorkout.note,'Kept through lost acknowledgement');
  queuedWorkout = await api.updateNote(queuedWorkout.id,queuedWorkout.version,'Corrected after finish');
  assert.equal((await api.workout(queuedWorkout.id)).note,'Corrected after finish');
  const statistics = await api.exerciseStatisticsById(exercise.id);
  assert.equal(statistics.workouts,2); assert.equal(statistics.completedSets,2);
  assert.equal(statistics.volumeKgReps,200); assert.equal(statistics.heaviestSet?.weight,20);
  assert.equal((await api.exerciseStatisticsByName('not recorded')).heaviestSet,null);
  let removedWorkout = await api.start(randomUUID());
  const removedDraft = {...queuedDraft,operationId:randomUUID(),version:removedWorkout.version};
  await restoredOutbox.enqueue(removedWorkout.id,removedDraft);
  removedWorkout = await api.cancel(removedWorkout.id,removedWorkout.version,true);
  await api.deleteHistory(removedWorkout.id,removedWorkout.version,true);
  const followingWorkout = await api.start(randomUUID());
  await restoredOutbox.enqueue(followingWorkout.id,{...queuedDraft,operationId:randomUUID(),version:followingWorkout.version});
  const removedResult = await restoredOutbox.flushOne(verified);
  assert.equal(removedResult.kind,'conflict');
  if (removedResult.kind !== 'conflict') throw new Error('Expected unavailable draft');
  assert.equal(removedResult.reason,'RESOURCE_UNAVAILABLE');
  const afterDelete = createDraftOutbox(disk,verified.scope);
  assert.equal((await afterDelete.list())[0].draft.operationId,removedDraft.operationId);
  const followingResult = await afterDelete.flushOne(verified);
  assert.equal(followingResult.kind,'saved');
  if (followingResult.kind !== 'saved') throw new Error('Expected following draft to save');
  assert.equal((await afterDelete.list()).length,1);
  assert.equal((await afterDelete.flushOne(verified)).kind,'idle');
  await api.cancel(followingWorkout.id,followingResult.workout.version,true);
  const mappingSession = await createRufitSession({baseUrl,getAccessToken:() => token(`mapping-${run}`)});
  const mappingWorkout = await mappingSession.api.start(randomUUID());
  let form = updateSet(addExercise(startWorkout('local-form',Date.now()),'local-squat','스쿼트',publicExerciseId),
    'local-squat','local-squat-1',{weight:'01.00',reps:'02',completed:true});
  form = updateSet(addSet(form,'local-squat','resting','local-squat-1'),'local-squat','resting',{weight:'2',reps:'3',completed:true});
  form = addSet(form,'local-squat','copy','local-squat-1');
  form = removeSet(form,'local-squat','local-squat-1');
  const restDeadline = new Date(Date.now()+90000).toISOString();
  const prepared = prepareWorkoutDraft(form,{operationId:randomUUID(),version:mappingWorkout.version,
    note:'Mapped form retains note and rest',rest:{exerciseId:'local-squat',setId:'resting',endsAt:restDeadline}});
  assert.equal(prepared.kind,'ready');
  if (prepared.kind !== 'ready') throw new Error('Expected form to be ready');
  assert.deepEqual(prepared.rows,[{exerciseId:'local-squat',setId:'copy'},{exerciseId:'local-squat',setId:'resting'}]);
  assert.equal(prepared.draft.restSetIndex,1);
  const mappingQueue = createDraftOutbox(disk,mappingSession.scope);
  await mappingQueue.enqueue(mappingWorkout.id,prepared.draft);
  form = updateSet(form,'local-squat','copy',{weight:''});
  const blocked = prepareWorkoutDraft(form,{operationId:randomUUID(),version:mappingWorkout.version,note:prepared.draft.note!,rest:null});
  assert.equal(blocked.kind,'blocked');
  assert.equal('draft' in blocked,false);
  const mappedResult = await createDraftOutbox(disk,mappingSession.scope).flushOne(mappingSession);
  assert.equal(mappedResult.kind,'saved');
  if (mappedResult.kind !== 'saved') throw new Error('Expected mapped draft to save');
  const mappedSnapshot = await mappingSession.api.workout(mappingWorkout.id);
  assert.deepEqual(mappedSnapshot.sets,prepared.draft.sets.map(row=>row.set));
  assert.deepEqual(mappedSnapshot.completedSetIndexes,[1]);
  assert.equal(mappedSnapshot.restSetIndex,1);
  assert.equal(Date.parse(mappedSnapshot.restEndsAt!),Date.parse(restDeadline));
  assert.equal(mappedSnapshot.note,prepared.draft.note);
  assert.equal(prepared.source.exercises[0].sets[0].weight,'01.00');
  assert.equal(form.exercises[0].sets[0].weight,'');
  assert.equal((await mappingQueue.list()).length,0);
  await assert.rejects(other.workout(mappingWorkout.id),(e:unknown)=>e instanceof ApiError && e.status===404);
  await mappingSession.api.cancel(mappingWorkout.id,mappedSnapshot.version,true);
  const connectionSession = await createRufitSession({baseUrl,getAccessToken:() => token(`connected-${run}`)});
  const connectionWorkout = await connectionSession.api.start(randomUUID());
  let failReceiptWrite = false;
  let failDiscardWrite = false;
  let failClosedWrite = false;
  const connectedDisk = {...disk,setItem:async(key:string,value:string)=>{
    if (failReceiptWrite && key.startsWith('rufit.connected-workouts') && JSON.parse(value).records[0].pending?.acknowledgedVersion != null) {
      failReceiptWrite=false;throw new Error('test receipt disk failure');
    }
    if (failDiscardWrite && key.startsWith('rufit.draft-outbox') && JSON.parse(value).entries.length===0) {
      failDiscardWrite=false;throw new Error('test discard disk failure');
    }
    if (failClosedWrite && key.startsWith('rufit.connected-workouts') && JSON.parse(value).records[0].closed!=null) {
      failClosedWrite=false;throw new Error('test closed disk failure');
    }
    await disk.setItem(key,value);
  }};
  const connections = createConnectedWorkoutStorage(connectedDisk,connectionSession.scope);
  const linked = await connections.link(connectionSession,connectionWorkout.id);
  let connectedForm = {note:'Original connected note',rest:null,workout:updateSet(
    addExercise(linked.form.workout,'connected-squat','스쿼트',publicExerciseId),'connected-squat','connected-squat-1',{weight:'01.00',reps:'02',completed:true})};
  connectedForm = {...connectedForm,workout:addSet(connectedForm.workout,'connected-squat','connected-copy','connected-squat-1')};
  await connections.edit(connectionWorkout.id,linked.revision,connectedForm);
  const connectedOperation = randomUUID();
  await connections.queueLatest(connectionWorkout.id,connectedOperation);
  let serverSaved!:()=>void; const savedSignal = new Promise<void>(resolve=>{serverSaved=resolve;});
  let releaseReply!:()=>void; const replyGate = new Promise<void>(resolve=>{releaseReply=resolve;});
  const delayedSession = await createRufitSession({baseUrl,getAccessToken:() => token(`connected-${run}`),fetch:async(input,init)=>{
    const response=await fetch(input,init);
    if (String(input).endsWith('/draft')) {assert.equal(response.status,200);serverSaved();await replyGate;}
    return response;
  }});
  const delayedFlush = connections.flush(delayedSession);
  const receiptFailure = assert.rejects(delayedFlush,/test receipt disk failure/);
  await Promise.race([savedSignal, receiptFailure]);
  const duringSave = (await connections.load(connectionWorkout.id))!;
  const newerForm = {...duringSave.form,note:'Typed while response was delayed',workout:updateSet(duringSave.form.workout,'connected-squat','connected-copy',{weight:''})};
  await connections.edit(connectionWorkout.id,duringSave.revision,newerForm);
  failReceiptWrite=true;releaseReply();await receiptFailure;delayedSession.close();
  const restoredConnections=createConnectedWorkoutStorage(connectedDisk,connectionSession.scope);
  assert.equal((await restoredConnections.pending())[0].draft.operationId,connectedOperation);
  assert.equal((await restoredConnections.load(connectionWorkout.id))!.form.workout.exercises[0].sets[1].weight,'');
  const receiptResult=await restoredConnections.flush(connectionSession);
  assert.equal(receiptResult.kind,'saved');
  const restoredForm=(await restoredConnections.load(connectionWorkout.id))!;
  assert.equal(restoredForm.confirmedRevision,1);assert.equal(restoredForm.revision,2);
  assert.equal(restoredForm.lastReceipt?.operationId,connectedOperation);
  assert.equal(restoredForm.pending,null);assert.equal((await restoredConnections.pending()).length,0);
  assert.equal(restoredForm.form.note,newerForm.note);assert.equal(restoredForm.form.workout.exercises[0].sets[0].weight,'01.00');
  assert.equal(restoredForm.form.workout.exercises[0].sets[1].weight,'');
  const confirmedRemote=await connectionSession.api.workout(connectionWorkout.id);
  assert.equal(confirmedRemote.version,1);assert.equal(confirmedRemote.note,'Original connected note');
  assert.equal(confirmedRemote.sets[1].weight,1);
  assert.equal(await createConnectedWorkoutStorage(connectedDisk,otherSession.scope).load(connectionWorkout.id),null);
  await assert.rejects(restoredConnections.flush(otherSession),(e:unknown)=>e instanceof ApiError && e.code==='ACCOUNT_CHANGED');
  const completedForm={...restoredForm.form,workout:updateSet(restoredForm.form.workout,'connected-squat','connected-copy',{weight:'3'})};
  await restoredConnections.edit(connectionWorkout.id,restoredForm.revision,completedForm);
  await restoredConnections.queueLatest(connectionWorkout.id,randomUUID());await restoredConnections.flush(connectionSession);
  const latestConnected=await connectionSession.api.workout(connectionWorkout.id);
  assert.equal(latestConnected.version,2);assert.equal(latestConnected.sets[1].weight,3);assert.equal(latestConnected.note,newerForm.note);
  // A second device changes the same draft; resolution persists before removing the rejected request.
  const beforeConflict=(await restoredConnections.load(connectionWorkout.id))!;
  const conflictingForm={...beforeConflict.form,note:'Local choice survives an interrupted discard'};
  const conflictingEdit=await restoredConnections.edit(connectionWorkout.id,beforeConflict.revision,conflictingForm);
  const conflictingOperation=randomUUID();await restoredConnections.queueLatest(connectionWorkout.id,conflictingOperation);
  const remoteEdit=await connectionSession.api.saveDraft(connectionWorkout.id,{operationId:randomUUID(),version:latestConnected.version,
    note:'Changed on another device',sets:latestConnected.sets.map((set,i)=>({set,completed:latestConnected.completedSetIndexes.includes(i)})),restEndsAt:null,restSetIndex:null});
  assert.equal((await restoredConnections.flush(connectionSession)).kind,'conflict');
  const comparison=await restoredConnections.review(connectionSession,connectionWorkout.id);
  assert.equal(comparison.remote.note,'Changed on another device');assert.equal(comparison.local.form.note,conflictingForm.note);
  failDiscardWrite=true;
  await assert.rejects(restoredConnections.resolve(connectionSession,connectionWorkout.id,{operationId:conflictingOperation,expectedRevision:conflictingEdit.revision,
    remoteVersion:remoteEdit.workout.version,choice:'keep-local',confirmed:true}),/test discard disk failure/);
  const afterDecision=createConnectedWorkoutStorage(connectedDisk,connectionSession.scope);await afterDecision.recover();
  const resolved=(await afterDecision.load(connectionWorkout.id))!;
  assert.equal(resolved.pending,null);assert.equal((await afterDecision.pending()).length,0);
  assert.equal(resolved.backups![0].record.pending!.draft.operationId,conflictingOperation);
  assert.equal(resolved.form.workout.exercises[0].sets[0].weight,'01.00');
  await assert.rejects(afterDecision.queueLatest(connectionWorkout.id,conflictingOperation),/새 작업/);
  await afterDecision.queueLatest(connectionWorkout.id,randomUUID());await afterDecision.flush(connectionSession);
  assert.equal((await connectionSession.api.workout(connectionWorkout.id)).note,conflictingForm.note);
  // Persisted close intent recovers from a successful server finish followed by a local disk failure.
  const toFinish=(await afterDecision.load(connectionWorkout.id))!;failClosedWrite=true;
  await assert.rejects(afterDecision.close(connectionSession,connectionWorkout.id,toFinish.revision,{action:'finish',confirmed:true,discardIncomplete:true}),/test closed disk failure/);
  const serverFinished=await connectionSession.api.workout(connectionWorkout.id);assert.ok(serverFinished.finishedAt);assert.equal(serverFinished.sets.length,1);
  const afterFinish=createConnectedWorkoutStorage(connectedDisk,connectionSession.scope);
  assert.ok((await afterFinish.load(connectionWorkout.id))!.closing);
  assert.equal((await afterFinish.overview()).records[0].state,'closing');
  const closeCheck=await afterFinish.recheck(connectionSession,connectionWorkout.id);
  assert.equal(closeCheck.remote.kind,'closed');assert.equal(closeCheck.nextAction,'resume-close');assert.equal(closeCheck.canEdit,false);
  assert.equal((await afterFinish.resumeClose(connectionSession,connectionWorkout.id)).kind,'closed');
  const closed=(await afterFinish.load(connectionWorkout.id))!;
  assert.equal(closed.closed!.version,serverFinished.version);assert.equal(closed.form.workout.exercises[0].sets.length,2);
  await assert.rejects(afterFinish.edit(connectionWorkout.id,closed.revision,closed.form),/종료된 운동/);
  await assert.rejects(afterFinish.queueLatest(connectionWorkout.id,randomUUID()),/종료된 운동/);
  await connectionSession.api.deleteHistory(connectionWorkout.id,serverFinished.version,true);
  const unavailable=await afterFinish.recheck(connectionSession,connectionWorkout.id);
  assert.equal(unavailable.remote.kind,'unavailable');assert.equal(unavailable.state,'closed');
  assert.equal(unavailable.record.form.workout.exercises[0].sets.length,2);
  // A lost cancellation response also recovers by reading the server, without repeating the POST.
  const toCancel=await connectionSession.api.start(randomUUID());await afterFinish.link(connectionSession,toCancel.id);
  let cancelPosts=0;
  const lostCancelSession=await createRufitSession({baseUrl,getAccessToken:()=>token(`connected-${run}`),fetch:async(input,init)=>{
    const response=await fetch(input,init);
    if (String(input).endsWith('/cancel')) {cancelPosts++;assert.equal(response.status,200);throw new Error('test lost cancellation response');}
    return response;
  }});
  await assert.rejects(afterFinish.close(lostCancelSession,toCancel.id,0,{action:'cancel',confirmed:true,discardIncomplete:false}),
    (e:unknown)=>e instanceof ApiError && e.code==='NETWORK_ERROR' && e.outcomeUnknown);
  const afterCancel=createConnectedWorkoutStorage(connectedDisk,connectionSession.scope);
  assert.equal((await afterCancel.resumeClose(lostCancelSession,toCancel.id)).kind,'closed');assert.equal(cancelPosts,1);
  assert.ok((await afterCancel.load(toCancel.id))!.closed!.cancelledAt);lostCancelSession.close();
  // Recheck another-device edits without issuing writes or dropping locally typed strings.
  const reviewWorkout=await connectionSession.api.start(randomUUID());
  const reviewLinked=await afterCancel.link(connectionSession,reviewWorkout.id);
  await afterCancel.edit(reviewWorkout.id,0,{...reviewLinked.form,note:'Unsaved local review note'});
  const reviewedRemote=await connectionSession.api.saveDraft(reviewWorkout.id,{operationId:randomUUID(),version:0,
    note:'Another device note',sets:[],restSetIndex:null,restEndsAt:null});
  const recoveredOverview=createConnectedWorkoutStorage(connectedDisk,connectionSession.scope);
  const remoteCheck=await recoveredOverview.recheck(connectionSession,reviewWorkout.id);
  assert.equal(remoteCheck.state,'remote-changed');assert.equal(remoteCheck.canEdit,false);
  assert.equal(remoteCheck.record.form.note,'Unsaved local review note');assert.equal(remoteCheck.record.version,0);
  assert.equal((await connectionSession.api.workout(reviewWorkout.id)).version,reviewedRemote.workout.version);
  await recoveredOverview.resolve(connectionSession,reviewWorkout.id,{operationId:null,expectedRevision:1,
    remoteVersion:reviewedRemote.workout.version,choice:'use-server',confirmed:true});
  const accepted=(await recoveredOverview.load(reviewWorkout.id))!;
  assert.equal(accepted.form.note,'Another device note');assert.equal(accepted.backups![0].record.form.note,'Unsaved local review note');
  assert.equal((await recoveredOverview.overview()).records.find(r=>r.record.remoteId===reviewWorkout.id)!.state,'synced');
  await assert.rejects(recoveredOverview.recheck(otherSession,reviewWorkout.id),(e:unknown)=>e instanceof ApiError && e.code==='ACCOUNT_CHANGED');
  await recoveredOverview.close(connectionSession,reviewWorkout.id,accepted.revision,{action:'cancel',confirmed:true,discardIncomplete:false});
  connectionSession.close();
  mappingSession.close();
  verified.close(); accountSession.close(); otherSession.close();
  console.log('PASS: typed client → signed OIDC → PostgreSQL, workouts/routines/history/calendar/rest/recovery/ownership/conflicts/catalog/account/atomic-save/lost-acknowledgement/durable-outbox/local-form-mapping/account-form-recovery/conflict-choice/close-recovery/account-recovery-overview');
} catch (error) {
  const diagnostics = logs.split('\n').filter(line => /ERROR|Caused by:/.test(line)).slice(-8).join('\n');
  if (diagnostics) console.error(diagnostics);
  throw error;
} finally {
  await rm(outboxDirectory,{recursive:true,force:true});
  if (backend.exitCode === null) { backend.kill('SIGTERM'); await once(backend, 'exit'); }
  await new Promise<void>(resolve => jwks.close(() => resolve()));
}
