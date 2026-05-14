/**
 * MONSTERS INC. — Guided Onboarding System
 * Sistema de orientación contextual progresiva
 * Incluye: spotlight, tooltips, highlights y activación por botón + primera visita
 * + PAUSA: guarda el paso en sessionStorage para reanudar tras interactuar con la UI
 */

(function () {
  'use strict';

  // ═══════════════════════════════════════════
  // DEFINICIÓN DE PASOS POR MÓDULO
  // ═══════════════════════════════════════════

  const TUTORIAL_STEPS = [
    // ── MÓDULO 1: PROCESOS ──
    {
      tab: 'processes',
      target: '#f-pid',
      title: '🆔 PID — Identificador del Proceso',
      body: 'El <strong>PID</strong> es el número único que identifica a cada proceso en el sistema operativo. Piensa en él como el número de empleado de un monstruo. Debe ser único: no puede haber dos procesos con el mismo PID.',
      position: 'right',
    },
    {
      tab: 'processes',
      target: '#f-forks',
      title: '🍴 Forks — Procesos Hijo',
      body: '<strong>Forks</strong> indica cuántas copias de este proceso se crearán como "hijos". El proceso original es el padre; cada fork es una copia que hereda sus atributos pero corre de forma independiente.',
      position: 'right',
    },
    {
      tab: 'processes',
      target: '#f-arrival',
      title: '⏰ Arrival Time — Tiempo de Llegada',
      body: '<strong>Arrival Time</strong> es el momento (en unidades de tiempo) en que el proceso llega al sistema y entra a la cola. Si es <em>0</em>, llega desde el inicio. Si es <em>3</em>, llega en el tiempo 3.',
      position: 'right',
    },
    {
      tab: 'processes',
      target: '#f-burst',
      title: '⚡ Burst Time — Tiempo de Ejecución',
      body: '<strong>Burst Time</strong> es cuánto tiempo de CPU necesita el proceso para completarse. A mayor burst time, más tarda el proceso. Es clave para algoritmos como SJF (Shortest Job First).',
      position: 'right',
    },
    {
      tab: 'processes',
      target: '#f-priority',
      title: '⭐ Priority — Prioridad del Proceso',
      body: '<strong>Priority</strong> define la importancia del proceso. Aquí usamos escala inversa: <strong>1 = máxima prioridad</strong>, números más altos = menor prioridad. Solo importa en el algoritmo de planificación por prioridad.',
      position: 'right',
    },
    {
      tab: 'processes',
      target: '#f-pages',
      title: '📄 Páginas — Memoria Requerida',
      body: '<strong>Páginas</strong> es cuántas páginas de memoria necesita este proceso. Se usa en el módulo de <em>Paginación</em> (Módulo 3) para simular cómo la memoria se divide en bloques de tamaño fijo.',
      position: 'right',
    },
    {
      tab: 'processes',
      target: '#btn-add-process',
      title: '➕ Agregar Proceso',
      body: 'Cuando hayas llenado todos los campos, haz clic en <strong>Agregar</strong> para registrar el proceso en el sistema. Aparecerá en la tabla de abajo. Puedes agregar tantos como quieras.',
      position: 'top',
    },
    {
      tab: 'processes',
      target: '#btn-load-example',
      title: '📋 Cargar Ejemplo',
      body: '¿No sabes con qué empezar? Haz clic aquí para cargar un conjunto de <strong>procesos de ejemplo</strong> predefinidos. Es la forma más rápida de explorar el simulador.',
      position: 'top',
    },
    {
      tab: 'processes',
      target: '#process-table',
      title: '📊 Tabla de Procesos Registrados',
      body: 'Aquí aparecen todos los procesos que has agregado. Puedes <strong>hacer clic en cualquier valor</strong> para editarlo directamente. El estado de cada proceso cambia durante la simulación.',
      position: 'top',
    },
    {
      tab: 'processes',
      target: '#btn-go-sched',
      title: '▶ ¡Siguiente: CPU Scheduling!',
      body: 'Cuando tengas al menos un proceso registrado, haz clic aquí para ir al <strong>Módulo 2 — CPU Scheduling</strong>, donde podrás elegir un algoritmo y observar cómo se planifica la ejecución.',
      position: 'top',
    },

    // ── MÓDULO 2: SCHEDULING ──
    {
      tab: 'scheduling',
      target: '#sched-algo',
      title: '🧠 Algoritmo de Planificación',
      body: 'Selecciona el <strong>algoritmo</strong> que decide el orden de ejecución. <em>Non-preemptive</em>: el proceso corre hasta terminar (FCFS, SJF, HRRN). <em>Preemptive</em>: puede ser interrumpido y reemplazado (Round Robin, SRTF, Priority, MLFQ).',
      position: 'right',
    },
    {
      tab: 'scheduling',
      target: '#quantum-group',
      title: '⏱ Quantum — Time Slice',
      body: 'Solo visible en <strong>Round Robin y MLFQ</strong>. Define cuántas unidades de tiempo puede usar la CPU cada proceso antes de ser interrumpido. Quantum pequeño = más justo pero más context switches. Quantum grande = menos switches pero menos equitativo.',
      position: 'right',
    },
    {
      tab: 'scheduling',
      target: '#btn-run-sched',
      title: '▶ Ejecutar / ⏭ Paso a Paso',
      body: '<strong>Ejecutar</strong> corre toda la simulación de una. <strong>Paso a Paso</strong> avanza un tick a la vez para que puedas ver exactamente qué decide el algoritmo en cada momento. Usa el slider de velocidad para ajustar la animación.',
      position: 'right',
    },
    {
      tab: 'scheduling',
      target: '#sched-speed',
      title: '🐢⚡ Velocidad de Animación',
      body: 'Arrastra el slider para controlar qué tan rápido avanza la simulación. Hacia la izquierda = más lento (ideal para entender cada paso). Hacia la derecha = más rápido (para ver el resultado final rápido).',
      position: 'right',
    },
    {
      tab: 'scheduling',
      target: '.cpu-area',
      title: '🖥️ CPU + Colas en Tiempo Real',
      body: 'Durante la simulación verás: la <strong>CPU</strong> ejecutando el proceso actual, la <strong>Cola Ready</strong> con los procesos esperando turno, y la cola <strong>Waiting/Blocked</strong> con procesos bloqueados por I/O.',
      position: 'top',
    },
    {
      tab: 'scheduling',
      target: '#gantt-chart',
      title: '📊 Diagrama de Gantt',
      body: 'El <strong>Gantt</strong> muestra qué proceso tuvo la CPU en cada unidad de tiempo. Cada color = un proceso distinto. Los bloques grises son tiempo <em>idle</em> (CPU inactiva). Al terminar, también ves la tabla de resultados por proceso.',
      position: 'top',
    },
    {
      tab: 'scheduling',
      target: '#metrics-box',
      title: '📈 Métricas Globales',
      body: '<strong>CPU Util.</strong>: % de tiempo que la CPU estuvo ocupada.<br><strong>Avg Wait</strong>: promedio de tiempo esperando en cola.<br><strong>Avg TAT</strong>: tiempo total desde llegada hasta fin.<br><strong>Avg Resp.</strong>: tiempo hasta la primera vez que el proceso usó CPU.',
      position: 'top',
    },
    {
      tab: 'scheduling',
      target: '.mi-doors-panel',
      title: '🚪 Scare Floor — Visualización de Puertas',
      body: 'Esta sección temática de Monsters Inc. muestra los procesos como <strong>monstruos trabajando en estaciones</strong>. La barra de Scream Energy representa el progreso total. El Scare Log registra cada evento de la simulación.',
      position: 'top',
    },

    // ── MÓDULO 3: MEMORIA / PAGINACIÓN ──
    {
      tab: 'memory',
      target: '#mem-frames',
      title: '🗂️ Marcos (Frames) de Memoria',
      body: 'Un <strong>frame</strong> es un bloque físico de memoria RAM. Aquí defines cuántos frames tiene la memoria disponible. A más frames, menos <em>page faults</em> ocurrirán porque caben más páginas simultáneas.',
      position: 'right',
    },
    {
      tab: 'memory',
      target: '#mem-pagesize',
      title: '📐 Tamaño de Página (KB)',
      body: 'Todas las páginas tienen el mismo tamaño fijo. Si un proceso no llena completamente su última página, el espacio sobrante es <strong>fragmentación interna</strong>. La sección de abajo te muestra exactamente cuánto se desperdicia.',
      position: 'right',
    },
    {
      tab: 'memory',
      target: '#mem-refs',
      title: '🔢 Cadena de Referencias',
      body: 'Escribe la secuencia de páginas que los procesos van a solicitar, separadas por coma. Por ejemplo: <em>1,2,3,4,1,2,5</em>. El simulador procesará cada referencia y decidirá si la página ya está en memoria (hit) o hay que cargarla (fault).',
      position: 'right',
    },
    {
      tab: 'memory',
      target: '#mem-algo',
      title: '⚙️ Algoritmo de Reemplazo',
      body: 'Cuando todos los frames están llenos y se necesita una página nueva, hay que sacar una. El algoritmo decide cuál:<br><strong>FIFO</strong>: la más antigua. <strong>LRU</strong>: la menos usada recientemente. <strong>Óptimo</strong>: la que tardará más en usarse (teórico). <strong>Clock / 2ª Oportunidad</strong>: variantes eficientes de LRU.',
      position: 'right',
    },
    {
      tab: 'memory',
      target: '#btn-run-mem',
      title: '▶ Ejecutar / ⏭ Paso a Paso',
      body: 'Como en Scheduling, puedes correr todo de golpe o <strong>paso a paso</strong> para ver cómo el algoritmo decide qué página reemplazar en cada referencia. El botón Paso se activa después de Ejecutar.',
      position: 'top',
    },
    {
      tab: 'memory',
      target: '.mem-counters',
      title: '💥 Page Faults vs Hits',
      body: 'Las métricas clave de memoria: <strong>Page Fault</strong> = la página no estaba en memoria, hubo que cargarla (costoso). <strong>Page Hit</strong> = la página ya estaba disponible (rápido). El <strong>Hit Rate</strong> ideal es lo más alto posible.',
      position: 'top',
    },
    {
      tab: 'memory',
      target: '#frames-vault',
      title: '🏛️ Frames en Tiempo Real',
      body: 'Aquí puedes ver el contenido de cada frame en cada paso. Las páginas resaltadas en verde son <strong>hits</strong>; las rojas son <strong>page faults</strong>. La página que se reemplaza sale con una animación de salida.',
      position: 'top',
    },
    {
      tab: 'memory',
      target: '.frag-panel',
      title: '🔵🟡 Fragmentación Interna',
      body: 'Por cada proceso se muestra cuánta memoria está <strong>realmente usada</strong> (azul) versus cuánto espacio se desperdicia dentro de la última página (amarillo). Esto es fragmentación interna, inevitable con paginación de tamaño fijo.',
      position: 'top',
    },

    // ── MÓDULO 4: THREADS & CORES ──
    {
      tab: 'threads',
      target: '#num-cores',
      title: '🖥️ Número de CPU Cores',
      body: 'Define cuántos <strong>núcleos de CPU</strong> simulará el sistema. Cada core es un Web Worker real del navegador, lo que significa que hay <em>paralelismo genuino</em>: los procesos corren al mismo tiempo, no solo de forma simulada.',
      position: 'right',
    },
    {
      tab: 'threads',
      target: '#thread-algo',
      title: '🧠 Algoritmo para Multi-Core',
      body: 'El algoritmo decide cómo se <strong>distribuyen los procesos</strong> entre los cores disponibles. Con varios cores, múltiples procesos pueden ejecutarse simultáneamente en lugar de esperar turno.',
      position: 'right',
    },
    {
      tab: 'threads',
      target: '#cores-grid',
      title: '🟢 Estado de Cores en Tiempo Real',
      body: 'Cada tarjeta representa un <strong>core activo</strong>. Verás qué proceso está corriendo en cada uno, cuánto tiempo lleva, y si está idle. Cuando varios cores trabajan al mismo tiempo, estás viendo <em>paralelismo real</em>.',
      position: 'top',
    },
    {
      tab: 'threads',
      target: '#demo-cores-area',
      title: '⚡ Demostración de Paralelismo Real',
      body: 'Esta prueba lanza N workers simultáneos con carga computacional real (<em>operaciones Math.sqrt</em>). Si el tiempo total es menor que la suma individual, el paralelismo es genuino. El <strong>Speedup</strong> te dice cuántas veces más rápido fue el paralelo vs. el secuencial.',
      position: 'top',
    },
    {
      tab: 'threads',
      target: '#thread-log',
      title: '📟 Thread Event Log',
      body: 'Registro en tiempo real de todos los eventos de threads: cuándo inicia un worker, cuándo termina, si hubo context switches entre cores. Es equivalente al Event Log del módulo de estados.',
      position: 'top',
    },

    // ── MÓDULO 5: COMPARACIÓN ──
    {
      tab: 'comparison',
      target: '#cmp-proc-source',
      title: '📋 Procesos a Comparar',
      body: 'Elige qué conjunto de procesos usar para la comparación: los que ya tienes registrados, el <strong>ejemplo estándar</strong> de 6 procesos, o la carga pesada de 8 procesos. Todos los algoritmos usarán exactamente los mismos datos.',
      position: 'right',
    },
    {
      tab: 'comparison',
      target: '#cmp-quantum',
      title: '⏱ Quantum para la Comparación',
      body: 'Los algoritmos preemptivos como <strong>Round Robin y MLFQ</strong> necesitan un quantum. Este valor se aplica a todos ellos en la comparación para que la prueba sea justa bajo las mismas condiciones.',
      position: 'right',
    },
    {
      tab: 'comparison',
      target: '#cmp-all-grid',
      title: '⚔️ Resultados: Todos los Algoritmos',
      body: 'Después de comparar, aquí aparece una tarjeta por cada algoritmo con su <strong>Gantt, métricas y Door Simulation</strong>. Puedes ver de un vistazo cuál tiene menor tiempo de espera, mejor uso de CPU o menos context switches.',
      position: 'top',
    },
    {
      tab: 'comparison',
      target: '#cmp-all-summary',
      title: '🏆 Ranking Global',
      body: 'La tabla de ranking resume qué algoritmo ganó en cada métrica. Cada uno recibe una <strong>puntuación compuesta</strong>. Úsala para argumentar en tu presentación cuál algoritmo es mejor según el escenario de uso.',
      position: 'top',
    },
  ];

  // ═══════════════════════════════════════════
  // CLAVES DE ALMACENAMIENTO
  // ═══════════════════════════════════════════

  const STORAGE_KEY_DONE    = 'mi_tutorial_done';
  const STORAGE_KEY_PAUSED  = 'mi_tutorial_paused_step'; // sessionStorage: se limpia al cerrar pestaña

  // ═══════════════════════════════════════════
  // ESTADO INTERNO DEL TUTORIAL
  // ═══════════════════════════════════════════

  let currentStep = 0;
  let isActive    = false;
  let isPaused    = false;
  let overlay, spotlight, tooltip, progressBar, btnPrev, btnNext, btnSkip, btnPause, stepCounter;
  let resumeBtn = null; // botón flotante "Continuar tutorial"

  // ═══════════════════════════════════════════
  // CREAR ELEMENTOS DEL DOM
  // ═══════════════════════════════════════════

  function buildDOM() {
    // Overlay con hole
    overlay = document.createElement('div');
    overlay.id = 'tut-overlay';
    overlay.innerHTML = `
      <svg id="tut-svg" style="position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9998">
        <defs>
          <mask id="tut-mask">
            <rect width="100%" height="100%" fill="white"/>
            <rect id="tut-hole" rx="8" fill="black"/>
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.72)" mask="url(#tut-mask)"/>
      </svg>
    `;

    // Tooltip flotante
    tooltip = document.createElement('div');
    tooltip.id = 'tut-tooltip';
    tooltip.innerHTML = `
      <div class="tut-header">
        <span id="tut-title"></span>
        <button id="tut-skip" title="Saltar tutorial">✕</button>
      </div>
      <div id="tut-body"></div>
      <div class="tut-footer">
        <div class="tut-progress-wrap"><div class="tut-progress-fill" id="tut-progress-fill"></div></div>
        <div class="tut-step-counter" id="tut-step-counter"></div>
        <div class="tut-btns">
          <button id="tut-prev">← Anterior</button>
          <button id="tut-pause" title="Pausar y explorar la interfaz">⏸ Pausar</button>
          <button id="tut-next">Siguiente →</button>
        </div>
      </div>
    `;

    // Estilos
    const style = document.createElement('style');
    style.textContent = `
      #tut-overlay {
        position: fixed; inset: 0; z-index: 9997; pointer-events: none;
      }
      #tut-tooltip {
        position: fixed;
        z-index: 9999;
        background: #1a1f2e;
        border: 1.5px solid #4a90d9;
        border-radius: 12px;
        padding: 16px 18px 14px;
        width: 300px;
        max-width: 90vw;
        box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(74,144,217,0.2);
        font-family: 'Quicksand', sans-serif;
        color: #e8eaf0;
        pointer-events: all;
        transition: top 0.25s cubic-bezier(.4,0,.2,1), left 0.25s cubic-bezier(.4,0,.2,1), opacity 0.2s;
      }
      #tut-tooltip::before {
        content: '';
        position: absolute;
        width: 10px; height: 10px;
        background: #1a1f2e;
        border: 1.5px solid #4a90d9;
        transform: rotate(45deg);
        z-index: -1;
      }
      #tut-tooltip.pos-right::before  { left: -6px; top: 20px; border-right: none; border-top: none; }
      #tut-tooltip.pos-left::before   { right: -6px; top: 20px; border-left: none; border-bottom: none; }
      #tut-tooltip.pos-top::before    { bottom: -6px; left: 20px; border-left: none; border-top: none; }
      #tut-tooltip.pos-bottom::before { top: -6px; left: 20px; border-right: none; border-bottom: none; }

      .tut-header {
        display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;
      }
      #tut-title {
        font-size: 14px; font-weight: 700; color: #7bb8f8; line-height: 1.3; flex: 1;
      }
      #tut-skip {
        background: none; border: none; color: #666; font-size: 16px; cursor: pointer;
        padding: 0 0 0 8px; line-height: 1; transition: color 0.2s;
      }
      #tut-skip:hover { color: #e74c3c; }
      #tut-body {
        font-size: 12.5px; line-height: 1.6; color: #c8cdd8; margin-bottom: 14px;
      }
      #tut-body strong { color: #fff; }
      #tut-body em { color: #7bb8f8; font-style: normal; }
      .tut-footer {
        display: flex; flex-direction: column; gap: 8px;
      }
      .tut-progress-wrap {
        height: 3px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden;
      }
      .tut-progress-fill {
        height: 100%; background: linear-gradient(90deg, #4a90d9, #7bb8f8);
        border-radius: 2px; transition: width 0.3s ease;
      }
      .tut-step-counter {
        font-size: 10px; color: #555; text-align: right;
      }
      .tut-btns {
        display: flex; gap: 8px; justify-content: flex-end; align-items: center;
      }
      .tut-btns button {
        padding: 6px 14px; border-radius: 6px; border: none; cursor: pointer;
        font-size: 11px; font-family: 'Quicksand', sans-serif; font-weight: 600;
        transition: all 0.15s;
      }
      #tut-prev {
        background: rgba(255,255,255,0.07); color: #aaa;
      }
      #tut-prev:hover { background: rgba(255,255,255,0.13); color: #fff; }
      #tut-next {
        background: linear-gradient(135deg, #4a90d9, #357abd); color: #fff;
      }
      #tut-next:hover { background: linear-gradient(135deg, #5a9fe8, #4a90d9); transform: translateY(-1px); }

      /* ── Botón de pausa ── */
      #tut-pause {
        background: rgba(255, 190, 50, 0.12);
        color: #f0c040;
        border: 1px solid rgba(240,192,64,0.35) !important;
      }
      #tut-pause:hover {
        background: rgba(255, 190, 50, 0.22);
        color: #ffd966;
      }

      /* ── Botón flotante "Continuar tutorial" ── */
      #tut-resume-btn {
        position: fixed;
        bottom: 72px; /* encima del botón Tutorial */
        right: 24px;
        z-index: 9001;
        background: linear-gradient(135deg, #f0a500, #c47a00);
        color: #fff; border: none; border-radius: 50px;
        padding: 10px 18px;
        font-family: 'Quicksand', sans-serif; font-weight: 700; font-size: 13px;
        cursor: pointer; box-shadow: 0 4px 20px rgba(240,165,0,0.45);
        transition: all 0.2s; display: flex; align-items: center; gap: 7px;
        animation: tut-resume-pulse 2s ease-in-out infinite;
      }
      #tut-resume-btn:hover {
        transform: translateY(-2px); box-shadow: 0 6px 24px rgba(240,165,0,0.65);
      }
      @keyframes tut-resume-pulse {
        0%, 100% { box-shadow: 0 4px 20px rgba(240,165,0,0.45); }
        50%       { box-shadow: 0 4px 28px rgba(240,165,0,0.75); }
      }

      /* Highlight ring around the target element */
      .tut-highlight-ring {
        position: fixed !important;
        pointer-events: none !important;
        z-index: 9996 !important;
        border: 2.5px solid #4a90d9 !important;
        border-radius: 10px !important;
        box-shadow: 0 0 0 4px rgba(74,144,217,0.25), 0 0 20px rgba(74,144,217,0.3) !important;
        transition: all 0.25s cubic-bezier(.4,0,.2,1) !important;
        animation: tut-pulse 1.8s ease-in-out infinite !important;
      }
      @keyframes tut-pulse {
        0%, 100% { box-shadow: 0 0 0 4px rgba(74,144,217,0.25), 0 0 20px rgba(74,144,217,0.3); }
        50%       { box-shadow: 0 0 0 7px rgba(74,144,217,0.15), 0 0 30px rgba(74,144,217,0.5); }
      }

      /* Tutorial launch button */
      #tut-launch-btn {
        position: fixed;
        bottom: 24px; right: 24px;
        z-index: 9000;
        background: linear-gradient(135deg, #4a90d9, #357abd);
        color: #fff; border: none; border-radius: 50px;
        padding: 10px 18px;
        font-family: 'Quicksand', sans-serif; font-weight: 700; font-size: 13px;
        cursor: pointer; box-shadow: 0 4px 20px rgba(74,144,217,0.45);
        transition: all 0.2s; display: flex; align-items: center; gap: 7px;
      }
      #tut-launch-btn:hover {
        transform: translateY(-2px); box-shadow: 0 6px 24px rgba(74,144,217,0.6);
      }
      #tut-launch-btn .tut-btn-icon { font-size: 16px; }

      /* Welcome modal */
      #tut-welcome {
        position: fixed; inset: 0; z-index: 10000;
        background: rgba(0,0,0,0.8);
        display: flex; align-items: center; justify-content: center;
      }
      .tut-welcome-card {
        background: #1a1f2e; border: 1.5px solid #4a90d9; border-radius: 16px;
        padding: 32px; max-width: 420px; width: 90%;
        text-align: center; font-family: 'Quicksand', sans-serif; color: #e8eaf0;
        box-shadow: 0 16px 64px rgba(0,0,0,0.7);
      }
      .tut-welcome-card h2 {
        font-size: 20px; color: #7bb8f8; margin-bottom: 12px;
      }
      .tut-welcome-card p {
        font-size: 13px; color: #b0b7c3; line-height: 1.6; margin-bottom: 20px;
      }
      .tut-welcome-btns { display: flex; gap: 10px; justify-content: center; }
      .tut-welcome-btns button {
        padding: 10px 22px; border-radius: 8px; border: none;
        font-family: 'Quicksand', sans-serif; font-weight: 700; font-size: 13px; cursor: pointer;
        transition: all 0.2s;
      }
      .tut-btn-start {
        background: linear-gradient(135deg, #4a90d9, #357abd); color: #fff;
      }
      .tut-btn-start:hover { transform: translateY(-1px); filter: brightness(1.1); }
      .tut-btn-dismiss {
        background: rgba(255,255,255,0.07); color: #aaa;
      }
      .tut-btn-dismiss:hover { background: rgba(255,255,255,0.13); color: #fff; }
    `;

    document.head.appendChild(style);
    document.body.appendChild(overlay);
    document.body.appendChild(tooltip);

    // Crear ring de highlight
    spotlight = document.createElement('div');
    spotlight.className = 'tut-highlight-ring';
    spotlight.id = 'tut-ring';
    spotlight.style.display = 'none';
    document.body.appendChild(spotlight);

    // Botón de lanzamiento permanente
    const launchBtn = document.createElement('button');
    launchBtn.id = 'tut-launch-btn';
    launchBtn.innerHTML = '<span class="tut-btn-icon">❓</span> Tutorial';
    launchBtn.addEventListener('click', startTutorial);
    document.body.appendChild(launchBtn);

    // Guardar referencias
    btnSkip  = document.getElementById('tut-skip');
    btnPrev  = document.getElementById('tut-prev');
    btnNext  = document.getElementById('tut-next');
    btnPause = document.getElementById('tut-pause');
    stepCounter = document.getElementById('tut-step-counter');

    btnSkip.addEventListener('click', endTutorial);
    btnPrev.addEventListener('click', prevStep);
    btnNext.addEventListener('click', nextStep);
    btnPause.addEventListener('click', pauseTutorial);

    // Ocultar tooltip inicialmente
    tooltip.style.display = 'none';
    overlay.style.display  = 'none';
  }

  // ═══════════════════════════════════════════
  // PAUSA Y REANUDACIÓN
  // ═══════════════════════════════════════════

  /**
   * Pausa el tutorial: oculta el overlay y el tooltip,
   * guarda el paso actual en sessionStorage y muestra
   * el botón flotante "Continuar tutorial".
   */
  function pauseTutorial() {
    isActive = false;
    isPaused = true;

    // Guardar paso actual
    sessionStorage.setItem(STORAGE_KEY_PAUSED, String(currentStep));

    // Ocultar UI del tutorial
    overlay.style.display   = 'none';
    tooltip.style.display   = 'none';
    spotlight.style.display = 'none';
    clearHole();

    // Mostrar botón "Continuar"
    showResumeButton();

    // Toast informativo
    showToast('⏸ Tutorial pausado. Explora libremente y pulsa "Continuar" cuando quieras.', 'info');
  }

  /**
   * Reanuda desde el paso guardado.
   */
  function resumeTutorial() {
    const saved = sessionStorage.getItem(STORAGE_KEY_PAUSED);
    const step  = saved !== null ? parseInt(saved, 10) : 0;

    // Limpiar estado de pausa
    sessionStorage.removeItem(STORAGE_KEY_PAUSED);
    isPaused = false;

    hideResumeButton();
    startTutorial(step);
  }

  /**
   * Crea y muestra el botón flotante "Continuar tutorial".
   */
  function showResumeButton() {
    if (resumeBtn) return; // ya existe

    resumeBtn = document.createElement('button');
    resumeBtn.id = 'tut-resume-btn';

    const saved    = sessionStorage.getItem(STORAGE_KEY_PAUSED);
    const stepNum  = saved !== null ? parseInt(saved, 10) + 1 : 1;
    const stepName = TUTORIAL_STEPS[parseInt(saved, 10)]?.title || '';

    resumeBtn.innerHTML = `▶ Continuar tutorial <small style="opacity:.7;font-size:10px;display:block;margin-top:1px">Paso ${stepNum}/${TUTORIAL_STEPS.length}</small>`;
    resumeBtn.title     = stepName;
    resumeBtn.addEventListener('click', resumeTutorial);
    document.body.appendChild(resumeBtn);
  }

  /**
   * Elimina el botón flotante "Continuar tutorial".
   */
  function hideResumeButton() {
    if (resumeBtn) {
      resumeBtn.remove();
      resumeBtn = null;
    }
  }

  // ═══════════════════════════════════════════
  // MODAL DE BIENVENIDA
  // ═══════════════════════════════════════════

  function showWelcomeModal() {
    const modal = document.createElement('div');
    modal.id = 'tut-welcome';
    modal.innerHTML = `
      <div class="tut-welcome-card">
        <div style="font-size:40px;margin-bottom:12px">👾</div>
        <h2>¡Bienvenido al Simulador!</h2>
        <p>
          Parece que es tu primera visita. Este simulador de sistemas operativos
          tiene varios módulos: procesos, scheduling, memoria y más.<br><br>
          ¿Quieres un <strong style="color:#7bb8f8">tour guiado</strong> que te
          explique paso a paso qué hace cada campo y cómo usar el simulador?
        </p>
        <div class="tut-welcome-btns">
          <button class="tut-btn-start" id="tut-welcome-start">🚀 Sí, guíame</button>
          <button class="tut-btn-dismiss" id="tut-welcome-skip">Explorar solo</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('tut-welcome-start').addEventListener('click', () => {
      modal.remove();
      startTutorial();
    });
    document.getElementById('tut-welcome-skip').addEventListener('click', () => {
      modal.remove();
      localStorage.setItem(STORAGE_KEY_DONE, '1');
    });
  }

  // ═══════════════════════════════════════════
  // LÓGICA PRINCIPAL
  // ═══════════════════════════════════════════

  /**
   * @param {number} [fromStep=0] - Paso desde el que iniciar (para reanudación).
   */
  function startTutorial(fromStep = 0) {
    isActive    = true;
    isPaused    = false;
    currentStep = (typeof fromStep === 'number' && fromStep >= 0) ? fromStep : 0;

    overlay.style.display   = 'block';
    tooltip.style.display   = 'block';
    spotlight.style.display = 'block';

    // Si se reanuda desde un paso > 0, mostrarlo en el label del botón de pausa
    if (currentStep > 0) {
      showToast(`▶ Tutorial reanudado en el paso ${currentStep + 1}`, 'success');
    }

    renderStep();
  }

  function endTutorial() {
    isActive = false;
    isPaused = false;

    overlay.style.display   = 'none';
    tooltip.style.display   = 'none';
    spotlight.style.display = 'none';
    clearHole();

    // Limpiar cualquier pausa pendiente
    sessionStorage.removeItem(STORAGE_KEY_PAUSED);
    hideResumeButton();

    localStorage.setItem(STORAGE_KEY_DONE, '1');
  }

  function nextStep() {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      currentStep++;
      // Mantener el paso guardado actualizado mientras se avanza (por si pausa después)
      if (isPaused) sessionStorage.setItem(STORAGE_KEY_PAUSED, String(currentStep));
      renderStep();
    } else {
      endTutorial();
      showFinishedToast();
    }
  }

  function prevStep() {
    if (currentStep > 0) {
      currentStep--;
      renderStep();
    }
  }

  function renderStep() {
    const step = TUTORIAL_STEPS[currentStep];

    // Cambiar de tab si es necesario
    switchTab(step.tab);

    // Esperar a que el DOM se actualice tras cambio de tab
    setTimeout(() => {
      const target = document.querySelector(step.target);
      if (!target) { nextStep(); return; }

      // Scroll hasta el elemento
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });

      setTimeout(() => {
        const rect = target.getBoundingClientRect();
        const pad  = 8;

        // Actualizar hole del SVG
        const hole = document.getElementById('tut-hole');
        if (hole) {
          hole.setAttribute('x',      rect.left  - pad);
          hole.setAttribute('y',      rect.top   - pad);
          hole.setAttribute('width',  rect.width  + pad * 2);
          hole.setAttribute('height', rect.height + pad * 2);
        }

        // Mover ring de highlight
        spotlight.style.left   = (rect.left  - pad) + 'px';
        spotlight.style.top    = (rect.top   - pad) + 'px';
        spotlight.style.width  = (rect.width  + pad * 2) + 'px';
        spotlight.style.height = (rect.height + pad * 2) + 'px';
        spotlight.style.display = 'block';

        // Posicionar tooltip
        positionTooltip(rect, step.position || 'right');

        // Contenido
        document.getElementById('tut-title').innerHTML = step.title;
        document.getElementById('tut-body').innerHTML  = step.body;

        // Progreso
        const pct = ((currentStep + 1) / TUTORIAL_STEPS.length) * 100;
        document.getElementById('tut-progress-fill').style.width = pct + '%';
        stepCounter.textContent = `Paso ${currentStep + 1} de ${TUTORIAL_STEPS.length}`;

        // Botones
        btnPrev.style.opacity = currentStep === 0 ? '0.3' : '1';
        btnPrev.disabled      = currentStep === 0;
        btnNext.textContent   = currentStep === TUTORIAL_STEPS.length - 1
          ? 'Finalizar ✓' : 'Siguiente →';

        // Posición de la flechita
        tooltip.className = 'pos-' + (step.position || 'right');

      }, 150);
    }, 80);
  }

  function positionTooltip(rect, position) {
    const TW = 310, TH = 220, margin = 16;
    const vw = window.innerWidth, vh = window.innerHeight;
    let left, top;

    switch (position) {
      case 'right':
        left = rect.right + margin;
        top  = rect.top + (rect.height / 2) - (TH / 2);
        if (left + TW > vw) { left = rect.left - TW - margin; tooltip.className = 'pos-left'; }
        break;
      case 'left':
        left = rect.left - TW - margin;
        top  = rect.top + (rect.height / 2) - (TH / 2);
        if (left < 0) { left = rect.right + margin; tooltip.className = 'pos-right'; }
        break;
      case 'top':
        top  = rect.top - TH - margin;
        left = rect.left + (rect.width / 2) - (TW / 2);
        if (top < 0) { top = rect.bottom + margin; tooltip.className = 'pos-bottom'; }
        break;
      case 'bottom':
        top  = rect.bottom + margin;
        left = rect.left + (rect.width / 2) - (TW / 2);
        if (top + TH > vh) { top = rect.top - TH - margin; tooltip.className = 'pos-top'; }
        break;
    }

    // Clamp dentro de la pantalla
    left = Math.max(margin, Math.min(left, vw - TW - margin));
    top  = Math.max(margin, Math.min(top, vh - TH - margin));

    tooltip.style.left = left + 'px';
    tooltip.style.top  = top  + 'px';
  }

  function clearHole() {
    const hole = document.getElementById('tut-hole');
    if (hole) { hole.setAttribute('width', '0'); hole.setAttribute('height', '0'); }
    if (spotlight) spotlight.style.display = 'none';
  }

  // ═══════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════

  function switchTab(tabId) {
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
      if (btn.getAttribute('data-tab') === tabId) btn.click();
    });
  }

  /**
   * Muestra un toast genérico.
   * @param {string} text
   * @param {'success'|'info'|'warning'} type
   */
  function showToast(text, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = text;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  function showFinishedToast() {
    showToast('✅ ¡Tutorial completado! Ya sabes usar el simulador.', 'success');
  }

  // ═══════════════════════════════════════════
  // INICIALIZACIÓN
  // ═══════════════════════════════════════════

  function init() {
    buildDOM();

    const done   = localStorage.getItem(STORAGE_KEY_DONE);
    const paused = sessionStorage.getItem(STORAGE_KEY_PAUSED);

    if (paused !== null) {
      // Había una pausa activa: mostrar el botón "Continuar" directamente
      isPaused = true;
      showResumeButton();
    } else if (!done) {
      // Primera visita: mostrar modal de bienvenida
      setTimeout(showWelcomeModal, 800);
    }

    // Reposicionar en resize
    window.addEventListener('resize', () => {
      if (isActive) renderStep();
    });
  }

  // Esperar al DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();