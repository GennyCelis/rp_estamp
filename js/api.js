const STORAGE_KEY_DB_CACHE = 'prodsys_db_cache';
const STORAGE_KEY_DB_TIMESTAMP = 'prodsys_db_timestamp';

/**
 * Carga un script JavaScript externo de forma dinámica bajo demanda (Lazy Loading).
 * @param {string} url - URL del script a cargar
 * @returns {Promise<void>}
 */
function cargarScriptDinamico(url) {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${url}"]`)) {
            return resolve();
        }
        const s = document.createElement('script');
        s.src = url;
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error(`Error al cargar script dinámico: ${url}`));
        document.head.appendChild(s);
    });
}

/**
 * Actualiza el indicador de sincronización en segundo plano en la barra lateral.
 * @param {'sincronizando' | 'exito' | 'error' | 'cached'} estado 
 * @param {string} mensaje 
 */
function actualizarIndicadorSincronizacion(estado, mensaje) {
    const cont = document.getElementById('sync-status-indicator');
    const dot = document.getElementById('sync-status-dot');
    const txt = document.getElementById('sync-status-text');
    if (!cont || !dot || !txt) return;

    cont.classList.remove('hidden');
    cont.classList.add('flex');

    if (estado === 'sincronizando') {
        cont.className = 'hidden md:flex items-center gap-1.5 px-3 py-1.5 mx-2 mb-3 rounded-lg bg-blue-950/40 border border-blue-800/40 text-[11px] font-semibold text-blue-300 transition-all duration-300';
        dot.className = 'w-2 h-2 rounded-full bg-blue-400 animate-pulse';
        txt.innerText = mensaje || 'Sincronizando...';
    } else if (estado === 'exito') {
        cont.className = 'hidden md:flex items-center gap-1.5 px-3 py-1.5 mx-2 mb-3 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-[11px] font-semibold text-emerald-300 transition-all duration-300';
        dot.className = 'w-2 h-2 rounded-full bg-emerald-400';
        txt.innerText = mensaje || '✓ Actualizado';
    } else if (estado === 'error') {
        cont.className = 'hidden md:flex items-center gap-1.5 px-3 py-1.5 mx-2 mb-3 rounded-lg bg-amber-950/40 border border-amber-800/40 text-[11px] font-semibold text-amber-300 transition-all duration-300';
        dot.className = 'w-2 h-2 rounded-full bg-amber-400';
        txt.innerText = mensaje || '⚠️ Modo Local';
    } else if (estado === 'cached') {
        cont.className = 'hidden md:flex items-center gap-1.5 px-3 py-1.5 mx-2 mb-3 rounded-lg bg-slate-800/50 border border-slate-700/50 text-[11px] font-semibold text-slate-300 transition-all duration-300';
        dot.className = 'w-2 h-2 rounded-full bg-cyan-400 animate-pulse';
        txt.innerText = mensaje || 'Caché activo';
    }
}

/**
 * Aplica los datos estructurados en todos los selectores, listas, formularios y vistas.
 * @param {Object} db - Estructura base de datos con hojas del sistema
 */
function aplicarDatosEnInterfaz(db) {
    if (!db || typeof db !== 'object') return;

    // 1. Personal filtrado por puesto/estado
    const maquinistas = filtrarTrabajadores(db.Trabajadores, { puesto: "Maquinista" });
    const supervisores = filtrarTrabajadores(db.Trabajadores, { puesto: "Supervisor" });
    const ayudantesActivos = filtrarTrabajadores(db.Trabajadores, { estado: "Activo" });
    llenarSelect("select-maquinista", maquinistas, "Trabajador");
    llenarSelect("select-supervisor", supervisores, "Trabajador");
    llenarSelect("select-inspeccion", db.Inspeccion, "Inspeccion");
    if (typeof autoSeleccionarInspectoraActiva === 'function') {
        autoSeleccionarInspectoraActiva();
    }

    // 2. Otros campos maestros
    llenarSelect("select-turno", db.Turno, "Turnos");
    llenarSelect("select-maquina", db.Maquina, "maquina");
    llenarSelect("dash-maquina-filter", db.Maquina, "maquina");
    llenarSelect("dash-maquina-tall-filter", db.Maquina, "maquina");
    llenarSelect("dash-maquina-minutos-filter", db.Maquina, "maquina");
    llenarSelect("select-tipo", db.Tipo, "Tipo");
    llenarSelect("select-ayudantes", ayudantesActivos, "Trabajador");

    // 2.1 Filtrar OPs para que sean únicas (desde Op y Ts)
    const opsUnicas = [];
    const controlOPs = new Set();
    if (Array.isArray(db.Op)) {
        db.Op.forEach(item => {
            const opVal = item.OrdenPedido || item.OP || item.Op;
            if (opVal && !controlOPs.has(norm(opVal))) {
                controlOPs.add(norm(opVal));
                opsUnicas.push({ OrdenPedido: String(opVal).trim() });
            }
        });
    }
    if (Array.isArray(db.Ts)) {
        db.Ts.forEach(item => {
            const opVal = getRowValue(item, 'OP');
            if (opVal && !controlOPs.has(norm(opVal))) {
                controlOPs.add(norm(opVal));
                opsUnicas.push({ OrdenPedido: String(opVal).trim() });
            }
        });
    }
    llenarDatalist("list-op", opsUnicas, "OrdenPedido");

    // Normalizar máquinas y precalcular TS/MinProducidos para registros históricos
    procesarYNormalizarBase(db.Base, db.Ts);

    // Inicializar opciones del módulo de Registro de TS
    if (typeof inicializarModuloTS === 'function') {
        inicializarModuloTS();
    }

    // Reconciliar registros locales pendientes con los datos del servidor
    if (typeof reconciliarRegistrosLocalesConBase === 'function') {
        reconciliarRegistrosLocalesConBase(db.Base);
    }

    // Actualizar el Dashboard con los datos cargados
    if (typeof actualizarDashboard === 'function') {
        actualizarDashboard();
    }

    // Actualizar la Tabla con los datos cargados
    if (typeof poblarFiltroMaquinaTabla === 'function') {
        poblarFiltroMaquinaTabla();
    }
    if (typeof renderTable === 'function') {
        renderTable();
    }
}

/**
 * Carga los datos de Google Sheets implementando Stale-While-Revalidate (SWR):
 * 1. Hidrata inmediatamente con datos en caché de localStorage (<0.05s) para interactividad instantánea.
 * 2. En segundo plano consulta la API para actualizar y persistir cambios frescos.
 * @param {boolean} esSegundoPlano - True si se ejecuta en segundo plano sin pantalla de carga bloqueante.
 */
async function cargarDatosDeHojas(esSegundoPlano = false) {
    // ── 1. Estrategia SWR: Hidratación instantánea desde caché local ─────────────
    if (!esSegundoPlano) {
        try {
            const rawCache = localStorage.getItem(STORAGE_KEY_DB_CACHE);
            if (rawCache) {
                const cachedDb = JSON.parse(rawCache);
                if (cachedDb && typeof cachedDb === 'object') {
                    baseDeDatos = cachedDb;
                    aplicarDatosEnInterfaz(baseDeDatos);
                    actualizarIndicadorSincronizacion('cached', 'Caché cargado');
                    // Iniciar sincronización en segundo plano sin bloquear la pantalla
                    cargarDatosDeHojas(true);
                    return;
                }
            }
        } catch (errCache) {
            console.warn("No se pudo leer caché local:", errCache);
        }
        mostrarLoader(true);
    }

    actualizarIndicadorSincronizacion('sincronizando', 'Sincronizando...');

    // ── 2. Descarga de datos frescos desde el servidor ─────────────────────────
    try {
        const res = await fetch(WEB_APP_URL);
        const dataFresh = await res.json();

        if (dataFresh && typeof dataFresh === 'object') {
            baseDeDatos = dataFresh;

            // Guardar en caché local para la próxima apertura instantánea
            try {
                localStorage.setItem(STORAGE_KEY_DB_CACHE, JSON.stringify(dataFresh));
                localStorage.setItem(STORAGE_KEY_DB_TIMESTAMP, String(Date.now()));
            } catch (errStorage) {
                console.warn("No se pudo persistir en localStorage (límite de cuota):", errStorage);
            }

            aplicarDatosEnInterfaz(baseDeDatos);
            actualizarIndicadorSincronizacion('exito', '✓ Actualizado');
        }
    } catch (e) {
        console.error("Error en carga de datos desde Google Sheets:", e);
        actualizarIndicadorSincronizacion('error', '⚠️ Sin conexión');
        if (!esSegundoPlano && (!baseDeDatos || Object.keys(baseDeDatos).length <= 1)) {
            alert("Aviso: No se pudo conectar con el servidor de Google Sheets. Verifique su conexión.");
        }
    } finally {
        if (!esSegundoPlano) {
            mostrarLoader(false);
        }
    }
}

/**
 * Normaliza nombres de máquina y autocompleta TS y MinProducidos para filas históricas.
 */
function procesarYNormalizarBase(base, tsList) {
    if (!Array.isArray(base)) return;

    const tsIndex = new Map();
    const tsOpFallback = new Map();

    if (Array.isArray(tsList)) {
        tsList.forEach(item => {
            const op = norm(getRowValue(item, 'OP'));
            const color = norm(getRowValue(item, 'COLOR'));
            const tipo = norm(getRowValue(item, 'TIPO'));
            const ubi = norm(getRowValue(item, 'UBICACION'));
            const sec = norm(getRowValue(item, 'SECUENCIA'));
            const tsVal = parseFloat(getRowValue(item, 'TS_MAQUINA') || 0);

            if (op && tsVal > 0) {
                const keyFull = `${op}|${color}|${tipo}|${ubi}|${sec}`;
                if (!tsIndex.has(keyFull)) tsIndex.set(keyFull, tsVal);

                const keyPartial = `${op}|${color}|${ubi}`;
                if (!tsIndex.has(keyPartial)) tsIndex.set(keyPartial, tsVal);

                if (!tsOpFallback.has(op)) tsOpFallback.set(op, tsVal);
            }
        });
    }

    base.forEach(row => {
        // 1. Normalizar nombre de máquina ('1' -> 'Maquina 1')
        row.Maquina = normalizarNombreMaquina(row.Maquina);

        // 2. Precalcular Ts y MinProducidos si faltan
        let ts = parseFloat(row.Ts);
        let minP = parseFloat(row.MinProducidos);
        const cant = parseFloat(row.Cantidad) || 0;

        if (isNaN(ts) || ts <= 0) {
            const op = norm(getRowValue(row, 'OP') || row.Op);
            const color = norm(getRowValue(row, 'COLOR') || row.Color);
            const tipo = norm(getRowValue(row, 'TIPO') || row.Tipo);
            const ubi = norm(getRowValue(row, 'UBICACION') || row.Ubicacion);
            const sec = norm(getRowValue(row, 'SECUENCIA') || row.Secuencia);

            const keyFull = `${op}|${color}|${tipo}|${ubi}|${sec}`;
            const keyPartial = `${op}|${color}|${ubi}`;

            if (tsIndex.has(keyFull)) {
                ts = tsIndex.get(keyFull);
            } else if (tsIndex.has(keyPartial)) {
                ts = tsIndex.get(keyPartial);
            } else if (tsOpFallback.has(op)) {
                ts = tsOpFallback.get(op);
            }

            if (!isNaN(ts) && ts > 0) {
                row.Ts = String(ts);
            }
        }

        if ((isNaN(minP) || minP <= 0) && !isNaN(ts) && ts > 0 && cant > 0) {
            minP = parseFloat((cant * ts).toFixed(2));
            row.MinProducidos = String(minP);
        }
    });
}

function filtrarTrabajadores(trabajadores, filtro = {}) {
    if (!Array.isArray(trabajadores)) return [];

    const visto = new Set();
    return trabajadores.filter(trabajador => {
        const nombre = trabajador?.Trabajador ?? trabajador?.trabajador ?? "";
        const puesto = trabajador?.Puesto ?? trabajador?.puesto ?? "";
        const estado = trabajador?.Estado ?? trabajador?.estado ?? "";

        if (!nombre) return false;
        if (filtro.puesto && norm(puesto) !== norm(filtro.puesto)) return false;
        if (filtro.estado && norm(estado) !== norm(filtro.estado)) return false;

        const clave = norm(nombre);
        if (visto.has(clave)) return false;
        visto.add(clave);
        return true;
    });
}

async function enviarDatos() {
    const form = document.getElementById("prodForm");

    // Validación básica
    if (!form.checkValidity()) {
        alert("Por favor, complete todos los campos obligatorios.");
        return;
    }

    const data = obtenerDataForm();
    mostrarLoader(true);

    try {
        // Optimismo UI: Agregamos a la tabla antes de la confirmación del servidor
        registrosLocales.unshift(data);
        if (typeof guardarRegistrosLocalesStorage === 'function') {
            guardarRegistrosLocalesStorage(registrosLocales);
        }
        renderTable();

        // Envío al servidor (Apps Script)
        await fetch(WEB_APP_URL, {
            method: "POST",
            mode: "no-cors",
            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },
            body: JSON.stringify(data)
        });

        showToast("Registro guardado");

        // ── Guardar valores de los cuadrantes 1 y 2 antes del reload ──────
        const snap = {
            // Grupo 1
            fecha:      document.getElementById('input-fecha').value,
            turno:      document.getElementById('select-turno').value,
            supervisor: document.getElementById('select-supervisor').value,
            maquina:    document.getElementById('select-maquina').value,
            maquinista: document.getElementById('select-maquinista').value,
            inspeccion: document.getElementById('select-inspeccion').value,
            ayudantes:  document.getElementById('select-ayudantes').value,
            // Grupo 2
            op:         document.getElementById('select-op').value,
            cliente:    document.getElementById('input-cliente').value,
            estilo:     document.getElementById('input-estilo').value,
            color:      document.getElementById('select-color').value,
            tipo:       document.getElementById('select-tipo').value,
            ubicacion:  document.getElementById('select-ubicacion').value,
            secuencia:  document.getElementById('select-secuencia').value,
            ts:         document.getElementById('input-ts').value,
            // Estado de candados
            lock1: document.getElementById('card-general')?.classList.contains('is-locked'),
            lock2: document.getElementById('card-estampado')?.classList.contains('is-locked'),
        };

        // ── Recargar datos del servidor para actualizar baseDeDatos.Base ──
        await cargarDatosDeHojas();

        // ── Restaurar valores de los cuadrantes 1 y 2 ────────────────────
        document.getElementById('input-fecha').value       = snap.fecha;
        document.getElementById('select-turno').value      = snap.turno;
        document.getElementById('select-supervisor').value = snap.supervisor;
        document.getElementById('select-maquina').value    = snap.maquina;
        document.getElementById('select-maquinista').value = snap.maquinista;
        document.getElementById('select-inspeccion').value = snap.inspeccion;
        document.getElementById('select-ayudantes').value  = snap.ayudantes;

        document.getElementById('select-op').value     = snap.op;
        document.getElementById('input-cliente').value  = snap.cliente;
        document.getElementById('input-estilo').value   = snap.estilo;

        // Repoblar los selects dependientes con los filtros de Ts y restaurar selección
        if (snap.op) {
            const coloresUnicos = obtenerUnicosDeTs(snap.op, null, null, null, 'COLOR');
            llenarSelect('select-color', coloresUnicos.map(v => ({ val: v })), 'val');
            if (snap.color) document.getElementById('select-color').value = snap.color;

            const tiposUnicos = obtenerUnicosDeTs(snap.op, null, null, null, 'TIPO');
            if (tiposUnicos.length > 0) {
                llenarSelect('select-tipo', tiposUnicos.map(v => ({ val: v })), 'val');
                if (snap.tipo) document.getElementById('select-tipo').value = snap.tipo;
            }

            const ubicaciones = obtenerUnicosDeTs(snap.op, snap.color || null, snap.tipo || null, null, 'UBICACION');
            llenarSelect('select-ubicacion', ubicaciones.map(v => ({ val: v })), 'val');
            if (snap.ubicacion) document.getElementById('select-ubicacion').value = snap.ubicacion;

            const secuencias = obtenerUnicosDeTs(snap.op, snap.color || null, snap.tipo || null, snap.ubicacion || null, 'SECUENCIA');
            llenarSelect('select-secuencia', secuencias.map(v => ({ val: v })), 'val');
            if (snap.secuencia) document.getElementById('select-secuencia').value = snap.secuencia;
        }
        document.getElementById('input-ts').value = snap.ts;

        // Restaurar estado de candados si estaban activos
        const card1 = document.getElementById('card-general');
        const card2 = document.getElementById('card-estampado');
        if (snap.lock1 && card1 && !card1.classList.contains('is-locked')) toggleLock(1);
        if (snap.lock2 && card2 && !card2.classList.contains('is-locked')) toggleLock(2);

        // ── Limpiar solo el tercer cuadrante ─────────────────────────────
        limpiarGrupo(3);

    } catch (e) {
        console.error("Error en envío:", e);
        alert("Error al intentar guardar los datos.");
    } finally {
        mostrarLoader(false);
    }
}

/**
 * Convierte una fecha en formato YYYY-MM-DD a mm/dd/yyyy.
 */
function formatearFechaMMDDYYYY(fechaISO) {
    if (!fechaISO) return "";
    const partes = String(fechaISO).trim().split("-");
    if (partes.length === 3 && partes[0].length === 4) {
        const [anio, mes, dia] = partes;
        return `${mes.padStart(2, '0')}/${dia.padStart(2, '0')}/${anio}`;
    }
    return fechaISO;
}

/**
 * Función auxiliar para recolectar todos los valores del DOM.
 */
function obtenerDataForm() {
    const rawFecha = document.getElementById("input-fecha").value;
    const fechaFormateada = formatearFechaMMDDYYYY(rawFecha);

    // Obtener el usuario conectado desde la sesión activa
    let usuarioRegistro = '';
    try {
        const sesion = JSON.parse(localStorage.getItem('prodsys_session'));
        usuarioRegistro = sesion ? (sesion.usuario || '') : '';
    } catch { usuarioRegistro = ''; }

    return {
        Fecha_Registro: new Date().toISOString(), // Simulación local antes de envío real
        UsuarioRegistro: usuarioRegistro,
        Fecha: fechaFormateada,
        Turno: document.getElementById("select-turno").value,
        Supervisor: document.getElementById("select-supervisor").value,
        Maquina: document.getElementById("select-maquina").value,
        Maquinista: document.getElementById("select-maquinista").value,
        Inspeccion: document.getElementById("select-inspeccion").value,
        Ayudantes: document.getElementById("select-ayudantes").value,
        Op: document.getElementById("select-op").value,
        Cliente: document.getElementById("input-cliente").value,
        Estilo: document.getElementById("input-estilo").value,
        Color: document.getElementById("select-color").value,
        Tipo: document.getElementById("select-tipo").value,
        Ubicacion: document.getElementById("select-ubicacion").value,
        Secuencia: document.getElementById("select-secuencia").value,
        Talla: document.getElementById("input-talla").value,
        Cantidad: document.getElementById("input-cantidad").value,
        Ts: document.getElementById("input-ts").value,
        MinProducidos: document.getElementById("input-minproducidos").value
    };
}
