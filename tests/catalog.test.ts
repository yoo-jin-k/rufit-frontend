import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { exerciseCatalog, searchExercises } from '../src/features/exercises/catalog.ts';
import { addExercise, addSet, removeSet, startWorkout, updateSet } from '../src/features/workout/model.ts';
import { decodeArchive, emptyArchive, remember } from '../src/features/workout/storage.ts';

test('한글·영문·별칭 검색과 부위/도구 필터가 동시에 적용된다', () => {
  assert.deepEqual(searchExercises('스쿼트').map(e => e.name), ['스쿼트', '맨몸 스쿼트', '덤벨 스쿼트', '프론트 스쿼트']);
  assert.equal(searchExercises('  DUMBBELL SQUAT  ')[0].name, '덤벨 스쿼트');
  assert.equal(searchExercises('사레레')[0].name, '덤벨 사이드 레터럴 레이즈');
  assert.equal(searchExercises('스쿼트', 'LEGS', 'DUMBBELL')[0].name, '덤벨 스쿼트');
  assert.equal(searchExercises('스쿼트', 'CHEST').length, 0);
  assert.equal(searchExercises('스쿼트', 'LEGS', 'CABLE').length, 0);
  assert.equal(searchExercises('없는종목').length, 0);
  assert.equal(searchExercises('   ').length, exerciseCatalog.length);
  assert.ok(searchExercises('', 'SHOULDERS', 'DUMBBELL').every(e => e.equipment === 'DUMBBELL' && e.bodyPart === 'SHOULDERS'));
});
test('모든 목록 사진이 고정 출처와 일치하고 원본 바이트/종목 ID 중복이 없다', () => {
  const manifest = JSON.parse(readFileSync('assets/exercises/manifest.json', 'utf8'));
  assert.equal(manifest.exercises.length, exerciseCatalog.length);
  assert.equal(new Set(exerciseCatalog.map(e => e.id)).size, exerciseCatalog.length);
  for (const e of exerciseCatalog) {
    const source = manifest.exercises.find((m: {id: string}) => m.id === e.id);
    assert.deepEqual({name: source.name, bodyPart: source.bodyPart, equipment: source.equipment}, {name: e.name, bodyPart: e.bodyPart, equipment: e.equipment});
    assert.ok(source.sourceUrl.includes(`/${manifest.commit}/`));
    const bytes = readFileSync(`assets/exercises/${source.file}`);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), source.sha256);
    assert.equal(bytes.subarray(0, 2).toString('hex'), 'ffd8');
  }
});
test('종목 선택 → 1kg 2회 → 복제 → 삭제 → 재시작에도 사진 연결과 입력을 보존한다', () => {
  const squat = searchExercises('스쿼트')[0];
  let w = addExercise(startWorkout('w', 0), 'e', squat.name, squat.id);
  w = updateSet(w, 'e', 'e-1', {weight: '1', reps: '2'});
  w = addSet(w, 'e', 'e-2', 'e-1');
  w = removeSet(w, 'e', 'e-1');
  const loaded = decodeArchive(JSON.stringify(remember(emptyArchive(), w))).current!;
  assert.equal(loaded.exercises[0].catalogId, squat.id);
  assert.deepEqual(loaded.exercises[0].sets, [{id:'e-2',weight:'1',reps:'2',completed:false}]);
  const legacy = addExercise(startWorkout('old', 0), 'custom', '직접 입력');
  assert.deepEqual(decodeArchive(JSON.stringify(remember(emptyArchive(), legacy))).current, legacy);
  const invalid = {...w, exercises: [{...w.exercises[0], catalogId: 123}]};
  assert.throws(() => decodeArchive(JSON.stringify(remember(emptyArchive(), invalid as unknown as typeof w))));
});
