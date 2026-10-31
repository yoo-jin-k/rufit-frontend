/** 친구 목록과 알림 카드에서 같은 메뉴를 사용합니다. 신고는 로컬 저장임을 명시하며 실제 접수로 표시하지 않습니다. */
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon } from './AppIcon';
import { Button } from './Button';
import { colors } from '../theme/tokens';
import { useTestFriends } from '../features/profile/useTestFriends';
import { reportReasons, type SafetyAction } from '../features/profile/friendSafetyModel';
export function FriendActions({
  actor,
  other,
  name,
  friend = false,
}: {
  actor: string;
  other: string;
  name: string;
  friend?: boolean;
}) {
  const [stage, setStage] = useState<'menu' | 'block' | 'report' | 'unfriend' | 'done' | null>(
    null,
  );
  const [reason, setReason] = useState('');
  const { act, ready, busy, error, blocks } = useTestFriends();
  const blocked = blocks.some((r) => r.from === actor && r.to === other);
  async function perform(action: SafetyAction) {
    if (await act(actor, other, action, reason)) setStage(action === 'report' ? 'done' : null);
  }
  return (
    <>
      <View style={s.actions}>
        {friend && (
          <View style={{ width: 76 }}>
            <Button
              title="친구 해제"
              compact
              secondary
              disabled={!ready || busy}
              accessibilityLabel={`${name} 친구 해제`}
              onPress={() => setStage('unfriend')}
            />
          </View>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${name} 더보기`}
          disabled={busy}
          onPress={() => {
            setStage('menu');
            setReason('');
          }}
          style={s.more}
        >
          <AppIcon name="more" color={colors.text} />
        </Pressable>
      </View>
      <Modal
        visible={stage !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!busy) setStage(null);
        }}
      >
        <View style={s.backdrop}>
          <SafeAreaView style={s.sheet}>
            <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
              <Text style={s.heading}>{name}</Text>
              {!!error && (
                <Text accessibilityRole="alert" style={s.error}>
                  {error}
                </Text>
              )}
              {stage === 'menu' && (
                <>
                  <Button
                    title={blocked ? '차단 해제' : '차단하기'}
                    secondary
                    disabled={!ready || busy}
                    onPress={() => (blocked ? void perform('unblock') : setStage('block'))}
                  />
                  <Button
                    title="신고하기"
                    secondary
                    disabled={!ready || busy}
                    onPress={() => setStage('report')}
                  />
                </>
              )}
              {stage === 'block' && (
                <>
                  <Text style={s.body}>
                    차단하면 친구 관계와 대기 신청이 해제되고, 서로 친구 신청을 보낼 수 없습니다.
                  </Text>
                  <Button
                    title="차단하기"
                    disabled={!ready || busy}
                    onPress={() => void perform('block')}
                  />
                </>
              )}
              {stage === 'unfriend' && (
                <>
                  <Text style={s.body}>
                    친구를 해제하시겠습니까? 이후 다시 친구 신청을 보낼 수 있습니다.
                  </Text>
                  <Button
                    title="친구 해제하기"
                    disabled={!ready || busy}
                    onPress={() => void perform('unfriend')}
                  />
                </>
              )}
              {stage === 'report' && (
                <>
                  <Text style={s.body}>신고 사유를 선택해 주세요.</Text>
                  {reportReasons.map((r) => (
                    <Pressable
                      key={r}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: reason === r }}
                      aria-checked={reason === r}
                      onPress={() => setReason(r)}
                      style={s.reason}
                    >
                      <Text style={s.body}>
                        {reason === r ? '●' : '○'} {r}
                      </Text>
                    </Pressable>
                  ))}
                  <Text style={s.muted}>
                    테스트 신고는 이 기기에만 저장됩니다. 운영자에게 전송되지 않습니다.
                  </Text>
                  <Button
                    title="테스트 신고 저장"
                    disabled={!reason || !ready || busy}
                    onPress={() => void perform('report')}
                  />
                </>
              )}
              {stage === 'done' && (
                <Text style={s.body}>
                  테스트 신고를 기기에 저장했습니다. 실제 신고는 전송되지 않았습니다.
                </Text>
              )}
            </ScrollView>
            <View style={s.footer}>
              <Button
                title={stage === 'done' ? '확인' : '닫기'}
                secondary
                disabled={busy}
                onPress={() => setStage(null)}
              />
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}
const s = StyleSheet.create({
  actions: { flexDirection: 'row', alignItems: 'center', gap: 2, flexShrink: 0 },
  more: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: {
    width: '100%',
    maxWidth: 640,
    maxHeight: '90%',
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  content: { padding: 20, gap: 14 },
  footer: { padding: 20, paddingTop: 8 },
  heading: { fontSize: 20, lineHeight: 28, fontWeight: '700', color: colors.text },
  body: { fontSize: 15, lineHeight: 23, color: colors.text },
  muted: { fontSize: 13, lineHeight: 21, color: colors.muted },
  error: { color: colors.danger },
  reason: { minHeight: 44, justifyContent: 'center' },
});
