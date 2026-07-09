import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, doc, addDoc, setDoc, getDoc, getDocs, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyC_QVqEUFopf4AtMe4Ov9WvG4hCdX4DKNo",
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

// --- BASE DE DATOS LOCAL DE TRABAJOS ---
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

// --- CONTROL DE INICIALIZACIÓN ---
document.addEventListener("DOMContentLoaded", async () => {
    await cargarEspecialistasDesdeNube();

    setTimeout(() => {
        const splash = document.getElementById('sec-splash');
        if (splash) {
            splash.style.transition = "opacity 0.4s ease";
            splash.style.opacity = "0";
            setTimeout(() => splash.classList.add('id-oculto'), 400);
        }
    }, 2000);

    if (document.getElementById('btn-login-google')) document.getElementById('btn-login-google').addEventListener('click', loginConGoogle);
    if (document.getElementById('toggle-auth-mode')) document.getElementById('toggle-auth-mode').addEventListener('click', alternarModoAutenticacion);
    if (document.getElementById('form-auth-tradicional')) document.getElementById('form-auth-tradicional').addEventListener('submit', procesarAuthTradicional);
    if (document.getElementById('btn-logout')) document.getElementById('btn-logout').addEventListener('click', () => signOut(auth));
    if (document.getElementById('btn-guardar-modal-phone')) document.getElementById('btn-guardar-modal-phone').addEventListener('click', guardarTelefonoModal);
    if (document.getElementById('select-categoria')) document.getElementById('select-categoria').addEventListener('change', cambiarCategoriaRubro);
    if (document.getElementById('select-trabajo')) document.getElementById('select-trabajo').addEventListener('change', cambiarTrabajoEspecifico);
    if (document.getElementById('btn-asignar-aleatorio')) document.getElementById('btn-asignar-aleatorio').addEventListener('click', asignarTecnicoAleatorio);
    if (document.getElementById('btn-cerrar-modal-factura')) document.getElementById('btn-cerrar-modal-factura').addEventListener('click', cerrarModalFactura);
    if (document.getElementById('btn-confirmar-servicio')) document.getElementById('btn-confirmar-servicio').addEventListener('click', despacharOrdenWhatsApp);
    
    if (document.getElementById('btn-adm-add-empleado')) {
        document.getElementById('btn-adm-add-empleado').addEventListener('click', adminRegistrarOGuardarEmpleado);
    }
    if (document.getElementById('btn-adm-cancelar-edicion')) {
        document.getElementById('btn-adm-cancelar-edicion').addEventListener('click', limpiarFormularioCEO);
    }
});

async function cargarEspecialistasDesdeNube() {
    try {
        const querySnapshot = await getDocs(collection(db, "especialistas"));
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const index = personalVenearci.findIndex(p => p.uid === data.uid);
            if (index !== -1) {
                personalVenearci[index] = data; 
            } else {
                personalVenearci.push(data); 
            }
        });
        actualizarSelectorEdicionCEO();
    } catch (error) {
        console.log("Usando base de datos local predefinida: ", error.message);
    }
}

onAuthStateChanged(auth, async (user) => {
    ocultarTodo();
    if (document.getElementById('sec-auth')) document.getElementById('sec-auth').classList.remove('id-oculto');
    
    if (user) {
        usuarioActual = user;
        if (document.getElementById('auth-forms-container')) document.getElementById('auth-forms-container').classList.add('id-oculto');
        if (document.getElementById('user-logged-info')) document.getElementById('user-logged-info').classList.remove('id-oculto');
        if (document.getElementById('user-display-name')) document.getElementById('user-display-name').innerText = user.displayName || user.email;

        if (user.email === ADMIN_EMAIL) {
            if (document.getElementById('user-badge-rol')) document.getElementById('user-badge-rol').innerText = "CEO Admin";
            if (document.getElementById('panel-admin')) document.getElementById('panel-admin').classList.remove('id-oculto');
            inicializarModuloAdmin();
            return;
        }

        const esEmpleado = personalVenearci.find(emp => emp.correo.toLowerCase() === user.email.toLowerCase());
        if (esEmpleado) {
            if (document.getElementById('user-badge-rol')) document.getElementById('user-badge-rol').innerText = "Especialista";
            if (document.getElementById('panel-empleado')) document.getElementById('panel-empleado').classList.remove('id-oculto');
            if (document.getElementById('emp-panel-foto')) document.getElementById('emp-panel-foto').src = esEmpleado.foto;
            if (document.getElementById('emp-panel-nombre')) document.getElementById('emp-panel-nombre').innerText = esEmpleado.nombre;
            return;
        }

        if (document.getElementById('user-badge-rol')) document.getElementById('user-badge-rol').innerText = "Cliente";
        try {
            const userDoc = await getDoc(doc(db, "usuarios", user.uid));
            if (userDoc.exists() && userDoc.data().telefono) {
                telefonoUsuario = userDoc.data().telefono;
                if (document.getElementById('sec-servicio')) document.getElementById('sec-servicio').classList.remove('id-oculto');
            } else {
                if (document.getElementById('modal-completar-perfil')) document.getElementById('modal-completar-perfil').classList.remove('id-oculto');
            }
        } catch(e) {
            if (document.getElementById('sec-servicio')) document.getElementById('sec-servicio').classList.remove('id-oculto');
        }
    } else {
        usuarioActual = null;
        if (document.getElementById('auth-forms-container')) document.getElementById('auth-forms-container').classList.remove('id-oculto');
        if (document.getElementById('user-logged-info')) document.getElementById('user-logged-info').classList.add('id-oculto');
    }
});
// --- LÓGICA DE NEGOCIO ---
async function loginConGoogle() {
    try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch (e) { alert("Error: " + e.message); }
}

function alternarModoAutenticacion() {
    isRegisterMode = !isRegisterMode;
    document.getElementById('auth-title').innerText = isRegisterMode ? "Registrar Cuenta" : "Iniciar Sesión";
    if (document.getElementById('group-nombre')) document.getElementById('group-nombre').classList.toggle('id-oculto', !isRegisterMode);
    if (document.getElementById('group-telefono')) document.getElementById('group-telefono').classList.toggle('id-oculto', !isRegisterMode);
}

async function procesarAuthTradicional(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert("Por favor ingresar un correo válido.");
        return;
    }

    try {
        if (isRegisterMode) {
            const nombre = document.getElementById('auth-nombre').value;
            const tlf = document.getElementById('auth-telefono').value.replace(/\D/g, '');
            const creds = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(creds.user, { displayName: nombre });
            await setDoc(doc(db, "usuarios", creds.user.uid), { nombre, email, telefono: tlf });
            telefonoUsuario = tlf;
        } else {
            await signInWithEmailAndPassword(auth, email, password);
        }
    } catch(err) { alert(err.message); }
}

async function guardarTelefonoModal() {
    const tlf = document.getElementById('modal-telefono').value.replace(/\D/g, '');
    if (tlf.length < 8) return;
    telefonoUsuario = tlf;
    if (auth.currentUser) await setDoc(doc(db, "usuarios", auth.currentUser.uid), { telefono: tlf }, { merge: true });
    if (document.getElementById('modal-completar-perfil')) document.getElementById('modal-completar-perfil').classList.add('id-oculto');
    if (document.getElementById('sec-servicio')) document.getElementById('sec-servicio').classList.remove('id-oculto');
}

function cambiarCategoriaRubro(e) {
    const rubro = e.target.value;
    const select = document.getElementById('select-trabajo');
    select.innerHTML = '<option value="">-- Elige la Tarea --</option>';
    if (!rubro) return;
    catalogoPrecios[rubro].forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.labor; opt.dataset.precio = t.precio; opt.dataset.materialKey = t.keyMaterial;
        opt.innerText = `${t.labor} ($${t.precio})`;
        select.appendChild(opt);
    });
    if (document.getElementById('area-trabajos-especificos')) document.getElementById('area-trabajos-especificos').classList.remove('id-oculto');
}

function cambiarTrabajoEspecifico(e) {
    const opcion = e.target.options[e.target.selectedIndex];
    if (!opcion.value) return;
    const rubro = document.getElementById('select-categoria').value;
    renderizarEmpleados(rubro);
    abrirYCalcularPresupuesto();
}

function renderizarEmpleados(rubro) {
    const lista = document.getElementById('lista-empleados');
    if (!lista) return;
    lista.innerHTML = "";
    const filtered = personalVenearci.filter(p => p.rubro === rubro);
    
    if (filtered.length > 0) {
        empleadoSeleccionado = filtered[0]; 
        filtered.forEach((emp, index) => {
            const div = document.createElement('div');
            div.className = `tarjeta-empleado-card ${index === 0 ? 'seleccionado' : ''}`;
            div.style.cursor = "pointer";
            div.innerHTML = `
                <div class="emp-card-flex" style="display: flex; align-items: center; gap: 12px; padding: 8px;">
                    <img src="${emp.foto}" alt="${emp.nombre}" class="emp-foto-th" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;" onerror="this.src='https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150'">
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
        if (document.getElementById('area-empleados')) document.getElementById('area-empleados').classList.remove('id-oculto');
    }
}

function asignarTecnicoAleatorio() { 
    const rubro = document.getElementById('select-categoria').value;
    const disponibles = personalVenearci.filter(e => e.rubro === rubro);
    if (disponibles.length === 0) return;
    empleadoSeleccionado = disponibles[Math.floor(Math.random() * disponibles.length)];
    renderizarEmpleados(rubro);
    abrirYCalcularPresupuesto();
}

// --- PRESUPUESTOS ---
function abrirYCalcularPresupuesto() {
    const select = document.getElementById('select-trabajo');
    const opt = select.options[select.selectedIndex];
    if (!opt || !opt.value || !empleadoSeleccionado) return;

    cotizacionFinal = { tarea: opt.value, total: (parseFloat(opt.dataset.precio)*1.16).toFixed(2) };
    
    const ahora = new Date();
    const fechaHoraExacta = ahora.toLocaleDateString() + " - " + ahora.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'});

    if (document.getElementById('pre-cliente')) document.getElementById('pre-cliente').innerText = usuarioActual ? (usuarioActual.displayName || usuarioActual.email) : "Cliente";
    if (document.getElementById('pre-empleado')) document.getElementById('pre-empleado').innerText = empleadoSeleccionado.nombre;
    if (document.getElementById('pre-tarea')) document.getElementById('pre-tarea').innerText = opt.value;
    if (document.getElementById('pre-total')) document.getElementById('pre-total').innerText = cotizacionFinal.total;
    if (document.getElementById('pre-fecha')) document.getElementById('pre-fecha').innerText = fechaHoraExacta;

    if (document.getElementById('modal-factura-flotante')) document.getElementById('modal-factura-flotante').classList.remove('id-oculto');
}

function cerrarModalFactura() { if (document.getElementById('modal-factura-flotante')) document.getElementById('modal-factura-flotante').classList.add('id-oculto'); }

async function despacharOrdenWhatsApp() {
    const ahora = new Date();
    const timestampString = ahora.toLocaleDateString() + " " + ahora.toLocaleTimeString();
    try {
        if (usuarioActual) {
            await addDoc(collection(db, "ordenes"), {
                cliente: usuarioActual.email,
                especialista: empleadoSeleccionado.nombre,
                tarea: cotizacionFinal.tarea,
                total: cotizacionFinal.total,
                fecha: ahora.toISOString()
            });
        }
    } catch (error) { console.error("Aviso Firestore: ", error.message); }
    
    const msg = `*ORDEN VENEARCI*\n• Fecha/Hora: ${timestampString}\n• Especialista: ${empleadoSeleccionado.nombre}\n• Tarea: ${cotizacionFinal.tarea}\n• Total con IVA: $${cotizacionFinal.total}`;
    window.open(`https://wa.me/${WHATSAPP_VENEARCI_APP}?text=${encodeURIComponent(msg)}`, '_blank');
}

// --- MÓDULO ADMINISTRADOR (CEO) ---
function inicializarModuloAdmin() {
    console.log("Módulo CEO de Venearci Iniciado.");
    actualizarSelectorEdicionCEO();
}

function actualizarSelectorEdicionCEO() {
    const selectEdicion = document.getElementById('adm-select-editar-empleado');
    if (!selectEdicion) return;
    
    selectEdicion.innerHTML = '<option value="">-- Seleccionar Especialista para Editar --</option>';
    personalVenearci.forEach(emp => {
        const opt = document.createElement('option');
        opt.value = emp.uid;
        opt.innerText = `${emp.nombre} (${emp.rubro})`;
        selectEdicion.appendChild(opt);
    });
    
    selectEdicion.replaceWith(selectEdicion.cloneNode(true)); 
    document.getElementById('adm-select-editar-empleado').addEventListener('change', cargarDatosEmpleadoEnFormulario);
}

function cargarDatosEmpleadoEnFormulario(e) {
    const uid = e.target.value;
    if (!uid) { limpiarFormularioCEO(); return; }
    
    const emp = personalVenearci.find(p => p.uid === uid);
    if (!emp) return;
    
    idEmpleadoEditando = emp.uid;
    
    document.getElementById('adm-emp-nombre').value = emp.nombre;
    document.getElementById('adm-emp-correo').value = emp.correo;
    document.getElementById('adm-emp-rubro').value = emp.rubro;
    
    const inputTlf = document.getElementById('adm-emp-tlf');
    if (inputTlf) inputTlf.value = emp.tlf;
    
    if (document.getElementById('adm-emp-foto')) {
        document.getElementById('adm-emp-foto').value = emp.foto;
    }
    
    if (document.getElementById('btn-adm-add-empleado')) document.getElementById('btn-adm-add-empleado').innerText = "Guardar Cambios Actualizados";
    if (document.getElementById('btn-adm-cancelar-edicion')) {
        document.getElementById('btn-adm-cancelar-edicion').classList.remove('id-oculto');
    }
}

async function adminRegistrarOGuardarEmpleado() {
    const txtNombre = document.getElementById('adm-emp-nombre'); 
    const txtCorreo = document.getElementById('adm-emp-correo');
    const selRubro = document.getElementById('adm-emp-rubro');
    const txtWhatsapp = document.getElementById('adm-emp-tlf');
    const txtFoto = document.getElementById('adm-emp-foto'); 

    if (!txtNombre || !txtCorreo || !txtWhatsapp) return;

    const nombre = txtNombre.value.trim();
    const correo = txtCorreo.value.trim();
    const rubro = selRubro.value;
    const whatsapp = txtWhatsapp.value.trim().replace(/\D/g, '');
    let fotoUrl = txtFoto && txtFoto.value.trim() !== "" ? txtFoto.value.trim() : "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150";

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correo)) {
        alert("Por favor ingresar un correo válido.");
        return;
    }

    if (!nombre || !whatsapp) {
        alert("Por favor, completa todos los campos obligatorios.");
        return;
    }

    try {
        if (idEmpleadoEditando) {
            const docRef = doc(db, "especialistas", idEmpleadoEditando);
            const datosActualizados = { nombre, correo, rubro, tlf: whatsapp, foto: fotoUrl };
            
            await setDoc(docRef, datosActualizados, { merge: true });
            
            const index = personalVenearci.findIndex(p => p.uid === idEmpleadoEditando);
            if (index !== -1) personalVenearci[index] = { ...personalVenearci[index], ...datosActualizados };
            
            alert(`¡Perfil de ${nombre} guardado y sincronizado con éxito!`);
        } else {
            const nuevoUid = `emp_${Date.now()}`;
            const nuevoTecnico = { uid: nuevoUid, correo, nombre, rubro, tlf: whatsapp, foto: fotoUrl, disponible: true };
            
            await setDoc(doc(db, "especialistas", nuevoUid), nuevoTecnico);
            personalVenearci.push(nuevoTecnico);
            alert(`¡Especialista ${nombre} dado de alta con éxito!`);
        }
        
        limpiarFormularioCEO();
        await cargarEspecialistasDesdeNube();
        
    } catch (err) {
        alert("Error en la operación: " + err.message);
    }
}

function limpiarFormularioCEO() {
    idEmpleadoEditando = null;
    if (document.getElementById('adm-emp-nombre')) document.getElementById('adm-emp-nombre').value = "";
    if (document.getElementById('adm-emp-correo')) document.getElementById('adm-emp-correo').value = "";
    if (document.getElementById('adm-emp-tlf')) document.getElementById('adm-emp-tlf').value = "";
    if (document.getElementById('adm-emp-foto')) document.getElementById('adm-emp-foto').value = "";
    if (document.getElementById('adm-select-editar-empleado')) document.getElementById('adm-select-editar-empleado').value = "";
    
    if (document.getElementById('btn-adm-add-empleado')) document.getElementById('btn-adm-add-empleado').innerText = "Dar de Alta Especialista";
    if (document.getElementById('btn-adm-cancelar-edicion')) document.getElementById('btn-adm-cancelar-edicion').classList.add('id-oculto');
}

function ocultarTodo() {
    if (document.getElementById('panel-admin')) document.getElementById('panel-admin').classList.add('id-oculto');
    if (document.getElementById('panel-empleado')) document.getElementById('panel-empleado').classList.add('id-oculto');
    if (document.getElementById('sec-servicio')) document.getElementById('sec-servicio').classList.add('id-oculto');
}

// --- PARCHE EXACTO PARA EL EDITOR DE TARIFAS VENEARCI ---

function inicializarEditorTarifasCEO() {
    // Localizamos los elementos usando los IDs exactos de tu HTML
    const selectTrabajoCEO = document.getElementById('adm-select-tarea-precio');
    const inputCosto = document.getElementById('adm-input-precio-tarea');
    const btnActualizar = document.getElementById('btn-adm-update-precio');

    // Si no encuentra el selector (por ejemplo, si no es el admin), detiene la función
    if (!selectTrabajoCEO) return;

    // 1. Rellenar el selector dinámicamente con el catálogo local
    selectTrabajoCEO.innerHTML = '<option value="">-- Elige el Trabajo a Modificar --</option>';
    Object.keys(catalogoPrecios).forEach(rubro => {
        catalogoPrecios[rubro].forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.labor;
            opt.innerText = `[${rubro}] ${t.labor} ($${t.precio})`;
            selectTrabajoCEO.appendChild(opt);
        });
    });

    // 2. Escuchar cuando el administrador selecciona un trabajo para mostrar el precio actual
    selectTrabajoCEO.addEventListener('change', (e) => {
        const laborSel = e.target.value;
        if (!laborSel) {
            if (inputCosto) inputCosto.value = "";
            return;
        }
        
        for (const rubro in catalogoPrecios) {
            const tarea = catalogoPrecios[rubro].find(t => t.labor === laborSel);
            if (tarea && inputCosto) {
                inputCosto.value = tarea.precio;
                break;
            }
        }
    });

    // 3. Escuchar el clic del botón para guardar el nuevo precio
    if (btnActualizar) {
        // Limpiamos listeners previos duplicados clonando el botón
        const nuevoBtn = btnActualizar.cloneNode(true);
        btnActualizar.replaceWith(nuevoBtn);
        
        nuevoBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const laborSel = selectTrabajoCEO.value;
            const nuevoPrecio = parseFloat(inputCosto.value);

            if (!laborSel || isNaN(nuevoPrecio) || nuevoPrecio <= 0) {
                alert("Por favor, selecciona un trabajo válido e ingresa un costo base.");
                return;
            }

            // Buscar y actualizar en el catálogo local de memoria
            let encontrado = false;
            for (const rubro in catalogoPrecios) {
                const index = catalogoPrecios[rubro].findIndex(t => t.labor === laborSel);
                if (index !== -1) {
                    catalogoPrecios[rubro][index].precio = nuevoPrecio;
                    encontrado = true;
                    
                    // Sincronizar de inmediato con Firebase Firestore en la nube
                    try {
                        await setDoc(doc(db, "configuracion_tarifas", laborSel), {
                            labor: laborSel,
                            precio: nuevoPrecio,
                            rubro: rubro,
                            ultimaActualizacion: new Date().toISOString()
                        }, { merge: true });
                        
                        alert(`¡Tarifa de "${laborSel}" actualizada con éxito a $${nuevoPrecio}!`);
                    } catch (error) {
                        console.error("Error al subir a Firestore:", error);
                        alert(`Se cambió localmente a $${nuevoPrecio}, pero hubo un problema de red al guardarlo en la nube.`);
                    }
                    break;
                }
            }
        });
    }
}

// Interceptamos la inicialización del administrador para arrancar este módulo automáticamente
const originalInicializarModuloAdmin = inicializarModuloAdmin;
inicializarModuloAdmin = function() {
    originalInicializarModuloAdmin();
    inicializarEditorTarifasCEO();
};

// --- PARCHE DE AUTENTICACIÓN, REGISTRO Y RECUPERACIÓN VENEARCI ---
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

function inicializarManejadorAutenticacionFina() {
    const linkToggle = document.getElementById('toggle-auth-mode');
    const linkOlvide = document.getElementById('btn-olvide-contrasena');
    const txtEmail = document.getElementById('auth-email');

    // 1. Corrección del interruptor para cambiar entre "Iniciar Sesión" y "Registrarse"
    if (linkToggle) {
        linkToggle.addEventListener('click', (e) => {
            e.preventDefault();
            isRegisterMode = !isRegisterMode;

            const titulo = document.getElementById('auth-title');
            const subtitulo = document.getElementById('auth-subtitle');
            const btnSubmit = document.getElementById('btn-auth-submit');
            const promptText = document.getElementById('text-toggle-prompt');
            
            const groupNombre = document.getElementById('group-nombre');
            const groupTelefono = document.getElementById('group-telefono');

            if (isRegisterMode) {
                if (titulo) titulo.innerText = "Registrar Cuenta";
                if (subtitulo) subtitulo.innerText = "Crea tu perfil en Venearci Services para solicitar asistencia";
                if (btnSubmit) btnSubmit.innerText = "Crear Cuenta Nueva";
                if (promptText) promptText.innerText = "¿Ya posees una cuenta?";
                if (linkToggle) linkToggle.innerText = "Inicia sesión aquí";
                
                if (groupNombre) groupNombre.classList.remove('id-oculto');
                if (groupTelefono) groupTelefono.classList.remove('id-oculto');
                if (linkOlvide) linkOlvide.style.display = "none"; // Ocultar recuperación al registrarse
            } else {
                if (titulo) titulo.innerText = "Iniciar Sesión";
                if (subtitulo) subtitulo.innerText = "Accede de forma rápida para gestionar tus servicios";
                if (btnSubmit) btnSubmit.innerText = "Ingresar al Sistema";
                if (promptText) promptText.innerText = "¿No tienes una cuenta aún?";
                if (linkToggle) linkToggle.innerText = "Regístrate aquí";
                
                if (groupNombre) groupNombre.classList.add('id-oculto');
                if (groupTelefono) groupTelefono.classList.add('id-oculto');
                if (linkOlvide) linkOlvide.style.display = "block"; // Mostrar recuperación en login
            }
        });
    }

    // 2. Lógica nativa de Firebase para recuperar contraseña por correo electrónico
    if (linkOlvide) {
        linkOlvide.addEventListener('click', async (e) => {
            e.preventDefault();
            const emailUsuario = txtEmail ? txtEmail.value.trim() : "";

            if (!emailUsuario) {
                alert("Por favor, introduce primero tu Correo Electrónico en el campo del formulario para poder enviarte el enlace de restablecimiento.");
                if (txtEmail) txtEmail.focus();
                return;
            }

            try {
                await sendPasswordResetEmail(auth, emailUsuario);
                alert(`¡Enlace enviado! Hemos remitido un mensaje a ${emailUsuario} para que restablezcas tu contraseña de acceso de forma segura.`);
            } catch (error) {
                console.error("Error al restablecer:", error.message);
                if (error.code === "auth/user-not-found") {
                    alert("El correo electrónico ingresado no se encuentra registrado en el sistema de Venearci.");
                } else if (error.code === "auth/invalid-email") {
                    alert("La dirección de correo electrónico no tiene un formato válido.");
                } else {
                    alert("Ocurrió un error al procesar la solicitud: " + error.message);
                }
            }
        });
    }
}

// Aseguramos su ejecución inyectándola directamente en el flujo de arranque del documento
document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
        inicializarManejadorAutenticacionFina();
    }, 500);
});
