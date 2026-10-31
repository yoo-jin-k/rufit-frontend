/** 명시적인 로컬 테스트 화면입니다. 사용자 전환은 로그인 전환이 아니며 네트워크 요청을 보내지 않습니다. */
import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text, TextInput, View } from 'react-native';
import { Button } from '../../components/Button';
import { ui } from '../../components/ScreenLayout';
import {
  changeTestRelation,
  decodeTestRelations,
  friendTestKey,
  testSelf,
  testUsers,
  type TestAction,
  type TestRelation,
} from './friendTestModel';
export function TestFriendsPanel() {
  const [actor, setActor] = useState(testSelf);
  const [query, setQuery] = useState('');
  const [records, setRecords] = useState<TestRelation[]>([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const users = [{ id: testSelf, nickname: '나 (테스트)' }, ...testUsers];
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(friendTestKey)
      .then(decodeTestRelations)
      .then((data) => {
        if (active) {
          setRecords(data);
          setReady(true);
        }
      })
      .catch(() => {
        if (active) setError('테스트 기록을 불러오지 못했습니다. 기존 자료는 유지됩니다.');
      });
    return () => {
      active = false;
    };
  }, []);
  async function act(other: string, action: TestAction) {
    if (!ready || lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      const next = changeTestRelation(records, actor, other, action);
      await AsyncStorage.setItem(friendTestKey, JSON.stringify(next));
      setRecords(next);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '테스트 기록 저장에 실패했습니다.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const incoming = records.filter((r) => r.to === actor && r.status === 'pending');
  const accepted = records.filter((r) => r.status === 'accepted' && [r.from, r.to].includes(actor));
  const nickname = (id: string) => users.find((u) => u.id === id)?.nickname ?? id;
  return (
    <View style={{ gap: 20 }}>
      <View style={ui.card}>
        <Text style={ui.heading}>로컬 친구 테스트 · 유저 5명</Text>
        <Text style={ui.muted}>
          실제 계정이 아닙니다. 신청은 이 기기에만 저장되며 다른 기기와 연결되지 않습니다. 사진과
          운동 기록은 공유되지 않습니다.
        </Text>
        <Text style={ui.body}>현재 사용자: {nickname(actor)}</Text>
        <Text style={ui.muted}>상대 사용자로 전환하면 받은 신청을 수락·거절할 수 있습니다.</Text>
        <View style={[ui.row, { flexWrap: 'wrap' }]}>
          {users.map((u) => (
            <Button
              key={u.id}
              title={u.nickname}
              accessibilityLabel={`${u.nickname}로 테스트 전환`}
              secondary={actor !== u.id}
              disabled={busy}
              compact
              onPress={() => {
                setActor(u.id);
                setQuery('');
              }}
            />
          ))}
        </View>
      </View>
      {!!error && (
        <Text accessibilityRole="alert" style={ui.error}>
          {error}
        </Text>
      )}
      <Text style={ui.heading}>테스트 친구 {accepted.length}명</Text>
      {accepted.map((r) => (
        <Text key={`${r.from}:${r.to}`} style={ui.body}>
          {nickname(r.from === actor ? r.to : r.from)} · 친구
        </Text>
      ))}
      <Text style={ui.heading}>받은 신청 {incoming.length}개</Text>
      {incoming.map((r) => (
        <View key={r.from} style={ui.card}>
          <Text style={ui.body}>{nickname(r.from)}</Text>
          <Button
            title="수락"
            accessibilityLabel={`${nickname(r.from)} 신청 수락`}
            disabled={!ready || busy}
            onPress={() => void act(r.from, 'accept')}
          />
          <Button
            title="거절"
            accessibilityLabel={`${nickname(r.from)} 신청 거절`}
            secondary
            disabled={!ready || busy}
            onPress={() => void act(r.from, 'reject')}
          />
        </View>
      ))}
      <TextInput
        accessibilityLabel="테스트 친구 닉네임 검색"
        value={query}
        onChangeText={setQuery}
        placeholder="닉네임 검색"
        style={ui.input}
      />
      {users
        .filter((u) => u.id !== actor && u.nickname.includes(query.trim()))
        .map((u) => {
          const relation = records.find(
            (r) => (r.from === actor && r.to === u.id) || (r.to === actor && r.from === u.id),
          );
          return (
            <View key={u.id} style={ui.card}>
              <Text style={ui.heading}>{u.nickname}</Text>
              {relation?.status === 'accepted' ? (
                <Text style={ui.muted}>친구입니다</Text>
              ) : relation?.to === actor ? (
                <Text style={ui.muted}>받은 신청에서 수락 또는 거절해 주세요.</Text>
              ) : (
                <Button
                  title={relation ? '신청 취소' : '친구 신청'}
                  accessibilityLabel={`${u.nickname} ${relation ? '신청 취소' : '친구 신청'}`}
                  secondary={!!relation}
                  disabled={!ready || busy}
                  onPress={() => void act(u.id, relation ? 'cancel' : 'request')}
                />
              )}
            </View>
          );
        })}
      {!users.some((u) => u.id !== actor && u.nickname.includes(query.trim())) && (
        <Text style={ui.muted}>검색 결과가 없습니다.</Text>
      )}
    </View>
  );
}
