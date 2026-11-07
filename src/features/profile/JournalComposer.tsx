import { journalDraftStorage, type JournalDraft } from './journalDraftStorage';
import { AppModal as Modal } from '../../components/AppModal';
import type { RufitSession } from '../../api/session';
import { ApiError } from '../../api/client';
/** 사진은 선택이며 카메라 권한은 촬영 버튼을 눌렀을 때만 요청합니다. 임시 URI 대신 사진 내용을 저장합니다. */
import { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Image, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenLayout, ui } from '../../components/ScreenLayout';
import { Button } from '../../components/Button';
import { AppIcon } from '../../components/AppIcon';
import type { Workout } from '../workout/model';
import { workoutDate, workoutSummary } from '../workout/WorkoutHistory';
import { CameraPermissionError, pickJournalPhotos } from './pickJournalPhotos';
import { journalPhotos, journalDraftChanged, type Journal } from './journalModel';
export function JournalComposer({
  workout,
  initial,
  onSave,
  onClose,
  session,
  nickname,
  restoredDraft,
}: {
  restoredDraft?: JournalDraft | null;
  nickname: string;
  session?: RufitSession | null;
  workout: Workout;
  initial?: Journal;
  onSave: (j: Journal, accountSaved?: boolean) => Promise<void>;
  onClose: () => void;
}) {
  const [memo, setMemo] = useState(restoredDraft?.memo ?? initial?.memo ?? ''),
    [photos, setPhotos] = useState(() => restoredDraft?.photos ?? journalPhotos(initial)),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [picking, setPicking] = useState(false),
    [photoError, setPhotoError] = useState(false);
  const destination = session ? 'account' : 'device';
  const [visibility, setVisibility] = useState<'private' | 'friends'>(restoredDraft?.visibility ?? initial?.visibility ?? 'private');
  const draftScope = session ? `${session.scope.server}:${session.scope.accountId}` : 'guest';
  const closing = useRef(false);
  useEffect(() => {
    if (!closing.current) void journalDraftStorage.save(draftScope, { workout, memo, photos, visibility })
      .catch(() => setError('임시 저장에 실패했습니다. 앱을 닫기 전에 오운완을 저장해 주세요.'));
  }, [draftScope, workout, memo, photos, visibility]);
  async function closeDraft() {
    closing.current = true;
    try { await journalDraftStorage.save(draftScope, null); onClose(); }
    catch { closing.current = false; setError('작성본 정리를 완료하지 못했습니다. 다시 시도해 주세요.'); }
  }
  const [cloudVersion, setCloudVersion] = useState<number | null>(null);
  async function selectAccount() {
    if (!session?.isActive() || busy) return;
    setBusy(true);
    setCloudVersion(null);
    setError('');
    try {
      const directory = await session.api.directorySettings();
      if (!directory.memberId) {
        // 최초 게시물 작성 시 현재 닉네임으로 비공개 프로필을 준비합니다.
        await session.api.updateDirectory({ nickname, discoverable: false, version: directory.version });
      }
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
  useEffect(() => {
    // 최초 진입 시 저장 준비 상태를 표시하고 비동기로 서버 버전을 확인합니다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (session) void selectAccount();
    // 작성 화면의 계정·운동은 부모의 key로 고정됩니다. 입력 변경으로 다시 초기화하지 않습니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [confirmClose, setConfirmClose] = useState(false);
  // 작성 중인 글과 사진은 명시적으로 버리기 전까지 유지합니다.
  function requestClose() {
    if (busy || picking) return;
    if (journalDraftChanged(initial, memo, photos))
      setConfirmClose(true);
    else void closeDraft();
  }
  async function pick(camera: boolean) {
    if (picking || busy || photos.length >= 5) return;
    setPicking(true);
    try {
      const added = await pickJournalPhotos(camera, 5 - photos.length);
      if (added.length) {
        setPhotos((current) => [...current, ...added]);
        setPhotoError(false);
        setError('');
      }
    } catch (e) {
      // 선택 실패는 안내만 표시합니다. 기존 글과 사진 저장은 계속 허용합니다.
      setPhotoError(!(e instanceof CameraPermissionError));
      setError(e instanceof Error ? e.message : '사진을 불러오지 못했습니다.');
      if (e instanceof CameraPermissionError) Alert.alert('카메라 권한을 켜 주세요', e.message, [
        { text: '계속 작성', style: 'cancel' },
        { text: '설정 열기', onPress: () => {
          void journalDraftStorage.save(draftScope, { workout, memo, photos, visibility })
            .then(() => Linking.openSettings()).catch(() => setError('작성본을 보존하지 못했습니다. 글을 저장한 뒤 설정을 열어 주세요.'));
        } },
      ]);
    } finally {
      setPicking(false);
    }
  }
  async function save() {
    if (busy || picking) return;
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
      await closeDraft();
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
                title="오운완 저장"
                loading={busy}
                disabled={
                  picking || (destination === 'account' && cloudVersion === null)
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
          {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
          {destination === 'account' && cloudVersion === null && !busy && (
            <Button title="저장 준비 다시 시도" secondary onPress={() => void selectAccount()} />
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
            null
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
              <Button title="변경 내용 버리기" secondary onPress={() => void closeDraft()} />
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
}
