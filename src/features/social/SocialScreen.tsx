/**
 * 소셜 탭: 다른 회원의 오운완을 최신순 세 칸 격자로 보여 줍니다.
 * 서버가 내가 볼 수 있는 글(전체 공개 + 친구의 친구 공개)만 돌려줍니다. 위쪽 "전체 ▾"에서 전체와 팔로잉(친구 글만) 중에 고릅니다.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiError, type ServerPost } from '../../api/client';
import type { RufitSession } from '../../api/session';
import { AppIcon } from '../../components/AppIcon';
import { Button } from '../../components/Button';
import { BottomSheet, EmptyCard, ListGroup, ListRow } from '../../components/kit/Surfaces';
import { tokens } from '../../theme/tokens';
import { ServerPostDetail } from '../posts/ServerPosts';
import { AppModal } from '../../components/AppModal';
import { ServerFriendsScreen } from '../profile/ServerFriendsScreen';
import { s } from './SocialScreen.styles';

type Filter = 'ALL' | 'FOLLOWING';
const filterLabel: Record<Filter, string> = { ALL: '전체', FOLLOWING: '팔로잉' };

export function SocialScreen({
  session,
  onOpenAuth,
}: {
  session: RufitSession | null;
  onOpenAuth: () => void;
}) {
  const { width } = useWindowDimensions();
  const size = (width - 4) / 3;
  const [filter, setFilter] = useState<Filter>('ALL');
  const [items, setItems] = useState<ServerPost[]>([]);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [needsNickname, setNeedsNickname] = useState(false);
  const [picker, setPicker] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  // 작성자 이름을 눌러 연 회원 프로필입니다.
  const [member, setMember] = useState<string | null>(null);
  // 보기를 바꾸거나 새로고침한 뒤 늦게 온 이전 응답은 버립니다.
  const request = useRef(0);

  const load = useCallback(
    async (nextPage: number, mode: 'first' | 'more' | 'refresh') => {
      if (!session?.isActive()) return;
      const id = ++request.current;
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      try {
        const result = await session.api.feed(filter === 'FOLLOWING', nextPage);
        if (id !== request.current || !session.isActive()) return;
        setItems((old) => (nextPage === 0 ? result.items : [...old, ...result.items]));
        setPage(nextPage);
        setHasNext(result.hasNext);
        setError('');
        setNeedsNickname(false);
      } catch (cause) {
        if (id !== request.current) return;
        if (cause instanceof ApiError && cause.status === 404) setNeedsNickname(true);
        else setError(cause instanceof Error ? cause.message : '오운완을 불러오지 못했습니다.');
      } finally {
        if (id === request.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [session, filter],
  );

  // 탭을 열 때와 보기를 바꿀 때 첫 페이지부터 다시 읽습니다.
  useEffect(() => {
    // load는 서버 응답을 기다린 뒤 상태를 바꿉니다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(0, 'first');
  }, [load]);

  function choose(next: Filter) {
    setPicker(false);
    if (next === filter) return;
    setItems([]);
    setHasNext(false);
    setFilter(next);
  }

  const header = (
    <View style={s.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`보기 선택, 지금 ${filterLabel[filter]}`}
        disabled={!session}
        onPress={() => setPicker(true)}
        style={s.picker}
      >
        <Text numberOfLines={1} style={s.pickerText}>
          {filterLabel[filter]}
        </Text>
        {!!session && <AppIcon name="chevron-down" color={tokens.color.text.secondary} />}
      </Pressable>
    </View>
  );

  if (!session)
    return (
      <SafeAreaView edges={['top']} style={s.page}>
        {header}
        <View style={s.state}>
          <EmptyCard
            icon="users"
            title="로그인하면 다른 회원의 오운완을 볼 수 있어요"
            body="전체 공개 오운완과 친구의 오운완이 최신순으로 모여요"
          />
          <Button title="로그인" onPress={onOpenAuth} />
        </View>
      </SafeAreaView>
    );

  return (
    <SafeAreaView edges={['top']} style={s.page}>
      {header}
      <FlatList
        data={items}
        keyExtractor={(post) => post.id}
        numColumns={3}
        columnWrapperStyle={s.row}
        contentContainerStyle={s.grid}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void load(0, 'refresh')} />
        }
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (hasNext && !loading && !refreshing) void load(page + 1, 'more');
        }}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${item.nickname}님의 오운완, ${item.date}, 조회 ${item.views ?? 0}회`}
            onPress={() => setOpen(item.id)}
            style={({ pressed }) => [
              s.tile,
              { width: size, height: size, flex: 0 },
              pressed && s.tilePressed,
            ]}
          >
            {item.thumbnail ? (
              <Image source={{ uri: item.thumbnail }} style={s.tileImage} resizeMode="cover" />
            ) : (
              <View style={[s.tileText, s.tileTextNamed]}>
                <Text style={s.tileDate}>{item.date}</Text>
                <Text numberOfLines={2} style={s.tileSummary}>
                  {item.memo || item.summary}
                </Text>
              </View>
            )}
            {/* 닉네임 대신 조회수를 보여 줍니다. 작성자는 게시물 상세에서 이름을 눌러 볼 수 있습니다. */}
            <View style={s.views}>
              <AppIcon name="eye" size={12} color={tokens.color.text.inverse} />
              <Text style={s.viewsText}>{(item.views ?? 0).toLocaleString('ko-KR')}</Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          loading ? null : (
            <View style={s.state}>
              {needsNickname ? (
                <EmptyCard
                  icon="users"
                  title="닉네임을 먼저 저장해 주세요"
                  body="프로필 → 친구 화면에서 닉네임을 저장하면 소셜을 이용할 수 있어요"
                />
              ) : error ? (
                <>
                  <Text accessibilityRole="alert" style={s.error}>
                    {error}
                  </Text>
                  <Button title="다시 불러오기" secondary onPress={() => void load(0, 'first')} />
                </>
              ) : (
                <EmptyCard
                  icon="image"
                  title={
                    filter === 'FOLLOWING'
                      ? '팔로잉한 친구의 오운완이 아직 없어요'
                      : '아직 공개된 오운완이 없어요'
                  }
                  body={
                    filter === 'FOLLOWING'
                      ? '친구가 오운완을 친구 공개나 전체 공개로 올리면 여기에 모여요'
                      : "오운완을 '전체 공개'로 저장하면 여기에 모여요"
                  }
                />
              )}
            </View>
          )
        }
        ListFooterComponent={
          loading && items.length > 0 ? (
            <View style={s.footer}>
              <Text style={s.muted}>더 불러오는 중…</Text>
            </View>
          ) : null
        }
      />
      <BottomSheet visible={picker} title="보기 선택" onClose={() => setPicker(false)}>
        <ListGroup>
          {(['ALL', 'FOLLOWING'] as const).map((value) => (
            <ListRow
              key={value}
              icon={value === 'ALL' ? 'users' : 'userplus'}
              label={filterLabel[value]}
              accessibilityLabel={
                value === 'ALL' ? '전체 오운완 보기' : '팔로잉한 친구의 오운완만 보기'
              }
              trailing={
                filter === value ? (
                  <AppIcon name="check" color={tokens.color.accent.default} />
                ) : (
                  'none'
                )
              }
              onPress={() => choose(value)}
            />
          ))}
        </ListGroup>
      </BottomSheet>
      {open && (
        <ServerPostDetail
          session={session}
          id={open}
          onOpenMember={(memberId) => {
            setOpen(null);
            setMember(memberId);
          }}
          onClose={() => {
            setOpen(null);
            // 상세에서 좋아요·공개 범위가 바뀌었을 수 있어 지금 보기를 다시 읽습니다.
            void load(0, 'first');
          }}
        />
      )}
      <AppModal visible={!!member} animationType="slide" onRequestClose={() => setMember(null)}>
        {/* 친구 화면이 위쪽 안전 영역을 직접 비우므로 여기서는 감싸지 않습니다. */}
        <View style={s.page}>
          {member && (
            <ServerFriendsScreen
              session={session}
              nickname=""
              initialMemberId={member}
              onClose={() => setMember(null)}
            />
          )}
        </View>
      </AppModal>
    </SafeAreaView>
  );
}
