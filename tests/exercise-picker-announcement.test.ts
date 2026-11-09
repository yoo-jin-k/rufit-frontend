import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { useExerciseResultAnnouncement } from '../src/features/exercises/useExerciseResultAnnouncement.ts';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

test('선택창이 열린 동안 마지막 결과만 알리고 닫기와 재개방 생명주기를 분리한다', async () => {
  const dom = new JSDOM('<div id="root"></div>');
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  const announcements: string[] = [];
  const announce = (message: string) => announcements.push(message);
  function Announcer({ signature, count }: { signature: string; count: number }) {
    return createElement('output', null, useExerciseResultAnnouncement(signature, count, announce));
  }
  function Harness({
    visible,
    signature,
    count,
  }: {
    visible: boolean;
    signature: string;
    count: number;
  }) {
    return visible ? createElement(Announcer, { signature, count }) : null;
  }
  const root = createRoot(dom.window.document.getElementById('root')!);
  const render = async (visible: boolean, signature: string, count: number) =>
    act(async () => root.render(createElement(Harness, { visible, signature, count })));

  try {
    await render(false, 'all', 110);
    await act(async () => wait(320));
    assert.deepEqual(announcements, [], '미개방 mount는 알리지 않는다');

    await render(true, 'all', 110);
    await act(async () => wait(100));
    await render(false, 'all', 110);
    await act(async () => wait(240));
    assert.deepEqual(announcements, [], '300ms 전에 닫으면 예약 알림을 취소한다');

    await render(true, 'all', 110);
    await act(async () => wait(40));
    await render(true, 's', 18);
    await act(async () => wait(40));
    await render(true, 'sq', 1);
    await act(async () => wait(320));
    assert.deepEqual(
      announcements,
      ['검색 결과 1개'],
      '재개방 뒤 연속 입력의 최종 결과만 한 번 알린다',
    );
    assert.equal(dom.window.document.querySelector('output')?.textContent, '검색 결과 1개');
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
  }
});
