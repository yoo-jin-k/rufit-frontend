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
      const button = dom.window.document.querySelector(`[aria-label="${state.seconds === 0 ? '세트 일시정지' : state.paused ? '휴식 재개' : '휴식 일시정지'}"]`)!;
      assert.ok(button);
      assert.equal(button.getAttribute('aria-disabled') === 'true', false);
      assert.ok(dom.window.document.querySelector(`[aria-label="${state.seconds === 0 ? '세트' : '휴식'} 타이머 닫기"]`));
      assert.match(dom.window.document.body.textContent!, state.seconds ? /1:20/ : /0:00/);
    } finally { dom.window.close(); }
  }
});

test('휴식이 끝나면 세트와 증가한 시간을 표시하고 휴식 증감 버튼을 숨깁니다', () => {
  const html = renderToStaticMarkup(createElement(RestTimerDock, {
    view: restTimerView(1000, 27000), paused: false,
    onSettings() {}, onTogglePause() {}, onAdjust() {}, onClose() {},
  }));
  const dom = new JSDOM(html);
  try {
    assert.match(dom.window.document.body.textContent!, /세트/);
    assert.match(dom.window.document.body.textContent!, /0:26/);
    assert.doesNotMatch(dom.window.document.body.textContent!, /휴식 완료/);
    assert.equal(dom.window.document.querySelector('[aria-label="휴식 10초 늘리기"]'), null);
    assert.ok(dom.window.document.querySelector('[aria-label="세트 일시정지"]'));
  } finally { dom.window.close(); }
});
