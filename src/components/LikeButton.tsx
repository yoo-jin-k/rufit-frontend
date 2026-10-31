/** 목록·상세의 하트 상태를 함께 갱신합니다. 디스크 저장에 성공한 경우에만 화면을 갱신합니다. */
import { useEffect, useSyncExternalStore } from 'react';
import { Pressable, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppIcon } from './AppIcon';
import { decodeLikes, likeKey, toggleLike, type Like } from '../features/profile/likeModel';
let state = { likes: [] as Like[], ready: false, busy: false, error: '' };
const listeners = new Set<() => void>();
let loading: Promise<void> | undefined;
const get = () => state;
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
function publish(patch: Partial<typeof state>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}
async function load() {
  try {
    publish({ likes: decodeLikes(await AsyncStorage.getItem(likeKey)), ready: true });
  } catch {
    publish({ error: '하트를 불러오지 못했습니다.' });
  }
}
async function toggle(actor: string, post: string) {
  if (!state.ready || state.busy) return;
  publish({ busy: true });
  try {
    const likes = toggleLike(state.likes, actor, post);
    await AsyncStorage.setItem(likeKey, JSON.stringify(likes));
    publish({ likes, error: '' });
  } catch {
    publish({ error: '하트를 저장하지 못했습니다. 다시 시도해 주세요.' });
  } finally {
    publish({ busy: false });
  }
}
export function LikeButton({ post, actor = 'local-self' }: { post: string; actor?: string }) {
  const value = useSyncExternalStore(subscribe, get, get);
  useEffect(() => {
    loading ??= load();
  }, []);
  const liked = value.likes.some((x) => x.actor === actor && x.post === post);
  const count = value.likes.filter((x) => x.post === post).length;
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={liked ? '하트 취소' : '하트 누르기'}
        accessibilityState={{ selected: liked, disabled: !value.ready || value.busy }}
        aria-pressed={liked}
        disabled={!value.ready || value.busy}
        onPress={() => void toggle(actor, post)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          minHeight: 44,
          paddingHorizontal: 8,
        }}
      >
        <AppIcon name="heart" size={19} color={liked ? '#E64B5D' : '#777780'} filled={liked} />
        <Text style={{ fontSize: 12, color: '#777780' }}>{count}</Text>
      </Pressable>
      {!!value.error && (
        <Text accessibilityRole="alert" style={{ fontSize: 11, color: '#B42318' }}>
          {value.error}
        </Text>
      )}
    </View>
  );
}
