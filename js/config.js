const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbx8YOqkUl3j4i4pJOaF1S0UPJwbIoIeyzhh5KpN7I38QSvbHAovhCVRMY4I-r5WT8wO/exec";
let baseDeDatos = {
    Turno: [], Maquina: [], Trabajadores: [],
    Inspeccion: [], Tipo: [], Op: [], Ubicacion: [],
    Secuencia: [], Ts: [], Base: [], Tecnicas: []
};
let registrosLocales = [];
let myChart = null;
let prodTypeChart = null;
let prodTallasChart = null;
let prodClientChart = null;

window.onload = async () => {
    // Solo cargar datos si ya hay una sesión activa (auth.js verificó el localStorage).
    // Si no hay sesión, auth.js mostrará el login y disparará cargarDatosDeHojas()
    // una vez que el usuario ingrese credenciales correctas.
    const sesion = (() => {
        try { return JSON.parse(localStorage.getItem('prodsys_session')); }
        catch { return null; }
    })();

    if (sesion) {
        if (typeof cargarRegistrosLocalesStorage === 'function') {
            registrosLocales = cargarRegistrosLocalesStorage();
        }
        const fechaInput = document.getElementById('input-fecha');
        if (fechaInput) fechaInput.valueAsDate = new Date();
        // Carga SWR: hidrata instantáneamente si hay caché, y sincroniza en segundo plano
        await cargarDatosDeHojas(false);
    }
};