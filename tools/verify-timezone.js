// 时区专项验证：模拟 UTC 窗口内的本地时刻，确认「今天」用系统本地时区
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const DIR = path.resolve(__dirname, '..');
const URL = 'http://127.0.0.1:8785/' + encodeURIComponent('研究生自我管理系统.html');
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

// 在页面内 mock 一个指定的本地时刻
const mockTime = (y, m, d, hh, mm) => `
(() => {
  const RealDate = Date;
  const fixed = new RealDate(${y}, ${m - 1}, ${d}, ${hh}, ${mm}, 0, 0);
  function FakeDate(...args) {
    if (args.length === 0) return new RealDate(fixed.getTime());
    return new RealDate(...args);
  }
  FakeDate.prototype = RealDate.prototype;
  FakeDate.now = () => fixed.getTime();
  FakeDate.parse = RealDate.parse;
  FakeDate.UTC = RealDate.UTC;
  window.Date = FakeDate;
  return 1;
})()`;

(async () => {
    const srv = http.createServer((q, s) => {
        const n = decodeURIComponent(q.url.replace(/^\//, '')) || '研究生自我管理系统.html';
        const f = path.join(DIR, n);
        if (!fs.existsSync(f)) { s.writeHead(404); s.end('nf'); return; }
        s.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); s.end(fs.readFileSync(f));
    });
    srv.listen(8785, '127.0.0.1');
    const ch = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars',
        '--remote-debugging-port=9265', '--user-data-dir=/tmp/gssm_tz_' + Date.now(),
        '--window-size=1440,1000', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
    await sleep(3000);
    let tg;
    for (let i = 0; i < 40; i++) { try { const r = await fetch('http://127.0.0.1:9265/json/list');
        if (r.ok) { tg = (await r.json()).find(t => t.type === 'page'); break; } } catch (e) {} await sleep(400); }
    const ws = new WebSocket(tg.webSocketDebuggerUrl);
    await new Promise((a, b) => { ws.addEventListener('open', a); ws.addEventListener('error', b); });
    const c = new C(ws); const errs = [];
    ws.addEventListener('message', e => { const m = JSON.parse(e.data);
        if (m.method === 'Runtime.exceptionThrown') errs.push(JSON.stringify(m.params.exceptionDetails).slice(0, 200)); });
    await c.send('Runtime.enable'); await c.send('Page.enable');
    await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await sleep(700);
    await c.send('Page.navigate', { url: URL }); await sleep(4500);

    console.log('===== 时区一致性 =====');
    // 1) 当前时刻：getTodayString 应等于本地日期
    const nowCheck = await c.ev(`(()=>{
      const local = formatDateKey(new Date());
      return JSON.stringify({ today: getTodayString(), local, equal: getTodayString()===local });
    })()`);
    const nc = JSON.parse(nowCheck);
    ok('getTodayString() 等于本地日期', nc.equal, nc.today + ' vs ' + nc.local);

    // 2) 关键：mock 本地凌晨 03:00（东八区 → UTC 前一天 19:00）
    //    旧实现 toISOString() 会返回前一天；新实现应返回当天
    for (const [label, y, m, d, hh, mm] of [
        ['本地 00:30', 2026, 11, 26, 0, 30],
        ['本地 03:00', 2026, 11, 26, 3, 0],
        ['本地 07:59', 2026, 11, 26, 7, 59],
        ['本地 08:00', 2026, 11, 26, 8, 0],
        ['本地 23:00', 2026, 11, 26, 23, 0]
    ]) {
        await c.ev(mockTime(y, m, d, hh, mm));
        const r = await c.ev(`(()=>{
          const local = formatDateKey(new Date());
          const utc = new Date().toISOString().split('T')[0];
          return JSON.stringify({ today: getTodayString(), local, utc, match: getTodayString()===local });
        })()`);
        const p = JSON.parse(r);
        const diverged = p.utc !== p.local;
        ok(label + ' → 今天 = ' + p.today, p.match, diverged ? ('UTC 会给 ' + p.utc + '（已规避）') : 'UTC 与本地一致');
    }

    // 3) 写入与读取一致：mock 凌晨记录一段工作，统计能查到
    await c.ev(mockTime(2026, 11, 26, 3, 0));
    await c.ev(`(()=>{
      localStorage.clear();
      workData = { records: {} };
      const today = getTodayString();
      workData.records[today] = { workSessions: [{ startTime:'02:30', startTimestamp: Date.now()-1800000, endTime:'03:00', endTimestamp: Date.now(), duration: 30, projectId:'', note:'' }], restSessions: [] };
      saveData();
      updateStatisticsCharts('week');
      return 1;
    })()`);
    await sleep(1600);
    const statRead = await c.ev(`(()=>{
      const dates = getStatsRangeDates('week');
      const inRange = new Set(dates);
      const today = getTodayString();
      let total = 0;
      Object.keys(workData.records).forEach(k=>{ if(!inRange.has(k))return;
        (workData.records[k].workSessions||[]).forEach(s=>{ total += s.duration||0; }); });
      const summaryEl = document.getElementById('total-work-hours');
      return JSON.stringify({ today, inRange: inRange.has(today), totalMinutes: total, summary: summaryEl?summaryEl.textContent:'?' });
    })()`);
    const sr = JSON.parse(statRead);
    ok('凌晨记录写入当天键', sr.today === '2026-11-26', sr.today);
    ok('该记录落在统计区间内', sr.inRange);
    ok('统计能查到刚记的 30 分钟', sr.totalMinutes === 30, sr.totalMinutes + ' 分钟，汇总卡 ' + sr.summary + ' 小时');

    // 4) 反思「昨天」与「今天」不混淆
    const refCheck = await c.ev(`(()=>{
      const today = getTodayString();
      const y = new Date(); y.setDate(y.getDate()-1);
      const yesterday = formatDateKey(y);
      return JSON.stringify({ today, yesterday, differ: today!==yesterday });
    })()`);
    const rc = JSON.parse(refCheck);
    ok('凌晨时「今天」与「昨天」不同', rc.differ, rc.today + ' vs ' + rc.yesterday);

    console.log('===== 控制台错误 =====', JSON.stringify(errs.filter(e => e.indexOf('vscode') === -1)));
    ch.kill(); srv.close(); process.exit(0);
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
