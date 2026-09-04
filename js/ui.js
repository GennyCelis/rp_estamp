function llenarSelect(id, array, colName) {
    const select = document.getElementById(id);
    if (!array || !select) return;
    const firstOption = select.options[0];
    select.innerHTML = '';
    select.add(firstOption);

    array.forEach(item => {
        let option = document.createElement("option");
        const val = item[colName] || item[Object.keys(item)[0]];
        if (val !== undefined && val !== null) {
            option.value = val;
            option.text = val;
            select.add(option);
        }
    });
}

function showSection(id) {
    document.querySelectorAll('.section-content').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => {
        n.classList.remove('active');
        if (n.id === `nav-${id}`) n.classList.add('active');
    });
    // Refrescar la tabla con los registros filtrados según usuario activo
    if (id === 'tabla' && typeof renderTable === 'function') {
        if (typeof inicializarFiltroFechaTabla === 'function') {
            inicializarFiltroFechaTabla();
        }
        renderTable();
    }
}

function showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;

    if (t._hideTimeout) {
        clearTimeout(t._hideTimeout);
    }

    t.innerText = msg || "Exito";
    t.classList.remove('show');
    void t.offsetWidth;
    t.classList.add('show');

    t._hideTimeout = setTimeout(() => {
        t.classList.remove('show');
        t._hideTimeout = null;
    }, 3000);
}

function mostrarLoader(show) {
    document.getElementById("loader").style.display = show ? "flex" : "none";
}

function llenarDatalist(id, array, colName) {
    const datalist = document.getElementById(id);
    if (!array || !datalist) return;
    datalist.innerHTML = '';
    array.forEach(item => {
        const val = item[colName] || item[Object.keys(item)[0]];
        if (val !== undefined && val !== null) {
            let option = document.createElement("option");
            option.value = val;
            datalist.appendChild(option);
        }
    });
}
