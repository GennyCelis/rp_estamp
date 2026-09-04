/**
 * PROD-SYS - Lógica del Formulario
 * Filtros de dependencia: OP → COLOR, TIPO, UBICACION → SECUENCIA (en base a Color, Tipo, Ubicación) → TS_MAQUINA
 */

// -----------------------------------------------------------------------
// Utilidades de Normalización y Búsqueda de Campos en Ts / Op
// -----------------------------------------------------------------------

/** Normaliza un texto: elimina acentos/diacríticos, espacios y convierte a mayúsculas */
function norm(val) {
    return String(val || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toUpperCase();
}

/**
 * Normaliza el nombre de una máquina al formato estándar 'Maquina X'.
 * Maneja formatos como 1, '1', 'Maquina 1', 'Máquina 1', 'MAQUINA 1', 'maq 1'.
 */
function normalizarNombreMaquina(val) {
    if (val === undefined || val === null) return "";
    const str = String(val).trim();
    if (!str) return "";
    const match = str.match(/\d+/);
    if (match) {
        return `Maquina ${match[0]}`;
    }
    return str;
}

/**
 * Obtiene el valor de un campo específico en una fila (objeto),
 * tolerando variaciones de mayúsculas/minúsculas, tildes y nombres alternativos de columna.
 */
function getRowValue(row, fieldName) {
    if (!row || typeof row !== "object") return "";
    const target = norm(fieldName);

    // 1. Coincidencia directa exacta normalizada
    const exactKey = Object.keys(row).find(k => norm(k) === target);
    if (exactKey !== undefined && row[exactKey] !== undefined && row[exactKey] !== null) {
        return String(row[exactKey]).trim();
    }

    // 2. Mapeo de alias comunes según el encabezado de las hojas
    const aliases = {
        OP: ["OP", "ORDENPEDIDO", "ORDEN_PEDIDO", "ORDEN", "NRO_OP"],
        CLIENTE: ["CLIENTE", "CLIENT", "NOM_CLIENTE"],
        ESTILO: ["ESTILO", "STYLE", "NOM_ESTILO"],
        COLOR: ["COLOR", "COLORES", "COLOUR"],
        TIPO: ["TIPO", "TIPOS", "TIPO_PRENDA"],
        UBICACION: ["UBICACION", "UBICACIÓN", "UBICACIONES", "UBI", "POSICION"],
        SECUENCIA: ["SECUENCIA", "SECUENCIAS", "OBS_EVENTO", "OBSEVENTO", "OBS EVENTO", "EVENTO", "DESCRIPCION", "DESCRIPCIÓN", "VUELTAS", "SEC"],
        TS_MAQUINA: ["TS_MAQUINA", "TSMAQUINA", "TS_MAQ", "TS", "TIEMPO_ESTANDAR", "TOTAL_TS"]
    };

    const targetAliases = aliases[target] || [];
    for (const alias of targetAliases) {
        const foundKey = Object.keys(row).find(k => norm(k) === norm(alias));
        if (foundKey !== undefined && row[foundKey] !== undefined && row[foundKey] !== null && String(row[foundKey]).trim() !== "") {
            return String(row[foundKey]).trim();
        }
    }

    return "";
}

/**
 * Obtiene valores únicos de la hoja Ts filtrando por OP, COLOR, TIPO y UBICACION.
 * Devuelve un array de valores únicos (en su formato original de texto).
 */
function obtenerUnicosDeTs(op, color, tipo, ubi, campo) {
    if (!baseDeDatos || !Array.isArray(baseDeDatos.Ts)) return [];

    const resultado = [];
    const visto = new Set();

    baseDeDatos.Ts.forEach(row => {
        // Filtros activos según los parámetros proporcionados
        if (op && norm(getRowValue(row, 'OP')) !== norm(op)) return;
        if (color && norm(getRowValue(row, 'COLOR')) !== norm(color)) return;
        if (tipo && norm(getRowValue(row, 'TIPO')) !== norm(tipo)) return;
        if (ubi && norm(getRowValue(row, 'UBICACION')) !== norm(ubi)) return;

        const val = getRowValue(row, campo);
        if (val !== "" && !visto.has(norm(val))) {
            visto.add(norm(val));
            resultado.push(val);
        }
    });

    return resultado;
}

// -----------------------------------------------------------------------
// Paso 1: Al ingresar la OP → carga Cliente, Estilo, Colores, Tipos y Ubicaciones
// -----------------------------------------------------------------------
function actualizarDatosOP() {
    const opSel = document.getElementById("select-op").value.trim();

    // Resetear campos dependientes
    resetearSelect("select-color",    "Seleccione color...");
    resetearSelect("select-tipo",     "Seleccione...");
    resetearSelect("select-ubicacion","Seleccione...");
    resetearSelect("select-secuencia","Seleccione...");
    document.getElementById("input-cliente").value = "";
    document.getElementById("input-estilo").value  = "";
    document.getElementById("input-ts").value      = "";
    document.getElementById("input-minproducidos").value = "";

    if (!opSel) return;

    // 1. Buscar Cliente y Estilo: primero en Ts, con fallback a hoja Op
    const tsMatch = (baseDeDatos.Ts || []).find(x => norm(getRowValue(x, 'OP')) === norm(opSel));
    const infoOp  = (baseDeDatos.Op || []).find(x => norm(x.OrdenPedido || x.OP || x.Op) === norm(opSel));

    const clienteTs = tsMatch ? getRowValue(tsMatch, 'CLIENTE') : "";
    const estiloTs  = tsMatch ? getRowValue(tsMatch, 'ESTILO') : "";

    const clienteFinal = clienteTs || (infoOp ? (infoOp.Cliente || infoOp.cliente || "") : "");
    const estiloFinal  = estiloTs  || (infoOp ? (infoOp.Estilo  || infoOp.estilo  || "") : "");

    document.getElementById("input-cliente").value = clienteFinal;
    document.getElementById("input-estilo").value  = estiloFinal;

    // 2. Colores únicos para la OP desde la hoja Ts
    const coloresUnicos = obtenerUnicosDeTs(opSel, null, null, null, "COLOR");
    llenarSelect("select-color", coloresUnicos.map(v => ({ val: v })), "val");

    // 3. Tipos únicos para la OP desde la hoja Ts
    const tiposUnicos = obtenerUnicosDeTs(opSel, null, null, null, "TIPO");
    if (tiposUnicos.length > 0) {
        llenarSelect("select-tipo", tiposUnicos.map(v => ({ val: v })), "val");
        // Si sólo hay un tipo registrado para esta OP, preseleccionarlo
        if (tiposUnicos.length === 1) {
            document.getElementById("select-tipo").value = tiposUnicos[0];
        }
    } else if (Array.isArray(baseDeDatos.Tipo) && baseDeDatos.Tipo.length > 0) {
        llenarSelect("select-tipo", baseDeDatos.Tipo, "Tipo");
    }

    // 4. Ubicaciones únicas para la OP desde la hoja Ts
    const ubicacionesUnicas = obtenerUnicosDeTs(opSel, null, null, null, "UBICACION");
    llenarSelect("select-ubicacion", ubicacionesUnicas.map(v => ({ val: v })), "val");
    if (ubicacionesUnicas.length === 1) {
        document.getElementById("select-ubicacion").value = ubicacionesUnicas[0];
        actualizarSecuencias();
    }
}

// -----------------------------------------------------------------------
// Paso 2: Al seleccionar COLOR → actualiza Ubicaciones y Secuencias
// -----------------------------------------------------------------------
function actualizarUbicaciones() {
    const op    = document.getElementById("select-op").value.trim();
    const color = document.getElementById("select-color").value.trim();
    const tipo  = document.getElementById("select-tipo").value.trim();

    resetearSelect("select-ubicacion", "Seleccione...");
    resetearSelect("select-secuencia", "Seleccione...");
    document.getElementById("input-ts").value = "";
    document.getElementById("input-minproducidos").value = "";

    if (!op) return;

    // Ubicaciones disponibles para esta OP y Color (y Tipo si está seleccionado)
    const ubicaciones = obtenerUnicosDeTs(op, color || null, tipo || null, null, "UBICACION");
    llenarSelect("select-ubicacion", ubicaciones.map(v => ({ val: v })), "val");

    if (ubicaciones.length === 1) {
        document.getElementById("select-ubicacion").value = ubicaciones[0];
    }

    // Actualizar también secuencias disponibles
    actualizarSecuencias();
}

// -----------------------------------------------------------------------
// Paso 3: Al seleccionar TIPO o UBICACION → filtra las Secuencias
//         en base a Color, Tipo y Ubicación
// -----------------------------------------------------------------------
function actualizarSecuencias() {
    const op    = document.getElementById("select-op").value.trim();
    const color = document.getElementById("select-color").value.trim();
    const tipo  = document.getElementById("select-tipo").value.trim();
    const ubi   = document.getElementById("select-ubicacion").value.trim();

    resetearSelect("select-secuencia", "Seleccione...");
    document.getElementById("input-ts").value = "";
    document.getElementById("input-minproducidos").value = "";

    if (!op) return;

    // Buscar secuencias en Ts que coincidan con la combinación (Color, Tipo, Ubicación)
    const secuencias = obtenerUnicosDeTs(
        op,
        color || null,
        tipo  || null,
        ubi   || null,
        "SECUENCIA"
    );

    llenarSelect("select-secuencia", secuencias.map(v => ({ val: v })), "val");

    // Si sólo hay una secuencia disponible, seleccionarla automáticamente y calcular TS
    if (secuencias.length === 1) {
        document.getElementById("select-secuencia").value = secuencias[0];
        calcularTS();
    }
}

// -----------------------------------------------------------------------
// Paso 4: Al seleccionar la SECUENCIA → busca TS_MAQUINA en la hoja Ts
// -----------------------------------------------------------------------
function calcularTS() {
    const op    = document.getElementById("select-op").value.trim();
    const color = document.getElementById("select-color").value.trim();
    const tipo  = document.getElementById("select-tipo").value.trim();
    const ubi   = document.getElementById("select-ubicacion").value.trim();
    const sec   = document.getElementById("select-secuencia").value.trim();

    const tsInput = document.getElementById("input-ts");

    if (!op || !sec) {
        tsInput.value = "";
        document.getElementById("input-minproducidos").value = "";
        return;
    }

    // Coincidencia en la hoja Ts con los filtros aplicados
    const match = (baseDeDatos.Ts || []).find(x => {
        const opMatch = norm(getRowValue(x, 'OP')) === norm(op);
        if (!opMatch) return false;

        if (color && norm(getRowValue(x, 'COLOR')) !== norm(color)) return false;
        if (tipo  && norm(getRowValue(x, 'TIPO'))  !== norm(tipo))  return false;
        if (ubi   && norm(getRowValue(x, 'UBICACION')) !== norm(ubi)) return false;

        const secVal = getRowValue(x, 'SECUENCIA');
        return norm(secVal) === norm(sec);
    });

    if (match) {
        const tsVal = getRowValue(match, 'TS_MAQUINA');
        tsInput.value = parseFloat(tsVal || 0).toFixed(4);
        calculateMinProducidos();
    } else {
        tsInput.value = "";
        document.getElementById("input-minproducidos").value = "";
    }
}

// -----------------------------------------------------------------------
// Paso 5: Min. Producidos = Cantidad × TS
// -----------------------------------------------------------------------
function calculateMinProducidos() {
    const c = parseFloat(document.getElementById('input-cantidad').value) || 0;
    const t = parseFloat(document.getElementById('input-ts').value)       || 0;
    document.getElementById('input-minproducidos').value = (c * t).toFixed(2);
}

// -----------------------------------------------------------------------
// Utilidades de Interfaz
// -----------------------------------------------------------------------

/** Resetea un select dejando solo la primera opción de placeholder */
function resetearSelect(id, placeholder) {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = `<option value="">${placeholder}</option>`;
}

// -----------------------------------------------------------------------
// Control de Candado: congela / descongela un cuadrante
// -----------------------------------------------------------------------
function toggleLock(grupo) {
    const cardIds = { 1: 'card-general', 2: 'card-estampado' };
    const card = document.getElementById(cardIds[grupo]);
    if (!card) return;

    const isLocked = card.classList.toggle('is-locked');

    // Intercambiar íconos de candado
    document.getElementById(`lock-open-${grupo}`).style.display   = isLocked ? 'none'  : '';
    document.getElementById(`lock-closed-${grupo}`).style.display = isLocked ? ''      : 'none';

    // Deshabilitar / habilitar todos los campos del cuadrante
    const fields = card.querySelectorAll('input, select');
    fields.forEach(f => {
        if (isLocked) {
            f.dataset.prevDisabled = f.disabled;
            f.disabled = true;
        } else {
            f.disabled = (f.dataset.prevDisabled === 'true');
            delete f.dataset.prevDisabled;
        }
    });
}

// -----------------------------------------------------------------------
// Limpiar grupo: borra solo los campos del cuadrante indicado
// -----------------------------------------------------------------------
function limpiarGrupo(grupo) {
    if (grupo === 1) {
        // Si el cuadrante está bloqueado, desquitar el bloqueo primero
        const card1 = document.getElementById('card-general');
        if (card1 && card1.classList.contains('is-locked')) toggleLock(1);

        document.getElementById('input-fecha').value       = '';
        document.getElementById('select-turno').value      = '';
        document.getElementById('select-supervisor').value  = '';
        document.getElementById('select-maquina').value    = '';
        document.getElementById('select-maquinista').value = '';
        document.getElementById('select-inspeccion').value = '';
        document.getElementById('select-ayudantes').value  = '';

        // Restaurar fecha al día de hoy
        document.getElementById('input-fecha').valueAsDate = new Date();

    } else if (grupo === 2) {
        const card2 = document.getElementById('card-estampado');
        if (card2 && card2.classList.contains('is-locked')) toggleLock(2);

        // Al limpiar el cuadrante de estampado también se resetean los dependientes
        document.getElementById('select-op').value    = '';
        document.getElementById('input-cliente').value = '';
        document.getElementById('input-estilo').value  = '';
        resetearSelect('select-color',    'Seleccione color...');
        resetearSelect('select-tipo',     'Seleccione...');
        resetearSelect('select-ubicacion', 'Seleccione...');
        resetearSelect('select-secuencia', 'Seleccione...');
        document.getElementById('input-ts').value           = '';
        document.getElementById('input-minproducidos').value = '';

    } else if (grupo === 3) {
        document.getElementById('input-talla').value    = '';
        document.getElementById('input-cantidad').value = '';
        // input-ts (TS_MAQUINA) se conserva para el siguiente registro
        calculateMinProducidos(); // actualiza Min. Producidos a 0

        // Volver el foco al campo Talla
        document.getElementById('input-talla').focus();
    }
}

// -----------------------------------------------------------------------
// Toggle colapsar / expandir Información General
// -----------------------------------------------------------------------
function toggleGeneralInfo() {
    const body    = document.getElementById('group-1-fields');
    const chevron = document.getElementById('chevron-general');
    if (!body) return;

    const isCollapsed = body.classList.toggle('is-collapsed');
    chevron.style.transform = isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
}

// -----------------------------------------------------------------------
// Toggle colapsar / expandir Información de Estampado
// -----------------------------------------------------------------------
function toggleEstampadoInfo() {
    const body    = document.getElementById('group-2-fields');
    const chevron = document.getElementById('chevron-estampado');
    if (!body) return;

    const isCollapsed = body.classList.toggle('is-collapsed');
    if (chevron) {
        chevron.style.transform = isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
    }
}

