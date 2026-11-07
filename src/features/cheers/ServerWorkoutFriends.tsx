import { AppModal as Modal } from '../../components/AppModal';
import { useState } from 'react';
import {  Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RufitSession } from '../../api/session';
import { Button } from '../../components/Button';
import { AppIcon } from '../../components/AppIcon';
import { ui } from '../../components/ScreenLayout';
import { colors } from '../../theme/tokens';
import { ServerFriendsScreen } from '../profile/ServerFriendsScreen';
import type { useServerLive } from './useServerLive';

/** 달력 아래와 운동 중 화면에서 같은 서버 상태를 표시합니다. 전송 성공 후에만 보냄으로 표시합니다. */
export function ServerWorkoutFriends({
  live,
  session,
}: {
  live: ReturnType<typeof useServerLive>;
  session: RufitSession;
}) {
  const [expanded, setExpanded] = useState(false);
  const [target, setTarget] = useState<string | null>(null);
  const members = live.data?.items ?? [];
  return (
    <View style={s.card}>
      <View style={s.row}>
        <Text style={[ui.heading, { flex: 1 }]}>지금 운동 중 {live.data ? `${members.length}명` : ''}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="지금 운동 중 새로고침"
          accessibilityState={{ disabled: live.busy }} disabled={live.busy}
          style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
          onPress={() => void live.refresh()}>
          <AppIcon name="refresh" size={18} color={live.busy ? colors.muted : colors.text} />
        </Pressable>
      </View>
      <Text style={ui.muted}>상태를 공개한 친구만 보여요. 앱을 켜둔 동안 갱신됩니다.</Text>
      {!!live.error && (
        <Text accessibilityRole="alert" style={ui.error}>
          {live.error}
        </Text>
      )}
      {!live.data && !live.error && <Text style={ui.muted}>친구 상태를 확인하고 있습니다.</Text>}
      {live.data && !members.length && <Text style={ui.muted}>지금 운동 중인 친구가 없어요.</Text>}
      {members.slice(0, expanded ? 100 : 3).map((member) => (
        <View key={member.memberId} style={s.row}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${member.nickname} 프로필 보기`}
            style={[s.profile, s.flex]}
            onPress={() => setTarget(member.memberId)}
          >
            <AppIcon name="profile" size={22} />
            <Text style={[ui.body, s.flex]}>{member.nickname}</Text>
          </Pressable>
          <Button
            compact
            secondary
            title={member.sent ? '응원 보냄' : '응원하기'}
            disabled={live.busy || member.sent}
            onPress={() => void live.cheer(member.memberId, member.workoutId)}
          />
        </View>
      ))}
      {members.length > 3 && (
        <Button
          compact
          secondary
          title={expanded ? '접기' : '모두 보기'}
          onPress={() => setExpanded(!expanded)}
        />
      )}
      <Modal visible={!!target} onRequestClose={() => setTarget(null)} animationType="slide">
        <SafeAreaView style={ui.page}>
          <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
            {target && (
              <ServerFriendsScreen
                session={session}
                nickname=""
                initialMemberId={target}
                onClose={() => {
                  setTarget(null);
                  void live.refresh();
                }}
              />
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
const s = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, gap: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'wrap',
  },
  flex: { flex: 1, minWidth: 100 },
  profile: { flexDirection: 'row', gap: 8, alignItems: 'center', minHeight: 44 },
});
