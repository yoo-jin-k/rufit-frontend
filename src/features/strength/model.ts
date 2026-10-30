export const lifts = ['bench', 'squat', 'deadlift'] as const;
export type Lift = (typeof lifts)[number];
export const labels: Record<Lift, string> = {
  bench: '벤치프레스',
  squat: '스쿼트',
  deadlift: '데드리프트',
};
export type Measurement = { date: string } & Record<Lift, number>;
export const storageKey = 'rufit.strength.v1';
export const total = (record: Measurement) =>
  Math.round((record.bench + record.squat + record.deadlift) * 100) / 100;
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function validDate(date: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    date >= '1900-01-01' &&
    Number.isFinite(Date.parse(date)) &&
    new Date(date).toISOString().slice(0, 10) === date
  );
}
// 중량은 실제 입력한 kg 값입니다. 추정 1RM이나 여러 날짜의 최고 기록을 합산하지 않습니다.
export function measurement(date: string, input: Record<Lift, string>, now = today()): Measurement {
  if (!validDate(date) || date > now)
    throw new Error('오늘 또는 이전의 올바른 날짜를 입력해 주세요.');
  const result = { date } as Measurement;
  for (const lift of lifts) {
    const value = input[lift].trim();
    if (!/^\d+(\.\d{1,2})?$/.test(value) || Number(value) <= 0 || Number(value) > 1000)
      throw new Error(
        `${labels[lift]} 중량을 0 초과 1,000kg 이하로 입력해 주세요. (소수 둘째 자리까지)`,
      );
    result[lift] = Number(value);
  }
  return result;
}
export function upsert(records: Measurement[], record: Measurement) {
  return [...records.filter((item) => item.date !== record.date), record].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}
// 손상된 저장 데이터는 빈 목록으로 대체하지 않아 원본을 보존합니다.
export function decode(raw: string | null): Measurement[] {
  if (raw === null) return [];
  const data = JSON.parse(raw);
  if (data?.version !== 1 || !Array.isArray(data.records))
    throw new Error('기록 형식을 확인할 수 없습니다.');
  const dates = new Set<string>();
  for (const r of data.records) {
    if (
      !r ||
      typeof r.date !== 'string' ||
      !validDate(r.date) ||
      dates.has(r.date) ||
      lifts.some(
        (l) => typeof r[l] !== 'number' || !Number.isFinite(r[l]) || r[l] <= 0 || r[l] > 1000,
      )
    )
      throw new Error('저장된 기록을 읽을 수 없습니다.');
    dates.add(r.date);
  }
  return [...data.records].sort((a: Measurement, b: Measurement) => a.date.localeCompare(b.date));
}
