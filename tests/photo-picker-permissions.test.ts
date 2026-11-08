import test from 'node:test';
import assert from 'node:assert/strict';
import { nativeWebLoader } from './helpers/nativeWeb.ts';

/** 기기 API의 경계 응답을 흉내 냅니다. 실제 카메라 촬영 통과를 의미하지 않습니다. */
function picker(permission: boolean, result: unknown) {
  let opened = 0;
  let options: Record<string, unknown> = {};
  const launch = async (value: Record<string, unknown>) => {
    opened++;
    options = value;
    return result;
  };
  const load = nativeWebLoader({
    'react-native': { Platform: { OS: 'ios' } },
    'expo-image-picker': {
      requestCameraPermissionsAsync: async () => ({ granted: permission }),
      launchCameraAsync: launch,
      launchImageLibraryAsync: launch,
    },
  });
  const { pickJournalPhotos } = load('src/features/profile/pickJournalPhotos.ts') as {
    pickJournalPhotos: (camera: boolean, remaining: number) => Promise<string[]>;
  };
  return { pick: pickJournalPhotos, opened: () => opened, options: () => options };
}

test('촬영 권한 거부 시 카메라를 열지 않고 대안을 안내합니다', async () => {
  const p = picker(false, { canceled: false, assets: [] });
  await assert.rejects(p.pick(true, 2), /카메라 권한.*앨범.*사진 없이/);
  assert.equal(p.opened(), 0);
});
test('촬영 취소와 남은 사진 0장은 기존 사진을 변경할 결과를 반환하지 않습니다', async () => {
  const p = picker(true, { canceled: true, assets: null });
  assert.deepEqual(await p.pick(true, 1), []);
  assert.deepEqual(await p.pick(false, 0), []);
  assert.equal(p.opened(), 1);
});
test('앨범 여러 장은 순서를 유지하며 촬영과 다르게 다중 선택을 요청합니다', async () => {
  const p = picker(true, {
    canceled: false,
    assets: [{ base64: 'YQ==', mimeType: 'image/png' }, { base64: 'Yg==' }],
  });
  assert.deepEqual(await p.pick(false, 2), [
    'data:image/png;base64,YQ==',
    'data:image/jpeg;base64,Yg==',
  ]);
  assert.equal(p.options().allowsMultipleSelection, true);
  assert.equal(p.options().selectionLimit, 2);
  assert.equal(p.options().allowsEditing, false);
  await assert.rejects(p.pick(false, 1), /1장 더/);
});
test('읽기 실패와 용량 초과는 부분 성공으로 저장하지 않습니다', async () => {
  await assert.rejects(
    picker(true, { canceled: false, assets: [{ base64: 'YQ==' }, {}] }).pick(false, 2),
    /읽을 수 없습니다/,
  );
  await assert.rejects(
    picker(true, { canceled: false, assets: [{ base64: 'a'.repeat(2_800_001) }] }).pick(false, 1),
    /사진이 큽니다/,
  );
});
