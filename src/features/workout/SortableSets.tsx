/** 번호 영역에서만 드래그를 시작합니다. 행 높이를 실제로 측정하여 오류 문구·글자 확대에도 이동 위치를 맞춥니다. */
import { Component, useState, type ReactNode } from 'react';
import { PanResponder, Text, View } from 'react-native';
import { text, tokens } from '../../theme/tokens';
import { setDragStyles } from './SetDrag.styles';
import type { WorkoutSet } from './model';
export function SortableSets({ sets, disabled, name, onMove, onDraggingChange, children }: {
  sets: WorkoutSet[]; disabled: boolean; name: string;
  onMove(id: string, target: number): void;
  onDraggingChange?(dragging: boolean): void;
  children(set: WorkoutSet, index: number, handle: ReactNode): ReactNode;
}) {
  const [layouts, setLayouts] = useState<Record<string, { y: number; height: number }>>({});
  const [drag, setDrag] = useState<{ id: string; dy: number } | null>(null);
  function drop(id: string, dy: number) {
    setDrag(null);
    onDraggingChange?.(false);
    const source = layouts[id];
    if (!source || disabled) return;
    const center = source.y + source.height / 2 + dy;
    let target = sets.findIndex((set) => set.id === id);
    let distance = Infinity;
    sets.forEach((set, index) => {
      const bounds = layouts[set.id];
      if (!bounds) return;
      const next = Math.abs(center - bounds.y - bounds.height / 2);
      if (next < distance) { target = index; distance = next; }
    });
    if (target !== sets.findIndex((set) => set.id === id)) onMove(id, target);
  }
  return <View style={{ gap: 2 }}>
    {sets.map((set, index) => {
      const handle = <DragNumber
        disabled={disabled}
        onStart={() => onDraggingChange?.(true)}
        onDrag={(dy) => setDrag({ id: set.id, dy })}
        onDrop={(dy) => drop(set.id, dy)}
        onCancel={() => { setDrag(null); onDraggingChange?.(false); }}
        accessibilityRole="adjustable"
        accessibilityLabel={`${name} ${index + 1}세트 순서 이동`}
        accessibilityValue={{ min: 1, max: sets.length, now: index + 1 }}
        aria-valuemin={1} aria-valuemax={sets.length} aria-valuenow={index + 1}
        accessibilityHint="위아래로 끌어 순서를 바꿉니다. 접근성 증가·감소 동작으로도 이동할 수 있습니다."
        accessibilityActions={[{ name: 'increment', label: '아래로 이동' }, { name: 'decrement', label: '위로 이동' }]}
        onAccessibilityAction={(event) => {
          const target = index + (event.nativeEvent.actionName === 'increment' ? 1 : -1);
          if (!disabled && target >= 0 && target < sets.length) onMove(set.id, target);
        }}
        style={[setDragStyles.handle, { width: 28, minHeight: 44, alignItems: 'center', justifyContent: 'center' }]}
      ><Text style={[text.bodyBold, { color: tokens.color.text.primary }]}>{index + 1}</Text></DragNumber>;
      return <View key={set.id}
        onLayout={(event) => {
          const { y, height } = event.nativeEvent.layout;
          setLayouts((current) => current[set.id]?.y === y && current[set.id]?.height === height
            ? current : { ...current, [set.id]: { y, height } });
        }}
        style={{ zIndex: drag?.id === set.id ? 10 : 0, backgroundColor: drag?.id === set.id ? tokens.color.bg.default : undefined, transform: [{ translateY: drag?.id === set.id ? drag.dy : 0 }] }}
      >{children(set, index, handle)}</View>;
    })}
  </View>;
}

/** 핸들의 responder를 유지하여 드래그 중 재렌더링되어도 이동 거리가 초기화되지 않도록 합니다. */
class DragNumber extends Component<React.ComponentProps<typeof View> & {
  disabled?: boolean;
  onStart(): void; onDrag(dy: number): void; onDrop(dy: number): void; onCancel(): void;
}> {
  private pan = PanResponder.create({
    onStartShouldSetPanResponder: () => !this.props.disabled,
    onMoveShouldSetPanResponder: (_, gesture) => !this.props.disabled && Math.abs(gesture.dy) > 4,
    onPanResponderGrant: () => this.props.onStart(),
    onPanResponderMove: (_, gesture) => this.props.onDrag(gesture.dy),
    onPanResponderRelease: (_, gesture) => this.props.onDrop(gesture.dy),
    onPanResponderTerminate: () => this.props.onCancel(),
    onPanResponderTerminationRequest: () => false,
  });
  render() {
    const { onStart: _start, onDrag: _drag, onDrop: _drop, onCancel: _cancel, disabled: _disabled, ...props } = this.props;
    return <View {...props} {...this.pan.panHandlers} />;
  }
}
