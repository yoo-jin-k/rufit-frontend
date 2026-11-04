import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
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
  workout,
}: {
  live: ReturnType<typeof useServerLive>;
  session: RufitSession;
  workout?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [target, setTarget] = useState<string | null>(null);
  const received = live.data && live.data.workoutId === workout ? live.data.received : [];
  const members = live.data?.items ?? [];
  return (
    <View style={s.card}>
      <View style={s.row}>
        <Text style={ui.heading}>지금 운동 중 {live.data ? `${members.length}명` : ''}</Text>
        <Button
          compact
          secondary
          title="새로고침"
          disabled={live.busy}
          onPress={() => void live.refresh()}
        />
      </View>
      <Text style={ui.muted}>상태를 공개한 친구만 보여요. 앱을 켜둔 동안 갱신됩니다.</Text>
      <View style={s.row}>
        <Text style={[ui.body, s.flex]}>친구에게 내 운동 중 상태 공개</Text>
        <Switch
          accessibilityLabel="친구에게 내 운동 중 상태 공개"
          value={live.data?.sharing ?? false}
          disabled={live.busy || !live.data}
          trackColor={{ false: colors.border, true: colors.text }}
          onValueChange={(enabled) => void live.share(enabled)}
        />
      </View>
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
      {!!workout && live.data && (
        <View style={{ gap: 6 }}>
          <Text style={ui.heading}>이번 운동에 받은 응원 {received.length}개</Text>
          {received.map((member) => (
            <Text key={member.memberId} style={ui.body}>
              {member.nickname}님이 응원했어요.
            </Text>
          ))}
        </View>
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
