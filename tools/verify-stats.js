const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const { buildSeed } = require('./seed.js');

const OUT = path.resolve(__dirname, '..', 'docs', 'screenshots');
const PROJECT_DIR = path.resolve(__dirname, '..');
const PAGE_URL = 'http://127.0.0.1:8766/' + encodeURIComponent('研究生自我管理系统.html');
const CHROME_CANDIDATES = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium', '/usr/bin/google-chrome', '/usr/bin/chromium'];
const CHROME = CHROME_CANDIDATES.find(p => fs.existsSync(p));
if (!CHROME) { console.error('未找到 Chrome/Chromium，请先安装'); process.exit(1); }

class CDP {
    constructor(ws) {
        this.ws = ws;
        this.id = 0;
        this.pending = new Map();
        ws.addEventListener('message', (ev) => {
            const msg = JSON.parse(ev.data);
            if (msg.id && this.pending.has(msg.id)) {
                const { resolve, reject } = this.pending.get(msg.id);
                this.pending.delete(msg.id);
                msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
            }
        });
    }
    send(method, params = {}) {
        const id = ++this.id;
        return new Promise((resolve, reject) => {
            this.pending.set(id, { resolve, reject });
            this.ws.send(JSON.stringify({ id, method, params }));
            setTimeout(() => {
                if (this.pending.has(id)) {
                    this.pending.delete(id);
                    reject(new Error('timeout: ' + method));
                }
            }, 30000);
        });
    }
    async eval(expression) {
        const r = await this.send('Runtime.evaluate', {
            expression,
            returnByValue: true,
            awaitPromise: true
        });
        if (r.exceptionDetails) {
            throw new Error('eval error: ' + JSON.stringify(r.exceptionDetails).slice(0, 500));
        }
        return r.result.value;
    }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchJson(url, tries = 40) {
    for (let i = 0; i < tries; i++) {
        try {
            const res = await fetch(url);
            if (res.ok) return await res.json();
        } catch (e) { /* retry */ }
        await sleep(500);
    }
    throw new Error('cannot reach ' + url);
}

function startHttp(port) {
    const server = http.createServer((req, res) => {
        const name = decodeURIComponent(req.url.replace(/^\//, '')) || '研究生自我管理系统.html';
        const file = path.join(PROJECT_DIR, name);
        if (!fs.existsSync(file)) { res.writeHead(404); res.end('nope'); return; }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(fs.readFileSync(file));
    });
    server.listen(port, '127.0.0.1');
    return server;
}

function startChrome(port) {
    return spawn(CHROME, [
        '--headless=new', '--disable-gpu', '--hide-scrollbars',
        '--remote-debugging-port=' + port,
        '--user-data-dir=/tmp/gssm_v_' + Date.now(),
        '--window-size=1440,1000', '--no-first-run', '--no-default-browser-check',
        'about:blank'
    ], { stdio: 'ignore', detached: false });
}

// ---------- 独立复算：不经页面逻辑，直接从种子数据算期望值 ----------
function dayKey(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function expectedFor(seed, period) {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dates = [];
    if (period === 'week') {
        const s = new Date(end); s.setDate(s.getDate() - 6);
        for (let i = 0; i < 7; i++) { const d = new Date(s); d.setDate(s.getDate() + i); dates.push(dayKey(d)); }
    } else if (period === 'month') {
        const s = new Date(end); s.setDate(s.getDate() - 29);
        for (let i = 0; i < 30; i++) { const d = new Date(s); d.setDate(s.getDate() + i); dates.push(dayKey(d)); }
    } else {
        const s = new Date(end); s.setMonth(s.getMonth() - 11);
        const cursor = new Date(s.getFullYear(), s.getMonth(), 1);
        for (let i = 0; i < 12; i++) {
            const y = cursor.getFullYear(), m = cursor.getMonth();
            const last = (y === now.getFullYear() && m === now.getMonth()) ? now.getDate() : new Date(y, m + 1, 0).getDate();
            for (let d = 1; d <= last; d++) dates.push(y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0'));
            cursor.setMonth(cursor.getMonth() + 1);
        }
    }
    const set = new Set(dates);
    let work = 0, rest = 0, coffee = 0, caffeine = 0, water = 0, exCount = 0, exCal = 0;
    Object.keys(seed.workData.records).forEach(k => {
        if (!set.has(k)) return;
        const day = seed.workData.records[k];
        day.workSessions.forEach(s => { work += s.duration || 0; });
        day.restSessions.forEach(s => { rest += s.duration || 0; });
    });
    Object.keys(seed.exerciseData.records).forEach(k => {
        if (!set.has(k)) return;
        seed.exerciseData.records[k].forEach(i => { exCount++; exCal += i.calories || 0; });
    });
    dates.forEach(k => {
        const c = seed.intakeData.coffee.records[k];
        if (c) { coffee += c.count; caffeine += c.caffeine; }
        const w = seed.intakeData.water.records[k];
        if (w) water += w.count;
    });
    return {
        work: (work / 60).toFixed(1),
        rest: (rest / 60).toFixed(1),
        coffee: String(coffee),
        caffeine: String(caffeine),
        water: String(Math.round(water)),
        exCount: String(exCount),
        exCal: String(exCal)
    };
}

(async () => {
    const server = startHttp(8766);
    const chrome = startChrome(9224);
    await sleep(3000);
    const targets = await fetchJson('http://127.0.0.1:9224/json/list');
    const page = targets.find(t => t.type === 'page');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
    const cdp = new CDP(ws);

    const errors = [];
    ws.addEventListener('message', (ev) => {
        const m = JSON.parse(ev.data);
        if (m.method === 'Runtime.exceptionThrown') errors.push(JSON.stringify(m.params.exceptionDetails).slice(0, 200));
        if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
            errors.push(m.params.args.map(a => a.value || a.description).join(' ').slice(0, 200));
        }
    });

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Page.navigate', { url: PAGE_URL });
    await sleep(3500);

    const seed = buildSeed();
    await cdp.eval(
        '(() => {const s=' + JSON.stringify(seed) +
        ';for(const[k,v]of Object.entries(s))localStorage.setItem(k,typeof v==="string"?v:JSON.stringify(v));' +
        "localStorage.setItem('activeSection','stats-section');return 1;})()"
    );
    await cdp.send('Page.reload', { ignoreCache: false });
    await sleep(4500);

    const readTiles = () => cdp.eval(
        'JSON.stringify({' +
        "range:(document.getElementById('stats-summary-range')||{}).textContent," +
        "work:document.getElementById('total-work-hours').textContent," +
        "rest:document.getElementById('total-rest-hours').textContent," +
        "coffee:document.getElementById('total-coffee').textContent," +
        "caffeine:document.getElementById('total-caffeine').textContent," +
        "water:document.getElementById('total-water').textContent," +
        "exCount:document.getElementById('total-exercise-count').textContent," +
        "exCal:document.getElementById('total-exercise-calories').textContent" +
        '})'
    );

    const results = [];
    for (const period of ['week', 'month', 'year']) {
        await cdp.eval(
            "document.querySelector('.stats-period-btn[data-period=\\'" + period + "\\']').click(); 1"
        );
        await sleep(1200);
        const got = JSON.parse(await readTiles());
        const want = expectedFor(seed, period);
        const keys = ['work', 'rest', 'coffee', 'caffeine', 'water', 'exCount', 'exCal'];
        const diffs = keys.filter(k => String(got[k]) !== String(want[k]));
        results.push({ period, range: got.range, got, want, pass: diffs.length === 0, diffs });
    }

    console.log('===== 统计口径回归 =====');
    results.forEach(r => {
        console.log(
            (r.pass ? '✅' : '❌') + ' ' + r.period.padEnd(6) +
            ' | ' + String(r.range).padEnd(28) +
            ' work=' + r.got.work + '/' + r.want.work +
            ' rest=' + r.got.rest + '/' + r.want.rest +
            ' coffee=' + r.got.coffee + '/' + r.want.coffee +
            ' water=' + r.got.water + '/' + r.want.water +
            ' ex=' + r.got.exCount + '/' + r.want.exCount +
            (r.pass ? '' : '  ← 不一致: ' + r.diffs.join(','))
        );
    });

    // 断词修复验证
    await cdp.eval("document.getElementById('nav-research').click(); 1");
    await sleep(1200);
    const wrapCheck = await cdp.eval(
        '(() => {' +
        'const els=[...document.querySelectorAll("#research-board-panel .break-words")];' +
        'const bad=els.filter(e=>{const t=e.textContent||"";return /[A-Za-z]{2,}$/.test("")||false;});' +
        'const title=[...document.querySelectorAll("#research-board-panel div")].find(d=>(d.textContent||"").indexOf("H4-BP")===0);' +
        'return JSON.stringify({' +
        'breakWordsCount:document.querySelectorAll("#research-board-panel .break-words").length,' +
        'breakAllCount:document.querySelectorAll("#research-board-panel .break-all").length,' +
        'titleHeight:title?title.getBoundingClientRect().height:null' +
        '});' +
        '})()'
    );
    console.log('===== 断词类 =====', wrapCheck);

    // 摄入记录转义验证
    await cdp.eval("document.getElementById('nav-body').click(); 1");
    await sleep(1200);
    const intakeText = await cdp.eval(
        "(document.getElementById('today-intake-records')||{}).textContent||''"
    );
    console.log('===== 摄入记录 =====');
    console.log('  含 undefined:', intakeText.indexOf('undefined') !== -1);
    console.log('  样例:', intakeText.replace(/\s+/g, ' ').trim().slice(0, 120));

    console.log('===== 控制台错误 =====', JSON.stringify(errors.filter(e => e.indexOf('vscode') === -1)));

    chrome.kill();
    server.close();
    process.exit(0);
})().catch(e => { console.error('FAILED', e); process.exit(1); });
