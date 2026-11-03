import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Switch, Text, TextInput, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import type { DirectorySettings, FriendRequests, SocialMembers, MemberProfile } from '../../api/client';
import type { RufitSession } from '../../api/session';
import { ScreenLayout, ui } from '../../components/ScreenLayout';
import { Button } from '../../components/Button';
import { ServerMemberActions } from './ServerMemberActions';

/** 계정 친구는 서버 응답으로만 표시하며 검색 노출은 사용자가 명시적으로 저장합니다. */
export function ServerFriendsScreen({ session, nickname, onClose, initialMemberId }: {
  session: RufitSession; nickname: string; onClose: () => void; initialMemberId?: string;
}) {
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [directory, setDirectory] = useState<DirectorySettings | null>(null);
  const [name, setName] = useState(nickname), [visible, setVisible] = useState(false);
  const [blocked, setBlocked] = useState<SocialMembers['items']>([]);
  const [showBlocked, setShowBlocked] = useState(false);
  const [friends, setFriends] = useState<SocialMembers['items']>([]);
  const [requests, setRequests] = useState<FriendRequests>({ incoming: [], outgoing: [] });
  const [query, setQuery] = useState(''), [results, setResults] = useState<SocialMembers['items']>([]);
  const [searched, setSearched] = useState(false), [hasNext, setHasNext] = useState(false);
  const [page, setPage] = useState(0), [searchTerm, setSearchTerm] = useState('');
  const [busy, setBusy] = useState(true), [error, setError] = useState('');
  const alive = useRef(true), locked = useRef(false), keys = useRef(new Map<string, string>());
  const active = useCallback(() => alive.current && session.isActive(), [session]);
  const refresh = useCallback(async () => {
    const settings = await session.api.directorySettings();
    const [members, pending, blocks] = settings.memberId
      ? await Promise.all([session.api.friends(), session.api.friendRequests(), session.api.blockedMembers()])
      : [{ items: [] }, { incoming: [], outgoing: [] }, { items: [] }];
    if (!active()) return;
    setDirectory(settings); setFriends(members.items); setRequests(pending); setBlocked(blocks.items);
    return settings;
  }, [session, active]);
  const run = useCallback(async (task: () => Promise<unknown>) => {
    // 중복 요청과 화면을 떠난 뒤의 응답 반영을 방지합니다.
    if (locked.current || !active()) return;
    locked.current = true; setBusy(true); setError('');
    try { await task(); return true; }
    catch (cause) { if (active()) setError(cause instanceof Error ? cause.message : '불러오지 못했습니다. 다시 시도해 주세요.'); return false; }
    finally { locked.current = false; if (active()) setBusy(false); }
  }, [active]);
  useEffect(() => {
    alive.current = true;
    locked.current = true;
    // refresh는 서버 응답을 기다린 뒤 상태를 갱신하며 동기 상태 변경은 하지 않습니다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh().then(async settings => {
      if (settings && active()) { setName(settings.nickname ?? nickname); setVisible(settings.discoverable); }
      if (initialMemberId) {
        const member = await session.api.memberProfile(initialMemberId);
        if (active()) setProfile(member);
      }
    }).catch(cause => {
      if (active()) setError(cause instanceof Error ? cause.message : '친구 목록을 불러오지 못했습니다.');
    }).finally(() => { locked.current = false; if (active()) setBusy(false); });
    return () => { alive.current = false; };
  }, [refresh, active, nickname, initialMemberId, session]);
  async function search(nextPage = 0) {
    const term = nextPage ? searchTerm : query.trim();
    await run(async () => {
      const response = await session.api.searchDirectory(term, nextPage);
      if (!active()) return;
      setResults(previous => nextPage ? [...previous, ...response.items] : response.items);
      setHasNext(response.hasNext); setPage(nextPage); setSearchTerm(term); setSearched(true);
    });
  }
  function respond(id: string, action: 'ACCEPT' | 'REJECT' | 'CANCEL') {
    void run(async () => { await session.api.respondFriendRequest(id, action); await refresh(); });
  }
  function block(memberId: string) {
    void run(async () => {
      await session.api.blockMember(memberId);
      if (active()) setProfile(null);
      if (active()) setResults(previous => previous.filter(member => member.memberId !== memberId));
      await refresh();
    });
  }
  function actions(memberId: string, memberName: string) {
    return <ServerMemberActions key={memberId} nickname={memberName} disabled={busy} onBlock={() => block(memberId)}
      onRemove={friends.some(f => f.memberId === memberId) ? () => void run(async () => {
        await session.api.removeFriend(memberId); if (active()) setProfile(null); await refresh();
      }) : undefined}
      onReport={async (id, reason) => !!(await run(async () => { await session.api.reportMember(id, memberId, reason); }))} />;
  }
  function memberLink(id: string, label: string) {
    return <Pressable accessibilityRole="button" accessibilityLabel={`${label} 프로필 보기`} disabled={busy} onPress={() => void run(async () => {
      const value = await session.api.memberProfile(id); if (active()) setProfile(value);
    })}><Text style={ui.heading}>{label}</Text></Pressable>;
  }
  if (profile) return <ScreenLayout title="친구 프로필" onBack={() => initialMemberId ? onClose() : setProfile(null)}>
    {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
    <View style={ui.card}><Text style={ui.heading}>{profile.nickname}</Text>
      <Text style={ui.body}>{{SELF:'내 프로필', FRIEND:'친구', INCOMING:'받은 친구 신청', OUTGOING:'보낸 친구 신청', NONE:'아직 친구가 아닙니다'}[profile.relationship]}</Text>
      <Text style={ui.muted}>공개된 닉네임만 표시합니다. 운동 기록과 사진 공유는 준비 중입니다.</Text>
      {actions(profile.memberId, profile.nickname)}
    </View>
  </ScreenLayout>;
  return <ScreenLayout title="친구" onBack={onClose}>
    {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
    <Button title="새로고침" secondary compact disabled={busy} onPress={() => void run(refresh)} />
    {directory && <View style={ui.card}>
      <Text style={ui.heading}>친구에게 보이는 닉네임</Text>
      <TextInput accessibilityLabel="친구 검색용 닉네임" value={name} onChangeText={setName} maxLength={30} style={ui.input} editable={!busy} />
      <View style={ui.between}><Text style={ui.body}>닉네임 검색 허용</Text><Switch accessibilityLabel="닉네임 검색 허용" value={visible} onValueChange={setVisible} disabled={busy} /></View>
      <Text style={ui.muted}>허용한 경우에만 검색에 나타납니다. 운동 기록과 사진은 공개되지 않습니다.</Text>
      <Button title="친구 설정 저장" disabled={busy || name.trim().length < 2} onPress={() => void run(async () => {
        const saved = await session.api.updateDirectory({ nickname: name.trim(), discoverable: visible, version: directory.version });
        if (active()) { setDirectory(saved); setName(saved.nickname ?? name); }
        await refresh();
      })} />
    </View>}
    {directory?.memberId ? <>
      <TextInput accessibilityLabel="친구 닉네임 검색" placeholder="닉네임을 2자 이상 입력해 주세요" value={query} onChangeText={setQuery} style={ui.input} maxLength={30} />
      <Button title="친구 검색" disabled={busy || query.trim().length < 2} onPress={() => void search()} />
      {searched && !results.length && <Text style={ui.muted}>검색 결과가 없습니다.</Text>}
      {results.map(member => {
        const existing = friends.some(friend => friend.memberId === member.memberId);
        const pending = requests.outgoing.some(request => request.targetId === member.memberId) || requests.incoming.some(request => request.requesterId === member.memberId);
        return <View key={member.memberId} style={ui.card}>{memberLink(member.memberId, member.nickname)}{actions(member.memberId, member.nickname)}
          <Button compact title={existing ? '이미 친구입니다' : pending ? '신청 처리 중' : '친구 신청'} disabled={busy || existing || pending} onPress={() => void run(async () => {
            // 네트워크 응답이 유실되더라도 동일한 신청 번호로 재시도합니다.
            const id = keys.current.get(member.memberId) ?? randomUUID(); keys.current.set(member.memberId, id);
            await session.api.sendFriendRequest(id, member.memberId); await refresh();
            keys.current.delete(member.memberId);
          })} />
        </View>;
      })}
      {hasNext && <Button title="검색 결과 더 보기" secondary disabled={busy} onPress={() => void search(page + 1)} />}
      <Text style={ui.heading}>받은 신청 · {requests.incoming.length}</Text>
      {requests.incoming.map(request => <View key={request.id} style={ui.card}>
        {memberLink(request.requesterId, request.requesterNickname)}{actions(request.requesterId, request.requesterNickname)}
        <View style={[ui.row, { flexWrap: 'wrap' }]}>
          <Button title="수락" compact disabled={busy} onPress={() => respond(request.id, 'ACCEPT')} />
          <Button title="거절" compact secondary disabled={busy} onPress={() => respond(request.id, 'REJECT')} />
        </View>
      </View>)}
      <Text style={ui.heading}>보낸 신청 · {requests.outgoing.length}</Text>
      {requests.outgoing.map(request => <View key={request.id} style={ui.card}>{memberLink(request.targetId, request.targetNickname)}{actions(request.targetId, request.targetNickname)}<Button title="신청 취소" compact secondary disabled={busy} onPress={() => respond(request.id, 'CANCEL')} /></View>)}
      <Text style={ui.heading}>친구 · {friends.length}</Text>
      {!friends.length && <Text style={ui.muted}>아직 친구가 없습니다.</Text>}
      {friends.map(friend => <View key={friend.memberId} style={ui.card}>{memberLink(friend.memberId, friend.nickname)}{actions(friend.memberId, friend.nickname)}</View>)}
      <Button title={showBlocked ? '차단 목록 접기' : `차단 목록 · ${blocked.length}`} secondary disabled={busy} onPress={() => setShowBlocked(!showBlocked)} />
      {showBlocked && blocked.map(member => <View key={member.memberId} style={ui.card}>
        <Text style={ui.body}>{member.nickname}</Text>
        <Button title="차단 해제" compact secondary disabled={busy} onPress={() => void run(async () => { await session.api.unblockMember(member.memberId); await refresh(); })} />
      </View>)}
    </> : directory && <Text style={ui.muted}>친구 설정을 저장하면 친구를 검색하고 신청할 수 있습니다.</Text>}
  </ScreenLayout>;
}
