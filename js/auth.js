/**
 * PROD-SYS — Módulo de Autenticación con Roles y Permisos
 * Gestiona el acceso restringido a secciones según el rol del usuario.
 * La sesión se persiste en localStorage hasta que el usuario cierre sesión.
 */

const AUTH = (() => {

    // ──────────────────────────────────────────────────────────────────────────
    // BASE DE USUARIOS (hardcoded para uso interno de empresa)
    // Secciones válidas: 'formulario' | 'dashboard' | 'indicadores' | 'tabla' | 'registro-ts'
    // ──────────────────────────────────────────────────────────────────────────
    const USUARIOS = {
        'GCELIS': {
            clave: 'Cofaco2026*',
            nombre: 'Genny Celis',
            rol: 'Administrador',
            estado: 'ACTIVO',
            vistas: ['formulario', 'dashboard', 'indicadores', 'tabla', 'registro-ts']
        },
        'EMENDOZA': {
            clave: 'Cofaco26*',
            nombre: 'Eric Mendoza',
            rol: 'Administrador',
            estado: 'ACTIVO',
            vistas: ['formulario', 'dashboard', 'indicadores', 'tabla', 'registro-ts']
        },
        'UTORRES': {
            clave: 'cofa2026',
            nombre: 'Ubilder Torres',
            rol: 'Supervisor',
            estado: 'ACTIVO',
            vistas: ['formulario', 'dashboard', 'indicadores', 'tabla']
        },
        'RRIOS': {
            clave: 'Rosa2026',
            nombre: 'Rosa Rios',
            rol: 'Inspectora',
            estado: 'ACTIVO',
            vistas: ['formulario', 'dashboard', 'indicadores', 'tabla']
        },
        'YPIÑAS': {
            clave: 'Yolanda2026',
            nombre: 'Yolanda Piñas',
            rol: 'Inspectora',
            estado: 'ACTIVO',
            vistas: ['formulario', 'dashboard', 'indicadores', 'tabla']
        },
        'LMERINO': {
            clave: 'Lucia2026',
            nombre: 'Lucia Merino',
            rol: 'Inspectora',
            estado: 'ACTIVO',
            vistas: ['formulario', 'dashboard', 'indicadores', 'tabla']
        }
    };

    const SESSION_KEY = 'prodsys_session';

    // ──────────────────────────────────────────────────────────────────────────
    // INICIALIZACIÓN: verificar sesión existente al cargar la página
    // ──────────────────────────────────────────────────────────────────────────
    function init() {
        const sesionGuardada = _leerSesion();
        if (sesionGuardada && USUARIOS[sesionGuardada.usuario]) {
            // Sesión válida: mostrar app directamente
            _aplicarSesion(sesionGuardada.usuario, false);
        } else {
            // Sin sesión: mostrar pantalla de login
            _mostrarOverlay(true);
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // LOGIN: validar credenciales y establecer sesión
    // ──────────────────────────────────────────────────────────────────────────
    function login() {
        const inputUser = document.getElementById('auth-usuario');
        const inputClave = document.getElementById('auth-clave');
        const errorMsg = document.getElementById('auth-error');

        const usuarioRaw = (inputUser.value || '').trim().toUpperCase();
        const claveRaw = (inputClave.value || '').trim();

        // Limpiar error previo
        errorMsg.style.opacity = '0';
        inputUser.classList.remove('auth-input--error');
        inputClave.classList.remove('auth-input--error');

        // Buscar usuario (insensible a acentos para YPIÑAS)
        const usuarioKey = Object.keys(USUARIOS).find(k =>
            k === usuarioRaw || k.normalize('NFD').replace(/[\u0300-\u036f]/g, '') === usuarioRaw.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        );

        const datos = usuarioKey ? USUARIOS[usuarioKey] : null;

        if (!datos || datos.estado !== 'ACTIVO') {
            _mostrarError('Usuario no encontrado o inactivo.', inputUser);
            return;
        }

        if (datos.clave !== claveRaw) {
            _mostrarError('Contraseña incorrecta. Intente nuevamente.', inputClave);
            return;
        }

        // ✅ Credenciales correctas
        _guardarSesion(usuarioKey);
        _aplicarSesion(usuarioKey, true);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // LOGOUT: limpiar sesión y mostrar login
    // ──────────────────────────────────────────────────────────────────────────
    function logout() {
        localStorage.removeItem(SESSION_KEY);
        // Animación de salida suave antes de recargar
        const overlay = document.getElementById('login-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
            setTimeout(() => {
                overlay.style.opacity = '1';
            }, 10);
        }
        setTimeout(() => {
            location.reload();
        }, 300);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // APLICAR SESIÓN: mostrar app y configurar permisos de menú
    // ──────────────────────────────────────────────────────────────────────────
    function _aplicarSesion(usuarioKey, esLoginNuevo) {
        const datos = USUARIOS[usuarioKey];
        if (!datos) return;

        // 1. Ocultar overlay de login con animación
        _mostrarOverlay(false);

        // 2. Configurar perfil de usuario en la barra lateral
        _renderizarPerfil(usuarioKey, datos);

        // 3. Aplicar permisos de menú (mostrar/ocultar botones de nav)
        _aplicarPermisos(datos.vistas);

        // 4. Si es login nuevo, disparar carga de datos de la app
        //    (si ya había sesión, window.onload de config.js ya lo hizo)
        if (esLoginNuevo) {
            if (typeof cargarDatosDeHojas === 'function') {
                const fechaInput = document.getElementById('input-fecha');
                if (fechaInput && !fechaInput.value) {
                    fechaInput.valueAsDate = new Date();
                }
                cargarDatosDeHojas(false);
            }
        }

        // 4.5. Autoseleccionar inspectora si corresponde
        if (typeof autoSeleccionarInspectoraActiva === 'function') {
            autoSeleccionarInspectoraActiva();
        }

        // 5. Navegar a la primera vista permitida
        const primeraVista = datos.vistas[0] || 'formulario';
        if (typeof showSection === 'function') {
            showSection(primeraVista);
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // RENDERIZAR PERFIL en la barra de navegación
    // ──────────────────────────────────────────────────────────────────────────
    function _renderizarPerfil(usuarioKey, datos) {
        const perfilContainer = document.getElementById('auth-user-profile');
        if (!perfilContainer) return;

        const iniciales = datos.nombre
            .split(' ')
            .map(p => p[0])
            .slice(0, 2)
            .join('');

        perfilContainer.innerHTML = `
            <div class="auth-profile">
                <div class="auth-avatar">${iniciales}</div>
                <div class="auth-profile-info">
                    <span class="auth-profile-name">${datos.nombre}</span>
                    <span class="auth-profile-role">${datos.rol}</span>
                </div>
                <button class="auth-logout-btn" onclick="AUTH.logout()" title="Cerrar Sesión">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                    </svg>
                </button>
            </div>
        `;
        perfilContainer.style.display = 'block';
    }

    // ──────────────────────────────────────────────────────────────────────────
    // APLICAR PERMISOS: ocultar/mostrar botones de navegación según vistas
    // ──────────────────────────────────────────────────────────────────────────
    function _aplicarPermisos(vistasPermitidas) {
        const todasLasVistas = ['formulario', 'dashboard', 'indicadores', 'tabla', 'registro-ts'];

        todasLasVistas.forEach(vista => {
            const navBtn = document.getElementById(`nav-${vista}`);
            if (!navBtn) return;

            if (vistasPermitidas.includes(vista)) {
                navBtn.style.display = '';
                navBtn.style.removeProperty('display');
            } else {
                navBtn.style.display = 'none';
            }
        });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // HELPERS PRIVADOS
    // ──────────────────────────────────────────────────────────────────────────
    function _mostrarOverlay(visible) {
        const overlay = document.getElementById('login-overlay');
        if (!overlay) return;
        if (visible) {
            overlay.classList.remove('auth-overlay--hidden');
            overlay.style.display = 'flex';
        } else {
            overlay.classList.add('auth-overlay--hidden');
            setTimeout(() => { overlay.style.display = 'none'; }, 400);
        }
    }

    function _mostrarError(mensaje, inputFoco) {
        const errorMsg = document.getElementById('auth-error');
        const card = document.getElementById('auth-card');
        if (errorMsg) {
            errorMsg.textContent = mensaje;
            errorMsg.style.opacity = '1';
        }
        if (inputFoco) {
            inputFoco.classList.add('auth-input--error');
            inputFoco.focus();
        }
        // Animación shake en la card
        if (card) {
            card.classList.remove('auth-shake');
            void card.offsetWidth; // Forzar reflow para reiniciar animación
            card.classList.add('auth-shake');
        }
    }

    function _guardarSesion(usuarioKey) {
        localStorage.setItem(SESSION_KEY, JSON.stringify({
            usuario: usuarioKey,
            timestamp: Date.now()
        }));
    }

    function _leerSesion() {
        try {
            return JSON.parse(localStorage.getItem(SESSION_KEY));
        } catch {
            return null;
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // TOGGLE visibilidad de contraseña
    // ──────────────────────────────────────────────────────────────────────────
    function toggleClave() {
        const input = document.getElementById('auth-clave');
        const iconoOjo = document.getElementById('auth-ojo-icono');
        if (!input) return;

        if (input.type === 'password') {
            input.type = 'text';
            iconoOjo.innerHTML = `
                <path stroke-linecap="round" stroke-linejoin="round"
                    d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />`;
        } else {
            input.type = 'password';
            iconoOjo.innerHTML = `
                <path stroke-linecap="round" stroke-linejoin="round"
                    d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />`;
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Permitir login con tecla ENTER en los campos del formulario
    // ──────────────────────────────────────────────────────────────────────────
    function _bindEnterKey() {
        ['auth-usuario', 'auth-clave'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('keydown', e => {
                    if (e.key === 'Enter') login();
                });
            }
        });
    }

    // Exponer API pública
    return { init, login, logout, toggleClave, _bindEnterKey };

})();

// ──────────────────────────────────────────────────────────────────────────────
// Iniciar cuando el DOM esté listo
// ──────────────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    AUTH.init();
    AUTH._bindEnterKey();
});
