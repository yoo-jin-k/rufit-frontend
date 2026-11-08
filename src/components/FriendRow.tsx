/** 친구 목록과 알림의 사진·프로필 진입·가로 동작 버튼을 공유합니다. */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FriendActions } from './FriendActions';
import { SocialButton } from './SocialButton';
import { TestPhoto } from './TestPhoto';
import { getTestProfile } from '../features/profile/testSocialData';
import { TestUserProfile } from '../features/profile/TestUserProfile';
import { useTestFriends } from '../features/profile/useTestFriends';
import { text, tokens } from '../theme/tokens';
import { Avatar } from './kit/Surfaces';
export function FriendRow({
  actor,
  other,
  notification = false,
}: {
  actor: string;
  other: string;
  notification?: boolean;
}) {
  const { records, blocks, ready, busy, act } = useTestFriends();
  const [open, setOpen] = useState(false);
  const profile = getTestProfile(other);
  const name = profile?.nickname ?? '나 (테스트)';
  const relation = records.find(
    (r) => (r.from === actor && r.to === other) || (r.to === actor && r.from === other),
  );
  const blocked = blocks.some((b) => b.from === actor && b.to === other);
  const incoming = relation?.status === 'pending' && relation.to === actor;
  const friend = relation?.status === 'accepted';
  return (
    <>
      <View style={s.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${name} 프로필 보기`}
          disabled={!profile || blocked}
          onPress={() => setOpen(true)}
          style={s.identity}
        >
          {profile ? (
            <TestPhoto tile={profile.avatar} size={44} round label={`${name} 가상 프로필 사진`} />
          ) : (
            <Avatar size="s" />
          )}
          <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
            <Text style={s.name}>{name}</Text>
            <Text style={s.status}>
              {blocked
                ? '차단됨'
                : friend
                  ? '친구'
                  : incoming
                    ? notification
                      ? '친구 신청을 보냈어요'
                      : '받은 신청'
                    : relation
                      ? '신청 보냄'
                      : '테스트 유저'}
            </Text>
          </View>
        </Pressable>
        {!blocked && !friend && (
          <View style={s.buttons}>
            {incoming ? (
              <>
                <SocialButton
                  title="거절"
                  label={`${name} 신청 거절`}
                  secondary
                  disabled={!ready || busy}
                  onPress={() => void act(actor, other, 'reject')}
                />
                <SocialButton
                  title="수락"
                  label={`${name} 신청 수락`}
                  disabled={!ready || busy}
                  onPress={() => void act(actor, other, 'accept')}
                />
              </>
            ) : (
              <SocialButton
                title={relation ? '신청 취소' : '친구 신청'}
                label={`${name} ${relation ? '신청 취소' : '친구 신청'}`}
                secondary={!!relation}
                disabled={!ready || busy}
                onPress={() => void act(actor, other, relation ? 'cancel' : 'request')}
              />
            )}
          </View>
        )}
        <FriendActions actor={actor} other={other} name={name} friend={friend} />
      </View>
      {open && <TestUserProfile userId={other} actor={actor} onClose={() => setOpen(false)} />}
    </>
  );
}
const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[8], minHeight: 64 },
  identity: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[12],
    minHeight: 44,
  },
  name: { ...text.bodyBold, color: tokens.color.text.primary },
  status: { ...text.label, color: tokens.color.text.secondary },
  buttons: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[8], flexShrink: 0 },
});
