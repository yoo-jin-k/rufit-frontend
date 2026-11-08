/**
 * Figma 06-04 오운완 게시물입니다. 작성자, 사진, 글, 연결된 운동 기록, 응원(하트)을 보여 줍니다.
 * 좋아요 알림의 게시물 ID로 원본 오운완을 찾고, 없어진 게시물은 따로 안내하며 샘플로 바꾸지 않습니다.
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppModal as Modal } from '../../components/AppModal';
import { AppIcon } from '../../components/AppIcon';
import { LikeButton } from '../../components/LikeButton';
import { TestPhoto } from '../../components/TestPhoto';
import { IconButton, NavBar, Screen } from '../../components/kit/Screen';
import { BottomSheet, EmptyCard, ListGroup, ListRow, PhotoPlaceholder } from '../../components/kit/Surfaces';
import { text, tokens } from '../../theme/tokens';
import { JournalGallery } from './JournalGallery';
import { journalPhotos } from './journalModel';
import { ProfileAvatar } from './ProfileAvatar';
import { useProfile } from './useProfile';

const c = tokens.color;

export function LikedPostScreen({ post, onClose, onEdit }: { post: string; onClose: () => void; onEdit?: () => void }) {
  const profile = useProfile();
  const [menu, setMenu] = useState(false);
  const sample = __DEV__ && post === 'demo-own:post-1';
  const entry = post.startsWith('own:') ? profile.value.journals.find((j) => j.workoutId === post.slice(4)) : undefined;
  const created = entry ? new Date(entry.createdAt) : null;
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <Screen
        header={
          <NavBar
            title="오운완"
            onLeading={onClose}
            trailing={entry && onEdit ? <IconButton icon="dots" label="더보기" onPress={() => setMenu(true)} /> : undefined}
          />
        }
      >
        {!sample && !profile.ready && (
          <Text style={[text.caption, { color: c.text.secondary }]}>{profile.error || '게시물을 불러오는 중입니다.'}</Text>
        )}
        {!sample && profile.ready && !entry && (
          <EmptyCard icon="image" title="게시물을 찾을 수 없어요" body="삭제되었거나 이 기기에 없는 기록입니다." />
        )}
        {(sample || entry) && (
          <>
            <View style={s.author}>
              <ProfileAvatar photo={profile.value.avatar} size={36} />
              <View style={{ flex: 1 }}>
                <Text style={[text.calloutBold, { color: c.text.primary }]}>{sample ? '나 (테스트)' : profile.value.nickname}</Text>
                {created && (
                  <Text style={[text.label, { color: c.text.secondary }]}>
                    {created.getMonth() + 1}월 {created.getDate()}일 {created.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })}
                  </Text>
                )}
              </View>
            </View>
            {sample ? (
              <TestPhoto tile={5} label="내 가상 오운완 테스트 사진" />
            ) : entry?.testPhotoTile !== undefined ? (
              <TestPhoto tile={entry.testPhotoTile} label="내 가상 오운완 샘플 사진" />
            ) : journalPhotos(entry).length ? (
              <JournalGallery photos={journalPhotos(entry)} />
            ) : (
              <PhotoPlaceholder style={s.photo} />
            )}
            <Text style={[text.bodyMedium, { color: c.text.primary }]}>
              {sample ? '오늘도 오운완! 좋아요 알림 확인용 가상 게시물입니다.' : entry?.memo || '메모 없이 남긴 기록입니다.'}
            </Text>
            <View style={s.cheer}>
              <AppIcon name="heart" color={c.danger.default} />
              <Text style={[text.calloutBold, { color: c.text.primary, flex: 1 }]}>응원</Text>
              <LikeButton post={post} />
            </View>
            <Text style={[text.label, { color: c.text.muted }]}>
              {sample ? '샘플 게시물 · 실제 운동 기록에 포함되지 않습니다.' : '공개 범위 · 이 기기에만 저장된 오운완'}
            </Text>
          </>
        )}
      </Screen>
      <BottomSheet visible={menu} title="게시물 관리" onClose={() => setMenu(false)}>
        <ListGroup>
          <ListRow icon="pencil" label="사진 · 글 수정" onPress={() => { setMenu(false); onEdit?.(); }} />
        </ListGroup>
      </BottomSheet>
    </Modal>
  );
}

const s = StyleSheet.create({
  author: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[12] },
  photo: { width: '100%', aspectRatio: 1 },
  cheer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
