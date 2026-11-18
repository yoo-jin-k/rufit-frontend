/**
 * 오른쪽에서 밀려 들어오는 상세 화면입니다. 닫기 버튼 대신
 * 왼쪽 위 뒤로 아이콘이나 화면 왼쪽 가장자리에서 오른쪽으로 밀기로 뒤로 갑니다.
 * children은 back 함수를 받아 뒤로 아이콘에 연결합니다. back은 화면을 오른쪽으로 밀어낸 뒤 onClose를 부릅니다.
 */
import { Component, useEffect, useState, type ReactNode } from 'react';
import { Animated, PanResponder, View, useWindowDimensions } from 'react-native';
import { AppModal } from './AppModal';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { tokens } from '../theme/tokens';

/** 왼쪽 가장자리 띠의 폭입니다. 본문 여백(20) 안쪽이라 버튼·사진 누르기를 가리지 않습니다. */
const EDGE = 20;

export function SwipeBackModal({
  onClose,
  canClose = () => true,
  children,
}: {
  onClose: () => void;
  /** 저장 중처럼 지금 닫으면 안 되면 false를 돌려줍니다. */
  canClose?: () => boolean;
  children: (back: () => void) => ReactNode;
}) {
  const { width } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const [x] = useState(() => new Animated.Value(width));
  const [leaving, setLeaving] = useState(false);
  // 처음 열릴 때 오른쪽에서 밀려 들어옵니다.
  useEffect(() => {
    if (reduceMotion) x.setValue(0);
    else Animated.timing(x, { toValue: 0, duration: 260, useNativeDriver: false }).start();
  }, [x, reduceMotion]);
  const back = () => {
    if (leaving || !canClose()) {
      Animated.spring(x, { toValue: 0, useNativeDriver: false }).start();
      return;
    }
    setLeaving(true);
    if (reduceMotion) return onClose();
    Animated.timing(x, { toValue: width, duration: 200, useNativeDriver: false }).start(() =>
      onClose(),
    );
  };
  return (
    <AppModal visible transparent animationType="none" onRequestClose={back}>
      <EdgeSwipe x={x} width={width} onBack={back}>
        {children(back)}
      </EdgeSwipe>
    </AppModal>
  );
}

/**
 * 왼쪽 가장자리에서 오른쪽으로 미는 동작을 받습니다. 밀면 화면이 손가락을 따라오고,
 * 화면 폭의 30% 이상 밀거나 빠르게 밀면 뒤로 갑니다. 아니면 제자리로 돌아갑니다.
 * 손이 움직이는 동안 최신 props를 읽어야 해서 클래스로 둡니다(세트 끌기와 같은 방식).
 */
class EdgeSwipe extends Component<{
  x: Animated.Value;
  width: number;
  onBack: () => void;
  children: ReactNode;
}> {
  private settle = () =>
    Animated.spring(this.props.x, { toValue: 0, useNativeDriver: false }).start();
  // 왼쪽 가장자리의 얇은 띠가 처음부터 손가락을 맡습니다. 스크롤 영역 위에 있어 iOS 스크롤이 밀기를 가로채지 못합니다.
  private pan = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (_, g) => this.props.x.setValue(Math.max(0, g.dx)),
    onPanResponderRelease: (_, g) => {
      if (g.dx > this.props.width * 0.3 || g.vx > 0.6) this.props.onBack();
      else this.settle();
    },
    onPanResponderTerminate: () => this.settle(),
  });
  render() {
    return (
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: tokens.color.bg.default,
          transform: [{ translateX: this.props.x }],
        }}
      >
        {this.props.children}
        <View
          {...this.pan.panHandlers}
          accessible={false}
          style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: EDGE }}
        />
      </Animated.View>
    );
  }
}
