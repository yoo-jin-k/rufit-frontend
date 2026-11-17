import test from 'node:test';
import assert from 'node:assert/strict';
import { nativeWebLoader } from './helpers/nativeWeb.ts';

/**
 * 사진 줄이기(expo-image-manipulator)를 흉내 냅니다. 저장할 때마다 sizes의 다음 base64 길이를 돌려줍니다.
 * 실제 사진 변환 품질을 의미하지 않습니다.
 */
function manipulator(sizes: number[] = [8]) {
  const calls = { resize: [] as unknown[], compress: [] as number[], released: 0 };
  let saved = 0;
  const mock = {
    SaveFormat: { JPEG: 'jpeg' },
    ImageManipulator: {
      manipulate: (uri: string) => ({
        uri,
        resize(size: unknown) {
          calls.resize.push(size);
          return this;
        },
        async renderAsync() {
          return {
            async saveAsync(options: { compress: number; base64: boolean }) {
              calls.compress.push(options.compress);
              const length = sizes[Math.min(saved++, sizes.length - 1)]!;
              return { uri: `${uri}.jpg`, base64: `${uri.slice(-1)}`.padEnd(length, 'A') };
            },
            release: () => calls.released++,
          };
        },
        release: () => calls.released++,
      }),
    },
  };
  return { mock, calls };
}

/** 기기 API의 경계 응답을 흉내 냅니다. 실제 카메라 촬영 통과를 의미하지 않습니다. */
function picker(permission: boolean, result: unknown, sizes?: number[]) {
  let opened = 0;
  let options: Record<string, unknown> = {};
  const edit = manipulator(sizes);
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
    'expo-image-manipulator': edit.mock,
  });
  const { pickJournalPhotos } = load('src/features/profile/pickJournalPhotos.ts') as {
    pickJournalPhotos: (camera: boolean, remaining: number) => Promise<string[]>;
  };
  return {
    pick: pickJournalPhotos,
    opened: () => opened,
    options: () => options,
    calls: edit.calls,
  };
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
    assets: [
      { uri: 'file:///a', width: 800, height: 600 },
      { uri: 'file:///b', width: 600, height: 800 },
    ],
  });
  const photos = await p.pick(false, 2);
  assert.equal(photos.length, 2);
  assert.ok(photos[0]!.startsWith('data:image/jpeg;base64,a'));
  assert.ok(photos[1]!.startsWith('data:image/jpeg;base64,b'));
  assert.equal(p.options().allowsMultipleSelection, true);
  assert.equal(p.options().selectionLimit, 2);
  assert.equal(p.options().allowsEditing, false);
  await assert.rejects(p.pick(false, 1), /1장 더/);
});
test('읽기 실패와 줄여도 용량 초과인 사진은 부분 성공으로 저장하지 않습니다', async () => {
  await assert.rejects(
    picker(true, { canceled: false, assets: [{ uri: 'file:///a' }, {}] }).pick(false, 2),
    /읽을 수 없습니다/,
  );
  const big = picker(true, { canceled: false, assets: [{ uri: 'file:///a' }] }, [2_800_001]);
  await assert.rejects(big.pick(false, 1), /용량을 줄이지 못했습니다/);
  assert.deepEqual(big.calls.compress, [0.8, 0.6, 0.4]);
});

test('앱에서는 큰 사진의 긴 변을 1280px로 줄이고, 2MB를 넘으면 화질을 낮춰 다시 저장합니다', async () => {
  const p = picker(
    true,
    {
      canceled: false,
      assets: [{ uri: 'file:///a', width: 8064, height: 6048 }],
    },
    [2_800_001, 300_000],
  );
  const [photo] = await p.pick(false, 1);
  assert.ok(photo!.length <= 2_800_000);
  assert.deepEqual(p.calls.resize, [{ width: 1280 }]);
  assert.deepEqual(p.calls.compress, [0.8, 0.6]);
  assert.equal(p.calls.released, 2);
  // 큰 원본을 base64로 받지 않고 파일 경로로 줄입니다.
  assert.equal(p.options().base64, false);
});

test('세로 사진은 높이를, 작은 사진은 줄이지 않고 그대로 저장합니다', async () => {
  const tall = picker(true, {
    canceled: false,
    assets: [{ uri: 'file:///a', width: 3024, height: 4032 }],
  });
  await tall.pick(false, 1);
  assert.deepEqual(tall.calls.resize, [{ height: 1280 }]);
  const small = picker(true, {
    canceled: false,
    assets: [{ uri: 'file:///a', width: 640, height: 480 }],
  });
  await small.pick(false, 1);
  assert.deepEqual(small.calls.resize, []);
});
