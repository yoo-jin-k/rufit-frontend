import { test } from 'node:test';
import assert from 'node:assert/strict';
import { displayWeight, formatWeight, otherUnitHint, stepWeightIn, toKg } from '../src/features/units/model.ts';

test('kg는 그대로, lb는 kg로 저장했다가 입력한 숫자 그대로 다시 보여 줍니다', () => {
  assert.equal(toKg('60', 'KG'), '60');
  assert.equal(toKg('45', 'LB'), '20.41');
  assert.equal(displayWeight('20.41', 'LB'), '45');
  for (const lb of ['5', '10', '22.5', '135', '225', '315.5']) {
    assert.equal(displayWeight(toKg(lb, 'LB'), 'LB'), String(Number(lb)), `${lb}lb 왕복`);
  }
});

test('입력 중인 값과 잘못된 값은 숫자로 바꾸지 않거나 끝의 점을 허용합니다', () => {
  assert.equal(toKg('45.', 'LB'), '20.41');
  assert.equal(toKg('', 'LB'), '');
  assert.equal(toKg('abc', 'LB'), 'abc');
  assert.equal(displayWeight('', 'LB'), '');
});

test('다른 단위 참고값과 표기', () => {
  assert.equal(otherUnitHint('5', 'KG'), '= 11 lbs');
  assert.equal(otherUnitHint('20.41', 'LB'), '= 20.41 kg');
  assert.equal(otherUnitHint('', 'KG'), '');
  assert.equal(formatWeight('60', 'KG'), '60kg');
  assert.equal(formatWeight('20.41', 'LB'), '45lbs');
});

test('증감은 고른 단위로 하고 0~1500kg 안에 둡니다', () => {
  assert.equal(stepWeightIn('60', 5, 'KG'), '65');
  assert.equal(displayWeight(stepWeightIn(toKg('45', 'LB'), 5, 'LB'), 'LB'), '50');
  assert.equal(stepWeightIn('1', -5, 'LB'), '0');
  assert.equal(stepWeightIn('1499', 50, 'LB'), '1500');
});
