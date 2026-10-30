import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM, VirtualConsole } from 'jsdom';
import { act, createElement, type ComponentType } from 'react';
import { nativeWebLoader } from './helpers/nativeWeb.ts';
import type { LocalSaveInput } from '../src/features/workout/localSaveView.ts';
// 완료 직후 retryPending 해제 렌더가 연달아 와도 성공 알림이 지워지지 않아야 합니다.
test('실제 저장상태 컴포넌트의 재시도·복구·일상 저장 알림 순서', async () => {
  const errors: Error[] = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (error) => errors.push(error));
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost', virtualConsole });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    ShadowRoot: dom.window.ShadowRoot,
    HTMLElement: dom.window.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  const { createRoot } = await import('react-dom/client');
  const { LocalSaveStatus } = nativeWebLoader()('src/features/workout/LocalSaveStatus.tsx') as {
    LocalSaveStatus: ComponentType<LocalSaveInput & { onRetry(): void }>;
  };
  const root = createRoot(dom.window.document.getElementById('root')!);
  let retries = 0;
  const base: LocalSaveInput = {
    state: 'saved',
    ready: true,
    retryPending: false,
    unsavedAfterFailure: false,
  };
  const render = async (patch: Partial<LocalSaveInput>) => {
    await act(async () =>
      root.render(
        createElement(LocalSaveStatus, {
          ...base,
          ...patch,
          onRetry: () => {
            retries++;
          },
        }),
      ),
    );
  };
  const live = () => dom.window.document.querySelector('[aria-live="polite"]')!.textContent;
  try {
    await render({});
    assert.equal(live(), '');
    await render({ state: 'saving' });
    await render({});
    assert.equal(live(), '');
    await render({ state: 'save-error', unsavedAfterFailure: true });
    assert.match(live()!, /기기에 저장하지 못/);
    const button = dom.window.document.querySelector('[role="button"]')!;
    await act(async () =>
      button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })),
    );
    assert.equal(retries, 1);
    await render({ state: 'saving', unsavedAfterFailure: true, retryPending: true });
    assert.equal(dom.window.document.querySelector('[role="button"]'), button);
    assert.equal(button.getAttribute('aria-busy'), 'true');
    assert.equal(button.getAttribute('aria-disabled'), 'true');
    assert.match(dom.window.document.body.textContent!, /앱을 닫기 전에 다시 저장/);
    await act(async () =>
      button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })),
    );
    assert.equal(retries, 1);
    await render({ retryPending: true });
    assert.equal(live(), '기기에 저장됨');
    await render({});
    assert.equal(live(), '기기에 저장됨');
    await render({ state: 'saving' });
    await render({});
    assert.equal(live(), '');
    await render({ state: 'load-error', ready: false });
    assert.match(live()!, /기존 저장 데이터를 덮어쓰지/);
    await render({ state: 'loading', ready: false, retryPending: true });
    assert.match(live()!, /다시 불러오는 중/);
    assert.match(dom.window.document.body.textContent!, /기존 저장 데이터를 덮어쓰지/);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
  }
  assert.deepEqual(errors, []);
});
