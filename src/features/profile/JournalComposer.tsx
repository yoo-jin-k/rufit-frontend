/** 사진은 선택이며 카메라 권한은 촬영 버튼을 눌렀을 때만 요청합니다. 임시 URI 대신 사진 내용을 저장합니다. */
import { useState } from 'react';
import { Image, Modal, Platform, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { ScreenLayout, ui } from '../../components/ScreenLayout';
import { Button } from '../../components/Button';
import { AppIcon } from '../../components/AppIcon';
import type { Workout } from '../workout/model';
import { workoutDate, workoutSummary } from '../workout/WorkoutHistory';
import { prepareJournalPhoto } from './prepareJournalPhoto';
import { journalPhotos, type Journal } from './journalModel';
export function JournalComposer({
  workout,
  initial,
  onSave,
  onClose,
}: {
  workout: Workout;
  initial?: Journal;
  onSave: (j: Journal) => Promise<void>;
  onClose: () => void;
}) {
  const [memo, setMemo] = useState(initial?.memo ?? ''),
    [photos, setPhotos] = useState(() => journalPhotos(initial)),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [picking, setPicking] = useState(false),
    [photoError, setPhotoError] = useState(false);
  async function pick(camera: boolean) {
    if (picking || busy || photos.length >= 5) return;
    setPicking(true);
    try {
      if (camera && Platform.OS !== 'web') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted)
          throw new Error(
            '카메라 권한이 필요합니다. 앨범을 선택하거나 사진 없이 기록할 수 있습니다.',
          );
      }
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        base64: true,
        quality: 0.5,
        allowsEditing: camera,
        allowsMultipleSelection: !camera,
        selectionLimit: 5 - photos.length,
        aspect: [1, 1],
      };
      const result = camera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      if (!result.canceled) {
        if (result.assets.length > 5 - photos.length)
          throw new Error(`あと${5 - photos.length}枚まで追加できます。写真を選び直して下さい。`);
        // 変換がすべて成功してから追加し、途中失敗時も既存写真を維持します。
        const added: string[] = [];
        for (const asset of result.assets) {
          if (!asset.base64) throw new Error('写真を読み取れませんでした。別の写真を選んでください。');
          added.push(await prepareJournalPhoto(asset.base64, asset.mimeType ?? 'image/jpeg'));
        }
        setPhotos((current) => [...current, ...added]);
        setPhotoError(false);
        setError('');
      }
    } catch (e) {
      setPhotoError(true);
      setError(e instanceof Error ? e.message : '사진을 불러오지 못했습니다.');
    } finally {
      setPicking(false);
    }
  }
  async function save() {
    if (busy || picking || photoError) return;
    setBusy(true);
    try {
      await onSave({
        workoutId: workout.id,
        memo,
        photos,
        photo: photos[0],
        visibility: 'private',
        createdAt: initial?.createdAt ?? Date.now(),
      });
      onClose();
    } catch {
      setError(
        '저장하지 못했습니다. 사진을 줄이거나 다시 시도해 주세요. 운동 기록은 그대로 보관됩니다.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      visible
      animationType="slide"
      onRequestClose={() => {
        if (!busy) onClose();
      }}
    >
      <SafeAreaView style={ui.page}>
        <ScreenLayout
          title="오운완 기록"
          onBack={() => {
            if (!busy) onClose();
          }}
          footer={
            <>
              <Button
                title="오운완 저장하기"
                loading={busy}
                disabled={picking || photoError}
                onPress={() => void save()}
              />
              <Button
                title={initial ? '수정 취소' : '나중에 작성하기'}
                secondary
                disabled={busy}
                onPress={onClose}
              />
            </>
          }
        >
          {!!error && (
            <Text accessibilityRole="alert" style={ui.error}>
              {error}
            </Text>
          )}
          {photoError && <Button title="이번 사진 추가를 취소하고 계속 작성" secondary onPress={() => { setPhotoError(false); setError(''); }} />}
          <View style={ui.card}>
            <Text style={ui.heading}>{workoutDate(workout)} 운동 저장 완료</Text>
            <Text style={ui.muted}>{workoutSummary(workout)}</Text>
          </View>
          <View style={ui.between}>
            <Text style={ui.heading}>오운완 한 줄 설명 · 글</Text>
            <Text style={ui.muted}>선택 · {memo.length}/200</Text>
          </View>
          <TextInput
            accessibilityLabel="오운완 글"
            value={memo}
            onChangeText={setMemo}
            maxLength={200}
            editable={!busy}
            multiline
            placeholder="오늘 운동은 어땠나요? 사진과 함께 남길 글을 적어 주세요."
            style={[ui.input, { minHeight: 100, textAlignVertical: 'top' }]}
          />
          <View style={ui.between}>
            <Text style={ui.heading}>사진</Text>
            <Text style={ui.muted}>{picking ? '사진을 처리하고 있습니다' : photos.length ? `${photos.length}/5장 · 저장 버튼을 눌러 주세요` : '사진 미첨부 · 선택 사항'}</Text>
          </View>
          <View style={[ui.card, { alignItems: 'center', gap: 16 }]}>
            {photos.length ? (
              <View style={{ width: '100%', gap: 16 }}>
                {photos.map((photo, index) => <View key={index} style={{ gap: 8 }}>
                  <Text style={ui.muted}>{index + 1}번 사진 {index === 0 ? '· 대표 사진' : ''}</Text>
                  <Image source={{ uri: photo }} style={{ width: '100%', height: 180, borderRadius: 12 }} resizeMode="contain" />
                  <View style={ui.row}>
                    <View style={{ flex: 1 }}><Button title="대표로 설정" secondary disabled={busy || picking || index === 0}
                      accessibilityLabel={`${index + 1}번 사진 대표로 설정`}
                      onPress={() => setPhotos((current) => [current[index], ...current.filter((_, i) => i !== index)])} /></View>
                    <View style={{ flex: 1 }}><Button title="삭제" secondary disabled={busy || picking || photos.length >= 5}
                      accessibilityLabel={`${index + 1}번 사진 삭제`}
                      onPress={() => setPhotos((current) => current.filter((_, i) => i !== index))} /></View>
                  </View>
                </View>)}
              </View>
            ) : (
              <View style={{ height: 100, justifyContent: 'center' }}><AppIcon name="image" size={32} /></View>
            )}
            <View style={[ui.row, { flexWrap: 'wrap', width: '100%' }]}>
              <View style={{ flex: 1, minWidth: 120 }}>
                <Button
                  title={photos.length ? "사진 더 촬영" : "촬영하기"}
                  disabled={busy || picking || photos.length >= 5}
                  onPress={() => void pick(true)}
                />
              </View>
              <View style={{ flex: 1, minWidth: 120 }}>
                <Button
                  title="앨범에서 선택"
                  secondary
                  disabled={busy || picking || photos.length >= 5}
                  onPress={() => void pick(false)}
                />
              </View>
            </View>
            <Text style={ui.muted}>최대 5장 · 첫 사진이 프로필 대표 사진으로 표시됩니다.</Text>
          </View>
          <View style={ui.between}>
            <Text style={ui.body}>공개 범위</Text>
            <Text style={ui.body}>나만 보기</Text>
          </View>
          <Text style={ui.muted}>
            현재 기록은 이 기기에만 보관됩니다. 친구 공개는 계정 연결 후 제공됩니다.
          </Text>

        </ScreenLayout>
      </SafeAreaView>
    </Modal>
  );
}
