import {Text, View} from 'react-native';
import {Button} from '../../components/Button';
import {timerStyles as s} from './TimerCard.styles';
import {wrappableTime} from './timerView';

type Phase = 'running' | 'paused' | 'finished';
// 운동/휴식은 별개다. 이 카드는 화면 표시와 명시적인 정지/재개 콜백만 담당한다.
export function WorkoutTimerCard({phase, elapsedLabel, onPause, onResume}: {
  phase: Phase; elapsedLabel: string; onPause(): void; onResume(): void;
}) {
  const labels: Record<Phase, string> = {running: '운동 진행 중', paused: '일시정지 중', finished: '운동 완료'};
  const descriptions: Record<Phase, string> = {
    running: '앱을 닫아도 운동시간은 계속 흘러갑니다.', paused: '운동시간만 멈췄어요. 휴식시간은 계속 흘러갑니다.',
    finished: '일시정지를 제외한 운동시간',
  };
  return <View style={s.card}>
    <Text style={s.phase} accessibilityLiveRegion="polite">{labels[phase]}</Text>
    <Text style={s.time} accessibilityLabel={`운동 진행 시간 ${elapsedLabel}`}>{wrappableTime(elapsedLabel)}</Text>
    <Text style={s.description}>{descriptions[phase]}</Text>
    {phase !== 'finished' && <Button title={phase === 'paused' ? '운동 재개' : '일시정지'} secondary onPress={phase === 'paused' ? onResume : onPause} />}
  </View>;
}
