import type { OfflineWorkoutImport } from '../../api/client.ts';
import type { RufitSession } from '../../api/session.ts';
import { validSet, type Workout } from '../workout/model.ts';
import { isWorkout } from '../workout/storage.ts';
import { serverWorkout } from '../workout/serverHistory.ts';
import { validDate, today } from '../strength/model.ts';
import {
  bindDeviceRecords,
  requireActive,
  scopeKey,
  transferSerial,
  type TransferStorage,
} from './transferStorage.ts';

type Receipt = { localId: string; key: string; body: OfflineWorkoutImport; saved: boolean };
export function workoutImportBody(workout: Workout): OfflineWorkoutImport {
  if (
    !isWorkout(workout) ||
    workout.finishedAt === undefined ||
    workout.id.startsWith('server:') ||
    !workout.exercises.length ||
    workout.exercises.some(
      (e) => !e.sets.length || e.sets.some((s) => !s.completed || !validSet(s)),
    )
  )
    throw new Error('완료한 기기 운동 기록만 업로드할 수 있습니다.');
  const sets = workout.exercises.flatMap((e) =>
    e.sets.map((s) => ({
      set: {
        exerciseId: e.catalogId ?? null,
        exerciseName: e.name,
        weight: Number(s.weight),
        reps: Number(s.reps),
      },
      completed: true,
    })),
  );
  if (sets.length > 300) throw new Error('한 운동은 300세트까지 업로드할 수 있습니다.');
  const body: OfflineWorkoutImport = {
    startedAt: new Date(workout.startedAt).toISOString(),
    finishedAt: new Date(workout.finishedAt).toISOString(),
    sets,
    note: '',
    confirmed: true,
    pausedDurationMs: workout.pausedDurationMs ?? 0,
  };
  if (workout.entryMode === 'manual') {
    if (
      !workout.recordDate ||
      !validDate(workout.recordDate) ||
      workout.recordDate > today() ||
      workout.startedAt !== workout.finishedAt ||
      body.pausedDurationMs !== 0
    )
      throw new Error('수동 기록의 날짜와 시간 미측정 상태를 확인해 주세요.');
    body.recordDate = workout.recordDate;
    body.entryMode = 'manual';
  }
  return body;
}
/** 네트워크 요청 전에 키와 본문을 저장합니다. 응답이 유실돼도 재시도는 같은 키를 사용합니다. */
export function uploadWorkout(
  storage: TransferStorage,
  session: RufitSession,
  workout: Workout,
  uuid: () => string,
) {
  return transferSerial(storage, async () => {
    const body = workoutImportBody(workout);
    await bindDeviceRecords(storage, session);
    const ledgerKey = `rufit.workout-transfers.v1:${scopeKey(session.scope)}`;
    const raw = await storage.getItem(ledgerKey);
    const records: Receipt[] = raw === null ? [] : JSON.parse(raw);
    if (
      !Array.isArray(records) ||
      records.some(
        (r) =>
          !r ||
          typeof r.localId !== 'string' ||
          typeof r.key !== 'string' ||
          typeof r.saved !== 'boolean' ||
          !r.body,
      )
    )
      throw new Error('전송 이력을 읽지 못했습니다. 기존 자료는 보존됩니다.');
    let entry = records.find((r) => r.localId === workout.id);
    if (entry && JSON.stringify(entry.body) !== JSON.stringify(body))
      throw new Error('이미 업로드한 기록과 내용이 다릅니다. 서버 기록을 먼저 확인해 주세요.');
    if (!entry) {
      const key = uuid();
      if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(key))
        throw new Error('전송 번호를 만들지 못했습니다.');
      if (records.some((record) => record.key === key))
        throw new Error('전송 번호가 중복되었습니다. 다시 시도해 주세요.');
      entry = { localId: workout.id, key, body, saved: false };
      records.push(entry);
      await storage.setItem(ledgerKey, JSON.stringify(records));
    }
    requireActive(session);
    if (entry.saved) return { remoteId: entry.key, replayed: true };
    const result = await session.api.importWorkout(entry.key, entry.body);
    if (result.workout.id !== entry.key)
      throw new Error('다른 운동의 응답입니다. 같은 요청으로 다시 확인해 주세요.');
    serverWorkout(result.workout);
    entry.saved = true;
    await storage.setItem(ledgerKey, JSON.stringify(records));
    requireActive(session);
    return { remoteId: entry.key, replayed: result.replayed };
  });
}
