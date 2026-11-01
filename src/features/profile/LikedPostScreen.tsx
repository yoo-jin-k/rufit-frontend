/** 좋아요 알림의 게시물 ID로 원본 오운완을 찾습니다. 없어진 게시물은 별도 안내하며 샘플로 대체하지 않습니다. */
import { Image, Modal, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProfile } from './useProfile';
import { LikeButton } from '../../components/LikeButton';
import { TestPhoto } from '../../components/TestPhoto';
import { Button } from '../../components/Button';
import { colors } from '../../theme/tokens';
export function LikedPostScreen({ post, onClose, onEdit }: { post: string; onClose: () => void; onEdit?: () => void }) {
  const profile = useProfile();
  const sample = __DEV__ && post === 'demo-own:post-1';
  const entry = post.startsWith('own:')
    ? profile.value.journals.find((j) => j.workoutId === post.slice(4))
    : undefined;
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View
          style={{
            flex: 1,
            width: '100%',
            maxWidth: 640,
            alignSelf: 'center',
            padding: 20,
            gap: 20,
          }}
        >
          <Text style={{ fontSize: 22, lineHeight: 32, fontWeight: '700', color: colors.text }}>
            내 오운완
          </Text>
          <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 20 }}>
            {!sample && !profile.ready && (
              <Text>{profile.error || '게시물을 불러오는 중입니다.'}</Text>
            )}
            {!sample && profile.ready && !entry && (
              <Text>게시물을 찾을 수 없습니다. 삭제되었거나 이 기기에 없는 기록입니다.</Text>
            )}
            {(sample || entry) && (
              <>
                <Text style={{ fontSize: 15, fontWeight: '600' }}>
                  {sample ? '나 (테스트)' : profile.value.nickname}
                </Text>
                {sample ? (
                  <TestPhoto tile={5} label="내 가상 오운완 테스트 사진" />
                ) : entry?.testPhotoTile !== undefined ? (
                  <TestPhoto tile={entry.testPhotoTile} label="내 가상 오운완 샘플 사진" />
                ) : entry?.photo ? (
                  <Image source={{ uri: entry.photo }} style={{ width: '100%', aspectRatio: 1 }} />
                ) : (
                  <Text>사진 없이 남긴 오운완입니다.</Text>
                )}
                <LikeButton post={post} />
                <Text style={{ fontSize: 15, lineHeight: 23 }}>
                  {sample
                    ? '오늘도 오운완! 좋아요 알림 확인용 가상 게시물입니다.'
                    : entry?.memo || '메모 없이 남긴 기록입니다.'}
                </Text>
                <Text style={{ fontSize: 12, color: colors.muted }}>
                  {sample
                    ? '샘플 게시물 · 실제 운동 기록에 포함되지 않습니다.'
                    : '이 기기에 저장된 오운완'}
                </Text>
              </>
            )}
          </ScrollView>
          {entry && onEdit && <Button title="사진 · 글 수정" onPress={onEdit} />}
          <Button title="닫기" secondary onPress={onClose} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}
