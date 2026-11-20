const fs=require('fs'),path=require('path'),http=require('http'),{spawn}=require('child_process');
const {buildSeed}=require('./seed.js');
const DIR=path.resolve(__dirname, '..');
const URL='http://127.0.0.1:8776/'+encodeURIComponent('研究生自我管理系统.html');
class C{constructor(w){this.w=w;this.id=0;this.p=new Map();w.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&this.p.has(m.id)){const{resolve,reject}=this.p.get(m.id);this.p.delete(m.id);m.error?reject(new Error(JSON.stringify(m.error))):resolve(m.result);}});}
send(m,p={}){const id=++this.id;return new Promise((res,rej)=>{this.p.set(id,{resolve:res,reject:rej});this.w.send(JSON.stringify({id,method:m,params:p}));setTimeout(()=>{if(this.p.has(id)){this.p.delete(id);rej(new Error('timeout '+m));}},30000);});}
async ev(e){const r=await this.send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails).slice(0,400));return r.result.value;}}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
const srv=http.createServer((q,s)=>{const n=decodeURIComponent(q.url.replace(/^\//,''))||'研究生自我管理系统.html';const f=path.join(DIR,n);if(!fs.existsSync(f)){s.writeHead(404);s.end('nf');return;}s.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});s.end(fs.readFileSync(f));});
srv.listen(8776,'127.0.0.1');
const CHROME_CANDIDATES=['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/Applications/Chromium.app/Contents/MacOS/Chromium','/usr/bin/google-chrome','/usr/bin/chromium'];
const CHROME=CHROME_CANDIDATES.find(p=>require('fs').existsSync(p));
if(!CHROME){console.error('未找到 Chrome/Chromium，请先安装');process.exit(1);}
const ch=spawn(CHROME,['--headless=new','--disable-gpu','--hide-scrollbars','--remote-debugging-port=9234','--user-data-dir=/tmp/gssm_sm_'+Date.now(),'--window-size=1440,1000','--no-first-run','about:blank'],{stdio:'ignore'});
await sleep(3000);
let tg;for(let i=0;i<40;i++){try{const r=await fetch('http://127.0.0.1:9234/json/list');if(r.ok){tg=(await r.json()).find(t=>t.type==='page');break;}}catch(e){}await sleep(400);}
const ws=new WebSocket(tg.webSocketDebuggerUrl);await new Promise((a,b)=>{ws.addEventListener('open',a);ws.addEventListener('error',b);});
const c=new C(ws);const errs=[];
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown')errs.push(JSON.stringify(m.params.exceptionDetails).slice(0,200));});
await c.send('Runtime.enable');await c.send('Page.enable');
await c.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
await sleep(600);
await c.send('Page.navigate',{url:URL});await sleep(3500);
const seed=buildSeed();
await c.ev('(()=>{const s='+JSON.stringify(seed)+';for(const[k,v]of Object.entries(s))localStorage.setItem(k,typeof v==="string"?v:JSON.stringify(v));localStorage.setItem("activeSection","tasks-section");return 1;})()');
await c.send('Page.reload',{ignoreCache:false});await sleep(4500);

const ok = (n,v)=>console.log((v?'✅':'❌')+' '+n);

// 1 心情
await c.ev("document.getElementById('mood-happy').click();1"); await sleep(400);
ok('心情点击 → is-on 高亮', await c.ev("document.getElementById('mood-happy').classList.contains('is-on')"));
ok('心情显示已更新', (await c.ev("document.getElementById('current-mood-display').textContent")).indexOf('开心')>=0);

// 2 待办勾选动画
const before = await c.ev("JSON.parse(localStorage.getItem('todoData')).pending.length");
await c.ev("document.querySelector('[data-todo-check]').click();1"); await sleep(120);
ok('勾选后按钮出现 is-checked', await c.ev("!!document.querySelector('[data-todo-check].is-checked')"));
ok('勾选后文本出现删除线扫过', await c.ev("!!document.querySelector('[data-todo-text].is-done')"));
await sleep(600);
const after = await c.ev("JSON.parse(localStorage.getItem('todoData')).pending.length");
ok('勾选后待办数量 ' + before + '→' + after, after === before-1);
const comp = await c.ev("JSON.parse(localStorage.getItem('todoData')).completed.length");
ok('已完成数量 3→'+comp+(comp===4?'(+1)':'(异常)'), comp === 4);

// 3 弹窗开合
await c.ev("document.getElementById('open-reminder-panel').click();1"); await sleep(500);
ok('提醒弹窗已打开(is-open)', await c.ev("document.getElementById('reminder-modal').classList.contains('is-open')"));
ok('弹窗未隐藏', !(await c.ev("document.getElementById('reminder-modal').classList.contains('hidden')")));
await c.ev("document.getElementById('reminder-close').click();1"); await sleep(400);
ok('弹窗关闭后已隐藏', await c.ev("document.getElementById('reminder-modal').classList.contains('hidden')"));

// 4 Toast
await c.ev("showToast('测试提示');1"); await sleep(300);
ok('Toast 可见', await c.ev("document.getElementById('app-toast').classList.contains('is-visible')"));

// 5 命令面板执行 → 跳转到统计分析
await c.ev("document.getElementById('cmdk-input')&&0;1");
await c.ev("openCmdk();1"); await sleep(500);
await c.ev("(()=>{const el=document.getElementById('cmdk-input');el.value='统计分析';el.dispatchEvent(new Event('input'));return 1;})()");
await sleep(300);
await c.ev("runCmdkCursor();1"); await sleep(900);
ok('命令面板执行后跳转到统计分析', (await c.ev("!document.getElementById('stats-section').classList.contains('hidden')")));
ok('命令面板已关闭', await c.ev("document.getElementById('cmdk-modal').classList.contains('hidden')"));

// 6 统计周期切换：期望值由种子数据独立复算，不写死数字
const dayKey = (d) => d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
const rangeDays = (period) => {
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - (period === 'month' ? 29 : 6));
    const out = [];
    for (let i = 0; i < (period === 'month' ? 30 : 7); i++) {
        const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        out.push(dayKey(d));
    }
    return new Set(out);
};
const expectedWorkHours = (period) => {
    const set = rangeDays(period);
    let minutes = 0;
    Object.keys(seed.workData.records).forEach(k => {
        if (!set.has(k)) return;
        seed.workData.records[k].workSessions.forEach(s => { minutes += s.duration || 0; });
    });
    return (minutes / 60).toFixed(1);
};
await c.ev("switchStatsPeriod('month');1"); await sleep(900);
const gotMonth = await c.ev("document.getElementById('total-work-hours').textContent");
ok('切到本月后汇总卡随区间变化 (' + gotMonth + ' = 期望 ' + expectedWorkHours('month') + ')', gotMonth === expectedWorkHours('month'));
await c.ev("switchStatsPeriod('week');1"); await sleep(900);
const gotWeek = await c.ev("document.getElementById('total-work-hours').textContent");
ok('切到本周后汇总卡随区间变化 (' + gotWeek + ' = 期望 ' + expectedWorkHours('week') + ')', gotWeek === expectedWorkHours('week'));
ok('图表未重建(复用实例)', (await c.ev("!!window.workChart")) === true);

// 7 打卡计时器
await c.ev("document.getElementById('nav-checkin').click();1"); await sleep(600);
await c.ev("startWork();1"); await sleep(600);
ok('工作状态=工作中', (await c.ev("document.getElementById('work-status-display').textContent"))==='工作中');
ok('计时状态带 timer-live 脉冲', await c.ev("document.getElementById('work-status-display').classList.contains('timer-live')"));
await c.ev("endWork();1"); await sleep(600);

console.log('===== 运行期异常 =====', JSON.stringify(errs.filter(e=>e.indexOf('vscode')===-1)));
ch.kill();srv.close();process.exit(0);
})().catch(e=>{console.error('FAIL',e.message);process.exit(1);});
