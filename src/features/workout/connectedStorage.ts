import { ApiError, type WorkoutSnapshot } from '../../api/client.ts';
import { createDraftOutbox, MAX_PENDING_DRAFTS, type DraftReceipt, type OutboxStorage } from '../../api/outbox.ts';
import type { AccountScope, RufitSession } from '../../api/session.ts';
import { prepareWorkoutDraft, type DraftPreparation, type RestTarget } from './draftMapping.ts';
import { isWorkout } from './storage.ts';
import type { Workout } from './model.ts';

export type ConnectedForm = { workout: Workout; note: string; rest: RestTarget | null };
type Ready = Extract<DraftPreparation, {kind: 'ready'}>;
type RecordCore = {
  remoteId: string; version: number; revision: number; confirmedRevision: number;
  form: ConnectedForm;
  pending: { revision: number; form: ConnectedForm; draft: Ready['draft']; acknowledgedVersion: number | null } | null;
  lastReceipt: DraftReceipt | null;
};
type CloseIntent = { action: 'finish' | 'cancel'; version: number; revision: number; discardIncomplete: boolean };
type ResolutionChoice = 'keep-local' | 'use-server' | 'archive';
type Resolution = { operationId: string | null; revision: number; remote: WorkoutSnapshot; choice: ResolutionChoice };
export type ConflictDecision = { operationId: string | null; expectedRevision: number; remoteVersion: number; choice: ResolutionChoice; confirmed: true };
export type ConnectedRecord = RecordCore & {
  resolution?: Resolution | null;
  closing?: CloseIntent | null;
  closed?: WorkoutSnapshot | null;
  backups?: { record: RecordCore; closing: CloseIntent | null; choice: ResolutionChoice; remote: WorkoutSnapshot }[];
};
type Archive = { schemaVersion: 2; scope: AccountScope; records: ConnectedRecord[] };
const locks = new WeakMap<OutboxStorage, Map<string, Promise<unknown>>>();
const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const integer = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(v);
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const sorted = (v: unknown): unknown => Array.isArray(v) ? v.map(sorted) : object(v) ? Object.fromEntries(Object.keys(v).sort().map(k => [k, sorted(v[k])])) : v;
const same = (a: unknown, b: unknown) => JSON.stringify(sorted(a)) === JSON.stringify(sorted(b));
const scopeMatches = (a: AccountScope, b: AccountScope) => a.server === b.server && a.accountId === b.accountId;
function serial<T>(storage: OutboxStorage, key: string, fn: () => Promise<T>): Promise<T> {
  let map = locks.get(storage); if (!map) { map = new Map(); locks.set(storage, map); }
  const next = (map.get(key) ?? Promise.resolve()).catch(() => {}).then(fn);
  map.set(key, next); return next;
}
function validForm(v: unknown): v is ConnectedForm {
  if (!object(v) || !isWorkout(v.workout) || !v.workout.id.trim()) return false;
  const result = prepareWorkoutDraft(v.workout, {operationId:'00000000-0000-4000-8000-000000000000',version:0,note:v.note as string,rest:v.rest as RestTarget | null});
  return result.kind === 'ready' || result.issues.every(i => i.code === 'SET_INPUT' || i.code === 'REST_TARGET');
}
function hydrate(snapshot: WorkoutSnapshot): ConnectedForm {
  if (!object(snapshot) || !uuid(snapshot.id) || !integer(snapshot.version) || typeof snapshot.startedAt !== 'string' || !Number.isFinite(Date.parse(snapshot.startedAt)) ||
    snapshot.finishedAt !== null || snapshot.cancelledAt !== null || typeof snapshot.note !== 'string' || !Array.isArray(snapshot.sets) || !Array.isArray(snapshot.completedSetIndexes))
    throw new Error('진행 중인 서버 운동을 확인하지 못했습니다.');
  const completed = new Set(snapshot.completedSetIndexes);
  if (completed.size !== snapshot.completedSetIndexes.length || [...completed].some(i => !integer(i) || i >= snapshot.sets.length)) throw new Error('서버 완료 상태를 확인하지 못했습니다.');
  const workout: Workout = {id:`server:${snapshot.id}`,startedAt:Date.parse(snapshot.startedAt),exercises:[]};
  const rows: {exerciseId:string;setId:string}[] = [];
  snapshot.sets.forEach((set, i) => {
    if (!object(set) || typeof set.exerciseName !== 'string' || (set.exerciseId != null && !uuid(set.exerciseId)) ||
      typeof set.weight !== 'number' || !Number.isFinite(set.weight) || !Number.isInteger(set.reps)) throw new Error('서버 세트 값을 확인하지 못했습니다.');
    let exercise = workout.exercises.at(-1);
    if (!exercise || exercise.catalogId !== (set.exerciseId ?? undefined) || exercise.name !== set.exerciseName) {
      exercise = {id:`${snapshot.id}:exercise:${i}`,name:set.exerciseName,...(set.exerciseId ? {catalogId:set.exerciseId} : {}),sets:[]};
      workout.exercises.push(exercise);
    }
    const id = `${snapshot.id}:set:${i}`;
    exercise.sets.push({id,weight:String(set.weight),reps:String(set.reps),completed:completed.has(i)});
    rows.push({exerciseId:exercise.id,setId:id});
  });
  let rest: RestTarget | null = null;
  if (snapshot.restSetIndex !== null || snapshot.restEndsAt !== null) {
    if (!integer(snapshot.restSetIndex) || !rows[snapshot.restSetIndex] || !completed.has(snapshot.restSetIndex) || typeof snapshot.restEndsAt !== 'string') throw new Error('서버 휴식 상태를 확인하지 못했습니다.');
    rest = {...rows[snapshot.restSetIndex],endsAt:snapshot.restEndsAt};
  }
  const form = {workout,note:snapshot.note,rest};
  const prepared = prepareWorkoutDraft(workout,{operationId:'00000000-0000-4000-8000-000000000000',version:snapshot.version,note:form.note,rest});
  if (prepared.kind !== 'ready') throw new Error('서버 기록을 편집 폼으로 읽지 못했습니다.');
  return form;
}
function receiptMatches(receipt: DraftReceipt, record: ConnectedRecord): boolean {
  const pending = record.pending;
  if (!pending || receipt.workoutId !== record.remoteId || receipt.operationId !== pending.draft.operationId ||
    !integer(receipt.appliedVersion) || receipt.appliedVersion <= pending.draft.version || receipt.workout.id !== record.remoteId || receipt.workout.version !== receipt.appliedVersion) return false;
  hydrate(receipt.workout);
  const expected = pending.draft;
  const actual = receipt.workout;
  return actual.note === expected.note && actual.sets.length === expected.sets.length && actual.sets.every((set, i) => {
    const e = expected.sets[i].set;
    return (set.exerciseId ?? null) === (e.exerciseId ?? null) && (e.exerciseId != null || set.exerciseName === e.exerciseName) && set.weight === e.weight && set.reps === e.reps;
  }) && same(actual.completedSetIndexes, expected.sets.flatMap((s,i) => s.completed ? [i] : [])) &&
    // An expired rest can be cleared by the server; a surviving timer must keep its target/deadline.
    (actual.restEndsAt === null && actual.restSetIndex === null || actual.restSetIndex === expected.restSetIndex && expected.restEndsAt !== null && Date.parse(actual.restEndsAt!) === Date.parse(expected.restEndsAt));
}
function validCore(value: unknown): value is RecordCore {
  if (!object(value) || !uuid(value.remoteId) || !integer(value.version) || !integer(value.revision) || !integer(value.confirmedRevision) ||
    value.confirmedRevision > value.revision || !validForm(value.form) || value.form.workout.id !== `server:${value.remoteId}`) return false;
  if (value.lastReceipt !== null) {
    if (!object(value.lastReceipt) || !uuid(value.lastReceipt.operationId) || value.lastReceipt.workoutId !== value.remoteId || value.lastReceipt.appliedVersion !== value.version || !object(value.lastReceipt.workout)) return false;
    const snapshot = value.lastReceipt.workout as WorkoutSnapshot;
    hydrate(snapshot);
    if (snapshot.id !== value.remoteId || snapshot.version !== value.version) return false;
  }
  if (value.pending === null) return true;
  const p = value.pending;
  if (!object(p) || !integer(p.revision) || p.revision > value.revision || !validForm(p.form) || p.form.workout.id !== value.form.workout.id ||
    p.form.workout.startedAt !== value.form.workout.startedAt || !object(p.draft)) return false;
  const ready = prepareWorkoutDraft(p.form.workout,{operationId:p.draft.operationId as string,version:p.draft.version as number,note:p.form.note,rest:p.form.rest});
  if (ready.kind !== 'ready' || !same(ready.draft,p.draft)) return false;
  if (p.acknowledgedVersion === null) return p.draft.version === value.version && p.revision > value.confirmedRevision;
  return integer(p.acknowledgedVersion) && p.acknowledgedVersion === value.version && p.revision === value.confirmedRevision &&
    object(value.lastReceipt) && receiptMatches(value.lastReceipt as DraftReceipt,value as unknown as ConnectedRecord);
}

function validateSnapshot(snapshot: WorkoutSnapshot): boolean {
  if (!object(snapshot)) throw new Error('서버 운동 응답을 확인하지 못했습니다.');
  const closed = snapshot.finishedAt !== null || snapshot.cancelledAt !== null;
  hydrate({...snapshot,finishedAt:null,cancelledAt:null});
  if (closed) {
    const end = snapshot.finishedAt ?? snapshot.cancelledAt;
    if (snapshot.finishedAt !== null && snapshot.cancelledAt !== null || typeof end !== 'string' || !Number.isFinite(Date.parse(end)) ||
      Date.parse(end) < Date.parse(snapshot.startedAt) || snapshot.restEndsAt !== null || snapshot.restSetIndex !== null ||
      snapshot.finishedAt !== null && (snapshot.sets.length === 0 || snapshot.completedSetIndexes.length !== snapshot.sets.length))
      throw new Error('종료된 운동 상태를 확인하지 못했습니다.');
  }
  return closed;
}
function validClose(value: unknown, record: RecordCore): value is CloseIntent {
  return object(value) && ['finish','cancel'].includes(value.action as string) && value.version === record.version && value.revision === record.revision &&
    typeof value.discardIncomplete === 'boolean' && record.pending === null && record.revision === record.confirmedRevision;
}
function validRecord(value: unknown): value is ConnectedRecord {
  if (!validCore(value)) return false;
  const record = value as ConnectedRecord;
  if (record.closed != null && (!validateSnapshot(record.closed) || record.closed.id !== record.remoteId || record.closed.version !== record.version || record.pending !== null || record.closing != null || record.resolution != null)) return false;
  if (record.closing != null && !validClose(record.closing,record)) return false;
  if (record.resolution != null) {
    const r = record.resolution;
    if (!object(r) || r.revision !== record.revision || !object(r.remote) || r.remote.id !== record.remoteId || r.remote.version < record.version ||
      !['keep-local','use-server','archive'].includes(r.choice) || validateSnapshot(r.remote) !== (r.choice === 'archive') ||
      (r.operationId === null ? record.pending !== null : !uuid(r.operationId) || r.operationId !== record.pending?.draft.operationId)) return false;
  }
  if (record.backups !== undefined && (!Array.isArray(record.backups) || !record.backups.every(b => object(b) && validCore(b.record) &&
    b.record.remoteId === record.remoteId && (b.closing === null || validClose(b.closing,b.record)) &&
    ['keep-local','use-server','archive'].includes(b.choice) && object(b.remote) && b.remote.id === record.remoteId &&
    b.remote.version >= b.record.version && validateSnapshot(b.remote) === (b.choice === 'archive')))) return false;
  return true;
}
function core(record: ConnectedRecord): RecordCore {
  const {remoteId,version,revision,confirmedRevision,form,pending,lastReceipt} = record;
  return copy({remoteId,version,revision,confirmedRevision,form,pending,lastReceipt});
}
function requireEditable(record: ConnectedRecord) {
  if (record.closed) throw new Error('종료된 운동입니다. 보관된 입력은 읽기 전용입니다.');
  if (record.resolution || record.closing) throw new Error('기록 처리 중입니다. 복구를 마친 뒤 편집해 주세요.');
}

/** One controller per verified account scope; offline reads/edits do not require a live token. */
export function createConnectedWorkoutStorage(storage: OutboxStorage, accountScope: AccountScope) {
  const scope = copy(accountScope);
  const url = new URL(scope.server);
  if (!['http:','https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || !scope.accountId?.trim() || scope.accountId.length > 100)
    throw new Error('확인된 서버와 계정 범위가 필요합니다.');
  const key = `rufit.connected-workouts.v1:${encodeURIComponent(JSON.stringify([scope.server,scope.accountId]))}`;
  const outbox = createDraftOutbox(storage,scope);
  // The network coordinator and form write queue are distinct so typing can persist during a slow request.
  const formSerial = <T>(fn:()=>Promise<T>) => serial(storage,key,fn);
  const coordinate = <T>(fn:()=>Promise<T>) => serial(storage,`${key}:network`,fn);
  const checkSession = (session:RufitSession) => { if (!scopeMatches(scope,session.scope)) throw new ApiError(401,'ACCOUNT_CHANGED','다른 계정의 연결 정보를 사용할 수 없습니다.'); };
  async function read(): Promise<Archive> {
    const raw = await storage.getItem(key);
    if (raw === null) return {schemaVersion:2,scope,records:[]};
    try {
      const value: unknown = JSON.parse(raw);
      if (!object(value) || !([1,2].includes(value.schemaVersion as number)) || !object(value.scope) || !scopeMatches(value.scope as AccountScope,scope) || !Array.isArray(value.records) ||
        !value.records.every(validRecord) || new Set(value.records.map(r => r.remoteId)).size !== value.records.length) throw new Error();
      return {...value,schemaVersion:2} as Archive;
    } catch { throw new Error('운동 연결 정보를 읽지 못했습니다. 기존 데이터는 보존했습니다.'); }
  }
  const write = (archive:Archive) => storage.setItem(key,JSON.stringify(archive));
  function find(archive:Archive,id:string) { const record=archive.records.find(r=>r.remoteId===id); if (!record) throw new Error('연결된 운동을 찾을 수 없습니다.'); return record; }
  async function acknowledge(receipt:DraftReceipt) {
    await formSerial(async () => {
      const archive=await read(); const record=find(archive,receipt.workoutId);
      if (record.lastReceipt?.operationId === receipt.operationId && record.lastReceipt.appliedVersion === receipt.appliedVersion) return;
      if (!receiptMatches(receipt,record)) throw new Error('저장 응답이 준비한 기록과 다릅니다. 원본과 요청을 보존했습니다.');
      record.version=receipt.appliedVersion;
      record.confirmedRevision=record.pending!.revision;
      record.pending!.acknowledgedVersion=receipt.appliedVersion;
      record.lastReceipt=copy(receipt);
      // Never assign pending.form or a rehydrated server snapshot to record.form here.
      await write(archive);
    });
  }
  async function recover() {
    const records=await formSerial(async ()=>(await read()).records);
    const queued=await outbox.list();
    let queueSize=queued.length;
    for (const record of records) {
      if (record.resolution) {
        const resolution=record.resolution;
        const entry=queued.find(e=>e.workoutId===record.remoteId || e.draft.operationId===resolution.operationId);
        if (entry && (entry.workoutId!==record.remoteId || !record.pending || !same(entry.draft,record.pending.draft))) throw new Error('정리할 요청이 원문과 다릅니다. 원본을 보존했습니다.');
        // The persisted choice is the tombstone: never recreate its request after a restart.
        if (entry) { await outbox.discard(entry.draft.operationId,true); queueSize--; }
        await formSerial(async()=>{
          const archive=await read(); const current=find(archive,record.remoteId);
          if (!same(current.resolution,resolution)) throw new Error('충돌 선택이 변경되었습니다.');
          current.backups ??= [];
          current.backups.push({record:core(current),closing:current.closing??null,choice:resolution.choice,remote:copy(resolution.remote)});
          current.pending=null;current.resolution=null;current.closing=null;current.lastReceipt=null;
          current.version=resolution.remote.version;current.revision++;
          if (resolution.choice==='archive') current.closed=copy(resolution.remote);
          else if (resolution.choice==='use-server') {current.form=hydrate(resolution.remote);current.confirmedRevision=current.revision;}
          else current.confirmedRevision=current.revision-1;
          await write(archive);
        });
        continue;
      }
      const pending=record.pending; if (!pending) continue;
      const entry=queued.find(e=>e.workoutId===record.remoteId || e.draft.operationId===pending.draft.operationId);
      if (entry && (entry.workoutId!==record.remoteId || !same(entry.draft,pending.draft))) throw new Error('연결 정보와 저장 대기 요청이 다릅니다. 두 원본을 보존했습니다.');
      if (entry) continue;
      if (pending.acknowledgedVersion===null) {
        // Drain existing requests before restoring more; a full queue must not block its own flush.
        if (queueSize>=MAX_PENDING_DRAFTS) continue;
        await outbox.enqueue(record.remoteId,pending.draft); queueSize++;
      }
      else await formSerial(async()=>{
        const archive=await read(); const current=find(archive,record.remoteId);
        if (current.pending?.draft.operationId===pending.draft.operationId && current.pending.acknowledgedVersion===pending.acknowledgedVersion) {
          current.pending=null; await write(archive);
        }
      });
    }
  }
  async function remote(session:RufitSession,id:string) {
    const snapshot=await session.api.workout(id);
    validateSnapshot(snapshot);
    if (snapshot.id!==id) throw new Error('다른 운동의 응답입니다.');
    return snapshot;
  }
  async function resumeClose(session:RufitSession,remoteId:string) {
    checkSession(session); await recover();
    const record=await formSerial(async()=>find(await read(),remoteId));
    if (record.closed) return {kind:'closed' as const,workout:record.closed};
    if (!record.closing) throw new Error('준비된 종료 요청이 없습니다.');
    let snapshot=await remote(session,remoteId);
    if (snapshot.version<record.version) throw new Error('서버 기록 버전이 이전보다 낮습니다.');
    if (!validateSnapshot(snapshot)) {
      if (snapshot.version!==record.closing.version) return {kind:'conflict' as const,workout:snapshot};
      snapshot=record.closing.action==='finish'
        ? await session.api.finish(remoteId,record.closing.version,record.closing.discardIncomplete)
        : await session.api.cancel(remoteId,record.closing.version,true);
    }
    if (!validateSnapshot(snapshot) || snapshot.id!==remoteId || snapshot.version<=record.version) throw new Error('종료 확인 응답을 읽지 못했습니다. 요청을 보존했습니다.');
    await formSerial(async()=>{
      const archive=await read();const current=find(archive,remoteId);
      if (!same(current.closing,record.closing)) throw new Error('종료 요청이 변경되었습니다.');
      current.closed=copy(snapshot);current.version=snapshot.version;current.lastReceipt=null;current.closing=null;
      await write(archive);
    });
    return {kind:'closed' as const,workout:snapshot};
  }
  return {
    /** Comparison is read-only; callers must show both versions before submitting a decision. */
    review(session:RufitSession,remoteId:string) {
      return coordinate(async()=>{
        checkSession(session);
        const snapshot=await remote(session,remoteId);
        const record=await formSerial(async()=>find(await read(),remoteId));
        return {local:record,remote:snapshot,pending:(await outbox.list()).find(e=>e.workoutId===remoteId)??null};
      });
    },
    resolve(session:RufitSession,remoteId:string,decision:ConflictDecision) {
      const choice=copy(decision);
      return coordinate(async()=>{
        checkSession(session);
        if (choice.confirmed!==true || !integer(choice.expectedRevision) || !integer(choice.remoteVersion) ||
          !['keep-local','use-server','archive'].includes(choice.choice) || choice.operationId!==null && !uuid(choice.operationId)) throw new Error('충돌 처리 선택과 확인이 필요합니다.');
        await recover();
        const snapshot=await remote(session,remoteId);
        if (snapshot.version!==choice.remoteVersion) throw new Error('서버 기록이 다시 변경되었습니다. 두 기록을 다시 비교해 주세요.');
        if (validateSnapshot(snapshot)!==(choice.choice==='archive')) throw new Error('종료된 기록은 원문을 보관하고 연결을 닫아야 합니다.');
        const entries=await outbox.list();
        await formSerial(async()=>{
          const archive=await read();const record=find(archive,remoteId);
          if (record.closed || record.resolution || record.revision!==choice.expectedRevision || snapshot.version<record.version || !Number.isSafeInteger(record.revision+1)) throw new Error('로컬 기록이 변경되었습니다. 두 기록을 다시 비교해 주세요.');
          const entry=entries.find(e=>e.workoutId===remoteId);
          if (choice.operationId!==null) {
            if (!record.pending || record.pending.draft.operationId!==choice.operationId || !entry || !same(entry.draft,record.pending.draft) ||
              entry.status!=='conflict' && choice.choice!=='archive') throw new Error('선택한 충돌 요청을 확인하지 못했습니다.');
          } else if (record.pending || entry || !record.closing && choice.choice!=='archive') throw new Error('먼저 저장 대기 요청의 충돌을 확인해 주세요.');
          record.resolution={operationId:choice.operationId,revision:record.revision,remote:copy(snapshot),choice:choice.choice};
          await write(archive);
        });
        await recover();
        return formSerial(async()=>copy(find(await read(),remoteId)));
      });
    },
    close(session:RufitSession,remoteId:string,expectedRevision:number,options:{action:'finish'|'cancel';confirmed:true;discardIncomplete:boolean}) {
      const request=copy(options);
      return coordinate(async()=>{
        checkSession(session);
        if (request.confirmed!==true || !['finish','cancel'].includes(request.action) || typeof request.discardIncomplete!=='boolean') throw new Error('종료 또는 취소 확인이 필요합니다.');
        await recover();
        if ((await outbox.list()).some(e=>e.workoutId===remoteId)) throw new Error('저장 대기 요청을 먼저 처리해 주세요.');
        await formSerial(async()=>{
          const archive=await read();const record=find(archive,remoteId);
          requireEditable(record);
          if (!integer(expectedRevision) || record.revision!==expectedRevision || record.pending || record.revision!==record.confirmedRevision) throw new Error('최신 입력의 서버 저장을 먼저 확인해 주세요.');
          const sets=record.form.workout.exercises.flatMap(e=>e.sets);
          if (request.action==='finish' && (!sets.some(s=>s.completed) || !request.discardIncomplete && sets.some(s=>!s.completed))) throw new Error('완료 세트와 미완료 세트 제외 여부를 확인해 주세요.');
          record.closing={action:request.action,discardIncomplete:request.discardIncomplete,version:record.version,revision:record.revision};
          await write(archive);
        });
        return resumeClose(session,remoteId);
      });
    },
    resumeClose:(session:RufitSession,remoteId:string)=>coordinate(()=>resumeClose(session,remoteId)),
    list:()=>formSerial(async()=>(await read()).records),
    load:(remoteId:string)=>formSerial(async()=>(await read()).records.find(r=>r.remoteId===remoteId)??null),
    pending:()=>outbox.list(),
    link(session:RufitSession,remoteId:string) {
      return coordinate(async()=>{
        checkSession(session);
        if (!uuid(remoteId)) throw new Error('서버 운동 번호를 확인해 주세요.');
        const existing=await formSerial(async()=>(await read()).records.find(r=>r.remoteId===remoteId));
        if (existing) return existing;
        const snapshot=await session.api.workout(remoteId);
        if (snapshot.id!==remoteId) throw new Error('다른 운동의 응답입니다.');
        const form=hydrate(snapshot);
        return formSerial(async()=>{
          const archive=await read(); const record:ConnectedRecord={remoteId,version:snapshot.version,revision:0,confirmedRevision:0,form,pending:null,lastReceipt:null};
          archive.records.push(record); await write(archive); return copy(record);
        });
      });
    },
    edit(remoteId:string,expectedRevision:number,next:ConnectedForm) {
      const form=copy(next);
      return formSerial(async()=>{
        const archive=await read(); const record=find(archive,remoteId);
        requireEditable(record);
        if (!integer(expectedRevision) || record.revision!==expectedRevision) throw new Error('입력이 변경되었습니다. 최신 기록을 다시 읽어 주세요.');
        if (!validForm(form) || form.workout.id!==record.form.workout.id || form.workout.startedAt!==record.form.workout.startedAt) throw new Error('연결된 운동의 입력 형식을 확인해 주세요.');
        if (same(form,record.form)) return copy(record);
        if (!Number.isSafeInteger(record.revision+1)) throw new Error('기록 변경 번호의 한도를 초과했습니다.');
        record.form=form; record.revision++; await write(archive); return copy(record);
      });
    },
    queueLatest(remoteId:string,operationId:string) {
      return coordinate(async()=>{
        await recover();
        const staged=await formSerial(async()=>{
          const archive=await read(); const record=find(archive,remoteId);
          requireEditable(record);
          if (record.pending) return {kind:'staged' as const,pending:record.pending};
          if (record.revision===record.confirmedRevision) return {kind:'idle' as const};
          if (record.lastReceipt?.operationId===operationId || record.backups?.some(b=>b.record.pending?.draft.operationId===operationId || b.record.lastReceipt?.operationId===operationId))
            throw new Error('이전에 사용한 요청 번호입니다. 새 작업 ID가 필요합니다.');
          const result=prepareWorkoutDraft(record.form.workout,{operationId,version:record.version,note:record.form.note,rest:record.form.rest});
          if (result.kind==='blocked') return result;
          record.pending={revision:record.revision,form:copy(record.form),draft:result.draft,acknowledgedVersion:null};
          await write(archive); return {kind:'staged' as const,pending:record.pending};
        });
        if (staged.kind!=='staged') return staged;
        const existing=(await outbox.list()).find(e=>e.workoutId===remoteId);
        if (existing?.status==='conflict') return {kind:'conflict' as const,operationId:existing.draft.operationId,reason:existing.reason};
        if (staged.pending.acknowledgedVersion!==null) throw new Error('이전 저장 확인을 먼저 복구해 주세요.');
        await outbox.enqueue(remoteId,staged.pending.draft);
        return {kind:'queued' as const,operationId:staged.pending.draft.operationId,revision:staged.pending.revision};
      });
    },
    recover:()=>coordinate(recover),
    flush(session:RufitSession) {
      return coordinate(async()=>{
        checkSession(session); await recover();
        const first=(await outbox.list()).find(e=>e.status==='pending');
        if (first) {
          const record=await formSerial(async()=>(await read()).records.find(r=>r.remoteId===first.workoutId));
          if (!record?.pending || !same(record.pending.draft,first.draft)) throw new Error('전송할 기록의 연결 정보가 없습니다. 요청을 보존했습니다.');
        }
        const result=await outbox.flushOne(session,{beforeRemove:acknowledge});
        if (result.kind==='saved') await recover();
        return result;
      });
    },
  };
}
