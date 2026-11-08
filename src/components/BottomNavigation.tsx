/** 화면 변경만 담당합니다. 운동 저장 훅은 상위에 유지되어 탭 전환으로 기록이 초기화되지 않습니다. */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon, type IconName } from './AppIcon';
import { size, text, tokens } from '../theme/tokens';
export type MainTab = 'workout' | 'analysis' | 'profile' | 'settings';
const tabs: { id: MainTab; label: string; icon: IconName }[] = [
  { id: 'workout', label: '운동', icon: 'dumbbell' },
  { id: 'analysis', label: '분석', icon: 'chart' },
  { id: 'profile', label: '프로필', icon: 'person' },
  { id: 'settings', label: '설정', icon: 'gear' },
];
/** Figma TabBar: 메뉴 높이 49와 아래 안전 영역(아이폰 홈 표시줄 34)입니다. 선택된 메뉴만 검정·굵게 표시합니다. */
export function BottomNavigation({
  value,
  onChange,
}: {
  value: MainTab;
  onChange: (tab: MainTab) => void;
}) {
  return (
    <SafeAreaView edges={['bottom']} style={s.border}>
      <View accessibilityRole="tablist" style={s.bar}>
        {tabs.map((t) => {
          const on = value === t.id;
          return (
            <Pressable
              key={t.id}
              accessibilityRole="tab"
              accessibilityLabel={t.label}
              accessibilityState={{ selected: on }}
              aria-selected={on}
              onPress={() => onChange(t.id)}
              style={s.item}
            >
              <AppIcon name={t.icon} color={on ? tokens.color.text.primary : tokens.color.text.muted} />
              <Text style={[s.label, on && s.active]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  border: { borderTopWidth: 1, borderColor: tokens.color.line.default, backgroundColor: tokens.color.bg.default },
  bar: { flexDirection: 'row', width: '100%', maxWidth: size.contentMax, alignSelf: 'center' },
  item: {
    flex: 1,
    minHeight: tokens.size.tabbar,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingTop: 6,
  },
  label: { ...text.tab, color: tokens.color.text.muted },
  active: { fontWeight: '700', color: tokens.color.text.primary },
});
