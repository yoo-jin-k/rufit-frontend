/** +는 마지막 세트를 복제하고 −는 마지막 세트만 제거합니다. 빈 목록에서도 새 세트를 만들 수 있습니다. */
import { Pressable, Text, View } from 'react-native';
import { colors } from '../../theme/tokens';
export function SetControls({ name, count, disabled, onAdd, onRemove, onLoad, allCompleted = false, onCompleteAll }: {
  name: string; count: number; disabled: boolean; onAdd(): void; onRemove(): void; onLoad?(): void; allCompleted?: boolean; onCompleteAll?(): void;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 12 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${name} 마지막 세트 삭제`} disabled={disabled || !count} onPress={onRemove} style={{ padding: 14, opacity: disabled || !count ? 0.3 : 1 }}>
          <Text style={{ fontSize: 24, color: colors.text }}>−</Text>
        </Pressable>
        <Text style={{ flex: 1, textAlign: 'center', color: colors.textSecondary }}>세트 {count}개</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`${name} 마지막 세트 복제 추가`} disabled={disabled} onPress={onAdd} style={{ padding: 14, opacity: disabled ? 0.3 : 1 }}>
          <Text style={{ fontSize: 24, color: colors.text }}>＋</Text>
        </Pressable>
      </View>
      {onLoad && <Pressable accessibilityRole="button" accessibilityLabel={`${name} 이전 기록 불러오기`} disabled={disabled} onPress={onLoad}
        style={{ padding: 16, borderRadius: 12, backgroundColor: colors.primarySoft }}>
        <Text style={{ color: colors.textSecondary }}>불러오기</Text>
      </Pressable>}
      {onCompleteAll && <Pressable accessibilityRole="checkbox"
        accessibilityLabel={`${name} 전체 세트 ${allCompleted ? '완료 취소' : '완료'}`}
        accessibilityState={{ checked: allCompleted, disabled: disabled || !count }}
        aria-checked={allCompleted} disabled={disabled || !count} onPress={onCompleteAll}
        style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: allCompleted ? colors.primary : colors.border }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: colors.onPrimary }}>✓✓</Text>
      </Pressable>}
    </View>
  );
}
