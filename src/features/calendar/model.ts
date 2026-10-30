import type {Workout} from '../workout/model.ts';
// 자정을 넘겨 끝낸 운동도 시작한 날에 표시한다. UTC 변환으로 날짜가 이동하지 않게 한다.
export function localDay(timestamp: number) {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
export function monthCells(month: string): (string | null)[] {
  const [year, number] = month.split('-').map(Number);
  const offset = new Date(year,number-1,1,12).getDay();
  const count = new Date(year,number,0,12).getDate();
  return Array.from({length:Math.ceil((offset+count)/7)*7},(_,i)=>i<offset || i>=offset+count ? null : `${month}-${String(i-offset+1).padStart(2,'0')}`);
}
export function shiftMonth(month: string, offset: number) {
  const [year, number] = month.split('-').map(Number);
  return localDay(new Date(year,number-1+offset,1,12).getTime()).slice(0,7);
}
export function workoutsByDay(history: Workout[]) {
  const grouped: Record<string, Workout[]> = {};
  for (const workout of history) {
    if (workout.finishedAt === undefined) continue;
    const day=workout.recordDate ?? localDay(workout.startedAt);
    (grouped[day] ??= []).push(workout);
  }
  for (const records of Object.values(grouped)) records.sort((a,b)=>a.startedAt-b.startedAt);
  return grouped;
}
