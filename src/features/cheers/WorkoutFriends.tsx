/** 주간 달력 아래 친구 목록과 운동 중 받은 응원을 공유합니다. 기존 흑백 토큰만 사용합니다. */
import { useEffect, useState } from 'react';
import {
  AppState,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/tokens';
import { Button } from '../../components/Button';
import { AppIcon } from '../../components/AppIcon';
import { TestPhoto } from '../../components/TestPhoto';
import { useTestFriends } from '../profile/useTestFriends';
import { testSelf, testUsers } from '../profile/friendTestModel';
import { getTestProfile } from '../profile/testSocialData';
import { TestUserProfile } from '../profile/TestUserProfile';
import { friends, heartbeat, receivedCheers, sendCheer, visibleFriends } from './model';
import { useCheers } from './useCheers';
export function useWorkoutPresence(workout: string | null, enabled: boolean) {
  const { ready, data, update } = useCheers();
  useEffect(() => {
    if (!ready || !enabled) return;
    const refresh = () => {
      void update((current) =>
        heartbeat(
          current,
          testSelf,
          current.sharing && AppState.currentState === 'active' ? workout : null,
          Date.now(),
        ),
      );
    };
    refresh();
    const timer = setInterval(refresh, 30000);
    const listener = AppState.addEventListener('change', refresh);
    return () => {
      clearInterval(timer);
      listener.remove();
    };
  }, [ready, workout, enabled, data.sharing, update]);
}
export function WorkoutFriends({
  workout = null,
  enabled,
}: {
  workout?: string | null;
  enabled: boolean;
}) {
  const social = useTestFriends();
  const cheers = useCheers();
  const [now, setNow] = useState(Date.now),
    [open, setOpen] = useState(false),
    [profile, setProfile] = useState<string | null>(null),
    [testOpen, setTestOpen] = useState(false),
    [notice, setNotice] = useState('');
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => setNow(Date.now()), 0);
    return () => clearTimeout(timer);
  }, [cheers.data]);
  const members = visibleFriends(cheers.data, social, testSelf, now);
  const received = receivedCheers(cheers.data, social, testSelf).filter(
    (c) => c.workout === workout,
  );
  const disabled = !cheers.ready || !social.ready || cheers.busy || social.busy;
  async function send(to: string, target: string) {
    if (await cheers.update((d) => sendCheer(d, social, testSelf, to, target, Date.now())))
      setNotice('응원을 보냈어요. · 로컬 테스트');
  }
  if (!enabled)
    return (
      <View style={s.card}>
        <Text style={s.title}>지금 운동 중</Text>
        <Text style={s.muted}>친구 실시간 연결을 준비 중입니다.</Text>
      </View>
    );
  const person = (user: string, target: string, list = false) => {
    const p = getTestProfile(user);
    if (!p) return null;
    const sent = cheers.data.cheers.some(
      (c) => c.from === testSelf && c.to === user && c.workout === target,
    );
    return (
      <View key={user} style={list ? s.row : s.member}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${p.nickname} 프로필 보기`}
          onPress={() => setProfile(user)}
          style={s.avatar}
        >
          <TestPhoto tile={p.avatar} size={44} round label={`${p.nickname} 프로필 사진`} />
          <Text numberOfLines={1} style={s.name}>
            {p.nickname}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${p.nickname} ${sent ? '응원 보냄' : '응원하기'}`}
          disabled={disabled || sent}
          onPress={() => void send(user, target)}
          style={s.cheer}
        >
          <AppIcon name={sent ? 'check' : 'heart'} size={16} color={colors.text} />
          <Text style={s.name}>{sent ? '보냄' : '응원'}</Text>
        </Pressable>
      </View>
    );
  };
  return (
    <View style={s.card}>
      <View style={s.row}>
        <Text style={s.title}>
          {workout ? `받은 응원 ${received.length}` : `지금 운동 중 ${members.length}명`}
        </Text>
        <Pressable accessibilityRole="button" onPress={() => setOpen(true)} style={s.cheer}>
          <Text style={s.name}>모두 보기</Text>
          <AppIcon name="chevron" size={14} />
        </Pressable>
      </View>
      <Text style={s.muted}>친구 · 로컬 테스트</Text>
      {!!cheers.error && (
        <Text accessibilityRole="alert" style={s.muted}>
          {cheers.error}
        </Text>
      )}
      {!!notice && (
        <Text accessibilityLiveRegion="polite" style={s.muted}>
          {notice}
        </Text>
      )}
      {workout ? (
        received.slice(-3).map((c) => (
          <Text key={c.from} style={s.name}>
            {getTestProfile(c.from)?.nickname ?? '친구'}님이 응원했어요.
          </Text>
        ))
      ) : members.length ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12 }}
        >
          {members.map((p) => person(p.user, p.workout))}
        </ScrollView>
      ) : (
        <Text style={s.muted}>지금 운동 중인 친구가 없어요.</Text>
      )}
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)} transparent>
        <View style={s.overlay}>
          <SafeAreaView style={s.sheet}>
            <Text style={s.title}>지금 운동 중인 친구</Text>
            <ScrollView contentContainerStyle={{ gap: 12 }}>
              <Text style={s.muted}>
                실제 회원 전송 전 로컬 테스트 화면입니다. 최근 2분 안에 상태가 갱신된 친구만
                표시합니다.
              </Text>
              {members.map((p) => person(p.user, p.workout, true))}
              {!members.length && <Text style={s.muted}>운동 중인 친구가 없어요.</Text>}
              <View style={s.row}>
                <Text style={s.name}>친구에게 운동 중 상태 공개</Text>
                <Switch
                  accessibilityLabel="친구에게 운동 중 상태 공개"
                  disabled={disabled}
                  value={cheers.data.sharing}
                  trackColor={{ false: colors.border, true: colors.text }}
                  onValueChange={(sharing) =>
                    void cheers.update((d) => ({
                      ...heartbeat(d, testSelf, sharing ? workout : null, Date.now()),
                      sharing,
                    }))
                  }
                />
              </View>
              {!!workout && (
                <>
                  <Text style={s.title}>이번 운동에 받은 응원 {received.length}개</Text>
                  {received.map((c) => (
                    <Text key={c.from} style={s.name}>
                      {getTestProfile(c.from)?.nickname ?? '친구'}님이 응원했어요.
                    </Text>
                  ))}
                </>
              )}
              {!!cheers.error && (
                <Text accessibilityRole="alert" style={s.muted}>
                  {cheers.error}
                </Text>
              )}
              <Button
                title={testOpen ? '테스트 도구 접기' : '테스트 도구 펼치기'}
                secondary
                onPress={() => setTestOpen(!testOpen)}
              />
              {testOpen &&
                testUsers
                  .filter((u) => friends(social, testSelf, u.id))
                  .map((u) => (
                    <View key={u.id} style={{ gap: 8 }}>
                      <Button
                        title={`${u.nickname} 운동 시작·상태 갱신`}
                        secondary
                        disabled={disabled}
                        onPress={() =>
                          void cheers.update((d) =>
                            heartbeat(
                              d,
                              u.id,
                              d.active.find((p) => p.user === u.id)?.workout ??
                                `demo:${u.id}:${Date.now()}`,
                              Date.now(),
                            ),
                          )
                        }
                      />
                      <Button
                        title={`${u.nickname} 운동 종료`}
                        secondary
                        disabled={disabled}
                        onPress={() =>
                          void cheers.update((d) => heartbeat(d, u.id, null, Date.now()))
                        }
                      />
                      {!!workout && (
                        <Button
                          title={`${u.nickname}에게 응원 받기 테스트`}
                          secondary
                          disabled={disabled || !cheers.data.sharing}
                          onPress={() =>
                            void cheers.update((d) =>
                              sendCheer(d, social, u.id, testSelf, workout, Date.now()),
                            )
                          }
                        />
                      )}
                    </View>
                  ))}
              {testOpen && !testUsers.some((u) => friends(social, testSelf, u.id)) && (
                <Text style={s.muted}>
                  친구 목록에서 테스트 친구 신청을 수락한 뒤 확인해 주세요.
                </Text>
              )}
            </ScrollView>
            <Button title="닫기" secondary onPress={() => setOpen(false)} />
          </SafeAreaView>
        </View>
      </Modal>
      {profile && (
        <TestUserProfile userId={profile} actor={testSelf} onClose={() => setProfile(null)} />
      )}
    </View>
  );
}
const s = StyleSheet.create({
  card: { gap: 10, backgroundColor: colors.surface, borderRadius: 16, padding: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  muted: { fontSize: 12, lineHeight: 19, color: colors.muted },
  name: { fontSize: 13, color: colors.text, flexShrink: 1 },
  member: { width: 96, gap: 4, alignItems: 'center' },
  avatar: { alignItems: 'center', gap: 6, minHeight: 44, maxWidth: 150 },
  cheer: {
    minHeight: 44,
    paddingHorizontal: 10,
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
  },
  overlay: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' },
  sheet: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    maxHeight: '85%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 16,
  },
});
