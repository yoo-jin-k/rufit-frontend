import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { act, createElement, type ComponentType, type ReactNode } from 'react';
import { nativeWebLoader } from './helpers/nativeWeb.ts';

test('사진 5장에서도 삭제 가능하고 작성 취소 확인 뒤 계속 작성할 수 있습니다', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    ShadowRoot: dom.window.ShadowRoot,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  const { createRoot } = await import('react-dom/client');
  const load = nativeWebLoader({
    'expo-image-picker': {},
    '../../components/ScreenLayout': {
      ui: {},
      ScreenLayout: ({ children, footer }: { children: ReactNode; footer: ReactNode }) =>
        createElement('div', null, children, footer),
    },
  });
  const { JournalComposer } = load('src/features/profile/JournalComposer.tsx') as {
    JournalComposer: ComponentType<Record<string, unknown>>;
  };
  const root = createRoot(document.getElementById('root')!);
  let closes = 0;
  const click = async (label: string) => {
    const element = [...document.querySelectorAll('[role="button"]')].find(
      (item) => item.getAttribute('aria-label') === label || item.textContent === label,
    );
    assert.ok(element, label);
    assert.notEqual(element.getAttribute('aria-disabled'), 'true');
    await act(async () =>
      element.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })),
    );
  };
  try {
    await act(async () =>
      root.render(
        createElement(JournalComposer, {
          workout: { id: 'test', startedAt: 0, finishedAt: 1000, exercises: [] },
          initial: {
            workoutId: 'test',
            memo: '',
            photos: Array.from({ length: 5 }, (_, i) => `data:image/jpeg;base64,${i}`),
            visibility: 'private',
            createdAt: 1,
          },
          onClose: () => {
            closes++;
          },
          onSave: async () => {},
        }),
      ),
    );
    await click('5번 사진 삭제');
    assert.match(document.body.textContent!, /4\/5장/);
    await click('수정 취소');
    assert.match(document.body.textContent!, /작성 중인 내용을 버릴까요/);
    assert.equal(closes, 0);
    await click('계속 작성하기');
    assert.match(document.body.textContent!, /4\/5장/);
    await click('수정 취소');
    await click('변경 내용 버리기');
    assert.equal(closes, 1);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
  }
});

test('사진 읽기 실패 후 추가를 건너뛰면 기존 사진과 메모를 저장할 수 있습니다', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    ShadowRoot: dom.window.ShadowRoot,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  const { createRoot } = await import('react-dom/client');
  const load = nativeWebLoader({
    'expo-image-picker': {
      launchImageLibraryAsync: async () => ({ canceled: false, assets: [{}] }),
    },
    '../../components/ScreenLayout': {
      ui: {},
      ScreenLayout: ({ children, footer }: { children: ReactNode; footer: ReactNode }) =>
        createElement('div', null, children, footer),
    },
  });
  const { JournalComposer } = load('src/features/profile/JournalComposer.tsx') as {
    JournalComposer: ComponentType<Record<string, unknown>>;
  };
  const root = createRoot(document.getElementById('root')!);
  let saved: Record<string, unknown> | undefined;
  const button = (label: string) =>
    [...document.querySelectorAll('[role="button"]')].find(
      (item) => item.getAttribute('aria-label') === label || item.textContent === label,
    )!;
  const click = async (label: string) => {
    assert.ok(button(label));
    await act(async () =>
      button(label).dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })),
    );
  };
  try {
    await act(async () =>
      root.render(
        createElement(JournalComposer, {
          workout: { id: 'photo-test', startedAt: 0, finishedAt: 1000, exercises: [] },
          initial: {
            workoutId: 'photo-test',
            memo: '보존할 글',
            photos: ['data:image/jpeg;base64,existing'],
            visibility: 'private',
            createdAt: 1,
          },
          onClose() {},
          onSave: async (journal: Record<string, unknown>) => {
            saved = journal;
          },
        }),
      ),
    );
    await click('앨범에서 선택');
    assert.match(document.body.textContent!, /사진을 읽을 수 없습니다/);
    assert.equal(button('이 기기에 오운완 저장').getAttribute('aria-disabled'), 'true');
    await click('실패한 사진 추가 건너뛰기');
    await click('이 기기에 오운완 저장');
    assert.equal(saved?.memo, '보존할 글');
    assert.deepEqual(saved?.photos, ['data:image/jpeg;base64,existing']);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
  }
});

test('계정 저장은 명시적으로 선택하며 전송 실패에도 글을 유지하고 같은 버전으로 재시도합니다', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    ShadowRoot: dom.window.ShadowRoot,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  const { createRoot } = await import('react-dom/client');
  const load = nativeWebLoader({
    'expo-image-picker': {},
    '../../components/ScreenLayout': {
      ui: {},
      ScreenLayout: ({ children, footer }: { children: ReactNode; footer: ReactNode }) =>
        createElement('div', null, children, footer),
    },
  });
  const { JournalComposer } = load('src/features/profile/JournalComposer.tsx') as {
    JournalComposer: ComponentType<Record<string, unknown>>;
  };
  const root = createRoot(document.getElementById('root')!);
  const writes: Record<string, unknown>[] = [];
  let saved = false,
    closed = 0;
  const session = {
    isActive: () => true,
    api: {
      directorySettings: async () => ({ memberId: 'me' }),
      ownPost: async () => ({ version: 2 }),
      savePost: async (source: string, body: Record<string, unknown>) => {
        assert.equal(source, 'cloud-test');
        writes.push(body);
        if (writes.length === 1) throw new Error('연결 오류');
        return { version: 3 };
      },
    },
  };
  const click = async (label: string) => {
    const item = document.querySelector(`[aria-label="${label}"]`);
    assert.ok(item, label);
    await act(async () =>
      item.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })),
    );
  };
  try {
    await act(async () =>
      root.render(
        createElement(JournalComposer, {
          session,
          workout: { id: 'cloud-test', startedAt: 0, finishedAt: 1000, exercises: [] },
          initial: {
            workoutId: 'cloud-test',
            memo: '오늘 기록',
            photos: [],
            visibility: 'private',
            createdAt: 1,
          },
          onClose: () => {
            closed++;
          },
          onSave: async (_: unknown, account: boolean) => {
            saved = account;
          },
        }),
      ),
    );
    assert.equal(writes.length, 0);
    await click('내 계정');
    assert.equal(writes.length, 0);
    await click('친구 공개');
    await click('내 계정에 오운완 저장');
    assert.match(document.body.textContent!, /연결 오류/);
    assert.equal(closed, 0);
    assert.equal(saved, false);
    await click('내 계정에 오운완 저장');
    assert.deepEqual(writes[0], writes[1]);
    assert.equal(writes[0].visibility, 'FRIENDS');
    assert.equal(writes[0].memo, '오늘 기록');
    assert.equal(writes[0].version, 2);
    assert.equal(saved, true);
    assert.equal(closed, 1);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
  }
});
