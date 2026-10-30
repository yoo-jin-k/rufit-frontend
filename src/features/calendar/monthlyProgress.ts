import type {Workout} from '../workout/model.ts';
import {monthCells,workoutsByDay} from './model.ts';
// 월 전체 일수가 100%. 같은 날짜의 여러 운동과 수동 기록은 하루로 합친다.
export function monthlyProgress(history:Workout[],month:string) {
  const days=monthCells(month).filter((day):day is string=>day!==null);
  const recorded=workoutsByDay(history);
  const workoutDays=days.filter(day=>!!recorded[day]?.length).length;
  return {month,workoutDays,totalDays:days.length,percent:Math.round(workoutDays/days.length*1000)/10};
}
