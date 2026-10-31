/** 가상 사용자의 공개 샘플 프로필입니다. 실제 기록 보관함과 분리하고 차단 상태에서는 내용을 숨깁니다. */
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TestPhoto } from '../../components/TestPhoto';
import { AppIcon } from '../../components/AppIcon';
import { FriendActions } from '../../components/FriendActions';
import { LikeButton } from '../../components/LikeButton';
import { Button } from '../../components/Button';
import { getTestProfile, type TestPost } from './testSocialData';
import { useTestFriends } from './useTestFriends';
import { blockedPair } from './friendSafetyModel';
import { testSelf } from './friendTestModel';
import { monthCells, shiftMonth } from '../calendar/model';
import { colors } from '../../theme/tokens';
export function TestUserProfile({
  userId,
  actor,
  onClose,
}: {
  userId: string;
  actor: string;
  onClose: () => void;
}) {
  const profile = getTestProfile(userId);
  const social = useTestFriends();
  const [tab, setTab] = useState('오운완');
  const [selected, setSelected] = useState<TestPost | null>(null);
  const [month, setMonth] = useState(profile?.posts[0].date.slice(0, 7) ?? '2026-10');
  const [day, setDay] = useState(profile?.posts[0].date ?? '');
  const hidden = blockedPair(social, actor, userId);
  const friend = social.records.some(
    (r) =>
      r.status === 'accepted' &&
      ((r.from === actor && r.to === userId) || (r.from === userId && r.to === actor)),
  );
  const friendCount = social.records.filter(
    (r) => r.status === 'accepted' && [r.from, r.to].includes(userId),
  ).length;
  const likeActor = actor === testSelf ? 'local-self' : actor;
  function record(post: TestPost) {
    return (
      <View key={post.id} style={s.record}>
        <Text style={s.muted}>
          {post.date} · {post.minutes}분
        </Text>
        <Text style={s.heading}>{post.exercise}</Text>
        <Text style={s.body}>
          {post.sets}세트 · {post.weight}kg × {post.reps}회
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${post.date} 오운완 보기`}
          onPress={() => setSelected(post)}
          style={{ minHeight: 44, justifyContent: 'center' }}
        >
          <Text style={s.body}>오운완 보기 ›</Text>
        </Pressable>
      </View>
    );
  }
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={s.page}>
        <View style={s.frame}>
          <View style={s.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="친구 프로필 닫기"
              onPress={onClose}
              style={s.icon}
            >
              <AppIcon name="back" size={20} />
            </Pressable>
            <Text style={[s.heading, { flex: 1 }]}>{profile?.nickname ?? '테스트 프로필'}</Text>
            {profile && (
              <FriendActions actor={actor} other={userId} name={profile.nickname} friend={friend} />
            )}
          </View>
          {!profile || hidden ? (
            <Text style={s.body}>이 프로필을 볼 수 없습니다.</Text>
          ) : selected ? (
            <ScrollView contentContainerStyle={s.content}>
              <Button title="게시물 목록으로" secondary onPress={() => setSelected(null)} />
              <TestPhoto tile={selected.tile} label={`${profile.nickname} 가상 오운완 사진`} />
              <LikeButton post={`test:${selected.id}`} actor={likeActor} />
              <Text style={s.heading}>{profile.nickname}</Text>
              <Text style={s.body}>{selected.caption}</Text>
              <Text style={s.muted}>
                {selected.date} · {selected.exercise} · {selected.sets}세트
              </Text>
              <Text style={s.muted}>가상 테스트 게시물 · 하트는 이 기기에 저장됩니다.</Text>
            </ScrollView>
          ) : (
            <ScrollView contentContainerStyle={s.content}>
              <View style={s.stats}>
                <TestPhoto
                  tile={profile.avatar}
                  size={62}
                  round
                  label={`${profile.nickname} 가상 프로필 사진`}
                />
                {[
                  ['운동한 날', profile.posts.length],
                  ['오운완', profile.posts.length],
                  ['친구', friendCount],
                ].map(([label, count]) => (
                  <View key={label} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                    <Text style={s.heading}>{count}</Text>
                    <Text style={s.muted}>{label}</Text>
                  </View>
                ))}
              </View>
              <Text style={s.body}>{profile.bio}</Text>
              <Text style={s.muted}>가상 테스트 프로필 · 사진과 운동 기록은 예시입니다.</Text>
              <View style={s.stats}>
                {['오운완', '전체 기록', '달력'].map((name) => (
                  <Pressable
                    key={name}
                    accessibilityRole="tab"
                    aria-selected={tab === name}
                    accessibilityState={{ selected: tab === name }}
                    onPress={() => setTab(name)}
                    style={{
                      flex: 1,
                      minHeight: 44,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderBottomWidth: 2,
                      borderBottomColor: tab === name ? colors.text : 'transparent',
                    }}
                  >
                    <Text style={s.body}>{name}</Text>
                  </Pressable>
                ))}
              </View>
              {tab === '오운완' ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {profile.posts.map((post) => (
                    <View key={post.id} style={{ width: '33.333333%', padding: 1 }}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${profile.nickname} ${post.date} 게시물 보기`}
                        onPress={() => setSelected(post)}
                      >
                        <TestPhoto tile={post.tile} label={`${post.date} 가상 오운완 사진`} />
                      </Pressable>
                      <LikeButton post={`test:${post.id}`} actor={likeActor} />
                    </View>
                  ))}
                </View>
              ) : tab === '전체 기록' ? (
                profile.posts.map(record)
              ) : (
                <>
                  <View style={s.header}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="이전 달"
                      onPress={() => setMonth(shiftMonth(month, -1))}
                      style={s.icon}
                    >
                      <AppIcon name="back" size={18} />
                    </Pressable>
                    <Text style={s.heading}>{month.replace('-', '년 ')}월</Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="다음 달"
                      onPress={() => setMonth(shiftMonth(month, 1))}
                      style={s.icon}
                    >
                      <AppIcon name="chevron" size={18} />
                    </Pressable>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
                      <Text key={d} style={[s.muted, { width: '14.285714%', textAlign: 'center' }]}>
                        {d}
                      </Text>
                    ))}
                    {monthCells(month).map((date, i) => (
                      <Pressable
                        key={date ?? `blank-${i}`}
                        disabled={!date}
                        accessibilityRole="button"
                        accessibilityLabel={date ?? '빈 날짜'}
                        accessibilityState={{ selected: date === day }}
                        onPress={() => date && setDay(date)}
                        style={{
                          width: '14.285714%',
                          minHeight: 44,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 12,
                          backgroundColor:
                            date && date === day ? colors.primarySoft : 'transparent',
                        }}
                      >
                        <Text style={s.body}>{date ? Number(date.slice(-2)) : ''}</Text>
                        {profile.posts.some((p) => p.date === date) && (
                          <View
                            style={{
                              width: 4,
                              height: 4,
                              borderRadius: 2,
                              backgroundColor: colors.text,
                            }}
                          />
                        )}
                      </Pressable>
                    ))}
                  </View>
                  {profile.posts
                    .filter((p) => p.date === day && p.date.startsWith(month))
                    .map(record)}
                  {!profile.posts.some((p) => p.date === day && p.date.startsWith(month)) && (
                    <Text style={s.muted}>선택한 날짜의 운동 기록이 없습니다.</Text>
                  )}
                </>
              )}
            </ScrollView>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  frame: { flex: 1, width: '100%', maxWidth: 640, alignSelf: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  icon: { width: 40, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, gap: 16, paddingBottom: 32 },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heading: { color: colors.text, fontSize: 15, lineHeight: 22, fontWeight: '700' },
  body: { color: colors.text, fontSize: 13, lineHeight: 21 },
  muted: { color: colors.muted, fontSize: 11, lineHeight: 18 },
  record: { padding: 16, borderRadius: 12, backgroundColor: colors.primarySoft, gap: 6 },
});
