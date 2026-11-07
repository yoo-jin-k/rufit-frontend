import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { act, createElement, type ComponentType } from 'react';
import { nativeWebLoader } from './helpers/nativeWeb.ts';

test('연결 화면은 이메일을 별도로 열고 통합 안내 확인 전에는 로그아웃하지 않습니다', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document,
    HTMLElement: dom.window.HTMLElement, ShadowRoot: dom.window.ShadowRoot, IS_REACT_ACT_ENVIRONMENT: true });
  const { createRoot } = await import('react-dom/client');
  const load = nativeWebLoader({ './nativeAuth': { nativeAuthClient: 'WEB', authReturnUrl: 'http://localhost/callback' },
    '../../components/ScreenLayout': { ui: {} } });
  const { EmailAccountPanel } = load('src/features/auth/EmailAccountPanel.tsx') as { EmailAccountPanel: ComponentType<Record<string, unknown>> };
  let logouts = 0;
  const coordinator = { loginMethods: async () => ({ email: null, providers: ['KAKAO'] }),
    linkSocial: async (provider: string, client: string, url: string, merge: boolean) => {
      assert.equal(provider, 'GOOGLE'); assert.equal(merge, true);
    }, logout: async () => { logouts++; } };
  const root = createRoot(document.getElementById('root')!);
  const click = async (label: string) => {
    const el = document.querySelector(`[aria-label="${label}"]`);
    assert.ok(el, label);
    await act(async () => el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
  };
  try {
    await act(async () => root.render(createElement(EmailAccountPanel, { coordinator, signedIn: true, enabled: { KAKAO: true, GOOGLE: true } })));
    assert.equal(document.querySelector('[aria-label="이메일 주소"]'), null);
    await click('이메일 연결하기');
    assert.ok(document.querySelector('[aria-label="이메일 주소"]'));
    await click('기존 Google 계정 통합');
    await click('동의하고 본인 인증 · 통합');
    assert.match(document.body.textContent!, /계정 통합 완료/);
    assert.equal(logouts, 0);
    await click('확인하고 다시 로그인');
    assert.equal(logouts, 1);
  } finally { await act(async () => root.unmount()); dom.window.close(); }
});
