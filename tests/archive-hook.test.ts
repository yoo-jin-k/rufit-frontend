import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setImmediate as turn} from 'node:timers/promises';
import {JSDOM, VirtualConsole} from 'jsdom';
import {act, createElement, StrictMode} from 'react';
import {useLocalWorkoutArchive} from '../src/features/workout/useLocalWorkoutArchive.ts';
import {createWorkoutStorage, emptyArchive, remember} from '../src/features/workout/storage.ts';
import {startWorkout, addExercise, updateSet, pauseWorkout} from '../src/features/workout/model.ts';
import type {ArchivePersistence} from '../src/features/workout/archiveState.ts';

function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => {resolve = yes; reject = no;});
  return {promise, resolve, reject};
}
async function harness(storage: ArchivePersistence, strict = false) {
  const errors: Error[] = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error));
  const dom = new JSDOM('<div id="root"></div>', {url: 'http://localhost', virtualConsole});
  Object.assign(globalThis, {window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true});
  // React DOM은 실제 DOM 환경을 만든 뒤 로드해야 입력 이벤트 지원을 올바르게 감지한다.
  const {createRoot} = await import('react-dom/client');
  let latest!: ReturnType<typeof useLocalWorkoutArchive>;
  let renders = 0;
  function Probe({nonce}: {nonce: number}) {
    latest = useLocalWorkoutArchive(storage, () => 1000); renders++;
    return createElement('input', {value: latest.workout?.id ?? '', readOnly: true, 'data-nonce': nonce});
  }
  const root = createRoot(dom.window.document.getElementById('root')!);
  const render = async (nonce = 0) => {await act(async () => {
    root.render(strict ? createElement(StrictMode, null, createElement(Probe, {nonce})) : createElement(Probe, {nonce}));
    await turn();
  });};
  await render();
  return {dom, render, value: () => latest, renders: () => renders,
    unmount: async () => {await act(async () => root.unmount());}, close: () => {dom.window.close(); assert.deepEqual(errors, []);}};
}

test('SS01/11 실제 StrictMode 훅은 초기 읽기를 공유하고 effect 재실행 뒤 한번만 복구한다', async () => {
  const gate = deferred<ReturnType<typeof emptyArchive>>(); let reads = 0, writes = 0;
  const h = await harness({load: () => {reads++; return gate.promise;}, save: async () => {writes++;}}, true);
  try {
    assert.equal(reads, 1); assert.equal(h.value().ready, false);
    await act(async () => {h.value().setWorkout(startWorkout('blocked', 0));}); assert.equal(writes, 0);
    let a!: Promise<void>, b!: Promise<void>;
    await act(async () => {a = h.value().retry(); b = h.value().retry();});
    assert.equal(a, b); assert.equal(reads, 1);
    await act(async () => {gate.resolve(remember(emptyArchive(), startWorkout('restored', 0))); await a;});
    assert.equal(h.value().workout!.id, 'restored'); assert.equal(h.value().retryPending, false);
  } finally {await h.unmount(); h.close();}
});

test('SS10 실제 훅 재렌더에서 입력·정지·휴식·포커스가 유지되고 저장이 늘지 않는다', async () => {
  let raw: string | null = null, writes = 0;
  const h = await harness(createWorkoutStorage({getItem: async () => raw, setItem: async (_, value) => {writes++; raw = value;}}));
  try {
    await act(async () => {
      h.value().setWorkout(updateSet(addExercise(startWorkout('w', 0), 'e', '스쿼트'), 'e', 'e-1', {weight: '1', reps: '2'}));
      h.value().completeSet('e', 'e-1', true); h.value().setWorkout(w => pauseWorkout(w!, 500)); h.value().adjustRest(10); await turn();
    });
    const workout = h.value().workout, rest = h.value().rest, stored = raw, count = writes;
    const input = h.dom.window.document.querySelector('input')!; input.focus();
    for (let i = 1; i <= 3; i++) await h.render(i);
    assert.equal(h.value().workout, workout); assert.equal(h.value().rest, rest);
    assert.equal(raw, stored); assert.equal(writes, count); assert.equal(h.dom.window.document.activeElement, input);
    assert.equal(workout!.pausedAt, 500); assert.equal(workout!.exercises[0].sets[0].weight, '1');
  } finally {await h.unmount(); h.close();}
});

test('SS04~08 실제 훅에서 재시도 중 편집과 이전 저장 완료를 분리한다', async () => {
  const writes: ReturnType<typeof deferred<void>>[] = [];
  const h = await harness({load: async () => emptyArchive(), save: () => {const gate = deferred<void>(); writes.push(gate); return gate.promise;}});
  try {
    await act(async () => {h.value().setWorkout(startWorkout('old', 0)); await turn(); writes[0].reject(new Error('disk full')); await turn();});
    assert.equal(h.value().failed, true);
    let retry!: Promise<void>;
    await act(async () => {retry = h.value().retry(); assert.equal(h.value().retry(), retry); await turn();});
    assert.equal(h.value().retryPending, true); assert.equal(h.value().unsavedAfterFailure, true);
    await act(async () => {h.value().setWorkout(startWorkout('new', 1)); await turn(); writes[1].resolve(); await retry;});
    assert.equal(h.value().state, 'saving'); assert.equal(h.value().failed, true); assert.equal(h.value().workout!.id, 'new');
    await act(async () => {writes[2].resolve(); await turn();});
    assert.equal(h.value().state, 'saved'); assert.equal(h.value().unsavedAfterFailure, false);
  } finally {await h.unmount(); h.close();}
});

test('SS11 실제 훅 해제 뒤 늦은 읽기는 재렌더하거나 다음 마운트 입력을 바꾸지 않는다', async () => {
  const first = deferred<ReturnType<typeof emptyArchive>>(); let reads = 0;
  const storage = {load: () => ++reads === 1 ? first.promise : Promise.resolve(remember(emptyArchive(), startWorkout('new', 10))), save: async () => {}};
  const old = await harness(storage); await old.unmount(); const count = old.renders();
  const fresh = await harness(storage);
  try {
    await act(async () => {first.resolve(remember(emptyArchive(), startWorkout('old', 0))); await turn();});
    assert.equal(old.renders(), count); assert.equal(fresh.value().workout!.id, 'new');
    assert.equal(old.value().ready, false);
  } finally {await fresh.unmount(); fresh.close(); old.close();}
});
