/** 화면 변경만 담당합니다. 운동 저장 훅은 상위에 유지되어 탭 전환으로 기록이 초기화되지 않습니다. */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon, type IconName } from './AppIcon';
import { colors, size } from '../theme/tokens';
export type MainTab = 'workout' | 'analysis' | 'profile' | 'settings';
const tabs: { id: MainTab; label: string; icon: IconName }[] = [
  { id: 'workout', label: '운동', icon: 'workout' },
  { id: 'analysis', label: '분석', icon: 'analysis' },
  { id: 'profile', label: '프로필', icon: 'profile' },
  { id: 'settings', label: '설정', icon: 'settings' },
];
export function BottomNavigation({
  value,
  onChange,
}: {
  value: MainTab;
  onChange: (tab: MainTab) => void;
}) {
  return (
    <View style={s.border}>
      <View style={s.bar}>
        {tabs.map((t) => (
          <Pressable
            key={t.id}
            accessibilityRole="tab"
            accessibilityLabel={t.label}
            accessibilityState={{ selected: value === t.id }}
            aria-selected={value === t.id}
            onPress={() => onChange(t.id)}
            style={s.item}
          >
            <AppIcon name={t.icon} color={value === t.id ? colors.text : colors.muted} />
            <Text style={[s.label, value === t.id && s.active]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  border: { borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  bar: { flexDirection: 'row', width: '100%', maxWidth: size.contentMax, alignSelf: 'center' },
  item: {
    flex: 1,
    minHeight: 66,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
  },
  label: { fontSize: 11, color: colors.muted },
  active: { fontWeight: '700', color: colors.text },
});
