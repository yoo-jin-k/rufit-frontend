import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exerciseCatalog } from '../src/features/exercises/catalog.ts';
import { exerciseGuides } from '../src/features/exercises/guides.ts';

test('자세 설명은 종목 목록에 있는 종목에만 연결되고 내용이 비어 있지 않습니다', () => {
  const ids = new Set<string>(exerciseCatalog.map((e) => e.id));
  for (const [id, guide] of Object.entries(exerciseGuides)) {
    assert.ok(ids.has(id), `종목 목록에 없는 id: ${id}`);
    assert.ok(guide.summary.trim().length > 0);
    assert.ok(guide.steps.length >= 3, '동작은 3단계 이상 적습니다');
    assert.ok(guide.tips.length >= 1, '주의할 점을 하나 이상 적습니다');
    for (const line of [...guide.steps, ...guide.tips]) assert.ok(line.trim().length > 0);
  }
});

test('동작 그림을 넣은 5개 종목은 자세 설명이 있습니다', () => {
  const names = ['스쿼트', '벤치프레스', '데드리프트', '랫풀다운', '푸시업'];
  for (const name of names) {
    const item = exerciseCatalog.find((e) => e.name === name);
    assert.ok(item, `${name}이 종목 목록에 있어야 합니다`);
    assert.ok(exerciseGuides[item.id], `${name} 자세 설명이 있어야 합니다`);
  }
});
