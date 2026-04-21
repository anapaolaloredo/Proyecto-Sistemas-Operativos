document.addEventListener("DOMContentLoaded", () => {

/* ═══════════════════════════════════════════════════════════
   MONSTERS INC. OS SIMULATOR — main.js
   ═══════════════════════════════════════════════════════════ */

// ── ESTADO GLOBAL ──
window.Sim = {
  processes: [],
  nextPid: 1,
  simRunning: false,
  simInterval: null,
};

const MONSTER_EMOJIS = ['👹','👾','🦖','🐲','👻','🤖','🦕','🐉','👽','🦇'];

// ── TABS ──
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

// ── STEAM ──
(function initSteam() {
  const container = document.getElementById('steam-container');
  if (!container) return;

  for (let i = 0; i < 20; i++) {
    const p = document.createElement('div');
    p.className = 'steam-particle';
    p.style.left = Math.random() * 100 + 'vw';
    p.style.animationDuration = (8 + Math.random() * 12) + 's';
    p.style.animationDelay = (Math.random() * 10) + 's';
    container.appendChild(p);
  }
})();

// ── BOTONES ──
document.getElementById('btn-add-process')?.addEventListener('click', addProcess);
document.getElementById('btn-clear-all')?.addEventListener('click', clearAll);
document.getElementById('btn-load-example')?.addEventListener('click', loadExample);

// ── ADD PROCESS ──
function addProcess() {
  const pid = parseInt(document.getElementById('f-pid').value) || Sim.nextPid;
  const arrival = parseInt(document.getElementById('f-arrival').value) || 0;
  const burst = parseInt(document.getElementById('f-burst').value);
  const priority = parseInt(document.getElementById('f-priority').value) || 1;
  const pages = parseInt(document.getElementById('f-pages').value) || 4;

  if (!burst || burst < 1) return showToast('Burst inválido', 'error');
  if (Sim.processes.find(p => p.pid === pid)) return showToast('PID duplicado', 'error');

  Sim.processes.push({
    pid, arrival, burst, priority, pages,
    state: 'new',
    emoji: MONSTER_EMOJIS[(pid - 1) % MONSTER_EMOJIS.length],
    color: getPidColor(pid),
  });

  Sim.nextPid++;
  renderAll();
}

// ── CLEAR ──
function clearAll() {
  Sim.processes = [];
  Sim.nextPid = 1;
  renderAll();
}

// ── EXAMPLE ──
function loadExample() {
  clearAll();

  Sim.processes = [
    { pid:1, arrival:0, burst:5, priority:2, pages:4 },
    { pid:2, arrival:1, burst:3, priority:1, pages:3 },
    { pid:3, arrival:2, burst:8, priority:3, pages:5 }
  ].map(p => ({
    ...p,
    state:'new',
    emoji: MONSTER_EMOJIS[(p.pid-1)%MONSTER_EMOJIS.length],
    color: getPidColor(p.pid)
  }));

  Sim.nextPid = 4;
  renderAll();
}

// ── RENDER ──
function renderAll(){
  renderProcessTable();
  renderConveyor();
  updateStateCounts();
}

// ── TABLE ──
function renderProcessTable() {
  const tbody = document.getElementById('process-tbody');
  if (!tbody) return;

  if (Sim.processes.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7">Vacío</td></tr>`;
    return;
  }

  tbody.innerHTML = Sim.processes.map(p => `
    <tr>
      <td>${p.emoji} P${p.pid}</td>
      <td>${p.arrival}</td>
      <td>${p.burst}</td>
      <td>${p.priority}</td>
      <td>${p.pages}</td>
      <td>${p.state}</td>
      <td><button onclick="deleteProcess(${p.pid})">X</button></td>
    </tr>
  `).join('');
}

// ── DELETE ──
window.deleteProcess = function(pid){
  Sim.processes = Sim.processes.filter(p => p.pid !== pid);
  renderAll();
}

// ── CONVEYOR ──
function renderConveyor() {
  const belt = document.getElementById('belt-doors');
  if (!belt) return;

  belt.innerHTML = Sim.processes.map(p => `
    <div>${p.emoji} P${p.pid}</div>
  `).join('');
}

// ── STATES ──
function updateStateCounts(){
  const counts = { new:0, ready:0, running:0, waiting:0, terminated:0 };
  Sim.processes.forEach(p => counts[p.state]++);
}

// ── UTILS ──
function getPidColor(pid){
  const colors = ['#39ff14','#00cfff','#ffe100','#ff3c3c'];
  return colors[(pid - 1) % colors.length];
}

window.showToast = function(msg){
  console.log(msg);
}

// INIT
document.getElementById('f-pid').value = 1;

});