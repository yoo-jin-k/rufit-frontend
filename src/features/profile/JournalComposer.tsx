import type { RufitSession } from '../../api/session';
import { ApiError } from '../../api/client';
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
import { journalPhotos, journalDraftChanged, type Journal } from './journalModel';
export function JournalComposer({
  workout,
  initial,
  onSave,
  onClose,
  session,
}: {
  session?: RufitSession | null;
  workout: Workout;
  initial?: Journal;
  onSave: (j: Journal, accountSaved?: boolean) => Promise<void>;
  onClose: () => void;
}) {
  const [memo, setMemo] = useState(initial?.memo ?? ''),
    [photos, setPhotos] = useState(() => journalPhotos(initial)),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [picking, setPicking] = useState(false),
    [photoError, setPhotoError] = useState(false);
  const [destination, setDestination] = useState<'device' | 'account'>('device');
  const [visibility, setVisibility] = useState<'private' | 'friends'>('private');
  const [cloudVersion, setCloudVersion] = useState<number | null>(null);
  async function selectAccount() {
    if (!session?.isActive() || busy) return;
    setDestination('account');
    setBusy(true);
    setCloudVersion(null);
    setError('');
    try {
      const directory = await session.api.directorySettings();
      if (!directory.memberId)
        throw new Error('친구 화면에서 닉네임을 먼저 저장한 뒤 계정 저장을 이용해 주세요.');
      try {
        const saved = await session.api.ownPost(workout.id);
        setCloudVersion(saved.version);
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) setCloudVersion(0);
        else throw e;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '계정 저장을 준비하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  }
  const [confirmClose, setConfirmClose] = useState(false);
  // 작성 중인 글과 사진은 명시적으로 버리기 전까지 유지합니다.
  function requestClose() {
    if (busy || picking) return;
    if (destination === 'account' || journalDraftChanged(initial, memo, photos))
      setConfirmClose(true);
    else onClose();
  }
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
          throw new Error(
            `사진은 ${5 - photos.length}장 더 추가할 수 있습니다. 다시 선택해 주세요.`,
          );
        // 모든 사진 변환이 성공한 뒤 추가하여 실패 시에도 기존 사진을 보존합니다.
        const added: string[] = [];
        for (const asset of result.assets) {
          if (!asset.base64) throw new Error('사진을 읽을 수 없습니다. 다른 사진을 선택해 주세요.');
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
      const entry: Journal = {
        workoutId: workout.id,
        memo,
        photos,
        photo: photos[0],
        visibility: destination === 'account' ? visibility : 'private',
        createdAt: initial?.createdAt ?? Date.now(),
      };
      if (destination === 'account') {
        if (!session?.isActive() || cloudVersion === null)
          throw new Error('계정 저장 준비를 다시 시도해 주세요.');
        const saved = await session.api.savePost(workout.id, {
          version: cloudVersion,
          memo,
          date: workoutDate(workout),
          summary: workoutSummary(workout),
          visibility: visibility === 'friends' ? 'FRIENDS' : 'PRIVATE',
          photos,
        });
        setCloudVersion(saved.version);
      }
      await onSave(entry, destination === 'account');
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : '저장하지 못했습니다. 작성 내용은 유지됩니다.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal visible animationType="slide" onRequestClose={requestClose}>
      <SafeAreaView style={ui.page}>
        <ScreenLayout
          title="오운완 기록"
          onBack={requestClose}
          footer={
            <>
              <Button
                title={
                  destination === 'account' ? '내 계정에 오운완 저장' : '이 기기에 오운완 저장'
                }
                loading={busy}
                disabled={
                  picking || photoError || (destination === 'account' && cloudVersion === null)
                }
                onPress={() => void save()}
              />
              <Button
                title={initial ? '수정 취소' : '나중에 작성하기'}
                secondary
                disabled={busy || picking}
                onPress={requestClose}
              />
            </>
          }
        >
          {!!error && (
            <Text accessibilityRole="alert" style={ui.error}>
              {error}
            </Text>
          )}
          {photoError && (
            <Button
              title="이번 사진 추가를 취소하고 계속 작성"
              secondary
              onPress={() => {
                setPhotoError(false);
                setError('');
              }}
            />
          )}
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
          {photoError && (
            <View style={ui.card}>
              <Text style={ui.muted}>
                불러오지 못한 사진은 추가되지 않았습니다. 기존 사진과 글은 유지됩니다.
              </Text>
              <Button
                title="실패한 사진 추가 건너뛰기"
                secondary
                disabled={busy || picking}
                onPress={() => {
                  setPhotoError(false);
                  setError('');
                }}
              />
            </View>
          )}
          <View style={ui.between}>
            <Text style={ui.heading}>사진</Text>
            <Text style={ui.muted}>
              {picking
                ? '사진을 처리하고 있습니다'
                : photos.length
                  ? `${photos.length}/5장 · 저장 버튼을 눌러 주세요`
                  : '사진 미첨부 · 선택 사항'}
            </Text>
          </View>
          <View style={[ui.card, { alignItems: 'center', gap: 16 }]}>
            {photos.length ? (
              <View style={{ width: '100%', gap: 16 }}>
                {photos.map((photo, index) => (
                  <View key={index} style={{ gap: 8 }}>
                    <Text style={ui.muted}>
                      {index + 1}번 사진 {index === 0 ? '· 대표 사진' : ''}
                    </Text>
                    <Image
                      source={{ uri: photo }}
                      style={{ width: '100%', height: 180, borderRadius: 12 }}
                      resizeMode="contain"
                    />
                    <View style={ui.row}>
                      <View style={{ flex: 1 }}>
                        <Button
                          title="대표로 설정"
                          secondary
                          disabled={busy || picking || index === 0}
                          accessibilityLabel={`${index + 1}번 사진 대표로 설정`}
                          onPress={() =>
                            setPhotos((current) => [
                              current[index],
                              ...current.filter((_, i) => i !== index),
                            ])
                          }
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Button
                          title="삭제"
                          secondary
                          disabled={busy || picking}
                          accessibilityLabel={`${index + 1}번 사진 삭제`}
                          onPress={() =>
                            setPhotos((current) => current.filter((_, i) => i !== index))
                          }
                        />
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={{ height: 100, justifyContent: 'center' }}>
                <AppIcon name="image" size={32} />
              </View>
            )}
            <View style={[ui.row, { flexWrap: 'wrap', width: '100%' }]}>
              <View style={{ flex: 1, minWidth: 120 }}>
                <Button
                  title={photos.length ? '사진 더 촬영' : '촬영하기'}
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
          <Text style={ui.heading}>저장 위치</Text>
          <View style={[ui.row, { flexWrap: 'wrap' }]}>
            <Button
              title={destination === 'device' ? '✓ 이 기기' : '이 기기'}
              secondary
              disabled={busy}
              onPress={() => {
                setDestination('device');
                setError('');
              }}
            />
            {session && (
              <Button
                title={destination === 'account' ? '✓ 내 계정' : '내 계정'}
                secondary
                disabled={busy}
                onPress={() => void selectAccount()}
              />
            )}
          </View>
          {destination === 'account' ? (
            <>
              <Text style={ui.heading}>공개 범위</Text>
              <View style={[ui.row, { flexWrap: 'wrap' }]}>
                <Button
                  title={visibility === 'private' ? '✓ 나만 보기' : '나만 보기'}
                  secondary
                  disabled={busy}
                  onPress={() => setVisibility('private')}
                />
                <Button
                  title={visibility === 'friends' ? '✓ 친구 공개' : '친구 공개'}
                  secondary
                  disabled={busy}
                  onPress={() => setVisibility('friends')}
                />
              </View>
              <Text style={ui.muted}>
                저장 버튼을 누르면 사진·글·운동 날짜와 요약을 내 계정에 저장합니다. 친구 공개를
                선택하면 현재 친구가 볼 수 있습니다.
              </Text>
              {!!cloudVersion && (
                <Text style={ui.muted}>
                  이 운동의 계정 게시물이 있습니다. 저장하면 지금 작성한 내용으로 바뀝니다.
                </Text>
              )}
            </>
          ) : (
            <Text style={ui.muted}>사진과 글을 이 기기에만 저장합니다.</Text>
          )}
        </ScreenLayout>
        <Modal
          visible={confirmClose}
          transparent
          animationType="fade"
          onRequestClose={() => setConfirmClose(false)}
        >
          <View
            style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#00000066' }}
          >
            <View style={ui.card}>
              <Text style={ui.heading}>작성 중인 내용을 버릴까요?</Text>
              <Text style={ui.body}>
                저장한 운동 기록은 유지되며, 이번에 바꾼 글과 사진만 취소합니다.
              </Text>
              <Button title="계속 작성하기" onPress={() => setConfirmClose(false)} />
              <Button title="변경 내용 버리기" secondary onPress={onClose} />
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
}
