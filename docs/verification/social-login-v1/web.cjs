/* global __dirname */
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({channel: 'chrome', headless: true});
  const page = await browser.newPage({viewport: {width: 390, height: 844}});
  const errors = []; const authRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (request.url().includes('/api/v1/auth')) authRequests.push(request.url()); });
  try {
    await page.goto('http://127.0.0.1:8100');
    const button = name => page.getByRole('button', {name, exact: true});
    await button('자유 운동 시작').click(); await button('＋ 종목 추가').click();
    await button('스쿼트, 하체, 바벨, 추가').click();
    const weight = page.getByRole('textbox', {name: '스쿼트 1세트 무게', exact: true});
    const reps = page.getByRole('textbox', {name: '스쿼트 1세트 횟수', exact: true});
    await weight.fill('0002'); await reps.fill('0020'); await button('스쿼트 1세트 완료').click(); await button('일시정지').click();
    await page.getByText('기기에 저장됨', {exact: true}).first().waitFor();
    const raw = await page.evaluate(() => localStorage.getItem('rufit.local-workouts.v1'));
    const weightHandle = await weight.elementHandle();
    const rows = [];
    for (const [width, height] of [[320, 300], [390, 844], [430, 932], [768, 700]]) {
      await page.setViewportSize({width, height});
      const entry = button('로그인 화면 열기');
      await entry.scrollIntoViewIfNeeded();
      const entryBox = await entry.boundingBox(); assert.ok(entryBox.width >= 48 && entryBox.height >= 48);
      await entry.click();
      await page.getByText('로그인은 모바일 앱에서 이용할 수 있어요.', {exact: true}).waitFor();
      assert.equal(await page.getByRole('button', {name: /카카오|Google/}).count(), 0);
      await page.getByRole('button', {name: '운동 기록으로 돌아가기', exact: true}).first().scrollIntoViewIfNeeded();
      const logo = page.getByRole('img', {name: '루핏', exact: true});
      const logoBox = await logo.boundingBox(); assert.ok(Math.abs(logoBox.width / logoBox.height - 160 / 57) < 0.05);
      const back = page.getByRole('button', {name: '운동 기록으로 돌아가기', exact: true}).last(); await back.scrollIntoViewIfNeeded();
      const backBox = await back.boundingBox(); assert.ok(backBox.y >= 0 && backBox.y + backBox.height <= height + 1);
      await page.screenshot({path: path.join(__dirname, `web-${width}x${height}.png`), fullPage: false});
      await back.click();
      assert.equal(await weightHandle.evaluate(element => element.isConnected), true);
      assert.equal(await weight.inputValue(), '0002'); assert.equal(await reps.inputValue(), '0020');
      assert.equal(await page.evaluate(() => localStorage.getItem('rufit.local-workouts.v1')), raw);
      rows.push({width, height, entry: entryBox, logo: logoBox, returnButton: backBox, providerActions: 0, workoutDomPreserved: true});
    }
    assert.deepEqual(authRequests, []); assert.deepEqual(errors, []);
    await fs.writeFile(path.join(__dirname, 'web-results.json'), JSON.stringify({rows, authRequests, errors, originalWorkoutPreserved: true}, null, 2));
    console.log('웹 모바일 전용 안내·저높이 복귀·운동 원문/DOM 보존 통과');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
