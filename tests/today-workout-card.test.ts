import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { nativeWebLoader } from './helpers/nativeWeb.ts';

test('여러 번 저장한 오늘 운동도 홈에는 클릭 가능한 카드 하나만 렌더링합니다', () => {
  const load = nativeWebLoader({
    '../../components/ScreenLayout': { ui: {}, ScreenLayout: () => null },
    './WorkoutHistory': { WorkoutHistory: () => null },
  });
  const { TodayWorkoutCard } = load('src/features/workout/TodayWorkoutCard.tsx') as { TodayWorkoutCard: ComponentType<Record<string, unknown>> };
  const now = new Date(2026, 10, 3, 13).getTime();
  const history = ['스쿼트', '벤치프레스', '데드리프트'].map((name, index) => ({
    id: String(index), startedAt: now - 120000, finishedAt: now,
    exercises: [{ id: name, name, sets: [{ id: '1', weight: '20', reps: '10', completed: true }] }],
  }));
  const dom = new JSDOM(renderToStaticMarkup(createElement(TodayWorkoutCard, { history, now, journals: [], onJournal() {} })));
  try {
    assert.equal(dom.window.document.querySelectorAll('[aria-label="오늘의 운동 전체 기록 보기"]').length, 1);
    // Figma 02-03: 큰 숫자(분·kg)와 아래 한 줄 요약(부위 · 세트 수)으로 바뀌었습니다.
    assert.match(dom.window.document.body.textContent!, /6 분/);
    assert.match(dom.window.document.body.textContent!, /600 kg/);
    assert.match(dom.window.document.body.textContent!, /3세트/);
  } finally { dom.window.close(); }
});
