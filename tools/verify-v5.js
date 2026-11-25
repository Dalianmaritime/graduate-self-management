// v5 新功能专项验证：成就 / 连续打卡 / 鼓励语 / 空态 / 目标 / 心情关联 / 快捷键 / 待办筛选 / 拖拽 / 进度条
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const { buildSeed } = require('./seed.js');

const OUT = path.resolve(__dirname, '..', 'docs', 'screenshots');
const DIR = path.resolve(__dirname, '..');
const URL = 'http://127.0.0.1:8771/' + encodeURIComponent('研究生自我管理系统.html');
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
    srv.listen(8771, '127.0.0.1');
    const ch = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars',
        '--remote-debugging-port=9231', '--user-data-dir=/tmp/gssm_v5_' + Date.now(),
        '--window-size=1440,1000', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
    await sleep(3000);
    let tg;
    for (let i = 0; i < 40; i++) { try { const r = await fetch('http://127.0.0.1:9231/json/list');
        if (r.ok) { tg = (await r.json()).find(t => t.type === 'page'); break; } } catch (e) {} await sleep(400); }
    const ws = new WebSocket(tg.webSocketDebuggerUrl);
    await new Promise((a, b) => { ws.addEventListener('open', a); ws.addEventListener('error', b); });
    const c = new C(ws); const errs = [];
    ws.addEventListener('message', e => { const m = JSON.parse(e.data);
        if (m.method === 'Runtime.exceptionThrown') errs.push(JSON.stringify(m.params.exceptionDetails).slice(0, 200)); });
    await c.send('Runtime.enable'); await c.send('Page.enable');
    await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await sleep(600);
    await c.send('Page.navigate', { url: URL }); await sleep(3500);

    const seed = buildSeed();
    await c.ev('(()=>{const s=' + JSON.stringify(seed) + ';for(const[k,v]of Object.entries(s))localStorage.setItem(k,typeof v==="string"?v:JSON.stringify(v));localStorage.setItem("activeSection","checkin-section");return 1;})()');
    await c.send('Page.reload', { ignoreCache: false }); await sleep(4500);

    async function shot(name) {
        const m = await c.send('Page.getLayoutMetrics');
        const h = Math.min(Math.ceil(m.cssContentSize.height), 8000);
        await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: h, deviceScaleFactor: 1, mobile: false });
        await sleep(1600);
        const { data } = await c.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        fs.writeFileSync(path.join(OUT, name), Buffer.from(data, 'base64'));
        await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
        await sleep(600);
    }

    console.log('===== P0 反馈闭环 =====');
    // 连续打卡
    const streak = await c.ev('JSON.stringify(computeWorkStreak())');
    const st = JSON.parse(streak);
    ok('连续天数从 workData 反推', st.current > 0 && st.longest > 0, 'current=' + st.current + ' longest=' + st.longest);
    const streakPanel = await c.ev("document.getElementById('streak-panel').textContent.replace(/\\s+/g,' ').trim()");
    ok('连续面板已渲染', streakPanel.includes('连续') || streakPanel.includes('开始'), streakPanel.slice(0, 40));
    const cells = await c.ev("document.querySelectorAll('#streak-panel .streak-cell').length");
    ok('最近 7 天格子数 = 7', cells === 7, 'cells=' + cells);
    const onCells = await c.ev("document.querySelectorAll('#streak-panel .streak-cell.is-on').length");
    ok('有打卡的日子被点亮', onCells > 0, 'on=' + onCells);

    // 鼓励语
    const enc = await c.ev("document.getElementById('encourage-line').textContent.trim()");
    ok('鼓励语已渲染且含真实数据', enc.length > 5 && (enc.includes('专注') || enc.includes('开始')), enc.slice(0, 46));

    // 成就墙
    const wall = await c.ev("document.getElementById('achievement-wall').textContent.replace(/\\s+/g,' ').trim()");
    ok('成就墙已渲染', wall.includes('成就'), wall.slice(0, 30));
    const chips = await c.ev("document.querySelectorAll('#achievement-wall .ach-chip').length");
    ok('成就条目数 = 15', chips === 15, 'chips=' + chips);

    // 成就触发：手动解锁一条并检查弹窗
    await c.ev("achievementData.unlocked['first-work']={at:'x'};saveAchievements();renderAchievementWall();1");
    const unlockedChip = await c.ev("document.querySelectorAll('#achievement-wall .ach-chip.is-on').length");
    ok('已解锁成就显示为点亮态', unlockedChip >= 1, 'on=' + unlockedChip);
    await c.ev("showAchievementPopup({icon:'🌱',name:'测试成就',desc:'触发测试'});1");
    await sleep(400);
    const popup = await c.ev("document.querySelectorAll('#achievement-layer .achievement-card').length");
    ok('成就弹窗出现', popup === 1, 'cards=' + popup);
    await c.ev("document.querySelectorAll('#achievement-layer .achievement-card').forEach(e=>e.remove());1");

    // 空态
    await c.ev("window.__todoBackup = JSON.stringify(todoData);todoData.pending=[];todoData.completed=[];localStorage.setItem('todoData',JSON.stringify(todoData));renderTodoList();1");
    await sleep(300);
    const emptyState = await c.ev("document.querySelectorAll('#todo-pending .empty-state').length");
    ok('待办空态为插画式卡片', emptyState === 1, 'count=' + emptyState);
    const emptyBtn = await c.ev("!!document.querySelector('#todo-pending .empty-state button')");
    ok('空态带行动按钮', emptyBtn);
    // 恢复数据
    await c.ev("todoData=JSON.parse(window.__todoBackup);localStorage.setItem('todoData',JSON.stringify(todoData));renderTodoList();1");
    await sleep(300);

    console.log('===== P1 微交互 =====');
    const prog = await c.ev("!!document.getElementById('scroll-progress')");
    ok('滚动进度条存在', prog);
    const progTransform = await c.ev("document.getElementById('scroll-progress').style.transform");
    ok('进度条已初始化 transform', /scaleX/.test(progTransform), progTransform);
    await c.ev("document.getElementById('nav-stats').click();1"); await sleep(3000);
    const linkState = await c.ev("JSON.stringify({charts:chartLink.charts.length,work:!!(window.workChart&&window.workChart.__gssmLinked),fn:typeof registerChartForLink})");
    ok('图表已注册联动', JSON.parse(linkState).charts >= 1, linkState);
    const btnCss = await c.ev("!!document.querySelector('style#design-system')");
    ok('design-system 样式层存在', btnCss);

    console.log('===== P2 键盘与效率 =====');
    const toolbar = await c.ev("!!document.getElementById('todo-search')");
    ok('待办搜索框存在', toolbar);
    const prioBtns = await c.ev("document.querySelectorAll('[data-prio]').length");
    ok('优先级筛选芯片存在', prioBtns >= 4, 'chips=' + prioBtns);
    // 搜索过滤
    const total = await c.ev("todoData.pending.length");
    await c.ev("(()=>{const el=document.getElementById('todo-search');el.value='论文';el.dispatchEvent(new Event('input'));return 1;})()");
    await sleep(400);
    const filtered = await c.ev("document.querySelectorAll('#todo-pending [data-todo-id]').length");
    ok('搜索过滤生效', filtered < total, filtered + ' / ' + total);
    await c.ev("clearTodoFilters();1"); await sleep(300);
    const restored = await c.ev("document.querySelectorAll('#todo-pending [data-todo-id]').length");
    ok('清空筛选后恢复', restored === total, restored + ' / ' + total);
    // 优先级切换
    await c.ev("(()=>{const row=document.querySelector('#todo-pending [data-todo-id]');if(!row)return 0;const id=row.getAttribute('data-todo-id');cycleTodoPriority(Number(id));return 1;})()");
    await sleep(300);
    const prioVal = await c.ev("(()=>{const el=document.querySelector('#todo-pending [data-todo-id]');return el.querySelector('.prio-bar').className;})()");
    ok('优先级条渲染', /prio-(high|mid|low)/.test(prioVal), prioVal);
    // 拖拽属性
    const draggable = await c.ev("document.querySelectorAll('#todo-pending [data-todo-id][draggable=true]').length");
    ok('待办行可拖拽', draggable > 0, 'count=' + draggable);
    // 快捷键：? 打开面板
    await c.ev("document.dispatchEvent(new KeyboardEvent('keydown',{key:'?',bubbles:true}));1");
    await sleep(600);
    const scModal = await c.ev("document.getElementById('shortcut-modal').classList.contains('hidden')");
    ok('? 打开快捷键面板', scModal === false);
    const kbRows = await c.ev("document.querySelectorAll('#shortcut-list .kbd-row').length");
    ok('快捷键条目已列出', kbRows >= 8, 'rows=' + kbRows);
    await c.ev("closeModalEl('shortcut-modal');1"); await sleep(300);
    // 数字键切页
    await c.ev("document.dispatchEvent(new KeyboardEvent('keydown',{key:'3',bubbles:true}));1");
    await sleep(600);
    ok('数字键切到待办页', await c.ev("!document.getElementById('tasks-section').classList.contains('hidden')"));

    console.log('===== P3 洞察与目标 =====');
    await c.ev("document.getElementById('nav-stats').click();1");
    await sleep(1800);
    const goalInput = await c.ev("!!document.getElementById('goal-daily-hours')");
    ok('目标输入框存在', goalInput);
    await c.ev("(()=>{const d=document.getElementById('goal-daily-hours');d.value='6';d.dispatchEvent(new Event('change'));const w=document.getElementById('goal-weekly-hours');w.value='40';w.dispatchEvent(new Event('change'));return 1;})()");
    await sleep(900);
    const goalSaved = await c.ev("localStorage.getItem('goalSettings')");
    ok('目标已持久化', goalSaved && goalSaved.includes('dailyHours'), goalSaved);
    const goalText = await c.ev("document.getElementById('goal-progress-text').textContent");
    ok('目标进度文本已更新', goalText.includes('/'), goalText);
    // 目标线
    // 目标线：像素采样验证虚线真的画在 canvas 上
    const goalPixels = await c.ev(`(()=>{
      const cv = document.getElementById('work-duration-chart');
      const ctx = cv.getContext('2d');
      const y = Math.round(window.workChart.scales.y.getPixelForValue(goalSettings.dailyHours));
      const d = ctx.getImageData(0, y, cv.width, 1).data;
      let found = 0;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i+1], b = d[i+2];
        if (r > 190 && g > 100 && g < 190 && b < 90) found++;
      }
      return found;
    })()`);
    ok('图表已画出目标线（像素采样）', goalPixels > 20, 'orangePixels=' + goalPixels);
    const goalTxt2 = await c.ev("document.getElementById('goal-progress-text').textContent");
    ok('周目标进度显示 x / y', /\//.test(goalTxt2), goalTxt2);
    // 心情关联
    const meBody = await c.ev("document.getElementById('mood-efficiency-body').textContent.replace(/\\s+/g,' ').trim()");
    ok('心情×效率区块有内容', meBody.length > 10, meBody.slice(0, 56));
    const meSample = await c.ev("document.getElementById('mood-efficiency-sample').textContent");
    ok('显示样本量', meSample.length > 0, meSample);
    // 周回顾成果卡
    await c.ev("openWeeklyReview();1"); await sleep(900);
    const rc = await c.ev("document.querySelectorAll('#weekly-review-cards .review-card').length");
    ok('周回顾成果卡 = 5 张', rc === 5, 'cards=' + rc);
    await c.ev("closeModalEl('weekly-review-modal');1"); await sleep(300);

    console.log('===== 截图 =====');
    await c.ev("document.getElementById('nav-checkin').click();1"); await sleep(1400); await shot('v5_desktop_checkin.png');
    await c.ev("document.getElementById('nav-tasks').click();1"); await sleep(1400); await shot('v5_desktop_tasks.png');
    await c.ev("document.getElementById('nav-stats').click();1"); await sleep(1800); await shot('v5_desktop_stats.png');

    console.log('===== 控制台错误 =====', JSON.stringify(errs.filter(e => e.indexOf('vscode') === -1)));
    ch.kill(); srv.close(); process.exit(0);
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
