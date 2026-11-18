import { AppModal as Modal } from '../../components/AppModal';
import { useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RufitSession } from '../../api/session';
import { Button } from '../../components/Button';
import { AppIcon } from '../../components/AppIcon';
import { ui } from '../../components/ScreenLayout';
import { colors } from '../../theme/tokens';
import { ServerFriendsScreen } from '../profile/ServerFriendsScreen';
import { ProfileAvatar } from '../profile/ProfileAvatar';
import { unitLabel, volumeNumber } from '../units/model';
import { useWeightUnit } from '../units/UnitProvider';
import type { useServerLive } from './useServerLive';
import { s } from './ServerWorkoutFriends.styles';
import { groupLiveMembers, type LiveMember } from './liveGroups';

/** 달력 아래와 운동 중 화면에서 같은 서버 상태를 표시합니다. 전송 성공 후에만 보냄으로 표시합니다. */
export function ServerWorkoutFriends({
  live,
  session,
  onToast,
}: {
  live: ReturnType<typeof useServerLive>;
  session: RufitSession;
  /** 응원 보냄·취소 안내를 화면 아래에 1초 정도 띄웁니다. */
  onToast?: (message: string) => void;
}) {
  const reduceMotion = useReduceMotion();
  // 새로고침 아이콘 회전 값입니다. 누를 때마다 한 바퀴씩 늘려 끊김 없이 이어서 돕니다.
  const [spin] = useState(() => new Animated.Value(0));
  const turns = useRef(0);
  const [spinning, setSpinning] = useState(false);
  const rotate = () =>
    new Promise<void>((resolve) => {
      turns.current += 1;
      Animated.timing(spin, {
        toValue: turns.current,
        duration: 700,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: Platform.OS !== 'web',
      }).start(() => resolve());
    });
  /** 직접 누른 새로고침만 회전합니다. 불러오기가 길어지면 끝날 때까지 한 바퀴씩 더 돕니다. */
  async function refreshWithSpin() {
    if (spinning) return;
    if (reduceMotion) return void live.refresh();
    setSpinning(true);
    let done = false;
    const loading = live.refresh().finally(() => {
      done = true;
    });
    do await rotate();
    while (!done);
    await loading;
    setSpinning(false);
  }
  async function toggleCheer(member: LiveMember) {
    const ok = await live.toggleCheer(member.memberId, member.workoutId, member.sent);
    if (ok)
      onToast?.(
        member.sent
          ? `${member.nickname}님 응원을 취소했어요.`
          : `${member.nickname}님에게 응원했어요!`,
      );
  }
  const [expanded, setExpanded] = useState(false);
  const [target, setTarget] = useState<string | null>(null);
  const members = live.data?.items ?? [];
  const { unit } = useWeightUnit();
  const groups = groupLiveMembers(members);
  // 접힌 상태에서는 친구와 다른 회원을 합쳐 3명까지만 보여 줍니다.
  const limit = expanded ? 100 : 3;
  const shownFriends = groups.friends.slice(0, limit);
  const shownOthers = groups.others.slice(0, Math.max(0, limit - shownFriends.length));
  const row = (member: LiveMember) => (
    <View key={member.memberId} style={s.memberRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${member.nickname} 프로필 보기`}
        style={[s.profile, s.flex]}
        onPress={() => setTarget(member.memberId)}
      >
        <ProfileAvatar photo={member.avatar} size={40} label={`${member.nickname} 프로필 사진`} />
        <View style={s.flex}>
          <Text numberOfLines={1} style={ui.body}>
            {member.nickname}
          </Text>
          <Text style={ui.muted}>
            볼륨 {volumeNumber(member.volume ?? 0, unit)}
            {unitLabel(unit)}
          </Text>
        </View>
      </Pressable>
      {/* 응원 버튼은 글자 없이 팔근육 이모지로 오른쪽 끝에 둡니다. 보낸 뒤에는 진하게 채워 표시하고, 다시 누르면 취소합니다. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${member.nickname}님 ${member.sent ? '응원 취소하기' : '응원하기'}`}
        accessibilityState={{ disabled: live.busy, selected: member.sent }}
        disabled={live.busy}
        hitSlop={4}
        style={({ pressed }) => [s.cheer, member.sent && s.cheerSent, pressed && s.cheerPressed]}
        onPress={() => void toggleCheer(member)}
      >
        <Text style={s.cheerEmoji}>💪</Text>
      </Pressable>
    </View>
  );
  return (
    <View style={s.card}>
      {/* 44pt 터치 영역은 유지하되 위아래 여백을 줄여 아래 안내 문구가 제목에 붙도록 합니다. */}
      <View style={[s.row, { flexWrap: 'nowrap', marginVertical: -10 }]}>
        {/* 새로고침 아이콘이 제목 오른쪽 끝에 붙도록 줄바꿈 없이 배치합니다. */}
        <Text style={[ui.heading, { flex: 1 }]}>
          지금 운동 중 {live.data ? `${members.length}명` : ''}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="지금 운동 중 새로고침"
          accessibilityState={{ disabled: live.busy }}
          disabled={live.busy}
          hitSlop={8}
          style={{ minWidth: 44, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' }}
          onPress={() => void refreshWithSpin()}
        >
          <Animated.View
            style={{
              transform: [
                {
                  rotate: spin.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg'],
                    extrapolate: 'extend',
                  }),
                },
              ],
            }}
          >
            <AppIcon name="refresh" size={22} color={live.busy ? colors.muted : colors.text} />
          </Animated.View>
        </Pressable>
      </View>
      {!!live.error && (
        <Text accessibilityRole="alert" style={ui.error}>
          {live.error}
        </Text>
      )}
      {!live.data && !live.error && <Text style={ui.muted}>친구 상태를 확인하고 있습니다.</Text>}
      {live.data && !members.length && <Text style={ui.muted}>지금 운동 중인 회원이 없어요.</Text>}
      {!!shownFriends.length && <Text style={s.group}>친구 · {groups.friends.length}</Text>}
      {shownFriends.map(row)}
      {!!shownOthers.length && <Text style={s.group}>다른 회원 · {groups.others.length}</Text>}
      {shownOthers.map(row)}
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
