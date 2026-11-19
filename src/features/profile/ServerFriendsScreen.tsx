import { ServerPostList } from '../posts/ServerPosts';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import type {
  DirectorySettings,
  FriendRequests,
  SocialMembers,
  MemberProfile,
} from '../../api/client';
import type { RufitSession } from '../../api/session';
import { ScreenLayout, ui } from '../../components/ScreenLayout';
import { Button } from '../../components/Button';
import { GroupLabel, ListGroup } from '../../components/kit/Surfaces';
import { text, tokens } from '../../theme/tokens';
import { ServerMemberActions } from './ServerMemberActions';
import { ProfileAvatar } from './ProfileAvatar';

/** 계정 친구는 서버 응답으로만 표시하며 검색 노출은 사용자가 명시적으로 저장합니다. */
export function ServerFriendsScreen({
  session,
  nickname,
  onClose,
  initialMemberId,
}: {
  session: RufitSession;
  nickname: string;
  onClose: () => void;
  initialMemberId?: string;
}) {
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [directory, setDirectory] = useState<DirectorySettings | null>(null);
  const [name, setName] = useState(nickname),
    [visible, setVisible] = useState(false);
  const [friends, setFriends] = useState<SocialMembers['items']>([]);
  const [requests, setRequests] = useState<FriendRequests>({ incoming: [], outgoing: [] });
  const [query, setQuery] = useState(''),
    [results, setResults] = useState<SocialMembers['items']>([]);
  const [searched, setSearched] = useState(false),
    [hasNext, setHasNext] = useState(false);
  const [page, setPage] = useState(0),
    [searchTerm, setSearchTerm] = useState('');
  const [busy, setBusy] = useState(true),
    [error, setError] = useState('');
  const alive = useRef(true),
    locked = useRef(false),
    keys = useRef(new Map<string, string>());
  const active = useCallback(() => alive.current && session.isActive(), [session]);
  const refresh = useCallback(async () => {
    const settings = await session.api.directorySettings();
    const [members, pending] = settings.memberId
      ? await Promise.all([session.api.friends(), session.api.friendRequests()])
      : [{ items: [] }, { incoming: [], outgoing: [] }];
    if (!active()) return;
    setDirectory(settings);
    setFriends(members.items);
    setRequests(pending);
    return settings;
  }, [session, active]);
  const run = useCallback(
    async (task: () => Promise<unknown>) => {
      // 중복 요청과 화면을 떠난 뒤의 응답 반영을 방지합니다.
      if (locked.current || !active()) return;
      locked.current = true;
      setBusy(true);
      setError('');
      try {
        await task();
        return true;
      } catch (cause) {
        if (active())
          setError(
            cause instanceof Error ? cause.message : '불러오지 못했습니다. 다시 시도해 주세요.',
          );
        return false;
      } finally {
        locked.current = false;
        if (active()) setBusy(false);
      }
    },
    [active],
  );
  useEffect(() => {
    alive.current = true;
    locked.current = true;
    // refresh는 서버 응답을 기다린 뒤 상태를 갱신하며 동기 상태 변경은 하지 않습니다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh()
      .then(async (settings) => {
        if (settings && active()) {
          setName(settings.nickname ?? nickname);
          setVisible(settings.discoverable);
        }
        if (initialMemberId) {
          const member = await session.api.memberProfile(initialMemberId);
          if (active()) setProfile(member);
        }
      })
      .catch((cause) => {
        if (active())
          setError(cause instanceof Error ? cause.message : '친구 목록을 불러오지 못했습니다.');
      })
      .finally(() => {
        locked.current = false;
        if (active()) setBusy(false);
      });
    return () => {
      alive.current = false;
    };
  }, [refresh, active, nickname, initialMemberId, session]);
  async function search(nextPage = 0) {
    const term = nextPage ? searchTerm : query.trim();
    await run(async () => {
      const response = await session.api.searchDirectory(term, nextPage);
      if (!active()) return;
      setResults((previous) => (nextPage ? [...previous, ...response.items] : response.items));
      setHasNext(response.hasNext);
      setPage(nextPage);
      setSearchTerm(term);
      setSearched(true);
    });
  }
  function respond(id: string, action: 'ACCEPT' | 'REJECT' | 'CANCEL') {
    void run(async () => {
      await session.api.respondFriendRequest(id, action);
      await refresh();
    });
  }
  function block(memberId: string) {
    void run(async () => {
      await session.api.blockMember(memberId);
      if (active()) setProfile(null);
      if (active())
        setResults((previous) => previous.filter((member) => member.memberId !== memberId));
      await refresh();
    });
  }
  function actions(memberId: string, memberName: string, inline = false) {
    return (
      <ServerMemberActions
        key={memberId}
        inline={inline}
        nickname={memberName}
        disabled={busy}
        onBlock={() => block(memberId)}
        onRemove={
          friends.some((f) => f.memberId === memberId)
            ? () =>
                void run(async () => {
                  await session.api.removeFriend(memberId);
                  if (active()) setProfile(null);
                  await refresh();
                })
            : undefined
        }
        onReport={async (id, reason) =>
          !!(await run(async () => {
            await session.api.reportMember(id, memberId, reason);
          }))
        }
      />
    );
  }
  /** 사진·닉네임·한 줄 소개를 한 줄로 보여 주고, 누르면 프로필을 엽니다. 오른쪽에는 작은 버튼이나 ⋯만 둡니다. */
  function memberRow(
    member: { memberId: string; nickname: string; bio?: string | null; avatar?: string | null },
    trailing: ReactNode,
  ) {
    return (
      <View key={member.memberId} style={s.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${member.nickname} 프로필 보기`}
          disabled={busy}
          style={s.member}
          onPress={() =>
            void run(async () => {
              const value = await session.api.memberProfile(member.memberId);
              if (active()) setProfile(value);
            })
          }
        >
          <ProfileAvatar photo={member.avatar} size={40} label={`${member.nickname} 프로필 사진`} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text numberOfLines={1} style={s.name}>
              {member.nickname}
            </Text>
            {!!member.bio && (
              <Text numberOfLines={1} style={s.bio}>
                {member.bio}
              </Text>
            )}
          </View>
        </Pressable>
        <View style={s.trailing}>{trailing}</View>
      </View>
    );
  }
  const small = { size: 'sm' as const, fullWidth: false, disabled: busy };
  if (profile)
    return (
      <ScreenLayout
        safeTop
        title="친구 프로필"
        onBack={() => (initialMemberId ? onClose() : setProfile(null))}
      >
        {!!error && (
          <Text accessibilityRole="alert" style={ui.error}>
            {error}
          </Text>
        )}
        <View style={ui.card}>
          <View style={{ alignItems: 'center', gap: 8 }}>
            <ProfileAvatar
              photo={profile.avatar}
              size={96}
              label={`${profile.nickname} 프로필 사진`}
            />
            <Text style={ui.heading}>{profile.nickname}</Text>
            {!!profile.bio && <Text style={[ui.body, { textAlign: 'center' }]}>{profile.bio}</Text>}
            <Text style={ui.muted}>
              {
                {
                  SELF: '내 프로필',
                  FRIEND: '친구',
                  INCOMING: '받은 친구 신청',
                  OUTGOING: '보낸 친구 신청',
                  NONE: '아직 친구가 아닙니다',
                }[profile.relationship]
              }
            </Text>
            {actions(profile.memberId, profile.nickname, true)}
          </View>
          <Text style={ui.muted}>
            공개 프로필(사진·한 줄 소개)과 친구에게 공개한 오운완을 표시합니다.
          </Text>
          <ServerPostList session={session} memberId={profile.memberId} />
        </View>
      </ScreenLayout>
    );
  return (
    <ScreenLayout safeTop title="친구" onBack={onClose}>
      {!!error && (
        <Text accessibilityRole="alert" style={ui.error}>
          {error}
        </Text>
      )}
      <View style={{ alignItems: 'flex-end' }}>
        <Button title="새로고침" variant="soft" {...small} onPress={() => void run(refresh)} />
      </View>
      {directory && (
        <View style={ui.card}>
          <Text style={ui.heading}>친구에게 보이는 닉네임</Text>
          <TextInput
            accessibilityLabel="친구 검색용 닉네임"
            value={name}
            onChangeText={setName}
            maxLength={30}
            style={ui.input}
            editable={!busy}
          />
          <View style={ui.between}>
            <Text style={ui.body}>닉네임 검색 허용</Text>
            <Switch
              accessibilityLabel="닉네임 검색 허용"
              value={visible}
              onValueChange={setVisible}
              disabled={busy}
            />
          </View>
          <Text style={ui.muted}>
            허용한 경우에만 검색에 나타납니다. 프로필 사진과 한 줄 소개가 함께 보이며, 운동 기록과
            운동 장소는 공개되지 않습니다.
          </Text>
          <Button
            title="친구 설정 저장"
            size="md"
            disabled={busy || name.trim().length < 2}
            onPress={() =>
              void run(async () => {
                const saved = await session.api.updateDirectory({
                  nickname: name.trim(),
                  discoverable: visible,
                  version: directory.version,
                });
                if (active()) {
                  setDirectory(saved);
                  setName(saved.nickname ?? name);
                }
                await refresh();
              })
            }
          />
        </View>
      )}
      {directory?.memberId ? (
        <>
          <View style={ui.row}>
            <TextInput
              accessibilityLabel="친구 닉네임 검색"
              placeholder="닉네임 2자 이상"
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => {
                if (!busy && query.trim().length >= 2) void search();
              }}
              returnKeyType="search"
              style={[ui.input, { flex: 1 }]}
              maxLength={30}
            />
            <Button
              title="검색"
              accessibilityLabel="친구 검색"
              size="md"
              fullWidth={false}
              disabled={busy || query.trim().length < 2}
              onPress={() => void search()}
            />
          </View>
          {searched && !results.length && <Text style={ui.muted}>검색 결과가 없습니다.</Text>}
          {results.length > 0 && (
            <ListGroup>
              {results.map((member) => {
                const existing = friends.some((friend) => friend.memberId === member.memberId);
                const pending =
                  requests.outgoing.some((request) => request.targetId === member.memberId) ||
                  requests.incoming.some((request) => request.requesterId === member.memberId);
                return memberRow(
                  member,
                  <>
                    <Button
                      title={existing ? '친구' : pending ? '신청됨' : '친구 신청'}
                      accessibilityLabel={
                        existing ? '이미 친구입니다' : pending ? '신청 처리 중' : '친구 신청'
                      }
                      variant={existing || pending ? 'soft' : 'primary'}
                      {...small}
                      disabled={busy || existing || pending}
                      onPress={() =>
                        void run(async () => {
                          // 네트워크 응답이 유실되더라도 동일한 신청 번호로 재시도합니다.
                          const id = keys.current.get(member.memberId) ?? randomUUID();
                          keys.current.set(member.memberId, id);
                          await session.api.sendFriendRequest(id, member.memberId);
                          await refresh();
                          keys.current.delete(member.memberId);
                        })
                      }
                    />
                    {actions(member.memberId, member.nickname)}
                  </>,
                );
              })}
            </ListGroup>
          )}
          {hasNext && (
            <Button
              title="검색 결과 더 보기"
              variant="soft"
              size="md"
              disabled={busy}
              onPress={() => void search(page + 1)}
            />
          )}
          {requests.incoming.length > 0 && (
            <GroupLabel>{`받은 신청 · ${requests.incoming.length}`}</GroupLabel>
          )}
          {requests.incoming.length > 0 && (
            <ListGroup>
              {requests.incoming.map((request) =>
                memberRow(
                  { memberId: request.requesterId, nickname: request.requesterNickname },
                  <>
                    <Button title="수락" {...small} onPress={() => respond(request.id, 'ACCEPT')} />
                    <Button
                      title="거절"
                      variant="soft"
                      {...small}
                      onPress={() => respond(request.id, 'REJECT')}
                    />
                    {actions(request.requesterId, request.requesterNickname)}
                  </>,
                ),
              )}
            </ListGroup>
          )}
          {requests.outgoing.length > 0 && (
            <GroupLabel>{`보낸 신청 · ${requests.outgoing.length}`}</GroupLabel>
          )}
          {requests.outgoing.length > 0 && (
            <ListGroup>
              {requests.outgoing.map((request) =>
                memberRow(
                  { memberId: request.targetId, nickname: request.targetNickname },
                  <>
                    <Button
                      title="취소"
                      accessibilityLabel="신청 취소"
                      variant="soft"
                      {...small}
                      onPress={() => respond(request.id, 'CANCEL')}
                    />
                    {actions(request.targetId, request.targetNickname)}
                  </>,
                ),
              )}
            </ListGroup>
          )}
          <GroupLabel>{`친구 · ${friends.length}`}</GroupLabel>
          {friends.length ? (
            <ListGroup>
              {friends.map((friend) =>
                memberRow(friend, actions(friend.memberId, friend.nickname)),
              )}
            </ListGroup>
          ) : (
            <Text style={ui.muted}>아직 친구가 없습니다.</Text>
          )}
        </>
      ) : (
        directory && (
          <Text style={ui.muted}>친구 설정을 저장하면 친구를 검색하고 신청할 수 있습니다.</Text>
        )
      )}
    </ScreenLayout>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[8],
    minHeight: 64,
    // 묶음(ListGroup)이 좌우 여백을 이미 주므로 위아래만 띄웁니다. ⋯는 오른쪽 끝에 붙입니다.
    marginRight: -tokens.space[8],
    paddingVertical: tokens.space[8],
  },
  member: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: tokens.space[12] },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[4] },
  name: { ...text.bodyMedium, color: tokens.color.text.primary },
  bio: { ...text.caption, color: tokens.color.text.secondary },
});
