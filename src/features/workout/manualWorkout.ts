import {today,validDate} from '../strength/model.ts';
import {validSet,type Workout} from './model.ts';
import type {WorkoutArchive} from './storage.ts';
// 작성 시각을 과거로 바꾸지 않는다. 기록 날짜만 별도 보관하여 타이머가 며칠씩 늘어나는 것을 방지한다.
export function completeManualWorkout(draft: Workout, date: string, now = Date.now()): Workout {
  if (!validDate(date) || date > today()) throw new Error('오늘 또는 이전의 올바른 날짜를 선택해 주세요.');
  if (!draft.exercises.length || draft.exercises.some(e=>!e.sets.length || e.sets.some(set=>!validSet(set)))) throw new Error('모든 종목에 세트를 추가하고 무게·횟수를 입력해 주세요.');
  return {...draft,recordDate:date,entryMode:'manual',startedAt:now,finishedAt:now,exercises:draft.exercises.map(e=>({...e,sets:e.sets.map(set=>({...set,completed:true}))}))};
}
export function appendManualWorkout(archive: WorkoutArchive, workout: Workout): WorkoutArchive {
  if (workout.entryMode !== 'manual' || workout.finishedAt === undefined || !workout.recordDate) throw new Error('완료한 수동 기록만 추가할 수 있습니다.');
  // 현재 운동·휴식·설정을 보존한다. 동일 요청이 재전송돼도 같은 ID를 중복 추가하지 않는다.
  return {...archive,history:[...archive.history.filter(item=>item.id!==workout.id),workout]};
}
