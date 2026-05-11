'use strict';

// ══════════════════════════════════════
// EMOJIS & COLORS
// ══════════════════════════════════════
const MONSTER_EMOJIS = ['👾','🐲','🦎','👻','🐙','🦑','🐸','🤖','👽','🦄','🐉','🦊','🦝','🐺','🎃'];
const COLORS = ['#1565c0','#7b1fa2','#00838f','#2e7d32','#e65100','#ad1457','#4527a0','#00695c','#c62828','#37474f'];
const pidMonsterMap = {};
const pidColorMap = {};
let pidColorIdx = 0;

function getMonsterEmoji(pid) {
  if (!(pid in pidMonsterMap)) pidMonsterMap[pid] = MONSTER_EMOJIS[(pid-1) % MONSTER_EMOJIS.length];
  return pidMonsterMap[pid];
}
function getPidColor(pid) {
  if (!(pid in pidColorMap)) pidColorMap[pid] = COLORS[pidColorIdx++ % COLORS.length];
  return pidColorMap[pid];
}
function getPidColorIdx(pid) { getPidColor(pid); return Object.keys(pidColorMap).indexOf(String(pid)) % COLORS.length; }

// ══════════════════════════════════════
// GLOBAL STATE
// ══════════════════════════════════════
let processes = [];
let schedResult = null;
let simInterval = null;
let simStep = 0;
let simRunning = false;
let ctxSwitches = 0;
let ganttFull = [];
let stepPointer = 0;

// Door sim state
let doorState = { screamUnits:0, totalUnits:0, completed:0, running:0, scareLog:[], topMonsters:{} };
let doorProcessState = {};
let currentDoorPid = null;
let screamTotal = 0;

// Memory state
let memHistory = [];
let memStepIdx = 0;
let memInterval = null;
let memPaused = false;
let memCurrentRefs = [];

// Threads
let threadStartTime = 0;
let threadEndTime = 0; 

// ══════════════════════════════════════
// UTILS
// ══════════════════════════════════════
function toast(msg, type='info') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`; t.textContent = msg; c.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

function log(msg, type='info') {
  const el = document.getElementById('event-log');
  const empty = el.querySelector('.log-empty'); if (empty) empty.remove();
  const line = document.createElement('div'); line.className = `log-line ${type}`;
  const tLabel = simStep !== undefined ? `[T=${simStep}] ` : '';
  line.innerHTML = `<span class="log-time">${tLabel}</span>${msg}`;
  el.appendChild(line); el.scrollTop = el.scrollHeight;
}

function updateStateCounts() {
  const counts = {new:0, ready:0, running:0, waiting:0, terminated:0};
  processes.forEach(p => { if (counts[p.state] !== undefined) counts[p.state]++; });
  ['new','ready','running','waiting','terminated'].forEach(s =>
    document.getElementById('cnt-'+s).textContent = counts[s]);
}

function setProcessState(pid, state) {
  const p = processes.find(x => x.pid == pid);
  if (!p || p.state === state) return;
  const old = p.state; p.state = state;
  log(`P${pid}: ${old} → <b>${state.toUpperCase()}</b>`, stateLogType(state));
  renderProcessTable(); renderConveyor(); updateStateCounts();
  const box = document.getElementById(`state-box-${state}`);
  if (box) { box.classList.add('active'); setTimeout(() => box.classList.remove('active'), 600); }
}
function stateLogType(s) { return {new:'info',ready:'info',running:'success',waiting:'warn',terminated:'ctx'}[s]||'info'; }

// ══════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-'+btn.dataset.tab).classList.add('active');
  });
});

// ══════════════════════════════════════
// MODULE 1 — PROCESSES
// ══════════════════════════════════════
document.getElementById('btn-add-process').addEventListener('click', addProcess);
document.getElementById('f-pid').addEventListener('keydown', e => { if(e.key==='Enter') addProcess(); });

function addProcess() {
  const pid      = parseInt(document.getElementById('f-pid').value);
  const forks    = parseInt(document.getElementById('f-forks').value) || 0;
  const arrival  = parseInt(document.getElementById('f-arrival').value) || 0;
  const burst    = parseInt(document.getElementById('f-burst').value);
  const priority = parseInt(document.getElementById('f-priority').value) || 1;
  const pages    = parseInt(document.getElementById('f-pages').value) || 4;

  if (!pid || pid < 1) { toast('PID inválido','error'); return; }
  if (!burst || burst < 1) { toast('Burst Time debe ser ≥ 1','error'); return; }
  if (processes.find(p => p.pid === pid)) { toast(`PID ${pid} ya existe`,'warn'); return; }

  processes.push({
    pid, arrival, burst, burstOrig: burst, priority, pages, forks,
    isFork: false, parentPid: null, state: 'new', remaining: burst, forksSpawned: false
  });
  getPidColor(pid);

  renderProcessTable(); renderConveyor(); updateStateCounts();
  syncMemPagesFromProcesses();
  document.getElementById('f-pid').value = pid + 1;
  document.getElementById('f-forks').value = "";
  toast(`P${pid} agregado ✓`,'success');
  log(`P${pid} creado — Arrival:${arrival}, Burst:${burst}, Priority:${priority}, Forks:${forks}`,'info');
  updateDoorSimulation();
}

document.getElementById('btn-load-example').addEventListener('click', () => {
  processes = []; for (const k in pidColorMap) { delete pidColorMap[k]; } pidColorIdx = 0;
  const ex = [{pid:1,arrival:0,burst:8,priority:3,pages:4},{pid:2,arrival:1,burst:4,priority:1,pages:2},
    {pid:3,arrival:2,burst:9,priority:4,pages:5},{pid:4,arrival:3,burst:5,priority:2,pages:3},
    {pid:5,arrival:4,burst:2,priority:1,pages:2},{pid:6,arrival:5,burst:6,priority:3,pages:3}];
  ex.forEach(p => { processes.push({...p, burstOrig:p.burst, state:'new', remaining:p.burst, forks:0, isFork:false}); getPidColor(p.pid); });
  renderProcessTable(); renderConveyor(); updateStateCounts();
  syncMemPagesFromProcesses();
  updateDoorSimulation();
  toast('6 procesos de ejemplo cargados ✓','success');
});

document.getElementById('btn-clear-all').addEventListener('click', () => {
  if (processes.length===0) return;
  processes=[]; for (const k in pidColorMap) { delete pidColorMap[k]; } pidColorIdx=0;
  renderProcessTable(); renderConveyor(); updateStateCounts();
  updateDoorSimulation();
  toast('Procesos eliminados','warn');
});

document.getElementById('btn-go-sched').addEventListener('click', () => {
  if (processes.length===0) { toast('Agrega procesos primero','warn'); return; }
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
  document.querySelector('[data-tab="scheduling"]').classList.add('active');
  document.getElementById('tab-scheduling').classList.add('active');
});

const fd = document.getElementById('file-drop');
fd.addEventListener('click', ()=>document.getElementById('file-input').click());
fd.addEventListener('dragover', e=>{e.preventDefault();fd.style.background='#e3f2fd';});
fd.addEventListener('dragleave', ()=>{fd.style.background='';});
fd.addEventListener('drop', e=>{e.preventDefault();fd.style.background='';const file=e.dataTransfer.files[0];if(!file)return;document.getElementById('file-input').files=e.dataTransfer.files;document.getElementById('file-input').dispatchEvent(new Event('change'));});
document.getElementById('file-input').addEventListener('change', e=>{
  const file=e.target.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=ev=>{
    const lines=ev.target.result.split('\n').filter(l=>l.trim());
    let added=0;
    lines.forEach(line=>{
      const parts=line.split(',').map(s=>s.trim());
      if(parts.length<4) return;
      const pid=parseInt(parts[0]),arrival=parseInt(parts[1])||0,burst=parseInt(parts[2]),priority=parseInt(parts[3])||1,pages=parseInt(parts[4])||4;
      if(!pid||!burst||processes.find(p=>p.pid===pid)) return;
      processes.push({pid,arrival,burst,burstOrig:burst,priority,pages,state:'new',remaining:burst, forks:0, isFork:false});
      getPidColor(pid); added++;
    });
    renderProcessTable(); renderConveyor(); updateStateCounts(); syncMemPagesFromProcesses(); updateDoorSimulation();
    toast(`${added} procesos importados ✓`,'success');
  };
  reader.readAsText(file);
});

function syncMemPagesFromProcesses() {
  if (processes.length > 0) {
    let totalPages = 0; 
    let count = 0;
    processes.forEach(p => {
        if(!p.isFork) {
            totalPages += p.pages; 
            count++;
            if(p.forks > 0) { 
                totalPages += (p.pages * p.forks);
                count += p.forks; 
            }
        } else {
           totalPages += p.pages; 
           count++;
        }
    });
    const avgPages = count > 0 ? Math.round(totalPages / count) : 0;
    const el = document.getElementById('mem-pages-proc');
    if(el) el.value = avgPages;
  }
}

function renderProcessTable() {
  const tbody=document.getElementById('process-tbody');
  document.getElementById('process-count').textContent=processes.length;
  if(!processes.length){
    tbody.innerHTML=`<tr class="empty-row"><td colspan="8"><div class="empty-state"><span class="empty-icon"></span><p>No hay procesos registrados</p><p class="empty-sub">Agrega procesos para comenzar</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML=processes.map(p=>`
    <tr data-pid="${p.pid}">
      <td><span style="font-family:var(--font-mono);font-weight:800;color:${getPidColor(p.pid)}">P${p.pid}</span></td>
      <td class="editable" data-field="arrival">${p.arrival}</td>
      <td class="editable" data-field="burst">${p.burstOrig}</td>
      <td class="editable" data-field="priority">${p.priority}</td>
      <td class="editable" data-field="pages">${p.pages}</td>
      <td><span style="font-size:11px;font-weight:600;color:var(--text-muted);">${p.isFork ? '↳ Hijo P'+p.parentPid : p.forks}</span></td>
      <td><span class="state-badge ${p.state}">${p.state}</span></td>
      <td><button class="mi-btn danger" style="padding:4px 8px;font-size:11px" onclick="removeProcess(${p.pid})">✕</button></td>
    </tr>`).join('');
    
  tbody.querySelectorAll('.editable').forEach(td=>{
    td.style.cursor='pointer';
    td.addEventListener('dblclick',()=>{
      const row=td.closest('tr'), pid=parseInt(row.dataset.pid), field=td.dataset.field, val=td.textContent;
      td.innerHTML=`<input type="number" value="${val}" style="width:60px;padding:2px 4px;font-size:13px;border:1.5px solid var(--mi-blue);border-radius:4px"/>`;
      const inp=td.querySelector('input'); inp.focus(); inp.select();
      inp.addEventListener('blur',()=>saveEdit(pid,field,inp.value));
      inp.addEventListener('keydown',e=>{if(e.key==='Enter')inp.blur();if(e.key==='Escape')renderProcessTable();});
    });
  });
}

function saveEdit(pid,field,val){
  const v=parseInt(val); if(isNaN(v)||v<1){renderProcessTable();return;}
  const p=processes.find(x=>x.pid===pid); if(!p) return;
  p[field]=v; if(field==='burst'){p.burstOrig=v;p.remaining=v;}
  renderProcessTable(); toast(`P${pid}.${field} → ${v}`,'info');
}

function removeProcess(pid){ processes=processes.filter(p=>p.pid!==pid); renderProcessTable(); renderConveyor(); updateStateCounts(); updateDoorSimulation(); }

function renderConveyor(){
  const belt=document.getElementById('belt-doors');
  if(!processes.length){belt.innerHTML='';return;}
  belt.innerHTML=processes.map(p=>`<div class="process-card"><div class="door-body state-${p.state}" title="P${p.pid}|${p.state}"><span>P${p.pid}</span><span class="door-knob"></span></div><div class="door-label">${p.state}</div></div>`).join('');
}

// ══════════════════════════════════════
// MODULE 2 — CPU SCHEDULING
// ══════════════════════════════════════
document.getElementById('sched-algo').addEventListener('change',function(){
  const v=this.value;
  document.getElementById('quantum-group').style.display=(v==='rr'||v==='srtf')?'block':'none';
  document.getElementById('mlq-config').style.display=(v==='mlq'||v==='mlfq')?'block':'none';
});
document.getElementById('btn-run-sched').addEventListener('click',runScheduling);
document.getElementById('btn-step-sched').addEventListener('click',stepScheduling);
document.getElementById('btn-reset-sched').addEventListener('click',resetScheduling);

function resetScheduling(){
  clearInterval(simInterval); simRunning=false; simStep=0; stepPointer=0; ctxSwitches=0; ganttFull=[];
  
  processes = processes.filter(p => !p.isFork);
  processes.forEach(p => { p.state='new'; p.remaining=p.burstOrig; p.forksSpawned=false; });
  
  renderProcessTable(); renderConveyor(); updateStateCounts();
  document.getElementById('gantt-chart').innerHTML='<div class="gantt-empty">Ejecuta un algoritmo para ver el diagrama de Gantt</div>';
  document.getElementById('gantt-timeline').innerHTML='';
  document.getElementById('results-area').style.display='none';
  document.getElementById('cpu-box-inner').innerHTML='<span class="cpu-idle">💤</span>';
  document.getElementById('ready-queue').innerHTML='<span class="queue-empty-msg">Vacía</span>';
  document.getElementById('waiting-queue').innerHTML='<span class="queue-empty-msg">Vacía</span>';
  document.getElementById('ctx-switch-count').textContent='0';
  document.getElementById('sim-time-display').textContent='0';
  document.getElementById('sim-status-badge').className='sim-status idle';
  document.getElementById('sim-status-badge').textContent='Inactivo';
  ['m-cpu','m-wait','m-tat','m-resp'].forEach(id=>document.getElementById(id).textContent='—');
  resetDoorSimulation();
  toast('Reset ✓','info');
}

function runScheduling(){
  if(processes.length===0){toast('Agrega procesos primero','warn');return;}
  if(simRunning){clearInterval(simInterval);simRunning=false;document.getElementById('btn-run-sched').textContent='▶ Ejecutar';return;}
  resetScheduling(); computeSchedule();
  if(ganttFull.length===0){toast('Sin resultados','warn');return;}
  simRunning=true; document.getElementById('btn-run-sched').textContent='⏸ Pausar';
  const speed=()=>2100-parseInt(document.getElementById('sched-speed').value);
  function tick(){
    if(stepPointer>=ganttFull.length){clearInterval(simInterval);simRunning=false;document.getElementById('btn-run-sched').textContent='▶ Ejecutar';finishSimulation();return;}
    applyStep(stepPointer++);
    simInterval=setTimeout(tick,speed());
  }
  tick();
}

function stepScheduling(){
  if(processes.length===0){toast('Agrega procesos primero','warn');return;}
  if(ganttFull.length===0){resetScheduling();computeSchedule();}
  if(stepPointer>=ganttFull.length){finishSimulation();return;}
  applyStep(stepPointer++);
  if(stepPointer>=ganttFull.length) finishSimulation();
}

function applyStep(i){
  const seg=ganttFull[i]; simStep=seg.end;
  document.getElementById('sim-time-display').textContent=seg.end;
  document.getElementById('sim-status-badge').className='sim-status running';
  document.getElementById('sim-status-badge').textContent=`Ejecutando T=${seg.start}→${seg.end}`;
  const cpu=document.getElementById('cpu-box-inner');
  if(seg.pid===null){cpu.innerHTML='<span class="cpu-idle">💤 Idle</span>';}
  else{
    cpu.innerHTML=`<div class="cpu-running-pid" style="color:${getPidColor(seg.pid)}">P${seg.pid}</div><div class="cpu-running-info">T:${seg.start}→${seg.end}</div>`;
    setProcessState(seg.pid,'running');
  }
  const rq=document.getElementById('ready-queue');
  if(seg.ready&&seg.ready.length>0){
    rq.innerHTML=seg.ready.map(pid=>`<span class="queue-chip" style="background:${getPidColor(pid)}">P${pid}</span>`).join('');
    seg.ready.forEach(pid=>{const p=processes.find(x=>x.pid===pid);if(p&&p.state!=='running')setProcessState(pid,'ready');});
  } else {rq.innerHTML='<span class="queue-empty-msg">Vacía</span>';}
  if(i>0&&ganttFull[i-1].pid!==seg.pid&&ganttFull[i-1].pid!==null&&seg.pid!==null){
    ctxSwitches++; document.getElementById('ctx-switch-count').textContent=ctxSwitches;
    log(`Context Switch: P${ganttFull[i-1].pid} → P${seg.pid}`,'ctx');
  }
  renderGanttPartial(i+1);
  updateDoorSimulationStep(seg);
}

function finishSimulation(){
  processes.forEach(p=>{if(p.state!=='terminated')setProcessState(p.pid,'terminated');});
  document.getElementById('sim-status-badge').className='sim-status done';
  document.getElementById('sim-status-badge').textContent='Completado ✓';
  renderResults(); renderGanttPartial(ganttFull.length); finishDoorSimulation();
  toast('Simulación completada ✓','success');
}

// ── ALGORITHMS ──

function spawnForks(p, t, clone, queueArray = null, arrivedSet = null, isMultiLevel = false) {
    if (p.forks > 0 && !p.forksSpawned) {
        p.forksSpawned = true;
        for (let i = 0; i < p.forks; i++) {
            let childPid = Math.max(...processes.map(x=>x.pid), ...clone.map(x=>x.pid), 0) + 1;
            
            let child = {
                pid: childPid, arrival: t, burst: p.remaining, burstOrig: p.remaining, 
                priority: p.priority, pages: p.pages, forks: 0, isFork: true, 
                parentPid: p.pid, state: 'new', remaining: p.remaining, 
                firstRun: -1, ct: 0, responseTime: 0
            };
            
            if (p.level !== undefined) child.level = p.level;
            if (p.mLevel !== undefined) child.mLevel = 0;

            getPidColor(childPid);
            clone.push(child);

            if (!window.isComparing) {
                processes.push(child);
                log(`⚡ P${p.pid} ejecutó fork() -> P${childPid} creado en T=${t}`, 'ctx');
                updateStateCounts();
                renderProcessTable();
            }

            if (queueArray && arrivedSet) {
                if (isMultiLevel) {
                    let lvl = child.level !== undefined ? child.level : 0;
                    queueArray[lvl].push(child);
                } else {
                    queueArray.push(child);
                }
                arrivedSet.add(child.pid);
            }
        }
    }
}

function computeSchedule(){
  const algo=document.getElementById('sched-algo').value;
  const quantum=parseInt(document.getElementById('sched-quantum').value)||2;
  const procs=processes.map(p=>({...p,remaining:p.burstOrig,responseRecorded:false,completionTime:0,responseTime:0,firstRun:-1}));
  let result;
  switch(algo){
    case 'fcfs': result=fcfs(procs); break; case 'sjf': result=sjf(procs); break;
    case 'hrrn': result=hrrn(procs); break; case 'rr': result=roundRobin(procs,quantum); break;
    case 'srtf': result=srtf(procs); break; case 'priority_p': result=priorityPreemptive(procs); break;
    case 'mlq': result=multilevelQueue(procs); break; case 'mlfq': result=mlfq(procs); break;
    default: result=fcfs(procs);
  }
  ganttFull=result.gantt; schedResult=result; stepPointer=0;
  log(`Algoritmo: ${algo.toUpperCase()} | Procesos base: ${procs.length}`,'info');
}

function fcfs(procs){const clone=[...procs].sort((a,b)=>a.arrival-b.arrival);const gantt=[];let t=0;const done=new Set();while(done.size<clone.length){let avail=clone.filter(x=>!done.has(x.pid)&&x.arrival<=t).sort((a,b)=>a.arrival-b.arrival);if(!avail.length){let next=clone.filter(x=>!done.has(x.pid)).sort((a,b)=>a.arrival-b.arrival)[0];gantt.push({pid:null,start:t,end:next.arrival,ready:[]});t=next.arrival;continue;}let p=avail[0];if(p.firstRun<0){p.firstRun=t;spawnForks(p,t,clone);}let ready=clone.filter(x=>!done.has(x.pid)&&x.arrival<=t&&x.pid!==p.pid).map(x=>x.pid);gantt.push({pid:p.pid,start:t,end:t+p.burstOrig,ready});t+=p.burstOrig;p.completionTime=t;p.responseTime=p.firstRun-p.arrival;done.add(p.pid);}return{gantt,procs:clone};}
function sjf(procs){const clone=procs.map(p=>({...p}));const gantt=[];let t=0;const done=new Set();while(done.size<clone.length){let avail=clone.filter(p=>!done.has(p.pid)&&p.arrival<=t);if(!avail.length){let next=clone.filter(p=>!done.has(p.pid)).sort((a,b)=>a.arrival-b.arrival)[0];gantt.push({pid:null,start:t,end:next.arrival,ready:[]});t=next.arrival;continue;}let p=avail.sort((a,b)=>a.burstOrig-b.burstOrig)[0];if(p.firstRun<0){p.firstRun=t;spawnForks(p,t,clone);}let ready=clone.filter(x=>!done.has(x.pid)&&x.arrival<=t&&x.pid!==p.pid).map(x=>x.pid);gantt.push({pid:p.pid,start:t,end:t+p.burstOrig,ready});t+=p.burstOrig;p.completionTime=t;p.responseTime=p.firstRun-p.arrival;done.add(p.pid);}return{gantt,procs:clone};}
function hrrn(procs){const clone=procs.map(p=>({...p}));const gantt=[];let t=0;const done=new Set();while(done.size<clone.length){let avail=clone.filter(p=>!done.has(p.pid)&&p.arrival<=t);if(!avail.length){let next=clone.filter(p=>!done.has(p.pid)).sort((a,b)=>a.arrival-b.arrival)[0];gantt.push({pid:null,start:t,end:next.arrival,ready:[]});t=next.arrival;continue;}let p=avail.map(x=>({...x,ratio:(t-x.arrival+x.burstOrig)/x.burstOrig})).sort((a,b)=>b.ratio-a.ratio)[0];let orig=clone.find(x=>x.pid===p.pid);if(orig.firstRun<0){orig.firstRun=t;spawnForks(orig,t,clone);}let ready=clone.filter(x=>!done.has(x.pid)&&x.arrival<=t&&x.pid!==orig.pid).map(x=>x.pid);gantt.push({pid:orig.pid,start:t,end:t+orig.burstOrig,ready});t+=orig.burstOrig;orig.completionTime=t;orig.responseTime=orig.firstRun-orig.arrival;done.add(orig.pid);}return{gantt,procs:clone};}
function roundRobin(procs,q){const clone=procs.map(p=>({...p}));const gantt=[];let t=0;const queue=[];const done=new Set();const arrived=new Set();clone.sort((a,b)=>a.arrival-b.arrival);function check(){clone.forEach(x=>{if(x.arrival<=t&&!arrived.has(x.pid)){queue.push(x);arrived.add(x.pid);}});}check();while(done.size<clone.length){if(!queue.length){let unarrived=clone.filter(x=>!arrived.has(x.pid)).sort((a,b)=>a.arrival-b.arrival);if(!unarrived.length)break;let next=unarrived[0];gantt.push({pid:null,start:t,end:next.arrival,ready:[]});t=next.arrival;check();continue;}let p=queue.shift();if(p.firstRun<0){p.firstRun=t;spawnForks(p,t,clone,queue,arrived);}let run=Math.min(q,p.remaining);let ready=queue.map(x=>x.pid);gantt.push({pid:p.pid,start:t,end:t+run,ready,remaining:p.remaining-run});t+=run;p.remaining-=run;check();if(p.remaining>0)queue.push(p);else{p.completionTime=t;p.responseTime=p.firstRun-p.arrival;done.add(p.pid);}}return{gantt,procs:clone};}
function srtf(procs){const clone=procs.map(p=>({...p}));const gantt=[];let t=0;const done=new Set();let current=null;let segStart=0;const maxT=Math.max(...clone.map(p=>p.arrival))+clone.reduce((s,p)=>s+p.burstOrig,0)+10;while(done.size<clone.length&&t<=maxT){let avail=clone.filter(p=>!done.has(p.pid)&&p.arrival<=t);let best=avail.sort((a,b)=>a.remaining-b.remaining)[0]||null;if(!best){t++;continue;}if(best.firstRun<0){best.firstRun=t;spawnForks(best,t,clone);avail=clone.filter(p=>!done.has(p.pid)&&p.arrival<=t);}if(current!==best){if(current&&segStart<t)gantt.push({pid:current.pid,start:segStart,end:t,ready:avail.filter(x=>x!==current).map(x=>x.pid)});current=best;segStart=t;}best.remaining--;t++;if(best.remaining===0){gantt.push({pid:best.pid,start:segStart,end:t,ready:clone.filter(p=>!done.has(p.pid)&&p.pid!==best.pid&&p.arrival<=t).map(x=>x.pid)});best.completionTime=t;best.responseTime=best.firstRun-best.arrival;done.add(best.pid);current=null;}}return{gantt,procs:clone};}
function priorityPreemptive(procs){const clone=procs.map(p=>({...p}));const gantt=[];let t=0;const done=new Set();let current=null;let segStart=0;const maxT=Math.max(...clone.map(p=>p.arrival))+clone.reduce((s,p)=>s+p.burstOrig,0)+10;while(done.size<clone.length&&t<=maxT){let avail=clone.filter(p=>!done.has(p.pid)&&p.arrival<=t);let best=avail.sort((a,b)=>a.priority-b.priority)[0]||null;if(!best){t++;continue;}if(best.firstRun<0){best.firstRun=t;spawnForks(best,t,clone);avail=clone.filter(p=>!done.has(p.pid)&&p.arrival<=t);}if(current!==best){if(current&&segStart<t)gantt.push({pid:current.pid,start:segStart,end:t,ready:avail.filter(x=>x!==current).map(x=>x.pid)});current=best;segStart=t;}best.remaining--;t++;if(best.remaining===0){gantt.push({pid:best.pid,start:segStart,end:t,ready:clone.filter(p=>!done.has(p.pid)&&p.pid!==best.pid&&p.arrival<=t).map(x=>x.pid)});best.completionTime=t;best.responseTime=best.firstRun-best.arrival;done.add(best.pid);current=null;}}return{gantt,procs:clone};}
function multilevelQueue(procs){const q0=parseInt(document.getElementById('mlq-q0').value)||2;const q1=parseInt(document.getElementById('mlq-q1').value)||4;const clone=procs.map(p=>({...p,level:p.priority<=2?0:p.priority<=4?1:2}));const gantt=[];let t=0;const done=new Set();const arrived=new Set();const queues=[[],[],[]];clone.sort((a,b)=>a.arrival-b.arrival);function check(){clone.forEach(x=>{if(x.arrival<=t&&!arrived.has(x.pid)){queues[x.level].push(x);arrived.add(x.pid);}});}check();const maxT=clone.reduce((s,p)=>s+p.burstOrig,0)+Math.max(...clone.map(p=>p.arrival))+10;while(done.size<clone.length&&t<=maxT){check();let q=queues[0].length>0?queues[0]:queues[1].length>0?queues[1]:queues[2].length>0?queues[2]:null;if(!q||!q.length){let unarrived=clone.filter(x=>!arrived.has(x.pid)).sort((a,b)=>a.arrival-b.arrival);if(!unarrived.length)break;let next=unarrived[0];gantt.push({pid:null,start:t,end:next.arrival,ready:[]});t=next.arrival;check();continue;}let p=q.shift();if(p.firstRun<0){p.firstRun=t;spawnForks(p,t,clone,queues,arrived,true);}let quantum=p.level===0?q0:p.level===1?q1:p.burstOrig;let run=Math.min(quantum,p.remaining);let ready=[...queues[0],...queues[1],...queues[2]].map(x=>x.pid);gantt.push({pid:p.pid,start:t,end:t+run,ready,remaining:p.remaining-run});t+=run;p.remaining-=run;check();if(p.remaining>0)q.push(p);else{p.completionTime=t;p.responseTime=p.firstRun-p.arrival;done.add(p.pid);}}return{gantt,procs:clone};}
function mlfq(procs){const q0=parseInt(document.getElementById('mlq-q0').value)||2;const q1=parseInt(document.getElementById('mlq-q1').value)||4;const clone=procs.map(p=>({...p,mLevel:0}));const gantt=[];let t=0;const done=new Set();const arrived=new Set();const queues=[[],[],[]];clone.sort((a,b)=>a.arrival-b.arrival);function check(){clone.forEach(x=>{if(x.arrival<=t&&!arrived.has(x.pid)){queues[0].push(x);arrived.add(x.pid);}});}check();const maxT=clone.reduce((s,p)=>s+p.burstOrig,0)+Math.max(...clone.map(p=>p.arrival))+10;while(done.size<clone.length&&t<=maxT){check();const q=queues[0].length>0?queues[0]:queues[1].length>0?queues[1]:queues[2].length>0?queues[2]:null;if(!q||!q.length){let unarrived=clone.filter(x=>!arrived.has(x.pid)).sort((a,b)=>a.arrival-b.arrival);if(!unarrived.length)break;let next=unarrived[0];gantt.push({pid:null,start:t,end:next.arrival,ready:[]});t=next.arrival;check();continue;}let p=q.shift();if(p.firstRun<0){p.firstRun=t;spawnForks(p,t,clone,queues,arrived,true);}let quantum=p.mLevel===0?q0:p.mLevel===1?q1:p.remaining;let run=Math.min(quantum,p.remaining);let ready=[...queues[0],...queues[1],...queues[2]].map(x=>x.pid);gantt.push({pid:p.pid,start:t,end:t+run,ready,remaining:p.remaining-run});t+=run;p.remaining-=run;check();if(p.remaining>0){if(p.mLevel<2)p.mLevel++;queues[p.mLevel].push(p);}else{p.completionTime=t;p.responseTime=p.firstRun-p.arrival;done.add(p.pid);}}return{gantt,procs:clone};}

function renderGanttPartial(upTo){
  const chart=document.getElementById('gantt-chart'), tl=document.getElementById('gantt-timeline');
  const segs=ganttFull.slice(0,upTo);
  if(!segs.length){chart.innerHTML='<div class="gantt-empty">Ejecuta un algoritmo para ver el diagrama de Gantt</div>';return;}
  
  const merged=[];
  segs.forEach(s=>{
    if(merged.length>0 && merged[merged.length-1].pid===s.pid && merged[merged.length-1].end===s.start)
      merged[merged.length-1].end=s.end;
    else 
      merged.push({...s});
  });
  
  chart.innerHTML=merged.map(s=>{
    const bg=s.pid===null?'#b0bec5':getPidColor(s.pid);
    const label=s.pid===null?'IDLE':`P${s.pid}`;
    
    // Armar el texto con información al pasar el mouse (Tooltip)
    let tooltip = s.pid === null ? `Inactivo | T: ${s.start} - ${s.end}` : '';
    if (s.pid !== null) {
        const p = processes.find(x => x.pid === s.pid);
        tooltip = `Proceso: P${s.pid}&#10;Bloque ejecutado: ${s.start} a ${s.end}&#10;Llegada original: ${p?.arrival}&#10;Burst Total: ${p?.burstOrig}`;
    }
    
    // Inyectar eventos onmouseenter y onmouseleave
    const hoverEvents = s.pid !== null ? `onmouseenter="highlightResRow(${s.pid})" onmouseleave="unhighlightResRow(${s.pid})"` : '';

    return `<div class="gantt-block${s.pid===null?' gantt-idle':''}" style="background:${bg};flex:${s.end-s.start};cursor:pointer;" title="${tooltip}" ${hoverEvents}>
      <span class="gantt-pid">${label}</span>
      <span class="gantt-time">${s.start}-${s.end}</span>
    </div>`;
  }).join('');
  
  tl.innerHTML=merged.map(s=>`<div class="gantt-tick" style="flex:${s.end-s.start}">${s.start}</div>`).join('')+`<div class="gantt-tick">${merged[merged.length-1].end}</div>`;
}

// ── FUNCIONES GLOBALES DE RESALTADO ──
window.highlightResRow = function(pid) {
  const row = document.querySelector(`tr[data-res-pid="${pid}"]`);
  if (row) row.classList.add('highlight-row');
};

window.unhighlightResRow = function(pid) {
  const row = document.querySelector(`tr[data-res-pid="${pid}"]`);
  if (row) row.classList.remove('highlight-row');
};

function renderResults(){
  if(!schedResult) return;
  const procs=schedResult.procs;
  const tbody=document.getElementById('results-tbody');
  let totalWait=0,totalTAT=0,totalResp=0,totalBurst=0;
  const totalTime=Math.max(...procs.map(p=>p.completionTime));
  
  tbody.innerHTML=procs.map(p=>{
    const tat=p.completionTime-p.arrival;
    const wait=Math.max(0,tat-p.burstOrig);
    const resp=Math.max(0,p.responseTime);
    totalWait+=wait; totalTAT+=tat; totalResp+=resp; totalBurst+=p.burstOrig;
    
    return `<tr data-res-pid="${p.pid}" style="transition:all 0.2s;">
      <td><span style="font-weight:800;color:${getPidColor(p.pid)}">P${p.pid}</span></td>
      <td>${p.arrival}</td>
      <td>${p.burstOrig}</td>
      <td>${p.completionTime}</td>
      <td>${tat}</td>
      <td>${Math.max(0,wait)}</td>
      <td>${resp}</td>
    </tr>`;
  }).join('')+`<tr class="avg-row"><td colspan="3">Promedio</td><td>—</td><td>${(totalTAT/procs.length).toFixed(2)}</td><td>${(totalWait/procs.length).toFixed(2)}</td><td>${(totalResp/procs.length).toFixed(2)}</td></tr>`;
  
  document.getElementById('results-area').style.display='block';
  const cpu=(totalBurst/totalTime*100).toFixed(1);
  document.getElementById('m-cpu').textContent=cpu+'%';
  document.getElementById('m-cpu').className='metric-val '+(parseFloat(cpu)>70?'good':'warn');
  document.getElementById('m-wait').textContent=(totalWait/procs.length).toFixed(2);
  document.getElementById('m-tat').textContent=(totalTAT/procs.length).toFixed(2);
  document.getElementById('m-resp').textContent=(totalResp/procs.length).toFixed(2);
}

// ══════════════════════════════════════
// DOOR SIMULATION (unchanged from friend)
// ══════════════════════════════════════
function resetDoorSimulation(){doorState={screamUnits:0,totalUnits:0,completed:0,running:0,scareLog:[],topMonsters:{}};doorProcessState={};currentDoorPid=null;screamTotal=0;updateDoorSimulation();}
function updateDoorSimulation(){processes.forEach(p=>{if(!doorProcessState[p.pid])doorProcessState[p.pid]={burstOrig:p.burstOrig,done:0,progress:0};});doorState.totalUnits=processes.reduce((s,p)=>s+p.burstOrig,0);renderDoorSimulation();}
function updateDoorSimulationStep(seg){if(seg.pid===null){currentDoorPid=null;}else{const pid=seg.pid;currentDoorPid=pid;const dur=seg.end-seg.start;if(!doorProcessState[pid]){const p=processes.find(x=>x.pid===pid);doorProcessState[pid]={burstOrig:p?p.burstOrig:dur,done:0,progress:0};}doorProcessState[pid].done+=dur;const orig=doorProcessState[pid].burstOrig;doorProcessState[pid].progress=Math.min(100,(doorProcessState[pid].done/orig)*100);screamTotal+=dur;doorState.screamUnits=screamTotal;doorState.totalUnits=Math.max(doorState.totalUnits,screamTotal);if(!doorState.topMonsters[pid])doorState.topMonsters[pid]=0;doorState.topMonsters[pid]+=dur;doorState.scareLog.push({pid,time:seg.start,emoji:getMonsterEmoji(pid)});if(doorState.scareLog.length>30)doorState.scareLog.shift();}doorState.completed=Object.values(doorProcessState).filter(d=>d.progress>=100).length;doorState.running=currentDoorPid!==null?1:0;renderDoorSimulation();}
function finishDoorSimulation(){processes.forEach(p=>{if(!doorProcessState[p.pid])doorProcessState[p.pid]={burstOrig:p.burstOrig,done:p.burstOrig,progress:100};doorProcessState[p.pid].progress=100;doorProcessState[p.pid].done=doorProcessState[p.pid].burstOrig;});currentDoorPid=null;doorState.completed=processes.length;doorState.running=0;renderDoorSimulation();}
function renderDoorSimulation(){const procs=processes;document.getElementById('door-completed').textContent=doorState.completed;document.getElementById('door-running-count').textContent=doorState.running;document.getElementById('door-total').textContent=procs.length;const totalBurst=procs.reduce((s,p)=>s+p.burstOrig,0)||1;const pct=Math.min(100,(screamTotal/totalBurst)*100);document.getElementById('scream-bar-fill').style.width=pct+'%';document.getElementById('scream-pct').textContent=Math.round(pct)+'%';renderWaitingRoom();renderDoorStations();renderScareLog();renderTopMonsters();}
function renderWaitingRoom(){const el=document.getElementById('theater-seats');const MAX=14;const waiting=processes.filter(p=>{const ds=doorProcessState[p.pid];return !ds||ds.progress<100;});document.getElementById('waiting-room-count').textContent=waiting.length+' waiting';let html='';for(let i=0;i<MAX;i++){const p=waiting[i];if(p){const isR=p.pid===currentDoorPid;html+=`<div class="theater-seat"><div class="seat-chair has-monster${isR?' scare-flash':''}" title="P${p.pid}">${getMonsterEmoji(p.pid)}</div><div class="seat-label" style="color:${getPidColor(p.pid)}">P${p.pid}</div></div>`;}else{html+=`<div class="theater-seat"><div class="seat-chair empty"></div><div class="seat-label" style="opacity:0.2">#${i+1}</div></div>`;}}el.innerHTML=html;}
function renderDoorStations(){const el=document.getElementById('door-stations-grid');if(!processes.length){el.innerHTML=`<div style="grid-column:1/-1;text-align:center;color:rgba(255,255,255,0.3);font-size:13px;padding:20px;font-style:italic"> Las puertas aparecerán cuando agregues procesos</div>`;return;}el.innerHTML=processes.map(p=>{const ds=doorProcessState[p.pid]||{progress:0,done:0,burstOrig:p.burstOrig};const isR=p.pid===currentDoorPid;const isDone=ds.progress>=100;const colorIdx=getPidColorIdx(p.pid);let panelClass=isDone?'complete':isR?'running':'idle';const doorColorClass=isDone?'':`door-color-${colorIdx}`;return`<div class="door-station"><div class="door-station-label">DOOR #${p.pid}</div><div class="mi-door-frame"><div class="mi-door-arch"></div><div class="mi-door-panel ${panelClass} ${doorColorClass}" title="P${p.pid} | ${Math.round(ds.progress)}% complete">${isR?`<div class="mi-door-monster">${getMonsterEmoji(p.pid)}</div><div class="mi-door-pid">P${p.pid}</div>`:isDone?`<div style="font-size:20px">✅</div><div style="font-size:10px;color:rgba(255,255,255,0.5);font-weight:700">DONE</div>`:`<div style="font-size:18px;opacity:0.3">${getMonsterEmoji(p.pid)}</div><div class="mi-door-pid" style="opacity:0.5">P${p.pid}</div>`}<div class="mi-door-knob"></div><div class="mi-door-number">D${p.pid}</div><div class="mi-door-progress"><div class="mi-door-progress-fill" style="width:${ds.progress}%"></div></div></div></div><div class="door-status-badge ${panelClass}">${isDone?'✓ DONE':isR?'⚡ SCARE':'IDLE'}</div></div>`;}).join('');}
function renderScareLog(){const el=document.getElementById('scream-log-entries');if(!doorState.scareLog.length){el.innerHTML='<div class="scream-log-empty">Los sustos aparecerán aquí...</div>';return;}el.innerHTML=[...doorState.scareLog].reverse().slice(0,20).map(e=>`<div class="scream-log-entry"><span>${e.emoji}</span><span class="entry-pid" style="color:${getPidColor(e.pid)}">P${e.pid}</span><span style="color:rgba(255,255,255,0.4)">⚡ scared!</span><span class="entry-time">T=${e.time}</span></div>`).join('');el.scrollTop=0;}
function renderTopMonsters(){const el=document.getElementById('top-monsters-list');const entries=Object.entries(doorState.topMonsters).sort((a,b)=>b[1]-a[1]).slice(0,5);if(!entries.length){el.innerHTML='<div style="font-size:11px;color:rgba(255,255,255,0.3);font-style:italic;text-align:center;padding:10px">Ejecuta para ver rankings</div>';return;}const maxVal=entries[0][1];const medals=['🥇','🥈','🥉','🏅','🏅'];el.innerHTML=entries.map(([pid,val],i)=>{const bw=Math.round((val/maxVal)*100);return`<div class="top-monster-row"><span class="top-monster-rank">${medals[i]}</span><span>${getMonsterEmoji(parseInt(pid))}</span><span style="color:${getPidColor(parseInt(pid))};font-size:12px;font-weight:700">P${pid}</span><div class="top-monster-bar"><div class="top-monster-bar-fill" style="width:${bw}%"></div></div><span style="font-size:10px;color:rgba(255,255,255,0.4);min-width:24px;text-align:right">${val}u</span></div>`;}).join('');}

// ══════════════════════════════════════
// MODULE 3 — MEMORY / PAGINACIÓN
// ══════════════════════════════════════

function initMemFramesUI() {
  const n = parseInt(document.getElementById('mem-frames').value) || 3;
  const vault = document.getElementById('frames-vault');
  vault.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const slot = document.createElement('div');
    slot.className = 'frame-slot';
    slot.innerHTML = `
      <div class="frame-door-mem" id="mframe-${i}">
        <span class="frame-page-num" id="mframe-num-${i}">—</span>
        <div class="frame-knob"></div>
      </div>
      <div class="frame-label">Frame ${i}</div>`;
    vault.appendChild(slot);
  }
  // Table header
  const head = document.getElementById('mem-hist-head');
  head.innerHTML = '<th>Ref</th>';
  for (let i = 0; i < n; i++) head.innerHTML += `<th>F${i}</th>`;
  head.innerHTML += '<th>Resultado</th>';
  document.getElementById('mem-hist-body').innerHTML = '';
}
initMemFramesUI();

document.getElementById('btn-run-mem').addEventListener('click', runMemory);
document.getElementById('btn-step-mem').addEventListener('click', doMemStep);
document.getElementById('btn-reset-mem').addEventListener('click', resetMemory);

function resetMemory() {
  clearInterval(memInterval); memHistory = []; memStepIdx = 0; memPaused = false; memCurrentRefs = [];
  initMemFramesUI();
  document.getElementById('mem-fault-count').textContent = '0';
  document.getElementById('mem-hit-count').textContent = '0';
  document.getElementById('mem-hit-rate').textContent = '—';
  document.getElementById('mem-total-refs').textContent = '0';
  document.getElementById('mem-step-bar').style.display = 'none';
  document.getElementById('btn-step-mem').disabled = true;
  document.getElementById('ref-chips').innerHTML = '';
  document.getElementById('frag-list').innerHTML = '<p style="font-size:12px;color:var(--text-dim)">Ejecuta la simulación para ver fragmentación.</p>';
  document.getElementById('btn-mem-playpause').textContent = '⏸ Pausar';
}

function runMemory() {
  resetMemory();
  const refsRaw = document.getElementById('mem-refs').value;
  const refs = refsRaw.split(/[,\s]+/).map(Number).filter(n => !isNaN(n) && n >= 0);
  const frames = parseInt(document.getElementById('mem-frames').value) || 3;
  const algo = document.getElementById('mem-algo').value;
  const pageSize = parseInt(document.getElementById('mem-pagesize').value) || 4;

  if (!refs.length) { toast('Ingresa la cadena de referencias', 'warn'); return; }

  memCurrentRefs = refs;
  document.getElementById('mem-total-refs').textContent = refs.length;

  // Build ref chips
  const chipsEl = document.getElementById('ref-chips');
  chipsEl.innerHTML = refs.map((r, i) => `<span class="ref-chip" id="rchip-${i}">${r}</span>`).join('');

  // Compute history
  switch(algo) {
    case 'fifo':   memHistory = memFIFO(refs, frames); break;
    case 'lru':    memHistory = memLRU(refs, frames); break;
    case 'optimal':memHistory = memOptimal(refs, frames); break;
    case 'clock':  memHistory = memClock(refs, frames); break;
    case 'second': memHistory = memSecondChance(refs, frames); break;
    default:       memHistory = memFIFO(refs, frames);
  }

  // Table header
  const head = document.getElementById('mem-hist-head');
  head.innerHTML = '<th>Ref</th>';
  for (let i = 0; i < frames; i++) head.innerHTML += `<th>F${i}</th>`;
  head.innerHTML += '<th>Resultado</th>';

  // Fragmentation
  renderFragmentation(pageSize);

  document.getElementById('mem-step-bar').style.display = 'flex';
  document.getElementById('btn-step-mem').disabled = false;

  log(`Paginación ${algo.toUpperCase()} — ${refs.length} refs, ${frames} marcos`, 'info');
  toast(`▶ Simulando ${algo.toUpperCase()}`, 'success');

  // Auto play
  memStepIdx = 0; memPaused = false;
  startMemAuto();
}

function startMemAuto() {
  clearInterval(memInterval);
  const speed = () => 2100 - parseInt(document.getElementById('mem-speed').value);
  function tick() {
    if (memPaused) { memInterval = setTimeout(tick, 100); return; }
    if (memStepIdx >= memHistory.length) { clearInterval(memInterval); toast('✅ Paginación completada', 'success'); return; }
    applyMemStep();
    memInterval = setTimeout(tick, speed());
  }
  tick();
}

function doMemStep() {
  if (!memHistory.length) return;
  if (memStepIdx >= memHistory.length) { toast('Simulación completada', 'info'); return; }
  applyMemStep();
}

function toggleMemPlay() {
  memPaused = !memPaused;
  document.getElementById('btn-mem-playpause').textContent = memPaused ? '▶ Reanudar' : '⏸ Pausar';
}

function applyMemStep() {
  const step = memHistory[memStepIdx];
  const idx = memStepIdx;
  memStepIdx++;

  // Highlight ref chip
  document.querySelectorAll('.ref-chip').forEach(c => c.classList.remove('active'));
  const chip = document.getElementById(`rchip-${idx}`);
  if (chip) {
    chip.classList.add('active');
    chip.classList.add(step.fault ? 'fault' : 'hit');
    chip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }

  // Update frames
  step.frames.forEach((page, i) => {
    const door = document.getElementById(`mframe-${i}`);
    const num  = document.getElementById(`mframe-num-${i}`);
    if (!door) return;
    door.className = 'frame-door-mem';
    if (page !== -1) {
      door.classList.add('has-page');
      num.textContent = page;
      if (step.loaded_at === i) {
        door.classList.add(step.fault ? 'fault-flash' : 'hit-flash');
        setTimeout(() => { door.classList.remove('fault-flash','hit-flash'); }, 500);
      }
    } else {
      num.textContent = '—';
    }
  });

  // Counters
  const faults = memHistory.slice(0, memStepIdx).filter(s => s.fault).length;
  const hits = memStepIdx - faults;
  document.getElementById('mem-fault-count').textContent = faults;
  document.getElementById('mem-hit-count').textContent = hits;
  document.getElementById('mem-hit-rate').textContent = memStepIdx > 0 ? (hits / memStepIdx * 100).toFixed(1) + '%' : '—';

  // Progress
  const pct = (memStepIdx / memHistory.length * 100).toFixed(0);
  document.getElementById('mem-step-fill').style.width = pct + '%';
  document.getElementById('mem-step-label').textContent = `Paso ${memStepIdx} / ${memHistory.length}`;

  // Table row
  const body = document.getElementById('mem-hist-body');
  const row = document.createElement('tr');
  let cells = `<td class="cell-ref">${step.ref}</td>`;
  step.frames.forEach((page, i) => {
    if (page === -1) { cells += `<td class="cell-empty">—</td>`; return; }
    let cls = '';
    if (step.fault && step.loaded_at === i) cls = 'cell-loaded';
    else if (!step.fault && step.hit_frame === i) cls = 'cell-hit';
    cells += `<td class="${cls}">${page}</td>`;
  });
  cells += step.fault
    ? `<td class="cell-fault">💥 FAULT${step.evicted != null ? ` (↑${step.evicted})` : ''}</td>`
    : `<td class="cell-hit">✅ HIT</td>`;
  row.innerHTML = cells;
  body.appendChild(row);
  body.parentElement.scrollTop = body.scrollHeight;

  // Log
  if (step.fault) log(`💥 Page Fault — Ref:${step.ref}${step.evicted!=null?' | Sale pág '+step.evicted:''}`, 'error');
  else log(`✅ Hit — Ref:${step.ref} en frame ${step.hit_frame}`, 'success');
}

function renderFragmentation(pageSize) {
  const el = document.getElementById('frag-list');
  if (!processes.length) { el.innerHTML = '<p style="font-size:12px;color:var(--text-dim)">No hay procesos para calcular fragmentación.</p>'; return; }
  const frames = parseInt(document.getElementById('mem-frames').value) || 3;
  el.innerHTML = processes.map(p => {
    const pagesNeeded = p.pages;
    const bytesNeeded = pagesNeeded * pageSize;
    // Internal fragmentation: last page may not be fully used
    const lastPageUsed = bytesNeeded % pageSize === 0 ? 0 : pageSize - (bytesNeeded % pageSize);
    const internalFrag = Math.min(lastPageUsed, pageSize - 1);
    const totalAlloc = pagesNeeded * pageSize;
    const usedPct = totalAlloc > 0 ? Math.round(((totalAlloc - internalFrag) / totalAlloc) * 100) : 100;
    const fragPct = 100 - usedPct;
    return `
      <div class="frag-bar-row" title="P${p.pid}: ${totalAlloc}KB asignados, ${internalFrag}KB frag. interna">
        <span class="frag-pid-label" style="color:${getPidColor(p.pid)}">P${p.pid}</span>
        <div class="frag-bar-track">
          <div style="display:flex;height:100%">
            <div style="width:${usedPct}%;background:${getPidColor(p.pid)};border-radius:7px 0 0 7px"></div>
            <div style="width:${fragPct}%;background:#ffcc80;border-radius:${fragPct>0?'0 7px 7px 0':'0'}"></div>
          </div>
        </div>
        <span class="frag-info">${totalAlloc}KB / ${internalFrag}KB frag</span>
      </div>`;
  }).join('');
}

// ── PAGE REPLACEMENT ALGORITHMS ──

function memFIFO(refs, n) {
  const frames = new Array(n).fill(-1);
  const hist = []; let ptr = 0;
  refs.forEach(ref => {
    if (frames.includes(ref)) {
      hist.push({ ref, frames: [...frames], fault: false, evicted: null, loaded_at: null, hit_frame: frames.indexOf(ref) });
    } else {
      const evicted = frames[ptr] !== -1 ? frames[ptr] : null;
      frames[ptr] = ref;
      const loaded_at = ptr;
      ptr = (ptr + 1) % n;
      hist.push({ ref, frames: [...frames], fault: true, evicted, loaded_at, hit_frame: null });
    }
  });
  return hist;
}

function memLRU(refs, n) {
  const frames = new Array(n).fill(-1);
  const lastUsed = new Map(); const hist = [];
  refs.forEach((ref, t) => {
    if (frames.includes(ref)) {
      lastUsed.set(ref, t);
      hist.push({ ref, frames: [...frames], fault: false, evicted: null, loaded_at: null, hit_frame: frames.indexOf(ref) });
    } else {
      let replaceIdx;
      if (frames.includes(-1)) { replaceIdx = frames.indexOf(-1); }
      else {
        let lruT = Infinity, lruI = 0;
        frames.forEach((pg, i) => { const u = lastUsed.get(pg) ?? -1; if (u < lruT) { lruT = u; lruI = i; } });
        replaceIdx = lruI;
      }
      const evicted = frames[replaceIdx] !== -1 ? frames[replaceIdx] : null;
      frames[replaceIdx] = ref; lastUsed.set(ref, t);
      hist.push({ ref, frames: [...frames], fault: true, evicted, loaded_at: replaceIdx, hit_frame: null });
    }
  });
  return hist;
}

function memOptimal(refs, n) {
  const frames = new Array(n).fill(-1); const hist = [];
  refs.forEach((ref, i) => {
    if (frames.includes(ref)) {
      hist.push({ ref, frames: [...frames], fault: false, evicted: null, loaded_at: null, hit_frame: frames.indexOf(ref) });
    } else {
      let replaceIdx;
      if (frames.includes(-1)) { replaceIdx = frames.indexOf(-1); }
      else {
        let farthest = -1, farIdx = 0;
        frames.forEach((pg, fi) => {
          const next = refs.indexOf(pg, i + 1);
          const dist = next === -1 ? Infinity : next;
          if (dist > farthest) { farthest = dist; farIdx = fi; }
        });
        replaceIdx = farIdx;
      }
      const evicted = frames[replaceIdx] !== -1 ? frames[replaceIdx] : null;
      frames[replaceIdx] = ref;
      hist.push({ ref, frames: [...frames], fault: true, evicted, loaded_at: replaceIdx, hit_frame: null });
    }
  });
  return hist;
}

function memClock(refs, n) {
  const frames = new Array(n).fill(-1);
  const refBits = new Array(n).fill(0);
  const hist = []; let ptr = 0;
  refs.forEach(ref => {
    const idx = frames.indexOf(ref);
    if (idx !== -1) {
      refBits[idx] = 1;
      hist.push({ ref, frames: [...frames], fault: false, evicted: null, loaded_at: null, hit_frame: idx });
    } else {
      while (refBits[ptr] === 1) { refBits[ptr] = 0; ptr = (ptr + 1) % n; }
      const evicted = frames[ptr] !== -1 ? frames[ptr] : null;
      const loaded_at = ptr;
      frames[ptr] = ref; refBits[ptr] = 1;
      ptr = (ptr + 1) % n;
      hist.push({ ref, frames: [...frames], fault: true, evicted, loaded_at, hit_frame: null });
    }
  });
  return hist;
}

function memSecondChance(refs, n) {
  // Same as Clock but maintaining explicit FIFO queue order
  const frames = new Array(n).fill(-1);
  const refBits = new Array(n).fill(0);
  const order = []; // keeps insertion order
  const hist = [];
  refs.forEach(ref => {
    const idx = frames.indexOf(ref);
    if (idx !== -1) {
      refBits[idx] = 1;
      hist.push({ ref, frames: [...frames], fault: false, evicted: null, loaded_at: null, hit_frame: idx });
    } else {
      let found = false;
      // Scan in FIFO order for ref_bit = 0
      while (!found) {
        const candidate = order[0];
        if (candidate === undefined) break;
        const ci = frames.indexOf(candidate);
        if (refBits[ci] === 0) {
          // Evict
          const evicted = frames[ci];
          const loaded_at = ci;
          frames[ci] = ref; refBits[ci] = 0;
          order.shift(); order.push(ref);
          hist.push({ ref, frames: [...frames], fault: true, evicted, loaded_at, hit_frame: null });
          found = true;
        } else {
          refBits[ci] = 0; order.shift(); order.push(candidate);
        }
      }
      if (!found) {
        // Empty slot
        const emptyIdx = frames.indexOf(-1);
        if (emptyIdx !== -1) {
          frames[emptyIdx] = ref; refBits[emptyIdx] = 0; order.push(ref);
          hist.push({ ref, frames: [...frames], fault: true, evicted: null, loaded_at: emptyIdx, hit_frame: null });
        }
      }
    }
  });
  // Handle initial empty frames for FIFO-ordered insertion
  return memSecondChanceFix(refs, n);
}

function memSecondChanceFix(refs, n) {
  // Clean implementation of Second Chance
  const frames = new Array(n).fill(-1);
  const refBits = new Array(n).fill(0);
  const hist = []; let ptr = 0;
  refs.forEach(ref => {
    const idx = frames.indexOf(ref);
    if (idx !== -1) {
      refBits[idx] = 1;
      hist.push({ ref, frames: [...frames], fault: false, evicted: null, loaded_at: null, hit_frame: idx });
    } else {
      // Find empty frame first
      const emptyIdx = frames.indexOf(-1);
      if (emptyIdx !== -1) {
        frames[emptyIdx] = ref; refBits[emptyIdx] = 0;
        hist.push({ ref, frames: [...frames], fault: true, evicted: null, loaded_at: emptyIdx, hit_frame: null });
      } else {
        // Second chance loop
        while (refBits[ptr] === 1) { refBits[ptr] = 0; ptr = (ptr + 1) % n; }
        const evicted = frames[ptr]; const loaded_at = ptr;
        frames[ptr] = ref; refBits[ptr] = 0;
        ptr = (ptr + 1) % n;
        hist.push({ ref, frames: [...frames], fault: true, evicted, loaded_at, hit_frame: null });
      }
    }
  });
  return hist;
}

// ══════════════════════════════════════
// MÓDULO 4 — THREAD MANAGER (Web Workers = Cores)
// ══════════════════════════════════════

// 1. Inyectamos el Worker en memoria (Blob) para evitar bloqueos CORS por abrir "file://"
const workerCode = `
let workerId = -1;
self.onmessage = function(e) {
  const { type, data } = e.data;
  if (type === 'INIT') { workerId = data.workerId; self.postMessage({ type: 'READY', workerId }); return; }
  if (type === 'RUN_PROCESS') { runProcess(data); return; }
  if (type === 'TERMINATE') { self.close(); }
};
async function runProcess(proc) {
  const { pid, burstTime, quantum, algo } = proc;
  const slice = quantum || burstTime;
  self.postMessage({ type: 'PROCESS_START', pid, workerId, timestamp: Date.now() });
  
  let remaining = burstTime;
  const runFor = Math.min(slice, remaining);
  
  for (let tick = 0; tick < runFor; tick++) {
    let dummy = 0;
    for (let i = 0; i < 50000; i++) { dummy += Math.sqrt(i); } // Carga real de CPU en el thread
    
    self.postMessage({ type: 'TICK', pid, workerId, tick: tick + 1, totalTicks: runFor, remaining: remaining - tick - 1 });
    await new Promise(r => setTimeout(r, 0)); // Respiro al hilo
  }
  
  remaining -= runFor;
  if (remaining <= 0) {
    self.postMessage({ type: 'PROCESS_DONE', pid, workerId, completionTime: Date.now() });
  } else {
    self.postMessage({ type: 'PROCESS_PREEMPTED', pid, workerId, remaining });
  }
}`;
const workerBlob = new Blob([workerCode], { type: 'application/javascript' });
const workerUrl = URL.createObjectURL(workerBlob);

class ThreadManager {
  constructor(numCores) {
    this.numCores = numCores;
    this.workers = [];
    this.coreStatus = [];
    this.processQueue = [];
    this.runningProcesses = new Map();
    this.completionCallbacks = new Map();
    this.threadLog = [];
    
    this.initWorkers();
  }

  initWorkers() {
    this.workers.forEach(w => w.terminate());
    this.workers = [];
    this.coreStatus = [];

    for (let i = 0; i < this.numCores; i++) {
      const worker = new Worker(workerUrl); // Usa el Worker desde la memoria local
      
      worker.onmessage = (e) => this.handleWorkerMessage(e, i);
      worker.onerror   = (e) => this.handleWorkerError(e, i);
      
      worker.postMessage({ type: 'INIT', data: { workerId: i } });
      
      this.workers.push(worker);
      this.coreStatus.push('idle');
    }
    this.renderCoresUI();
  }

  dispatch(processConfig) {
    const freeCore = this.coreStatus.indexOf('idle');
    if (freeCore === -1) {
      this.processQueue.push(processConfig);
      this.logThread(`P${processConfig.pid} encolado (Todos los Cores ocupados)`);
      return;
    }
    this.assignToCore(processConfig, freeCore);
  }

  assignToCore(proc, coreId) {
    this.coreStatus[coreId] = 'busy';
    this.runningProcesses.set(proc.pid, coreId);
    this.workers[coreId].postMessage({ type: 'RUN_PROCESS', data: proc });
    
    setProcessState(proc.pid, 'running'); // Efecto visual
    this.logThread(`P${proc.pid} → Core ${coreId} (Thread OS #${coreId})`);
    this.renderCoresUI();
  }

  handleWorkerMessage(e, workerId) {
    const { type, pid, remaining, completionTime } = e.data;

    if (type === 'PROCESS_DONE') {
      this.coreStatus[workerId] = 'idle';
      this.runningProcesses.delete(pid);
      this.logThread(`P${pid} TERMINADO en Core ${workerId}`, 'done');
      
      if (this.completionCallbacks.has(pid)) {
        this.completionCallbacks.get(pid)(pid, completionTime);
      }
      if (this.processQueue.length > 0) {
        const next = this.processQueue.shift();
        this.assignToCore(next, workerId);
      }
      this.renderCoresUI();
    }

    if (type === 'TICK') {
      this.updateCoreProgress(workerId, e.data);
    }

    if (type === 'PROCESS_PREEMPTED') {
      this.coreStatus[workerId] = 'idle';
      this.runningProcesses.delete(pid);
      
      setProcessState(pid, 'ready');

      if (remaining > 0) {
        const originalProc = this.processQueue.find(p => p.pid === pid) 
          || { ...this.getProcessById(pid), burstTime: remaining };
        originalProc.burstTime = remaining;
        this.processQueue.push(originalProc); // RR: Regresa a la cola
        this.logThread(`P${pid} preemptado, restante: ${remaining}`, 'preempt');
      }

      if (this.processQueue.length > 0) {
        const next = this.processQueue.shift();
        this.assignToCore(next, workerId);
      }
      this.renderCoresUI();
    }
  }

  handleWorkerError(e, workerId) {
    this.logThread(`ERROR en Core ${workerId}: ${e.message}`, 'error');
  }

  runWithAlgorithm(processList, algo, quantum) {
    let sorted;
    switch(algo) {
      case 'fcfs': sorted = [...processList].sort((a,b) => a.arrival - b.arrival); break;
      case 'sjf': sorted = [...processList].sort((a,b) => a.burstOrig - b.burstOrig); break;
      case 'priority_p': sorted = [...processList].sort((a,b) => a.priority - b.priority); break;
      default: sorted = [...processList].sort((a,b) => a.arrival - b.arrival);
    }

    sorted.forEach(p => {
      this.dispatch({
        pid:       p.pid,
        burstTime: p.burstOrig || p.burst,
        quantum:   algo === 'rr' ? quantum : null,
        algo,
        priority:  p.priority
      });
    });
  }

  onProcessComplete(pid, callback) {
    this.completionCallbacks.set(pid, callback);
  }

  logThread(msg, type = 'info') {
    this.threadLog.push({ msg, type, time: Date.now() });
    this.renderThreadLog();
  }

  getProcessById(pid) { return processes.find(p => p.pid === pid) || {}; }

  terminate() {
    this.workers.forEach(w => w.terminate());
    this.workers = [];
  }

  renderCoresUI() {
    const el = document.getElementById('cores-grid');
    if (!el) return;

    el.innerHTML = this.workers.map((_, i) => {
      const status = this.coreStatus[i];
      const runningPid = [...this.runningProcesses.entries()].find(([, cid]) => cid === i)?.[0];
      const isActive = status === 'busy';

      // Creamos el HTML del PID por separado para evitar errores de sintaxis en VS Code
      const pidHtml = (isActive && runningPid !== undefined)
        ? '<span style="color:' + getPidColor(runningPid) + ';font-size:20px;font-weight:800">P' + runningPid + '</span>'
        : '<span style="opacity:0.3">—</span>';

      return `
        <div class="core-card ${isActive ? 'core-active' : 'core-idle'}">
          <div class="core-header">
            <span class="core-icon">${isActive ? '⚡' : '💤'}</span>
            <span class="core-name">Core ${i}</span>
            <span class="core-badge ${isActive ? 'badge-run' : 'badge-idle'}">
              ${isActive ? 'RUNNING' : 'IDLE'}
            </span>
          </div>
          <div class="core-pid">${pidHtml}</div>
          <div style="height:4px;background:var(--border);border-radius:2px;margin-top:6px;overflow:hidden;">
            <div id="core-progress-${i}" style="height:100%;width:0%;background:var(--mi-green);transition:width 0.1s linear"></div>
          </div>
          <div class="core-thread-id" style="margin-top:6px">Thread OS #${i}</div>
        </div>`;
    }).join('');

    const busyCount = this.coreStatus.filter(s => s === 'busy').length;
    const el2 = document.getElementById('thread-stats');
    if (el2) {
      el2.innerHTML = `
        <span>Cores activos: <b>${busyCount}/${this.numCores}</b></span>
        <span>En cola: <b>${this.processQueue.length}</b></span>
        <span>Completados: <b>${this.completionCallbacks.size}</b></span>`;
    }
  }

  updateCoreProgress(coreId, data) {
    const pct = Math.round((data.tick / data.totalTicks) * 100);
    const fill = document.getElementById(`core-progress-${coreId}`);
    if (fill) fill.style.width = pct + '%';
  }

  renderThreadLog() {
    const el = document.getElementById('thread-log');
    if (!el) return;
    el.innerHTML = this.threadLog.slice(-20).reverse().map(e => {
      const cls = { done:'success', error:'error', preempt:'warn' }[e.type] || 'info';
      return `<div class="log-line ${cls}">${e.msg}</div>`;
    }).join('');
  }
}

let threadManager = null;

function initThreadManager() {
  const cores = parseInt(document.getElementById('num-cores').value) || 2;
  if (threadManager) threadManager.terminate();
  threadManager = new ThreadManager(cores);
  toast(`ThreadManager iniciado — ${cores} cores`, 'success');
}

function runThreadSimulation() {
  if (!threadManager) { toast('Inicia el ThreadManager primero', 'warn'); return; }
  if (processes.length === 0) { toast('Agrega procesos primero', 'warn'); return; }

  // Restablecer el estado visual de los procesos antes de ejecutar
  processes.forEach(p => { if(!p.isFork) { p.state = 'new'; p.forksSpawned = false; } });
  
  // Pre-calcular forks antes de enviarlos a los hilos
  let nextPid = Math.max(...processes.map(p=>p.pid), 0) + 1;
  let newForks = [];
  processes.forEach(p => {
      if(!p.isFork && p.forks > 0 && !p.forksSpawned) {
          p.forksSpawned = true; 
          for(let i=0; i<p.forks; i++) {
              let child = {...p, pid: nextPid++, isFork: true, parentPid: p.pid, forks: 0, state: 'new', remaining: p.burstOrig};
              getPidColor(child.pid);
              newForks.push(child);
          }
      }
  });
  if(newForks.length > 0) {
      processes.push(...newForks);
      renderProcessTable();
  }
  updateStateCounts();

  const algo = document.getElementById('thread-algo').value;
  const quantum = parseInt(document.getElementById('thread-quantum').value) || 2;

  let completedThreads = 0;
  threadManager.completionCallbacks.clear();

  processes.forEach(p => {
    threadManager.onProcessComplete(p.pid, (pid) => {
      setProcessState(pid, 'terminated');
      completedThreads++;
      if (completedThreads === processes.length) {
            threadEndTime = performance.now();
            const totalTime = (threadEndTime - threadStartTime).toFixed(2);
            toast(`Simulación Paralela completada en ${totalTime} ms`, 'success');
        }
    });
  });

  threadStartTime = performance.now();
  threadManager.runWithAlgorithm(processes, algo, quantum);
  toast(`▶ ${processes.length} procesos despachados`, 'success');
}

function stopThreadSimulation() {
  if (threadManager) {
    threadManager.terminate();
    threadManager = null;
    document.getElementById('cores-grid').innerHTML = '<div style="color:var(--text-dim);font-size:13px;padding:20px">Inicia el ThreadManager para ver los cores</div>';
    toast('Workers terminados', 'warn');
  }
}

// Para ocultar/mostrar el input del quantum según el algoritmo:
document.getElementById('thread-algo')?.addEventListener('change', function() {
  const qGroup = document.getElementById('thread-quantum-group');
  if(qGroup) qGroup.style.display = this.value === 'rr' ? 'block' : 'none';
});

// ══════════════════════════════════════
// LOG & INIT
// ══════════════════════════════════════
document.getElementById('btn-clear-log').addEventListener('click', () => {
  document.getElementById('event-log').innerHTML = '<div class="log-empty">Log limpiado...</div>';
});

updateStateCounts();
renderDoorSimulation();

// ══════════════════════════════════════
// MÓDULO 5 — COMPARACIÓN DE ALGORITMOS
// ══════════════════════════════════════
 
const CMP_PRESETS = {
  example: [
    {pid:1,arrival:0,burst:8,priority:3,pages:4},
    {pid:2,arrival:1,burst:4,priority:1,pages:2},
    {pid:3,arrival:2,burst:9,priority:4,pages:5},
    {pid:4,arrival:3,burst:5,priority:2,pages:3},
    {pid:5,arrival:4,burst:2,priority:1,pages:2},
    {pid:6,arrival:5,burst:6,priority:3,pages:3}
  ],
  heavy: [
    {pid:1,arrival:0,burst:10,priority:2,pages:4},
    {pid:2,arrival:1,burst:6,priority:1,pages:3},
    {pid:3,arrival:2,burst:8,priority:3,pages:5},
    {pid:4,arrival:2,burst:3,priority:1,pages:2},
    {pid:5,arrival:3,burst:7,priority:4,pages:4},
    {pid:6,arrival:4,burst:5,priority:2,pages:3},
    {pid:7,arrival:5,burst:4,priority:1,pages:2},
    {pid:8,arrival:6,burst:9,priority:3,pages:5}
  ]
};
 
const CMP_ALGO_LABELS = {
  fcfs:'FCFS', sjf:'SJF', hrrn:'HRRN', rr:'Round Robin',
  srtf:'SRTF', priority_p:'Priority-P', mlq:'MLQ', mlfq:'MLFQ'
};
 
function syncBadge(side) {
  const val = document.getElementById('cmp-algo-'+side).value;
  document.getElementById('cmp-badge-'+side).textContent = CMP_ALGO_LABELS[val] || val.toUpperCase();
}
 
function getCmpProcesses() {
  const src = document.getElementById('cmp-proc-source').value;
  if (src === 'current') {
    if (!processes.length) { toast('No hay procesos. Usa un preset.', 'warn'); return null; }
    return processes.map(p => ({...p, firstRun:-1, ct:0, remaining:p.burstOrig}));
  }
  return CMP_PRESETS[src].map(p => ({...p, burstOrig:p.burst, firstRun:-1, ct:0, remaining:p.burst}));
}
 
function runCmpAlgo(algoKey, procs, q) {
  const clone = procs.map(p => ({...p, firstRun:-1, ct:0, remaining:p.burst||p.burstOrig}));
  switch(algoKey) {
    case 'fcfs':       return fcfs(clone);
    case 'sjf':        return sjf(clone);
    case 'hrrn':       return hrrn(clone);
    case 'rr':         return roundRobin(clone, q);
    case 'srtf':       return srtf(clone);
    case 'priority_p': return priorityPreemptive(clone);
    case 'mlq':        return multilevelQueue(clone);
    case 'mlfq':       return mlfq(clone);
    default:           return fcfs(clone);
  }
}
 
function calcCmpMetrics(result) {
  const procs = result.procs;
  let tW=0, tT=0, tR=0, tB=0, sw=0;
  const maxCT = Math.max(...procs.map(p => p.completionTime||p.ct||0));
 
  // Count context switches from gantt
  const g = result.gantt;
  for (let i=1; i<g.length; i++) {
    if (g[i].pid !== null && g[i-1].pid !== null && g[i].pid !== g[i-1].pid) sw++;
  }
 
  procs.forEach(p => {
    const ct = p.completionTime || p.ct || 0;
    const tat = ct - p.arrival;
    const burst = p.burstOrig || p.burst;
    tW += Math.max(0, tat - burst);
    tT += tat;
    tR += Math.max(0, (p.firstRun >= 0 ? p.firstRun : p.arrival) - p.arrival);
    tB += burst;
  });
 
  const n = procs.length;
  return {
    wait: +(tW/n).toFixed(2),
    tat:  +(tT/n).toFixed(2),
    resp: +(tR/n).toFixed(2),
    cpu:  +(tB / Math.max(maxCT,1) * 100).toFixed(1),
    sw
  };
}
 
function mergeCmpGantt(gantt) {
  const m = [];
  gantt.forEach(s => {
    if (m.length && m[m.length-1].pid === s.pid && m[m.length-1].end === s.start)
      m[m.length-1].end = s.end;
    else m.push({...s});
  });
  return m;
}
 
function renderCmpGantt(ganttId, tlId, gantt) {
  const merged = mergeCmpGantt(gantt);
  const ganttEl = document.getElementById(ganttId);
  const tlEl    = document.getElementById(tlId);
  if (!merged.length) { ganttEl.innerHTML='<div class="cmp-gantt-empty">Sin datos</div>'; return; }
 
  ganttEl.innerHTML = merged.map(s => {
    const bg    = s.pid === null ? '' : `background:${getPidColor(s.pid)};`;
    const label = s.pid === null ? 'IDLE' : `P${s.pid}`;
    return `<div class="cmp-gantt-seg${s.pid===null?' cmp-idle':''}" style="${bg}flex:${s.end-s.start}" title="${label} T:${s.start}-${s.end}">
      <span>${label}</span><span style="opacity:0.75;font-size:8px">${s.start}-${s.end}</span>
    </div>`;
  }).join('');
 
  tlEl.innerHTML = merged.map(s =>
    `<div class="cmp-gantt-tick" style="flex:${s.end-s.start}">${s.start}</div>`
  ).join('') + `<div class="cmp-gantt-tick">${merged[merged.length-1].end}</div>`;
}
 
function renderCmpDoors(doorsId, screamId, screamPctId, gantt, procs) {
  const el = document.getElementById(doorsId);
  const progress = {};
  procs.forEach(p => {
    progress[p.pid] = { done:0, total: p.burstOrig||p.burst };
  });
  gantt.forEach(s => {
    if (s.pid !== null && progress[s.pid]) progress[s.pid].done += s.end - s.start;
  });
 
  const totalBurst = procs.reduce((s,p)=>s+(p.burstOrig||p.burst),0) || 1;
  const totalDone  = Object.values(progress).reduce((s,v)=>s+v.done,0);
  const pct = Math.min(100, Math.round(totalDone/totalBurst*100));
 
  el.innerHTML = procs.map(p => {
    const pr  = progress[p.pid];
    const ppct = pr ? Math.min(100, Math.round(pr.done/pr.total*100)) : 0;
    const isDone = ppct >= 100;
    const emoji  = getMonsterEmoji(p.pid);
    return `<div class="cmp-door-item">
      <div class="cmp-door-frame ${isDone?'done':''}">
        <span>${emoji}</span>
        <div class="cmp-door-prog" style="width:${ppct}%"></div>
      </div>
      <div class="cmp-door-lbl" style="color:${getPidColor(p.pid)}">P${p.pid} ${ppct}%</div>
    </div>`;
  }).join('');
 
  document.getElementById(screamId).style.width = pct + '%';
  document.getElementById(screamPctId).textContent = pct + '%';
}
 
function renderCmpMetrics(suffix, m, mOther) {
  const waitEl = document.getElementById('cmp-wait-'+suffix);
  const tatEl  = document.getElementById('cmp-tat-'+suffix);
  const cpuEl  = document.getElementById('cmp-cpu-'+suffix);
  const respEl = document.getElementById('cmp-resp-'+suffix);
  const ctxEl  = document.getElementById('cmp-ctx-'+suffix);
 
  waitEl.textContent = m.wait.toFixed(2);
  tatEl.textContent  = m.tat.toFixed(2);
  cpuEl.textContent  = m.cpu.toFixed(1) + '%';
  respEl.textContent = m.resp.toFixed(2);
  ctxEl.textContent  = m.sw;
 
  waitEl.className = 'cmp-mc-val' + (m.wait <= mOther.wait ? ' best' : ' worst');
  tatEl.className  = 'cmp-mc-val' + (m.tat  <= mOther.tat  ? ' best' : ' worst');
  cpuEl.className  = 'cmp-mc-val' + (m.cpu  >= mOther.cpu  ? ' best' : ' worst');
  respEl.className = 'cmp-mc-val' + (m.resp <= mOther.resp ? ' best' : ' worst');
}
 
function renderCmpSummary(labelA, labelB, mA, mB) {
  const panel = document.getElementById('cmp-summary-panel');
  panel.style.display = 'block';
  document.getElementById('cmp-th-a').textContent = labelA;
  document.getElementById('cmp-th-b').textContent = labelB;
 
  const rows = [
    { label:'Avg Waiting Time', a:mA.wait, b:mB.wait, lower:true,  unit:'' },
    { label:'Avg Turnaround Time', a:mA.tat, b:mB.tat, lower:true, unit:'' },
    { label:'Avg Response Time', a:mA.resp, b:mB.resp, lower:true, unit:'' },
    { label:'CPU Utilization',   a:mA.cpu,  b:mB.cpu,  lower:false, unit:'%' },
    { label:'Context Switches',  a:mA.sw,   b:mB.sw,   lower:true, unit:'' },
  ];
 
  document.getElementById('cmp-summary-tbody').innerHTML = rows.map(r => {
    const aBetter = r.lower ? r.a <= r.b : r.a >= r.b;
    const bBetter = r.lower ? r.b <= r.a : r.b >= r.a;
    const winner  = aBetter && !bBetter ? labelA : bBetter && !aBetter ? labelB : 'Empate';
    const winnerColor = winner === labelA ? '#1565c0' : winner === labelB ? '#7b1fa2' : '#546e7a';
    return `<tr>
      <td style="font-weight:700">${r.label}</td>
      <td class="${aBetter?'':'avg-row'}" style="${aBetter?'color:var(--mi-green);font-weight:700':'color:var(--mi-red)'}">${r.a}${r.unit}</td>
      <td class="${bBetter?'':'avg-row'}" style="${bBetter?'color:var(--mi-green);font-weight:700':'color:var(--mi-red)'}">${r.b}${r.unit}</td>
      <td style="font-weight:700;color:${winnerColor}">${winner === 'Empate' ? '🤝 '+winner : '🏆 '+winner}</td>
    </tr>`;
  }).join('');
 
  let scoreA = 0, scoreB = 0;
  rows.forEach(r => {
    const aBetter = r.lower ? r.a < r.b : r.a > r.b;
    const bBetter = r.lower ? r.b < r.a : r.b > r.a;
    if (aBetter) scoreA++; else if (bBetter) scoreB++;
  });
  document.getElementById('cmp-winner-a').style.display = scoreA > scoreB ? 'inline-flex' : 'none';
  document.getElementById('cmp-winner-b').style.display = scoreB > scoreA ? 'inline-flex' : 'none';
}

function runComparison() {
  const procs = getCmpProcesses();
  if (!procs || !procs.length) return;
 
  procs.forEach(p => getPidColor(p.pid));
 
  const q       = parseInt(document.getElementById('cmp-quantum').value) || 2;
  const algoA   = document.getElementById('cmp-algo-a').value;
  const algoB   = document.getElementById('cmp-algo-b').value;
  const labelA  = CMP_ALGO_LABELS[algoA] || algoA;
  const labelB  = CMP_ALGO_LABELS[algoB] || algoB;
 
  const origQuantum = document.getElementById('sched-quantum').value;
  document.getElementById('sched-quantum').value = q;
  document.getElementById('mlq-q0').value = q;
  document.getElementById('mlq-q1').value = q * 2;
 
  window.isComparing = true;
  const resA = runCmpAlgo(algoA, procs, q);
  const resB = runCmpAlgo(algoB, procs, q);
  window.isComparing = false;
 
  document.getElementById('sched-quantum').value = origQuantum;
 
  const mA = calcCmpMetrics(resA);
  const mB = calcCmpMetrics(resB);
 
  renderCmpGantt('cmp-gantt-a', 'cmp-tl-a', resA.gantt);
  renderCmpGantt('cmp-gantt-b', 'cmp-tl-b', resB.gantt);
  renderCmpDoors('cmp-doors-a','cmp-scream-a','cmp-scream-pct-a', resA.gantt, resA.procs);
  renderCmpDoors('cmp-doors-b','cmp-scream-b','cmp-scream-pct-b', resB.gantt, resB.procs);
  renderCmpMetrics('a', mA, mB);
  renderCmpMetrics('b', mB, mA);
  renderCmpSummary(labelA, labelB, mA, mB);
 
  document.getElementById('cmp-badge-a').textContent = labelA;
  document.getElementById('cmp-badge-b').textContent = labelB;
 
  toast(`⚔️ ${labelA} vs ${labelB} — completado`, 'success');
  log(`Comparación: ${labelA} vs ${labelB} con ${procs.length} procesos base`, 'info');
}
 
function resetComparison() {
  ['a','b'].forEach(s => {
    document.getElementById('cmp-gantt-'+s).innerHTML = '<div class="cmp-gantt-empty">Ejecuta la comparación</div>';
    document.getElementById('cmp-tl-'+s).innerHTML = '';
    document.getElementById('cmp-doors-'+s).innerHTML = '<div style="font-size:11px;color:var(--text-dim);padding:8px">Las puertas aparecerán aquí...</div>';
    document.getElementById('cmp-scream-'+s).style.width = '0%';
    document.getElementById('cmp-scream-pct-'+s).textContent = '0%';
    ['wait','tat','cpu','resp','ctx'].forEach(m => {
      const el = document.getElementById(`cmp-${m}-${s}`);
      if (el) { el.textContent = '—'; el.className = 'cmp-mc-val'; }
    });
    document.getElementById('cmp-winner-'+s).style.display = 'none';
  });
  document.getElementById('cmp-summary-panel').style.display = 'none';
  toast('Comparación reiniciada', 'info');
}