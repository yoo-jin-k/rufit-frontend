import { useRef, useState } from 'react';
import { Image, Modal, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenLayout, ui } from '../../components/ScreenLayout';
import { Button } from '../../components/Button';
import { ApiError, type ServerPost } from '../../api/client';
import type { RufitSession } from '../../api/session';
import { pickJournalPhotos } from '../profile/pickJournalPhotos';

/** 기기 운동 원본 없이도 계정 저장본을 편집합니다. 충돌·실패 시 입력 초안을 그대로 보존합니다. */
export function ServerPostEditor({
  session,
  post,
  onSaved,
  onClose,
}: {
  session: RufitSession;
  post: ServerPost;
  onSaved: (post: ServerPost) => void;
  onClose: () => void;
}) {
  const [memo, setMemo] = useState(post.memo),
    [photos, setPhotos] = useState(post.photos);
  const [visibility, setVisibility] = useState(post.visibility);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [discard, setDiscard] = useState(false),
    [conflict, setConflict] = useState(false);
  const locked = useRef(false);
  const changed =
    memo !== post.memo ||
    visibility !== post.visibility ||
    JSON.stringify(photos) !== JSON.stringify(post.photos);
  const close = () => {
    if (locked.current) return;
    if (changed) setDiscard(true);
    else onClose();
  };
  async function pick(camera: boolean) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    try {
      const added = await pickJournalPhotos(camera, 5 - photos.length);
      setPhotos((old) => [...old, ...added]);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '사진을 불러오지 못했습니다.');
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  // 서버 성공 전에는 초안을 닫지 않으며, 충돌 이후의 반복 덮어쓰기를 막습니다.
  async function save() {
    if (locked.current || !post.sourceId || !session.isActive() || conflict) return;
    locked.current = true;
    setBusy(true);
    setError('');
    try {
      const saved = await session.api.savePost(post.sourceId, {
        version: post.version,
        memo,
        date: post.date,
        summary: post.summary,
        visibility,
        photos,
      });
      if (session.isActive()) onSaved(saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장하지 못했습니다.');
      setConflict(e instanceof ApiError && e.status === 409);
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return (
    <Modal visible animationType="slide" onRequestClose={close}>
      <SafeAreaView style={ui.page}>
        <ScreenLayout
          title="오운완 편집"
          onBack={close}
          footer={
            <Button
              title="변경 내용 저장"
              disabled={busy || conflict}
              onPress={() => void save()}
            />
          }
        >
          <Text style={ui.muted}>
            {post.date} · {post.summary}
          </Text>
          <Text style={ui.muted}>
            계정 게시물만 수정합니다. 운동 기록과 기기 저장본은 유지됩니다.
          </Text>
          {!!error && (
            <Text accessibilityRole="alert" style={ui.error}>
              {error}
            </Text>
          )}
          <TextInput
            accessibilityLabel="오운완 글"
            multiline
            maxLength={200}
            editable={!busy}
            value={memo}
            onChangeText={setMemo}
            style={ui.input}
          />
          <Text style={ui.muted}>
            {memo.length}/200자 · 사진 {photos.length}/5장
          </Text>
          <View style={[ui.row, { flexWrap: 'wrap' }]}>
            <Button
              title={visibility === 'PRIVATE' ? '✓ 나만 보기' : '나만 보기'}
              secondary
              compact
              disabled={busy}
              onPress={() => setVisibility('PRIVATE')}
            />
            <Button
              title={visibility === 'FRIENDS' ? '✓ 친구 공개' : '친구 공개'}
              secondary
              compact
              disabled={busy}
              onPress={() => setVisibility('FRIENDS')}
            />
          </View>
          {photos.map((photo, index) => (
            <View key={`${index}:${photo.length}`} style={{ gap: 8 }}>
              <Image
                accessibilityLabel={`편집 사진 ${index + 1}`}
                source={{ uri: photo }}
                style={{ width: '100%', aspectRatio: 1 }}
                resizeMode="contain"
              />
              <View style={[ui.row, { flexWrap: 'wrap' }]}>
                <Button
                  title={`${index + 1}번 사진 삭제`}
                  secondary
                  compact
                  disabled={busy}
                  onPress={() => setPhotos((old) => old.filter((_, i) => i !== index))}
                />
                <Button
                  title={`${index + 1}번 사진 앞으로`}
                  secondary
                  compact
                  disabled={busy || index === 0}
                  onPress={() =>
                    setPhotos((old) => {
                      const next = [...old];
                      [next[index - 1], next[index]] = [next[index], next[index - 1]];
                      return next;
                    })
                  }
                />
              </View>
            </View>
          ))}
          <View style={[ui.row, { flexWrap: 'wrap' }]}>
            <Button
              title="사진 촬영"
              secondary
              disabled={busy || photos.length >= 5}
              onPress={() => void pick(true)}
            />
            <Button
              title="앨범에서 추가"
              secondary
              disabled={busy || photos.length >= 5}
              onPress={() => void pick(false)}
            />
          </View>
          {conflict && (
            <Text style={ui.muted}>
              다른 곳에서 변경되었습니다. 필요한 글을 복사한 뒤 편집을 닫고 최신 게시물을 다시 열어
              주세요.
            </Text>
          )}
          <Button title="편집 닫기" secondary disabled={busy} onPress={close} />
          {discard && (
            <View style={ui.card}>
              <Text style={ui.body}>저장하지 않은 변경 내용을 버릴까요?</Text>
              <Button title="계속 편집" secondary onPress={() => setDiscard(false)} />
              <Button title="변경 내용 버리고 닫기" onPress={onClose} />
            </View>
          )}
        </ScreenLayout>
      </SafeAreaView>
    </Modal>
  );
}
