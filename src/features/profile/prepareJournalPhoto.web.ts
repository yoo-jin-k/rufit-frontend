/** 웹 사진 선택기는 quality 옵션을 적용하지 않으므로 로컬에서 크기와 용량을 줄입니다. 원본 파일은 수정하지 않습니다. */
export async function prepareJournalPhoto(base64: string, mimeType = 'image/jpeg'): Promise<string> {
  const source = `data:${mimeType || 'image/jpeg'};base64,${base64}`;
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('이 사진 형식을 읽지 못했습니다. JPG 또는 PNG 사진을 선택해 주세요.'));
    image.src = source;
  });
  if (!image.naturalWidth || !image.naturalHeight) throw new Error('사진 크기를 확인할 수 없습니다.');
  const ratio = Math.min(1, 1280 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('사진을 처리하지 못했습니다. 다시 선택해 주세요.');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  for (const quality of [0.8, 0.6, 0.4]) {
    const photo = canvas.toDataURL('image/jpeg', quality);
    if (photo.startsWith('data:image/') && photo.length <= 2_800_000) return photo;
  }
  throw new Error('사진 용량을 줄이지 못했습니다. 더 작은 사진을 선택해 주세요.');
}
