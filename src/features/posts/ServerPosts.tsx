import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenLayout, ui } from '../../components/ScreenLayout';
import { Button } from '../../components/Button';
import type { RufitSession } from '../../api/session';
import type { ServerPost } from '../../api/client';

/** 목록에는 작은 미리보기만 받고 상세 사진은 게시물을 열 때 권한을 다시 확인합니다. */
export function ServerPostList({
  session,
  memberId,
  onTotal,
}: {
  session: RufitSession;
  memberId?: string;
  onTotal?: (total: number) => void;
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
      try {
        const result = await session.api.posts(memberId, next);
        if (!alive.current || !session.isActive() || order !== sequence.current) return;
        setItems((old) =>
          next
            ? [...old, ...result.items.filter((item) => !old.some((p) => p.id === item.id))]
            : result.items,
        );
        setPage(next);
        setNext(result.hasNext);
        onTotal?.(result.total);
        setError('');
      } catch (e) {
        if (alive.current && order === sequence.current)
          setError(e instanceof Error ? e.message : '게시물을 불러오지 못했습니다.');
      } finally {
        if (alive.current && order === sequence.current) setBusy(false);
      }
    },
    [session, memberId, onTotal],
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
  return (
    <View style={{ gap: 12 }}>
      <Text style={ui.heading}>{memberId ? '친구 공개 오운완' : '내 계정 오운완'}</Text>
      {!!error && (
        <Text accessibilityRole="alert" style={ui.error}>
          {error}
        </Text>
      )}
      <Button
        title="게시물 새로고침"
        compact
        secondary
        disabled={busy}
        onPress={() => void load()}
      />
      {busy && <Text style={ui.muted}>게시물을 불러오고 있습니다.</Text>}
      {!busy && !error && !items.length && (
        <Text style={ui.muted}>표시할 계정 게시물이 없습니다.</Text>
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
}: {
  session: RufitSession;
  id: string;
  onClose: () => void;
}) {
  const [post, setPost] = useState<ServerPost | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(true);
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
  async function change(hide = false) {
    if (!post || locked.current) return;
    locked.current = true;
    setBusy(true);
    try {
      if (hide) await session.api.hidePost(id);
      else await session.api.likePost(id, !post.liked);
      await load();
    } catch (e) {
      if (alive.current) setError(e instanceof Error ? e.message : '변경하지 못했습니다.');
    } finally {
      locked.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={ui.page}>
        <ScreenLayout
          title="오운완"
          onBack={onClose}
          footer={<Button title="닫기" secondary onPress={onClose} />}
        >
          {!!error && (
            <Text accessibilityRole="alert" style={ui.error}>
              {error}
            </Text>
          )}
          {!post && (
            <Button title="게시물 다시 불러오기" disabled={busy} onPress={() => void load()} />
          )}
          {post && (
            <>
              <Text style={ui.heading}>{post.nickname}</Text>
              <Text style={ui.muted}>
                {post.date} · {post.summary}
              </Text>
              <Text style={ui.muted}>
                {post.visibility === 'FRIENDS' ? '친구 공개' : '나만 보기'}
              </Text>
              {post.photos.map((photo, index) => (
                <Image
                  key={index}
                  accessibilityLabel={`오운완 사진 ${index + 1}`}
                  source={{ uri: photo }}
                  resizeMode="contain"
                  style={{ width: '100%', aspectRatio: 1 }}
                />
              ))}
              <Text style={ui.body}>{post.memo || '오늘도 운동 완료'}</Text>
              <Text style={ui.body}>좋아요 {post.likes}개</Text>
              {!post.mine && (
                <Button
                  title={post.liked ? '♥ 좋아요 취소' : '♡ 좋아요'}
                  secondary
                  disabled={busy}
                  onPress={() => void change()}
                />
              )}
              {post.mine && post.visibility === 'FRIENDS' && (
                <Button
                  title="나만 보기로 변경"
                  secondary
                  disabled={busy}
                  onPress={() => void change(true)}
                />
              )}
            </>
          )}
        </ScreenLayout>
      </SafeAreaView>
    </Modal>
  );
}
