import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { act, createElement, type ComponentType } from 'react';
import { nativeWebLoader } from './helpers/nativeWeb.ts';
import type { Workout } from '../src/features/workout/model.ts';
test('날짜 선택 시 실제 운동을 표시하고 접기/펼치기 후 선택을 유지한다', async () => {
  const dom = new JSDOM('<div id="root"></div>');
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    ShadowRoot: dom.window.ShadowRoot,
    HTMLElement: dom.window.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  const { createRoot } = await import('react-dom/client');
  const load = nativeWebLoader();
  const Calendar = load('src/features/calendar/WorkoutCalendar.tsx')
    .WorkoutCalendar as ComponentType<{ history: Workout[]; ready: boolean; now: number }>;
  const startedAt = new Date(2026, 9, 1, 10).getTime();
  const history: Workout[] = [
    {
      id: 'one',
      startedAt,
      finishedAt: startedAt + 60000,
      exercises: [
        { id: 's', name: '스쿼트', sets: [{ id: 's1', weight: '80', reps: '5', completed: true }] },
      ],
    },
  ];
  const root = createRoot(dom.window.document.getElementById('root')!);
  const click = async (label: string) => {
    const button = dom.window.document.querySelector(`[aria-label="${label}"]`) as HTMLElement;
    assert.ok(button, label);
    await act(async () => button.click());
  };
  try {
    await act(async () =>
      root.render(
        createElement(Calendar, { history, ready: true, now: new Date(2026, 9, 30, 12).getTime() }),
      ),
    );
    await click('2026-10-01, 완료한 운동 1회');
    assert.match(dom.window.document.body.textContent!, /80kg × 5회/);
    await click('운동 캘린더 접기');
    assert.doesNotMatch(dom.window.document.body.textContent!, /80kg × 5회/);
    await click('운동 캘린더 펼치기');
    assert.match(dom.window.document.body.textContent!, /80kg × 5회/);
    await click('이전 달');
    assert.match(dom.window.document.body.textContent!, /2026년 09월/);
    assert.doesNotMatch(dom.window.document.body.textContent!, /80kg × 5회/);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
  }
});
