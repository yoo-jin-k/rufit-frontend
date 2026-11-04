import {Text, View} from 'react-native';
import {Button} from '../../components/Button';
import {timerStyles as s} from './TimerCard.styles';
import {wrappableTime} from './timerView';

// 남은 시간만 표시하며 틱에서는 저장하지 않는다. 큰 글자에서 버튼을 같은 노드의 세로 배치로 바꾼다.
export function RestTimerCard({phase, remainingLabel, exerciseName, canSubtract, canAdd, stackActions, onAdjust, onSkip}: {
  phase: 'active' | 'expired'; remainingLabel: string; exerciseName: string;
  canSubtract: boolean; canAdd: boolean; stackActions: boolean; onAdjust(seconds: -10 | 10): void; onSkip(): void;
}) {
  return <View style={s.card}>
    <Text style={s.phase} accessibilityLiveRegion="polite">{phase === 'expired' ? '휴식 끝' : '세트 휴식'}</Text>
    <Text style={s.time} accessibilityLabel={`남은 휴식 ${remainingLabel}`}>{wrappableTime(remainingLabel)}</Text>
    <Text style={s.heading}>{exerciseName}</Text>
    <Text style={s.description}>{phase === 'expired' ? '준비되면 다음 세트를 시작하세요.' : '운동시간과 별도로 흐릅니다.'}</Text>
    <View style={[s.adjustments, stackActions && s.stacked]}>
      <View style={[s.action, stackActions && s.stackedAction]}><Button title="−10초" accessibilityLabel="휴식 −10초" secondary disabled={!canSubtract} onPress={() => onAdjust(-10)} /></View>
      <View style={[s.action, stackActions && s.stackedAction]}><Button title="+10초" accessibilityLabel="휴식 +10초" secondary disabled={!canAdd} onPress={() => onAdjust(10)} /></View>
    </View>
    {!canAdd && <Text style={s.description}>휴식은 최대 60분까지 조절할 수 있어요.</Text>}
    <Button title="휴식 닫기" secondary onPress={onSkip} />
    <Text style={s.description}>닫으면 이번 휴식을 종료해요.</Text>
  </View>;
}
