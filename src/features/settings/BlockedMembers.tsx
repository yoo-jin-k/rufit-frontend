/**
 * 설정 › 차단 목록입니다. 내가 차단한 회원을 보여 주고 차단을 풀 수 있습니다.
 * 차단을 풀어도 예전 친구 관계는 돌아오지 않으므로 확인 창에서 한 번 더 알려 줍니다.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import type { SocialMembers } from '../../api/client';
import type { RufitSession } from '../../api/session';
import { Button } from '../../components/Button';
import { NavBar, Screen } from '../../components/kit/Screen';
import { ConfirmDialog, EmptyCard, ListGroup } from '../../components/kit/Surfaces';
import { text, tokens } from '../../theme/tokens';

const c = tokens.color;

export function BlockedMembers({ session, onBack }: { session: RufitSession; onBack: () => void }) {
  const [items, setItems] = useState<SocialMembers['items']>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [target, setTarget] = useState<{ memberId: string; nickname: string } | null>(null);
  const alive = useRef(true);
  useEffect(
    () => () => {
      alive.current = false;
    },
    [],
  );

  const load = useCallback(async () => {
    try {
      const result = await session.api.blockedMembers();
      if (!alive.current) return;
      setItems(result.items);
      setError('');
    } catch (cause) {
      if (alive.current)
        setError(cause instanceof Error ? cause.message : '차단 목록을 불러오지 못했습니다.');
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    // 서버 응답을 기다린 뒤 목록을 채웁니다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function unblock(memberId: string) {
    if (busy) return;
    setBusy(true);
    try {
      await session.api.unblockMember(memberId);
      await load();
    } catch (cause) {
      if (alive.current)
        setError(
          cause instanceof Error ? cause.message : '차단을 풀지 못했습니다. 다시 시도해 주세요.',
        );
    } finally {
      if (alive.current) {
        setBusy(false);
        setTarget(null);
      }
    }
  }

  return (
    <Screen header={<NavBar title="차단 목록" onLeading={onBack} />}>
      {!!error && (
        <Text accessibilityRole="alert" style={[text.caption, { color: c.danger.default }]}>
          {error}
        </Text>
      )}
      {!loading && !items.length && !error ? (
        <EmptyCard
          icon="block"
          title="차단한 회원이 없어요"
          body="친구 목록이나 프로필의 메뉴에서 차단한 회원이 여기에 모여요"
        />
      ) : (
        items.length > 0 && (
          <ListGroup>
            {items.map((member) => (
              <View
                key={member.memberId}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: tokens.space[8],
                  minHeight: 56,
                }}
              >
                <Text
                  numberOfLines={1}
                  style={[text.bodyMedium, { flex: 1, color: c.text.primary }]}
                >
                  {member.nickname}
                </Text>
                <Button
                  title="해제"
                  accessibilityLabel={`${member.nickname} 차단 해제`}
                  variant="soft"
                  size="sm"
                  fullWidth={false}
                  disabled={busy}
                  onPress={() => setTarget(member)}
                />
              </View>
            ))}
          </ListGroup>
        )
      )}
      <Text style={[text.caption, { color: c.text.secondary }]}>
        차단한 회원과는 서로 친구 신청을 보낼 수 없고, 알림도 받지 않아요.
      </Text>
      <ConfirmDialog
        visible={!!target}
        title={`${target?.nickname ?? ''}님의 차단을 풀까요?`}
        message="예전 친구 관계는 돌아오지 않아요. 다시 친구가 되려면 친구 신청이 필요해요."
        confirmLabel="해제"
        busy={busy}
        onCancel={() => setTarget(null)}
        onConfirm={() => {
          if (target) void unblock(target.memberId);
        }}
      />
    </Screen>
  );
}
