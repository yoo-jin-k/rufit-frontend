import { useReadRecovery } from '../../hooks/useReadRecovery';
import { ServerPostEditor } from './ServerPostEditor';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Image, Pressable, Text, View } from 'react-native';
import { DoubleTapHeart, HeartButton } from '../../components/HeartLike';
import { ui } from '../../components/ScreenLayout';
import { SwipeBackModal } from '../../components/SwipeBackModal';
import { IconButton, NavBar, Screen } from '../../components/kit/Screen';
import {
  BottomSheet,
  ConfirmDialog,
  GroupLabel,
  ListGroup,
  ListRow,
} from '../../components/kit/Surfaces';
import { tokens } from '../../theme/tokens';
import { AppIcon } from '../../components/AppIcon';

import { Button } from '../../components/Button';
import type { RufitSession } from '../../api/session';
import { ApiError, type ServerPost } from '../../api/client';

/** 공개 범위를 화면 문구로 바꿉니다. */
export const visibilityLabel: Record<ServerPost['visibility'], string> = {
  PUBLIC: '전체 공개',
  FRIENDS: '친구 공개',
  PRIVATE: '나만 보기',
};

/** 목록에는 작은 미리보기만 받고 상세 사진은 게시물을 열 때 권한을 다시 확인합니다. */
export function ServerPostList({
  session,
  memberId,
  onTotal,
  onLoadStatus,
}: {
  session: RufitSession;
  memberId?: string;
  onTotal?: (total: number) => void;
  onLoadStatus?: (status: 'loading' | 'ready' | 'error') => void;
}) {
  const [items, setItems] = useState<ServerPost[]>([]),
    [page, setPage] = useState(0),
    [hasNext, setNext] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [selected, setSelected] = useState<string | null>(null);
  const alive = useRef(true),
    sequence = useRef(0);
  const load = useCallback(
    async (next = 0) => {
      const order = ++sequence.current;
      setBusy(true);
      onLoadStatus?.('loading');
      try {
        // 신규 계정은 아직 소셜 프로필이 없을 수 있습니다. 게시물이 없는 정상 상태로 표시합니다.
        const directory = !memberId ? await session.api.directorySettings() : null;
        const result =
          !memberId && !directory?.memberId
            ? { items: [], total: 0, hasNext: false }
            : await session.api.posts(memberId, next);
        if (!alive.current || !session.isActive() || order !== sequence.current) return;
        setItems((old) =>
          next
            ? [...old, ...result.items.filter((item) => !old.some((p) => p.id === item.id))]
            : result.items,
        );
        setPage(next);
        setNext(result.hasNext);
        onTotal?.(result.total);
        onLoadStatus?.('ready');
        setError('');
      } catch (e) {
        if (alive.current && session.isActive() && order === sequence.current) {
          // 조회 실패를 계속 로딩 중이거나 게시물 0개인 상태로 표시하지 않습니다.
          onLoadStatus?.('error');
          setError(
            e instanceof ApiError && e.status === 404 && !memberId
              ? '프로필 정보를 확인하지 못했습니다. 프로필 편집에서 다시 저장해 주세요.'
              : e instanceof Error
                ? e.message
                : '게시물을 불러오지 못했습니다.',
          );
        }
      } finally {
        if (alive.current && order === sequence.current) setBusy(false);
      }
    },
    [session, memberId, onTotal, onLoadStatus],
  );
  useEffect(() => {
    alive.current = true;
    void Promise.resolve().then(() => {
      if (alive.current) void load();
    });
    return () => {
      alive.current = false;
    };
  }, [load]);
  // 앱 복귀 시 최신 게시물을 조회하며 화면을 닫으면 구독도 해제합니다.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && !selected) void load();
    });
    return () => subscription.remove();
  }, [load, selected]);
  useReadRecovery(/연결|네트워크|시간 초과|network|fetch/i.test(error), () => load());
  return (
    <View style={{ gap: 12 }}>
      <Text style={ui.heading}>{memberId ? '친구 공개 오운완' : '오운완'}</Text>
      {!!error && (
        <Text accessibilityRole="alert" style={ui.error}>
          {error}
        </Text>
      )}
      {busy && <Text style={ui.muted}>게시물을 불러오고 있습니다.</Text>}
      {!busy && !error && !items.length && (
        <Text style={ui.muted}>아직 오운완이 없습니다. 운동을 마친 뒤 첫 기록을 남겨보세요.</Text>
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {items.map((post) => (
          <Pressable
            key={post.id}
            accessibilityRole="button"
            accessibilityLabel={`${post.memo || post.date} 계정 게시물 보기`}
            onPress={() => setSelected(post.id)}
            style={{ width: '33.333333%', padding: 2 }}
          >
            {post.thumbnail ? (
              <Image source={{ uri: post.thumbnail }} style={{ width: '100%', aspectRatio: 1 }} />
            ) : (
              <View style={[ui.card, { aspectRatio: 1, padding: 8 }]}>
                <Text numberOfLines={3} style={ui.muted}>
                  {post.memo || '사진 없는 오운완'}
                </Text>
              </View>
            )}
            <Text style={ui.muted}>{post.date}</Text>
          </Pressable>
        ))}
      </View>
      {hasNext && (
        <Button
          title="게시물 더 보기"
          secondary
          disabled={busy}
          onPress={() => void load(page + 1)}
        />
      )}
      {selected && (
        <ServerPostDetail
          session={session}
          id={selected}
          onClose={() => {
            setSelected(null);
            void load();
          }}
        />
      )}
    </View>
  );
}

/** 좋아요와 공개 해제 결과는 서버 응답으로 갱신하며 실패한 작업을 성공으로 표시하지 않습니다. */
export function ServerPostDetail({
  session,
  id,
  onClose,
  onOpenMember,
}: {
  session: RufitSession;
  id: string;
  onClose: () => void;
  /** 작성자 이름을 누르면 그 회원의 프로필을 엽니다. 없으면 이름은 글자로만 보입니다. */
  onOpenMember?: (memberId: string) => void;
}) {
  const [post, setPost] = useState<ServerPost | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(true);
  const [editing, setEditing] = useState(false),
    [confirmDelete, setConfirmDelete] = useState(false);
  const alive = useRef(true),
    locked = useRef(false);
  const load = useCallback(async () => {
    try {
      const value = await session.api.post(id);
      if (alive.current && session.isActive()) {
        setPost(value);
        setError('');
      }
    } catch (e) {
      if (alive.current) {
        setPost(null);
        setError(e instanceof Error ? e.message : '게시물을 불러오지 못했습니다.');
      }
    } finally {
      if (alive.current) setBusy(false);
    }
  }, [session, id]);
  useEffect(() => {
    alive.current = true;
    void Promise.resolve().then(() => {
      if (alive.current) void load();
    });
    return () => {
      alive.current = false;
    };
  }, [load]);
  /** like를 주면 그 값으로 맞추고(사진 두 번 누르기는 true), 없으면 지금 상태를 뒤집습니다. */
  async function change(hide = false, like?: boolean) {
    if (!post || locked.current) return;
    if (!hide && like !== undefined && like === post.liked) return;
    locked.current = true;
    setBusy(true);
    try {
      if (hide) await session.api.hidePost(id);
      else await session.api.likePost(id, like ?? !post.liked);
      await load();
    } catch (e) {
      if (alive.current) setError(e instanceof Error ? e.message : '변경하지 못했습니다.');
    } finally {
      locked.current = false;
      if (alive.current) setBusy(false);
    }
  }
  // 삭제 확인은 화면에서 먼저 받고, 서버 응답을 잃은 경우 같은 버전으로 재시도합니다.
  async function remove() {
    if (!post || locked.current || !session.isActive()) return;
    locked.current = true;
    setBusy(true);
    setError('');
    try {
      await session.api.deletePost(id, post.version);
      if (session.isActive()) onClose();
    } catch (e) {
      if (alive.current) setError(e instanceof Error ? e.message : '삭제하지 못했습니다.');
    } finally {
      locked.current = false;
      if (alive.current) setBusy(false);
    }
  }
  // 공개 범위만 바꿀 때도 서버 저장 규칙(버전 확인)을 그대로 씁니다. 원본 키가 없으면 나만 보기 전환만 지원합니다.
  async function setVisibility(visibility: ServerPost['visibility']) {
    if (!post || locked.current || post.visibility === visibility) return;
    if (!post.sourceId) {
      if (visibility === 'PRIVATE') await change(true);
      return;
    }
    locked.current = true;
    setBusy(true);
    setError('');
    try {
      const saved = await session.api.savePost(post.sourceId, {
        version: post.version,
        memo: post.memo,
        date: post.date,
        summary: post.summary,
        visibility,
        photos: post.photos,
      });
      if (alive.current) setPost(saved);
    } catch (e) {
      if (alive.current)
        setError(e instanceof Error ? e.message : '공개 범위를 바꾸지 못했습니다.');
    } finally {
      locked.current = false;
      if (alive.current) setBusy(false);
    }
  }
  const [menu, setMenu] = useState(false);
  return (
    <>
      <SwipeBackModal onClose={onClose} canClose={() => !locked.current}>
        {(back) => (
          <>
            <Screen
              header={
                <NavBar
                  title="오운완"
                  onLeading={back}
                  trailing={
                    post?.mine ? (
                      <IconButton
                        icon="dots"
                        label="게시물 관리"
                        color={tokens.color.text.secondary}
                        onPress={() => setMenu(true)}
                      />
                    ) : undefined
                  }
                />
              }
            >
              {!!error && (
                <Text accessibilityRole="alert" style={ui.error}>
                  {error}
                </Text>
              )}
              {!post && !busy && (
                <Button title="게시물 다시 불러오기" disabled={busy} onPress={() => void load()} />
              )}
              {post && (
                <>
                  {onOpenMember && !post.mine ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${post.nickname} 프로필 보기`}
                      onPress={() => onOpenMember(post.memberId)}
                      style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}
                    >
                      <Text style={ui.heading}>{post.nickname}</Text>
                    </Pressable>
                  ) : (
                    <Text style={ui.heading}>{post.nickname}</Text>
                  )}
                  <Text style={ui.muted}>
                    {post.date} · {post.summary}
                  </Text>
                  <Text style={ui.muted}>{visibilityLabel[post.visibility]}</Text>
                  {post.photos.map((photo, index) => (
                    <DoubleTapHeart key={index} onDoubleTap={() => void change(false, true)}>
                      <Image
                        accessibilityLabel={`오운완 사진 ${index + 1}`}
                        source={{ uri: photo }}
                        resizeMode="contain"
                        style={{ width: '100%', aspectRatio: 1 }}
                      />
                    </DoubleTapHeart>
                  ))}
                  {/* 본인 게시물에도 좋아요를 누를 수 있습니다. 본인에게는 알림이 가지 않습니다. */}
                  <HeartButton
                    liked={post.liked}
                    count={post.likes}
                    showLabel
                    disabled={busy}
                    onPress={() => void change()}
                  />
                  <Text style={ui.body}>{post.memo || '오늘도 운동 완료'}</Text>
                </>
              )}
            </Screen>
            {/* iOS는 떠 있는 화면 바깥의 새 모달을 띄우지 못하므로 메뉴·확인 창·편집 화면을 이 화면 안에 둡니다. */}
            {/* 오른쪽 위 점 세 개: 수정, 공개 범위, 삭제를 한곳에 모읍니다. */}
            <BottomSheet
              visible={menu && !!post}
              title="게시물 관리"
              onClose={() => setMenu(false)}
            >
              <ListGroup>
                <ListRow
                  icon="pencil"
                  label="수정하기"
                  trailing="none"
                  onPress={() => {
                    setMenu(false);
                    // 메뉴 시트가 다 내려간 뒤에 다음 화면을 띄워야 iOS에서 열립니다.
                    setTimeout(() => setEditing(true), 350);
                  }}
                />
              </ListGroup>
              <GroupLabel>공개 범위</GroupLabel>
              <ListGroup>
                {(
                  [
                    ['PUBLIC', '전체 공개'],
                    ['FRIENDS', '친구 공개'],
                    ['PRIVATE', '나만 보기'],
                  ] as const
                ).map(([value, label]) => (
                  <ListRow
                    key={value}
                    label={label}
                    trailing={
                      post?.visibility === value ? (
                        <AppIcon name="check" color={tokens.color.accent.default} />
                      ) : (
                        'none'
                      )
                    }
                    onPress={() => {
                      setMenu(false);
                      void setVisibility(value);
                    }}
                  />
                ))}
              </ListGroup>
              <ListGroup>
                <ListRow
                  icon="trash"
                  label="삭제하기"
                  danger
                  trailing="none"
                  onPress={() => {
                    setMenu(false);
                    setTimeout(() => setConfirmDelete(true), 350);
                  }}
                />
              </ListGroup>
            </BottomSheet>
            <ConfirmDialog
              visible={confirmDelete}
              title="게시물을 삭제할까요?"
              message="이 계정 게시물의 사진·글·좋아요가 삭제되며 복구할 수 없습니다. 운동 기록과 기기 저장본은 유지됩니다."
              confirmLabel="삭제"
              tone="danger"
              busy={busy}
              onCancel={() => setConfirmDelete(false)}
              onConfirm={() => {
                setConfirmDelete(false);
                void remove();
              }}
            />
            {editing && post && (
              <ServerPostEditor
                session={session}
                post={post}
                onSaved={(saved) => {
                  setPost(saved);
                  setEditing(false);
                }}
                onClose={() => {
                  setEditing(false);
                  void load();
                }}
              />
            )}
          </>
        )}
      </SwipeBackModal>
    </>
  );
}
