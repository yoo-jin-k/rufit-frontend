import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppModal } from '../../components/AppModal';
import { AppIcon } from '../../components/AppIcon';
import { Button } from '../../components/Button';
import { ui } from '../../components/ScreenLayout';
import { colors } from '../../theme/tokens';
import type { useServerLive } from './useServerLive';

/** 현재 운동 ID와 일치하는 응원만 표시하여 이전 운동의 수가 섞이지 않도록 합니다. */
export function ReceivedCheersButton({ live, workout }: {
  live: ReturnType<typeof useServerLive>; workout?: string;
}) {
  const [open, setOpen] = useState(false);
  const received = workout && live.data?.workoutId === workout ? live.data.received : [];
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={`이번 운동 받은 응원 ${received.length}개`}
      onPress={() => { setOpen(true); void live.refresh(); }}
      style={{ minHeight: 44, minWidth: 56, borderRadius: 24, backgroundColor: colors.surface,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 10 }}>
      <AppIcon name="heart" size={19} color={colors.text} />
      <Text style={[ui.body, { color: colors.text }]}>{received.length}</Text>
    </Pressable>
    <AppModal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
      <SafeAreaView style={ui.page}>
        {/* 목록을 스크롤해도 뒤로가기 버튼은 안전 영역 안의 상단에 유지합니다. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="받은 응원에서 뒤로가기"
            onPress={() => setOpen(false)}
            style={{ width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
            <AppIcon name="back" size={22} color={colors.text} />
          </Pressable>
          <Text style={[ui.heading, { flex: 1, paddingVertical: 12 }]}>이번 운동에 받은 응원</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16, flexGrow: 1 }}>
          <Text style={ui.heading}>{received.length}개</Text>
          {!!live.error && <Text accessibilityRole="alert" style={ui.error}>{live.error}</Text>}
          {!received.length && <Text style={ui.muted}>아직 받은 응원이 없어요.</Text>}
          {received.map(member => <Text key={member.memberId} style={ui.body}>{member.nickname}님이 응원했어요.</Text>)}
          <Button title="새로고침" secondary disabled={live.busy} onPress={() => void live.refresh()} />
        </ScrollView>
      </SafeAreaView>
    </AppModal>
  </>;
}
