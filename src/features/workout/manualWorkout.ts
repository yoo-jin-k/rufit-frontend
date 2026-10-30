import {setFieldErrors} from './setRowView.ts';
import {today,validDate} from '../strength/model.ts';
import {type Workout,type WorkoutSet} from './model.ts';
import type {WorkoutArchive} from './storage.ts';
// 예시 텍스트는 입력값이 아니다. 빠진 필드와 잘못된 숫자를 구분한다.
export function manualFieldErrors(set: WorkoutSet) {
  const errors=setFieldErrors(set);
  return {weight:set.weight.trim()===''?'무게를 입력해 주세요. 맨몸 운동은 0을 입력하세요.':errors.weight,
    reps:set.reps.trim()===''?'횟수를 입력해 주세요. (예: 10회)':errors.reps};
}
// 작성 시각을 과거로 바꾸지 않는다. 기록 날짜만 별도 보관하여 타이머가 며칠씩 늘어나는 것을 방지한다.
export function completeManualWorkout(draft: Workout, date: string, now = Date.now()): Workout {
  if (!validDate(date) || date > today()) throw new Error('오늘 또는 이전의 올바른 날짜를 선택해 주세요.');
  if (!draft.exercises.length) throw new Error('운동 종목을 추가해 주세요.');
  for (const exercise of draft.exercises) {
    if (!exercise.sets.length) throw new Error(`${exercise.name}에 세트를 추가해 주세요.`);
    for (const [index,set] of exercise.sets.entries()) {
      const errors=manualFieldErrors(set);
      if (errors.weight || errors.reps) throw new Error(`${exercise.name} ${index+1}세트: ${errors.weight || errors.reps}`);
    }
  }
  return {...draft,recordDate:date,entryMode:'manual',startedAt:now,finishedAt:now,exercises:draft.exercises.map(e=>({...e,sets:e.sets.map(set=>({...set,completed:true}))}))};
}
export function appendManualWorkout(archive: WorkoutArchive, workout: Workout): WorkoutArchive {
  if (workout.entryMode !== 'manual' || workout.finishedAt === undefined || !workout.recordDate) throw new Error('완료한 수동 기록만 추가할 수 있습니다.');
  // 현재 운동·휴식·설정을 보존한다. 동일 요청이 재전송돼도 같은 ID를 중복 추가하지 않는다.
  return {...archive,history:[...archive.history.filter(item=>item.id!==workout.id),workout]};
}
