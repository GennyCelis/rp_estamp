/**
 * PROD-SYS - Módulo de Registro de Tiempos Estándares (TS)
 * 
 * Modos de operación:
 * 1. Búsqueda de OP / Proto: Búsqueda dinámica con filtros en cascada en la base 'Ts' (OP/Proto → Tipo/Color → Ubicación → Evento → TS Detalle)
 * 2. Registro Nuevo: Al ingresar OP, autocompleta Proto, Cliente, Estilo y Color desde la hoja 'Op'.
 *    - Tipo: Desplegable desde la hoja 'Tipo'.
 *    - Ubicación: Desplegable desde la hoja 'Ubicacion'.
 *    - Descripción: Digitalizado manualmente por el usuario.
 *    - Evento: Desplegable desde la hoja 'Secuencia' (columna Evento: 1, 2, 3, 4, 5...).
 *    - ObsEvento: Secuencia descriptiva desde la hoja 'Secuencia' (columna Secuencia: "Cambio a 2 vueltas", etc.) según el Evento elegido.
 */

let modoTS = 'buscar'; // 'buscar' | 'nuevo'

/**
 * Inicializa datalists y listas maestras del módulo de Registro de TS
 */
function inicializarModuloTS() {
    if (!baseDeDatos) return;

    // 1. Llenar datalist de OPs
    const opsUnicas = [];
    const controlOPs = new Set();

    if (Array.isArray(baseDeDatos.Op)) {
        baseDeDatos.Op.forEach(item => {
            const opVal = item.OrdenPedido || item.OP || item.Op || item.Orden;
            if (opVal && !controlOPs.has(norm(opVal))) {
                controlOPs.add(norm(opVal));
                opsUnicas.push({ OrdenPedido: String(opVal).trim() });
            }
        });
    }
    if (Array.isArray(baseDeDatos.Ts)) {
        baseDeDatos.Ts.forEach(item => {
            const opVal = getTsValue(item, 'OP');
            if (opVal && !controlOPs.has(norm(opVal))) {
                controlOPs.add(norm(opVal));
                opsUnicas.push({ OrdenPedido: String(opVal).trim() });
            }
        });
    }
    llenarDatalist("list-ts-op", opsUnicas, "OrdenPedido");

    // 2. Llenar datalist de Protos
    const protosUnicos = [];
    const controlProtos = new Set();

    if (Array.isArray(baseDeDatos.Op)) {
        baseDeDatos.Op.forEach(item => {
            const protoVal = item.Proto || item.PROTO || item.proto;
            if (protoVal && !controlProtos.has(norm(protoVal))) {
                controlProtos.add(norm(protoVal));
                protosUnicos.push({ Proto: String(protoVal).trim() });
            }
        });
    }
    if (Array.isArray(baseDeDatos.Ts)) {
        baseDeDatos.Ts.forEach(item => {
            const protoVal = getTsValue(item, 'PROTO');
            if (protoVal && !controlProtos.has(norm(protoVal))) {
                controlProtos.add(norm(protoVal));
                protosUnicos.push({ Proto: String(protoVal).trim() });
            }
        });
    }
    llenarDatalist("list-ts-proto", protosUnicos, "Proto");

    // Cargar listas maestras iniciales
    cargarSelectsMaestrosTS();

    // Establecer modo inicial
    activarModoBusquedaTS(false);
}

/**
 * Carga los desplegables de Tipo, Ubicación y Secuencia/Evento desde sus hojas maestras
 */
function cargarSelectsMaestrosTS() {
    if (!baseDeDatos) return;

    // 1. Tipo desde hoja 'Tipo'
    if (Array.isArray(baseDeDatos.Tipo) && baseDeDatos.Tipo.length > 0) {
        llenarSelect("ts-select-tipo", baseDeDatos.Tipo, "Tipo");
    }

    // 2. Ubicación desde hoja 'Ubicacion'
    if (Array.isArray(baseDeDatos.Ubicacion) && baseDeDatos.Ubicacion.length > 0) {
        llenarSelect("ts-select-ubicacion", baseDeDatos.Ubicacion, "Ubicacion");
    }

    // 3. Evento desde hoja 'Secuencia' (columna Evento)
    const eventos = obtenerEventosDeSecuencia();
    if (eventos.length > 0) {
        llenarSelect("ts-select-evento", eventos.map(e => ({ val: e })), "val");
    }

    // 4. Técnica desde hoja 'Tecnicas' (solo en modo Registro Nuevo)
    if (Array.isArray(baseDeDatos.Tecnicas) && baseDeDatos.Tecnicas.length > 0) {
        const selTecnica = document.getElementById("ts-select-tecnica");
        if (selTecnica) {
            selTecnica.innerHTML = '<option value="">Seleccione técnica...</option>';
            baseDeDatos.Tecnicas.forEach(item => {
                const val = item.Tecnicas || item.TECNICAS || item.Tecnica || item.TECNICA || item[Object.keys(item)[0]];
                if (val) {
                    const opt = document.createElement('option');
                    opt.value = String(val).trim();
                    opt.textContent = String(val).trim();
                    selTecnica.appendChild(opt);
                }
            });
        }
    }
}

/**
 * Muestra u oculta el campo Técnica según el modo activo
 */
function actualizarVisibilidadTecnica() {
    const inputTecnica  = document.getElementById('ts-input-tecnica');
    const selectTecnica = document.getElementById('ts-select-tecnica');
    if (!inputTecnica || !selectTecnica) return;

    if (modoTS === 'nuevo') {
        inputTecnica.style.display  = 'none';
        selectTecnica.style.display = '';
    } else {
        inputTecnica.style.display  = '';
        selectTecnica.style.display = 'none';
    }
}

/**
 * Extrae la lista única de eventos de la columna 'Evento' de la hoja 'Secuencia'
 */
function obtenerEventosDeSecuencia() {
    if (!baseDeDatos || !Array.isArray(baseDeDatos.Secuencia)) return [];

    const eventos = [];
    const control = new Set();

    baseDeDatos.Secuencia.forEach(r => {
        const ev = r.Evento !== undefined ? r.Evento : (r.EVENTO !== undefined ? r.EVENTO : (r.evento !== undefined ? r.evento : r.Nro));
        if (ev !== undefined && ev !== null && String(ev).trim() !== "") {
            const evStr = String(ev).trim();
            if (!control.has(norm(evStr))) {
                control.add(norm(evStr));
                eventos.push(evStr);
            }
        }
    });

    eventos.sort((a, b) => {
        const numA = parseInt(a, 10);
        const numB = parseInt(b, 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.localeCompare(b);
    });

    return eventos;
}

/**
 * Busca el texto de la columna 'Secuencia' correspondiente al número de Evento en la hoja 'Secuencia'
 * Ejemplo: Evento 5 -> "Cambio a 2 vueltas"
 */
function obtenerObsEventoDeSecuencia(eventoVal) {
    if (!baseDeDatos || !Array.isArray(baseDeDatos.Secuencia) || !eventoVal) return "";

    const targetNorm = norm(eventoVal);

    const row = baseDeDatos.Secuencia.find(r => {
        const ev = r.Evento !== undefined ? r.Evento : (r.EVENTO !== undefined ? r.EVENTO : (r.evento !== undefined ? r.evento : r.Nro));
        return norm(ev) === targetNorm;
    });

    if (!row) return "";

    const secuenciaTexto = row.Secuencia !== undefined ? row.Secuencia :
                           (row.SECUENCIA !== undefined ? row.SECUENCIA :
                           (row.secuencia !== undefined ? row.secuencia :
                           (row.ObsEvento || row.OBS_EVENTO || row.Descripcion || row.DESCRIPCION || "")));

    return String(secuenciaTexto).trim();
}

/**
 * Obtiene el valor de un campo en una fila de la base de TS con soporte para múltiples nombres de columna
 */
function getTsValue(row, fieldName) {
    if (!row || typeof row !== "object") return "";
    const target = norm(fieldName);

    const exactKey = Object.keys(row).find(k => norm(k) === target);
    if (exactKey !== undefined && row[exactKey] !== undefined && row[exactKey] !== null) {
        return String(row[exactKey]).trim();
    }

    const aliases = {
        OP: ["OP", "ORDENPEDIDO", "ORDEN_PEDIDO", "ORDEN", "NRO_OP", "NROOP"],
        PROTO: ["PROTO", "PROTOTIPO", "NRO_PROTO", "COD_PROTO", "PROTO_NRO"],
        CLIENTE: ["CLIENTE", "CLIENT", "NOM_CLIENTE"],
        ESTILO: ["ESTILO", "STYLE", "NOM_ESTILO"],
        COLOR: ["COLOR", "COLORES", "COLOUR"],
        TIPO: ["TIPO", "TIPOS", "TIPO_PRENDA"],
        UBICACION: ["UBICACION", "UBICACIÓN", "UBICACIONES", "UBI", "POSICION"],
        DESCRIPCION: ["DESCRIPCION", "DESCRIPCIÓN", "DESC", "DESCRIP"],
        EVENTO: ["EVENTO", "EVENTOS", "SECUENCIA", "SECUENCIAS"],
        OBS_EVENTO: ["OBS_EVENTO", "OBSEVENTO", "OBS EVENTO", "OBSERVACION_EVENTO", "OBS", "SECUENCIA"],
        TS_MAQUINA: ["TS_MAQUINA", "TSMAQUINA", "TS_MAQ", "TS", "TIEMPO_ESTANDAR"],
        TS_MARCADO: ["TS_MARCADO", "TSMARCADO", "MARCADO"],
        TS_BORRARMARCACUADRO: ["TS_BORRARMARCACUADRO", "TS_BorrarMarcaCuadro", "BORRARMARCACUADRO", "BORRAR_MARCA_CUADRO"],
        TS_BORRARTIZA: ["TS_BORRARTIZA", "TS_BorrarTiza", "BORRARTIZA", "BORRAR_TIZA"],
        TS_PLANCHA: ["TS_PLANCHA", "TS_Plancha", "PLANCHA"],
        TS_HORNO2PASE: ["TS_HORNO2PASE", "TS_Horno2pase", "HORNO2PASE", "HORNO_2_PASE", "HORNO_2PASE"],
        TS_HORNODESPVAPORIZAR: ["TS_HORNODESPVAPORIZAR", "TS_HornoDespVaporizar", "HORNODESPVAPORIZAR", "HORNO_DESP_VAPORIZAR", "HORNO_DESPVAPORIZAR"],
        TS_HORNOCOMPLEMENTOS: ["TS_HORNOCOMPLEMENTOS", "TS_HornoComplementos", "HORNOCOMPLEMENTOS", "HORNO_COMPLEMENTOS"],
        RESERVA1: ["RESERVA1", "RESERVA_1", "RES1"],
        RESERVA2: ["RESERVA2", "RESERVA_2", "RES2"],
        TS_MANUAL: ["TS_MANUAL", "TSMANUAL", "MANUAL"],
        TOTAL_TS: ["TOTAL_TS", "TOTALTS", "TOTAL"],
        VAL_MAQUINA: ["VAL_MAQUINA", "VALMAQUINA", "VALORACION_MAQUINA", "VALMAQ"],
        VAL_MANUAL: ["VAL_MANUAL", "VALMANUAL", "VALORACION_MANUAL"],
        TECNICA: ["TECNICA", "TÉCNICA", "TECHNIQUE", "TIPO_TECNICA"]
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
 * Fuerza el selector Ts Estimado a un estado consistente.
 */
function setTsEstimado(esSi) {
    const chkSi = document.getElementById('ts-estimado-maq-si');
    const chkNo = document.getElementById('ts-estimado-maq-no');
    if (!chkSi || !chkNo) return;

    chkSi.checked = !!esSi;
    chkNo.checked = !esSi;
}

/**
 * Devuelve el flag que debe guardarse en la hoja Ts.
 * S = Si, N = No.
 */
function getTsEstimadoFlag() {
    return document.getElementById('ts-estimado-maq-si')?.checked ? 'S' : 'N';
}

/**
 * Aplica a la UI el estado guardado en la base.
 * Acepta S/N, Si/No, true/false o valores vacíos.
 */
function aplicarTsEstimadoDesdeValor(valor) {
    const raw = String(valor ?? '').trim().toUpperCase();
    const esSi = raw === 'S' || raw === 'SI' || raw === 'TRUE' || raw === '1' || raw === 'Y' || raw === 'YES';
    setTsEstimado(esSi);
}

function formatearNumeroTS(valor) {
    const num = parseFloat(valor);
    return Number.isFinite(num) ? num.toFixed(4) : "";
}

/**
 * Activa o desactiva el comportamiento de mayúsculas para Descripción.
 * En Registro Nuevo se fuerza escritura en mayúsculas; en búsqueda se deja libre.
 */
function configurarDescripcionMayusculasTS(activar) {
    const inputDescripcion = document.getElementById('ts-input-descripcion');
    if (!inputDescripcion) return;

    inputDescripcion.style.textTransform = activar ? 'uppercase' : '';
    inputDescripcion.dataset.uppercaseTs = activar ? 'true' : 'false';
}

/**
 * Sincroniza botones, badge y comportamiento visual con el modo actual.
 */
function sincronizarUIModoTS() {
    const btnBuscar = document.getElementById("btn-ts-modo-buscar");
    const btnNuevo = document.getElementById("btn-ts-modo-nuevo");
    const badge = document.getElementById("ts-modo-badge");

    if (modoTS === 'nuevo') {
        if (btnBuscar) btnBuscar.className = "btn-secondary text-sm px-4 py-2 flex-initial";
        if (btnNuevo) btnNuevo.className = "btn-primary text-sm px-4 py-2 flex-initial";
        if (badge) {
            badge.innerText = "➕ Modo: Registro Nuevo";
            badge.className = "inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800";
        }
    } else {
        if (btnBuscar) btnBuscar.className = "btn-primary text-sm px-4 py-2 flex-initial";
        if (btnNuevo) btnNuevo.className = "btn-secondary text-sm px-4 py-2 flex-initial";
        if (badge) {
            badge.innerText = "🔍 Modo: Búsqueda de OP / Proto";
            badge.className = "inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800";
        }
    }

    actualizarVisibilidadTecnica();
    configurarDescripcionMayusculasTS(modoTS === 'nuevo');
}

/**
 * Fuerza el contenido de Descripción a mayúsculas solo en modo Registro Nuevo.
 */
function forzarMayusculasDescripcionTS() {
    const inputDescripcion = document.getElementById('ts-input-descripcion');
    if (!inputDescripcion || modoTS !== 'nuevo') return;

    const valor = inputDescripcion.value;
    const valorMayusculas = valor.toUpperCase();
    if (valor !== valorMayusculas) {
        inputDescripcion.value = valorMayusculas;
    }
}

/**
 * Cambia la interfaz al modo "Búsqueda de OP / Proto"
 */
function activarModoBusquedaTS(notify = true) {
    modoTS = 'buscar';
    sincronizarUIModoTS();
    resetearCamposDependientesTS();

    const op = document.getElementById("ts-input-op")?.value.trim();
    const proto = document.getElementById("ts-input-proto")?.value.trim();
    if (op) {
        actualizarDatosTsOP();
    } else if (proto) {
        actualizarDatosTsProto();
    }

    if (notify) {
        showToast("Modo Búsqueda de OP activado");
        document.getElementById("ts-input-op")?.focus();
    }
}

/**
 * Alias para botón superior
 */
function buscarOPTS() {
    activarModoBusquedaTS(true);
}

/**
 * Cambia la interfaz al modo "Registro Nuevo"
 */
function activarModoNuevoTS(notify = true) {
    modoTS = 'nuevo';
    sincronizarUIModoTS();
    limpiarTodoTS(false);
    cargarSelectsMaestrosTS();
    forzarMayusculasDescripcionTS();

    const op = document.getElementById("ts-input-op")?.value.trim();
    if (op) {
        actualizarDatosTsOP();
    }

    if (notify) {
        showToast("Modo Registro Nuevo activado");
        document.getElementById("ts-input-op")?.focus();
    }
}

/**
 * Alias para botón superior
 */
function nuevoRegistroTS() {
    activarModoNuevoTS(true);
}

/**
 * Restaura el modo "Registro Nuevo" sin limpiar los campos cargados.
 */
function restaurarModoNuevoTS() {
    modoTS = 'nuevo';
    sincronizarUIModoTS();
    cargarSelectsMaestrosTS();
}

/**
 * Toma una copia del estado visible del formulario TS para restaurarlo tras un reload.
 */
function capturarEstadoFormularioTS() {
    const getVal = (id) => document.getElementById(id)?.value ?? "";
    return {
        op: getVal('ts-input-op').trim(),
        proto: getVal('ts-input-proto').trim(),
        cliente: getVal('ts-input-cliente').trim(),
        estilo: getVal('ts-input-estilo').trim(),
        color: getVal('ts-select-color').trim(),
        tipo: getVal('ts-select-tipo').trim(),
        ubicacion: getVal('ts-select-ubicacion').trim(),
        evento: getVal('ts-select-evento').trim(),
        descripcion: getVal('ts-input-descripcion').trim(),
        obsevento: getVal('ts-input-obsevento').trim(),
        tecnicaSelect: getVal('ts-select-tecnica').trim(),
        tecnicaInput: getVal('ts-input-tecnica').trim()
    };
}

/**
 * Reaplica el estado capturado al formulario TS.
 */
function restaurarEstadoFormularioTS(estado) {
    if (!estado) return;

    const setVal = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value ?? "";
    };

    setVal('ts-input-op', estado.op);

    if (estado.op) {
        actualizarDatosTsOP();
    } else if (estado.proto) {
        setVal('ts-input-proto', estado.proto);
        actualizarDatosTsProto();
    }

    setVal('ts-input-proto', estado.proto);
    setVal('ts-input-cliente', estado.cliente);
    setVal('ts-input-estilo', estado.estilo);
    setVal('ts-select-tipo', estado.tipo);
    setVal('ts-select-color', estado.color);
    setVal('ts-select-ubicacion', estado.ubicacion);
    setVal('ts-select-evento', estado.evento);
    setVal('ts-input-descripcion', estado.descripcion);
    setVal('ts-input-obsevento', estado.obsevento);
    setVal('ts-select-tecnica', estado.tecnicaSelect || estado.tecnicaInput);
    setVal('ts-input-tecnica', estado.tecnicaInput || estado.tecnicaSelect);
}

/**
 * 1. Búsqueda al ingresar el número de OP
 */
function actualizarDatosTsOP() {
    const opInput = document.getElementById("ts-input-op");
    if (!opInput) return;
    const opVal = opInput.value.trim();

    if (!opVal) {
        resetearCamposDependientesTS();
        return;
    }

    if (!baseDeDatos) return;

    if (modoTS === 'nuevo') {
        // ─────────────────────────────────────────────────────────────
        // MODO REGISTRO NUEVO:
        // Busca en la base de la hoja "Op" (Proto, Cliente, Estilo, Color)
        // ─────────────────────────────────────────────────────────────
        const filasOp = (baseDeDatos.Op || []).filter(r => {
            const op = r.OrdenPedido || r.OP || r.Op || r.Orden || "";
            return norm(op) === norm(opVal);
        });

        if (filasOp.length > 0) {
            const primeraFila = filasOp[0];

            const proto = primeraFila.Proto || primeraFila.PROTO || primeraFila.proto || "";
            const cliente = primeraFila.Cliente || primeraFila.CLIENTE || primeraFila.cliente || "";
            const estilo = primeraFila.Estilo || primeraFila.ESTILO || primeraFila.estilo || "";
            const tipo = primeraFila.Tipo || primeraFila.TIPO || primeraFila.tipo || "";

            document.getElementById("ts-input-proto").value = proto;
            document.getElementById("ts-input-cliente").value = cliente;
            document.getElementById("ts-input-estilo").value = estilo;

            if (tipo) {
                const selTipo = document.getElementById("ts-select-tipo");
                if (selTipo) selTipo.value = tipo;
            }

            // Desplegable de Colores únicos encontrados en la hoja 'Op'
            const coloresUnicos = [];
            const vistoColores = new Set();
            filasOp.forEach(r => {
                const col = r.Color || r.COLOR || r.color || r.Colores || "";
                if (col && !vistoColores.has(norm(col))) {
                    vistoColores.add(norm(col));
                    coloresUnicos.push(String(col).trim());
                }
            });

            llenarSelect("ts-select-color", coloresUnicos.map(c => ({ val: c })), "val");

            if (coloresUnicos.length === 1) {
                document.getElementById("ts-select-color").value = coloresUnicos[0];
            }
        } else {
            // Fallback si no está en Op pero sí en Ts
            const filasTs = (baseDeDatos.Ts || []).filter(r => norm(getTsValue(r, 'OP')) === norm(opVal));
            if (filasTs.length > 0) {
                const match = filasTs[0];
                document.getElementById("ts-input-proto").value = getTsValue(match, 'PROTO');
                document.getElementById("ts-input-cliente").value = getTsValue(match, 'CLIENTE');
                document.getElementById("ts-input-estilo").value = getTsValue(match, 'ESTILO');

                const coloresUnicos = [];
                const visto = new Set();
                filasTs.forEach(r => {
                    const col = getTsValue(r, 'COLOR');
                    if (col && !visto.has(norm(col))) {
                        visto.add(norm(col));
                        coloresUnicos.push(col);
                    }
                });
                llenarSelect("ts-select-color", coloresUnicos.map(c => ({ val: c })), "val");
                if (coloresUnicos.length === 1) {
                    document.getElementById("ts-select-color").value = coloresUnicos[0];
                }
            } else {
                document.getElementById("ts-input-proto").value = "";
                document.getElementById("ts-input-cliente").value = "";
                document.getElementById("ts-input-estilo").value = "";
                resetearSelect("ts-select-color", "Seleccione color...");
            }
        }

    } else {
        // ─────────────────────────────────────────────────────────────
        // MODO BÚSQUEDA DE OP (Consulta en base 'Ts')
        // ─────────────────────────────────────────────────────────────
        const filasTs = (baseDeDatos.Ts || []).filter(r => norm(getTsValue(r, 'OP')) === norm(opVal));
        const infoOp = (baseDeDatos.Op || []).find(r => norm(r.OrdenPedido || r.OP || r.Op) === norm(opVal));

        if (filasTs.length > 0) {
            const primeraFila = filasTs[0];

            const proto = getTsValue(primeraFila, 'PROTO') || (infoOp ? (infoOp.Proto || infoOp.PROTO || "") : "");
            const cliente = getTsValue(primeraFila, 'CLIENTE') || (infoOp ? (infoOp.Cliente || "") : "");
            const estilo = getTsValue(primeraFila, 'ESTILO') || (infoOp ? (infoOp.Estilo || "") : "");
            const tipo = getTsValue(primeraFila, 'TIPO') || (infoOp ? (infoOp.Tipo || "") : "");

            if (proto) document.getElementById("ts-input-proto").value = proto;
            if (cliente) document.getElementById("ts-input-cliente").value = cliente;
            if (estilo) document.getElementById("ts-input-estilo").value = estilo;

            // 1. Tipos únicos de la hoja 'Ts' para esta OP
            const tiposUnicos = [];
            const vistoTipos = new Set();
            filasTs.forEach(row => {
                const t = getTsValue(row, 'TIPO');
                if (t && !vistoTipos.has(norm(t))) {
                    vistoTipos.add(norm(t));
                    tiposUnicos.push(t);
                }
            });

            if (tiposUnicos.length > 0) {
                llenarSelect("ts-select-tipo", tiposUnicos.map(t => ({ val: t })), "val");
                if (tiposUnicos.length === 1) {
                    document.getElementById("ts-select-tipo").value = tiposUnicos[0];
                } else if (tipo && tiposUnicos.some(t => norm(t) === norm(tipo))) {
                    document.getElementById("ts-select-tipo").value = tipo;
                }
            } else if (Array.isArray(baseDeDatos.Tipo) && baseDeDatos.Tipo.length > 0) {
                llenarSelect("ts-select-tipo", baseDeDatos.Tipo, "Tipo");
                if (tipo) {
                    document.getElementById("ts-select-tipo").value = tipo;
                }
            } else if (tipo) {
                llenarSelect("ts-select-tipo", [{ val: tipo }], "val");
                document.getElementById("ts-select-tipo").value = tipo;
            }

            // 2. Colores únicos filtrados por Tipo (si aplica)
            const tipoActual = document.getElementById("ts-select-tipo")?.value.trim();
            const filasParaColor = tipoActual ? filasTs.filter(r => norm(getTsValue(r, 'TIPO')) === norm(tipoActual)) : filasTs;

            const coloresUnicos = [];
            const vistoColores = new Set();
            (filasParaColor.length > 0 ? filasParaColor : filasTs).forEach(row => {
                const col = getTsValue(row, 'COLOR');
                if (col && !vistoColores.has(norm(col))) {
                    vistoColores.add(norm(col));
                    coloresUnicos.push(col);
                }
            });

            llenarSelect("ts-select-color", coloresUnicos.map(c => ({ val: c })), "val");

            if (coloresUnicos.length === 1) {
                document.getElementById("ts-select-color").value = coloresUnicos[0];
                actualizarTsColor();
            } else {
                resetearSelect("ts-select-ubicacion", "Seleccione ubicación...");
                resetearSelect("ts-select-evento", "Seleccione evento...");
                document.getElementById("ts-input-descripcion").value = "";
                document.getElementById("ts-input-obsevento").value = "";
                limpiarDetalleTS();
            }

        } else if (infoOp) {
            const proto = infoOp.Proto || infoOp.PROTO || "";
            const cliente = infoOp.Cliente || infoOp.cliente || "";
            const estilo = infoOp.Estilo || infoOp.estilo || "";
            const tipo = infoOp.Tipo || infoOp.tipo || "";

            if (proto) document.getElementById("ts-input-proto").value = proto;
            if (cliente) document.getElementById("ts-input-cliente").value = cliente;
            if (estilo) document.getElementById("ts-input-estilo").value = estilo;

            if (tipo) {
                llenarSelect("ts-select-tipo", [{ val: tipo }], "val");
                document.getElementById("ts-select-tipo").value = tipo;
            } else if (Array.isArray(baseDeDatos.Tipo) && baseDeDatos.Tipo.length > 0) {
                llenarSelect("ts-select-tipo", baseDeDatos.Tipo, "Tipo");
            }

            resetearSelect("ts-select-color", "Seleccione color...");
            resetearSelect("ts-select-ubicacion", "Seleccione ubicación...");
            resetearSelect("ts-select-evento", "Seleccione evento...");
            document.getElementById("ts-input-descripcion").value = "";
            document.getElementById("ts-input-obsevento").value = "";
            limpiarDetalleTS();
        } else {
            resetearCamposDependientesTS();
        }
    }
}

/**
 * 1.1 Búsqueda al ingresar el número de Proto
 */
function actualizarDatosTsProto() {
    const protoInput = document.getElementById("ts-input-proto");
    if (!protoInput) return;
    const protoVal = protoInput.value.trim();

    if (!protoVal || !baseDeDatos) return;

    if (modoTS === 'nuevo') {
        const filasOp = (baseDeDatos.Op || []).filter(r => {
            const proto = r.Proto || r.PROTO || r.proto || "";
            return norm(proto) === norm(protoVal);
        });

        if (filasOp.length > 0) {
            const primeraFila = filasOp[0];
            const op = primeraFila.OrdenPedido || primeraFila.OP || primeraFila.Op || "";
            const cliente = primeraFila.Cliente || primeraFila.CLIENTE || primeraFila.cliente || "";
            const estilo = primeraFila.Estilo || primeraFila.ESTILO || primeraFila.estilo || "";
            const tipo = primeraFila.Tipo || primeraFila.TIPO || primeraFila.tipo || "";

            if (op) document.getElementById("ts-input-op").value = op;
            if (cliente) document.getElementById("ts-input-cliente").value = cliente;
            if (estilo) document.getElementById("ts-input-estilo").value = estilo;
            if (tipo) {
                const selTipo = document.getElementById("ts-select-tipo");
                if (selTipo) selTipo.value = tipo;
            }

            const coloresUnicos = [];
            const visto = new Set();
            filasOp.forEach(r => {
                const col = r.Color || r.COLOR || r.color || r.Colores || "";
                if (col && !visto.has(norm(col))) {
                    visto.add(norm(col));
                    coloresUnicos.push(String(col).trim());
                }
            });

            llenarSelect("ts-select-color", coloresUnicos.map(c => ({ val: c })), "val");
            if (coloresUnicos.length === 1) {
                document.getElementById("ts-select-color").value = coloresUnicos[0];
            }
        }
    } else {
        const filasTs = (baseDeDatos.Ts || []).filter(r => norm(getTsValue(r, 'PROTO')) === norm(protoVal));
        const infoOp = (baseDeDatos.Op || []).find(r => norm(r.Proto || r.PROTO || r.proto) === norm(protoVal));

        if (filasTs.length > 0) {
            const primeraFila = filasTs[0];
            const op = getTsValue(primeraFila, 'OP') || (infoOp ? (infoOp.OrdenPedido || infoOp.OP || "") : "");
            const cliente = getTsValue(primeraFila, 'CLIENTE') || (infoOp ? (infoOp.Cliente || "") : "");
            const estilo = getTsValue(primeraFila, 'ESTILO') || (infoOp ? (infoOp.Estilo || "") : "");
            const tipo = getTsValue(primeraFila, 'TIPO') || (infoOp ? (infoOp.Tipo || "") : "");

            if (op) document.getElementById("ts-input-op").value = op;
            if (cliente) document.getElementById("ts-input-cliente").value = cliente;
            if (estilo) document.getElementById("ts-input-estilo").value = estilo;

            // 1. Tipos únicos de la hoja 'Ts'
            const tiposUnicos = [];
            const vistoTipos = new Set();
            filasTs.forEach(row => {
                const t = getTsValue(row, 'TIPO');
                if (t && !vistoTipos.has(norm(t))) {
                    vistoTipos.add(norm(t));
                    tiposUnicos.push(t);
                }
            });

            if (tiposUnicos.length > 0) {
                llenarSelect("ts-select-tipo", tiposUnicos.map(t => ({ val: t })), "val");
                if (tiposUnicos.length === 1) {
                    document.getElementById("ts-select-tipo").value = tiposUnicos[0];
                } else if (tipo && tiposUnicos.some(t => norm(t) === norm(tipo))) {
                    document.getElementById("ts-select-tipo").value = tipo;
                }
            } else if (Array.isArray(baseDeDatos.Tipo) && baseDeDatos.Tipo.length > 0) {
                llenarSelect("ts-select-tipo", baseDeDatos.Tipo, "Tipo");
                if (tipo) {
                    document.getElementById("ts-select-tipo").value = tipo;
                }
            } else if (tipo) {
                llenarSelect("ts-select-tipo", [{ val: tipo }], "val");
                document.getElementById("ts-select-tipo").value = tipo;
            }

            // 2. Colores únicos
            const tipoActual = document.getElementById("ts-select-tipo")?.value.trim();
            const filasParaColor = tipoActual ? filasTs.filter(r => norm(getTsValue(r, 'TIPO')) === norm(tipoActual)) : filasTs;

            const coloresUnicos = [];
            const vistoColores = new Set();
            (filasParaColor.length > 0 ? filasParaColor : filasTs).forEach(row => {
                const col = getTsValue(row, 'COLOR');
                if (col && !vistoColores.has(norm(col))) {
                    vistoColores.add(norm(col));
                    coloresUnicos.push(col);
                }
            });

            llenarSelect("ts-select-color", coloresUnicos.map(c => ({ val: c })), "val");

            if (coloresUnicos.length === 1) {
                document.getElementById("ts-select-color").value = coloresUnicos[0];
                actualizarTsColor();
            } else {
                resetearSelect("ts-select-ubicacion", "Seleccione ubicación...");
                resetearSelect("ts-select-evento", "Seleccione evento...");
                document.getElementById("ts-input-descripcion").value = "";
                document.getElementById("ts-input-obsevento").value = "";
                limpiarDetalleTS();
            }
        }
    }
}

/**
 * 1.2 Al seleccionar o cambiar Tipo en Modo Búsqueda
 */
function actualizarTsTipo() {
    if (modoTS !== 'buscar') return;

    const opVal = document.getElementById("ts-input-op")?.value.trim();
    const protoVal = document.getElementById("ts-input-proto")?.value.trim();
    const tipoVal = document.getElementById("ts-select-tipo")?.value.trim();

    if (!baseDeDatos || (!opVal && !protoVal)) return;

    const filasTs = (baseDeDatos.Ts || []).filter(r => {
        const matchOp = opVal ? (norm(getTsValue(r, 'OP')) === norm(opVal)) : true;
        const matchProto = protoVal ? (norm(getTsValue(r, 'PROTO')) === norm(protoVal)) : true;
        const matchTipo = tipoVal ? (norm(getTsValue(r, 'TIPO')) === norm(tipoVal)) : true;
        return (matchOp || matchProto) && matchTipo;
    });

    const coloresUnicos = [];
    const vistoColores = new Set();
    filasTs.forEach(row => {
        const col = getTsValue(row, 'COLOR');
        if (col && !vistoColores.has(norm(col))) {
            vistoColores.add(norm(col));
            coloresUnicos.push(col);
        }
    });

    llenarSelect("ts-select-color", coloresUnicos.map(c => ({ val: c })), "val");

    if (coloresUnicos.length === 1) {
        document.getElementById("ts-select-color").value = coloresUnicos[0];
        actualizarTsColor();
    } else {
        resetearSelect("ts-select-ubicacion", "Seleccione ubicación...");
        resetearSelect("ts-select-evento", "Seleccione evento...");
        document.getElementById("ts-input-descripcion").value = "";
        document.getElementById("ts-input-obsevento").value = "";
        limpiarDetalleTS();
    }
}

/**
 * 2. Al seleccionar Color
 */
function actualizarTsColor() {
    if (modoTS !== 'buscar') return;

    const opVal = document.getElementById("ts-input-op")?.value.trim();
    const protoVal = document.getElementById("ts-input-proto")?.value.trim();
    const tipoVal = document.getElementById("ts-select-tipo")?.value.trim();
    const colorVal = document.getElementById("ts-select-color")?.value.trim();

    resetearSelect("ts-select-ubicacion", "Seleccione ubicación...");
    resetearSelect("ts-select-evento", "Seleccione evento...");
    document.getElementById("ts-input-descripcion").value = "";
    document.getElementById("ts-input-obsevento").value = "";
    limpiarDetalleTS();

    if (!colorVal || (!opVal && !protoVal) || !baseDeDatos) return;

    const filasFiltradas = (baseDeDatos.Ts || []).filter(r => {
        const matchOp = opVal ? (norm(getTsValue(r, 'OP')) === norm(opVal)) : true;
        const matchProto = protoVal ? (norm(getTsValue(r, 'PROTO')) === norm(protoVal)) : true;
        const matchTipo = tipoVal ? (norm(getTsValue(r, 'TIPO')) === norm(tipoVal)) : true;
        const matchColor = norm(getTsValue(r, 'COLOR')) === norm(colorVal);
        return (matchOp || matchProto) && matchColor && matchTipo;
    });

    const ubicacionesUnicas = [];
    const vistoUbicaciones = new Set();
    filasFiltradas.forEach(row => {
        const ubi = getTsValue(row, 'UBICACION');
        if (ubi && !vistoUbicaciones.has(norm(ubi))) {
            vistoUbicaciones.add(norm(ubi));
            ubicacionesUnicas.push(ubi);
        }
    });

    llenarSelect("ts-select-ubicacion", ubicacionesUnicas.map(u => ({ val: u })), "val");

    if (ubicacionesUnicas.length === 1) {
        document.getElementById("ts-select-ubicacion").value = ubicacionesUnicas[0];
        actualizarTsUbicacion();
    }
}

/**
 * 3. Al seleccionar Ubicación
 */
function actualizarTsUbicacion() {
    if (modoTS !== 'buscar') return;

    const opVal = document.getElementById("ts-input-op")?.value.trim();
    const protoVal = document.getElementById("ts-input-proto")?.value.trim();
    const tipoVal = document.getElementById("ts-select-tipo")?.value.trim();
    const colorVal = document.getElementById("ts-select-color")?.value.trim();
    const ubiVal = document.getElementById("ts-select-ubicacion")?.value.trim();

    resetearSelect("ts-select-evento", "Seleccione evento...");
    document.getElementById("ts-input-descripcion").value = "";
    document.getElementById("ts-input-obsevento").value = "";
    limpiarDetalleTS();

    if (!ubiVal || !colorVal || (!opVal && !protoVal) || !baseDeDatos) return;

    const filasFiltradas = (baseDeDatos.Ts || []).filter(r => {
        const matchOp = opVal ? (norm(getTsValue(r, 'OP')) === norm(opVal)) : true;
        const matchProto = protoVal ? (norm(getTsValue(r, 'PROTO')) === norm(protoVal)) : true;
        const matchTipo = tipoVal ? (norm(getTsValue(r, 'TIPO')) === norm(tipoVal)) : true;
        const matchColor = norm(getTsValue(r, 'COLOR')) === norm(colorVal);
        const matchUbi = norm(getTsValue(r, 'UBICACION')) === norm(ubiVal);
        return (matchOp || matchProto) && matchColor && matchUbi && matchTipo;
    });

    if (filasFiltradas.length > 0) {
        const desc = getTsValue(filasFiltradas[0], 'DESCRIPCION');
        document.getElementById("ts-input-descripcion").value = desc;

        const eventosUnicos = [];
        const vistoEventos = new Set();
        filasFiltradas.forEach(row => {
            const ev = getTsValue(row, 'EVENTO');
            if (ev && !vistoEventos.has(norm(ev))) {
                vistoEventos.add(norm(ev));
                eventosUnicos.push(ev);
            }
        });

        llenarSelect("ts-select-evento", eventosUnicos.map(e => ({ val: e })), "val");

        if (eventosUnicos.length === 1) {
            document.getElementById("ts-select-evento").value = eventosUnicos[0];
            actualizarTsEvento();
        }
    }
}

/**
 * 4. Al seleccionar Evento
 * - En Modo Registro Nuevo: Busca en la base 'Secuencia' la columna 'Secuencia' correspondiente al número de evento y la coloca en ObsEvento (ej: "Cambio a 2 vueltas").
 * - En Modo Búsqueda: Carga ObsEvento y autocompleta los tiempos estándares desde 'Ts'.
 */
function actualizarTsEvento() {
    const eventoVal = document.getElementById("ts-select-evento")?.value.trim();

    if (modoTS === 'nuevo') {
        // ─────────────────────────────────────────────────────────────
        // MODO REGISTRO NUEVO:
        // Busca en la columna 'Secuencia' para el número de Evento elegido
        // ─────────────────────────────────────────────────────────────
        if (!eventoVal) {
            document.getElementById("ts-input-obsevento").value = "";
            return;
        }

        const secuenciaTexto = obtenerObsEventoDeSecuencia(eventoVal);
        document.getElementById("ts-input-obsevento").value = secuenciaTexto;

    } else {
        // ─────────────────────────────────────────────────────────────
        // MODO BÚSQUEDA:
        // Carga tiempos estándares de la fila coincidente en la base 'Ts'
        // ─────────────────────────────────────────────────────────────
        const opVal = document.getElementById("ts-input-op")?.value.trim();
        const protoVal = document.getElementById("ts-input-proto")?.value.trim();
        const tipoVal = document.getElementById("ts-select-tipo")?.value.trim();
        const colorVal = document.getElementById("ts-select-color")?.value.trim();
        const ubiVal = document.getElementById("ts-select-ubicacion")?.value.trim();

        document.getElementById("ts-input-obsevento").value = "";
        limpiarDetalleTS();

        if (!eventoVal || !ubiVal || !colorVal || (!opVal && !protoVal) || !baseDeDatos) return;

        const match = (baseDeDatos.Ts || []).find(r => {
            const matchOp = opVal ? (norm(getTsValue(r, 'OP')) === norm(opVal)) : true;
            const matchProto = protoVal ? (norm(getTsValue(r, 'PROTO')) === norm(protoVal)) : true;
            const matchTipo = tipoVal ? (norm(getTsValue(r, 'TIPO')) === norm(tipoVal)) : true;
            const matchColor = norm(getTsValue(r, 'COLOR')) === norm(colorVal);
            const matchUbi = norm(getTsValue(r, 'UBICACION')) === norm(ubiVal);
            const matchEvento = norm(getTsValue(r, 'EVENTO')) === norm(eventoVal);
            return (matchOp || matchProto) && matchColor && matchUbi && matchEvento && matchTipo;
        });

        if (match) {
            const obsEvento = getTsValue(match, 'OBS_EVENTO') || obtenerObsEventoDeSecuencia(eventoVal);
            document.getElementById("ts-input-obsevento").value = obsEvento;

            const tsMaq = getTsValue(match, 'TS_MAQUINA');
            const tsMarcado = getTsValue(match, 'TS_MARCADO');
            const tsBorrarMarcaCuadro = getTsValue(match, 'TS_BORRARMARCACUADRO');
            const tsBorrarTiza = getTsValue(match, 'TS_BORRARTIZA');
            const tsPlancha = getTsValue(match, 'TS_PLANCHA');
            const tsHorno2p = getTsValue(match, 'TS_HORNO2PASE');
            const tsHornoDesp = getTsValue(match, 'TS_HORNODESPVAPORIZAR');
            const tsHornoComp = getTsValue(match, 'TS_HORNOCOMPLEMENTOS');
            const tsRes1 = getTsValue(match, 'RESERVA1');
            const tsRes2 = getTsValue(match, 'RESERVA2');
            const tsManual = getTsValue(match, 'TS_MANUAL');

            const setNum = (id, val) => {
                const el = document.getElementById(id);
                if (el) {
                    el.value = (val !== "" && !isNaN(val)) ? parseFloat(val).toFixed(4) : "";
                }
            };

            setNum("ts-input-ts-maquina", tsMaq);
            setNum("ts-input-ts-marcado", tsMarcado);
            setNum("ts-input-ts-borrarmarcacuadro", tsBorrarMarcaCuadro);
            setNum("ts-input-ts-borrartiza", tsBorrarTiza);
            setNum("ts-input-ts-plancha", tsPlancha);
            setNum("ts-input-ts-horno2pase", tsHorno2p);
            setNum("ts-input-ts-hornodespvaporizar", tsHornoDesp);
            setNum("ts-input-ts-hornocomplementos", tsHornoComp);
            setNum("ts-input-ts-reserva1", tsRes1);
            setNum("ts-input-ts-reserva2", tsRes2);
            setNum("ts-input-ts-manual", tsManual);

            const rawValMaq = getTsValue(match, 'VAL_MAQUINA');
            const rawValMan = getTsValue(match, 'VAL_MANUAL');
            const flagEstimado = getTsValue(match, 'FLAG_TS_ESTI') || getTsValue(match, 'TS_ESTIMADO');
            aplicarTsEstimadoDesdeValor(flagEstimado);

            const valInput = document.getElementById("ts-input-ts-valoracion");
            if (valInput) {
                valInput.value = rawValMaq ? String(rawValMaq).replace('%', '').trim() : "100";
            }

            const valManualInput = document.getElementById("ts-input-ts-valoracion-manual");
            if (valManualInput) {
                valManualInput.value = rawValMan ? String(rawValMan).replace('%', '').trim() : "100";
            }

            // Técnica en modo búsqueda (readonly desde la base Ts)
            const tecnicaVal = getTsValue(match, 'TECNICA');
            const inputTecnica = document.getElementById('ts-input-tecnica');
            if (inputTecnica) inputTecnica.value = tecnicaVal;

            calcularTotalesTS();
            calcularValoracionTS();
            calcularValoracionManualTS();
        }
    }
}

/**
 * Resetea campos dependientes
 */
function resetearCamposDependientesTS() {
    document.getElementById("ts-input-proto").value = "";
    document.getElementById("ts-input-cliente").value = "";
    document.getElementById("ts-input-estilo").value = "";
    resetearSelect("ts-select-color", "Seleccione color...");
    const inputDescripcion = document.getElementById("ts-input-descripcion");
    if (inputDescripcion) {
        inputDescripcion.value = "";
        if (modoTS === 'nuevo') {
            configurarDescripcionMayusculasTS(true);
        } else {
            configurarDescripcionMayusculasTS(false);
        }
    }
    document.getElementById("ts-input-obsevento").value = "";
    const inputTec = document.getElementById('ts-input-tecnica');
    if (inputTec) inputTec.value = "";
    const selTec = document.getElementById('ts-select-tecnica');
    if (selTec) selTec.value = "";

    if (modoTS === 'buscar') {
        resetearSelect("ts-select-tipo", "Seleccione tipo...");
        resetearSelect("ts-select-ubicacion", "Seleccione ubicación...");
        resetearSelect("ts-select-evento", "Seleccione evento...");
        limpiarDetalleTS();
    } else {
        cargarSelectsMaestrosTS();
    }
}

/**
 * Limpia los campos del detalle de tiempos estándares
 */
function limpiarDetalleTS() {
    const ids = [
        "ts-input-ts-maquina", "ts-input-ts-producto",
        "ts-input-ts-marcado", "ts-input-ts-borrarmarcacuadro", "ts-input-ts-borrartiza",
        "ts-input-ts-plancha", "ts-input-ts-horno2pase", "ts-input-ts-hornodespvaporizar",
        "ts-input-ts-hornocomplementos", "ts-input-ts-reserva1", "ts-input-ts-reserva2",
        "ts-input-ts-manual", "ts-input-ts-producto-manual"
    ];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
    setTsEstimado(false);
}

/**
 * Calcula TS Manual y Total TS automáticamente si se modifican los campos
 */
function calcularTotalesTS() {
    const tsMarcado = parseFloat(document.getElementById("ts-input-ts-marcado")?.value) || 0;
    const tsBorrarMarcaCuadro = parseFloat(document.getElementById("ts-input-ts-borrarmarcacuadro")?.value) || 0;
    const tsBorrarTiza = parseFloat(document.getElementById("ts-input-ts-borrartiza")?.value) || 0;
    const tsPlancha = parseFloat(document.getElementById("ts-input-ts-plancha")?.value) || 0;
    const tsHorno2p = parseFloat(document.getElementById("ts-input-ts-horno2pase")?.value) || 0;
    const tsHornoDesp = parseFloat(document.getElementById("ts-input-ts-hornodespvaporizar")?.value) || 0;
    const tsHornoComp = parseFloat(document.getElementById("ts-input-ts-hornocomplementos")?.value) || 0;
    const tsRes1 = parseFloat(document.getElementById("ts-input-ts-reserva1")?.value) || 0;
    const tsRes2 = parseFloat(document.getElementById("ts-input-ts-reserva2")?.value) || 0;

    const sumaManuales = tsMarcado + tsBorrarMarcaCuadro + tsBorrarTiza + tsPlancha + tsHorno2p + tsHornoDesp + tsHornoComp + tsRes1 + tsRes2;

    const manualInput = document.getElementById("ts-input-ts-manual");
    if (manualInput) {
        manualInput.value = sumaManuales > 0 ? sumaManuales.toFixed(4) : "";
        calcularValoracionManualTS();
    }
}

/**
 * Calcula el producto de TS Máquina y Valoración %
 */
function calcularValoracionTS() {
    const tsMaquina = parseFloat(document.getElementById("ts-input-ts-maquina")?.value) || 0;
    const valInputStr = document.getElementById("ts-input-ts-valoracion")?.value;
    const valoracion = valInputStr !== "" && !isNaN(valInputStr) ? parseFloat(valInputStr) : 100;

    const producto = tsMaquina * (valoracion / 100);

    const productoInput = document.getElementById("ts-input-ts-producto");
    if (productoInput) {
        productoInput.value = tsMaquina > 0 ? producto.toFixed(4) : "";
    }
}

/**
 * Calcula el producto de Ts Manual y Valoración %
 */
function calcularValoracionManualTS() {
    const tsManual = parseFloat(document.getElementById("ts-input-ts-manual")?.value) || 0;
    const valInputStr = document.getElementById("ts-input-ts-valoracion-manual")?.value;
    const valoracion = valInputStr !== "" && !isNaN(valInputStr) ? parseFloat(valInputStr) : 100;

    const producto = tsManual * (valoracion / 100);

    const productoInput = document.getElementById("ts-input-ts-producto-manual");
    if (productoInput) {
        productoInput.value = tsManual > 0 ? producto.toFixed(4) : "";
    }
}

/**
 * Alterna colapsar / expandir Información General en Registro de TS
 */
function toggleTsGeneralInfo() {
    const body = document.getElementById('ts-group-1-fields');
    const chevron = document.getElementById('chevron-ts-general');
    if (!body) return;

    const isCollapsed = body.classList.toggle('is-collapsed');
    if (chevron) {
        chevron.style.transform = isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
    }
}

/**
 * Alterna colapsar / expandir Detalle de tiempo estándar en Registro de TS
 */
function toggleTsDetalleInfo() {
    const body = document.getElementById('ts-group-2-fields');
    const chevron = document.getElementById('chevron-ts-detalle');
    if (!body) return;

    const isCollapsed = body.classList.toggle('is-collapsed');
    if (chevron) {
        chevron.style.transform = isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
    }
}

/**
 * Alterna bloqueo de cuadrante en Registro de TS
 */
function toggleTsLock(grupo) {
    const cardIds = { 1: 'card-ts-general', 2: 'card-ts-detalle' };
    const card = document.getElementById(cardIds[grupo]);
    if (!card) return;

    const isLocked = card.classList.toggle('is-locked');

    const openIcon = document.getElementById(`lock-open-ts-${grupo}`);
    const closedIcon = document.getElementById(`lock-closed-ts-${grupo}`);
    if (openIcon) openIcon.style.display = isLocked ? 'none' : '';
    if (closedIcon) closedIcon.style.display = isLocked ? '' : 'none';

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

/**
 * Limpia los campos del grupo de Registro de TS
 */
function limpiarTsGrupo(grupo) {
    if (grupo === 1) {
        const card1 = document.getElementById('card-ts-general');
        if (card1 && card1.classList.contains('is-locked')) toggleTsLock(1);

        document.getElementById('ts-input-op').value = '';
        document.getElementById('ts-input-proto').value = '';
        document.getElementById('ts-input-cliente').value = '';
        document.getElementById('ts-input-estilo').value = '';
        resetearSelect('ts-select-color', 'Seleccione color...');
        document.getElementById('ts-input-descripcion').value = '';
        document.getElementById('ts-input-obsevento').value = '';
        const inputTec = document.getElementById('ts-input-tecnica');
        if (inputTec) inputTec.value = '';
        const selTec = document.getElementById('ts-select-tecnica');
        if (selTec) selTec.value = '';

        if (modoTS === 'nuevo') {
            cargarSelectsMaestrosTS();
        } else {
            resetearSelect('ts-select-tipo', 'Seleccione tipo...');
            resetearSelect('ts-select-ubicacion', 'Seleccione ubicación...');
            resetearSelect('ts-select-evento', 'Seleccione evento...');
        }

    } else if (grupo === 2) {
        const card2 = document.getElementById('card-ts-detalle');
        if (card2 && card2.classList.contains('is-locked')) toggleTsLock(2);

        document.getElementById('ts-input-ts-maquina').value = '';
        if (document.getElementById('ts-input-ts-valoracion')) document.getElementById('ts-input-ts-valoracion').value = '';
        if (document.getElementById('ts-input-ts-producto')) document.getElementById('ts-input-ts-producto').value = '';
        setTsEstimado(false);

        document.getElementById('ts-input-ts-marcado').value = '';
        document.getElementById('ts-input-ts-borrarmarcacuadro').value = '';
        document.getElementById('ts-input-ts-borrartiza').value = '';
        document.getElementById('ts-input-ts-plancha').value = '';
        document.getElementById('ts-input-ts-horno2pase').value = '';
        document.getElementById('ts-input-ts-hornodespvaporizar').value = '';
        document.getElementById('ts-input-ts-hornocomplementos').value = '';
        document.getElementById('ts-input-ts-reserva1').value = '';
        document.getElementById('ts-input-ts-reserva2').value = '';
        document.getElementById('ts-input-ts-manual').value = '';
        if (document.getElementById('ts-input-ts-valoracion-manual')) document.getElementById('ts-input-ts-valoracion-manual').value = '';
        if (document.getElementById('ts-input-ts-producto-manual')) document.getElementById('ts-input-ts-producto-manual').value = '';
    }
}

/**
 * Limpia todo el formulario de Registro de TS
 */
function limpiarTodoTS(showToastMsg = true) {
    limpiarTsGrupo(1);
    limpiarTsGrupo(2);
    if (showToastMsg) {
        showToast("Formulario de TS limpiado");
    }
}

/**
 * Guardar registro de TS en Google Sheets (hoja 'Ts')
 * Solo disponible en Modo Registro Nuevo.
 */
async function guardarRegistroTS() {
    // Solo permitir guardar en modo Registro Nuevo
    if (modoTS !== 'nuevo') {
        showToast("Cambia al Modo Registro Nuevo para guardar");
        return;
    }

    const op = document.getElementById('ts-input-op').value.trim();
    if (!op) {
        showToast("Por favor ingresa la OP");
        document.getElementById('ts-input-op').focus();
        return;
    }

    // Leer valores numéricos de TS Máquina y TS Manual
    const tsMaquinaVal = parseFloat(document.getElementById('ts-input-ts-maquina').value) || 0;
    const tsManualVal  = parseFloat(document.getElementById('ts-input-ts-manual').value)  || 0;
    const totalTs      = parseFloat((tsMaquinaVal + tsManualVal).toFixed(4));

    // Leer estado del selector TS Estimado
    const tsEstimadoFlag = getTsEstimadoFlag();
    const tsEstimado = tsEstimadoFlag === 'S' ? 'Si' : 'No';

    // Valoraciones %
    const valMaqRaw = document.getElementById('ts-input-ts-valoracion')?.value.trim();
    const valMaq = valMaqRaw ? (valMaqRaw.includes('%') ? valMaqRaw : `${valMaqRaw}%`) : "100%";
    const valManRaw = document.getElementById('ts-input-ts-valoracion-manual')?.value.trim();
    const valMan = valManRaw ? (valManRaw.includes('%') ? valManRaw : `${valManRaw}%`) : "100%";
    const estadoFormulario = capturarEstadoFormularioTS();

    const nuevoRegistro = {
        tipoRegistro:         "TS",
        hoja:                 "Ts",
        OP:                   op,
        PROTO:                document.getElementById('ts-input-proto').value.trim(),
        CLIENTE:              document.getElementById('ts-input-cliente').value.trim(),
        ESTILO:               document.getElementById('ts-input-estilo').value.trim(),
        COLOR:                document.getElementById('ts-select-color').value.trim(),
        TIPO:                 document.getElementById('ts-select-tipo').value.trim(),
        UBICACION:            document.getElementById('ts-select-ubicacion').value.trim(),
        "UBICACIÓN":          document.getElementById('ts-select-ubicacion').value.trim(),
        DESCRIPCION:          (document.getElementById('ts-input-descripcion').value || "").toUpperCase().trim(),
        EVENTO:               document.getElementById('ts-select-evento').value.trim(),
        OBS_EVENTO:           document.getElementById('ts-input-obsevento').value.trim(),
        TS_MAQUINA:           formatearNumeroTS(tsMaquinaVal),
        TS_MANUAL:            formatearNumeroTS(tsManualVal),
        TOTAL_TS:             formatearNumeroTS(totalTs),
        FLAG_TS_ASIG:         "S",
        FLAG_TS_ESTI:         tsEstimadoFlag,
        TS_ESTIMADO:          tsEstimado,
        TS_MARCADO:           formatearNumeroTS(document.getElementById('ts-input-ts-marcado').value),
        TS_BorrarMarcaCuadro: formatearNumeroTS(document.getElementById('ts-input-ts-borrarmarcacuadro').value),
        TS_BorrarTiza:        formatearNumeroTS(document.getElementById('ts-input-ts-borrartiza').value),
        TS_Plancha:           formatearNumeroTS(document.getElementById('ts-input-ts-plancha').value),
        TS_Horno2pase:        formatearNumeroTS(document.getElementById('ts-input-ts-horno2pase').value),
        TS_HornoDespVaporizar:formatearNumeroTS(document.getElementById('ts-input-ts-hornodespvaporizar').value),
        TS_HornoComplementos: formatearNumeroTS(document.getElementById('ts-input-ts-hornocomplementos').value),
        RESERVA1:             formatearNumeroTS(document.getElementById('ts-input-ts-reserva1').value),
        RESERVA2:             formatearNumeroTS(document.getElementById('ts-input-ts-reserva2').value),
        VAL_MAQUINA:          valMaq,
        VAL_MANUAL:           valMan,
        TECNICA:              document.getElementById('ts-select-tecnica')?.value.trim() || ""
    };

    mostrarLoader(true);
    try {
        // 1. Guardar en memoria local para uso inmediato
        if (baseDeDatos && Array.isArray(baseDeDatos.Ts)) {
            baseDeDatos.Ts.push(nuevoRegistro);
        }

        // 2. Envío a Google Apps Script
        await fetch(WEB_APP_URL, {
            method: "POST",
            mode: "no-cors",
            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },
            body: JSON.stringify(nuevoRegistro)
        });

        showToast("Registro guardado");

        // 3. Limpiar solo el cuadrante de detalle (mantener Información General)
        limpiarTsGrupo(2);

        // 4. Recargar datos del servidor en segundo plano
        await cargarDatosDeHojas();

    } catch (error) {
        console.error("Error al guardar TS:", error);
        showToast("Guardado localmente. Error de conexión con servidor.");
    } finally {
        restaurarModoNuevoTS();
        restaurarEstadoFormularioTS(estadoFormulario);
        mostrarLoader(false);
    }
}
