/** 네이티브 사진 선택기의 압축 결과를 사용하고 저장 크기를 검증합니다. */
export async function prepareJournalPhoto(base64: string, mimeType = 'image/jpeg'): Promise<string> {
  const photo = `data:${mimeType || 'image/jpeg'};base64,${base64}`;
  if (photo.length > 2_800_000) throw new Error('사진이 큽니다. 2MB 이하 사진을 선택해 주세요.');
  return photo;
}
