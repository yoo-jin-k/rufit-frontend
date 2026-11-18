/** 목록·상세의 하트 상태를 함께 갱신합니다. 디스크 저장에 성공한 경우에만 화면을 갱신합니다. */
import { Text, View } from 'react-native';
import { HeartButton } from './HeartLike';
import { useLikes } from '../features/profile/useLikes';
import { text, tokens } from '../theme/tokens';
export function LikeButton({
  post,
  actor = 'local-self',
  showLabel = false,
}: {
  post: string;
  actor?: string;
  /** 게시물 상세처럼 넓은 곳에서는 하트 아래에 "좋아요 N개"를 씁니다. */
  showLabel?: boolean;
}) {
  const value = useLikes();
  const liked = value.likes.some((x) => x.actor === actor && x.post === post);
  const count = value.likes.filter((x) => x.post === post).length;
  return (
    <View>
      <HeartButton
        liked={liked}
        count={count}
        showLabel={showLabel}
        size={showLabel ? 26 : 20}
        disabled={!value.ready || value.busy}
        onPress={() => void value.toggle(actor, post)}
      />
      {!!value.error && (
        <Text
          accessibilityRole="alert"
          style={[text.label, { color: tokens.color.danger.default }]}
        >
          {value.error}
        </Text>
      )}
    </View>
  );
}
