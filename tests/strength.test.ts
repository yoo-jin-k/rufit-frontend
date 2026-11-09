import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decode, measurement, total, upsert, validDate } from '../src/features/strength/model.ts';
const input = { bench: '62.5', squat: '100', deadlift: '120.25' };
test('실제 달력 날짜와 미래 날짜 검사', () => {
  assert.equal(validDate('2024-02-29'), true);
  for (const date of ['2025-02-29', '2026-02-30', '2026-13-01', '', '26-01-01'])
    assert.equal(validDate(date), false);
  assert.throws(() => measurement('2026-11-01', input, '2026-10-30'));
});
test('빈 값, 음수, 비정상 중량을 거절하고 소수 중량 합계를 정확히 표시', () => {
  for (const value of ['', '0', '-1', 'Infinity', '1e2', '1001', '1.234', 'abc'])
    assert.throws(() => measurement('2026-10-01', { ...input, bench: value }));
  assert.equal(total(measurement('2026-10-01', input)), 282.75);
  assert.equal(
    total(measurement('2026-10-01', { bench: '0.1', squat: '0.2', deadlift: '0.3' })),
    0.6,
  );
});
test('과거 날짜 추가는 시간순 정렬하고 같은 날짜 수정은 중복 없이 교체', () => {
  const newer = measurement('2026-10-20', input);
  const older = measurement('2026-10-01', input);
  const records = upsert([newer], older);
  assert.deepEqual(
    records.map((r) => r.date),
    ['2026-10-01', '2026-10-20'],
  );
  const updated = upsert(records, { ...older, bench: 80 });
  assert.equal(updated.length, 2);
  assert.equal(updated[0].bench, 80);
  assert.equal(records[0].bench, 62.5);
  assert.deepEqual(decode(JSON.stringify({ version: 1, records: updated })), updated);
});
test('잘못된 저장 자료와 중복 날짜를 빈 기록으로 덮어쓰지 않는다', () => {
  assert.deepEqual(decode(null), []);
  const record = measurement('2026-10-01', input);
  for (const raw of [
    'oops',
    '{}',
    JSON.stringify({ version: 2, records: [] }),
    JSON.stringify({ version: 1, records: [record, record] }),
    JSON.stringify({ version: 1, records: [{ ...record, bench: null }] }),
  ])
    assert.throws(() => decode(raw));
});

test('선 그래프 좌표는 실제 날짜 간격을 반영하고 한 점도 중앙에 표시한다', async () => {
  const { lineGeometry } = await import('../src/features/strength/lineChartModel.ts');
  const graph = lineGeometry(
    [
      { date: '2026-10-01', value: 100 },
      { date: '2026-10-02', value: 150 },
      { date: '2026-10-11', value: 200 },
    ],
    248,
  );
  assert.equal(graph.coordinates[0].x, 24);
  assert.equal(graph.coordinates[1].x, 44);
  assert.equal(graph.coordinates[2].x, 224);
  assert.equal(graph.segments.length, 2);
  assert.ok(graph.segments.every((s) => Number.isFinite(s.angle) && s.length > 0));
  assert.equal(lineGeometry([{ date: '2026-10-01', value: 80 }], 248).coordinates[0].x, 124);
  assert.equal(lineGeometry([], 248).segments.length, 0);
});

test('체중 그래프는 표시한 축 범위 안에 모든 값을 유지한다', async () => {
  const { lineGeometry } = await import('../src/features/strength/lineChartModel.ts');
  const graph = lineGeometry(
    [
      { date: '2026-10-01', value: 75.5 },
      { date: '2026-10-30', value: 72.5 },
    ],
    248,
    160,
    false,
  );
  assert.ok(graph.floor < 72.5 && graph.ceiling >= 75.5);
  assert.ok(graph.coordinates.every((p) => p.y >= 0 && p.y <= 160));
  assert.ok(graph.coordinates[1].y > graph.coordinates[0].y);
});
