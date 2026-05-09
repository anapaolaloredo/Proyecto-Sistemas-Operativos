// Cada Worker simula UN CORE del CPU
// Recibe tareas (procesos) del Thread Manager y se ejecutan

let workerId = -1;

let dummyGlobal = 0;

self.onmessage = function(e) {
  const { type, data } = e.data;

  if (type === 'INIT') {
    workerId = data.workerId;
    self.postMessage({ type: 'READY', workerId });
    return;
  }

  if (type === 'RUN_PROCESS') {
    runProcess(data);
    return;
  }

  if (type === 'TERMINATE') {
    self.close();
  }
};

async function runProcess(proc) {
  const { pid, burstTime, quantum, algo } = proc;
  
  // Simular ciclos de CPU — trabajo real dentro del thread
  const startTime = performance.now();
  let elapsed = 0;
  const tickMs = 0; // 100ms por unidad de burst
  const slice = quantum || burstTime; // quantum o burst completo

  self.postMessage({ type: 'PROCESS_START', pid, workerId, timestamp: Date.now() });

  let remaining = burstTime;
  const runFor = Math.min(slice, remaining);

  // Bucle real de trabajo — no es solo un setTimeout, es cómputo dentro del hilo
  for (let tick = 0; tick < runFor; tick++) {
    // Trabajo computacional real (simula ciclos de CPU)
    let dummy = 0;
    for (let i = 0; i < 50000; i++) { dummy += Math.sqrt(i); }
    dummyGlobal += dummy;

    // Reportar progreso al main thread
    self.postMessage({
      type: 'TICK',
      pid,
      workerId,
      tick: tick + 1,
      totalTicks: runFor,
      remaining: remaining - tick - 1
    });

    // Pausar brevemente
    await sleep(tickMs);
  }

  remaining -= runFor;

  if (remaining <= 0) {
    self.postMessage({ type: 'PROCESS_DONE', pid, workerId, completionTime: Date.now() });
  } else {
    // Round Robin: devolver al scheduler para re-encolar
    self.postMessage({ type: 'PROCESS_PREEMPTED', pid, workerId, remaining });
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
