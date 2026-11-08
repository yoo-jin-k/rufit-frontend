/**
 * Figma 07 설정입니다. 운동·데이터·정보·계정 묶음 목록과 공통 휴식 시간, 도움말, 개인정보처리방침 화면으로 구성합니다.
 * 설정 항목은 실제 지원 범위를 명시합니다. 아직 연결되지 않은 기능(푸시 알림 등)을 켜짐이나 완료로 표시하지 않습니다.
 */
import type { useServerLive } from '../cheers/useServerLive';
import { useState } from 'react';
import { Platform, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { AppModal } from '../../components/AppModal';
import { Button } from '../../components/Button';
import { Chip, ChipRow, Toggle } from '../../components/kit/Controls';
import { NavBar, PageHeader, Screen } from '../../components/kit/Screen';
import { ConfirmDialog, GroupLabel, ListGroup, ListRow, Notice } from '../../components/kit/Surfaces';
import { text, tokens } from '../../theme/tokens';
import type { Workout } from '../workout/model';
import { formatRest } from '../workout/RestSetting';

const c = tokens.color;
const version = '0.1.0';
const presets = [30, 60, 90, 120, 180];
const faqs = [
  {
    q: '달성률은 어떻게 계산하나요?',
    a: '운동한 날짜 수를 그달의 전체 일수로 나눠요.\n같은 날 여러 번 운동해도 하루로 세요.\n예) 11월 6일 운동 → 6 ÷ 30 = 20%',
  },
  { q: '지난 날짜의 운동도 기록할 수 있나요?', a: '운동 홈에서 지난 날짜를 누른 뒤 ‘과거 기록 추가’로 입력할 수 있어요. 운동 시간은 재지 않아요.' },
  { q: '오운완 사진 없이 저장할 수 있나요?', a: '네. 사진 없이 메모만 남겨도 오운완으로 저장돼요.' },
  { q: '친구에게 내 기록이 어디까지 보이나요?', a: '계정에 저장한 오운완 중 ‘친구 공개’로 고른 게시물만 친구가 볼 수 있어요. 기기에만 저장한 기록은 보이지 않아요.' },
  { q: '기록을 파일로 내보낼 수 있나요?', a: '설정 › 기록 내보내기에서 완료한 운동 기록을 파일로 내보낼 수 있어요. 사진·프로필·체중·삼대 측정은 포함되지 않아요.' },
  { q: '운동은 어떤 순서로 기록하나요?', a: '운동 시작 → 종목 추가 → 무게·횟수 입력 → 세트 완료 → 운동 종료 순서로 기록해요. 기록은 이 기기에 보관돼요.' },
];

type Page = 'rest' | 'help' | 'privacy' | 'terms' | null;

export function SettingsScreen({
  live,
  onServerHistory,
  defaultRest,
  onRest,
  history,
  onAuth,
  authLabel,
}: {
  live?: ReturnType<typeof useServerLive>;
  onServerHistory?: () => void;
  defaultRest?: number;
  onRest: (value: number | null) => void;
  nickname: string;
  history: Workout[];
  onProfile: () => void;
  onAuth?: () => void;
  authLabel: string;
}) {
  const [notice, setNotice] = useState<{ title: string; body: string } | null>(null);
  const [page, setPage] = useState<Page>(null);
  const [rest, setRest] = useState(defaultRest ?? 90);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(0);
  async function exportRecords() {
    try {
      const body = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), workouts: history }, null, 2);
      if (Platform.OS === 'web') {
        const url = URL.createObjectURL(new Blob([body], { type: 'application/json' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = 'rufit-workouts.json';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else await Share.share({ message: body });
      setNotice({ title: '기록을 내보냈어요', body: '완료한 운동 기록만 포함됩니다. 사진·프로필·체중·삼대 측정은 포함되지 않아요.' });
    } catch {
      setNotice({ title: '내보내지 못했어요', body: '잠시 후 다시 시도해 주세요.' });
    }
  }
  const account = authLabel === '계정';
  const matches = faqs.filter((f) => !query.trim() || `${f.q} ${f.a}`.includes(query.trim()));
  return (
    <>
      <Screen edges={['top']} header={<PageHeader title="설정" />}>
        <GroupLabel>운동</GroupLabel>
        <ListGroup>
          <ListRow
            icon="timer"
            label="공통 휴식 시간"
            value={defaultRest === undefined ? '종목 권장값' : `${defaultRest}초`}
            onPress={() => {
              setRest(defaultRest ?? 90);
              setPage('rest');
            }}
          />
          <ListRow
            icon="bell"
            label="푸시 알림"
            value="준비 중"
            onPress={() =>
              setNotice({
                title: '푸시 알림은 준비 중이에요',
                body: '앱 밖에서 받는 푸시 알림은 아직 연결되지 않았습니다. 앱 안의 친구 신청은 운동 홈의 알림에서 확인할 수 있어요.',
              })
            }
          />
          {live && (
            <ListRow
              icon="userplus"
              label="친구에게 운동 중 상태 공개"
              trailing={
                <Toggle
                  label="친구에게 내 운동 상태 공개"
                  value={live.data?.sharing ?? false}
                  disabled={live.busy || !live.data}
                  onChange={(value) => void live.share(value)}
                />
              }
            />
          )}
        </ListGroup>
        {live && !!live.error && <Text accessibilityRole="alert" style={[text.caption, { color: c.danger.default }]}>{live.error}</Text>}
        {live && !live.data && <Button title="설정 다시 불러오기" variant="soft" size="md" onPress={() => void live.refresh()} />}
        <GroupLabel>데이터</GroupLabel>
        <ListGroup>
          <ListRow icon="export" label="기록 내보내기" accessibilityLabel="운동 기록 내보내기" onPress={() => void exportRecords()} />
          {onServerHistory && <ListRow icon="refresh" label="계정 기록 동기화" onPress={onServerHistory} />}
        </ListGroup>
        <GroupLabel>정보</GroupLabel>
        <ListGroup>
          <ListRow icon="help" label="도움말" onPress={() => setPage('help')} />
          <ListRow icon="doc" label="이용약관" onPress={() => setPage('terms')} />
          <ListRow icon="lock" label="개인정보처리방침" onPress={() => setPage('privacy')} />
          <ListRow icon="gear" label="버전" value={version} trailing="none" />
        </ListGroup>
        <GroupLabel>계정</GroupLabel>
        <ListGroup>
          {account ? (
            <ListRow icon="person" label="계정 관리 · 로그아웃" accessibilityLabel="계정 관리 · 로그아웃" onPress={() => onAuth?.()} />
          ) : (
            <ListRow icon="person" label="로그인" value="이 기기에 기록 중" accessibilityLabel="로그인" onPress={() => onAuth?.()} />
          )}
        </ListGroup>
      </Screen>
      <ConfirmDialog
        visible={!!notice}
        title={notice?.title ?? ''}
        message={notice?.body}
        cancelLabel="닫기"
        confirmLabel="확인"
        onCancel={() => setNotice(null)}
        onConfirm={() => setNotice(null)}
      />
      <AppModal visible={page === 'rest'} animationType="slide" onRequestClose={() => setPage(null)}>
        <Screen
          header={<NavBar title="공통 휴식 시간" onLeading={() => setPage(null)} />}
          footer={
            <>
              <Button
                title="저장"
                accessibilityLabel="휴식시간 저장"
                onPress={() => {
                  onRest(rest);
                  setPage(null);
                  setNotice({ title: '휴식 시간을 저장했어요', body: '다음 세트부터 새 휴식시간을 적용합니다.' });
                }}
              />
              <Button title="종목 권장값 사용" variant="soft" size="md" onPress={() => { onRest(null); setPage(null); }} />
            </>
          }
        >
          <View style={s.stepper}>
            <Pressable accessibilityRole="button" accessibilityLabel="15초 줄이기" onPress={() => setRest((v) => Math.max(0, v - 15))} style={s.round}>
              <Text style={[text.titleM, { color: c.text.primary }]}>−</Text>
            </Pressable>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text accessibilityLabel={`공통 휴식시간 ${rest}초`} style={[text.display, { color: c.text.primary }]}>{formatRest(rest)}</Text>
              <Text style={[text.caption, { color: c.text.secondary }]}>세트 사이 기본 휴식</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="15초 늘리기" onPress={() => setRest((v) => Math.min(3600, v + 15))} style={s.round}>
              <AppIcon name="plus" />
            </Pressable>
          </View>
          <ChipRow wrap>
            {presets.map((p) => (
              <Chip key={p} label={`${p}초`} selected={rest === p} onPress={() => setRest(p)} />
            ))}
          </ChipRow>
          <Notice title="종목별로 정한 시간이 있으면 그 시간이 먼저예요" body="0초로 저장하면 휴식 타이머가 꺼져요. 최대 3600초까지 정할 수 있어요." />
        </Screen>
      </AppModal>
      <AppModal visible={page === 'help'} animationType="slide" onRequestClose={() => setPage(null)}>
        <Screen header={<NavBar title="도움말" onLeading={() => setPage(null)} />}>
          <View style={s.search}>
            <AppIcon name="search" color={c.text.muted} />
            <TextInput
              accessibilityLabel="도움말 검색"
              value={query}
              onChangeText={setQuery}
              placeholder="궁금한 내용 검색"
              placeholderTextColor={c.text.muted}
              style={[text.bodyMedium, s.searchInput]}
            />
          </View>
          {matches.map((f, i) => {
            const expanded = open === i;
            return (
              <Pressable
                key={f.q}
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                aria-expanded={expanded}
                onPress={() => setOpen(expanded ? -1 : i)}
                style={s.faq}
              >
                <View style={s.faqHead}>
                  <Text style={[text.calloutBold, { color: c.text.primary, flex: 1 }]}>{f.q}</Text>
                  <AppIcon name={expanded ? 'chevron-up' : 'chevron-down'} color={c.text.secondary} />
                </View>
                {expanded && <Text style={[text.caption, { color: c.text.secondary }]}>{f.a}</Text>}
              </Pressable>
            );
          })}
          {!matches.length && <Text style={[text.caption, { color: c.text.secondary }]}>찾는 답이 없어요. 다른 단어로 검색해 보세요.</Text>}
        </Screen>
      </AppModal>
      <AppModal visible={page === 'privacy' || page === 'terms'} animationType="slide" onRequestClose={() => setPage(null)}>
        <Screen header={<NavBar title={page === 'terms' ? '이용약관' : '개인정보처리방침'} onLeading={() => setPage(null)} />}>
          <Text style={[text.body, { color: c.text.primary }]}>
            {page === 'terms'
              ? '정식 서비스 이용약관은 출시 전 제공됩니다.'
              : '현재 운동과 사진은 이 기기에 저장됩니다. 정식 개인정보처리방침은 서버 연동 범위 확정 후 제공됩니다.'}
          </Text>
        </Screen>
      </AppModal>
    </>
  );
}

const s = StyleSheet.create({
  stepper: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[16], paddingVertical: tokens.space[24] },
  round: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: c.line.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  search: {
    minHeight: 48,
    borderRadius: tokens.radius.md,
    backgroundColor: c.bg.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[8],
    paddingHorizontal: tokens.space[16],
  },
  searchInput: { flex: 1, color: c.text.primary, minHeight: 48, outlineWidth: 0 } as object,
  faq: { backgroundColor: c.bg.surface, borderRadius: tokens.radius.xl, padding: tokens.space[16], gap: tokens.space[8] },
  faqHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
