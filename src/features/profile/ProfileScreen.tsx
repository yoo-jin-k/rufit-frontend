import { TestPhoto } from '../../components/TestPhoto';
import { LikedPostScreen } from './LikedPostScreen';
import { addOwnSamplePosts } from './journalModel';
import { useTestFriends } from './useTestFriends';
import { countTestFriends, testSelf } from './friendTestModel';
import { LikeButton } from '../../components/LikeButton';
import { NotificationButton } from '../../components/NotificationButton';
/** 프로필 통계는 실제 완료 기록에서 집계합니다. 사진 없는 오운완도 전체 기록과 달력에 남습니다. */
import { useState } from 'react';
import { Image, Pressable, Text, TextInput, View } from 'react-native';
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
}: {
  now: number;
  history: Workout[];
  profile: ReturnType<typeof useProfile>;
  onJournal: (workout: Workout) => void;
}) {
  const social = useTestFriends();
  const friendCount = countTestFriends(social.records, testSelf);
  const [tab, setTab] = useState('오운완'),
    [editing, setEditing] = useState(false),
    [name, setName] = useState(profile.value.nickname),
    [error, setError] = useState(''),
    [friends, setFriends] = useState(false);
  const [post, setPost] = useState<string | null>(null);
  const entries = profile.value.journals.filter(
    (j) => history.some((w) => w.id === j.workoutId) || j.workoutId.startsWith('sample-own-'),
  );
  if (friends) return <FriendsScreen onClose={() => setFriends(false)} />;
  if (editing)
    return (
      <ScreenLayout title="프로필 편집" onBack={() => setEditing(false)}>
        <Text style={ui.muted}>닉네임</Text>
        <TextInput
          accessibilityLabel="닉네임"
          value={name}
          onChangeText={setName}
          maxLength={24}
          style={ui.input}
        />
        {!!error && <Text style={ui.error}>{error}</Text>}
        <Button
          title="저장"
          loading={profile.busy}
          onPress={() => {
            if (!name.trim()) {
              setError('닉네임을 입력해 주세요.');
              return;
            }
            void profile
              .save({ ...profile.value, nickname: name.trim() })
              .then(() => setEditing(false))
              .catch(() => setError('저장하지 못했습니다. 다시 시도해 주세요.'));
          }}
        />
      </ScreenLayout>
    );
  return (
    <ScreenLayout>
      <View style={ui.between}>
        <Text style={ui.heading}>{profile.value.nickname}</Text>
        <View style={ui.row}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="오운완 기록 추가"
            onPress={() => {
              const w = history.at(-1);
              if (w) onJournal(w);
              else setError('운동을 완료한 뒤 오운완을 남겨 주세요.');
            }}
            style={{ padding: 10 }}
          >
            <AppIcon name="plus" />
          </Pressable>
          <NotificationButton />
        </View>
      </View>
      <View style={ui.row}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: colors.primarySoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppIcon name="profile" size={30} />
        </View>
        {[
          { label: '운동한 날', value: Object.keys(workoutsByDay(history)).length },
          { label: '오운완', value: entries.length },
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
            <Text style={ui.heading}>{item.value}</Text>
            <Text style={[ui.muted, { fontSize: 11 }]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
      <Button
        title="프로필 편집"
        secondary
        disabled={!profile.ready}
        onPress={() => {
          setName(profile.value.nickname);
          setEditing(true);
        }}
      />
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
      ) : entries.some((j) => j.photo || j.testPhotoTile !== undefined) ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -20 }}>
          {[...entries]
            .sort((a, b) => b.createdAt - a.createdAt)
            .filter((j) => j.photo || j.testPhotoTile !== undefined)
            .map((j) => (
              <View key={j.workoutId} style={{ width: '33.333333%', padding: 1 }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="오운완 사진과 메모 보기"
                  onPress={() => {
                    setPost(`own:${j.workoutId}`);
                  }}
                >
                  {j.testPhotoTile !== undefined ? (
                    <TestPhoto tile={j.testPhotoTile} label="내 가상 오운완 사진" />
                  ) : (
                    <Image source={{ uri: j.photo }} style={{ width: '100%', aspectRatio: 1 }} />
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
      {post && <LikedPostScreen post={post} onClose={() => setPost(null)} />}
    </ScreenLayout>
  );
}
