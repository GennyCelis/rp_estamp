// Usuarios que solo ven sus propios registros
const USUARIOS_SOLO_PROPIOS = ['RRIOS', 'YPIÑAS', 'LMERINO'];
// Usuarios que ven todos los registros del día
const USUARIOS_VER_DIA = ['GCELIS', 'UTORRES', 'EMENDOZA'];

/**
 * Estado global del filtro de fecha en la vista Tabla.
 * Valores posibles: 'HOY' | 'TODOS' | 'YYYY-MM-DD'
 */
let fechaFiltroTabla = 'HOY';

/**
 * Estado global del filtro de máquina en la vista Tabla.
 * Valores posibles: 'TODAS' | 'Maquina 1' | 'Maquina 2' | etc.
 */
let maquinaFiltroTabla = 'TODAS';

/**
 * Estado del modo "Total del Día" (permite a inspectoras y cualquier usuario ver toda la planta).
 */
let verTotalPlantaTabla = false;

/**
 * Configuración y alias de inspectoras para vincular usuario con registros en Base y hoja Inspeccion.
 */
const INSPECTORAS_CONFIG = {
    'RRIOS': {
        usuario: 'RRIOS',
        nombre: 'Rosa Rios',
        aliasInspeccion: [
            'RIOS RIMARACHIN ROSALINA',
            'ROSA RIOS',
            'RIOS RIMARACHIN',
            'RRIOS'
        ],
        codigo: '37928'
    },
    'YPIÑAS': {
        usuario: 'YPIÑAS',
        nombre: 'Yolanda Piñas',
        aliasInspeccion: [
            'PIÑAS ORIHUELA YOLANDA',
            'PINAS ORIHUELA YOLANDA',
            'YOLANDA PIÑAS',
            'YOLANDA PINAS',
            'PIÑAS',
            'PINAS',
            'YPIÑAS',
            'YPINAS'
        ],
        codigo: '37957'
    },
    'LMERINO': {
        usuario: 'LMERINO',
        nombre: 'Lucia Merino',
        aliasInspeccion: [
            'MERINO MAZA, ANA LUCIA',
            'MERINO MAZA ANA LUCIA',
            'ANA LUCIA MERINO',
            'LUCIA MERINO',
            'MERINO MAZA',
            'LMERINO'
        ],
        codigo: '38070'
    }
};

/**
 * Normaliza cadenas para comparaciones seguras (sin acentos, mayúsculas, sin espacios extras).
 */
function normalizarTextoSeguro(str) {
    return String(str || '')
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

/**
 * Devuelve el usuario activo desde la sesión guardada en localStorage.
 */
function obtenerUsuarioActivo() {
    try {
        const sesion = JSON.parse(localStorage.getItem('prodsys_session'));
        return sesion ? (sesion.usuario || '').toUpperCase() : null;
    } catch {
        return null;
    }
}

/**
 * Devuelve la fecha local de hoy en formato YYYY-MM-DD.
 */
function obtenerHoyYMD() {
    const hoy = new Date();
    const y = hoy.getFullYear();
    const m = String(hoy.getMonth() + 1).padStart(2, '0');
    const d = String(hoy.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * Evalúa si una fecha string coincide con una fecha específica en formato YYYY-MM-DD.
 */
function coincideConFechaYMD(val, fechaYMD) {
    if (!val || !fechaYMD) return false;
    const partesFiltro = String(fechaYMD).trim().split('-');
    if (partesFiltro.length !== 3) return false;
    const targetY = parseInt(partesFiltro[0], 10);
    const targetM = parseInt(partesFiltro[1], 10);
    const targetD = parseInt(partesFiltro[2], 10);

    if (val instanceof Date) {
        return !isNaN(val.getTime()) &&
               val.getFullYear() === targetY &&
               (val.getMonth() + 1) === targetM &&
               val.getDate() === targetD;
    }

    const str = String(val).trim();
    if (!str) return false;

    // 1. Formato YYYY-MM-DD o ISO (e.g. "2026-09-03", "2026-09-03T15:20:00.000Z")
    const matchYMD = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
    if (matchYMD) {
        const y = parseInt(matchYMD[1], 10);
        const m = parseInt(matchYMD[2], 10);
        const d = parseInt(matchYMD[3], 10);
        return y === targetY && m === targetM && d === targetD;
    }

    // 2. Formato con slash (MM/DD/YYYY o DD/MM/YYYY)
    const matchSlash = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
    if (matchSlash) {
        const n1 = parseInt(matchSlash[1], 10);
        const n2 = parseInt(matchSlash[2], 10);
        const y = parseInt(matchSlash[3], 10);
        if (y !== targetY) return false;
        // n1/n2 puede ser MM/DD o DD/MM
        return (n1 === targetM && n2 === targetD) || (n1 === targetD && n2 === targetM);
    }

    // 3. Intento Date.parse
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
        return parsed.getFullYear() === targetY &&
               (parsed.getMonth() + 1) === targetM &&
               parsed.getDate() === targetD;
    }

    return false;
}

/**
 * Evalúa si una fecha corresponde al día de hoy (soporta Date, ISO, YYYY-MM-DD, MM/DD/YYYY, D/M/YYYY).
 */
function esFechaDeHoy(val) {
    return coincideConFechaYMD(val, obtenerHoyYMD());
}

/**
 * Determina si un registro corresponde al día de hoy basándose en Fecha o Fecha_Registro.
 */
function esRegistroDeHoy(r) {
    if (!r) return false;
    return esFechaDeHoy(r.Fecha) || esFechaDeHoy(r.Fecha_Registro);
}

/**
 * Evalúa si un registro cumple con el filtro de fecha activo en la tabla.
 */
function coincideConFiltroFecha(r) {
    if (!r) return false;
    if (fechaFiltroTabla === 'TODOS') {
        return true;
    }
    if (fechaFiltroTabla === 'HOY') {
        return esRegistroDeHoy(r);
    }
    // Fecha específica YYYY-MM-DD
    return coincideConFechaYMD(r.Fecha, fechaFiltroTabla) || coincideConFechaYMD(r.Fecha_Registro, fechaFiltroTabla);
}

/**
 * Evalúa si un registro cumple con el filtro de máquina activo en la tabla.
 */
function coincideConFiltroMaquina(r) {
    if (!r) return false;
    if (!maquinaFiltroTabla || maquinaFiltroTabla === 'TODAS' || maquinaFiltroTabla === 'TODOS') {
        return true;
    }
    const maqRegNorm = typeof normalizarNombreMaquina === 'function'
        ? normalizarNombreMaquina(r.Maquina)
        : String(r.Maquina || '').trim().toUpperCase();

    const maqFiltroNorm = typeof normalizarNombreMaquina === 'function'
        ? normalizarNombreMaquina(maquinaFiltroTabla)
        : String(maquinaFiltroTabla).trim().toUpperCase();

    return maqRegNorm === maqFiltroNorm;
}

/**
 * Valida si un registro pertenece a una inspectora dada (por UsuarioRegistro o por Inspeccion).
 */
function esRegistroDeInspectora(r, usuarioNorm) {
    if (!r || !usuarioNorm) return false;
    const uNorm = normalizarTextoSeguro(usuarioNorm);
    const regUserNorm = normalizarTextoSeguro(r.UsuarioRegistro);

    // Coincidencia directa por UsuarioRegistro
    if (regUserNorm && regUserNorm === uNorm) {
        return true;
    }

    // Buscar configuración de la inspectora
    const config = INSPECTORAS_CONFIG[uNorm] || Object.values(INSPECTORAS_CONFIG).find(c => normalizarTextoSeguro(c.usuario) === uNorm);
    if (!config) return false;

    const regInspNorm = normalizarTextoSeguro(r.Inspeccion);
    if (!regInspNorm) return false;

    // Verificar código
    if (config.codigo && regInspNorm.includes(config.codigo)) {
        return true;
    }

    // Verificar alias
    for (const alias of config.aliasInspeccion) {
        const aliasNorm = normalizarTextoSeguro(alias);
        if (regInspNorm === aliasNorm || regInspNorm.includes(aliasNorm) || aliasNorm.includes(regInspNorm)) {
            return true;
        }
    }

    return false;
}

/**
 * Persistencia en localStorage para registros locales optimistas.
 */
const STORAGE_KEY_REGISTROS_LOCALES = 'prodsys_registros_locales';

function guardarRegistrosLocalesStorage(registros) {
    try {
        localStorage.setItem(STORAGE_KEY_REGISTROS_LOCALES, JSON.stringify(registros || []));
    } catch (e) {
        console.warn("No se pudo guardar registros locales en localStorage:", e);
    }
}

function cargarRegistrosLocalesStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_REGISTROS_LOCALES);
        if (!raw) return [];
        const guardados = JSON.parse(raw);
        if (Array.isArray(guardados)) {
            // Solo conservar los registros que corresponden al día de hoy
            return guardados.filter(r => esRegistroDeHoy(r));
        }
        return [];
    } catch {
        return [];
    }
}

/**
 * Reconcilia registros locales pendientes con la base descargada del servidor:
 * Si un registro ya figura en baseDeDatos.Base, se retira de la lista local pendiente.
 */
function reconciliarRegistrosLocalesConBase(baseServer) {
    if (!Array.isArray(baseServer) || baseServer.length === 0) return;
    const actuales = cargarRegistrosLocalesStorage();
    if (actuales.length === 0) {
        registrosLocales = [];
        return;
    }

    const pendientes = actuales.filter(loc => {
        const yaExiste = baseServer.some(srv => {
            return String(srv.Op || '').trim() === String(loc.Op || '').trim() &&
                   String(srv.Color || '').trim() === String(loc.Color || '').trim() &&
                   String(srv.Cantidad || '').trim() === String(loc.Cantidad || '').trim() &&
                   String(srv.Turno || '').trim() === String(loc.Turno || '').trim() &&
                   String(srv.Maquina || '').trim() === String(loc.Maquina || '').trim() &&
                   String(srv.Talla || '').trim() === String(loc.Talla || '').trim() &&
                   esRegistroDeHoy(srv);
        });
        return !yaExiste;
    });

    registrosLocales = pendientes;
    guardarRegistrosLocalesStorage(pendientes);
}

/**
 * Autoselecciona la inspectora en el <select id="select-inspeccion"> según la sesión activa.
 */
function autoSeleccionarInspectoraActiva() {
    const usuario = obtenerUsuarioActivo();
    if (!usuario) return;
    const select = document.getElementById('select-inspeccion');
    if (!select || select.value) return;

    const uNorm = normalizarTextoSeguro(usuario);
    const config = INSPECTORAS_CONFIG[uNorm] || Object.values(INSPECTORAS_CONFIG).find(c => normalizarTextoSeguro(c.usuario) === uNorm);
    if (!config) return;

    for (let i = 0; i < select.options.length; i++) {
        const optVal = normalizarTextoSeguro(select.options[i].value);
        if (!optVal) continue;
        const match = config.aliasInspeccion.some(alias => {
            const aNorm = normalizarTextoSeguro(alias);
            return optVal === aNorm || optVal.includes(aNorm) || aNorm.includes(optVal);
        });
        if (match) {
            select.selectedIndex = i;
            break;
        }
    }
}

/**
 * Inicializa el input date y el selector de máquina de la tabla si están vacíos.
 */
function inicializarFiltroFechaTabla() {
    const input = document.getElementById('filtro-fecha-tabla');
    if (input && !input.value) {
        input.value = obtenerHoyYMD();
    }
    if (typeof poblarFiltroMaquinaTabla === 'function') {
        poblarFiltroMaquinaTabla();
    }
    if (typeof actualizarEstadoBotonTotalDia === 'function') {
        actualizarEstadoBotonTotalDia();
    }
}

/**
 * Puebla dinámicamente las opciones del selector de máquina de la tabla
 * basándose en baseDeDatos.Maquina y en las máquinas encontradas en Base y registros locales.
 */
function poblarFiltroMaquinaTabla() {
    const select = document.getElementById('filtro-maquina-tabla');
    if (!select) return;

    const valorPrevio = select.value || maquinaFiltroTabla || 'TODAS';

    const maquinas = [];
    if (baseDeDatos && Array.isArray(baseDeDatos.Maquina)) {
        baseDeDatos.Maquina.forEach(m => {
            const rawVal = m['maquina'] || m['Maquina'] || m[Object.keys(m)[0]];
            const val = typeof normalizarNombreMaquina === 'function' ? normalizarNombreMaquina(rawVal) : rawVal;
            if (val && !maquinas.includes(val)) maquinas.push(val);
        });
    }

    const pool = [
        ...(Array.isArray(registrosLocales) ? registrosLocales : []),
        ...(baseDeDatos && Array.isArray(baseDeDatos.Base) ? baseDeDatos.Base : [])
    ];
    pool.forEach(r => {
        if (r && r.Maquina) {
            const val = typeof normalizarNombreMaquina === 'function' ? normalizarNombreMaquina(r.Maquina) : r.Maquina;
            if (val && !maquinas.includes(val)) maquinas.push(val);
        }
    });

    if (maquinas.length === 0) {
        maquinas.push('Maquina 1', 'Maquina 2', 'Maquina 3');
    }

    maquinas.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

    select.innerHTML = '<option value="TODAS">Máquina (Todas)</option>';
    maquinas.forEach(maq => {
        const opt = document.createElement('option');
        opt.value = maq;
        opt.textContent = maq;
        select.appendChild(opt);
    });

    if (valorPrevio && (valorPrevio === 'TODAS' || maquinas.includes(valorPrevio))) {
        select.value = valorPrevio;
        maquinaFiltroTabla = valorPrevio;
    } else {
        select.value = 'TODAS';
        maquinaFiltroTabla = 'TODAS';
    }
}

/**
 * Maneja el evento de cambio en el selector de máquina de la tabla.
 */
function cambiarFiltroMaquinaTabla() {
    const select = document.getElementById('filtro-maquina-tabla');
    maquinaFiltroTabla = select ? select.value : 'TODAS';
    renderTable();
}

/**
 * Actualiza los badges de filtro, contador y totales de cantidad/minutos en la cabecera de la tabla.
 */
function actualizarBadgesFiltroTabla(totalRegistros = 0, totalCantidad = 0, totalMinP = 0) {
    const badgeFiltro = document.getElementById('tabla-filtro-badge');
    const badgeContador = document.getElementById('tabla-contador-badge');
    const badgeCantidad = document.getElementById('tabla-cantidad-badge');
    const badgeMinutos = document.getElementById('tabla-minutos-badge');
    
    if (badgeFiltro) {
        let textoFiltro = '';
        if (verTotalPlantaTabla) {
            const fTxt = fechaFiltroTabla === 'HOY' ? `Hoy (${obtenerHoyYMD()})` : (fechaFiltroTabla === 'TODOS' ? 'Histórico' : fechaFiltroTabla);
            textoFiltro = `🌐 Total del Día (${fTxt}) • Planta Completa`;
            badgeFiltro.className = 'inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 border border-purple-200';
        } else if (fechaFiltroTabla === 'TODOS') {
            textoFiltro = '📅 Todos los registros';
            badgeFiltro.className = 'inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-300';
        } else if (fechaFiltroTabla === 'HOY') {
            textoFiltro = `📅 Filtro: Hoy (${obtenerHoyYMD()})`;
            badgeFiltro.className = 'inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200';
        } else {
            textoFiltro = `📅 Filtro: ${fechaFiltroTabla}`;
            badgeFiltro.className = 'inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200';
        }

        const hayFiltroMaq = maquinaFiltroTabla && maquinaFiltroTabla !== 'TODAS' && maquinaFiltroTabla !== 'TODOS';
        if (hayFiltroMaq) {
            textoFiltro += ` • ⚙️ ${maquinaFiltroTabla}`;
            if (!verTotalPlantaTabla) {
                badgeFiltro.className = 'inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200';
            }
        }

        badgeFiltro.innerText = textoFiltro;
    }
    
    if (badgeContador) {
        badgeContador.innerText = `📋 ${totalRegistros} registro${totalRegistros === 1 ? '' : 's'}`;
    }

    if (badgeCantidad) {
        badgeCantidad.innerText = `👕 Total Cantidad: ${totalCantidad.toLocaleString()} prendas`;
    }

    if (badgeMinutos) {
        badgeMinutos.innerText = `⏱️ ${totalMinP.toFixed(2)} min`;
    }
}

/**
 * Actualiza la etiqueta y apariencia del botón 'Total del Día' según el estado y rol.
 */
function actualizarEstadoBotonTotalDia() {
    const btn = document.getElementById('btn-total-dia');
    const label = document.getElementById('btn-total-dia-texto');
    if (!btn || !label) return;

    const usuario = obtenerUsuarioActivo();
    const usuarioNorm = normalizarTextoSeguro(usuario);
    const esSoloPropios = USUARIOS_SOLO_PROPIOS.some(u => normalizarTextoSeguro(u) === usuarioNorm);

    if (verTotalPlantaTabla && esSoloPropios) {
        label.innerText = 'Mis Registros';
        btn.title = 'Volver a ver solo mis registros personales';
        btn.className = 'btn-primary flex items-center justify-center gap-2 text-xs sm:text-sm px-4 py-2 font-bold shadow-sm transition-all duration-200 bg-purple-600 hover:bg-purple-700 text-white border-purple-700 w-full sm:w-auto';
    } else {
        label.innerText = 'Total del Día';
        btn.title = 'Calcular y mostrar el total de los registros del día para toda la planta';
        btn.className = 'btn-secondary flex items-center justify-center gap-2 text-xs sm:text-sm px-4 py-2 font-bold border-indigo-200 text-indigo-700 hover:bg-indigo-50 shadow-sm transition-all duration-200 w-full sm:w-auto';
    }
}

/**
 * Acción del botón 'Total del Día':
 * Permite a cualquier usuario (incluidas inspectoras) ver el total de registros del día de la planta.
 * En inspectoras, actúa como toggle entre 'Total del Día' y 'Mis Registros'.
 */
function alternarTotalRegistrosDia() {
    const usuario = obtenerUsuarioActivo();
    const usuarioNorm = normalizarTextoSeguro(usuario);
    const esSoloPropios = USUARIOS_SOLO_PROPIOS.some(u => normalizarTextoSeguro(u) === usuarioNorm);

    if (esSoloPropios) {
        verTotalPlantaTabla = !verTotalPlantaTabla;
        if (verTotalPlantaTabla) {
            // Asegurar fecha y máquina completas
            const inputFecha = document.getElementById('filtro-fecha-tabla');
            if (inputFecha && !inputFecha.value) {
                inputFecha.value = obtenerHoyYMD();
            }
            if (fechaFiltroTabla === 'TODOS') {
                fechaFiltroTabla = 'HOY';
                if (inputFecha) inputFecha.value = obtenerHoyYMD();
            }
            const selectMaq = document.getElementById('filtro-maquina-tabla');
            if (selectMaq) selectMaq.value = 'TODAS';
            maquinaFiltroTabla = 'TODAS';
            showToast('Mostrando total de registros del día (Toda la planta)');
        } else {
            showToast('Mostrando solo mis registros');
        }
    } else {
        verTotalPlantaTabla = true;
        const inputFecha = document.getElementById('filtro-fecha-tabla');
        if (inputFecha) inputFecha.value = obtenerHoyYMD();
        fechaFiltroTabla = 'HOY';
        const selectMaq = document.getElementById('filtro-maquina-tabla');
        if (selectMaq) selectMaq.value = 'TODAS';
        maquinaFiltroTabla = 'TODAS';
        showToast('Mostrando total de registros del día');
    }

    actualizarEstadoBotonTotalDia();
    renderTable();
}

/**
 * Maneja el evento de cambio en el selector de fecha <input type="date">.
 */
function cambiarFiltroFechaTabla() {
    const input = document.getElementById('filtro-fecha-tabla');
    if (!input || !input.value) {
        fechaFiltroTabla = 'TODOS';
    } else {
        fechaFiltroTabla = input.value;
    }
    renderTable();
}

/**
 * Botón para filtrar por Hoy.
 */
function filtrarTablaHoy() {
    const input = document.getElementById('filtro-fecha-tabla');
    if (input) {
        input.value = obtenerHoyYMD();
    }
    fechaFiltroTabla = 'HOY';
    renderTable();
}

/**
 * Botón para mostrar todos los registros sin filtro de fecha.
 */
function filtrarTablaTodos() {
    const input = document.getElementById('filtro-fecha-tabla');
    if (input) {
        input.value = '';
    }
    fechaFiltroTabla = 'TODOS';
    renderTable();
}

/**
 * Retorna los registros filtrados según el rol del usuario activo y el filtro de fecha:
 * - Inspectoras (RRIOS, YPIÑAS, LMERINO): solo sus propios registros según la fecha seleccionada.
 * - Admins/Supervisor (GCELIS, UTORRES, EMENDOZA): todos los registros según la fecha seleccionada.
 * Los registros se presentan con los más recientes al principio.
 */
function obtenerRegistrosFiltrados() {
    const usuario = obtenerUsuarioActivo();
    if (!usuario) return [];

    const usuarioNorm = normalizarTextoSeguro(usuario);

    // Asegurar registros locales sincronizados desde localStorage
    if (!registrosLocales || registrosLocales.length === 0) {
        if (typeof cargarRegistrosLocalesStorage === 'function') {
            registrosLocales = cargarRegistrosLocalesStorage();
        }
    }

    // Base del servidor en orden inverso (más recientes primero)
    const baseServerInv = Array.isArray(baseDeDatos.Base) ? [...baseDeDatos.Base].reverse() : [];

    // Combinar registros locales (prioridad) con base del servidor
    const todosLosRegistros = [
        ...(Array.isArray(registrosLocales) ? registrosLocales : []),
        ...baseServerInv
    ];

    // Evitar duplicados por clave compuesta
    const vistos = new Set();
    const sinDuplicados = todosLosRegistros.filter(r => {
        // Clave única considerando OP, Maquina, Turno, Talla, Cantidad, Secuencia y Fecha
        const fechaClave = r.Fecha || normalizarTextoSeguro(r.Fecha_Registro).slice(0, 10);
        const clave = `${fechaClave}|${r.Turno || ''}|${r.Maquina || ''}|${r.Op || ''}|${r.Color || ''}|${r.Talla || ''}|${r.Cantidad || ''}|${r.Secuencia || ''}|${r.MinProducidos || ''}`;
        if (vistos.has(clave)) return false;
        vistos.add(clave);
        return true;
    });

    // ── Modo Total del Día (Planta Completa para todos los usuarios) ───────────
    if (verTotalPlantaTabla) {
        return sinDuplicados.filter(r => {
            return coincideConFiltroFecha(r) && coincideConFiltroMaquina(r);
        });
    }

    // ── Inspectoras: sus registros según el filtro de fecha y máquina ──────────────────
    const esSoloPropios = USUARIOS_SOLO_PROPIOS.some(u => normalizarTextoSeguro(u) === usuarioNorm);
    if (esSoloPropios) {
        return sinDuplicados.filter(r => {
            return esRegistroDeInspectora(r, usuarioNorm) && coincideConFiltroFecha(r) && coincideConFiltroMaquina(r);
        });
    }

    // ── Admins / Supervisor y demás usuarios: todos los registros según filtro de fecha y máquina ────
    return sinDuplicados.filter(r => {
        return coincideConFiltroFecha(r) && coincideConFiltroMaquina(r);
    });
}

/**
 * Renderiza la tabla de registros en el DOM.
 */
function renderTable() {
    const body = document.getElementById('tableBody');
    if (!body) return;
    const registrosFiltrados = obtenerRegistrosFiltrados();

    const totalCant = registrosFiltrados.reduce((acc, curr) => acc + (parseFloat(curr.Cantidad) || 0), 0);
    const totalMinP = registrosFiltrados.reduce((acc, curr) => acc + (parseFloat(curr.MinProducidos) || 0), 0);

    // Actualizar indicador y badges de conteo y cantidad
    actualizarBadgesFiltroTabla(registrosFiltrados.length, totalCant, totalMinP);

    // Calcular y actualizar eficiencia
    const efData = calcularEficienciaActual(registrosFiltrados);
    actualizarComponentesEficiencia(efData);

    const foot = document.getElementById('tableFoot');

    const fReg = document.getElementById('footer-total-registros');
    const fCant = document.getElementById('footer-total-cantidad');
    const fMin = document.getElementById('footer-total-minutos');

    if (registrosFiltrados.length === 0) {
        body.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-400">Sin registros para mostrar</td></tr>';
        if (foot) foot.innerHTML = '';
        if (fReg) fReg.innerText = '0';
        if (fCant) fCant.innerText = '0';
        if (fMin) fMin.innerText = '0.00';
        if (typeof actualizarComponentesEficiencia === 'function') {
            actualizarComponentesEficiencia({ porcentaje: 0, totalMinP: 0, minDispTotal: 0, minAdicTotal: 0, totalBase: 0, fechas: [], maquinas: [] });
        }
        if (typeof actualizarEstadoBotonTotalDia === 'function') {
            actualizarEstadoBotonTotalDia();
        }
        return;
    }

    body.innerHTML = registrosFiltrados.map(r => `
        <tr class="border-b hover:bg-slate-50 transition-colors">
            <td class="p-3">${r.Fecha || ''}</td>
            <td class="p-3">${r.Turno || ''}</td>
            <td class="p-3 font-bold">${r.Maquina || ''}</td>
            <td class="p-3 font-mono">${r.Op || ''}</td>
            <td class="p-3 font-black text-blue-600">${r.Cantidad || ''}</td>
            <td class="p-3 font-bold text-blue-700">${r.MinProducidos || ''}</td>
        </tr>
    `).join('');

    // Actualizar fila de totales al pie de la tabla
    if (foot) {
        foot.innerHTML = `
            <tr class="bg-slate-100 font-bold text-slate-800 border-t-2 border-slate-300">
                <td colspan="4" class="p-3 text-right text-xs uppercase tracking-wider text-slate-600">Total (${registrosFiltrados.length} reg):</td>
                <td class="p-3 font-black text-blue-700 text-sm">${totalCant.toLocaleString()}</td>
                <td class="p-3 font-black text-indigo-700 text-sm">${totalMinP.toFixed(2)}</td>
            </tr>
        `;
    }

    // Actualizar valores en la barra de resumen interactiva al pie de la tabla
    if (fReg) fReg.innerText = registrosFiltrados.length;
    if (fCant) fCant.innerText = totalCant.toLocaleString();
    if (fMin) fMin.innerText = totalMinP.toFixed(2);

    if (typeof actualizarEstadoBotonTotalDia === 'function') {
        actualizarEstadoBotonTotalDia();
    }
}

/**
 * Valida si un registro de 'bd-mindisponible' corresponde a una fecha objetivo (YYYY-MM-DD).
 */
function esRegistroDeFechaMindisp(r, targetDate) {
    if (!r || !targetDate) return false;
    if (typeof isTargetDateDisp === 'function') {
        return isTargetDateDisp(r, targetDate);
    }
    return coincideConFechaYMD(r.FechDia || r.FechaDia || r.Fecha, targetDate);
}

/**
 * Calcula los minutos disponibles y adicionales para una fecha y máquina(s) dadas.
 * Consulta la hoja 'bd-mindisponible' y aplica estándar de planta (516 min) si no hay fila.
 */
function calcularMinutosDisponiblesYAdicionales(targetDate, targetMaquina, registrosFiltrados = []) {
    const minDispData = (window.baseDeDatos && Array.isArray(window.baseDeDatos['bd-mindisponible'])) 
        ? window.baseDeDatos['bd-mindisponible'] 
        : [];

    let maquinasObjetivo = [];
    const esFiltroUnaMaquina = targetMaquina && targetMaquina !== 'TODAS' && targetMaquina !== 'TODOS';

    if (esFiltroUnaMaquina) {
        maquinasObjetivo = [typeof normalizarNombreMaquina === 'function' ? normalizarNombreMaquina(targetMaquina) : targetMaquina];
    } else {
        const usuario = typeof obtenerUsuarioActivo === 'function' ? obtenerUsuarioActivo() : null;
        const usuarioNorm = typeof normalizarTextoSeguro === 'function' ? normalizarTextoSeguro(usuario) : '';
        const esSoloPropios = USUARIOS_SOLO_PROPIOS.some(u => normalizarTextoSeguro(u) === usuarioNorm);

        // Máquinas presentes en los registros de la tabla
        const maquinasEnRegistros = new Set();
        registrosFiltrados.forEach(r => {
            const mNorm = typeof normalizarNombreMaquina === 'function' ? normalizarNombreMaquina(r.Maquina) : r.Maquina;
            if (mNorm) maquinasEnRegistros.add(mNorm);
        });

        // Máquinas en bd-mindisponible para esta fecha
        const maquinasEnBd = new Set();
        minDispData.forEach(r => {
            if (esRegistroDeFechaMindisp(r, targetDate)) {
                const rawMaq = r.NumMaq !== undefined ? r.NumMaq : (r.Maquina || r.Maq);
                const mNorm = typeof normalizarNombreMaquina === 'function' ? normalizarNombreMaquina(rawMaq) : `Maquina ${rawMaq}`;
                if (mNorm) maquinasEnBd.add(mNorm);
            }
        });

        if (esSoloPropios && !verTotalPlantaTabla && maquinasEnRegistros.size > 0) {
            // Inspectora viendo solo sus registros: base son las máquinas en las que produjo
            maquinasObjetivo = Array.from(maquinasEnRegistros);
        } else if (maquinasEnBd.size > 0) {
            // Planta completa: máquinas activas registradas para el día
            maquinasObjetivo = Array.from(maquinasEnBd);
        } else if (maquinasEnRegistros.size > 0) {
            maquinasObjetivo = Array.from(maquinasEnRegistros);
        } else {
            maquinasObjetivo = ['Maquina 1', 'Maquina 2', 'Maquina 3'];
        }
    }

    let minDispTotal = 0;
    let minAdicTotal = 0;
    const detalleMaquinas = {};

    maquinasObjetivo.forEach(m => {
        detalleMaquinas[m] = { minDisp: 0, minAdic: 0, base: 0, encontrado: false, minP: 0 };
    });

    minDispData.forEach(r => {
        if (esRegistroDeFechaMindisp(r, targetDate)) {
            const rawMaq = r.NumMaq !== undefined ? r.NumMaq : (r.Maquina || r.Maq);
            const mNorm = typeof normalizarNombreMaquina === 'function' ? normalizarNombreMaquina(rawMaq) : `Maquina ${rawMaq}`;

            if (mNorm && detalleMaquinas[mNorm]) {
                const d = parseFloat(r.MinDisp || r.MinutosDisponibles || r.Min_Disp || 0) || 0;
                const a = parseFloat(r.MinAdic || r.MinutosAdicionales || r.Min_Adic || 0) || 0;
                detalleMaquinas[mNorm].minDisp += d;
                detalleMaquinas[mNorm].minAdic += a;
                detalleMaquinas[mNorm].encontrado = true;
            }
        }
    });

    // Sumar minutos producidos por máquina a partir de los registros
    registrosFiltrados.forEach(r => {
        const mNorm = typeof normalizarNombreMaquina === 'function' ? normalizarNombreMaquina(r.Maquina) : r.Maquina;
        if (mNorm && detalleMaquinas[mNorm]) {
            detalleMaquinas[mNorm].minP += parseFloat(r.MinProducidos) || 0;
        }
    });

    // Fallback estándar de planta si una máquina no tuvo registro explícito en la hoja
    maquinasObjetivo.forEach(m => {
        const info = detalleMaquinas[m];
        if (!info.encontrado && info.minDisp === 0) {
            info.minDisp = 516; // 516 minutos estándar por turno
        }
        info.base = info.minDisp + info.minAdic;
        minDispTotal += info.minDisp;
        minAdicTotal += info.minAdic;
    });

    const totalBase = minDispTotal + minAdicTotal;

    return {
        targetDate,
        maquinasObjetivo,
        minDisp: minDispTotal,
        minAdic: minAdicTotal,
        totalBase,
        detalleMaquinas
    };
}

/**
 * Calcula la eficiencia actual de los registros visibles en la tabla:
 * Eficiencia = Minutos Producidos / (Minutos Disponibles + Minutos Adicionales)
 */
function calcularEficienciaActual(registrosFiltrados = []) {
    const totalMinP = registrosFiltrados.reduce((acc, curr) => acc + (parseFloat(curr.MinProducidos) || 0), 0);

    // Identificar fecha(s) objetivo
    let fechas = [];
    if (fechaFiltroTabla && fechaFiltroTabla !== 'TODOS') {
        fechas = [fechaFiltroTabla === 'HOY' ? obtenerHoyYMD() : fechaFiltroTabla];
    } else {
        const fSet = new Set();
        registrosFiltrados.forEach(r => {
            const f = r.Fecha || (r.Fecha_Registro ? String(r.Fecha_Registro).slice(0, 10) : null);
            if (f) {
                const m = String(f).match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
                if (m) {
                    fSet.add(`${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`);
                } else {
                    const mSlash = String(f).match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
                    if (mSlash) {
                        fSet.add(`${mSlash[3]}-${String(mSlash[1]).padStart(2, '0')}-${String(mSlash[2]).padStart(2, '0')}`);
                    }
                }
            }
        });
        fechas = Array.from(fSet);
        if (fechas.length === 0) {
            fechas = [obtenerHoyYMD()];
        }
    }

    let minDispTotal = 0;
    let minAdicTotal = 0;
    const maquinasInvolucradas = new Set();
    const desglosePorMaquina = {};

    fechas.forEach(f => {
        const info = calcularMinutosDisponiblesYAdicionales(f, maquinaFiltroTabla, registrosFiltrados);
        minDispTotal += info.minDisp;
        minAdicTotal += info.minAdic;
        info.maquinasObjetivo.forEach(m => {
            maquinasInvolucradas.add(m);
            if (!desglosePorMaquina[m]) {
                desglosePorMaquina[m] = { minDisp: 0, minAdic: 0, base: 0, minP: 0 };
            }
            if (info.detalleMaquinas[m]) {
                desglosePorMaquina[m].minDisp += info.detalleMaquinas[m].minDisp;
                desglosePorMaquina[m].minAdic += info.detalleMaquinas[m].minAdic;
                desglosePorMaquina[m].base += info.detalleMaquinas[m].base;
                desglosePorMaquina[m].minP += info.detalleMaquinas[m].minP;
            }
        });
    });

    const totalBase = minDispTotal + minAdicTotal;
    const porcentaje = totalBase > 0 ? (totalMinP / totalBase) * 100 : 0;

    return {
        totalMinP,
        minDispTotal,
        minAdicTotal,
        totalBase,
        porcentaje,
        fechas,
        maquinas: Array.from(maquinasInvolucradas),
        desglosePorMaquina
    };
}

/**
 * Actualiza los botones, badges y chips de eficiencia con los datos calculados.
 */
function actualizarComponentesEficiencia(efData) {
    const btnEfVal = document.getElementById('btn-eficiencia-valor');
    const btnEf = document.getElementById('btn-eficiencia');
    const chipEfVal = document.getElementById('footer-total-eficiencia');
    const chipEf = document.getElementById('footer-eficiencia-chip');
    const headerEfBadge = document.getElementById('tabla-eficiencia-badge');
    const headerEfVal = document.getElementById('header-eficiencia-valor');

    const pct = efData ? (efData.porcentaje || 0) : 0;
    const pctStr = `${pct.toFixed(1)}%`;

    if (btnEfVal) btnEfVal.innerText = pctStr;
    if (chipEfVal) chipEfVal.innerText = pctStr;
    if (headerEfVal) headerEfVal.innerText = pctStr;

    // Colores semánticos:
    // Azul: >= 80% (Excelente)
    // Verde: 60% – 79.9% (Meta cumplida)
    // Naranja: 50% – 59.9% (Regular)
    // Rojo: < 50% (Bajo)
    if (btnEf) {
        if (pct >= 80) {
            btnEf.className = 'flex items-center justify-center gap-2 text-xs sm:text-sm px-4 py-2 font-bold rounded-xl shadow-sm transition-all duration-200 border w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white border-blue-700 cursor-pointer';
        } else if (pct >= 60) {
            btnEf.className = 'flex items-center justify-center gap-2 text-xs sm:text-sm px-4 py-2 font-bold rounded-xl shadow-sm transition-all duration-200 border w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 cursor-pointer';
        } else if (pct >= 50) {
            btnEf.className = 'flex items-center justify-center gap-2 text-xs sm:text-sm px-4 py-2 font-bold rounded-xl shadow-sm transition-all duration-200 border w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white border-amber-600 cursor-pointer';
        } else if (pct > 0) {
            btnEf.className = 'flex items-center justify-center gap-2 text-xs sm:text-sm px-4 py-2 font-bold rounded-xl shadow-sm transition-all duration-200 border w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white border-rose-700 cursor-pointer';
        } else {
            btnEf.className = 'btn-secondary flex items-center justify-center gap-2 text-xs sm:text-sm px-4 py-2 font-bold border-slate-300 text-slate-700 hover:bg-slate-100 shadow-sm transition-all duration-200 w-full sm:w-auto cursor-pointer';
        }
    }

    if (chipEf) {
        if (pct >= 80) {
            chipEf.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-300 bg-blue-50 text-blue-900 shadow-sm text-xs font-bold cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]';
            if (chipEfVal) chipEfVal.className = 'font-black text-sm text-blue-700';
        } else if (pct >= 60) {
            chipEf.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-900 shadow-sm text-xs font-bold cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]';
            if (chipEfVal) chipEfVal.className = 'font-black text-sm text-emerald-700';
        } else if (pct >= 50) {
            chipEf.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 shadow-sm text-xs font-bold cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]';
            if (chipEfVal) chipEfVal.className = 'font-black text-sm text-amber-700';
        } else if (pct > 0) {
            chipEf.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-300 bg-rose-50 text-rose-900 shadow-sm text-xs font-bold cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]';
            if (chipEfVal) chipEfVal.className = 'font-black text-sm text-rose-700';
        } else {
            chipEf.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 shadow-sm text-xs font-semibold cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]';
            if (chipEfVal) chipEfVal.className = 'font-black text-sm text-slate-700';
        }
    }

    if (headerEfBadge) {
        if (pct >= 80) {
            headerEfBadge.className = 'inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-300 shadow-sm cursor-pointer hover:bg-blue-200 transition-colors';
        } else if (pct >= 60) {
            headerEfBadge.className = 'inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-sm cursor-pointer hover:bg-emerald-200 transition-colors';
        } else if (pct >= 50) {
            headerEfBadge.className = 'inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 shadow-sm cursor-pointer hover:bg-amber-200 transition-colors';
        } else if (pct > 0) {
            headerEfBadge.className = 'inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-300 shadow-sm cursor-pointer hover:bg-rose-200 transition-colors';
        } else {
            headerEfBadge.className = 'inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 shadow-sm cursor-pointer hover:bg-slate-200 transition-colors';
        }
    }
}

/**
 * Abre el modal de detalle de cálculo de eficiencia.
 */
function abrirModalEficiencia() {
    const modal = document.getElementById('modal-eficiencia-detalle');
    if (!modal) return;

    const registrosFiltrados = typeof obtenerRegistrosFiltrados === 'function' ? obtenerRegistrosFiltrados() : [];
    const efData = calcularEficienciaActual(registrosFiltrados);

    const elPorcentaje = document.getElementById('modal-eficiencia-porcentaje');
    const elNivelBadge = document.getElementById('modal-eficiencia-nivel-badge');
    const elMinProd = document.getElementById('modal-eficiencia-min-prod');
    const elMinDisp = document.getElementById('modal-eficiencia-min-disp');
    const elMinAdic = document.getElementById('modal-eficiencia-min-adic');
    const elTotalBase = document.getElementById('modal-eficiencia-total-base');
    const elFecha = document.getElementById('modal-eficiencia-contexto-fecha');
    const elMaq = document.getElementById('modal-eficiencia-contexto-maquina');
    const elUser = document.getElementById('modal-eficiencia-contexto-usuario');
    const contMaquinas = document.getElementById('modal-eficiencia-maquinas-container');
    const listaMaquinas = document.getElementById('modal-eficiencia-maquinas-lista');

    const pct = efData.porcentaje;
    const pctStr = `${pct.toFixed(2)}%`;

    if (elPorcentaje) elPorcentaje.innerText = pctStr;
    if (elMinProd) elMinProd.innerText = `${efData.totalMinP.toFixed(2)} min`;
    if (elMinDisp) elMinDisp.innerText = `${efData.minDispTotal.toFixed(2)} min`;
    if (elMinAdic) elMinAdic.innerText = `${efData.minAdicTotal.toFixed(2)} min`;
    if (elTotalBase) elTotalBase.innerText = `${efData.totalBase.toFixed(2)} min`;

    if (elNivelBadge) {
        if (pct >= 80) {
            elNivelBadge.innerText = 'Excelente (≥ 80%)';
            elNivelBadge.className = 'inline-block text-xs font-extrabold px-3 py-1 rounded-full mt-1 bg-blue-100 text-blue-800 border border-blue-300';
            if (elPorcentaje) elPorcentaje.className = 'text-4xl sm:text-5xl font-black text-blue-600 tracking-tight my-1';
        } else if (pct >= 60) {
            elNivelBadge.innerText = 'Meta Cumplida (60% – 79.9%)';
            elNivelBadge.className = 'inline-block text-xs font-extrabold px-3 py-1 rounded-full mt-1 bg-emerald-100 text-emerald-800 border border-emerald-300';
            if (elPorcentaje) elPorcentaje.className = 'text-4xl sm:text-5xl font-black text-emerald-600 tracking-tight my-1';
        } else if (pct >= 50) {
            elNivelBadge.innerText = 'Regular (50% – 59.9%)';
            elNivelBadge.className = 'inline-block text-xs font-extrabold px-3 py-1 rounded-full mt-1 bg-amber-100 text-amber-800 border border-amber-300';
            if (elPorcentaje) elPorcentaje.className = 'text-4xl sm:text-5xl font-black text-amber-600 tracking-tight my-1';
        } else {
            elNivelBadge.innerText = 'Bajo (< 50%)';
            elNivelBadge.className = 'inline-block text-xs font-extrabold px-3 py-1 rounded-full mt-1 bg-rose-100 text-rose-800 border border-rose-300';
            if (elPorcentaje) elPorcentaje.className = 'text-4xl sm:text-5xl font-black text-rose-600 tracking-tight my-1';
        }
    }

    if (elFecha) {
        elFecha.innerText = `📅 Fecha evaluada: ${efData.fechas.join(', ')}`;
    }
    if (elMaq) {
        elMaq.innerText = `⚙️ Filtro de Máquina: ${maquinaFiltroTabla === 'TODAS' ? 'Todas las máquinas' : maquinaFiltroTabla}`;
    }
    if (elUser) {
        const uActivo = typeof obtenerUsuarioActivo === 'function' ? obtenerUsuarioActivo() : 'Usuario';
        elUser.innerText = `👤 Vista: ${verTotalPlantaTabla ? 'Total del Día (Toda la Planta)' : (USUARIOS_SOLO_PROPIOS.includes(uActivo) ? `Mis Registros (${uActivo})` : 'Planta Completa')}`;
    }

    // Desglose por máquinas si aplica
    if (contMaquinas && listaMaquinas) {
        const entries = Object.entries(efData.desglosePorMaquina || {});
        if (entries.length > 0) {
            contMaquinas.style.display = 'block';
            listaMaquinas.innerHTML = entries.map(([maq, d]) => {
                const subPct = d.base > 0 ? ((d.minP / d.base) * 100).toFixed(1) : '0.0';
                return `
                    <div class="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                        <div class="font-bold text-slate-800">${maq}</div>
                        <div class="flex items-center gap-2.5 text-slate-600 font-mono text-[11px] sm:text-xs">
                            <span>Prod: <strong class="text-blue-600">${d.minP.toFixed(1)}m</strong></span>
                            <span>Base: <strong class="text-purple-600">${d.base.toFixed(1)}m</strong></span>
                            <span class="font-bold font-sans px-2 py-0.5 rounded text-[11px] ${parseFloat(subPct) >= 60 ? 'bg-emerald-100 text-emerald-800' : (parseFloat(subPct) >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800')}">${subPct}%</span>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            contMaquinas.style.display = 'none';
        }
    }

    modal.style.display = 'flex';
}

/**
 * Cierra el modal de detalle de eficiencia.
 */
function cerrarModalEficiencia(ev) {
    if (ev && ev.target && ev.target.id !== 'modal-eficiencia-detalle') return;
    const modal = document.getElementById('modal-eficiencia-detalle');
    if (modal) modal.style.display = 'none';
}

// Cerrar modal al presionar la tecla Escape
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('modal-eficiencia-detalle');
        if (modal && modal.style.display === 'flex') {
            cerrarModalEficiencia();
        }
    }
});

/**
 * Recarga los datos desde Google Sheets y actualiza la tabla.
 */
async function recargarTabla() {
    const btn = document.getElementById('btn-recargar-tabla');
    try {
        if (btn) btn.disabled = true;
        mostrarLoader(true);
        if (typeof cargarDatosDeHojas === 'function') {
            await cargarDatosDeHojas();
        }
        if (typeof poblarFiltroMaquinaTabla === 'function') {
            poblarFiltroMaquinaTabla();
        }
        renderTable();
        showToast("Tabla actualizada");
    } catch (e) {
        console.error("Error al recargar tabla:", e);
        showToast("Error al actualizar");
    } finally {
        mostrarLoader(false);
        if (btn) btn.disabled = false;
    }
}

/**
 * Exporta los registros mostrados a Excel.
 * Carga la librería XLSX (SheetJS de 1.2 MB) dinámicamente bajo demanda para no ralentizar el inicio de la app.
 */
async function exportToExcel() {
    const registrosFiltrados = obtenerRegistrosFiltrados();
    if (!registrosFiltrados || registrosFiltrados.length === 0) {
        return alert("No hay datos para exportar.");
    }
    
    // Carga diferida (Lazy Load) de SheetJS
    if (typeof XLSX === 'undefined') {
        if (typeof showToast === 'function') {
            showToast("Preparando exportador Excel...");
        }
        try {
            if (typeof cargarScriptDinamico === 'function') {
                await cargarScriptDinamico("https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js");
            }
        } catch (errXlsx) {
            console.error("Error al cargar SheetJS:", errXlsx);
            return alert("No se pudo cargar la librería de Excel. Verifique su conexión a internet.");
        }
    }

    if (typeof XLSX === 'undefined') {
        return alert("Error: El módulo de Excel no está disponible.");
    }
    
    const ws = XLSX.utils.json_to_sheet(registrosFiltrados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Produccion");
    XLSX.writeFile(wb, "Reporte_PROD_SYS.xlsx");
}