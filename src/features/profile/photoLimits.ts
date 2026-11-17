/** 오운완·프로필 사진의 공통 크기 규칙입니다. 서버(JournalController)도 한 장 2,800,000자까지만 받습니다. */
export const MAX_PHOTO_CHARS = 2_800_000;
/** 긴 변 최대 픽셀입니다. 휴대폰 화면에서 선명하고 한 장 200~400KB 정도가 됩니다. */
export const MAX_PHOTO_SIDE = 1280;
/** 용량 제한을 넘으면 차례로 낮춰 다시 저장할 JPEG 화질입니다. */
export const PHOTO_QUALITIES = [0.8, 0.6, 0.4] as const;

/** 사진 선택기가 돌려준 사진 중 크기 조정에 쓰는 값입니다. 웹은 base64, 앱은 uri를 씁니다. */
export type PickedPhoto = {
  uri?: string;
  base64?: string | null;
  mimeType?: string | null;
  width?: number;
  height?: number;
};
