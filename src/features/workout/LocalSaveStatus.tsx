import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { colors, radius, spacing, typography } from '../../theme/tokens';
import { localSaveView, saveAnnouncement, saveStatusVisible, type LocalSaveInput } from './localSaveView';

// 저장 중에도 같은 위치에서 읽기/쓰기 실패 맥락과 재시도 버튼을 유지합니다.
export function LocalSaveStatus({
  onRetry,
  state,
  ready,
  retryPending,
  unsavedAfterFailure,
}: LocalSaveInput & { onRetry(): void }) {
  const view = localSaveView({ state, ready, retryPending, unsavedAfterFailure });
  const previous = useRef<ReturnType<typeof localSaveView> | null>(null);
  const [announcement, setAnnouncement] = useState('');
  useEffect(() => {
    const next = localSaveView({ state, ready, retryPending, unsavedAfterFailure });
    const message = saveAnnouncement(previous.current, next);
    previous.current = next;
    if (message) setAnnouncement(message);
    else if (!next.warning && (state === 'saving' || state === 'loading')) setAnnouncement('');
    // iOS에는 Android/Web의 live region이 없어 같은 전이를 직접 알립니다.
    if (message && Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(message);
  }, [state, ready, retryPending, unsavedAfterFailure]);
  const live = Platform.OS !== 'ios' && (
    <Text style={s.announcement} accessibilityLiveRegion="polite" aria-atomic>
      {announcement}
    </Text>
  );
  // 보여 줄 문구가 없으면 자리를 차지하지 않고, 화면 읽기 알림용 글자(크기 1, 겹쳐 둠)만 남깁니다.
  if (!saveStatusVisible({ state, ready, retryPending, unsavedAfterFailure })) return live || null;
  return (
    <View>
      <View style={[s.status, view.warning && s.warning]}>
        <Text style={view.warning ? s.title : s.normal}>{view.title}</Text>
        {view.warning && (
          <>
            <Text style={s.description}>{view.description}</Text>
            <Button
              title={view.retryLabel}
              loadingLabel={view.loadingLabel}
              loading={view.retryLoading}
              secondary
              disabled={view.retryDisabled}
              onPress={onRetry}
            />
          </>
        )}
      </View>
      {live}
    </View>
  );
}
const s = StyleSheet.create({
  status: { gap: spacing.sm },
  warning: {
    padding: spacing.lg,
    borderRadius: radius.status,
    backgroundColor: colors.dangerSurface,
  },
  title: { ...typography.button, color: colors.danger },
  normal: { ...typography.caption, color: colors.textSecondary },
  description: { ...typography.caption, color: colors.text },
  announcement: { position: 'absolute', width: 1, height: 1, overflow: 'hidden' },
});
