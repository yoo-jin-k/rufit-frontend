/** 모든 메뉴에서 같은 친구 신청을 표시합니다. 빨간 점은 아직 처리하지 않은 신청이 있다는 뜻입니다. */
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon } from './AppIcon';
import { Button } from './Button';
import { colors } from '../theme/tokens';
import { useTestFriends } from '../features/profile/useTestFriends';
import { testSelf, testUsers } from '../features/profile/friendTestModel';
export function NotificationButton() {
  const [open, setOpen] = useState(false);
  const { records, ready, busy, error, act } = useTestFriends();
  const requests = records.filter((r) => r.to === testSelf && r.status === 'pending');
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`알림, 받은 친구 신청 ${requests.length}개`}
        onPress={() => setOpen(true)}
        style={s.trigger}
      >
        <AppIcon name="bell" color={colors.text} />
        {requests.length > 0 && <View testID="notification-dot" style={s.dot} />}
      </Pressable>
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={s.page}>
          <View style={s.content}>
            <View style={s.header}>
              <Text style={s.title}>알림</Text>
              <Button title="닫기" compact secondary onPress={() => setOpen(false)} />
            </View>
            <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 24 }}>
              {!!error && (
                <Text accessibilityRole="alert" style={s.error}>
                  {error}
                </Text>
              )}
              {!ready && !error && <Text style={s.muted}>알림을 불러오는 중입니다.</Text>}
              {ready && !requests.length && <Text style={s.muted}>새로운 알림이 없습니다.</Text>}
              {requests.map((r) => {
                const name = testUsers.find((u) => u.id === r.from)?.nickname ?? '테스트 사용자';
                return (
                  <View key={r.from} style={s.card}>
                    <Text style={s.body}>{name}님이 친구 신청을 보냈습니다.</Text>
                    <Text style={s.muted}>로컬 테스트 알림</Text>
                    <View style={s.actions}>
                      <View style={{ flex: 1 }}>
                        <Button
                          title="수락"
                          accessibilityLabel={`${name} 알림에서 신청 수락`}
                          disabled={busy}
                          onPress={() => void act(testSelf, r.from, 'accept')}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Button
                          title="거절"
                          accessibilityLabel={`${name} 알림에서 신청 거절`}
                          secondary
                          disabled={busy}
                          onPress={() => void act(testSelf, r.from, 'reject')}
                        />
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}
const s = StyleSheet.create({
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
  title: { color: colors.text, fontSize: 24, fontWeight: '700' },
  body: { color: colors.text, fontSize: 16, lineHeight: 24 },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 21 },
  error: { color: colors.danger },
  card: { backgroundColor: colors.primarySoft, padding: 18, borderRadius: 16, gap: 12 },
  actions: { flexDirection: 'row', gap: 10 },
});
