/**
 * INDICADORES — Modal y lógica de validación de semana
 * Usa baseDeDatos["bd-semana"] previamente cargado por cargarDatosDeHojas()
 */

// ── Estado del modal semanal ─────────────────────────────────────────
let semanaSeleccionada = null; // { Año, NumSem, FechaIni, FechaFin }

// ── Abrir / Cerrar modales ────────────────────────────────────────────
function abrirModalSemanal() {
    // Limpiar estado anterior
    document.getElementById('ind-anio').value     = '';
    document.getElementById('ind-num-sem').value  = '';
    document.getElementById('ind-sem-resultado').style.display = 'none';
    document.getElementById('ind-sem-error').style.display     = 'none';
    document.getElementById('btn-generar-semanal').disabled     = true;
    semanaSeleccionada = null;

    document.getElementById('modal-semanal').style.display = 'flex';
}

function cerrarModalSemanal(ev) {
    // Si se llamó desde el overlay (clic fuera de la tarjeta), ev ya fue manejado en HTML
    document.getElementById('modal-semanal').style.display = 'none';
}

function abrirModalMensual() {
    document.getElementById('modal-mensual').style.display = 'flex';
}

function cerrarModalMensual(ev) {
    document.getElementById('modal-mensual').style.display = 'none';
}

// Cerrar con tecla Escape
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        cerrarModalSemanal();
        cerrarModalMensual();
    }
});

// ── Validación de la semana contra bd-semana ──────────────────────────

/**
 * Detecta dinámicamente qué clave del objeto corresponde al año.
 * La columna puede llegar como "Año", "Ano", "año", "AÑO", "YEAR", "Ao", etc.
 */
function getBdSemanaAnioKey(row) {
    if (!row || typeof row !== 'object') return 'Año';
    const candidates = ['Año', 'Ano', 'año', 'AÑO', 'ANO', 'Anio', 'anio', 'Year', 'YEAR', 'year', 'Ao', 'AñO', 'Ao'];
    for (const c of candidates) {
        if (c in row) return c;
    }
    // Fallback: primera clave que contenga "a" y "o" / "year" ignorando caracteres especiales
    const keys = Object.keys(row);
    const found = keys.find(k => {
        const clean = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, '');
        return clean === 'ano' || clean === 'anio' || clean === 'year' || clean === 'ao';
    });
    if (found) return found;
    // Último recurso: primera columna
    return keys[0];
}

/**
 * Mapea el texto del día (LUN, MAR, MIÉ, JUE, VIE, SÁB, DOM) al índice 0-6 correspondiente.
 */
function getDiaSemanaIndex(diaStr) {
    if (!diaStr) return -1;
    const d = String(diaStr)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toUpperCase();
    if (d.includes('LUN')) return 0;
    if (d.includes('MAR')) return 1;
    if (d.includes('MIE')) return 2;
    if (d.includes('JUE')) return 3;
    if (d.includes('VIE')) return 4;
    if (d.includes('SAB')) return 5;
    if (d.includes('DOM')) return 6;
    return -1;
}

function validarSemana() {
    const anio   = parseInt(document.getElementById('ind-anio').value, 10);
    const numSem = parseInt(document.getElementById('ind-num-sem').value, 10);

    const resBox = document.getElementById('ind-sem-resultado');
    const errBox = document.getElementById('ind-sem-error');
    const btnGen = document.getElementById('btn-generar-semanal');

    // Ocultar ambos mientras se escribe
    resBox.style.display = 'none';
    errBox.style.display = 'none';
    btnGen.disabled      = true;
    semanaSeleccionada   = null;

    // Solo buscar si ambos campos tienen valores razonables
    if (!anio || !numSem || numSem < 1 || numSem > 52) return;

    // Buscar en bd-semana
    const semanas = baseDeDatos['bd-semana'];
    if (!semanas || semanas.length === 0) {
        mostrarError('No se encontró la hoja <strong>bd-semana</strong> en la base de datos.');
        return;
    }

    // Detectar claves reales del primer registro (debug útil en consola)
    const primeraFila = semanas[0];
    const anioKey    = getBdSemanaAnioKey(primeraFila);
    console.log('[Indicadores] Claves detectadas en bd-semana:', Object.keys(primeraFila));
    console.log('[Indicadores] Clave año detectada:', anioKey, '| Valor ejemplo:', primeraFila[anioKey]);
    console.log('[Indicadores] NumSem ejemplo:', primeraFila['NumSem']);

    // Comparar convirtiendo ambos a número para evitar discrepancias string/number
    const registro = semanas.find(s =>
        parseInt(s[anioKey], 10)   === anio &&
        parseInt(s['NumSem'] || s['Semana'] || s['Sem'], 10)  === numSem
    );

    if (!registro) {
        mostrarError(`No se encontró la semana <strong>${numSem}</strong> del año <strong>${anio}</strong> en <em>bd-semana</em>. Revisa la consola para ver los datos disponibles.`);
        // Log adicional para diagnóstico
        console.warn('[Indicadores] Búsqueda fallida. Años disponibles:',
            [...new Set(semanas.map(s => s[anioKey]))],
            '| NumSem disponibles:', [...new Set(semanas.map(s => s['NumSem']))]);
        return;
    }

    // Encontrada — mostrar rango de fechas
    semanaSeleccionada = registro;
    // Obtenemos del cálculo estricto
    const arrDias = getDiasSemanaRango(registro['FechaIni'], registro['FechaFin']);
    const arrIni  = arrDias[0].split('-');
    const arrFin  = arrDias[6].split('-');
    
    const fechaIni = `${arrIni[1]}/${arrIni[2]}/${arrIni[0]}`;
    const fechaFin = `${arrFin[1]}/${arrFin[2]}/${arrFin[0]}`;

    document.getElementById('ind-sem-rango').textContent = `${fechaIni}  →  ${fechaFin}`;

    resBox.style.display = 'flex';
    btnGen.disabled      = false;
}

/** 
 * Analiza un string de fecha asumiendo el formato estándar del sistema MM/DD/YYYY o ISO YYYY-MM-DD.
 */
function parseMixedDate(str) {
    if (!str) return null;
    if (str instanceof Date) {
        return { y: str.getFullYear(), m: str.getMonth() + 1, d: str.getDate() };
    }
    const cleanStr = String(str).trim();
    if (!cleanStr) return null;

    const dateOnly = cleanStr.split('T')[0].split(' ')[0].trim();
    const p = dateOnly.replace(/\//g, '-').split('-');
    if (p.length === 3) {
        let p1 = parseInt(p[0], 10);
        let p2 = parseInt(p[1], 10);
        let p3 = parseInt(p[2], 10);
        if (isNaN(p1) || isNaN(p2) || isNaN(p3)) return null;
        
        // Formato ISO (YYYY-MM-DD) del calendario nativo HTML
        if (p[0].length === 4) {
            return { y: p1, m: p2, d: p3 };
        }
        
        let y = p3;
        if (y < 100) y += 2000;

        // Si p1 > 12 es indiscutiblemente Día (DD/MM/YYYY)
        if (p1 > 12 && p2 <= 12) {
            return { y, m: p2, d: p1 };
        }
        // Formato estándar de la Base: MM/DD/YYYY (p1 = Mes, p2 = Día)
        return { y, m: p1, d: p2 };
    }
    return null;
}

/** Formatea para visualización obligatoria en pantalla: Mes/Día/Año (mm/dd/yyyy) */
function formatearFecha(valor) {
    const parsed = parseMixedDate(valor);
    if (!parsed) return String(valor || '—').trim();
    const mm = String(parsed.m).padStart(2, '0');
    const dd = String(parsed.d).padStart(2, '0');
    return `${mm}/${dd}/${parsed.y}`;
}

function mostrarError(msg) {
    const errBox = document.getElementById('ind-sem-error');
    errBox.innerHTML = `⚠️  ${msg}`;
    errBox.style.display = 'block';
}

// ── Lógica de fechas y normalización para filtrado ──────────────────
function normString(val) {
    return String(val || "").trim().toUpperCase();
}

/** 
 * Devuelve la fecha normalizada YYYY-MM-DD para agrupar y filtrar.
 */
function getNormDate(val, targetIsoList = null) {
    const parsed = parseMixedDate(val, targetIsoList);
    if (!parsed) return String(val || '').trim();
    const mm = String(parsed.m).padStart(2, '0');
    const dd = String(parsed.d).padStart(2, '0');
    return `${parsed.y}-${mm}-${dd}`;
}

/** Obtiene array de 7 fechas ISO (YYYY-MM-DD) a partir del Lunes seleccionado y auto-corrige si Sheets invirtió mes/día */
function getDiasSemanaRango(fechaIniVal, fechaFinVal) {
    let dStrIni = getNormDate(fechaIniVal);
    let dStrFin = getNormDate(fechaFinVal);
    
    // Convertimos a Date para verificar consistencia
    let partesIni = dStrIni.split('-');
    let dIni = new Date(partesIni[0], parseInt(partesIni[1]) - 1, partesIni[2]);
    
    let partesFin = dStrFin.split('-');
    let dFin = new Date(partesFin[0], parseInt(partesFin[1]) - 1, partesFin[2]);
    
    // Si Sheets confundió el 9 de Marzo ("09-03") como 3 de Setiembre,
    // el Inicio será Septiembre y el Fin será Marzo (Inicio > Fin).
    // Solo debemos retroceder 6 días desde el Fin
    if (dIni > dFin) {
        dIni = new Date(dFin);
        dIni.setDate(dIni.getDate() - 6);
    }
    
    const dias = [];
    for (let i = 0; i < 7; i++) {
        const temp = new Date(dIni);
        temp.setDate(temp.getDate() + i);
        const y = temp.getFullYear();
        const m = String(temp.getMonth() + 1).padStart(2, '0');
        const day = String(temp.getDate()).padStart(2, '0');
        dias.push(`${y}-${m}-${day}`);
    }
    return dias;
}


// ── Generar Reporte Semanal ───────────────────────────────────────────
function generarReporteSemanal() {
    if (!semanaSeleccionada) return;
    cerrarModalSemanal();

    // ── Datos del período ──────────────────────────────────────────────
    const anioKey  = getBdSemanaAnioKey(semanaSeleccionada);
    const anio     = semanaSeleccionada[anioKey];
    const numSem   = semanaSeleccionada['NumSem'] || semanaSeleccionada['Semana'] || semanaSeleccionada['Sem'];
    const diasISO  = getDiasSemanaRango(semanaSeleccionada['FechaIni'], semanaSeleccionada['FechaFin']); // [YYYY-MM-DD x 7]
    
    // Obtenemos las fechas directamente del array calculado (que ya sorteó los errores de Sheets de Día/Mes)
    const pIni = diasISO[0].split('-');
    const pFin = diasISO[6].split('-');
    const fechaIni = `${pIni[1]}/${pIni[2]}/${pIni[0]}`; // MM/DD/YYYY
    const fechaFin = `${pFin[1]}/${pFin[2]}/${pFin[0]}`; // MM/DD/YYYY

    // ── Lista de máquinas ──────────────────────────────────────────────
    const maquinas = [];
    if (baseDeDatos && baseDeDatos.Maquina) {
        baseDeDatos.Maquina.forEach(m => {
            const rawVal = m['maquina'] || m[Object.keys(m)[0]];
            const val = typeof normalizarNombreMaquina === 'function' ? normalizarNombreMaquina(rawVal) : rawVal;
            if (val && !maquinas.includes(val)) maquinas.push(val);
        });
    }
    if (maquinas.length === 0) maquinas.push('Maquina 1', 'Maquina 2', 'Maquina 3');

    // ── Estructura para almacenar sumatorias (Und, Min.Producidos, Min.Disp, Min.Adic) ────
    const dataSemana = {}; 
    maquinas.forEach(maq => {
        dataSemana[normString(maq)] = {};
        diasISO.forEach(dia => dataSemana[normString(maq)][dia] = { und: 0, minp: 0, mind: 0, mina: 0, efi: 0 });
    });

    // ── 1. Procesar hoja "Base" (Und. Estampadas y Min. Producidos) ────
    if (baseDeDatos.Base) {
        baseDeDatos.Base.forEach(row => {
            const rowFecha = getNormDate(row.Fecha, diasISO);
            if (rowFecha && diasISO.includes(rowFecha)) {
                // Pertenece a la semana en consulta
                const rawMaq = typeof normalizarNombreMaquina === 'function' ? normalizarNombreMaquina(row.Maquina) : row.Maquina;
                const maq = normString(rawMaq);
                if (dataSemana[maq] && dataSemana[maq][rowFecha]) {
                    dataSemana[maq][rowFecha].und  += parseFloat(row.Cantidad) || 0;
                    dataSemana[maq][rowFecha].minp += parseFloat(row.MinProducidos) || 0;
                }
            }
        });
    }

    // ── 2. Procesar hoja "bd-mindisponible" (Min. Disponibles y Adicionales) ────
    if (baseDeDatos['bd-mindisponible']) {
        const targetAnio = parseInt(anio, 10);
        const targetSem  = parseInt(numSem, 10);

        baseDeDatos['bd-mindisponible'].forEach(row => {
            // Filtrar estrictamente por Año y Número de Semana seleccionados
            const rowAnioKey = getBdSemanaAnioKey(row);
            const rowAnio    = parseInt(row[rowAnioKey], 10);
            const rowSem     = parseInt(row.NumSem || row.Semana || row.Sem || row[Object.keys(row)[1]], 10);

            if (!isNaN(rowAnio) && !isNaN(rowSem)) {
                if (rowAnio !== targetAnio || rowSem !== targetSem) {
                    return; // Ignorar filas de otras semanas o años
                }
            }

            // Identificar a qué día de la semana corresponde la fila
            let rowFecha = null;
            const diaTexto = row.DIA || row.Dia || row.dia || row['Día'] || row[Object.keys(row)[8]];
            const diaIdx   = getDiaSemanaIndex(diaTexto);

            if (diaIdx >= 0 && diaIdx < diasISO.length) {
                rowFecha = diasISO[diaIdx];
            } else {
                const rawFecha = row.FechDia || row.FechaDia || row.Fecha || row[Object.keys(row)[2]];
                if (rawFecha) {
                    rowFecha = getNormDate(rawFecha, diasISO);
                }
            }

            if (rowFecha && diasISO.includes(rowFecha)) {
                const rawMaqVal = row.NumMaq !== undefined ? row.NumMaq : (row.Maquina || row.Maq || row[Object.keys(row)[4]]);
                const rawMaq    = typeof normalizarNombreMaquina === 'function' ? normalizarNombreMaquina(rawMaqVal) : `Maquina ${rawMaqVal}`;
                const maq       = normString(rawMaq);

                if (dataSemana[maq] && dataSemana[maq][rowFecha]) {
                    const minDispVal = row.MinDisp !== undefined ? row.MinDisp : (row.MinutosDisponibles || row.Min_Disp);
                    const minAdicVal = row.MinAdic !== undefined ? row.MinAdic : (row.MinutosAdicionales || row.Min_Adic);

                    dataSemana[maq][rowFecha].mind = parseFloat(minDispVal) || 0;
                    dataSemana[maq][rowFecha].mina = parseFloat(minAdicVal) || 0;
                }
            }
        });
    }

    // ── Columnas de días ───────────────────────────────────────────────
    const diasLabel = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO'];

    // ── Métricas por máquina ───────────────────────────────────────────
    const metricas = [
        { label: 'Und. Estampadas',    key: 'und',  highlight: false, dec: 0 },
        { label: 'Minutos Producidos',  key: 'minp', highlight: false, dec: 2 },
        { label: 'Minutos Disponibles', key: 'mind', highlight: false, dec: 2 },
        { label: 'Minutos Adicionales', key: 'mina', highlight: false, dec: 2 },
        { label: 'Eficiencia %',        key: 'efi',  highlight: true,  dec: 1 },
    ];

    // ── Construcción de filas por máquina ─────────────────────────────
    let filasHtml = '';
    
    // Variables para Total Global
    const totalGlobal = { und: 0, minp: 0, mind: 0, mina: 0, efi: 0 };
    const globalPorDia = diasISO.map(() => ({ und: 0, minp: 0, mind: 0, mina: 0 }));

    maquinas.forEach((maq, mIdx) => {
        const maqK = normString(maq);
        const mdata = dataSemana[maqK];
        
        let maqTotales = { und: 0, minp: 0, mind: 0, mina: 0 };

        metricas.forEach((met, meti) => {
            const esFirst   = meti === 0;
            const highlight = met.highlight ? 'rpt-row-efic' : '';
            const celda_maq = esFirst
                ? `<td class="rpt-td rpt-td-maq" rowspan="${metricas.length}">${maq}</td>`
                : '';

            const celdas_dias = diasISO.map((dISO, dIdx) => {
                let val = mdata[dISO][met.key] || 0;
                
                // Sumar al total de la máquina solo la primera vez que pasamos por ese día
                if (met.key === 'und')  maqTotales.und += val;
                if (met.key === 'minp') maqTotales.minp += val;
                if (met.key === 'mind') maqTotales.mind += val;
                if (met.key === 'mina') maqTotales.mina += val;
                
                // Calculo local de la eficiencia
                if (met.key === 'efi') {
                    const localMinP = mdata[dISO]['minp'] || 0;
                    const localMinDA = (mdata[dISO]['mind'] || 0) + (mdata[dISO]['mina'] || 0);
                    if (localMinDA > 0) val = (localMinP / localMinDA) * 100;
                    else val = 0;
                }

                // Lógica de visualización
                let txt = '';
                if (val > 0) {
                    txt = (met.dec === 0) ? Math.round(val) : parseFloat(val).toFixed(met.dec);
                    if (met.key === 'efi') txt += '%';
                } else if (met.key === 'efi') {
                    txt = ''; 
                }

                // Sumar al global de la semana
                if (met.key === 'und')  globalPorDia[dIdx].und += val;
                if (met.key === 'minp') globalPorDia[dIdx].minp += val;
                if (met.key === 'mind') globalPorDia[dIdx].mind += val;
                if (met.key === 'mina') globalPorDia[dIdx].mina += val;

                return `<td class="rpt-td rpt-td-data">${txt}</td>`;
            }).join('');

            // Total de la fila (columna al extremo derecho)
            let valTotal = maqTotales[met.key] || 0;
            if (met.key === 'efi') {
                const totMinP = maqTotales['minp'] || 0;
                const totMinDA = (maqTotales['mind'] || 0) + (maqTotales['mina'] || 0);
                if (totMinDA > 0) valTotal = (totMinP / totMinDA) * 100;
                else valTotal = 0;
            } 

            let txtTotal = '';
            if (valTotal > 0) {
                txtTotal = (met.dec === 0) ? Math.round(valTotal) : parseFloat(valTotal).toFixed(met.dec);
                if (met.key === 'efi') txtTotal += '%';
            }

            const celda_total = `<td class="rpt-td rpt-td-data rpt-td-total">${txtTotal}</td>`;

            filasHtml += `
            <tr class="${highlight}">
                ${celda_maq}
                <td class="rpt-td rpt-td-desc">${met.label}</td>
                <td class="rpt-td rpt-td-colon">:</td>
                ${celdas_dias}
                ${celda_total}
            </tr>`;
        });
        
        // Sumar al global final
        totalGlobal.und  += maqTotales.und;
        totalGlobal.minp += maqTotales.minp;
        totalGlobal.mind += maqTotales.mind;
        totalGlobal.mina += maqTotales.mina;

        // Fila separadora entre máquinas
        if (mIdx < maquinas.length - 1) {
            filasHtml += `<tr class="rpt-row-sep"><td colspan="${3 + diasISO.length + 1}"></td></tr>`;
        }
    });

    // ── Fila de Total Eficiencia Global ────────────────────────────────
    const totalCeldasHtml = globalPorDia.map(g => {
        let txtEfi = '';
        const gMinDA = (g.mind || 0) + (g.mina || 0);
        if (gMinDA > 0 && g.minp > 0) {
            txtEfi = ((g.minp / gMinDA) * 100).toFixed(1) + '%';
        }
        return `<td class="rpt-td rpt-td-data"><strong>${txtEfi}</strong></td>`;
    }).join('');

    let finalGlobalEfi = '';
    const totalGlobalMinDA = (totalGlobal.mind || 0) + (totalGlobal.mina || 0);
    if (totalGlobalMinDA > 0 && totalGlobal.minp > 0) {
        finalGlobalEfi = ((totalGlobal.minp / totalGlobalMinDA) * 100).toFixed(1) + '%';
    }

    const area = document.getElementById('ind-report-area');
    area.innerHTML = `
        <div class="rpt-topbar">
            <div>
                <span class="rpt-topbar-label">Reporte Semanal</span>
                <span class="rpt-topbar-period">Semana ${numSem} &nbsp;|&nbsp; ${anio}</span>
            </div>
            <button onclick="abrirModalSemanal()" class="btn-ind-semanal" style="font-size:0.8rem;padding:0.45rem 1rem;">
                ✏️ Cambiar semana
            </button>
        </div>

        <div class="rpt-wrapper">
            <table class="rpt-table">
                <thead>
                    <tr class="rpt-row-header1">
                        <td class="rpt-th rpt-th-sem" colspan="2">
                            <span class="rpt-lbl">SEMANA :</span>
                            <span class="rpt-val">${numSem}</span>
                        </td>
                        <td class="rpt-th rpt-th-colon"></td>
                        <td class="rpt-th rpt-th-del" colspan="3">
                            <span class="rpt-lbl">DEL :</span>
                            <span class="rpt-val">${fechaIni}</span>
                        </td>
                        <td class="rpt-th rpt-th-al" colspan="${diasISO.length - 3 + 1 + 1}">
                            <span class="rpt-lbl">AL :</span>
                            <span class="rpt-val">${fechaFin}</span>
                        </td>
                    </tr>
                    <tr class="rpt-row-header2">
                        <th class="rpt-th rpt-th-desc" colspan="3">DESCRIPCIÓN</th>
                        ${diasLabel.map(d => `<th class="rpt-th rpt-th-day">${d}</th>`).join('')}
                        <th class="rpt-th rpt-th-day rpt-th-total">TOTAL</th>
                    </tr>
                </thead>
                <tbody>
                    ${filasHtml}
                    <tr class="rpt-row-sep"><td colspan="${3 + diasISO.length + 1}"></td></tr>
                    <tr class="rpt-row-totalefic">
                        <td class="rpt-td" colspan="2"><strong>TOTAL – Eficiencia %</strong></td>
                        <td class="rpt-td rpt-td-colon">:</td>
                        ${totalCeldasHtml}
                        <td class="rpt-td rpt-td-data rpt-td-total"><strong>${finalGlobalEfi}</strong></td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
}

