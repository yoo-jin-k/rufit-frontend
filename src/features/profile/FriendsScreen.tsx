/** 친구 API가 연결되기 전에는 가짜 회원·신청 성공을 표시하지 않습니다. 검색 화면과 연결 상태를 분리합니다. */
import { TestFriendsPanel } from './TestFriendsPanel';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { ScreenLayout, ui } from '../../components/ScreenLayout';
import { Button } from '../../components/Button';
export function FriendsScreen({ onClose }: { onClose: () => void }) {
  const [search, setSearch] = useState(false),
    [query, setQuery] = useState('');
  return (
    <ScreenLayout
      safeTop
      title={search ? '친구 찾기' : '친구'}
      onBack={() => (search ? setSearch(false) : onClose())}
    >
      {__DEV__ ? (
        <TestFriendsPanel />
      ) : (
        <>
          <View style={ui.card}>
            <Text style={ui.body}>친구에게 보이는 내 기록</Text>
            <Text style={ui.muted}>나만 보기 · 아직 공유되는 기록이 없습니다.</Text>
          </View>
          {search ? (
            <>
              <TextInput
                accessibilityLabel="친구 닉네임 검색"
                value={query}
                onChangeText={setQuery}
                placeholder="닉네임 검색"
                style={ui.input}
              />
              <Text style={ui.muted}>친구 검색은 계정 서비스 연결 후 이용할 수 있습니다.</Text>
            </>
          ) : (
            <>
              <View style={ui.between}>
                <Text style={ui.heading}>받은 신청</Text>
                <Text style={ui.muted}>서비스 연결 대기</Text>
              </View>
              <Text style={ui.muted}>
                친구 신청 내역을 불러오려면 계정 서비스 연결이 필요합니다.
              </Text>
              <Button title="친구 찾기" secondary onPress={() => setSearch(true)} />
            </>
          )}
        </>
      )}
    </ScreenLayout>
  );
}
