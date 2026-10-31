import { useLikes } from '../features/profile/useLikes';
import { receivedLikes } from '../features/profile/likeModel';
import { getTestProfile } from '../features/profile/testSocialData';
import { LikedPostScreen } from '../features/profile/LikedPostScreen';
import { useProfile } from '../features/profile/useProfile';
import { TestPhoto } from './TestPhoto';
/** 모든 메뉴에서 같은 친구 신청을 표시합니다. 빨간 점은 아직 처리하지 않은 신청이 있다는 뜻입니다. */
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon } from './AppIcon';
import { FriendRow } from './FriendRow';
import { Button } from './Button';
import { colors } from '../theme/tokens';
import { useTestFriends } from '../features/profile/useTestFriends';
import { testSelf } from '../features/profile/friendTestModel';
export function NotificationButton() {
  const [open, setOpen] = useState(false);
  const { records, blocks, ready, error } = useTestFriends();
  const likes = useLikes();
  const profile = useProfile(open);
  const [target, setTarget] = useState<string | null>(null);
  const [testOpen, setTestOpen] = useState(false);
  const received = receivedLikes(likes.likes)
    .filter((like) => like.post !== 'demo-own:post-1' || !profile.value.journals.length)
    .filter(
      (like) =>
        !blocks.some(
          (b) =>
            (b.from === testSelf && b.to === like.actor) ||
            (b.to === testSelf && b.from === like.actor),
        ),
    );
  const unread = received.filter((like) => !like.read).length;
  const samplePost = profile.value.journals[0]
    ? `own:${profile.value.journals[0].workoutId}`
    : 'demo-own:post-1';
  const sampleLiked = likes.likes.some(
    (like) => like.actor === 'test-1' && like.post === samplePost,
  );
  const requests = records.filter((r) => r.to === testSelf && r.status === 'pending');
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`알림, 받은 친구 신청 ${requests.length}개, 새 좋아요 ${unread}개`}
        onPress={() => setOpen(true)}
        style={s.trigger}
      >
        <AppIcon name="bell" color={colors.text} />
        {(requests.length > 0 || unread > 0) && <View testID="notification-dot" style={s.dot} />}
      </Pressable>
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={s.page}>
          <View style={s.content}>
            <View style={s.header}>
              <Text style={s.title}>알림</Text>
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 16, paddingBottom: 24 }}>
              {!!likes.error && (
                <Text accessibilityRole="alert" style={s.error}>
                  {likes.error}
                </Text>
              )}
              {!!error && (
                <Text accessibilityRole="alert" style={s.error}>
                  {error}
                </Text>
              )}
              {!ready && !error && <Text style={s.muted}>알림을 불러오는 중입니다.</Text>}
              {ready && likes.ready && !requests.length && !received.length && (
                <Text style={s.muted}>새로운 알림이 없습니다.</Text>
              )}
              {requests.map((r) => (
                <FriendRow key={r.from} actor={testSelf} other={r.from} notification />
              ))}
              {received.map((like) => {
                const person = getTestProfile(like.actor);
                return (
                  <Pressable
                    key={`${like.actor}:${like.post}`}
                    accessibilityRole="button"
                    accessibilityLabel={`${person?.nickname ?? '사용자'}님의 좋아요 받은 게시물 보기`}
                    onPress={() => {
                      setTarget(like.post);
                      void likes.markRead(like.actor, like.post);
                    }}
                    style={s.likeRow}
                  >
                    {person ? (
                      <TestPhoto
                        tile={person.avatar}
                        size={34}
                        round
                        label={`${person.nickname} 프로필 사진`}
                      />
                    ) : (
                      <AppIcon name="heart" size={20} />
                    )}
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={s.body}>
                        {person?.nickname ?? '사용자'}님이 내 게시물에 좋아요를 눌렀습니다.
                      </Text>
                      <Text style={s.muted}>
                        {like.post === 'demo-own:post-1'
                          ? '가상 게시물 · 로컬 테스트'
                          : '오운완 게시물 보기'}
                      </Text>
                    </View>
                    {!like.read && <View style={s.unread} />}
                    <AppIcon name="chevron" size={14} />
                  </Pressable>
                );
              })}
              {__DEV__ && (
                <>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setTestOpen(!testOpen)}
                    aria-expanded={testOpen}
                    style={{ minHeight: 44, justifyContent: 'center' }}
                  >
                    <Text style={s.muted}>좋아요 알림 테스트 {testOpen ? '⌃' : '⌄'}</Text>
                  </Pressable>
                  {testOpen && (
                    <View style={{ gap: 12 }}>
                      <Text style={s.muted}>
                        민준의 좋아요를 로컬에서 재현합니다. 내 오운완이 없으면 별도 가상 게시물을
                        사용합니다.
                      </Text>
                      <Button
                        title={
                          sampleLiked ? '민준 테스트 좋아요 취소' : '민준이 내 게시물에 좋아요'
                        }
                        secondary
                        disabled={!likes.ready || likes.busy || !profile.ready}
                        onPress={() => void likes.toggle('test-1', samplePost)}
                      />
                    </View>
                  )}
                </>
              )}
            </ScrollView>
            <View style={s.footer}>
              <Button title="닫기" secondary onPress={() => setOpen(false)} />
            </View>
          </View>
        </SafeAreaView>
      </Modal>
      {target && <LikedPostScreen post={target} onClose={() => setTarget(null)} />}
    </>
  );
}
const s = StyleSheet.create({
  likeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  unread: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444' },
  trigger: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  dot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 1,
    borderColor: colors.surface,
  },
  page: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, width: '100%', maxWidth: 640, alignSelf: 'center', padding: 20, gap: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.text, fontSize: 24, lineHeight: 34, fontWeight: '700', flexShrink: 0 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  footer: { paddingTop: 8 },
  body: { color: colors.text, fontSize: 16, lineHeight: 24 },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 21 },
  error: { color: colors.danger },
  card: { backgroundColor: colors.primarySoft, padding: 18, borderRadius: 16, gap: 12 },
  actions: { flexDirection: 'row', gap: 10 },
});
