/** 목록·상세의 하트 상태를 함께 갱신합니다. 디스크 저장에 성공한 경우에만 화면을 갱신합니다. */
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from './AppIcon';
import { useLikes } from '../features/profile/useLikes';
export function LikeButton({ post, actor = 'local-self' }: { post: string; actor?: string }) {
  const value = useLikes();
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
        onPress={() => void value.toggle(actor, post)}
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
