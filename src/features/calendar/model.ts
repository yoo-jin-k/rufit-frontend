import type { Workout } from '../workout/model.ts';
// 자정을 넘겨 끝낸 운동도 시작한 날에 표시합니다. UTC 변환으로 날짜가 이동하지 않게 합니다.
export function localDay(timestamp: number) {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function monthCells(month: string): (string | null)[] {
  const [year, number] = month.split('-').map(Number);
  const offset = new Date(year, number - 1, 1, 12).getDay();
  const count = new Date(year, number, 0, 12).getDate();
  return Array.from({ length: Math.ceil((offset + count) / 7) * 7 }, (_, i) =>
    i < offset || i >= offset + count
      ? null
      : `${month}-${String(i - offset + 1).padStart(2, '0')}`,
  );
}
export function shiftMonth(month: string, offset: number) {
  const [year, number] = month.split('-').map(Number);
  return localDay(new Date(year, number - 1 + offset, 1, 12).getTime()).slice(0, 7);
}
export function workoutsByDay(history: Workout[]) {
  const grouped: Record<string, Workout[]> = {};
  for (const workout of history) {
    if (workout.finishedAt === undefined) continue;
    const day = workout.recordDate ?? localDay(workout.startedAt);
    (grouped[day] ??= []).push(workout);
  }
  for (const records of Object.values(grouped)) records.sort((a, b) => a.startedAt - b.startedAt);
  return grouped;
}

/** 월요일부터 시작하는 주간·월간 날짜를 생성합니다. 정오를 사용하여 일광절약시간 경계도 보존합니다. */
export function calendarDays(selected: string, expanded: boolean): string[] {
  const [year, month, day] = selected.split('-').map(Number);
  const first = new Date(year, month - 1, expanded ? 1 : day, 12);
  const offset = (first.getDay() + 6) % 7;
  const count = expanded ? Math.ceil((offset + new Date(year, month, 0, 12).getDate()) / 7) * 7 : 7;
  return Array.from({ length: count }, (_, i) =>
    localDay(new Date(year, month - 1, (expanded ? 1 : day) - offset + i, 12).getTime()),
  );
}
