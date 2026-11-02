import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { act, createElement, type ComponentType } from 'react';
import { nativeWebLoader } from './helpers/nativeWeb.ts';
import type { RufitSession } from '../src/api/session.ts';
import { weightStorageKey } from '../src/features/bodyweight/model.ts';

// 실제 버튼과 저장 로직을 연결하여 조회만으로 덮어쓰지 않는지 확인합니다.
test('측정 동기화 화면은 자동 전송 없이 비교한 뒤 선택한 서버 값만 가져옵니다', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    ShadowRoot: dom.window.ShadowRoot,
    HTMLElement: dom.window.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  const data = new Map([
    [
      weightStorageKey,
      JSON.stringify({ version: 1, records: [{ date: '2026-01-01', weight: 71 }] }),
    ],
  ]);
  const storage = {
    getItem: async (key: string) => data.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      data.set(key, value);
    },
  };
  let reads = 0,
    writes = 0,
    changed = 0,
    busy = 0;
  const session = {
    scope: { server: 'https://example.test', accountId: 'owner' },
    isActive: () => true,
    api: {
      measurements: async (kind: string, page: number) => {
        reads++;
        return {
          page,
          hasNext: false,
          items:
            kind === 'weight'
              ? [
                  {
                    date: '2026-01-01',
                    version: 1,
                    weight: 70,
                    bench: null,
                    squat: null,
                    deadlift: null,
                  },
                ]
              : [],
        };
      },
      saveMeasurement: async () => {
        writes++;
        throw new Error('전송 금지');
      },
    },
  } as unknown as RufitSession;
  const { MeasurementTransferPanel } = nativeWebLoader({
    '@react-native-async-storage/async-storage': { __esModule: true, default: storage },
  })('src/features/sync/MeasurementTransferPanel.tsx') as {
    MeasurementTransferPanel: ComponentType<{
      session: RufitSession;
      disabled: boolean;
      onChanged(): void;
      onBusy(value: boolean): void;
    }>;
  };
  const { createRoot } = await import('react-dom/client');
  const root = createRoot(dom.window.document.getElementById('root')!);
  const click = async (title: string) => {
    const button = [...dom.window.document.querySelectorAll('[role="button"]')].find(
      (item) => item.textContent === title,
    );
    assert.ok(button, title);
    await act(async () => {
      button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    });
  };
  try {
    await act(async () => {
      root.render(
        createElement(MeasurementTransferPanel, {
          session,
          disabled: false,
          onChanged: () => {
            changed++;
          },
          onBusy: (value) => {
            busy += value ? 1 : -1;
          },
        }),
      );
    });
    assert.equal(reads, 0);
    assert.equal(writes, 0);
    await click('측정 기록 비교·새로고침');
    assert.match(dom.window.document.body.textContent!, /기기: 71kg/);
    assert.match(dom.window.document.body.textContent!, /서버: 70kg/);
    assert.equal(JSON.parse(data.get(weightStorageKey)!).records[0].weight, 71);
    await click('서버 값으로 기기 수정');
    assert.equal(JSON.parse(data.get(weightStorageKey)!).records[0].weight, 70);
    assert.match(dom.window.document.body.textContent!, /같은 값입니다/);
    assert.equal(writes, 0);
    assert.equal(changed, 1);
    assert.equal(busy, 0);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
  }
});
