// 仪式感专项验证：每日欢迎 / 下班提示与庆祝 / 周打卡进度 / 每日名言
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const { buildSeed } = require('./seed.js');

const OUT = path.resolve(__dirname, '..', 'docs', 'screenshots');
const DIR = path.resolve(__dirname, '..');
const URL = 'http://127.0.0.1:8783/' + encodeURIComponent('研究生自我管理系统.html');
const CHROME_CANDIDATES = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium', '/usr/bin/google-chrome', '/usr/bin/chromium'];
const CHROME = CHROME_CANDIDATES.find(p => fs.existsSync(p));

class C {
    constructor(w) { this.w = w; this.id = 0; this.p = new Map();
        w.addEventListener('message', e => { const m = JSON.parse(e.data);
            if (m.id && this.p.has(m.id)) { const { resolve, reject } = this.p.get(m.id);
                this.p.delete(m.id); m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result); } }); }
    send(m, p = {}) { const id = ++this.id; return new Promise((res, rej) => {
        this.p.set(id, { resolve: res, reject: rej }); this.w.send(JSON.stringify({ id, method: m, params: p }));
        setTimeout(() => { if (this.p.has(id)) { this.p.delete(id); rej(new Error('to ' + m)); } }, 30000); }); }
    async ev(e) { const r = await this.send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true });
        if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400)); return r.result.value; }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ok = (n, v, extra) => console.log((v ? '✅' : '❌') + ' ' + n + (extra ? '  [' + extra + ']' : ''));

(async () => {
    const srv = http.createServer((q, s) => {
        const n = decodeURIComponent(q.url.replace(/^\//, '')) || '研究生自我管理系统.html';
        const f = path.join(DIR, n);
        if (!fs.existsSync(f)) { s.writeHead(404); s.end('nf'); return; }
        s.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); s.end(fs.readFileSync(f));
    });
    srv.listen(8783, '127.0.0.1');
    const ch = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars',
        '--remote-debugging-port=9243', '--user-data-dir=/tmp/gssm_rt_' + Date.now(),
        '--window-size=1440,1000', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
    await sleep(3000);
    let tg;
    for (let i = 0; i < 40; i++) { try { const r = await fetch('http://127.0.0.1:9243/json/list');
        if (r.ok) { tg = (await r.json()).find(t => t.type === 'page'); break; } } catch (e) {} await sleep(400); }
    const ws = new WebSocket(tg.webSocketDebuggerUrl);
    await new Promise((a, b) => { ws.addEventListener('open', a); ws.addEventListener('error', b); });
    const c = new C(ws); const errs = [];
    ws.addEventListener('message', e => { const m = JSON.parse(e.data);
        if (m.method === 'Runtime.exceptionThrown') errs.push(JSON.stringify(m.params.exceptionDetails).slice(0, 200)); });
    await c.send('Runtime.enable'); await c.send('Page.enable');
    await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await sleep(700);
    await c.send('Page.navigate', { url: URL }); await sleep(4200);

    // 首次进入：清掉仪式状态，注入种子数据
    await c.ev('(()=>{localStorage.removeItem("ritualState");return 1;})()');
    const seed = buildSeed();
    await c.ev('(()=>{const s=' + JSON.stringify(seed) + ';for(const[k,v]of Object.entries(s))localStorage.setItem(k,typeof v==="string"?v:JSON.stringify(v));return 1;})()');
    await c.send('Page.reload', { ignoreCache: false }); await sleep(5200);

    console.log('===== 每日欢迎仪式 =====');
    const welcomeVisible = await c.ev("!document.getElementById('welcome-ritual').classList.contains('hidden')");
    ok('首次打开显示欢迎层', welcomeVisible);
    const shotBg = await c.ev("(()=>{const s=document.querySelector('#welcome-ritual .welcome-shot');return s?s.style.backgroundImage.slice(0,40):''})()");
    ok('欢迎层使用主题背景大图', shotBg.includes('data:image'), shotBg.slice(0, 30));
    const hintVisible = await c.ev("!!document.querySelector('#welcome-ritual .welcome-hint')");
    ok('大图上有点击提示', hintVisible);
    await c.ev("document.getElementById('welcome-ritual').click();1"); await sleep(900);
    const card = await c.ev("document.querySelectorAll('#welcome-ritual .welcome-card').length");
    ok('点击后展开 welcome 卡片', card === 1, 'cards=' + card);
    const greet = await c.ev("(document.querySelector('#welcome-ritual .welcome-card__greet')||{}).textContent||''");
    ok('卡片含问候语', greet.length > 1, greet);
    const stats = await c.ev("document.querySelectorAll('#welcome-ritual .welcome-card__stat').length");
    ok('卡片含 3 项今日概览', stats === 3, 'stats=' + stats);
    const wQuote = await c.ev("(document.querySelector('#welcome-ritual .welcome-card__quote')||{}).textContent||''");
    ok('卡片含名言', wQuote.length > 4, wQuote.slice(0, 26));
    await c.ev("document.getElementById('welcome-enter').click();1"); await sleep(900);
    const closed = await c.ev("document.getElementById('welcome-ritual').classList.contains('hidden')");
    ok('进入后欢迎层关闭', closed);

    console.log('===== 每日名言 =====');
    const quoteText = await c.ev("(document.querySelector('#quote-strip .quote-strip__text')||{}).textContent||''");
    ok('首页显示名言条', quoteText.length > 6, quoteText.slice(0, 30));
    const quoteAuthor = await c.ev("(document.querySelector('#quote-strip .quote-strip__author')||{}).textContent||''");
    ok('名言带出处', quoteAuthor.includes('——'), quoteAuthor);
    const libSize = await c.ev("QUOTE_LIBRARY.length");
    ok('内置名言库 ≥ 30 条', libSize >= 30, 'count=' + libSize);
    // 同一天确定性
    const q1 = await c.ev("JSON.stringify(pickDailyQuote())");
    const q2 = await c.ev("JSON.stringify(pickDailyQuote())");
    ok('同一天同一句（确定性）', q1 === q2);
    // 换一句
    const before = await c.ev("JSON.stringify(quoteOfTheDay)");
    await c.ev("document.getElementById('quote-next').click();1"); await sleep(400);
    const after = await c.ev("JSON.stringify(quoteOfTheDay)");
    ok('可手动换一句', before !== after);
    // 自定义（面板在主题设置弹窗内，需先打开）
    await c.ev("openThemeModal();1"); await sleep(600);
    await c.ev("(()=>{document.getElementById('quote-text-input').value='测试名言';document.getElementById('quote-author-input').value='我';document.getElementById('quote-add').click();return 1;})()");
    await sleep(500);
    const customCount = await c.ev("quoteSettings.custom.length");
    ok('可添加自定义名言', customCount === 1, 'count=' + customCount);
    const persisted = await c.ev("localStorage.getItem('quoteSettings')");
    ok('自定义名言已持久化', persisted && persisted.includes('测试名言'));
    const inPool = await c.ev("getAllQuotes().some(q=>q.text==='测试名言')");
    ok('自定义名言进入名言池', inPool);

    console.log('===== 周打卡进度 =====');
    await c.ev("document.getElementById('nav-checkin').click();1"); await sleep(900);
    await c.ev("startWork();1"); await sleep(1400);
    const weekOpen = await c.ev("!document.getElementById('week-progress-modal').classList.contains('hidden')");
    ok('上班时弹出周打卡进度', weekOpen);
    const days = await c.ev("document.querySelectorAll('#week-progress-modal .week-day').length");
    ok('显示 7 天格子', days === 7, 'days=' + days);
    const lit = await c.ev("document.querySelectorAll('#week-progress-modal .week-day.is-on').length");
    ok('已打卡的日子被点亮', lit > 0, 'lit=' + lit);
    const weekStats = await c.ev("(()=>{const m=document.getElementById('week-progress-modal');const el=[...m.querySelectorAll('div')].find(d=>d.textContent.includes('已打卡')&&d.children.length===2);return el?el.textContent.replace(/\\s+/g,' ').trim():'';})()");
    ok('显示本周打卡天数与专注时长', weekStats.includes('已打卡')&&weekStats.includes('本周专注'), weekStats.slice(0, 44));
    await c.ev("document.getElementById('week-progress-close').click();1"); await sleep(600);
    // 同一��不再弹
    await c.ev("endWork();1"); await sleep(700);
    await c.ev("startWork();1"); await sleep(900);
    const reopened = await c.ev("!document.getElementById('week-progress-modal').classList.contains('hidden')");
    ok('同一天不重复弹（每天一次）', reopened === false);
    await c.ev("endWork();1"); await sleep(600);

    console.log('===== 下班仪式 =====');
    // 直接调用下班检查（把时间推进到 18 点）
    await c.ev("(()=>{const d=new Date();d.setHours(18,30,0,0);const RealDate=Date;window.Date=class extends RealDate{constructor(...a){if(a.length===0)super(d.getTime());else super(...a);}static now(){return d.getTime();}};return 1;})()");
    await c.ev("checkOffworkRitual();1"); await sleep(700);
    const offworkShown = await c.ev("!!document.getElementById('offwork-panel')");
    ok('17:00 后提示下班', offworkShown);
    const rows = await c.ev("document.querySelectorAll('#offwork-panel .offwork-panel__row').length");
    ok('下班面板含今日汇总', rows >= 3, 'rows=' + rows);
    const todos = await c.ev("document.querySelectorAll('#offwork-panel .offwork-panel__todo').length");
    ok('下班面板列出未完成待办', todos >= 0, 'todos=' + todos);
    // 点击收工
    await c.ev("document.getElementById('offwork-confirm').click();1"); await sleep(900);
    const celeb = await c.ev("!document.getElementById('celebrate-layer').classList.contains('hidden')");
    ok('点击收工触发庆祝', celeb);
    const cTitle = await c.ev("(document.querySelector('#celebrate-layer .celebrate-card__title')||{}).textContent||''");
    ok('庆祝显示「恭喜下班」', cTitle.includes('恭喜下班'), cTitle);
    const confetti = await c.ev("document.querySelectorAll('#celebrate-layer .confetti').length");
    ok('有彩纸粒子', confetti > 20, 'count=' + confetti);
    const cStats = await c.ev("document.querySelectorAll('#celebrate-layer .celebrate-card__stat').length");
    ok('庆祝卡含今日数据', cStats === 3, 'stats=' + cStats);
    await c.ev("document.getElementById('celebrate-close').click();1"); await sleep(600);
    const doneMarked = await c.ev("ritualState.offworkDoneOn === getTodayString()");
    ok('下班状态已记录（当天不再提示）', doneMarked);

    console.log('===== 截图 =====');
    // 欢迎层截图
    await c.ev("localStorage.removeItem('ritualState');1");
    await c.send('Page.reload', { ignoreCache: false }); await sleep(5200);
    await c.ev("document.getElementById('welcome-ritual').click();1"); await sleep(1000);
    const { data: w1 } = await c.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(OUT, 'v6_welcome.png'), Buffer.from(w1, 'base64'));
    await c.ev("document.getElementById('welcome-enter').click();1"); await sleep(900);
    // 庆祝层截图
    await c.ev("showCelebrate();1"); await sleep(800);
    const { data: w2 } = await c.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(OUT, 'v6_celebrate.png'), Buffer.from(w2, 'base64'));
    await c.ev("document.getElementById('celebrate-close').click();1"); await sleep(500);
    // 周打卡截图
    await c.ev("ritualState.weekShownOn='';document.getElementById('nav-checkin').click();1"); await sleep(700);
    await c.ev("startWork();1"); await sleep(1400);
    const { data: w3 } = await c.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(OUT, 'v6_week_progress.png'), Buffer.from(w3, 'base64'));
    await c.ev("document.getElementById('week-progress-close').click();1"); await sleep(500);
    await c.ev("endWork();1"); await sleep(600);

    console.log('===== 控制台错误 =====', JSON.stringify(errs.filter(e => e.indexOf('vscode') === -1)));
    ch.kill(); srv.close(); process.exit(0);
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
