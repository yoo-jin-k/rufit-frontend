/**
 * 월 전체 일수를 분모로 사용하여 운동 달성률을 계산합니다.
 * 같은 날 여러 번 운동한 기록은 하루로 집계하며, 진행 중인 운동은 제외합니다.
 */
import type { Workout } from '../workout/model.ts';
import { localDay, monthCells, workoutsByDay } from './model.ts';
// 월 전체 일수가 100%. 같은 날짜의 여러 운동과 수동 기록은 하루로 합칩니다.
export function monthlyProgress(history: Workout[], month: string) {
  const days = monthCells(month).filter((day): day is string => day !== null);
  const recorded = workoutsByDay(history);
  const workoutDays = days.filter((day) => !!recorded[day]?.length).length;
  return {
    month,
    workoutDays,
    totalDays: days.length,
    percent: Math.round((workoutDays / days.length) * 1000) / 10,
  };
}

/** 완료 안내도 달력과 같은 기록 날짜를 사용하여 월말 자정 경계를 일치시킵니다. */
export function completionMonthFor(workout: Workout): string {
  return (workout.recordDate ?? localDay(workout.startedAt)).slice(0, 7);
}
