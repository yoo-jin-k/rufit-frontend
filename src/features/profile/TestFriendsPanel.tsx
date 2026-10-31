/** 명시적인 로컬 테스트 화면입니다. 사용자 전환은 로그인 전환이 아니며 네트워크 요청을 보내지 않습니다. */
import { useState } from 'react';
import { useTestFriends } from './useTestFriends';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../../components/Button';
import { colors } from '../../theme/tokens';
import { AppIcon } from '../../components/AppIcon';
import { ui } from '../../components/ScreenLayout';
import { testSelf, testUsers, type TestAction } from './friendTestModel';
export function TestFriendsPanel() {
  const [actor, setActor] = useState(testSelf);
  const [query, setQuery] = useState('');
  const [toolsOpen, setToolsOpen] = useState(false);
  const { records, ready, busy, error, act: change } = useTestFriends();
  const users = [{ id: testSelf, nickname: '나 (테스트)' }, ...testUsers];
  const act = (other: string, action: TestAction) => change(actor, other, action);
  const matches = users.filter((u) => u.id !== actor && u.nickname.includes(query.trim()));
  return (
    <View style={{ gap: 12 }}>
      <TextInput
        accessibilityLabel="테스트 친구 닉네임 검색"
        value={query}
        onChangeText={setQuery}
        placeholder="친구 닉네임 검색"
        style={ui.input}
      />
      {!!error && (
        <Text accessibilityRole="alert" style={ui.error}>
          {error}
        </Text>
      )}
      {/* 검색 결과와 신청 상태를 한 목록에서 보여줍니다. 받은 신청도 해당 사용자 행에서 처리합니다. */}
      <View>
        {matches.map((u) => {
          const relation = records.find(
            (r) => (r.from === actor && r.to === u.id) || (r.to === actor && r.from === u.id),
          );
          const incoming = relation?.status === 'pending' && relation.to === actor;
          return (
            <View key={u.id} style={s.row}>
              <View style={s.avatar}>
                <AppIcon name="profile" size={24} />
              </View>
              <View style={s.identity}>
                <Text style={ui.body}>{u.nickname}</Text>
                <Text style={ui.muted}>
                  {relation?.status === 'accepted'
                    ? '친구'
                    : incoming
                      ? '받은 신청'
                      : relation
                        ? '신청 보냄'
                        : '테스트 유저'}
                </Text>
              </View>
              <View style={s.actions}>
                {relation?.status === 'accepted' ? (
                  <AppIcon name="check" />
                ) : incoming ? (
                  <>
                    <Button
                      title="수락"
                      compact
                      accessibilityLabel={`${u.nickname} 신청 수락`}
                      disabled={!ready || busy}
                      onPress={() => void act(u.id, 'accept')}
                    />
                    <Button
                      title="거절"
                      compact
                      secondary
                      accessibilityLabel={`${u.nickname} 신청 거절`}
                      disabled={!ready || busy}
                      onPress={() => void act(u.id, 'reject')}
                    />
                  </>
                ) : (
                  <Button
                    title={relation ? '취소' : '친구 신청'}
                    compact
                    secondary={!!relation}
                    accessibilityLabel={`${u.nickname} ${relation ? '신청 취소' : '친구 신청'}`}
                    disabled={!ready || busy}
                    onPress={() => void act(u.id, relation ? 'cancel' : 'request')}
                  />
                )}
              </View>
            </View>
          );
        })}
        {!matches.length && <Text style={ui.muted}>검색 결과가 없습니다.</Text>}
      </View>
      {/* 테스트 도구는 목록 아래에서 접어두어 실제 친구 화면을 가리지 않습니다. */}
      <Pressable
        accessibilityRole="button"
        aria-expanded={toolsOpen}
        onPress={() => setToolsOpen(!toolsOpen)}
        style={{ paddingVertical: 12 }}
      >
        <Text style={ui.muted}>로컬 테스트 · 사용자 전환 {toolsOpen ? '⌃' : '⌄'}</Text>
      </Pressable>
      {toolsOpen && (
        <View style={ui.card}>
          <Text style={ui.muted}>
            이 기기에서만 동작합니다. 실제 계정과 기록은 공유되지 않습니다.
          </Text>
          <Text style={ui.body}>현재 사용자: {users.find((u) => u.id === actor)?.nickname}</Text>
          {users.map((u) => (
            <Button
              key={u.id}
              title={u.nickname}
              accessibilityLabel={`${u.nickname}로 테스트 전환`}
              secondary={actor !== u.id}
              disabled={busy}
              onPress={() => {
                setActor(u.id);
                setQuery('');
                setToolsOpen(false);
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identity: { flex: 1, minWidth: 0, gap: 4 },
  actions: { maxWidth: 104, gap: 6 },
});
