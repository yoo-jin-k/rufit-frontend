import { ServerPostDetail } from '../posts/ServerPosts';
import { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon } from '../../components/AppIcon';
import { Button } from '../../components/Button';
import { ui } from '../../components/ScreenLayout';
import { colors } from '../../theme/tokens';
import { ServerFriendsScreen } from '../profile/ServerFriendsScreen';
import { ServerMemberActions } from '../profile/ServerMemberActions';
import { useServerNotifications } from './NotificationProvider';

/** 서버 알림만 표시하며 닫기 버튼은 긴 목록과 무관하게 하단에 유지합니다. */
export function ServerNotificationButton() {
  const inbox = useServerNotifications()!;
  const [open, setOpen] = useState(false),
    [target, setTarget] = useState<string | null>(null);
  const [working, setWorking] = useState(false),
    [error, setError] = useState('');
  const [postTarget, setPostTarget] = useState<string | null>(null);
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
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: colors.danger,
            }}
          />
        )}
      </Pressable>
      <Modal
        visible={open}
        animationType="slide"
        onRequestClose={() => {
          setOpen(false);
          setTarget(null);
        }}
      >
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
              <Text style={ui.title}>알림</Text>
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
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        item.type === 'POST_LIKED'
                          ? `${item.actorNickname} 좋아요 받은 게시물 보기`
                          : `${item.actorNickname} 프로필 보기`
                      }
                      disabled={disabled}
                      onPress={() =>
                        void run(async () => {
                          await session!.api.readNotification(item.id);
                          if (item.type === 'POST_LIKED' && item.postId) setPostTarget(item.postId);
                          else setTarget(item.actorId);
                        })
                      }
                    >
                      <View style={ui.row}>
                        <AppIcon name="profile" size={24} />
                        <Text style={[ui.heading, { flex: 1 }]}>{item.actorNickname}</Text>
                        {!item.read && <Text style={ui.muted}>새 알림</Text>}
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
                    <ServerMemberActions
                      nickname={item.actorNickname}
                      disabled={disabled}
                      onBlock={() => void run(() => session!.api.blockMember(item.actorId))}
                      onReport={(id, reason) =>
                        run(() => session!.api.reportMember(id, item.actorId, reason))
                      }
                    />
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
              <Button title="닫기" secondary onPress={() => setOpen(false)} />
            </View>
          )}
        </SafeAreaView>
      </Modal>
      {postTarget && session && (
        <ServerPostDetail session={session} id={postTarget} onClose={() => setPostTarget(null)} />
      )}
    </>
  );
}
