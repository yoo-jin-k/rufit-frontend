/**
 * 앱(iOS·Android)에서 고른 사진을 서버에 올릴 수 있는 크기로 줄입니다. 원본 사진은 바꾸지 않습니다.
 * 요즘 휴대폰 사진(24~48MP)은 화질만 낮춰서는 2MB를 넘으므로, 웹과 같이 긴 변을 1280px로 줄인 뒤
 * JPEG 화질을 80% → 60% → 40% 순서로 낮춰 2MB(base64 2,800,000자) 이하가 되는 첫 결과를 씁니다.
 */
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { MAX_PHOTO_CHARS, MAX_PHOTO_SIDE, PHOTO_QUALITIES, type PickedPhoto } from './photoLimits';

export async function prepareJournalPhoto(asset: PickedPhoto): Promise<string> {
  if (!asset.uri) throw new Error('사진을 읽을 수 없습니다. 다른 사진을 선택해 주세요.');
  const width = asset.width ?? 0;
  const height = asset.height ?? 0;
  const context = ImageManipulator.manipulate(asset.uri);
  // 크기를 모르면 키우지 않도록 줄이기를 건너뛰고 화질만 낮춥니다.
  if (Math.max(width, height) > MAX_PHOTO_SIDE)
    context.resize(width >= height ? { width: MAX_PHOTO_SIDE } : { height: MAX_PHOTO_SIDE });
  const image = await context.renderAsync();
  try {
    for (const compress of PHOTO_QUALITIES) {
      const saved = await image.saveAsync({ compress, format: SaveFormat.JPEG, base64: true });
      if (!saved.base64) continue;
      const photo = `data:image/jpeg;base64,${saved.base64}`;
      if (photo.length <= MAX_PHOTO_CHARS) return photo;
    }
  } finally {
    image.release();
    context.release();
  }
  throw new Error('사진 용량을 줄이지 못했습니다. 다른 사진을 선택해 주세요.');
}
