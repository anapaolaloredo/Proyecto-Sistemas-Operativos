# 🏭 Proyecto Final: Sistemas Operativos (S.O. Monsters Inc.)
**Simulador Visual de Procesos, Planificación de CPU, Paginación de Memoria y Multi-Threading**

Este proyecto es un simulador interactivo y didáctico diseñado para enseñar los conceptos fundamentales de los Sistemas Operativos utilizando una temática visual inspirada en *Monsters, Inc.*. A través de sus módulos, los usuarios pueden comprender de manera gráfica cómo una computadora administra sus recursos, procesa tareas concurrentes y gestiona su memoria RAM.

Se registran procesos, se planean según su enfoque, se puede realizar la paginación y se observan threads, así como una comparación entre todos.

## 🚀 Instrucciones de Ejecución
1. Descargar y descomprimir el archivo `.zip`.
2. Abrir la carpeta `proyecto_final`.
3. Ejecutar el archivo `index.html` haciendo doble clic (se abrirá automáticamente en tu navegador web predeterminado). *No se requiere instalación de software adicional ni servidores locales.*

---

## 📖 Manual de Usuario

El simulador está dividido en 5 módulos principales, accesibles a través de la barra de navegación superior. A continuación, se explica cómo utilizar cada uno:

### 1. Módulo 1: Carga de Procesos (Monster Registry)
Aquí es donde "creamos" las tareas (procesos) que la computadora deberá resolver. Cada proceso está representado por una puerta.
* **PID:** El identificador único de la tarea.
* **Forks (Hijos):** Simula la creación dinámica de procesos. Si colocas "2", el sistema creará el proceso original y 2 copias exactas que heredarán sus mismos valores.
* **Arrival Time:** El milisegundo exacto en el que el proceso entra al sistema.
* **Burst Time Total:** El tiempo total de procesamiento (esfuerzo) que requiere la tarea para completarse.
* **Hilos (Threads):** ¡Divide y vencerás! Si un proceso tiene un *Burst* de 10 y eliges 2 Hilos, el simulador dividirá la tarea en 2 partes de 5 unidades cada una. Estos hilos podrán ejecutarse de forma independiente.
* **Prioridad:** Nivel de urgencia. (Un número más bajo indica mayor prioridad, ej. 1 es más urgente que 3).
* **Páginas:** La cantidad de bloques de memoria RAM que este proceso necesita para existir.

*💡 Tip: Puedes usar el botón **"Preset Heavy"** para cargar automáticamente un conjunto de procesos de prueba complejos.*

### 2. Módulo 2: CPU Scheduling (Scare Floor)
En este módulo observarás cómo el sistema decide qué hilo ejecutar primero si solo tuviera **1 núcleo de procesamiento**.
1. **Selecciona un algoritmo:** En el menú desplegable, elige cómo quieres ordenar las tareas. Tienes opciones No Apropiativas (como *FCFS* o *SJF*, que no interrumpen tareas) y Apropiativas (como *Round Robin* o *SRTF*, que pausan tareas para dar turno a otras).
2. **Quantum:** Si eliges *Round Robin*, define el tiempo máximo que un hilo puede estar en la CPU antes de ser pausado.
3. **Ejecutar:** Presiona "Ejecutar Planificación" para ver la magia.
* **Resultados:** Observa el *Diagrama de Gantt* (la línea de tiempo). Si pasas el cursor sobre la tabla de resultados en la parte inferior, aparecerán **fórmulas explicativas** (*Tooltips*) enseñándote exactamente cómo se calculó el tiempo de espera (Wait Time), Turnaround (TAT), etc.

### 3. Módulo 3: Paginación de Memoria (Door Vault)
Aquí visualizamos cómo la RAM acomoda los procesos mediante "Páginas" y "Marcos" (Frames). Como la memoria es limitada, el sistema debe decidir a quién sacar cuando se llena.
1. **Configura la RAM:** Define la memoria física total y el tamaño de página.
2. **Cadena de Referencias:** Es el orden en el que la CPU manda a llamar a las páginas.
3. **Algoritmo de Reemplazo:** Elige cómo decidir a quién sacar (FIFO, LRU, Óptimo, Reloj, Segunda Oportunidad).
4. **Simular:** Utiliza los controles de reproducción o el botón de "Paso a Paso" para ver cómo se cargan las puertas en los marcos. Si una puerta ya estaba, es un **HIT** (acierto verde). Si no estaba y hay que traerla, es un **FAULT** (fallo rojo).
* **Fragmentación Interna:** Al final de la página, verás una gráfica que calcula cuánta memoria se está desperdiciando porque las páginas no encajan perfectamente.

### 4. Módulo 4: Simulación Cores (Threads & Paralelismo)
¿Qué pasa cuando tenemos una computadora moderna con múltiples núcleos (Multi-Core)?
1. **Núcleos de CPU:** Selecciona cuántos Cores físicos quieres simular (ej. Quad-Core = 4 núcleos).
2. **Ejecutar Paralelismo:** Observa el tablero de control. A diferencia del Módulo 2, aquí verás que **múltiples hilos (Threads) y procesos hijos (Forks) se ejecutan al mismo instante** en diferentes núcleos.
3. **Análisis:** La línea de tiempo te demostrará cómo una tarea pesada se resuelve mucho más rápido si sus hilos se reparten entre varios núcleos en lugar de ejecutarse uno tras otro.

### 5. Módulo 5: Comparación (Campo de Batalla)
¿No sabes qué algoritmo es mejor? 
* Ve a este módulo, selecciona una carga de procesos y enfrenta cara a cara dos algoritmos distintos (ej. *Round Robin* vs *SRTF*). 
* El sistema generará las gráficas, calculará el rendimiento y coronará a un ganador con base en quién tuvo menos tiempo de espera y mayor uso de CPU.

---

## 👥 Equipo de Desarrollo
**Alumnos y Matrículas:**
- **Estefania Nájera de la Rosa – 614978** (Creación de poster, diseño de interfaz y resumen de teoría)
- **Victor Hugo Gutierrez Cavazos – 612081** (Desarrollo de backend)
- **Ana Paola Loredo Moreno - 613772** (Diseño de arquitectura de sistema y frontend)
- **Christopher Brandon Reeker Cireno - 610220** (Testing y revisión de código apegado a teoría)
