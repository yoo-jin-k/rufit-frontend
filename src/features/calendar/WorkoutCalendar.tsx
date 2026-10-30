import {useMemo,useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import {elapsedWorkoutMs,formatWorkoutTime,type Workout} from '../workout/model';
import {localDay,monthCells,shiftMonth,workoutsByDay} from './model';
import {calendarStyles as s} from './Calendar.styles';
export function WorkoutCalendar({history,ready,now,onAdd}: {history:Workout[];ready:boolean;now:number;onAdd?:(date:string)=>void}) {
  const today=localDay(now);
  const [expanded,setExpanded]=useState(true);
  const [month,setMonth]=useState(()=>today.slice(0,7));
  const [selected,setSelected]=useState(()=>today);
  const grouped=useMemo(()=>workoutsByDay(history),[history]);
  const markedDays=Object.keys(grouped).filter(day=>day.startsWith(month));
  const records=grouped[selected] ?? [];
  function move(offset:number) {
    const next=shiftMonth(month,offset);setMonth(next);setSelected(next===today.slice(0,7)?today:`${next}-01`);
  }
  return <View style={s.card}>
    <Pressable accessibilityRole="button" accessibilityLabel={`운동 캘린더 ${expanded?'접기':'펼치기'}`} accessibilityState={{expanded}} onPress={()=>setExpanded(value=>!value)} style={s.toggle}>
      <Text style={s.heading}>운동 캘린더</Text><Text style={s.actionText}>{expanded?'접기 ▴':'펼치기 ▾'}</Text>
    </Pressable>
    <Text style={s.muted}>{month.replace('-','년 ')}월 · {ready?`${markedDays.length}일 운동`:'기록 확인 중'}</Text>
    {expanded && <>
      <View style={s.row}>
        <Pressable accessibilityRole="button" accessibilityLabel="이전 달" onPress={()=>move(-1)} style={s.action}><Text style={s.actionText}>‹ 이전</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="오늘 날짜로 이동" onPress={()=>{setMonth(today.slice(0,7));setSelected(today);}} style={s.action}><Text style={s.actionText}>오늘</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="다음 달" onPress={()=>move(1)} style={s.action}><Text style={s.actionText}>다음 ›</Text></Pressable>
      </View>
      <View style={s.week}>{['일','월','화','수','목','금','토'].map(day=><Text key={day} style={s.weekday}>{day}</Text>)}</View>
      <View style={s.grid}>{monthCells(month).map((day,i)=>day ? <Pressable key={day} accessibilityRole="button" accessibilityLabel={`${day}${day===today?', 오늘':''}, ${ready?`완료한 운동 ${grouped[day]?.length??0}회`:'기록 확인 중'}`} accessibilityState={{selected:day===selected}} onPress={()=>setSelected(day)} style={[s.cell,!!grouped[day]?.length&&s.marked,day===selected&&s.selected]}>
        <Text style={[s.day,day===today&&s.today]}>{Number(day.slice(-2))}</Text><View style={[s.dot,!grouped[day]?.length&&s.dotEmpty]}/>
      </Pressable>:<View key={`blank-${i}`} style={s.cell}/>)}</View>
      <Text style={s.muted}>● 운동 완료 · 밑줄은 오늘 · 지정한 기록 날짜 기준</Text>
      <View style={s.detail}>
        <Text style={s.heading}>{selected} 운동 기록</Text>
        {onAdd && ready && selected<today && <Pressable accessibilityRole="button" accessibilityLabel={`${selected} 운동 기록 추가`} onPress={()=>onAdd(selected)} style={s.action}><Text style={s.actionText}>＋ 이 날짜에 운동 기록 추가</Text></Pressable>}
        {!ready?<Text style={s.muted}>저장된 기록을 확인하고 있어요.</Text>:!records.length?<Text style={s.muted}>이날 완료한 운동 기록이 없어요.</Text>:records.map((workout,i)=><View key={workout.id} style={s.session}>
          <Text style={s.body}>{i+1}번째 운동 · {workout.entryMode==='manual'?'나중에 입력한 기록':new Date(workout.startedAt).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false})}</Text>
          <Text style={s.muted}>{workout.entryMode==='manual'?'운동시간 미측정':formatWorkoutTime(elapsedWorkoutMs(workout,now))} · {workout.exercises.reduce((count,e)=>count+e.sets.filter(set=>set.completed).length,0)}세트 완료</Text>
          {workout.exercises.map(exercise=><View key={exercise.id}><Text style={s.body}>{exercise.name}</Text><Text style={s.muted}>{exercise.sets.filter(set=>set.completed).map((set,index)=>`${index+1}세트 ${set.weight}kg × ${set.reps}회`).join(' · ') || '완료한 세트 없음'}</Text></View>)}
        </View>)}
      </View>
    </>}
  </View>;
}
