import { today, validDate } from '../strength/model.ts';
export type WeightRecord = { date: string; weight: number; height?: number };
export const weightStorageKey = 'rufit.bodyweight.v1';
export function weightRecord(date: string, input: string, now = today(), heightInput = ''): WeightRecord {
  if (!validDate(date) || date > now)
    throw new Error('오늘 또는 이전의 올바른 날짜를 입력해 주세요.');
  if (!/^\d+(\.\d{1,2})?$/.test(input.trim()) || Number(input) <= 0 || Number(input) > 700)
    throw new Error('체중을 0 초과 700kg 이하로 입력해 주세요. (소수 둘째 자리까지)');
  const height = heightInput.trim();
  if (height && (!/^\d+(\.\d{1,2})?$/.test(height) || Number(height) < 30 || Number(height) > 300))
    throw new Error('키를 30~300cm 사이로 입력해 주세요. (소수 둘째 자리까지)');
  return { date, weight: Number(input), ...(height ? { height: Number(height) } : {}) };
}
export function saveWeight(records: WeightRecord[], record: WeightRecord) {
  return [...records.filter((r) => r.date !== record.date), record].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}
export function decodeWeight(raw: string | null): WeightRecord[] {
  if (raw === null) return [];
  const data = JSON.parse(raw);
  const dates = new Set<string>();
  if (data?.version !== 1 || !Array.isArray(data.records))
    throw new Error('체중 기록을 읽을 수 없습니다.');
  for (const r of data.records) {
    if (
      !r ||
      typeof r.date !== 'string' ||
      !validDate(r.date) ||
      dates.has(r.date) ||
      typeof r.weight !== 'number' ||
      !Number.isFinite(r.weight) ||
      r.weight <= 0 ||
      r.weight > 700 ||
      (r.height !== undefined && (typeof r.height !== 'number' || !Number.isFinite(r.height) || r.height < 30 || r.height > 300))
    )
      throw new Error('체중 기록을 읽을 수 없습니다.');
    dates.add(r.date);
  }
  return [...data.records].sort((a: WeightRecord, b: WeightRecord) => a.date.localeCompare(b.date));
}
