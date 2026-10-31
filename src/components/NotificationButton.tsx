/** 모든 메뉴에서 같은 친구 신청을 표시합니다. 빨간 점은 아직 처리하지 않은 신청이 있다는 뜻입니다. */
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon } from './AppIcon';
import { FriendRow } from './FriendRow';
import { Button } from './Button';
import { colors } from '../theme/tokens';
import { useTestFriends } from '../features/profile/useTestFriends';
import { testSelf } from '../features/profile/friendTestModel';
export function NotificationButton() {
  const [open, setOpen] = useState(false);
  const { records, ready, error } = useTestFriends();
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
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 16, paddingBottom: 24 }}>
              {!!error && (
                <Text accessibilityRole="alert" style={s.error}>
                  {error}
                </Text>
              )}
              {!ready && !error && <Text style={s.muted}>알림을 불러오는 중입니다.</Text>}
              {ready && !requests.length && <Text style={s.muted}>새로운 알림이 없습니다.</Text>}
              {requests.map((r) => (
                <FriendRow key={r.from} actor={testSelf} other={r.from} notification />
              ))}
            </ScrollView>
            <View style={s.footer}>
              <Button title="닫기" secondary onPress={() => setOpen(false)} />
            </View>
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
  title: { color: colors.text, fontSize: 24, lineHeight: 34, fontWeight: '700', flexShrink: 0 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  footer: { paddingTop: 8 },
  body: { color: colors.text, fontSize: 16, lineHeight: 24 },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 21 },
  error: { color: colors.danger },
  card: { backgroundColor: colors.primarySoft, padding: 18, borderRadius: 16, gap: 12 },
  actions: { flexDirection: 'row', gap: 10 },
});
