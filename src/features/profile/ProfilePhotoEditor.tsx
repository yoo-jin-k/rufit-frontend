/** 사진 선택은 편집 초안만 변경합니다. 저장을 눌러야 반영하며 취소·권한 거절 시 기존 사진을 유지합니다. */
import { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Button } from '../../components/Button';
import { ui } from '../../components/ScreenLayout';
import { ProfileAvatar } from './ProfileAvatar';
import { prepareJournalPhoto } from './prepareJournalPhoto';
export function ProfilePhotoEditor({ photo, disabled, onChange, onBusy }: {
  photo?: string; disabled: boolean; onChange(photo?: string): void; onBusy(busy: boolean): void;
}) {
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState('');
  async function pick(camera: boolean) {
    if (disabled || picking) return;
    setPicking(true);
    onBusy(true);
    setError('');
    try {
      if (camera && Platform.OS !== 'web') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) throw new Error('카메라 권한이 필요합니다. 앨범에서도 사진을 선택할 수 있습니다.');
      }
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'], base64: true, quality: 0.5, allowsEditing: true, aspect: [1, 1],
      };
      const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (!result.canceled) {
        const asset = result.assets[0];
        if (!asset.base64) throw new Error('사진을 읽지 못했습니다. 다른 사진을 선택해 주세요.');
        const prepared = await prepareJournalPhoto(asset.base64, asset.mimeType ?? 'image/jpeg');
        onChange(prepared);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '사진을 불러오지 못했습니다.');
    } finally {
      setPicking(false);
      onBusy(false);
    }
  }
  return <View style={{ gap: 12 }}>
    <Text style={ui.muted}>프로필 사진</Text>
    <View style={{ alignItems: 'center' }}><ProfileAvatar photo={photo} size={104} /></View>
    <View style={[ui.row, { flexWrap: 'wrap' }]}>
      <View style={{ flex: 1, minWidth: 120 }}><Button title="촬영하기" secondary disabled={disabled || picking} onPress={() => void pick(true)} /></View>
      <View style={{ flex: 1, minWidth: 120 }}><Button title="앨범에서 선택" secondary disabled={disabled || picking} onPress={() => void pick(false)} /></View>
    </View>
    {photo && <Button title="프로필 사진 삭제" secondary disabled={disabled || picking} onPress={() => onChange(undefined)} />}
    <Text style={ui.muted}>{picking ? '사진을 처리하고 있습니다.' : '아래 저장 버튼을 누르면 프로필에 반영됩니다.'}</Text>
    {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
  </View>;
}
