import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeWeight, saveWeight, weightRecord } from '../src/features/bodyweight/model.ts';
test('체중은 날짜와 소수 kg을 검증하고 같은 날짜 수정은 한 기록으로 보관한다', () => {
  const first = weightRecord('2026-10-01', '72.55', '2026-10-30');
  for (const value of ['', '-1', '0', '701', 'abc', '1.234'])
    assert.throws(() => weightRecord('2026-10-01', value));
  assert.throws(() => weightRecord('2026-11-01', '72', '2026-10-30'));
  assert.throws(() => weightRecord('2026-02-30', '72', '2026-10-30'));
  const records = saveWeight(saveWeight([first], { date: '2026-10-20', weight: 71 }), {
    date: first.date,
    weight: 72,
  });
  assert.deepEqual(records, [
    { date: '2026-10-01', weight: 72 },
    { date: '2026-10-20', weight: 71 },
  ]);
  assert.deepEqual(decodeWeight(JSON.stringify({ version: 1, records })), records);
});
test('체중 저장 데이터가 손상되면 기존 기록을 빈 목록으로 바꾸지 않는다', () => {
  assert.deepEqual(decodeWeight(null), []);
  for (const raw of [
    'broken',
    '{}',
    JSON.stringify({ version: 1, records: [{ date: '2026-10-01', weight: 0 }] }),
  ])
    assert.throws(() => decodeWeight(raw));
});
