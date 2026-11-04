import assert from 'node:assert/strict';
import test from 'node:test';
import {exerciseRowAccessibility, stackedExerciseItem} from '../src/features/exercises/exercisePickerView.ts';
import type {CatalogExercise} from '../src/features/exercises/catalog.ts';

const exercise: CatalogExercise = {id: 'test', name: '긴 운동 이름', bodyPart: 'SHOULDERS', equipment: 'DUMBBELL', recommendedRestSeconds: 90, aliases: []};

test('내부폭300 미만이나 글자2배에서 미디어를 위로 쌓는다', () => {
  assert.equal(stackedExerciseItem(299, 1), true);
  assert.equal(stackedExerciseItem(300, 1.3), false);
  assert.equal(stackedExerciseItem(400, 2), true);
});

test('운동 행은 분류·사진없음·추가 상태를 한 버튼 이름으로 전달한다', () => {
  assert.equal(exerciseRowAccessibility(exercise, false, true), '긴 운동 이름, 어깨, 덤벨, 동작 사진 없음, 추가');
  assert.equal(exerciseRowAccessibility(exercise, true, false), '긴 운동 이름, 어깨, 덤벨, 추가됨');
});
