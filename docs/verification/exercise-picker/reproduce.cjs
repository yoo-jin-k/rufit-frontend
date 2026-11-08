/* global __dirname */

// PLAYWRIGHT_PATH와 PICKER_URL을 지정하면 수정 전·후 빌드에서 같은 실제 클릭 검사를 실행합니다.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const output = process.env.PICKER_OUTPUT || __dirname;
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const rows = [];
  try {
    await fs.mkdir(output, { recursive: true });
    for (const [width, height] of [[320, 300], [844, 260], [390, 844]]) {
      const page = await browser.newPage({ viewport: { width, height } });
      page.setDefaultTimeout(6000);
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      const button = name => page.getByRole('button', { name, exact: true });
      async function openPicker() {
        await button('＋ 종목 추가').click();
        await button('닫기').waitFor();
        await page.evaluate(() => Promise.all(document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))));
        await button('닫기').click({ trial: true });
        const close = await button('닫기').boundingBox();
        assert.equal(close.width, 48); assert.equal(close.height, 48);
        assert.ok(close.y >= 0 && close.y + close.height <= page.viewportSize().height);
      }
      await page.goto(process.env.PICKER_URL || 'http://127.0.0.1:8098');
      await button('자유 운동 시작').click();
      await openPicker();
      const search = page.getByRole('textbox', { name: '종목 이름 검색', exact: true });
      assert.equal(await page.getByTestId('exercise-result-count').textContent(), '검색 결과 110개');
      await page.screenshot({ path: path.join(output, `after-initial-${width}.png`) });
      await search.focus();
      await page.waitForFunction(el => getComputedStyle(el.parentElement).borderTopWidth === '2px', await search.elementHandle());
      await page.waitForTimeout(100);
      const focusStyle = await search.evaluate(el => ({outlineWidth: getComputedStyle(el).outlineWidth, outlineStyle: getComputedStyle(el).outlineStyle,
        borderWidth: getComputedStyle(el.parentElement).borderTopWidth, borderColor: getComputedStyle(el.parentElement).borderTopColor}));
      assert.equal(focusStyle.outlineWidth, '0px'); assert.equal(focusStyle.outlineStyle, 'solid'); assert.equal(focusStyle.borderWidth, '2px'); assert.equal(focusStyle.borderColor, 'rgb(36, 107, 83)');
      await page.evaluate(() => {
        const target = document.querySelector('[data-testid="exercise-result-announcement"]');
        window.__resultAnnouncements = [];
        new MutationObserver(() => { if (target.textContent) window.__resultAnnouncements.push(target.textContent); })
          .observe(target, {subtree: true, childList: true, characterData: true});
      });
      const initialRow = button('스쿼트, 하체, 바벨, 추가');
      await initialRow.scrollIntoViewIfNeeded();
      const mediaBox = await initialRow.locator('img').boundingBox();
      assert.equal(mediaBox.width, 64); assert.equal(mediaBox.height, 64);
      await search.fill('스'); await page.waitForTimeout(100); await search.fill('스쿼'); await page.waitForTimeout(100); await search.fill('스쿼트');
      await page.waitForTimeout(350);
      assert.equal(await page.getByTestId('exercise-result-count').textContent(), '검색 결과 6개');
      assert.deepEqual(await page.evaluate(() => window.__resultAnnouncements), ['검색 결과 6개']);
      const clear = button('검색어 지우기'); const clearBox = await clear.boundingBox();
      assert.equal(clearBox.width, 48); assert.equal(clearBox.height, 48);
      await page.screenshot({ path: path.join(output, `search-${width}.png`) });
      await button('스쿼트, 하체, 바벨, 추가').evaluate(el => { el.click(); el.click(); });
      const weight = page.getByRole('textbox', { name: '스쿼트 1세트 무게', exact: true });
      const reps = page.getByRole('textbox', { name: '스쿼트 1세트 횟수', exact: true });
      await weight.fill('0002'); await reps.fill('0020');
      await button('스쿼트 1세트 완료').click(); await button('일시정지').click();
      await page.getByText('기기에 저장됨', { exact: true }).first().waitFor();
      const raw = await page.evaluate(() => localStorage.getItem('rufit.local-workouts.v1'));
      await openPicker();
      await button('하체').click(); await button('장비 필터, 전체, 펼치기').click(); await button('바벨').click();
      await search.fill('스쿼트'); await page.waitForTimeout(350); await search.focus(); await page.waitForTimeout(100);
      await search.evaluate(el => el.setSelectionRange(1, 3));
      const handle = await search.elementHandle();
      await page.waitForTimeout(100);
      assert.equal(await handle.evaluate(el => el === document.activeElement), true, '크기 변경 전 검색 포커스');
      // 창을 줄이거나 회전해도 같은 입력 노드와 선택 범위·필터를 유지해야 합니다.
      for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 300 }, { width: 844, height: 260 }]) {
        await page.setViewportSize(viewport);
        await page.waitForTimeout(500);
        assert.equal(await handle.evaluate(el => el === document.activeElement), true, `검색 포커스 유지 ${viewport.width}x${viewport.height}`);
        assert.deepEqual(await search.evaluate(el => [el.selectionStart, el.selectionEnd]), [1, 3]);
        assert.equal(await search.inputValue(), '스쿼트');
        assert.equal(await button('장비 필터, 바벨, 접기').count(), 1);
        const resultCount = page.getByTestId('exercise-result-count');
        assert.equal(await resultCount.count(), 1);
        assert.equal(await resultCount.locator('..').getByText('하체 · 바벨', {exact: true}).count(), 1);
      }
      await button('조건 초기화').click();
      const first = button('스쿼트, 하체, 바벨, 추가됨');
      assert.equal(await first.isDisabled(), true);
      await first.scrollIntoViewIfNeeded();
      await page.waitForTimeout(350);
      const list = await first.evaluateHandle(el => {
        for (let parent = el.parentElement; parent; parent = parent.parentElement) {
          if (getComputedStyle(parent).overflowY === 'auto') return parent;
        }
        throw Error('스크롤 목록 없음');
      });
      const geometry = await list.evaluate(el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, scrollTop: el.scrollTop }; });
      assert.ok(geometry.height > 0);
      await page.screenshot({ path: path.join(output, `list-from-${width}-to-844.png`) });
      // 목록을 내린 상태에서도 고정 닫기 버튼을 실제로 누를 수 있어야 합니다.
      await button('닫기').click();
      assert.equal(await weight.inputValue(), '0002'); assert.equal(await reps.inputValue(), '0020');
      assert.equal(await page.evaluate(() => localStorage.getItem('rufit.local-workouts.v1')), raw);
      await openPicker(); await search.fill('없는종목테스트');
      await button('목록에 없는 종목 직접 입력').click();
      const custom = page.getByRole('textbox', { name: '직접 입력할 운동 이름', exact: true });
      await custom.fill('내 종목 01'); const customHandle = await custom.elementHandle();
      await page.setViewportSize({ width: 320, height: 300 });
      assert.equal(await customHandle.evaluate(el => el.isConnected), true);
      assert.equal(await custom.inputValue(), '내 종목 01');
      await button('직접 입력 취소').click();
      await page.evaluate(() => { window.open = () => { throw new Error('test link failure'); }; });
      await page.getByRole('link', { name: '사진 출처 보기', exact: true }).click();
      const alert = page.getByRole('alert').filter({ hasText: '출처 링크를 열지 못했어요' });
      await page.waitForFunction(() => { const el = document.querySelector('[role=alert]'); if (!el) return false; const r = el.getBoundingClientRect(); const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return r.top >= 0 && r.bottom < innerHeight && (hit === el || el.contains(hit)); });
      const alertBox = await alert.boundingBox();
      assert.ok(alertBox.y >= 0 && alertBox.y + alertBox.height <= 300);
      await page.screenshot({ path: path.join(output, `error-${width}.png`) });
      await button('닫기').click();
      assert.equal(await page.evaluate(() => localStorage.getItem('rufit.local-workouts.v1')), raw);
      await openPicker(); await search.fill('벤치프레스');
      await button('벤치프레스, 가슴, 바벨, 추가').click();
      assert.equal(await page.getByRole('textbox', { name: '벤치프레스 1세트 무게', exact: true }).count(), 1);
      assert.equal(await weight.inputValue(), '0002'); assert.equal(await reps.inputValue(), '0020');
      await page.setViewportSize({width: 320, height: 844});
      await openPicker(); await search.fill('바벨 인클라인 벤치 프레스');
      await button('바벨 인클라인 벤치 프레스, 가슴, 바벨, 동작 사진 없음, 추가').click();
      const expandedHeader = page.getByTestId('workout-exercise-header').last();
      const headerLayout = await expandedHeader.evaluate(el => ({width: el.getBoundingClientRect().width, flexDirection: getComputedStyle(el).flexDirection}));
      assert.ok(headerLayout.width < 300); assert.equal(headerLayout.flexDirection, 'column');
      await page.screenshot({ path: path.join(output, 'workout-card-320.png') });
      await page.setViewportSize({width, height});
      await openPicker(); await button('목록에 없는 종목 직접 입력').scrollIntoViewIfNeeded(); await button('목록에 없는 종목 직접 입력').click();
      await page.getByRole('textbox', { name: '직접 입력할 운동 이름', exact: true }).fill('내 종목 미디어');
      await button('이 이름으로 추가').click();
      await page.getByText('내 종목 미디어', {exact: true}).waitFor();
      assert.equal(await page.getByText('직접 입력', {exact: true}).count(), 1);
      await page.screenshot({ path: path.join(output, `fallback-${width}.png`) });
      assert.deepEqual(errors, []);
      rows.push({ width, height, geometryViewport: { width: 844, height: 260 }, geometry, catalog110: true, media64: true, clear48: true, focusOneBorder: true, stableResultAnnouncement: true, fallbackVisible: true, workoutHeaderStacked: true, initialLowHeightSelect: true, resizeInputCursorFiltersPreserved: true, wheelScroll: true, fixedClose: true, rawArchivePreservedOnClose: true, customInputPreserved: true, rapidDoubleSelectionOnce: true, linkFailureAutoRevealed: true, errors });
      await page.close();
    }
    const wheelPage = await browser.newPage({viewport: {width: 844, height: 260}});
    const wheelButton = name => wheelPage.getByRole('button', {name, exact: true});
    await wheelPage.goto(process.env.PICKER_URL || 'http://127.0.0.1:8098');
    await wheelButton('자유 운동 시작').click(); await wheelButton('＋ 종목 추가').click();
    const wheelRow = wheelButton('스쿼트, 하체, 바벨, 추가');
    const wheelList = await wheelRow.evaluateHandle(el => {for (let parent = el.parentElement; parent; parent = parent.parentElement) if (getComputedStyle(parent).overflowY === 'auto') return parent; throw Error('스크롤 목록 없음');});
    const wheelGeometry = await wheelList.evaluate(el => {const r = el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,scrollTop:el.scrollTop};});
    await wheelPage.mouse.move(wheelGeometry.x + wheelGeometry.width - 4, wheelGeometry.y + wheelGeometry.height / 2);
    await wheelPage.mouse.wheel(0, 1000); await wheelPage.waitForTimeout(200);
    assert.ok(await wheelList.evaluate(el => el.scrollTop) > wheelGeometry.scrollTop);
    await wheelPage.close();
    await fs.writeFile(path.join(output, 'results.json'), JSON.stringify({ rows, catalog110: true, wheelScroll: true, nativeKeyboardTested: false, forceClickUsed: false }, null, 2));
    console.log('ExercisePicker 실제 클릭·검색·스크롤·크기 변경·상태 보존 통과');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
