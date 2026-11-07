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
import { LikeButton } from '../../components/LikeButton';
import { NotificationButton } from '../../components/NotificationButton';
/** 프로필 통계는 실제 완료 기록에서 집계합니다. 사진 없는 오운완도 전체 기록과 달력에 남습니다. */
import { useEffect, useRef, useState } from 'react';
import type { RufitSession } from '../../api/session';
import { ServerFriendsScreen } from './ServerFriendsScreen';
import { Platform, Image, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenLayout, ui } from '../../components/ScreenLayout';
import { AppIcon } from '../../components/AppIcon';
import { Button } from '../../components/Button';
import { colors } from '../../theme/tokens';
import type { Workout } from '../workout/model';
import { WorkoutHistory } from '../workout/WorkoutHistory';
import { workoutsByDay } from '../calendar/model';
import { WorkoutCalendar } from '../calendar/WorkoutCalendar';
import { FriendsScreen } from './FriendsScreen';
import type { useProfile } from './useProfile';
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
      <ScreenLayout
        title="프로필 편집"
        onBack={() => {
          if (!photoBusy && !profile.busy) setEditing(false);
        }}
      >
        <ProfilePhotoEditor
          photo={avatar}
          disabled={profile.busy}
          onChange={setAvatar}
          onBusy={setPhotoBusy}
        />
        <Text style={ui.muted}>닉네임</Text>
        <TextInput
          accessibilityLabel="닉네임"
          value={name}
          onChangeText={setName}
          maxLength={24}
          style={ui.input}
        />
        <Text style={ui.muted}>한 줄 소개 (선택 · 80자 이내)</Text>
        <TextInput
          accessibilityLabel="한 줄 소개"
          placeholder="예: 어제보다 한 걸음 더"
          value={bio}
          onChangeText={setBio}
          maxLength={80}
          style={ui.input}
        />
        <Text style={ui.muted}>헬스장 · 지점 (선택 · 60자 이내)</Text>
        <TextInput
          accessibilityLabel="헬스장 지점"
          placeholder="예: 루핏짐 강남점"
          value={gym}
          onChangeText={setGym}
          maxLength={60}
          style={ui.input}
        />
        <Text style={ui.muted}>소개와 헬스장은 프로필 사진 아래에 표시됩니다.</Text>
        {!!error && <Text style={ui.error}>{error}</Text>}
        <Button
          title="저장"
          loading={profile.busy}
          disabled={photoBusy}
          onPress={async () => {
            try {
              const next = updateProfileAvatar(
                updateProfileDetails(profile.value, name, bio, gym),
                avatar,
              );
              if (session?.isActive()) {
                // 친구 검색 공개 여부는 유지하고 닉네임만 같은 계정의 서버 프로필에 반영합니다.
                const directory = await session.api.directorySettings();
                await session.api.updateDirectory({ nickname: next.nickname,
                  discoverable: directory.discoverable, version: directory.version });
              }
              await profile.save(next);
              setEditing(false);
            } catch (cause) {
              setError(
                cause instanceof Error ? cause.message : '저장하지 못했습니다. 다시 시도해 주세요.',
              );
            }
          }}
        />
      </ScreenLayout>
    );
  return (
    <ScreenLayout>
      <View style={ui.between}>
        <Text numberOfLines={1} style={[ui.heading, { flex: 1, minWidth: 0 }]}>{profile.value.nickname}</Text>
        <View style={ui.row}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="오운완 기록 추가"
            onPress={() => {
              if (history.length) setChoosingWorkout(true);
              else setError('운동을 완료한 뒤 오운완을 남겨 주세요.');
            }}
            style={{ padding: 10 }}
          >
            <AppIcon name="plus" />
          </Pressable>
          <NotificationButton />
          {/* 편집 기능은 추가·알림과 같은 상단 도구 모음에서 제공합니다. */}
          <Pressable accessibilityRole="button" accessibilityLabel="프로필 편집"
            disabled={!profile.ready} onPress={openEditor}
            style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
            <AppIcon name="edit" size={20} />
          </Pressable>
        </View>
      </View>
      <View style={ui.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="프로필 사진 수정"
          disabled={!profile.ready}
          onPress={openEditor}
        >
          <ProfileAvatar photo={profile.value.avatar} />
        </Pressable>
        {[
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
        ].map((item) => (
          <Pressable
            key={item.label}
            accessibilityRole="button"
            accessibilityLabel={item.label === '친구' ? '친구 목록' : item.label}
            onPress={() =>
              item.label === '친구'
                ? setFriends(true)
                : setTab(item.label === '오운완' ? '오운완' : '달력')
            }
            style={{
              flex: 1,
              alignItems: 'center',
              gap: 5,
              minHeight: 48,
              justifyContent: 'center',
            }}
          >
            {/* 숫자 대신 안내 문구가 표시되어도 작은 화면에서 통계 열이 밀리지 않도록 합니다. */}
            <Text
              numberOfLines={1}
              style={[ui.heading, typeof item.value === 'string' && { fontSize: 12 }]}
            >
              {item.value}
            </Text>
            <Text style={[ui.muted, { fontSize: 11 }]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
      {/* 입력한 항목만 표시하며 긴 소개와 지점명은 화면 너비에 맞춰 줄바꿈합니다. */}
      {!!(profile.value.bio || profile.value.gym) && (
        <View style={{ gap: 4 }}>
          {!!profile.value.bio && <Text style={ui.body}>{profile.value.bio}</Text>}
          {!!profile.value.gym && <Text style={ui.muted}>헬스장 · {profile.value.gym}</Text>}
        </View>
      )}
      <View style={ui.row}>
        {['오운완', '전체 기록', '달력'].map((t) => (
          <Pressable
            key={t}
            accessibilityRole="tab"
            accessibilityState={{ selected: t === tab }}
            aria-selected={t === tab}
            onPress={() => setTab(t)}
            style={{
              flex: 1,
              minHeight: 48,
              alignItems: 'center',
              justifyContent: 'center',
              borderBottomWidth: 2,
              borderColor: tab === t ? colors.text : 'transparent',
            }}
          >
            <Text style={[ui.muted, tab === t && { color: colors.text, fontWeight: '700' }]}>
              {t}
            </Text>
          </Pressable>
        ))}
      </View>
      {!!(error || profile.error) && (
        <Text accessibilityRole="alert" style={ui.error}>
          {error || profile.error}
        </Text>
      )}
      {tab === '달력' ? (
        <WorkoutCalendar monthly history={history} ready now={now} />
      ) : tab === '전체 기록' ? (
        <WorkoutHistory records={[...history].reverse()} journals={entries} onJournal={onJournal} />
      ) : session && journalSource === 'account' ? (
        <ServerPostList
          session={session}
          onTotal={setServerPostCount}
          onLoadStatus={setPostLoadStatus}
        />
      ) : entries.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -20 }}>
          {[...entries]
            .sort((a, b) => b.createdAt - a.createdAt)
            .map((j) => (
              <View key={j.workoutId} style={{ width: '33.333333%', padding: 1 }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${j.memo || '오운완'} 게시물 보기`}
                  onPress={() => {
                    setPost(`own:${j.workoutId}`);
                  }}
                >
                  {j.testPhotoTile !== undefined ? (
                    <TestPhoto tile={j.testPhotoTile} label="내 가상 오운완 사진" />
                  ) : journalPhotos(j).length ? (
                    <Image
                      source={{ uri: journalPhotos(j)[0] }}
                      style={{ width: '100%', aspectRatio: 1 }}
                    />
                  ) : (
                    <View
                      style={{
                        aspectRatio: 1,
                        padding: 10,
                        gap: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: colors.primarySoft,
                      }}
                    >
                      <AppIcon name="image" size={24} />
                      <Text numberOfLines={3} style={[ui.muted, { textAlign: 'center' }]}>
                        {j.memo || '사진 없는 오운완'}
                      </Text>
                    </View>
                  )}
                  {journalPhotos(j).length > 1 && (
                    <View
                      style={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        backgroundColor: colors.text,
                        borderRadius: 8,
                        paddingHorizontal: 7,
                        paddingVertical: 3,
                      }}
                    >
                      <Text style={{ color: colors.onPrimary, fontSize: 12 }}>
                        {journalPhotos(j).length}장
                      </Text>
                    </View>
                  )}
                </Pressable>
                <LikeButton post={`own:${j.workoutId}`} />
              </View>
            ))}
        </View>
      ) : (
        <View style={[ui.card, { alignItems: 'center', paddingVertical: 48 }]}>
          <AppIcon name="image" size={32} />
          <Text style={ui.heading}>
            {entries.length ? '사진을 남겨보세요' : '첫 오운완을 남겨보세요'}
          </Text>
          <Text style={ui.muted}>
            {entries.length
              ? '사진 없는 오운완은 전체 기록에서 확인할 수 있어요.'
              : '운동을 마친 뒤 사진을 기록할 수 있어요.'}
          </Text>
        </View>
      )}
      {__DEV__ &&
        profile.value.journals.filter((j) => j.workoutId.startsWith('sample-own-')).length < 3 && (
          <Button
            title="내 샘플 게시물 3개 추가"
            secondary
            disabled={!profile.ready || profile.busy}
            onPress={() =>
              void profile
                .save(addOwnSamplePosts(profile.value))
                .catch(() => setError('샘플 게시물을 저장하지 못했습니다.'))
            }
          />
        )}
      {/* 저장 순서와 실제 운동 날짜가 달라도 사용자가 원하는 기록을 직접 고릅니다. */}
      <Modal
        visible={choosingWorkout}
        onDismiss={openPendingJournal}
        animationType="slide"
        onRequestClose={() => setChoosingWorkout(false)}
      >
        <SafeAreaView style={ui.page}>
          <ScreenLayout title="오운완을 남길 운동 선택" onBack={() => setChoosingWorkout(false)}>
            <Text style={ui.muted}>
              사진과 글을 남길 운동 날짜를 선택해 주세요. 기존 오운완은 수정할 수 있습니다.
            </Text>
            <WorkoutHistory
              records={history}
              onSelect={(workout) => {
                pendingJournal.current = workout;
                setChoosingWorkout(false);
                if (Platform.OS !== 'ios') openPendingJournal();
              }}
            />
          </ScreenLayout>
        </SafeAreaView>
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
    </ScreenLayout>
  );
}
