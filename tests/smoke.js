// 요리조리 프로토타입 스모크 테스트: Gemini 응답을 가짜로 바꿔서 앱 → 글라스 → 기록 흐름을 확인합니다.
// 실행: node tests/smoke.js  (Playwright 필요: npm i -D playwright && npx playwright install chromium)
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
  const p = await b.newPage({ viewport: { width: 412, height: 860 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('https://generativelanguage.googleapis.com/**', async r => {
    const q = JSON.parse(r.request().postData()).contents.at(-1).parts[0].text;
    const out = /매실/.test(q) ? { say: '설탕 1큰술이면 돼요.', card: null, actions: [{ type: 'substitute', from: '매실액', to: '설탕', amount: '1큰술' }] }
      : { say: '다음엔 덜 달게 제안할게요.', card: null, actions: [{ type: 'remember', note: '덜 달게' }] };
    await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(out) }] } }] }) });
  });
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('yrjr2_key', '"test"'); localStorage.setItem('yrjr2_tts', '"off"'); localStorage.setItem('yrjr2_jeyukOn', 'true'); localStorage.setItem('yrjr2_selected', '"jeyuk"'); });
  await p.reload();
  await p.click('#sendBtn'); await p.waitForTimeout(1500);
  const say = async t => { await p.fill('#textIn', t); await p.press('#textIn', 'Enter'); await p.waitForTimeout(t.includes('이거') ? 2000 : 600); };
  for (const t of ['시작', '손질 다 했어', '고추장 넣었어', '매실액 없는데 이거 써도 돼?', '완성', '다음엔 덜 달게']) await say(t);
  await p.evaluate(() => window.__yrjr.setRec(true, true));
  const r = await p.evaluate(() => ({ subs: window.__yrjr.S.subs.length, mem: window.__yrjr.D.memory.length, hist: window.__yrjr.D.history.length, rec: document.body.classList.contains('rec') }));
  console.log(r, errs.length ? errs : 'no errors');
  await b.close();
  if (errs.length || !r.subs || !r.mem || !r.hist || !r.rec) process.exit(1);
})();
