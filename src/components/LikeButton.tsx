/** 목록·상세의 하트 상태를 함께 갱신합니다. 디스크 저장에 성공한 경우에만 화면을 갱신합니다. */
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from './AppIcon';
import { useLikes } from '../features/profile/useLikes';
import { text, tokens } from '../theme/tokens';
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
        <AppIcon name="heart" size={18} color={liked ? tokens.color.danger.default : tokens.color.text.secondary} filled={liked} />
        <Text style={[text.label, { color: tokens.color.text.secondary }]}>{count}</Text>
      </Pressable>
      {!!value.error && (
        <Text accessibilityRole="alert" style={[text.label, { color: tokens.color.danger.default }]}>
          {value.error}
        </Text>
      )}
    </View>
  );
}
