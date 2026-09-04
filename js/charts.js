// Paleta 3D pastel suave
const palette3D = [
    { main: 'rgb(135, 206, 235)', side: 'rgb(95, 166, 195)', top: 'rgb(185, 230, 250)' },   // Celeste pastel
    { main: 'rgb(195, 160, 230)', side: 'rgb(155, 120, 190)', top: 'rgb(225, 200, 250)' },   // Lila pastel
    { main: 'rgb(255, 179, 128)', side: 'rgb(215, 139, 88)', top: 'rgb(255, 210, 175)' },    // Naranja pastel
    { main: 'rgb(255, 230, 110)', side: 'rgb(215, 190, 70)', top: 'rgb(255, 248, 180)' },   // Amarillo pastel
    { main: 'rgb(144, 213, 170)', side: 'rgb(104, 173, 130)', top: 'rgb(190, 240, 205)' },  // Verde menta pastel
    { main: 'rgb(255, 160, 160)', side: 'rgb(215, 120, 120)', top: 'rgb(255, 200, 200)' },  // Coral pastel
    { main: 'rgb(180, 200, 240)', side: 'rgb(140, 160, 200)', top: 'rgb(215, 228, 255)' }   // Lavanda pastel
];

const bar3DGlassPlugin = {
    id: 'bar3DGlass',
    beforeDatasetsDraw(chart, args, options) {
        if (!options.enabled) return;
        const ctx = chart.ctx;
        const chartArea = chart.chartArea;
        // Calculamos un yTop para el contenedor basándonos en el valor máximo del eje Y
        const yTop = chartArea.top + 10;

        // Draw our custom 3D glass bars
        chart.data.datasets.forEach((dataset, i) => {
            const meta = chart.getDatasetMeta(i);
            if (!meta.hidden && meta.type === 'bar') {
                meta.data.forEach((element, index) => {
                    const x = element.x;
                    let y = element.y;
                    const base = element.base;
                    const width = element.width;

                    if (y === undefined || isNaN(y)) return;
                    if (y > base) y = base;

                    const w = width * 0.7; // Ajustar el grosor de la barra
                    const left = x - w / 2;
                    const right = x + w / 2;

                    const colors = (Array.isArray(dataset.custom3DColors) ? dataset.custom3DColors[index] : dataset.custom3DColors) || palette3D[i % palette3D.length];

                    draw3DPillar(ctx, left, y, right, base, yTop, colors);

                    // Hack to hide the native Chart.js bar but keep layout/legend intact
                    element.options.backgroundColor = 'transparent';
                    element.options.borderColor = 'transparent';
                    element.options.shadowBlur = 0;
                });
            }
        });
    }
};

function draw3DPillar(ctx, left, top, right, bottom, containerTop, colors) {
    const w = right - left;
    const maxDepth = 25; // Limita la profundidad máxima visual
    const depth = Math.min(w * 0.35, maxDepth); // Profundidad isométrica controlada
    const dx = depth * 0.7;
    const dy = -depth * 0.5;

    // Si el 'top' es igual al 'bottom' (valor 0 o cercano)
    const isZero = (top >= bottom - 1);
    const fluidTop = isZero ? bottom - 1 : top;

    ctx.save();

    // 1. FRENTE (Con gradiente para dar brillo/glossy)
    let frontGradient = ctx.createLinearGradient(left, 0, right, 0);
    frontGradient.addColorStop(0, colors.main);
    frontGradient.addColorStop(0.2, colors.top); // Brillo izquierdo
    frontGradient.addColorStop(0.6, colors.main);
    frontGradient.addColorStop(1, colors.side);  // Sombra derecha

    ctx.fillStyle = frontGradient;
    ctx.fillRect(left, fluidTop, w, bottom - fluidTop);

    // 2. LADO DERECHO (Sólido y oscurecido isomutricamente)
    ctx.beginPath();
    ctx.moveTo(right, fluidTop);
    ctx.lineTo(right + dx, fluidTop + dy);
    ctx.lineTo(right + dx, bottom + dy);
    ctx.lineTo(right, bottom);
    ctx.closePath();
    ctx.fillStyle = colors.side;
    ctx.fill();

    // Añadimos un pequeño brillo al filo lateral para darle el toque 3D de la imagen
    ctx.beginPath();
    ctx.moveTo(right, fluidTop);
    ctx.lineTo(right, bottom);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.stroke();

    // Añadimos sombra oscura interior en la esquina derecha posterior del lado
    let sideGradient = ctx.createLinearGradient(right, 0, right + dx, 0);
    sideGradient.addColorStop(0, 'rgba(0,0,0,0)');
    sideGradient.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = sideGradient;
    ctx.beginPath();
    ctx.moveTo(right, fluidTop);
    ctx.lineTo(right + dx, fluidTop + dy);
    ctx.lineTo(right + dx, bottom + dy);
    ctx.lineTo(right, bottom);
    ctx.closePath();
    ctx.fill();

    // 3. TAPA SUPERIOR (Luz cenital)
    ctx.beginPath();
    ctx.moveTo(left, fluidTop);
    ctx.lineTo(left + dx, fluidTop + dy);
    ctx.lineTo(right + dx, fluidTop + dy);
    ctx.lineTo(right, fluidTop);
    ctx.closePath();
    ctx.fillStyle = colors.top;
    ctx.fill();

    // Brillo en la tapa superior (como en la foto de referencia)
    let topGradient = ctx.createLinearGradient(left, fluidTop, left + dx, fluidTop + dy);
    topGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
    topGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = topGradient;
    ctx.fill();

    // Filo brillante superior frontal
    ctx.beginPath();
    ctx.moveTo(left, fluidTop);
    ctx.lineTo(right, fluidTop);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.stroke();

    ctx.restore();
}

Chart.register(bar3DGlassPlugin);

function isTargetDate(raw, target) {
    if (!raw || !target) return false;
    const strRaw = String(raw).trim();
    if (strRaw.startsWith(target)) return true;

    const p = target.split('-');
    if (p.length !== 3) return false;
    const y = parseInt(p[0], 10);
    const m = parseInt(p[1], 10);
    const d = parseInt(p[2], 10);

    const cleanDateStr = strRaw.split('T')[0].split(' ')[0].trim();
    const parts = cleanDateStr.split(/[-/]/);
    if (parts.length === 3) {
        if (parts[0].length === 4) {
            // Formato ISO: YYYY-MM-DD
            return parseInt(parts[0], 10) === y && parseInt(parts[1], 10) === m && parseInt(parts[2], 10) === d;
        } else {
            // Formato estándar de la Base: MM/DD/YYYY o MM/DD/YY (Mes = parts[0], Día = parts[1], Año = parts[2])
            const rawM = parseInt(parts[0], 10);
            const rawD = parseInt(parts[1], 10);
            let rawY = parseInt(parts[2], 10);
            if (rawY < 100) rawY += 2000;
            return rawY === y && rawM === m && rawD === d;
        }
    }

    return false;
}

/**
 * Valida si un registro de 'bd-mindisponible' corresponde a la fecha objetivo
 */
function isTargetDateDisp(row, target) {
    if (!row || !target) return false;
    const raw = row.FechDia || row.FechaDia || row.Fecha;
    if (!raw) return false;

    const p = target.split('-');
    if (p.length !== 3) return false;
    const y = parseInt(p[0], 10);
    const m = parseInt(p[1], 10);
    const d = parseInt(p[2], 10);

    const strRaw = String(raw).trim();
    if (strRaw.startsWith(target)) return true;

    const cleanDateStr = strRaw.split('T')[0].split(' ')[0].trim();
    const parts = cleanDateStr.split(/[-/]/);
    if (parts.length === 3) {
        if (parts[0].length === 4) {
            return parseInt(parts[0], 10) === y && parseInt(parts[1], 10) === m && parseInt(parts[2], 10) === d;
        }
        let p1 = parseInt(parts[0], 10);
        let p2 = parseInt(parts[1], 10);
        let rawY = parseInt(parts[2], 10);
        if (rawY < 100) rawY += 2000;
        if (rawY !== y) return false;

        const numMes = parseInt(row.NumMes || row.Mes || 0, 10);
        let rowM = p1;
        let rowD = p2;

        if (p1 > 12) {
            rowM = p2;
            rowD = p1;
        } else if (p2 > 12) {
            rowM = p1;
            rowD = p2;
        } else if (numMes > 0) {
            if (p2 === numMes && p1 !== numMes) {
                rowM = p2;
                rowD = p1;
            } else if (p1 === numMes) {
                rowM = p1;
                rowD = p2;
            }
        }

        return rowM === m && rowD === d;
    }
    return false;
}

function actualizarDashboard() {
    const filterInput = document.getElementById("dash-date-filter");
    if (!filterInput.value) {
        filterInput.value = new Date().toISOString().split('T')[0];
    }
    const targetDate = filterInput.value;
    const targetMaquina = document.getElementById("dash-maquina-filter").value;
    const targetMaquinaTallas = document.getElementById("dash-maquina-tall-filter").value;
    const filterMinutosElement = document.getElementById("dash-maquina-minutos-filter");
    const targetMaquinaMinutos = filterMinutosElement ? filterMinutosElement.value : "TODAS";

    const registros = baseDeDatos.Base || [];

    // Filtrar por fecha seleccionada
    const registrosFecha = registros.filter(r => isTargetDate(r.Fecha, targetDate));

    document.getElementById("dash-total").innerText = registrosFecha.length;

    // Sumatoria de Cantidad (Prendas/Cortes estampadas) para la fecha seleccionada
    const sumaCantidad = registrosFecha.reduce((acc, curr) => acc + (parseFloat(curr.Cantidad) || 0), 0);
    document.getElementById("dash-suma-cantidad").innerText = sumaCantidad;

    initChart(registros, targetDate, targetMaquinaMinutos);
    initProdTypeChart(registros, targetDate, targetMaquina);
    initProdTallasChart(registros, targetDate, targetMaquinaTallas);
    initProdClientChart(registros, targetDate);
}

function initChart(data, targetDate, targetMaquina) {
    const ctx = document.getElementById('prodChart').getContext('2d');
    const machineMins = {};
    const machineMeta = {};

    // 1. Sumar Minutos Producidos de la hoja Base
    data.forEach(r => {
        const isDateMatch = isTargetDate(r.Fecha, targetDate);
        const maquinaName = normalizarNombreMaquina(r.Maquina);

        if (isDateMatch && maquinaName) {
            if (targetMaquina !== "TODAS" && normalizarNombreMaquina(targetMaquina) !== maquinaName) {
                return;
            }

            if (!machineMins[maquinaName]) {
                machineMins[maquinaName] = 0;
            }

            machineMins[maquinaName] += (parseFloat(r.MinProducidos) || 0);
        }
    });

    // 2. Obtener Minutos Disponibles + Adicionales de 'bd-mindisponible'
    const minDispData = (baseDeDatos && Array.isArray(baseDeDatos['bd-mindisponible'])) ? baseDeDatos['bd-mindisponible'] : [];
    minDispData.forEach(r => {
        if (isTargetDateDisp(r, targetDate)) {
            const maquinaName = normalizarNombreMaquina(r.NumMaq || r.Maquina || r.Maq);
            if (maquinaName) {
                if (targetMaquina !== "TODAS" && normalizarNombreMaquina(targetMaquina) !== maquinaName) {
                    return;
                }
                const minDisp = parseFloat(r.MinDisp || r.MinutosDisponibles || 0) || 0;
                const minAdic = parseFloat(r.MinAdic || r.MinutosAdicionales || 0) || 0;
                machineMeta[maquinaName] = minDisp + minAdic;
            }
        }
    });

    // Definir las máquinas a mostrar en el gráfico
    let machines = [];
    if (targetMaquina !== "TODAS") {
        machines = [normalizarNombreMaquina(targetMaquina)];
    } else {
        const allSet = new Set([...Object.keys(machineMins), ...Object.keys(machineMeta)]);
        if (allSet.size === 0) {
            machines = ['Maquina 1', 'Maquina 2', 'Maquina 3'];
        } else {
            machines = Array.from(allSet).sort();
        }
    }

    const dataValues = machines.map(m => machineMins[m] || 0);
    const targetData = machines.map(m => (machineMeta[m] !== undefined && machineMeta[m] > 0 ? machineMeta[m] : 516));

    // Paleta de eficacia: colores semánticos
    const eficaciaColors = {
        rojo: { main: 'rgb(220, 38, 38)', side: 'rgb(160, 0, 0)', top: 'rgb(255, 100, 100)' }, // 0–49.99%
        naranja: { main: 'rgb(255, 102, 0)', side: 'rgb(200, 70, 0)', top: 'rgb(255, 160, 80)' }, // 50–59.99%
        verde: { main: 'rgb(50, 255, 50)', side: 'rgb(0, 190, 0)', top: 'rgb(150, 255, 100)' }, // 60–79.99% (fosforescente)
        azul: { main: 'rgb(37, 99, 235)', side: 'rgb(0, 55, 180)', top: 'rgb(100, 160, 255)' }  // 80%+
    };

    const custom3DColorsArray = machines.map(m => {
        const meta = (machineMeta[m] !== undefined && machineMeta[m] > 0) ? machineMeta[m] : 516;
        const eficacia = meta > 0 ? ((machineMins[m] || 0) / meta) * 100 : 0;
        if (eficacia < 50) return eficaciaColors.rojo;    // Rojo    (0 – 49.99%)
        if (eficacia < 60) return eficaciaColors.naranja; // Naranja (50 – 59.99%)
        if (eficacia < 80) return eficaciaColors.verde;   // Verde fosforescente (60 – 79.99%)
        return eficaciaColors.azul;                        // Azul    (80%+)
    });

    if (myChart) myChart.destroy();
    Chart.register(ChartDataLabels);

    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: machines,
            datasets: [
                {
                    type: 'line',
                    label: 'Meta (Min. Disp + Adic)',
                    data: targetData,
                    borderColor: 'rgb(239, 68, 68)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    fill: false,
                    pointRadius: 4,
                    pointBackgroundColor: 'rgb(239, 68, 68)',
                    datalabels: {
                        display: false
                    }
                },
                {
                    type: 'bar',
                    label: 'Minutos Producidos',
                    data: dataValues,
                    backgroundColor: custom3DColorsArray.map(c => c.main),
                    custom3DColors: custom3DColorsArray,
                    borderWidth: 0,
                    datalabels: {
                        display: true,
                        anchor: 'center',
                        align: 'center',
                        color: '#000',
                        font: {
                            weight: 'bold',
                            size: 20
                        },
                        formatter: function (value, context) {
                            if (value > 0) {
                                const m = context.chart.data.labels[context.dataIndex];
                                const meta = (machineMeta[m] !== undefined && machineMeta[m] > 0) ? machineMeta[m] : 516;
                                const eficacia = meta > 0 ? (value / meta) * 100 : 0;
                                return [parseFloat(value).toFixed(2), eficacia.toFixed(1) + '%'];
                            }
                            return '';
                        }
                    }
                }
            ]
        },
        options: {
            layout: {
                padding: {
                    top: 25,
                    right: 25,
                    bottom: 0,
                    left: 0
                }
            },
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                bar3DGlass: {
                    enabled: true
                },
                tooltip: {
                    callbacks: {
                        afterLabel: function (context) {
                            if (context.dataset.type === 'bar') {
                                const m = context.label;
                                const meta = (machineMeta[m] !== undefined && machineMeta[m] > 0) ? machineMeta[m] : 516;
                                const val = context.parsed.y || 0;
                                const efi = meta > 0 ? (val / meta) * 100 : 0;
                                return `Meta: ${meta.toFixed(2)} min | Eficacia: ${efi.toFixed(1)}%`;
                            }
                            return '';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grace: '15%', // Margen extra arriba para el techo 3D
                    title: {
                        display: true,
                        text: 'Minutos'
                    }
                }
            }
        }
    });
}

function initProdTypeChart(data, targetDate, targetMaquina) {
    const ctx = document.getElementById('prodTypeChart').getContext('2d');
    const machineStats = {};

    data.forEach(r => {
        const isDateMatch = isTargetDate(r.Fecha, targetDate);
        const maquinaName = normalizarNombreMaquina(r.Maquina);

        if (isDateMatch && maquinaName) {
            // Filtrar por máquina si es que se ha seleccionado una máquina específica
            if (targetMaquina !== "TODAS" && normalizarNombreMaquina(targetMaquina) !== maquinaName) {
                return;
            }

            if (!machineStats[maquinaName]) {
                machineStats[maquinaName] = { prendas: 0, corte: 0 };
            }

            const cantidad = parseFloat(r.Cantidad) || 0;
            const tipoStr = r.Tipo ? String(r.Tipo).toLowerCase().trim() : '';

            if (tipoStr.includes('prenda')) {
                machineStats[maquinaName].prendas += cantidad;
            } else if (tipoStr.includes('corte')) {
                machineStats[maquinaName].corte += cantidad;
            }
        }
    });

    const machines = Object.keys(machineStats).sort();

    const prendasData = machines.map(m => machineStats[m].prendas);
    const corteData = machines.map(m => machineStats[m].corte);

    if (prodTypeChart) prodTypeChart.destroy();

    // Registrar globalmente el plugin si no está registrado
    Chart.register(ChartDataLabels);

    prodTypeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: machines,
            datasets: [
                {
                    label: 'Prendas',
                    data: prendasData,
                    backgroundColor: palette3D[0].main,
                    custom3DColors: palette3D[0],
                    borderWidth: 0
                },
                {
                    label: 'Cortes',
                    data: corteData,
                    backgroundColor: palette3D[1].main,
                    custom3DColors: palette3D[1],
                    borderWidth: 0
                }
            ]
        },
        options: {
            layout: {
                padding: {
                    top: 25,
                    right: 25,
                    bottom: 0,
                    left: 0
                }
            },
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                bar3DGlass: {
                    enabled: true
                },
                datalabels: {
                    anchor: 'center',
                    align: 'center',
                    color: '#000',
                    font: {
                        weight: 'bold',
                        size: 24
                    },
                    formatter: function (value) {
                        return value > 0 ? value : '';
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grace: '15%'
                }
            }
        }
    });
}

function initProdTallasChart(data, targetDate, targetMaquina) {
    const ctx = document.getElementById('prodTallasChart').getContext('2d');
    const opFiltersContainer = document.getElementById('op-filters-container');

    // 1. Filtrar los datos por Fecha y Máquina
    let filteredData = data.filter(r => {
        const isDateMatch = isTargetDate(r.Fecha, targetDate);
        const maquinaName = normalizarNombreMaquina(r.Maquina);
        const isMachineMatch = targetMaquina === "TODAS" || normalizarNombreMaquina(targetMaquina) === maquinaName;
        return isDateMatch && isMachineMatch && r.Op && r.Talla;
    });

    // 2. Obtener las OPs únicas del día/máquina (Convertimos a String)
    const opsUnicas = [...new Set(filteredData.map(r => String(r.Op)))].sort();

    // 3. Renderizar Checkboxes (si no hay OPs, limpiar container)
    // Para evitar re-renderizados constantes al dar click en un checkbox, primero 
    // revisamos si los checkboxes existentes coinciden con las OPs únicas calculadas.
    // Si la lista de OPs cambió (porque cambiaron de fecha o máquina), los reconstruimos.
    const currentCheckboxes = Array.from(opFiltersContainer.querySelectorAll('input[type="checkbox"]')).map(cb => cb.value).sort();

    const opsChanged = opsUnicas.join(',') !== currentCheckboxes.join(',');

    if (opsChanged) {
        opFiltersContainer.innerHTML = '';
        if (opsUnicas.length === 0) {
            opFiltersContainer.innerHTML = '<span class="text-sm text-gray-400">Sin OPs</span>';
        } else {
            opsUnicas.forEach(op => {
                const label = document.createElement('label');
                label.className = 'flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-sm cursor-pointer hover:bg-gray-200 transition';

                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.value = op;
                cb.checked = true; // Por defecto toditas checadas
                cb.className = 'op-filter-checkbox';
                // Al cambiar un checkbox, solo se actualiza el CHART, no todo el dashboard
                cb.onchange = () => updateProdTallasChartDisplay(filteredData, ctx);

                label.appendChild(cb);
                label.appendChild(document.createTextNode(op));
                opFiltersContainer.appendChild(label);
            });
        }
    }

    // 4. Llamar a la función interna de dibujado con la data ya lista
    updateProdTallasChartDisplay(filteredData, ctx);
}

// Paleta de colores profesionales (Usando palette3D definido arriba)

// Función para definir el orden natural de las tallas de ropa o numéricas
function sortTallas(a, b) {
    const orderLetters = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '2XL', '3XL', '4XL'];
    const indexA = orderLetters.indexOf(a.toUpperCase());
    const indexB = orderLetters.indexOf(b.toUpperCase());

    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;

    const numA = parseFloat(a);
    const numB = parseFloat(b);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;

    return a.localeCompare(b);
}

function updateProdTallasChartDisplay(fullDayData, ctx) {
    // 1. Obtener los Checkboxes chequeados para filtrar solo OPs seleccionadas
    const checkboxes = Array.from(document.querySelectorAll('.op-filter-checkbox'));
    const opsSeleccionadas = checkboxes.filter(cb => cb.checked).map(cb => cb.value);

    // 2. Filtrar data
    const activeData = fullDayData.filter(r => opsSeleccionadas.includes(String(r.Op)));

    // 3. Estructurar para el Bar Chart (Eje X = Tallas, Datasets = OPs)
    const tallasLabels = [...new Set(activeData.map(r => String(r.Talla).toUpperCase()))].sort(sortTallas);
    const opsUnicas = [...new Set(activeData.map(r => String(r.Op)))].sort();

    const datasets = opsUnicas.map((op, index) => {
        const colorIdx = index % palette3D.length;

        return {
            label: op,
            backgroundColor: palette3D[colorIdx].main,
            custom3DColors: palette3D[colorIdx],
            borderWidth: 0,
            data: tallasLabels.map(talla => {
                // Sumar Cantidades para esa Talla y esa OP específica
                return activeData
                    .filter(r => String(r.Talla).toUpperCase() === talla && String(r.Op) === op)
                    .reduce((sum, r) => sum + (parseFloat(r.Cantidad) || 0), 0);
            })
        };
    });

    if (prodTallasChart) prodTallasChart.destroy();
    Chart.register(ChartDataLabels);

    prodTallasChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: tallasLabels,
            datasets: datasets
        },
        options: {
            layout: {
                padding: {
                    top: 25,
                    right: 25,
                    bottom: 0,
                    left: 0
                }
            },
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                bar3DGlass: {
                    enabled: true
                },
                datalabels: {
                    anchor: 'center',
                    align: 'center',
                    color: '#000',
                    font: {
                        weight: 'bold',
                        size: 20
                    },
                    formatter: function (value) {
                        return value > 0 ? value : '';
                    }
                },
                tooltip: {
                    callbacks: {
                        title: function (context) {
                            return 'Talla: ' + context[0].label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Tallas',
                        font: { weight: 'bold' }
                    }
                },
                y: {
                    beginAtZero: true,
                    grace: '15%',
                    title: {
                        display: true,
                        text: 'Cantidad Producida'
                    }
                }
            }
        }
    });
}

function initProdClientChart(data, targetDate) {
    const ctx = document.getElementById('prodClientChart').getContext('2d');

    // 1. Filtrar los datos solo por Fecha (no por máquina)
    const filteredData = data.filter(r => {
        return isTargetDate(r.Fecha, targetDate) && r.Cliente;
    });

    // 2. Agrupar cantidades por cliente
    const clientStats = {};
    let totalCantidad = 0;

    filteredData.forEach(r => {
        const clienteName = r.Cliente;
        const cantidad = parseFloat(r.Cantidad) || 0;
        if (!clientStats[clienteName]) {
            clientStats[clienteName] = 0;
        }
        clientStats[clienteName] += cantidad;
        totalCantidad += cantidad;
    });

    const clients = Object.keys(clientStats).sort((a, b) => clientStats[b] - clientStats[a]); // Ordenados de mayor a menor
    const clientData = clients.map(c => clientStats[c]);

    // Asignar colores pastel de la palette3D a cada cliente
    const backgroundColors = clients.map((c, index) => palette3D[index % palette3D.length].main);
    const borderColors = clients.map((c, index) => palette3D[index % palette3D.length].side);

    if (prodClientChart) prodClientChart.destroy();
    Chart.register(ChartDataLabels);

    // Plugin local para Pie 3D con Inclinación Isométrica
    const pie3DPlugin = {
        id: 'pie3D',
        beforeDraw: (chart) => {
            const ctx = chart.ctx;
            const meta = chart.getDatasetMeta(0);
            if (!meta.data.length) return;

            const depth = 40; // Super altura (profundidad en pixeles)
            const tilt = 0.55; // Inclinación (escala en Y)

            // Para que la escala funcione bien sin mover el centro:
            // Guardamos el estado, trasladamos al centro, escalamos, y devolvemos.
            // Para el plugin 3D necesitamos dibujar todos los niveles de profundidad.

            ctx.save();

            // Para dibujar el efecto 3D, iteramos desde abajo hacia arriba (depth hasta 1)
            for (let d = depth; d > 0; d--) {
                meta.data.forEach((element, index) => {
                    const view = element;

                    ctx.save();
                    ctx.translate(view.x, view.y);
                    ctx.scale(1, tilt); // Aplicar inclinación

                    ctx.beginPath();
                    // Al haber trasladado al centro, x = 0, y = 0
                    ctx.moveTo(0, d);
                    ctx.arc(0, d, view.outerRadius, view.startAngle, view.endAngle);
                    ctx.closePath();

                    // Color de los bordes/lados 3D
                    ctx.fillStyle = borderColors[index];
                    ctx.fill();

                    // Bordes sutiles entre tajadas en el lado 3D
                    ctx.lineWidth = 0.5;
                    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
                    ctx.stroke();

                    ctx.restore();
                });
            }

            ctx.restore();

            // También tenemos que escalar la "tapa superior" (el dataset nativo)
            // Para eso, modificamos temporalmente el contexto antes de que Chart.js dibuje el dataset.
            ctx.save();
            // Estimamos el centro promediando
            const centerX = meta.data[0].x;
            const centerY = meta.data[0].y;
            ctx.translate(centerX, centerY);
            ctx.scale(1, tilt); // Inclinación en Y
            ctx.translate(-centerX, -centerY);

            // Reemplazamos ctx temporalmente para la tapa
            chart.ctx = ctx;
        },
        afterDraw: (chart) => {
            chart.ctx.restore(); // Restauramos la transformación después de que dibuje el pie
        }
    };

    prodClientChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: clients,
            datasets: [{
                data: clientData,
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 1,
                hoverOffset: 0 // Desactivado
            }]
        },
        plugins: [pie3DPlugin],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    bottom: 50, // Espacio para el borde 3D inferior
                    top: 20
                }
            },
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        font: { size: 14, weight: 'bold' }
                    }
                },
                datalabels: {
                    color: '#000000',
                    font: {
                        family: 'Arial',
                        weight: 'bold',
                        size: 20,
                        style: 'normal'
                    },
                    formatter: (value) => {
                        if (totalCantidad === 0 || value === 0) return '';
                        const percentage = ((value / totalCantidad) * 100).toFixed(1);
                        return percentage + '%';
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const lbl = context.label || '';
                            const val = context.parsed || 0;
                            let perc = 0;
                            if (totalCantidad > 0) {
                                perc = ((val / totalCantidad) * 100).toFixed(1);
                            }
                            return `${lbl}: ${val} (${perc}%)`;
                        }
                    }
                }
            }
        }
    });
}