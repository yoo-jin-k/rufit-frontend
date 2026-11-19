import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { AppIcon } from '../../components/AppIcon';
import { Button } from '../../components/Button';
import { BottomSheet, ConfirmDialog, ListGroup, ListRow } from '../../components/kit/Surfaces';
import { ui } from '../../components/ScreenLayout';
import { tokens } from '../../theme/tokens';
import type { ReportReason } from '../../api/client';

const reasons: { value: ReportReason; label: string }[] = [
  { value: 'SPAM', label: '스팸·광고' },
  { value: 'HARASSMENT', label: '괴롭힘' },
  { value: 'INAPPROPRIATE', label: '부적절한 내용' },
  { value: 'OTHER', label: '기타' },
];
// iOS는 시트가 완전히 내려간 뒤에야 다음 창을 띄울 수 있어 잠시 기다립니다.
const NEXT_MODAL_DELAY = 350;

type Step = 'remove' | 'block' | 'report';

/**
 * 친구 해제·차단·신고 메뉴입니다. 목록에서는 ⋯ 하나만 두고 아래에서 올라오는 메뉴로 고릅니다.
 * 관계를 바꾸는 동작은 확인 창을 한 번 더 거치고, 신고 재시도에는 같은 접수 번호를 씁니다.
 */
export function ServerMemberActions({
  nickname,
  disabled,
  onBlock,
  onRemove,
  onReport,
  inline = false,
}: {
  nickname: string;
  /** 프로필 화면에서는 메뉴에 숨기지 않고 작은 버튼으로 바로 보여 줍니다. */
  inline?: boolean;
  disabled: boolean;
  onBlock: () => void;
  onRemove?: () => void;
  onReport: (id: string, reason: ReportReason) => Promise<boolean>;
}) {
  const [menu, setMenu] = useState(false);
  const [step, setStep] = useState<Step | null>(null);
  const [reason, setReason] = useState<ReportReason>('SPAM');
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState(false);
  const ids = useRef(new Map<ReportReason, string>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function open(next: Step) {
    setSent(false);
    setFailed(false);
    setStep(next);
  }
  function choose(next: Step) {
    setMenu(false);
    timer.current = setTimeout(() => open(next), NEXT_MODAL_DELAY);
  }

  const items: { step: Step; label: string; icon: 'users' | 'block' | 'flag' }[] = [
    ...(onRemove ? [{ step: 'remove' as const, label: '친구 해제', icon: 'users' as const }] : []),
    { step: 'block', label: '차단하기', icon: 'block' },
    { step: 'report', label: '신고하기', icon: 'flag' },
  ];

  return (
    <>
      {inline ? (
        <View style={[ui.row, { gap: tokens.space[8], flexWrap: 'wrap' }]}>
          {items.map((item) => (
            <Button
              key={item.step}
              title={item.label}
              // 프로필 카드가 회색이라 테두리 버튼으로 구분합니다.
              variant="secondary"
              size="sm"
              fullWidth={false}
              disabled={disabled}
              onPress={() => open(item.step)}
            />
          ))}
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${nickname} 더보기`}
          accessibilityState={{ expanded: menu, disabled }}
          disabled={disabled}
          hitSlop={4}
          onPress={() => setMenu(true)}
          style={({ pressed }) => ({
            width: 40,
            height: 40,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <AppIcon name="more" size={20} color={tokens.color.text.secondary} />
        </Pressable>
      )}

      <BottomSheet visible={menu} title={nickname} onClose={() => setMenu(false)}>
        <ListGroup>
          {items.map((item) => (
            <ListRow
              key={item.step}
              icon={item.icon}
              label={item.label}
              danger={item.step !== 'remove'}
              trailing="none"
              disabled={disabled}
              onPress={() => choose(item.step)}
            />
          ))}
        </ListGroup>
      </BottomSheet>

      <ConfirmDialog
        visible={step === 'remove'}
        title={`${nickname}님을 친구에서 해제할까요?`}
        message="다시 연결하려면 친구 신청과 수락이 필요합니다."
        confirmLabel="해제"
        tone="danger"
        busy={disabled}
        onCancel={() => setStep(null)}
        onConfirm={() => {
          setStep(null);
          onRemove?.();
        }}
      />
      <ConfirmDialog
        visible={step === 'block'}
        title={`${nickname}님을 차단할까요?`}
        message="친구 관계와 대기 중인 신청이 삭제되고, 차단을 풀어도 복원되지 않습니다."
        confirmLabel="차단"
        tone="danger"
        busy={disabled}
        onCancel={() => setStep(null)}
        onConfirm={() => {
          setStep(null);
          onBlock();
        }}
      />
      <BottomSheet
        visible={step === 'report'}
        title="신고하기"
        subtitle={sent ? undefined : `${nickname}님을 신고하는 이유를 골라 주세요.`}
        onClose={() => setStep(null)}
      >
        {sent ? (
          <View style={{ gap: tokens.space[16] }}>
            <Text accessibilityLiveRegion="polite" style={ui.body}>
              신고가 접수되었습니다. 검토가 끝난 것은 아니며, 차단은 따로 할 수 있습니다.
            </Text>
            <Button title="확인" size="md" onPress={() => setStep(null)} />
          </View>
        ) : (
          <View style={{ gap: tokens.space[16] }}>
            <ListGroup>
              {reasons.map((item) => (
                <ListRow
                  key={item.value}
                  label={item.label}
                  accessibilityLabel={item.label}
                  trailing={
                    reason === item.value ? (
                      <AppIcon name="check" color={tokens.color.accent.default} />
                    ) : (
                      'none'
                    )
                  }
                  disabled={disabled}
                  onPress={() => setReason(item.value)}
                />
              ))}
            </ListGroup>
            {failed && (
              <Text accessibilityRole="alert" style={ui.error}>
                신고를 접수하지 못했어요. 다시 시도해 주세요.
              </Text>
            )}
            <Button
              title="신고 접수"
              size="md"
              variant="danger"
              disabled={disabled}
              onPress={() => {
                const id = ids.current.get(reason) ?? randomUUID();
                ids.current.set(reason, id);
                void onReport(id, reason).then((ok) => {
                  setSent(ok);
                  setFailed(!ok);
                });
              }}
            />
          </View>
        )}
      </BottomSheet>
    </>
  );
}
