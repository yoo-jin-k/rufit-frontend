import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { prepareJournalPhoto } from './prepareJournalPhoto';

export class CameraPermissionError extends Error {
  constructor() {
    super('카메라 권한이 꺼져 있습니다. 아이폰 설정에서 루핏의 카메라 권한을 켜 주세요. 앨범에서 사진을 선택하거나 사진 없이도 저장할 수 있습니다.');
  }
}

/** 작성과 편집이 같은 사진 개수·권한·변환 규칙을 사용합니다. 취소 시 빈 배열을 반환합니다. */
export async function pickJournalPhotos(camera: boolean, remaining: number): Promise<string[]> {
  if (remaining <= 0) return [];
  if (camera && Platform.OS !== 'web') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted)
      throw new CameraPermissionError();
  }
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    base64: true,
    quality: 0.5,
    allowsEditing: camera,
    allowsMultipleSelection: !camera,
    selectionLimit: remaining,
    aspect: [1, 1],
  };
  const result = camera
    ? await ImagePicker.launchCameraAsync(options)
    : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled) return [];
  if (result.assets.length > remaining)
    throw new Error(`사진은 ${remaining}장 더 추가할 수 있습니다. 다시 선택해 주세요.`);
  const photos: string[] = [];
  for (const asset of result.assets) {
    if (!asset.base64) throw new Error('사진을 읽을 수 없습니다. 다른 사진을 선택해 주세요.');
    photos.push(await prepareJournalPhoto(asset.base64, asset.mimeType ?? 'image/jpeg'));
  }
  return photos;
}
