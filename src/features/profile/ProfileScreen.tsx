import { AppModal as Modal } from '../../components/AppModal';
import { ServerPostList } from '../posts/ServerPosts';
import { ProfileAvatar } from './ProfileAvatar';
import { ProfilePhotoEditor } from './ProfilePhotoEditor';
import { TestPhoto } from '../../components/TestPhoto';
import { LikedPostScreen } from './LikedPostScreen';
import {
  addOwnSamplePosts,
  updateProfileDetails,
  updateProfileAvatar,
  journalPhotos,
} from './journalModel';
import { useTestFriends } from './useTestFriends';
import { countTestFriends, testSelf } from './friendTestModel';
/** 프로필 통계는 실제 완료 기록에서 집계합니다. 사진 없는 오운완도 전체 기록과 달력에 남습니다. */
import { useEffect, useRef, useState } from 'react';
import type { RufitSession } from '../../api/session';
import { ServerFriendsScreen } from './ServerFriendsScreen';
import { Platform, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { CheckMark, TextField } from '../../components/kit/Controls';
import { IconButton, NavBar, PageHeader, Screen } from '../../components/kit/Screen';
import { EmptyCard } from '../../components/kit/Surfaces';
import { text, tokens } from '../../theme/tokens';
import { WorkoutDetail } from '../workout/WorkoutDetail';
import { formatDay, recordMeta, recordTitle, workoutDay } from '../workout/recordFormat';
import { AppIcon } from '../../components/AppIcon';
import { nicknameMessage, useNicknameAvailability } from './useNicknameAvailability';
import { Button } from '../../components/Button';
import type { Workout } from '../workout/model';
import { workoutsByDay } from '../calendar/model';
import { WorkoutCalendar } from '../calendar/WorkoutCalendar';
import { FriendsScreen } from './FriendsScreen';
import type { useProfile } from './useProfile';
const c = tokens.color;

export function ProfileScreen({
  now,
  history,
  profile,
  onJournal,
  session = null,
  initialJournalSource = 'account',
}: {
  session?: RufitSession | null;
  initialJournalSource?: 'account' | 'device';
  now: number;
  history: Workout[];
  profile: ReturnType<typeof useProfile>;
  onJournal: (workout: Workout) => void;
}) {
  // 저장 직후에는 해당 기록을 보여주되 저장 위치를 사용자 선택 메뉴로 노출하지 않습니다.
  const journalSource = initialJournalSource;
  const [serverPostCount, setServerPostCount] = useState<number | null>(null);
  const [postLoadStatus, setPostLoadStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const social = useTestFriends();
  const [serverCount, setServerCount] = useState<number | null>(null);
  const friendCount = session
    ? (serverCount ?? '확인 중')
    : countTestFriends(social.records, testSelf);
  const [tab, setTab] = useState('오운완'),
    [editing, setEditing] = useState(false),
    [name, setName] = useState(profile.value.nickname),
    [bio, setBio] = useState(profile.value.bio ?? ''),
    [gym, setGym] = useState(profile.value.gym ?? ''),
    [error, setError] = useState(''),
    [friends, setFriends] = useState(false);
  useEffect(() => {
    let current = true;
    if (session)
      void session.api
        .directorySettings()
        .then(async (settings) => {
          const count = settings.memberId ? (await session.api.friends()).items.length : 0;
          if (current && session.isActive()) setServerCount(count);
        })
        .catch(() => {
          if (current) setError('친구 수를 불러오지 못했습니다. 친구 목록에서 다시 확인해 주세요.');
        });
    return () => {
      current = false;
    };
  }, [session, friends]);
  const nicknameStatus = useNicknameAvailability(session, name, profile.value.nickname);
  const [avatar, setAvatar] = useState(profile.value.avatar);
  const [photoBusy, setPhotoBusy] = useState(false);
  function openEditor() {
    setName(profile.value.nickname);
    setBio(profile.value.bio ?? '');
    setGym(profile.value.gym ?? '');
    setAvatar(profile.value.avatar);
    setError('');
    setEditing(true);
  }
  const pendingJournal = useRef<Workout | null>(null);
  function openPendingJournal() {
    const target = pendingJournal.current;
    pendingJournal.current = null;
    if (target) onJournal(target);
  }
  const [choosingWorkout, setChoosingWorkout] = useState(false);
  const [post, setPost] = useState<string | null>(null);
  const [detail, setDetail] = useState<Workout | null>(null);
  const [choice, setChoice] = useState<string | null>(null);
  // 사진 없는 오운완도 게시물입니다. 운동 목록과 별도로 보관한 기록을 숨기지 않습니다.
  const entries = profile.value.journals;
  if (friends)
    return session ? (
      <ServerFriendsScreen
        key={session.scope.accountId}
        session={session}
        nickname={profile.value.nickname}
        onClose={() => setFriends(false)}
      />
    ) : (
      <FriendsScreen onClose={() => setFriends(false)} />
    );
  if (editing)
    return (
      <Screen
        edges={['top']}
        header={<NavBar title="프로필 편집" leading="close" onLeading={() => { if (!photoBusy && !profile.busy) setEditing(false); }} />}
        footer={
          <Button
            title="저장"
            loading={profile.busy}
            disabled={photoBusy || nicknameStatus === 'taken' || nicknameStatus === 'short'}
            onPress={async () => {
              try {
                const next = updateProfileAvatar(updateProfileDetails(profile.value, name, bio, gym), avatar);
                if (session?.isActive()) {
                  // 친구 검색 공개 여부는 유지하고 닉네임만 같은 계정의 서버 프로필에 반영합니다.
                  const directory = await session.api.directorySettings();
                  await session.api.updateDirectory({ nickname: next.nickname,
                    discoverable: directory.discoverable, version: directory.version });
                }
                await profile.save(next);
                setEditing(false);
              } catch (cause) {
                setError(cause instanceof Error ? cause.message : '저장하지 못했습니다. 다시 시도해 주세요.');
              }
            }}
          />
        }
      >
        <ProfilePhotoEditor photo={avatar} disabled={profile.busy} onChange={setAvatar} onBusy={setPhotoBusy} />
        {/* 입력이 멈추면 자동으로 중복 여부를 확인해 입력칸 바로 아래에 작게 안내합니다. */}
        <TextField
          label="닉네임"
          value={name}
          onChangeText={setName}
          maxLength={24}
          trailing={`${name.length}/24`}
          helper={nicknameMessage(nicknameStatus) || '친구 검색에 쓰여요'}
          error={nicknameStatus === 'taken' || nicknameStatus === 'short' ? nicknameMessage(nicknameStatus) : undefined}
        />
        <TextField
          label="한 줄 소개"
          placeholder="예: 어제보다 한 걸음 더"
          value={bio}
          onChangeText={setBio}
          maxLength={80}
          trailing={`${bio.length}/80`}
        />
        <TextField
          label="운동 장소 (선택)"
          accessibilityLabel="헬스장 지점"
          placeholder="예: 루핏짐 강남점"
          value={gym}
          onChangeText={setGym}
          maxLength={60}
        />
        {!!error && <Text accessibilityRole="alert" style={[text.caption, { color: c.danger.default }]}>{error}</Text>}
      </Screen>
    );
  const stats = [
    { label: '운동한 날', value: Object.keys(workoutsByDay(history)).length },
    {
      label: '오운완',
      value:
        session && journalSource === 'account'
          ? postLoadStatus === 'error'
            ? '확인 실패'
            : (serverPostCount ?? '확인 중')
          : entries.length,
    },
    { label: '친구', value: friendCount },
  ];
  const sorted = [...history]
    .filter((w) => w.finishedAt !== undefined)
    .sort((a, b) => workoutDay(b).localeCompare(workoutDay(a)) || b.startedAt - a.startedAt);
  const days = [...new Set(sorted.map(workoutDay))];
  const withoutJournal = sorted.filter((w) => !entries.some((j) => j.workoutId === w.id)).slice(0, 10);
  return (
    <Screen
      edges={['top']}
      header={
        <PageHeader
          title="프로필"
          actions={
            <>
              <IconButton icon="userplus" label="친구 찾기" onPress={() => setFriends(true)} />
              <IconButton
                icon="plus"
                label="오운완 기록 추가"
                onPress={() => {
                  if (history.length) setChoosingWorkout(true);
                  else setError('운동을 완료한 뒤 오운완을 남겨 주세요.');
                }}
              />
            </>
          }
        />
      }
    >
      <View style={ps.me}>
        <Pressable accessibilityRole="button" accessibilityLabel="프로필 사진 수정" disabled={!profile.ready} onPress={openEditor}>
          <ProfileAvatar photo={profile.value.avatar} />
        </Pressable>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text numberOfLines={1} style={[text.headline, { color: c.text.primary }]}>{profile.value.nickname}</Text>
          {/* 입력한 항목만 표시하며 긴 소개와 지점명은 화면 너비에 맞춰 줄바꿈합니다. */}
          {!!profile.value.bio && <Text style={[text.caption, { color: c.text.secondary }]}>{profile.value.bio}</Text>}
          {!!profile.value.gym && <Text style={[text.label, { color: c.text.muted }]}>{profile.value.gym}</Text>}
        </View>
      </View>
      <View style={ps.stats}>
        {stats.map((item) => (
          <Pressable
            key={item.label}
            accessibilityRole="button"
            accessibilityLabel={item.label === '친구' ? '친구 목록' : item.label}
            onPress={() => (item.label === '친구' ? setFriends(true) : setTab(item.label === '오운완' ? '오운완' : '달력'))}
            style={ps.stat}
          >
            <Text style={[text.bodyBold, { color: c.text.primary }]}>{item.value}</Text>
            <Text style={[text.caption, { color: c.text.secondary }]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={ps.actions}>
        <Button title="프로필 편집" variant="soft" size="sm" fullWidth={false} style={{ flex: 1 }} disabled={!profile.ready} onPress={openEditor} />
        <Button title={`친구 ${typeof friendCount === 'number' ? `${friendCount}명` : ''}`.trim()} variant="soft" size="sm" fullWidth={false} style={{ flex: 1 }} onPress={() => setFriends(true)} />
      </View>
      <View accessibilityRole="tablist" style={ps.tabs}>
        {['오운완', '전체 기록', '달력'].map((t) => (
          <Pressable
            key={t}
            accessibilityRole="tab"
            accessibilityState={{ selected: t === tab }}
            aria-selected={t === tab}
            onPress={() => setTab(t)}
            style={[ps.tab, tab === t && ps.tabOn]}
          >
            <Text style={[tab === t ? text.calloutBold : text.callout, { color: tab === t ? c.text.primary : c.text.muted }]}>{t}</Text>
          </Pressable>
        ))}
      </View>
      {!!(error || profile.error) && (
        <Text accessibilityRole="alert" style={[text.caption, { color: c.danger.default }]}>
          {error || profile.error}
        </Text>
      )}
      {tab === '달력' ? (
        <WorkoutCalendar
          monthly
          history={history}
          ready
          now={now}
          renderDay={(day, records) =>
            records.length ? (
              <Pressable accessibilityRole="button" accessibilityLabel={`${formatDay(day)} 기록 보기`} onPress={() => setDetail(records[0])} style={ps.daySummary}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[text.calloutBold, { color: c.text.primary }]}>{formatDay(day)}</Text>
                  <Text style={[text.label, { color: c.text.secondary }]}>
                    {records.map((w) => recordTitle(w)).join(', ')} · {recordMeta(records[0]).split(' · ').filter((_, i) => i !== 1).join(' · ')}
                    {records.some((w) => entries.some((j) => j.workoutId === w.id)) ? ' · 오운완 있음' : ''}
                  </Text>
                </View>
                <AppIcon name="chevron-right" color={c.text.muted} />
              </Pressable>
            ) : (
              <Text style={[text.caption, { color: c.text.secondary }]}>{formatDay(day)} · 기록이 없어요</Text>
            )
          }
        />
      ) : tab === '전체 기록' ? (
        days.length ? (
          <View style={{ gap: tokens.space[16] }}>
            {days.map((day) => (
              <View key={day} style={{ gap: tokens.space[8] }}>
                <Text style={[text.captionBold, { color: c.text.secondary }]}>{formatDay(day, 'compact')}</Text>
                {sorted.filter((w) => workoutDay(w) === day).map((w) => {
                  const journal = entries.find((j) => j.workoutId === w.id);
                  const photo = journal && journalPhotos(journal)[0];
                  return (
                    <Pressable key={w.id} accessibilityRole="button" accessibilityLabel={`${day} 운동 기록 보기`} onPress={() => setDetail(w)} style={ps.recordRow}>
                      {photo ? (
                        <Image source={{ uri: photo }} style={ps.recordThumb} />
                      ) : (
                        <View style={[ps.recordThumb, ps.recordIcon]}>
                          <AppIcon name={journal ? 'image' : 'dumbbell'} color={c.text.secondary} />
                        </View>
                      )}
                      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                        <Text style={[text.bodyBold, { color: c.text.primary }]}>{recordTitle(w)}</Text>
                        <Text numberOfLines={1} style={[text.label, { color: c.text.secondary }]}>{recordMeta(w)}</Text>
                      </View>
                      <AppIcon name="chevron-right" color={c.text.muted} />
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        ) : (
          <EmptyCard icon="dumbbell" title="아직 운동 기록이 없어요" body="운동을 마치면 여기에 날짜별로 쌓여요" />
        )
      ) : session && journalSource === 'account' ? (
        <ServerPostList session={session} onTotal={setServerPostCount} onLoadStatus={setPostLoadStatus} />
      ) : entries.length > 0 ? (
        <View style={ps.grid}>
          {[...entries]
            .sort((a, b) => b.createdAt - a.createdAt)
            .map((j) => (
              <Pressable
                key={j.workoutId}
                accessibilityRole="button"
                accessibilityLabel={`${j.memo || '오운완'} 게시물 보기`}
                onPress={() => setPost(`own:${j.workoutId}`)}
                style={ps.cell}
              >
                {j.testPhotoTile !== undefined ? (
                  <TestPhoto tile={j.testPhotoTile} label="내 가상 오운완 사진" />
                ) : journalPhotos(j).length ? (
                  <Image source={{ uri: journalPhotos(j)[0] }} style={ps.cellImage} />
                ) : (
                  <View style={[ps.cellImage, ps.cellText]}>
                    <AppIcon name="image" color={c.text.muted} />
                    <Text numberOfLines={2} style={[text.label, { color: c.text.secondary, textAlign: 'center' }]}>
                      {j.memo || '사진 없는 오운완'}
                    </Text>
                  </View>
                )}
                {journalPhotos(j).length > 1 && (
                  <View style={ps.count}>
                    <Text style={[text.label, { color: c.text.inverse }]}>{journalPhotos(j).length}장</Text>
                  </View>
                )}
              </Pressable>
            ))}
        </View>
      ) : (
        <EmptyCard icon="image" title="첫 오운완을 남겨보세요" body="운동을 마친 뒤 사진을 기록할 수 있어요." />
      )}
      {__DEV__ &&
        profile.value.journals.filter((j) => j.workoutId.startsWith('sample-own-')).length < 3 && (
          <Button
            title="내 샘플 게시물 3개 추가"
            variant="soft"
            size="md"
            disabled={!profile.ready || profile.busy}
            onPress={() =>
              void profile.save(addOwnSamplePosts(profile.value)).catch(() => setError('샘플 게시물을 저장하지 못했습니다.'))
            }
          />
        )}
      <WorkoutDetail
        visible={!!detail}
        workout={detail}
        journal={detail ? entries.find((j) => j.workoutId === detail.id) : undefined}
        onClose={() => setDetail(null)}
        onJournal={onJournal}
      />
      {/* 저장 순서와 실제 운동 날짜가 달라도 사용자가 원하는 기록을 직접 고릅니다(Figma 06-11). */}
      <Modal visible={choosingWorkout} onDismiss={openPendingJournal} animationType="slide" onRequestClose={() => setChoosingWorkout(false)}>
        <Screen
          header={<NavBar title="오운완 추가" leading="close" onLeading={() => setChoosingWorkout(false)} />}
          footer={
            <Button
              title="다음"
              disabled={!choice}
              onPress={() => {
                pendingJournal.current = sorted.find((w) => w.id === choice) ?? null;
                setChoosingWorkout(false);
                if (Platform.OS !== 'ios') openPendingJournal();
              }}
            />
          }
        >
          <View style={{ gap: 4 }}>
            <Text style={[text.titleM, { color: c.text.primary }]}>어떤 운동의 오운완인가요?</Text>
            <Text style={[text.callout, { color: c.text.secondary }]}>오운완이 없는 최근 기록이에요</Text>
          </View>
          {withoutJournal.map((w) => {
            const on = choice === w.id;
            return (
              <Pressable
                key={w.id}
                accessibilityRole="radio"
                accessibilityLabel={`${workoutDay(w)} 운동 기록 보기`}
                accessibilityState={{ checked: on }}
                onPress={() => setChoice(w.id)}
                style={[ps.choice, on && ps.choiceOn]}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[text.calloutBold, { color: c.text.primary }]}>
                    {formatDay(workoutDay(w), 'compact')} · {recordTitle(w)}
                  </Text>
                  <Text style={[text.label, { color: c.text.secondary }]}>{recordMeta(w)}</Text>
                </View>
                <CheckMark checked={on} />
              </Pressable>
            );
          })}
          {!withoutJournal.length && (
            <EmptyCard icon="check" title="모든 기록에 오운완이 있어요" body="기존 오운완은 게시물에서 고칠 수 있어요" />
          )}
        </Screen>
      </Modal>
      {post && (
        <LikedPostScreen
          post={post}
          onClose={() => setPost(null)}
          onEdit={
            history.some((workout) => `own:${workout.id}` === post)
              ? () => {
                  const workout = history.find((workout) => `own:${workout.id}` === post);
                  setPost(null);
                  if (workout) onJournal(workout);
                }
              : undefined
          }
        />
      )}
    </Screen>
  );
}

const ps = StyleSheet.create({
  me: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[16] },
  stats: { flexDirection: 'row', gap: tokens.space[20] },
  stat: { flexDirection: 'row', alignItems: 'baseline', gap: 4, minHeight: 32 },
  actions: { flexDirection: 'row', gap: tokens.space[8] },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderColor: c.line.default },
  tab: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderColor: 'transparent', marginBottom: -1 },
  tabOn: { borderColor: c.text.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  cell: { width: '32.4%', aspectRatio: 1, borderRadius: 4, overflow: 'hidden', backgroundColor: c.line.input },
  cellImage: { width: '100%', height: '100%' },
  cellText: { padding: 8, gap: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg.surface },
  count: { position: 'absolute', top: 6, right: 6, backgroundColor: c.bg.inverse, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  recordRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[12], minHeight: 56 },
  recordThumb: { width: 52, height: 52, borderRadius: tokens.radius.md, backgroundColor: c.line.input },
  recordIcon: { backgroundColor: c.bg.surface, alignItems: 'center', justifyContent: 'center' },
  daySummary: {
    backgroundColor: c.bg.surface,
    borderRadius: tokens.radius.xl,
    padding: tokens.space[16],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  choice: {
    backgroundColor: c.bg.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
    padding: tokens.space[16],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  choiceOn: { backgroundColor: c.bg.default, borderColor: c.text.primary },
});
