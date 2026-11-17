/**
 * 번호 영역에서만 드래그를 시작합니다. 행 높이를 실제로 측정하여 오류 문구·글자 확대에도 이동 위치를 맞춥니다.
 * 끄는 동안 들어갈 자리의 세트들이 끄는 세트 높이만큼 비켜서, 어디에 놓일지 미리 보입니다.
 */
import { Component, useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, PanResponder, Platform, Text, View } from 'react-native';
import { text, tokens } from '../../theme/tokens';
import { setDragStyles } from './SetDrag.styles';
import type { WorkoutSet } from './model';
export function SortableSets({
  sets,
  disabled,
  name,
  onMove,
  onDraggingChange,
  labels,
  labelColor,
  onTapNumber,
  children,
}: {
  sets: WorkoutSet[];
  disabled: boolean;
  name: string;
  onMove(id: string, target: number): void;
  onDraggingChange?(dragging: boolean): void;
  /** 번호 칸 표시(1, W, D, F)입니다. 없으면 1부터 셉니다. */
  labels?: string[];
  labelColor?(set: WorkoutSet): string | undefined;
  /** 번호를 끌지 않고 누르기만 했을 때 부릅니다(세트 종류·자각도 시트). */
  onTapNumber?(set: WorkoutSet, index: number): void;
  children(set: WorkoutSet, index: number, handle: ReactNode): ReactNode;
}) {
  const [layouts, setLayouts] = useState<Record<string, { y: number; height: number }>>({});
  const [drag, setDrag] = useState<{ id: string; dy: number } | null>(null);
  const reduceMotion = useReduceMotion();
  /** 끄는 세트의 가운데와 가장 가까운 세트 자리를 들어갈 위치로 봅니다. */
  function targetFor(id: string, dy: number) {
    const source = layouts[id];
    let target = sets.findIndex((set) => set.id === id);
    if (!source) return target;
    const center = source.y + source.height / 2 + dy;
    let distance = Infinity;
    sets.forEach((set, index) => {
      const bounds = layouts[set.id];
      if (!bounds) return;
      const next = Math.abs(center - bounds.y - bounds.height / 2);
      if (next < distance) {
        target = index;
        distance = next;
      }
    });
    return target;
  }
  function drop(id: string, dy: number) {
    setDrag(null);
    onDraggingChange?.(false);
    if (!layouts[id] || disabled) return;
    const target = targetFor(id, dy);
    if (target !== sets.findIndex((set) => set.id === id)) onMove(id, target);
  }
  // 끄는 세트가 지나간 자리의 세트들은 끄는 세트 높이(+행 간격 2)만큼 반대로 비켜섭니다.
  const from = drag ? sets.findIndex((set) => set.id === drag.id) : -1;
  const to = drag ? targetFor(drag.id, drag.dy) : -1;
  const gapSize = drag ? (layouts[drag.id]?.height ?? 0) + 2 : 0;
  const shiftFor = (index: number) => {
    if (!drag || index === from) return 0;
    if (from < to && index > from && index <= to) return -gapSize;
    if (to < from && index >= to && index < from) return gapSize;
    return 0;
  };
  return (
    <View style={{ gap: 2 }}>
      {sets.map((set, index) => {
        const handle = (
          <DragNumber
            disabled={disabled}
            onStart={() => onDraggingChange?.(true)}
            onDrag={(dy) => setDrag({ id: set.id, dy })}
            onDrop={(dy) => drop(set.id, dy)}
            onCancel={() => {
              setDrag(null);
              onDraggingChange?.(false);
            }}
            onTap={onTapNumber ? () => onTapNumber(set, index) : undefined}
            accessibilityRole="adjustable"
            accessibilityLabel={`${name} ${index + 1}세트 순서 이동`}
            accessibilityValue={{ min: 1, max: sets.length, now: index + 1 }}
            aria-valuemin={1}
            aria-valuemax={sets.length}
            aria-valuenow={index + 1}
            accessibilityHint={
              onTapNumber
                ? '누르면 세트 종류와 자각도를 고릅니다. 위아래로 끌면 순서를 바꿉니다.'
                : '위아래로 끌어 순서를 바꿉니다. 접근성 증가·감소 동작으로도 이동할 수 있습니다.'
            }
            accessibilityActions={[
              { name: 'increment', label: '아래로 이동' },
              { name: 'decrement', label: '위로 이동' },
              ...(onTapNumber ? [{ name: 'activate', label: '세트 종류·자각도' }] : []),
            ]}
            onAccessibilityAction={(event) => {
              if (event.nativeEvent.actionName === 'activate') {
                onTapNumber?.(set, index);
                return;
              }
              const target = index + (event.nativeEvent.actionName === 'increment' ? 1 : -1);
              if (!disabled && target >= 0 && target < sets.length) onMove(set.id, target);
            }}
            style={[
              setDragStyles.handle,
              { width: 28, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
            ]}
          >
            <Text
              style={[text.bodyBold, { color: labelColor?.(set) ?? tokens.color.text.primary }]}
            >
              {labels?.[index] ?? index + 1}
            </Text>
          </DragNumber>
        );
        const dragging = drag?.id === set.id;
        return (
          <ShiftRow
            key={set.id}
            shift={shiftFor(index)}
            active={!!drag}
            reduceMotion={reduceMotion}
            onLayout={(event) => {
              const { y, height } = event.nativeEvent.layout;
              setLayouts((current) =>
                current[set.id]?.y === y && current[set.id]?.height === height
                  ? current
                  : { ...current, [set.id]: { y, height } },
              );
            }}
            style={{
              zIndex: dragging ? 10 : 0,
              backgroundColor: dragging ? tokens.color.bg.default : undefined,
              transform: [{ translateY: dragging ? drag.dy : 0 }],
            }}
          >
            {children(set, index, handle)}
          </ShiftRow>
        );
      })}
    </View>
  );
}

function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => alive && setReduce(value))
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

/**
 * 비켜서는 세트 한 줄입니다. 끄는 동안에는 부드럽게 움직이고,
 * 놓는 순간에는 순서가 바뀐 화면과 같은 프레임에 0으로 돌아가 깜빡이지 않게 합니다.
 */
function ShiftRow({
  shift,
  active,
  reduceMotion,
  style,
  children,
  ...props
}: React.ComponentProps<typeof View> & {
  shift: number;
  active: boolean;
  reduceMotion: boolean;
}) {
  const [offset] = useState(() => new Animated.Value(0));
  useLayoutEffect(() => {
    if (!active || reduceMotion) {
      offset.stopAnimation();
      offset.setValue(active ? shift : 0);
      return;
    }
    Animated.timing(offset, {
      toValue: shift,
      duration: 160,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [active, offset, reduceMotion, shift]);
  return (
    <View {...props} style={style}>
      <Animated.View style={{ transform: [{ translateY: offset }] }}>{children}</Animated.View>
    </View>
  );
}

/** 핸들의 responder를 유지하여 드래그 중 재렌더링되어도 이동 거리가 초기화되지 않도록 합니다. */
class DragNumber extends Component<
  React.ComponentProps<typeof View> & {
    disabled?: boolean;
    onStart(): void;
    onDrag(dy: number): void;
    onDrop(dy: number): void;
    onCancel(): void;
    onTap?(): void;
  }
> {
  private pan = PanResponder.create({
    onStartShouldSetPanResponder: () => !this.props.disabled,
    onMoveShouldSetPanResponder: (_, gesture) => !this.props.disabled && Math.abs(gesture.dy) > 4,
    onPanResponderGrant: () => this.props.onStart(),
    onPanResponderMove: (_, gesture) => this.props.onDrag(gesture.dy),
    onPanResponderRelease: (_, gesture) => {
      this.props.onDrop(gesture.dy);
      // 거의 움직이지 않고 뗐으면 누른 것으로 봅니다.
      if (Math.abs(gesture.dx) < 6 && Math.abs(gesture.dy) < 6) this.props.onTap?.();
    },
    onPanResponderTerminate: () => this.props.onCancel(),
    onPanResponderTerminationRequest: () => false,
  });
  render() {
    const {
      onStart: _start,
      onDrag: _drag,
      onDrop: _drop,
      onCancel: _cancel,
      onTap: _tap,
      disabled: _disabled,
      ...props
    } = this.props;
    return <View {...props} {...this.pan.panHandlers} />;
  }
}
