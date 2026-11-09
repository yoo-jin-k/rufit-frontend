/**
 * Figma 06-05 프로필 사진 칸입니다. 큰 원형 사진을 누르면 촬영·앨범·삭제를 고르는 시트가 열립니다.
 * 사진 선택은 편집 초안만 바꾸고, 저장을 눌러야 반영합니다. 취소·권한 거절 시 기존 사진을 유지합니다.
 */
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { AppIcon } from '../../components/AppIcon';
import { BottomSheet, ListGroup, ListRow } from '../../components/kit/Surfaces';
import { text, tokens } from '../../theme/tokens';
import { ProfileAvatar } from './ProfileAvatar';
import { prepareJournalPhoto } from './prepareJournalPhoto';
export function ProfilePhotoEditor({ photo, disabled, onChange, onBusy }: {
  photo?: string; disabled: boolean; onChange(photo?: string): void; onBusy(busy: boolean): void;
}) {
  const [picking, setPicking] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [error, setError] = useState('');
  async function pick(camera: boolean) {
    if (disabled || picking) return;
    setSheet(false);
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
  return <View style={{ alignItems: 'center', gap: tokens.space[8] }}>
    <Pressable accessibilityRole="button" accessibilityLabel="프로필 사진 바꾸기" disabled={disabled || picking} onPress={() => setSheet(true)}>
      <ProfileAvatar photo={photo} size={96} />
      <View style={{ position: 'absolute', right: 0, bottom: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: tokens.color.bg.inverse, alignItems: 'center', justifyContent: 'center' }}>
        <AppIcon name="camera" size={14} color={tokens.color.text.inverse} />
      </View>
    </Pressable>
    {picking && <Text style={[text.label, { color: tokens.color.text.secondary }]}>사진을 처리하고 있습니다.</Text>}
    {!!error && <Text accessibilityRole="alert" style={[text.label, { color: tokens.color.danger.default, textAlign: 'center' }]}>{error}</Text>}
    <BottomSheet visible={sheet} title="프로필 사진" subtitle="저장 버튼을 눌러야 프로필에 반영돼요" onClose={() => setSheet(false)}>
      <ListGroup>
        <ListRow icon="camera" label="촬영하기" trailing="none" onPress={() => void pick(true)} />
        <ListRow icon="image" label="앨범에서 선택" trailing="none" onPress={() => void pick(false)} />
        {photo && <ListRow icon="trash" label="프로필 사진 삭제" danger trailing="none" onPress={() => { setSheet(false); onChange(undefined); }} />}
      </ListGroup>
    </BottomSheet>
  </View>;
}
