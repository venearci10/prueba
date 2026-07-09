import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithPopup, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    updateProfile, 
    onAuthStateChanged,
    sendPasswordResetEmail 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    doc, 
    addDoc, 
    setDoc, 
    getDoc, 
    getDocs, 
    updateDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ═══════════════════════════════════════════════════════════════
// CONFIGURACIÓN INICIAL
// ═══════════════════════════════════════════════════════════════

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY || "AIzaSyC_QVqEUFopf4AtMe4Ov9WvG4hCdX4DKNo",
    authDomain: "halkin10-3868a.firebaseapp.com",
    projectId: "halkin10-3868a",
    storageBucket: "halkin10-3868a.appspot.com",
    messagingSenderId: "816052134460",
    appId: "1:816052134460:web:4ba34a9b80899187b7d939",
    measurementId: "G-70J2YVMJWW"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const WHATSAPP_VENEARCI_APP = "582383343563"; 
const ADMIN_EMAIL = "venearcimultimedia@gmail.com";

// ═══════════════════════════════════════════════════════════════
// CATÁLOGO DE PRECIOS (Base de Datos Local)
// ═══════════════════════════════════════════════════════════════

const catalogoPrecios = {
    "Plomería": [
        { labor: "Cambio de Llave de Paso", precio: 25.00, keyMaterial: "llave_paso" },
        { labor: "Destapar Cloacas / Tuberías", precio: 45.00, keyMaterial: "ninguno" }
    ],
    "Electricidad": [
        { labor: "Instalación de Tablero Eléctrico", precio: 50.00, keyMaterial: "breaker" },
        { labor: "Punto de Corriente Nuevo", precio: 20.00, keyMaterial: "tomacorriente" }
    ],
    "Albañilería": [
        { labor: "Friso de Pared (m²)", precio: 15.00, keyMaterial: "cemento" }
    ],
    "Refrigeración": [
        { labor: "Mantenimiento Preventivo de Aire", precio: 30.00, keyMaterial: "gas_refrigerante" }
    ]
};

// ═══════════════════════════════════════════════════════════════
// TEXTOS DE INTERFAZ (Refactorizado)
// ═══════════════════════════════════════════════════════════════

const authTextos = {
    login: {
        titulo: "Iniciar Sesión",
        subtitulo: "Accede de forma rápida para gestionar tus servicios",
        btnSubmit: "Ingresar al Sistema",
        promptText: "¿No tienes una cuenta aún?",
        linkToggle: "Regístrate aquí",
        showForgot: true,
        showNombreTelefono: false
    },
    register: {
        titulo: "Registrar Cuenta",
        subtitulo: "Crea tu perfil en Venearci Services para solicitar asistencia",
        btnSubmit: "Crear Cuenta Nueva",
        promptText: "¿Ya posees una cuenta?",
        linkToggle: "Inicia sesión aquí",
        showForgot: false,
        showNombreTelefono: true
    }
};

const mensajesError = {
    'permission-denied': 'No tienes permisos para realizar esta acción.',
    'failed-precondition': 'Firestore no está listo. Intenta de nuevo.',
    'unavailable': 'Servicio no disponible. Intenta más tarde.',
    'auth/user-not-found': 'El correo electrónico ingresado no se encuentra registrado.',
    'auth/invalid-email': 'La dirección de correo electrónico no tiene un formato válido.',
    'auth/invalid-credential': 'Correo o contraseña incorrectos.'
};

// ═══════════════════════════════════════════════════════════════
// VARIABLES GLOBALES
// ═══════════════════════════════════════════════════════════════

let personalVenearci = [
    { uid: "emp_angel_01", correo: "carlos@venearci.com", nombre: "Ángel Arcila", rubro: "Plomería", tlf: "584121111111", foto: "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150", disponible: true },
    { uid: "emp_jose_02", correo: "jose@venearci.com", nombre: "Aníbal Arcila", rubro: "Electricidad", tlf: "584122222222", foto: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150", disponible: true },
    { uid: "emp_luis_03", correo: "luis@venearci.com", nombre: "Angel Jose", rubro: "Albañilería", tlf: "584243334455", foto: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150", disponible: true },
    { uid: "emp_ramon_04", correo: "ramon@venearci.com", nombre: "Ramón Arcila", rubro: "Refrigeración", tlf: "584124898364", foto: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150", disponible: true }
];

let usuarioActual = null;
let telefonoUsuario = ""; 
let empleadoSeleccionado = null;
let cotizacionFinal = null;
let isRegisterMode = false;
let idEmpleadoEditando = null;

// ═══════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════

/**
 * Valida que una URL sea válida
 */
function esURLValida(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Valida formato de correo electrónico
 */
function esEmailValido(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Obtiene elemento del DOM con validación
 */
function getElementoSeguro(id) {
    const elemento = document.getElementById(id);
    if (!elemento) {
        console.warn(`Elemento con ID "${id}" no encontrado`);
        return null;
    }
    return elemento;
}

/**
 * Maneja errores de Firebase con mensajes amigables
 */
function obtenerMensajeError(errorCode) {
    return mensajesError[errorCode] || "Error desconocido. Intenta de nuevo.";
}

/**
 * Oculta todas las secciones principales
 */
function ocultarTodo() {
    const paneles = ['panel-admin', 'panel-empleado', 'sec-servicio'];
    paneles.forEach(id => {
        const elemento = getElementoSeguro(id);
        if (elemento) elemento.classList.add('id-oculto');
    });
}

// ═══════════════════════════════════════════════════════════════
// INICIALIZACIÓN DEL DOCUMENTO
// ═══════════════════════════════════════════════════════════════

document.addEventListener("DOMContentLoaded", async () => {
    console.log("🚀 Iniciando Venearci Services...");
    
    // Cargar especialistas desde la nube
    await cargarEspecialistasDesdeNube();

    // Ocultar splash screen después de 2 segundos
    setTimeout(() => {
        const splash = getElementoSeguro('sec-splash');
        if (splash) {
            splash.style.transition = "opacity 0.4s ease";
            splash.style.opacity = "0";
            setTimeout(() => splash.classList.add('id-oculto'), 400);
        }
    }, 2000);

    // Registrar event listeners
    registrarEventListeners();
    
    // Inicializar módulo de autenticación
    setTimeout(() => inicializarManejadorAutenticacionFina(), 500);
});

/**
 * Registra todos los event listeners
 */
function registrarEventListeners() {
    const listeners = {
        'btn-login-google': loginConGoogle,
        'toggle-auth-mode': alternarModoAutenticacion,
        'form-auth-tradicional': (e) => { e.preventDefault(); procesarAuthTradicional(); },
        'btn-logout': () => signOut(auth),
        'btn-guardar-modal-phone': guardarTelefonoModal,
        'select-categoria': cambiarCategoriaRubro,
        'select-trabajo': cambiarTrabajoEspecifico,
        'btn-asignar-aleatorio': asignarTecnicoAleatorio,
        'btn-cerrar-modal-factura': cerrarModalFactura,
        'btn-confirmar-servicio': despacharOrdenWhatsApp,
        'btn-adm-add-empleado': adminRegistrarOGuardarEmpleado,
        'btn-adm-cancelar-edicion': limpiarFormularioCEO
    };

    Object.entries(listeners).forEach(([id, handler]) => {
        const elemento = getElementoSeguro(id);
        if (elemento) {
            elemento.removeEventListener('click', handler);
            elemento.removeEventListener('submit', handler);
            elemento.addEventListener(elemento.tagName === 'FORM' ? 'submit' : 'click', handler);
        }
    });
}

// ═══════════════════════════════════════════════════════════════
// CARGA DE ESPECIALISTAS
// ═══════════════════════════════════════════════════════════════

async function cargarEspecialistasDesdeNube() {
    try {
        const querySnapshot = await getDocs(collection(db, "especialistas"));
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const index = personalVenearci.findIndex(p => p.uid === data.uid);
            if (index !== -1) {
                personalVenearci[index] = data; 
            } else {
                personalVenearci.push(data); 
            }
        });
        console.log(`✅ ${personalVenearci.length} especialistas cargados`);
        actualizarSelectorEdicionCEO();
    } catch (error) {
        console.error("⚠️ Usando base de datos local:", error.message);
    }
}

// ═══════════════════════════════════════════════════════════════
// MONITOREO DE AUTENTICACIÓN
// ═══════════════════════════════════════════════════════════════

onAuthStateChanged(auth, async (user) => {
    ocultarTodo();
    
    const secAuth = getElementoSeguro('sec-auth');
    if (secAuth) secAuth.classList.remove('id-oculto');
    
    if (user) {
        usuarioActual = user;
        const authFormsContainer = getElementoSeguro('auth-forms-container');
        const userLoggedInfo = getElementoSeguro('user-logged-info');
        const displayName = getElementoSeguro('user-display-name');
        
        if (authFormsContainer) authFormsContainer.classList.add('id-oculto');
        if (userLoggedInfo) userLoggedInfo.classList.remove('id-oculto');
        if (displayName) displayName.innerText = user.displayName || user.email;

        // Verificar si es Admin
        if (user.email === ADMIN_EMAIL) {
            const badge = getElementoSeguro('user-badge-rol');
            const panelAdmin = getElementoSeguro('panel-admin');
            if (badge) badge.innerText = "CEO Admin";
            if (panelAdmin) panelAdmin.classList.remove('id-oculto');
            inicializarModuloAdmin();
            return;
        }

        // Verificar si es Empleado
        const esEmpleado = personalVenearci.find(emp => emp.correo.toLowerCase() === user.email.toLowerCase());
        if (esEmpleado) {
            const badge = getElementoSeguro('user-badge-rol');
            const panelEmpleado = getElementoSeguro('panel-empleado');
            const foto = getElementoSeguro('emp-panel-foto');
            const nombre = getElementoSeguro('emp-panel-nombre');
            
            if (badge) badge.innerText = "Especialista";
            if (panelEmpleado) panelEmpleado.classList.remove('id-oculto');
            if (foto) foto.src = esEmpleado.foto;
            if (nombre) nombre.innerText = esEmpleado.nombre;
            return;
        }

        // Es Cliente
        const badge = getElementoSeguro('user-badge-rol');
        if (badge) badge.innerText = "Cliente";
        
        try {
            const userDoc = await getDoc(doc(db, "usuarios", user.uid));
            if (userDoc.exists() && userDoc.data().telefono) {
                telefonoUsuario = userDoc.data().telefono;
                const secServicio = getElementoSeguro('sec-servicio');
                if (secServicio) secServicio.classList.remove('id-oculto');
            } else {
                const modalPerfil = getElementoSeguro('modal-completar-perfil');
                if (modalPerfil) modalPerfil.classList.remove('id-oculto');
            }
        } catch(e) {
            console.error("Error cargando documento de usuario:", e);
            const secServicio = getElementoSeguro('sec-servicio');
            if (secServicio) secServicio.classList.remove('id-oculto');
        }
    } else {
        usuarioActual = null;
        const authFormsContainer = getElementoSeguro('auth-forms-container');
        const userLoggedInfo = getElementoSeguro('user-logged-info');
        if (authFormsContainer) authFormsContainer.classList.remove('id-oculto');
        if (userLoggedInfo) userLoggedInfo.classList.add('id-oculto');
    }
});

// ═══════════════════════════════════════════════════════════════
// AUTENTICACIÓN
// ═══════════════════════════════════════════════════════════════

async function loginConGoogle() {
    try { 
        await signInWithPopup(auth, new GoogleAuthProvider()); 
    } catch (e) { 
        console.error("Error Google Login:", e);
        alert("Error: " + obtenerMensajeError(e.code)); 
    }
}

function alternarModoAutenticacion() {
    isRegisterMode = !isRegisterMode;
    actualizarUIAutenticacion(isRegisterMode);
}

/**
 * Actualiza la UI de autenticación según el modo
 */
function actualizarUIAutenticacion(isRegister) {
    const textos = authTextos[isRegister ? 'register' : 'login'];
    
    const elementoIds = {
        'auth-title': textos.titulo,
        'auth-subtitle': textos.subtitulo,
        'text-toggle-prompt': textos.promptText
    };

    Object.entries(elementoIds).forEach(([id, texto]) => {
        const elemento = getElementoSeguro(id);
        if (elemento) elemento.innerText = texto;
    });

    const btnSubmit = getElementoSeguro('btn-auth-submit');
    if (btnSubmit) btnSubmit.innerText = textos.btnSubmit;

    const linkToggle = getElementoSeguro('toggle-auth-mode');
    if (linkToggle) linkToggle.innerText = textos.linkToggle;

    // Mostrar/Ocultar campos
    const groupNombre = getElementoSeguro('group-nombre');
    const groupTelefono = getElementoSeguro('group-telefono');
    
    if (groupNombre) groupNombre.classList.toggle('id-oculto', !textos.showNombreTelefono);
    if (groupTelefono) groupTelefono.classList.toggle('id-oculto', !textos.showNombreTelefono);

    // Mostrar/Ocultar recuperación de contraseña
    const linkOlvide = getElementoSeguro('btn-olvide-contrasena');
    if (linkOlvide) linkOlvide.style.display = textos.showForgot ? "block" : "none";
}

async function procesarAuthTradicional() {
    const emailEl = getElementoSeguro('auth-email');
    const passwordEl = getElementoSeguro('auth-password');
    
    if (!emailEl || !passwordEl) {
        alert("Error: Formulario incompleto");
        return;
    }

    const email = emailEl.value.trim();
    const password = passwordEl.value.trim();
    
    if (!esEmailValido(email)) {
        alert("Por favor, ingresa un correo válido.");
        return;
    }

    if (password.length < 6) {
        alert("La contraseña debe tener al menos 6 caracteres.");
        return;
    }

    try {
        if (isRegisterMode) {
            const nombreEl = getElementoSeguro('auth-nombre');
            const telefonoEl = getElementoSeguro('auth-telefono');
            
            if (!nombreEl || !telefonoEl) {
                alert("Error: Campos requeridos incompletos");
                return;
            }

            const nombre = nombreEl.value.trim();
            const tlf = telefonoEl.value.replace(/\D/g, '');
            
            if (!nombre || tlf.length < 8) {
                alert("Por favor completa nombre y teléfono válido.");
                return;
            }

            const creds = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(creds.user, { displayName: nombre });
            await setDoc(doc(db, "usuarios", creds.user.uid), { nombre, email, telefono: tlf });
            alert("¡Registro exitoso! Bienvenido a Venearci Services");
        } else {
            await signInWithEmailAndPassword(auth, email, password);
        }
    } catch(err) {
        console.error("Error autenticación:", err.code);
        alert("Error: " + obtenerMensajeError(err.code));
    }
}

async function guardarTelefonoModal() {
    const inputTlf = getElementoSeguro('modal-telefono');
    if (!inputTlf) return;

    const tlf = inputTlf.value.replace(/\D/g, '');
    if (tlf.length < 8) {
        alert("Ingresa un teléfono válido (mínimo 8 dígitos).");
        return;
    }

    try {
        telefonoUsuario = tlf;
        if (auth.currentUser) {
            await setDoc(doc(db, "usuarios", auth.currentUser.uid), { telefono: tlf }, { merge: true });
        }
        
        const modalPerfil = getElementoSeguro('modal-completar-perfil');
        const secServicio = getElementoSeguro('sec-servicio');
        
        if (modalPerfil) modalPerfil.classList.add('id-oculto');
        if (secServicio) secServicio.classList.remove('id-oculto');
        
        alert("✅ Teléfono guardado con éxito");
    } catch (e) {
        console.error("Error guardando teléfono:", e);
        alert("Error: " + obtenerMensajeError(e.code));
    }
}

// ═══════════════════════════════════════════════════════════════
// MANEJO DE AUTENTICACIÓN AVANZADA
// ═══════════════════════════════════════════════════════════════

function inicializarManejadorAutenticacionFina() {
    const linkOlvide = getElementoSeguro('btn-olvide-contrasena');

    if (linkOlvide) {
        linkOlvide.removeEventListener('click', manejarRecuperacionContrasena);
        linkOlvide.addEventListener('click', manejarRecuperacionContrasena);
    }

    console.log("✅ Manejador de autenticación inicializado");
}

async function manejarRecuperacionContrasena(e) {
    e.preventDefault();
    const txtEmail = getElementoSeguro('auth-email');
    const emailUsuario = txtEmail ? txtEmail.value.trim() : "";

    if (!emailUsuario) {
        alert("Por favor, introduce tu correo electrónico para recibir el enlace de restablecimiento.");
        if (txtEmail) txtEmail.focus();
        return;
    }

    try {
        await sendPasswordResetEmail(auth, emailUsuario);
        alert(`✅ Enlace enviado a ${emailUsuario}. Revisa tu correo para restablecer tu contraseña.`);
    } catch (error) {
        console.error("Error recuperación:", error.code);
        alert("Error: " + obtenerMensajeError(error.code));
    }
}

// ═══════════════════════════════════════════════════════════════
// SELECCIÓN DE SERVICIOS
// ═══════════════════════════════════════════════════════════════

function cambiarCategoriaRubro(e) {
    const rubro = e.target.value;
    const select = getElementoSeguro('select-trabajo');
    
    if (!select) return;

    select.innerHTML = '<option value="">-- Elige la Tarea --</option>';
    if (!rubro) return;

    if (catalogoPrecios[rubro]) {
        catalogoPrecios[rubro].forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.labor;
            opt.dataset.precio = t.precio;
            opt.dataset.materialKey = t.keyMaterial;
            opt.innerText = `${t.labor} ($${t.precio})`;
            select.appendChild(opt);
        });
    }

    const areaTrabajosEspecificos = getElementoSeguro('area-trabajos-especificos');
    if (areaTrabajosEspecificos) areaTrabajosEspecificos.classList.remove('id-oculto');
}

function cambiarTrabajoEspecifico(e) {
    const opcion = e.target.options[e.target.selectedIndex];
    if (!opcion.value) return;

    const rubro = document.getElementById('select-categoria')?.value;
    if (!rubro) return;

    renderizarEmpleados(rubro);
    abrirYCalcularPresupuesto();
}

function renderizarEmpleados(rubro) {
    const lista = getElementoSeguro('lista-empleados');
    if (!lista) return;

    lista.innerHTML = "";
    const filtered = personalVenearci.filter(p => p.rubro === rubro);
    
    if (filtered.length === 0) {
        lista.innerHTML = '<p style="color: #64748b;">No hay especialistas disponibles en esta categoría.</p>';
        return;
    }

    empleadoSeleccionado = filtered[0];
    
    filtered.forEach((emp, index) => {
        const div = document.createElement('div');
        div.className = `tarjeta-empleado-card ${index === 0 ? 'seleccionado' : ''}`;
        div.style.cursor = "pointer";
        div.innerHTML = `
            <div class="emp-card-flex" style="display: flex; align-items: center; gap: 12px; padding: 8px;">
                <img src="${emp.foto}" alt="${emp.nombre}" class="emp-foto-th" 
                     style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;" 
                     onerror="this.src='https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150'">
                <div>
                    <strong style="display: block;">${emp.nombre}</strong>
                    <small style="color: #64748b;">${emp.rubro}</small>
                </div>
            </div>
        `;
        
        div.addEventListener('click', () => {
            document.querySelectorAll('.tarjeta-empleado-card').forEach(t => t.classList.remove('seleccionado'));
            div.classList.add('seleccionado');
            empleadoSeleccionado = emp;
            abrirYCalcularPresupuesto();
        });
        
        lista.appendChild(div);
    });

    const areaEmpleados = getElementoSeguro('area-empleados');
    if (areaEmpleados) areaEmpleados.classList.remove('id-oculto');
}

function asignarTecnicoAleatorio() { 
    const rubro = document.getElementById('select-categoria')?.value;
    if (!rubro) {
        alert("Por favor selecciona una categoría primero.");
        return;
    }

    const disponibles = personalVenearci.filter(e => e.rubro === rubro);
    if (disponibles.length === 0) {
        alert("No hay especialistas disponibles.");
        return;
    }

    empleadoSeleccionado = disponibles[Math.floor(Math.random() * disponibles.length)];
    renderizarEmpleados(rubro);
    abrirYCalcularPresupuesto();
}

// ═══════════════════════════════════════════════════════════════
// PRESUPUESTOS Y ÓRDENES
// ═══════════════════════════════════════════════════════════════

function abrirYCalcularPresupuesto() {
    if (!empleadoSeleccionado) {
        console.warn("Empleado no seleccionado");
        return;
    }

    const select = getElementoSeguro('select-trabajo');
    if (!select) return;

    const opt = select.options[select.selectedIndex];
    if (!opt || !opt.value) {
        alert("Por favor selecciona un trabajo.");
        return;
    }

    if (!empleadoSeleccionado) {
        alert("Por favor selecciona un especialista.");
        return;
    }

    // Calcular total con IVA (16%)
    const precioBase = parseFloat(opt.dataset.precio) || 0;
    const total = (precioBase * 1.16).toFixed(2);
    
    cotizacionFinal = { 
        tarea: opt.value, 
        total: total,
        precioBase: precioBase
    };
    
    // Actualizar UI del presupuesto
    const ahora = new Date();
    const fechaHoraExacta = ahora.toLocaleDateString() + " - " + ahora.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

    const elementosPresupuesto = {
        'pre-cliente': usuarioActual ? (usuarioActual.displayName || usuarioActual.email) : "Cliente",
        'pre-empleado': empleadoSeleccionado.nombre,
        'pre-tarea': opt.value,
        'pre-total': `$${total}`,
        'pre-fecha': fechaHoraExacta
    };

    Object.entries(elementosPresupuesto).forEach(([id, valor]) => {
        const elemento = getElementoSeguro(id);
        if (elemento) elemento.innerText = valor;
    });

    // Mostrar modal de factura
    const modalFactura = getElementoSeguro('modal-factura-flotante');
    if (modalFactura) modalFactura.classList.remove('id-oculto');

    console.log("✅ Presupuesto calculado:", cotizacionFinal);
}

function cerrarModalFactura() { 
    const modalFactura = getElementoSeguro('modal-factura-flotante');
    if (modalFactura) modalFactura.classList.add('id-oculto');
}

async function despacharOrdenWhatsApp() {
    // Validaciones
    if (!cotizacionFinal || !empleadoSeleccionado || !usuarioActual) {
        alert("Por favor completa todos los datos de la orden.");
        return;
    }

    if (!telefonoUsuario) {
        alert("Por favor completa tu teléfono antes de confirmar.");
        return;
    }

    const ahora = new Date();
    const timestampString = ahora.toLocaleDateString() + " " + ahora.toLocaleTimeString();

    try {
        // Guardar orden en Firestore PRIMERO
        await addDoc(collection(db, "ordenes"), {
            cliente: usuarioActual.email,
            clienteNombre: usuarioActual.displayName || usuarioActual.email,
            especialista: empleadoSeleccionado.nombre,
            tarea: cotizacionFinal.tarea,
            precioBase: cotizacionFinal.precioBase,
            totalConIVA: cotizacionFinal.total,
            telefonoCliente: telefonoUsuario,
            fecha: ahora.toISOString(),
            estado: "pendiente"
        });

        console.log("✅ Orden guardada en Firestore");

        // Preparar mensaje de WhatsApp
        const msg = `*ORDEN VENEARCI*\n• Fecha/Hora: ${timestampString}\n• Especialista: ${empleadoSeleccionado.nombre}\n• Tarea: ${cotizacionFinal.tarea}\n• Base: $${cotizacionFinal.precioBase}\n• Total con IVA (16%): $${cotizacionFinal.total}\n• Cliente: ${usuarioActual.displayName || usuarioActual.email}\n• Teléfono: ${telefonoUsuario}`;

        // Enviar a WhatsApp
        window.open(`https://wa.me/${WHATSAPP_VENEARCI_APP}?text=${encodeURIComponent(msg)}`, '_blank');

        alert("✅ Orden enviada con éxito. Se abrirá WhatsApp para confirmar.");
        cerrarModalFactura();

    } catch (error) {
        console.error("Error despachando orden:", error);
        alert("Error: " + obtenerMensajeError(error.code));
    }
}

// ═══════════════════════════════════════════════════════════════
// MÓDULO ADMINISTRADOR
// ═══════════════════════════════════════════════════════════════

function inicializarModuloAdmin() {
    console.log("🔐 Módulo CEO de Venearci Iniciado.");
    actualizarSelectorEdicionCEO();
    inicializarEditorTarifasCEO();
}

function actualizarSelectorEdicionCEO() {
    const selectEdicion = getElementoSeguro('adm-select-editar-empleado');
    if (!selectEdicion) return;
    
    selectEdicion.innerHTML = '<option value="">-- Seleccionar Especialista para Editar --</option>';
    personalVenearci.forEach(emp => {
        const opt = document.createElement('option');
        opt.value = emp.uid;
        opt.innerText = `${emp.nombre} (${emp.rubro})`;
        selectEdicion.appendChild(opt);
    });
    
    // Remover listener anterior y agregar nuevo
    selectEdicion.removeEventListener('change', cargarDatosEmpleadoEnFormulario);
    selectEdicion.addEventListener('change', cargarDatosEmpleadoEnFormulario);
}

function cargarDatosEmpleadoEnFormulario(e) {
    const uid = e.target.value;
    if (!uid) { 
        limpiarFormularioCEO(); 
        return; 
    }
    
    const emp = personalVenearci.find(p => p.uid === uid);
    if (!emp) return;
    
    idEmpleadoEditando = emp.uid;
    
    const campos = {
        'adm-emp-nombre': emp.nombre,
        'adm-emp-correo': emp.correo,
        'adm-emp-rubro': emp.rubro,
        'adm-emp-tlf': emp.tlf,
        'adm-emp-foto': emp.foto
    };

    Object.entries(campos).forEach(([id, valor]) => {
        const elemento = getElementoSeguro(id);
        if (elemento) elemento.value = valor;
    });
    
    const btnGuardar = getElementoSeguro('btn-adm-add-empleado');
    if (btnGuardar) btnGuardar.innerText = "💾 Guardar Cambios";

    const btnCancelar = getElementoSeguro('btn-adm-cancelar-edicion');
    if (btnCancelar) btnCancelar.classList.remove('id-oculto');

    console.log("📝 Datos de empleado cargados para edición");
}

async function adminRegistrarOGuardarEmpleado() {
    const campos = {
        nombre: 'adm-emp-nombre',
        correo: 'adm-emp-correo',
        rubro: 'adm-emp-rubro',
        tlf: 'adm-emp-tlf',
        foto: 'adm-emp-foto'
    };

    const valores = {};
    for (const [key, id] of Object.entries(campos)) {
        const elemento = getElementoSeguro(id);
        if (!elemento) {
            alert(`Error: Campo ${key} no encontrado`);
            return;
        }
        valores[key] = elemento.value.trim();
    }

    // Validaciones
    if (!valores.nombre) {
        alert("El nombre es obligatorio.");
        return;
    }

    if (!esEmailValido(valores.correo)) {
        alert("Por favor ingresar un correo válido.");
        return;
    }

    const tlf = valores.tlf.replace(/\D/g, '');
    if (tlf.length < 8) {
        alert("Ingresa un teléfono válido (mínimo 8 dígitos).");
        return;
    }

    if (!valores.rubro) {
        alert("Selecciona una categoría de trabajo.");
        return;
    }

    // Validar URL de foto
    if (!esURLValida(valores.foto)) {
        alert("La URL de la foto no es válida.");
        return;
    }

    try {
        const datosActualizados = {
            nombre: valores.nombre,
            correo: valores.correo,
            rubro: valores.rubro,
            tlf: tlf,
            foto: valores.foto
        };

        if (idEmpleadoEditando) {
            // ACTUALIZAR
            const docRef = doc(db, "especialistas", idEmpleadoEditando);
            
            // Guardar en Firestore PRIMERO
            await setDoc(docRef, datosActualizados, { merge: true });
            console.log("✅ Cambios guardados en Firestore");

            // Actualizar localmente DESPUÉS de confirmar
            const index = personalVenearci.findIndex(p => p.uid === idEmpleadoEditando);
            if (index !== -1) {
                personalVenearci[index] = { ...personalVenearci[index], ...datosActualizados };
            }
            
            alert(`✅ Perfil de ${valores.nombre} actualizado con éxito`);
        } else {
            // CREAR NUEVO
            const nuevoUid = `emp_${Date.now()}`;
            const nuevoTecnico = { 
                uid: nuevoUid, 
                ...datosActualizados,
                disponible: true 
            };
            
            await setDoc(doc(db, "especialistas", nuevoUid), nuevoTecnico);
            console.log("✅ Nuevo especialista guardado en Firestore");

            personalVenearci.push(nuevoTecnico);
            alert(`✅ Especialista ${valores.nombre} registrado con éxito`);
        }
        
        limpiarFormularioCEO();
        actualizarSelectorEdicionCEO();
        
    } catch (err) {
        console.error("Error operación especialista:", err);
        alert("Error: " + obtenerMensajeError(err.code));
    }
}

function limpiarFormularioCEO() {
    idEmpleadoEditando = null;

    const campos = ['adm-emp-nombre', 'adm-emp-correo', 'adm-emp-tlf', 'adm-emp-foto', 'adm-select-editar-empleado'];
    campos.forEach(id => {
        const elemento = getElementoSeguro(id);
        if (elemento) elemento.value = "";
    });

    const selRubro = getElementoSeguro('adm-emp-rubro');
    if (selRubro) selRubro.value = "";

    const btnGuardar = getElementoSeguro('btn-adm-add-empleado');
    if (btnGuardar) btnGuardar.innerText = "➕ Dar de Alta Especialista";

    const btnCancelar = getElementoSeguro('btn-adm-cancelar-edicion');
    if (btnCancelar) btnCancelar.classList.add('id-oculto');

    console.log("🗑️ Formulario CEO limpiado");
}

// ═══════════════════════════════════════════════════════════════
// EDITOR DE TARIFAS (ADMIN)
// ═══════════════════════════════════════════════════════════════

function inicializarEditorTarifasCEO() {
    const selectTrabajoCEO = getElementoSeguro('adm-select-tarea-precio');
    const inputCosto = getElementoSeguro('adm-input-precio-tarea');
    const btnActualizar = getElementoSeguro('btn-adm-update-precio');

    if (!selectTrabajoCEO) {
        console.log("⚠️ Editor de tarifas no disponible");
        return;
    }

    // Llenar selector con catálogo
    selectTrabajoCEO.innerHTML = '<option value="">-- Elige el Trabajo a Modificar --</option>';
    Object.keys(catalogoPrecios).forEach(rubro => {
        catalogoPrecios[rubro].forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.labor;
            opt.dataset.rubro = rubro;
            opt.innerText = `[${rubro}] ${t.labor} ($${t.precio})`;
            selectTrabajoCEO.appendChild(opt);
        });
    });

    // Listener para mostrar precio actual
    selectTrabajoCEO.removeEventListener('change', mostrarPrecioActual);
    selectTrabajoCEO.addEventListener('change', mostrarPrecioActual);

    // Listener para actualizar precio
    if (btnActualizar) {
        btnActualizar.removeEventListener('click', actualizarPrecioTarea);
        btnActualizar.addEventListener('click', actualizarPrecioTarea);
    }

    console.log("✅ Editor de tarifas inicializado");
}

function mostrarPrecioActual(e) {
    const laborSel = e.target.value;
    const inputCosto = getElementoSeguro('adm-input-precio-tarea');
    
    if (!inputCosto) return;
    
    if (!laborSel) {
        inputCosto.value = "";
        return;
    }
    
    for (const rubro in catalogoPrecios) {
        const tarea = catalogoPrecios[rubro].find(t => t.labor === laborSel);
        if (tarea) {
            inputCosto.value = tarea.precio;
            break;
        }
    }
}

async function actualizarPrecioTarea(e) {
    e.preventDefault();

    const selectTrabajoCEO = getElementoSeguro('adm-select-tarea-precio');
    const inputCosto = getElementoSeguro('adm-input-precio-tarea');
    
    if (!selectTrabajoCEO || !inputCosto) return;

    const laborSel = selectTrabajoCEO.value;
    const nuevoPrecio = parseFloat(inputCosto.value);

    if (!laborSel || isNaN(nuevoPrecio) || nuevoPrecio <= 0) {
        alert("Por favor, selecciona un trabajo válido e ingresa un costo base positivo.");
        return;
    }

    try {
        // Actualizar en catálogo local
        let encontrado = false;
        for (const rubro in catalogoPrecios) {
            const index = catalogoPrecios[rubro].findIndex(t => t.labor === laborSel);
            if (index !== -1) {
                catalogoPrecios[rubro][index].precio = nuevoPrecio;
                encontrado = true;
                
                // Guardar en Firestore
                await setDoc(doc(db, "configuracion_tarifas", laborSel), {
                    labor: laborSel,
                    precio: nuevoPrecio,
                    rubro: rubro,
                    ultimaActualizacion: new Date().toISOString()
                }, { merge: true });
                
                console.log(`✅ Tarifa "${laborSel}" actualizada a $${nuevoPrecio}`);
                alert(`✅ Tarifa de "${laborSel}" actualizada a $${nuevoPrecio} (con IVA será $${(nuevoPrecio * 1.16).toFixed(2)})`);
                break;
            }
        }

        if (!encontrado) {
            alert("⚠️ Trabajo no encontrado en el catálogo.");
        }
    } catch (error) {
        console.error("Error al actualizar tarifa:", error);
        alert("Error: " + obtenerMensajeError(error.code));
    }
}

console.log("✅ Script de Venearci Services cargado correctamente");
