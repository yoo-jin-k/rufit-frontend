import { journalDraftStorage, type JournalDraft } from './journalDraftStorage';
import { AppModal as Modal } from '../../components/AppModal';
import type { RufitSession } from '../../api/session';
import { ApiError } from '../../api/client';
/** 사진은 선택이며 카메라 권한은 촬영 버튼을 눌렀을 때만 요청합니다. 임시 URI 대신 사진 내용을 저장합니다. */
import { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { AppIcon } from '../../components/AppIcon';
import { Chip, ChipRow, TextField } from '../../components/kit/Controls';
import { NavBar, NavText, Screen } from '../../components/kit/Screen';
import { ConfirmDialog } from '../../components/kit/Surfaces';
import { text, tokens } from '../../theme/tokens';
import type { Workout } from '../workout/model';
import { workoutDate, workoutSummary } from '../workout/WorkoutHistory';
import { recordMeta, recordTitle } from '../workout/recordFormat';
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
  const disabled = busy || picking || photos.length >= 5;
  return (
    <Modal visible animationType="slide" onRequestClose={requestClose}>
      <Screen
        header={
          <NavBar
            title="오운완 기록"
            leading="close"
            onLeading={requestClose}
            trailing={<NavText label={initial ? '수정 취소' : '건너뛰기'} disabled={busy || picking} onPress={requestClose} />}
          />
        }
        footer={
          <Button
            title="저장"
            accessibilityLabel="오운완 저장"
            loading={busy}
            disabled={picking || (destination === 'account' && cloudVersion === null)}
            onPress={() => void save()}
          />
        }
      >
        {!!error && <Text accessibilityRole="alert" style={[text.caption, { color: tokens.color.danger.default }]}>{error}</Text>}
        {destination === 'account' && cloudVersion === null && !busy && (
          <Button title="저장 준비 다시 시도" variant="soft" size="md" onPress={() => void selectAccount()} />
        )}
        {photoError && (
          <View style={js.notice}>
            <Text style={[text.caption, { color: tokens.color.text.secondary }]}>
              불러오지 못한 사진은 추가되지 않았습니다. 기존 사진과 글은 유지됩니다.
            </Text>
            <Button
              title="실패한 사진 추가 건너뛰기"
              variant="secondary"
              size="sm"
              disabled={busy || picking}
              onPress={() => {
                setPhotoError(false);
                setError('');
              }}
            />
          </View>
        )}
        {photos.length ? (
          <View style={{ gap: tokens.space[8] }}>
            <Image source={{ uri: photos[0] }} accessibilityLabel="대표 사진" style={js.cover} resizeMode="cover" />
            <View style={js.thumbs}>
              {photos.map((photo, index) => (
                <View key={index} style={js.thumbItem}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${index + 1}번 사진 대표로 설정`}
                    accessibilityState={{ disabled: busy || picking || index === 0, selected: index === 0 }}
                    disabled={busy || picking || index === 0}
                    onPress={() => setPhotos((current) => [current[index], ...current.filter((_, i) => i !== index)])}
                  >
                    <Image source={{ uri: photo }} style={[js.thumb, index === 0 && js.thumbOn]} resizeMode="cover" />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${index + 1}번 사진 삭제`}
                    disabled={busy || picking}
                    hitSlop={8}
                    onPress={() => setPhotos((current) => current.filter((_, i) => i !== index))}
                    style={js.remove}
                  >
                    <AppIcon name="close" size={12} color={tokens.color.text.inverse} strokeWidth={2.4} />
                  </Pressable>
                </View>
              ))}
              {photos.length < 5 && (
                <Pressable accessibilityRole="button" accessibilityLabel="앨범에서 선택" disabled={disabled} onPress={() => void pick(false)} style={js.addThumb}>
                  <AppIcon name="plus" color={tokens.color.text.secondary} />
                </Pressable>
              )}
            </View>
            <View style={js.row}>
              <Text style={[text.label, { color: tokens.color.text.secondary, flex: 1 }]}>
                {picking ? '사진을 처리하고 있습니다' : `사진 ${photos.length}/5장 · 첫 사진이 대표 사진이에요`}
              </Text>
              <Pressable accessibilityRole="button" disabled={disabled} onPress={() => void pick(true)} hitSlop={8}>
                <Text style={[text.captionBold, { color: tokens.color.text.primary }]}>사진 더 촬영</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={js.empty}>
            <Text style={[text.bodyBold, { color: tokens.color.text.primary }]}>오늘 운동을 사진으로 남겨 보세요</Text>
            <Text style={[text.caption, { color: tokens.color.text.secondary }]}>
              {picking ? '사진을 처리하고 있습니다' : '사진 없이 메모만 저장해도 돼요'}
            </Text>
            <View style={js.pickRow}>
              <Button title="카메라" accessibilityLabel="촬영하기" variant="secondary" size="md" fullWidth={false} style={{ flex: 1 }}
                icon={<AppIcon name="camera" />} disabled={disabled} onPress={() => void pick(true)} />
              <Button title="앨범" accessibilityLabel="앨범에서 선택" variant="secondary" size="md" fullWidth={false} style={{ flex: 1 }}
                icon={<AppIcon name="image" />} disabled={disabled} onPress={() => void pick(false)} />
            </View>
          </View>
        )}
        <TextField
          label="메모 (선택)"
          accessibilityLabel="오운완 글"
          value={memo}
          onChangeText={setMemo}
          maxLength={200}
          multiline
          trailing={`${memo.length}/200`}
          placeholder="오늘 운동은 어땠나요?"
          inputProps={{ editable: !busy }}
        />
        <View style={js.notice}>
          <Text style={[text.label, { color: tokens.color.text.secondary }]}>함께 저장돼요</Text>
          <Text style={[text.captionBold, { color: tokens.color.text.primary }]}>
            {recordTitle(workout)} · {recordMeta(workout)}
          </Text>
        </View>
        {destination === 'account' && (
          <View style={{ gap: tokens.space[8] }}>
            <Text style={[text.label, { color: tokens.color.text.secondary }]}>공개 범위</Text>
            <ChipRow wrap>
              <Chip label="나만 보기" selected={visibility === 'private'} onPress={() => !busy && setVisibility('private')} />
              <Chip label="친구 공개" selected={visibility === 'friends'} onPress={() => !busy && setVisibility('friends')} />
            </ChipRow>
            <Text style={[text.label, { color: tokens.color.text.muted }]}>
              {cloudVersion
                ? '이 운동의 계정 게시물이 있습니다. 저장하면 지금 작성한 내용으로 바뀝니다.'
                : '저장하면 사진·글·운동 날짜와 요약을 내 계정에 저장합니다. 친구 공개면 현재 친구가 볼 수 있어요.'}
            </Text>
          </View>
        )}
      </Screen>
      <ConfirmDialog
        visible={confirmClose}
        title="작성 중인 내용을 버릴까요?"
        message="저장한 운동 기록은 유지되며, 이번에 바꾼 글과 사진만 취소해요"
        cancelLabel="계속 작성하기"
        confirmLabel="변경 내용 버리기"
        tone="danger"
        onCancel={() => setConfirmClose(false)}
        onConfirm={() => void closeDraft()}
      />
    </Modal>
  );
}

const js = StyleSheet.create({
  empty: {
    backgroundColor: tokens.color.bg.surface,
    borderRadius: tokens.radius.xl,
    minHeight: 300,
    padding: tokens.space[24],
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pickRow: { flexDirection: 'row', gap: tokens.space[12], marginTop: tokens.space[16], alignSelf: 'stretch' },
  cover: { width: '100%', aspectRatio: 1.2, borderRadius: tokens.radius.xl, backgroundColor: tokens.color.line.input },
  thumbs: { flexDirection: 'row', gap: tokens.space[8], flexWrap: 'wrap' },
  thumbItem: { width: 56, height: 56 },
  thumb: { width: 56, height: 56, borderRadius: tokens.radius.sm, backgroundColor: tokens.color.line.input },
  thumbOn: { borderWidth: 2, borderColor: tokens.color.text.primary },
  remove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: tokens.color.bg.inverse,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addThumb: {
    width: 56,
    height: 56,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: tokens.color.line.strong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notice: { backgroundColor: tokens.color.bg.surface, borderRadius: tokens.radius.md, padding: tokens.space[16], gap: 2 },
});
