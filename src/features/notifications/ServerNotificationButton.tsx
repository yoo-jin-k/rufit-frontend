import { SwipeBackModal } from '../../components/SwipeBackModal';
import { NavBar } from '../../components/kit/Screen';
import { ServerPostDetail } from '../posts/ServerPosts';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon } from '../../components/AppIcon';
import { Button } from '../../components/Button';
import { ui } from '../../components/ScreenLayout';
import { colors } from '../../theme/tokens';
import { ServerFriendsScreen } from '../profile/ServerFriendsScreen';
import { ConfirmDialog } from '../../components/kit/Surfaces';
import { useServerNotifications } from './NotificationProvider';

/**
 * 서버 알림만 표시합니다. 다른 상세 화면처럼 오른쪽에서 밀려 들어오고,
 * 왼쪽 위 뒤로 아이콘이나 왼쪽 가장자리 밀기로 닫습니다.
 */
export function ServerNotificationButton() {
  const inbox = useServerNotifications()!;
  const [open, setOpen] = useState(false),
    [target, setTarget] = useState<string | null>(null);
  const [working, setWorking] = useState(false),
    [error, setError] = useState('');
  const [postTarget, setPostTarget] = useState<string | null>(null);
  // 차단 아이콘을 누른 알림의 보낸 사람입니다. 확인 창에서 한 번 더 묻습니다.
  const [blockTarget, setBlockTarget] = useState<{ id: string; nickname: string } | null>(null);
  const session = inbox.session;
  const locked = useRef(false);
  async function run(task: () => Promise<unknown>) {
    if (locked.current || !session?.isActive()) return false;
    locked.current = true;
    setWorking(true);
    setError('');
    try {
      await task();
      await inbox.refresh();
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '처리하지 못했습니다. 다시 시도해 주세요.');
      await inbox.refresh();
      return false;
    } finally {
      locked.current = false;
      setWorking(false);
    }
  }
  const disabled = working || inbox.busy;
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`알림, 읽지 않은 알림 ${inbox.unreadCount}개${inbox.error ? ', 조회 오류' : ''}`}
        style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        onPress={() => {
          setOpen(true);
          void inbox.refresh();
        }}
      >
        <AppIcon name="bell" color={colors.text} />
        {inbox.unreadCount > 0 && (
          <View
            testID="server-notification-dot"
            style={{
              position: 'absolute',
              right: 6,
              top: 6,
              width: 7,
              height: 7,
              borderRadius: 4,
              backgroundColor: colors.accent,
            }}
          />
        )}
      </Pressable>
      {open && (
        <SwipeBackModal
          onClose={() => {
            setOpen(false);
            setTarget(null);
          }}
          // 알림에서 연 프로필을 보는 중이면 밀기·뒤로가기는 알림 목록으로만 돌아갑니다.
          canClose={() => {
            if (!target) return true;
            setTarget(null);
            void inbox.refresh();
            return false;
          }}
        >
          {(back) => (
            <SafeAreaView style={ui.page}>
              {target && session ? (
                <ServerFriendsScreen
                  session={session}
                  nickname=""
                  initialMemberId={target}
                  onClose={() => {
                    setTarget(null);
                    void inbox.refresh();
                  }}
                />
              ) : (
                <View style={[ui.content, { flex: 1 }]}>
                  <NavBar title="알림" onLeading={back} />
                  <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ gap: 12, paddingBottom: 16 }}
                  >
                    {!!(error || inbox.error) && (
                      <Text accessibilityRole="alert" style={ui.error}>
                        {error || inbox.error}
                      </Text>
                    )}
                    <Button
                      title="알림 새로고침"
                      compact
                      secondary
                      disabled={disabled}
                      onPress={() => void inbox.refresh()}
                    />
                    {!session && <Text style={ui.muted}>로그인 상태를 확인하고 있습니다.</Text>}
                    {session && !inbox.busy && !inbox.error && !inbox.items.length && (
                      <Text style={ui.muted}>새로운 알림이 없습니다.</Text>
                    )}
                    {inbox.items.map((item) => (
                      <View key={item.id} style={ui.card}>
                        <View style={[ui.row, { alignItems: 'flex-start' }]}>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={
                              item.type === 'POST_LIKED'
                                ? `${item.actorNickname} 좋아요 받은 게시물 보기`
                                : `${item.actorNickname} 프로필 보기`
                            }
                            // 점은 눈으로만 보이므로 화면 읽기에는 '새 알림'으로 알려 줍니다.
                            accessibilityValue={item.read ? undefined : { text: '새 알림' }}
                            disabled={disabled}
                            style={{ flex: 1, gap: 4 }}
                            onPress={() =>
                              void run(async () => {
                                await session!.api.readNotification(item.id);
                                if (item.type === 'POST_LIKED' && item.postId)
                                  setPostTarget(item.postId);
                                else setTarget(item.actorId);
                              })
                            }
                          >
                            <View style={ui.row}>
                              <AppIcon name="profile" size={24} />
                              <Text style={ui.heading}>{item.actorNickname}</Text>
                              {/* 읽지 않은 알림은 글자 대신 포인트 컬러 점으로 표시합니다. */}
                              {!item.read && (
                                <View
                                  testID="unread-dot"
                                  style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: 4,
                                    backgroundColor: colors.accent,
                                  }}
                                />
                              )}
                            </View>
                            <Text style={ui.body}>
                              {item.type === 'WORKOUT_CHEER'
                                ? '운동 중인 나에게 응원을 보냈어요.'
                                : item.type === 'POST_LIKED'
                                  ? '내 게시물에 좋아요를 눌렀어요.'
                                  : item.type === 'FRIEND_REQUEST'
                                    ? '친구 신청을 보냈어요.'
                                    : '친구 신청을 수락했어요.'}
                            </Text>
                          </Pressable>
                          {/* 신고는 프로필 화면에서 합니다. 알림에서는 바로 차단만 할 수 있습니다. */}
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`${item.actorNickname} 차단하기`}
                            disabled={disabled}
                            hitSlop={4}
                            onPress={() =>
                              setBlockTarget({ id: item.actorId, nickname: item.actorNickname })
                            }
                            style={({ pressed }) => ({
                              width: 44,
                              height: 44,
                              alignItems: 'center',
                              justifyContent: 'center',
                              opacity: pressed ? 0.6 : 1,
                            })}
                          >
                            <AppIcon name="block" size={20} color={colors.muted} />
                          </Pressable>
                        </View>
                        {item.type === 'FRIEND_REQUEST' && (
                          <View style={[ui.row, { flexWrap: 'wrap' }]}>
                            <Button
                              title="수락"
                              compact
                              disabled={disabled}
                              onPress={() =>
                                void run(() =>
                                  session!.api.respondFriendRequest(item.requestId!, 'ACCEPT'),
                                )
                              }
                            />
                            <Button
                              title="거절"
                              compact
                              secondary
                              disabled={disabled}
                              onPress={() =>
                                void run(() =>
                                  session!.api.respondFriendRequest(item.requestId!, 'REJECT'),
                                )
                              }
                            />
                          </View>
                        )}
                      </View>
                    ))}
                    {inbox.hasNext && (
                      <Button
                        title="이전 알림 더 보기"
                        secondary
                        disabled={disabled}
                        onPress={() => void inbox.refresh(true)}
                      />
                    )}
                  </ScrollView>
                </View>
              )}
              {/* iOS는 떠 있는 화면 바깥의 새 모달을 띄우지 못하므로 확인 창을 알림 화면 안에 둡니다. */}
              <ConfirmDialog
                visible={!!blockTarget}
                title={`${blockTarget?.nickname ?? ''}님을 차단할까요?`}
                message="친구 관계와 대기 중인 신청이 삭제되고, 서로 친구 신청을 보낼 수 없어요."
                confirmLabel="차단하기"
                tone="danger"
                busy={working}
                onCancel={() => setBlockTarget(null)}
                onConfirm={() => {
                  const member = blockTarget;
                  if (!member) return;
                  void run(() => session!.api.blockMember(member.id)).then(() =>
                    setBlockTarget(null),
                  );
                }}
              />
            </SafeAreaView>
          )}
        </SwipeBackModal>
      )}
      {postTarget && session && (
        <ServerPostDetail session={session} id={postTarget} onClose={() => setPostTarget(null)} />
      )}
    </>
  );
}
