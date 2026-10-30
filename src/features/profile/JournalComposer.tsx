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
import type { Journal } from './journalModel';
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
    [photo, setPhoto] = useState(initial?.photo),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [picking, setPicking] = useState(false);
  async function pick(camera: boolean) {
    if (picking || busy) return;
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
        allowsEditing: true,
        aspect: [1, 1],
      };
      const result = camera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      if (!result.canceled) {
        const asset = result.assets[0];
        if (!asset.base64) throw new Error('사진을 읽지 못했습니다. 다른 사진을 선택해 주세요.');
        if (asset.base64.length > 2_800_000)
          throw new Error('사진이 큽니다. 2MB 이하 사진을 선택해 주세요.');
        setPhoto(`data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`);
        setError('');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '사진을 불러오지 못했습니다.');
    } finally {
      setPicking(false);
    }
  }
  async function save() {
    if (busy || picking) return;
    setBusy(true);
    try {
      await onSave({
        workoutId: workout.id,
        memo,
        photo,
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
                disabled={picking}
                onPress={() => void save()}
              />
              <Button
                title="건너뛰기 · 운동 기록은 그대로 남아요"
                secondary
                disabled={busy}
                onPress={onClose}
              />
            </>
          }
        >
          <View style={ui.card}>
            <Text style={ui.heading}>{workoutDate(workout)} 운동 저장 완료</Text>
            <Text style={ui.muted}>{workoutSummary(workout)}</Text>
          </View>
          <View style={ui.between}>
            <Text style={ui.heading}>사진</Text>
            <Text style={ui.muted}>선택</Text>
          </View>
          <View style={[ui.card, { alignItems: 'center', gap: 16 }]}>
            {photo ? (
              <Image
                source={{ uri: photo }}
                style={{ width: '100%', aspectRatio: 1, borderRadius: 12 }}
              />
            ) : (
              <View style={{ height: 130, justifyContent: 'center' }}>
                <AppIcon name="image" size={32} />
              </View>
            )}
            <View style={[ui.row, { flexWrap: 'wrap', width: '100%' }]}>
              <View style={{ flex: 1, minWidth: 120 }}>
                <Button
                  title="촬영하기"
                  disabled={busy || picking}
                  onPress={() => void pick(true)}
                />
              </View>
              <View style={{ flex: 1, minWidth: 120 }}>
                <Button
                  title="앨범에서 선택"
                  secondary
                  disabled={busy || picking}
                  onPress={() => void pick(false)}
                />
              </View>
            </View>
            {photo && (
              <Button
                title="사진 제거"
                secondary
                disabled={busy}
                onPress={() => setPhoto(undefined)}
              />
            )}
          </View>
          <View style={ui.between}>
            <Text style={ui.heading}>메모</Text>
            <Text style={ui.muted}>선택 · {memo.length}/200</Text>
          </View>
          <TextInput
            accessibilityLabel="오운완 메모"
            value={memo}
            onChangeText={setMemo}
            maxLength={200}
            editable={!busy}
            multiline
            placeholder="오늘 운동은 어땠나요?"
            style={[ui.input, { minHeight: 100, textAlignVertical: 'top' }]}
          />
          <View style={ui.between}>
            <Text style={ui.body}>공개 범위</Text>
            <Text style={ui.body}>나만 보기</Text>
          </View>
          <Text style={ui.muted}>
            현재 기록은 이 기기에만 보관됩니다. 친구 공개는 계정 연결 후 제공됩니다.
          </Text>
          {!!error && (
            <Text accessibilityRole="alert" style={ui.error}>
              {error}
            </Text>
          )}
        </ScreenLayout>
      </SafeAreaView>
    </Modal>
  );
}
