import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { nativeWebLoader } from './helpers/nativeWeb.ts';
import { restTimerView } from '../src/features/workout/timerView.ts';
const { RestTimerDock } = nativeWebLoader()('src/features/workout/RestTimerDock.tsx') as {
  RestTimerDock: ComponentType<{
    view: ReturnType<typeof restTimerView>; paused: boolean;
    onSettings(): void; onTogglePause(): void; onAdjust(n: -10 | 10): void; onClose(): void;
  }>;
};
test('휴식 조작부는 상태에 맞는 접근성 이름과 만료 버튼 제한을 제공합니다', () => {
  for (const state of [{ paused: false, seconds: 80 }, { paused: true, seconds: 80 }, { paused: false, seconds: 0 }]) {
    const html = renderToStaticMarkup(createElement(RestTimerDock, {
      view: restTimerView(state.seconds * 1000, 0), paused: state.paused,
      onSettings() {}, onTogglePause() {}, onAdjust() {}, onClose() {},
    }));
    const dom = new JSDOM(html);
    try {
      const button = dom.window.document.querySelector(`[aria-label="${state.paused ? '휴식 재개' : '휴식 일시정지'}"]`)!;
      assert.ok(button);
      assert.equal(button.getAttribute('aria-disabled') === 'true', state.seconds === 0);
      assert.ok(dom.window.document.querySelector('[aria-label="휴식 종료"]'));
      assert.match(dom.window.document.body.textContent!, state.seconds ? /1:20/ : /0:00/);
    } finally { dom.window.close(); }
  }
});
