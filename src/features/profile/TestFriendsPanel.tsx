/** 명시적인 로컬 테스트 화면입니다. 사용자 전환은 로그인 전환이 아니며 네트워크 요청을 보내지 않습니다. */
import { useState } from 'react';
import { useTestFriends } from './useTestFriends';
import { Pressable, Text, TextInput, View } from 'react-native';
import { FriendRow } from '../../components/FriendRow';
import { Button } from '../../components/Button';
import { ui } from '../../components/ScreenLayout';
import { testSelf, testUsers } from './friendTestModel';
export function TestFriendsPanel() {
  const [actor, setActor] = useState(testSelf);
  const [query, setQuery] = useState('');
  const [toolsOpen, setToolsOpen] = useState(false);
  const { blocks, busy, error } = useTestFriends();
  const users = [{ id: testSelf, nickname: '나 (테스트)' }, ...testUsers];
  const matches = users.filter(
    (u) =>
      u.id !== actor &&
      u.nickname.includes(query.trim()) &&
      !blocks.some((b) => b.from === u.id && b.to === actor),
  );
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
        {matches.map((u) => (
          <FriendRow key={u.id} actor={actor} other={u.id} />
        ))}
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
