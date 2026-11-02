import type { MeasurementEdit, MeasurementKind, ServerMeasurement } from '../../api/client.ts';
import type { RufitSession } from '../../api/session.ts';
import {
  decodeWeight,
  weightRecord,
  weightStorageKey,
  type WeightRecord,
} from '../bodyweight/model.ts';
import { decode, measurement, storageKey, type Measurement } from '../strength/model.ts';
import {
  bindDeviceRecords,
  requireActive,
  transferSerial,
  type TransferStorage,
} from './transferStorage.ts';
export type LocalMeasurement = WeightRecord | Measurement;
export type MeasurementComparison = {
  kind: MeasurementKind;
  date: string;
  local: LocalMeasurement | null;
  remote: ServerMeasurement | null;
  state: 'same' | 'local-only' | 'server-only' | 'different';
};
const key = (kind: MeasurementKind) => (kind === 'weight' ? weightStorageKey : storageKey);
function values(kind: MeasurementKind, record: LocalMeasurement): Omit<MeasurementEdit, 'version'> {
  if (kind === 'weight' && 'weight' in record)
    return { weight: weightRecord(record.date, String(record.weight)).weight };
  if (kind === 'strength' && 'bench' in record) {
    const validated = measurement(record.date, {
      bench: String(record.bench),
      squat: String(record.squat),
      deadlift: String(record.deadlift),
    });
    return { bench: validated.bench, squat: validated.squat, deadlift: validated.deadlift };
  }
  throw new Error('측정 종류가 다릅니다.');
}
export function localMeasurement(
  kind: MeasurementKind,
  remote: ServerMeasurement,
): LocalMeasurement {
  if (!remote || !Number.isSafeInteger(remote.version) || remote.version < 1)
    throw new Error('측정 버전을 확인하지 못했습니다.');
  if (kind === 'weight') {
    if (
      typeof remote.weight !== 'number' ||
      remote.bench !== null ||
      remote.squat !== null ||
      remote.deadlift !== null
    )
      throw new Error('체중 응답을 확인하지 못했습니다.');
    return weightRecord(remote.date, String(remote.weight));
  }
  if (
    remote.weight !== null ||
    [remote.bench, remote.squat, remote.deadlift].some((n) => typeof n !== 'number')
  )
    throw new Error('삼대 응답을 확인하지 못했습니다.');
  return measurement(remote.date, {
    bench: String(remote.bench),
    squat: String(remote.squat),
    deadlift: String(remote.deadlift),
  });
}
export function compareMeasurements(
  kind: MeasurementKind,
  locals: LocalMeasurement[],
  remotes: ServerMeasurement[],
): MeasurementComparison[] {
  const localMap = new Map(locals.map((r) => [r.date, r]));
  const remoteMap = new Map(remotes.map((r) => [r.date, r]));
  if (remoteMap.size !== remotes.length)
    throw new Error('서버 측정 날짜가 중복되었습니다. 다시 조회해 주세요.');
  remotes.forEach((record) => localMeasurement(kind, record));
  return [...new Set([...localMap.keys(), ...remoteMap.keys()])]
    .sort()
    .reverse()
    .map((date) => {
      const local = localMap.get(date) ?? null,
        remote = remoteMap.get(date) ?? null;
      return {
        kind,
        date,
        local,
        remote,
        state: !local
          ? 'server-only'
          : !remote
            ? 'local-only'
            : JSON.stringify(values(kind, local)) ===
                JSON.stringify(values(kind, localMeasurement(kind, remote)))
              ? 'same'
              : 'different',
      };
    });
}
async function readLocal(
  storage: TransferStorage,
  kind: MeasurementKind,
): Promise<LocalMeasurement[]> {
  const raw = await storage.getItem(key(kind));
  return kind === 'weight' ? decodeWeight(raw) : decode(raw);
}
export async function measurementComparisons(
  storage: TransferStorage,
  session: RufitSession,
  kind: MeasurementKind,
) {
  requireActive(session);
  const locals = await readLocal(storage, kind);
  const remotes: ServerMeasurement[] = [];
  for (let page = 0; page <= 10000; page++) {
    requireActive(session);
    const response = await session.api.measurements(kind, page);
    requireActive(session);
    if (
      !response ||
      response.page !== page ||
      !Array.isArray(response.items) ||
      typeof response.hasNext !== 'boolean'
    )
      throw new Error('측정 목록을 읽지 못했습니다.');
    remotes.push(...response.items);
    if (!response.hasNext) return compareMeasurements(kind, locals, remotes);
    if (!response.items.length) throw new Error('측정 목록이 변경되었습니다. 다시 조회해 주세요.');
  }
  throw new Error('측정 기록이 조회 한도를 넘었습니다.');
}
/** 비교 당시 값이 남아 있는 경우에만 적용합니다. 서버의 버전 충돌은 사용자에게 다시 선택하게 합니다. */
export function transferMeasurement(
  storage: TransferStorage,
  session: RufitSession,
  row: MeasurementComparison,
  direction: 'upload' | 'download',
) {
  return transferSerial(storage, async () => {
    await bindDeviceRecords(storage, session);
    const records = await readLocal(storage, row.kind);
    const current = records.find((r) => r.date === row.date) ?? null;
    if (JSON.stringify(current) !== JSON.stringify(row.local))
      throw new Error('기기 측정값이 바뀌었습니다. 다시 비교해 주세요.');
    requireActive(session);
    if (direction === 'upload') {
      if (!row.local) throw new Error('업로드할 기기 측정값이 없습니다.');
      // 서버와 같은 범위 검증을 수행하여 오래된 손상 자료도 전송하지 않습니다.
      const body = { version: row.remote?.version ?? 0, ...values(row.kind, row.local) };
      const saved = await session.api.saveMeasurement(row.kind, row.date, body);
      const actual = localMeasurement(row.kind, saved);
      if (
        saved.date !== row.date ||
        JSON.stringify(values(row.kind, actual)) !== JSON.stringify(values(row.kind, row.local))
      )
        throw new Error('서버 저장 결과를 다시 확인해 주세요.');
      requireActive(session);
    } else {
      if (!row.remote) throw new Error('가져올 서버 측정값이 없습니다.');
      const selected = localMeasurement(row.kind, row.remote);
      const next = [...records.filter((r) => r.date !== row.date), selected].sort((a, b) =>
        a.date.localeCompare(b.date),
      );
      requireActive(session);
      await storage.setItem(key(row.kind), JSON.stringify({ version: 1, records: next }));
    }
  });
}
