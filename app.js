const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwFtHAZ8ItzTK7MQdqn-FaVVO6s4s4HTIttZDC0daJgn6TgkJvFBafgNLTG_PcG0HxMbg/exec";

/* =====================
   NAVEGACIÓN
===================== */

function mostrarSeccion(id) {
  document.querySelectorAll("main section").forEach(sec => sec.classList.add("hidden"));
  const destino = document.getElementById(id);
  if (destino) destino.classList.remove("hidden");
  window.scrollTo(0, 0);
}

function guardarToken(token)  { localStorage.setItem("apd_token", token); }
function obtenerToken()       { return localStorage.getItem("apd_token"); }
function borrarToken()        { localStorage.removeItem("apd_token"); }

function actualizarNavSegunSesion() {
  const hayToken = !!obtenerToken();
  document.getElementById("navPublico")?.classList.toggle("hidden", hayToken);
  document.getElementById("navPrivado")?.classList.toggle("hidden", !hayToken);
}

function logout() {
  borrarToken();
  actualizarNavSegunSesion();
  limpiarMensajes();
  mostrarSeccion("inicio");
}

function limpiarMensajes() {
  ["login-msg","registro-msg","preferencias-msg"].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = ""; el.className = "msg"; }
  });
}

function showMsg(id, texto, tipo = "info") {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = texto;
  el.className   = "msg msg-" + tipo;   // msg-info | msg-ok | msg-error
}

/* =====================
   PANEL DE CARGA
===================== */

function mostrarCargandoPanel(activo) {
  const overlay = document.getElementById("panel-loading-overlay");
  if (overlay) overlay.classList.toggle("hidden", !activo);
}

/* =====================
   HTTP
===================== */

async function enviarPost(payload) {
  const res  = await fetch(WEB_APP_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  });
  const text = await res.text();
  try { return JSON.parse(text); }
  catch(e) { console.error("Respuesta no JSON:", text); throw new Error("El backend no devolvió JSON válido"); }
}

/* =====================
   BOTONES LOADING
===================== */

function setButtonLoading(btn, text) {
  if (!btn) return;
  btn.dataset.originalText = btn.textContent;
  btn.disabled    = true;
  btn.textContent = text;
}

function restoreButton(btn) {
  if (!btn) return;
  btn.disabled    = false;
  btn.textContent = btn.dataset.originalText || btn.textContent;
}

/* =====================
   REGISTRO
===================== */

async function registrarDocente(event) {
  event.preventDefault();
  const btnSubmit = event.submitter || document.querySelector("#form-registro button[type='submit']");
  setButtonLoading(btnSubmit, "Registrando...");
  showMsg("registro-msg", "Procesando registro...", "info");

  const payload = {
    action:   "register",
    nombre:   document.getElementById("reg-nombre")?.value.trim()   || "",
    apellido: document.getElementById("reg-apellido")?.value.trim() || "",
    email:    document.getElementById("reg-email")?.value.trim()    || "",
    celular:  document.getElementById("reg-celular")?.value.trim()  || "",
    password: document.getElementById("reg-password")?.value        || ""
  };

  try {
    const data = await enviarPost(payload);
    if (data.ok) {
      showMsg("registro-msg", data.message || "Registro correcto ✓", "ok");
      document.getElementById("form-registro")?.reset();
      setTimeout(() => mostrarSeccion("login"), 900);
    } else {
      showMsg("registro-msg", data.message || "No se pudo registrar", "error");
    }
  } catch(error) {
    console.error(error);
    showMsg("registro-msg", "Error de conexión al registrar", "error");
  } finally {
    restoreButton(btnSubmit);
  }
}

/* =====================
   LOGIN
===================== */

async function loginPassword(event) {
  event.preventDefault();
  const btnSubmit = event.submitter || document.querySelector("#form-login button[type='submit']");
  setButtonLoading(btnSubmit, "Ingresando...");
  showMsg("login-msg", "Verificando credenciales...", "info");

  const payload = {
    action:   "login_password",
    email:    document.getElementById("login-email")?.value.trim() || "",
    password: document.getElementById("login-password")?.value     || ""
  };

  try {
    const data = await enviarPost(payload);
    if (!data.ok || !data.token) {
      showMsg("login-msg", data.message || "Login incorrecto", "error");
      return;
    }
    guardarToken(data.token);
    actualizarNavSegunSesion();
    showMsg("login-msg", "Login correcto ✓", "ok");
    await cargarDashboard();
  } catch(error) {
    console.error(error);
    showMsg("login-msg", "Error de conexión en login", "error");
  } finally {
    restoreButton(btnSubmit);
  }
}

async function handleGoogleLogin(response) {
  showMsg("login-msg", "Validando Google...", "info");
  try {
    const data = await enviarPost({ action: "login_google", credential: response.credential });
    if (!data.ok || !data.token) {
      showMsg("login-msg", data.message || "No se pudo iniciar con Google", "error");
      return;
    }
    guardarToken(data.token);
    actualizarNavSegunSesion();
    await cargarDashboard();
  } catch(error) {
    console.error(error);
    showMsg("login-msg", "Error de conexión con Google", "error");
  }
}

/* =====================
   DASHBOARD
===================== */

async function cargarDashboard() {
  const token = obtenerToken();
  if (!token) { actualizarNavSegunSesion(); mostrarSeccion("inicio"); return; }

  mostrarSeccion("panel-docente");
  mostrarCargandoPanel(true);   // ← mostrar overlay de carga

  try {
    const data = await enviarPost({ action: "dashboard", token });
    if (!data.ok) { alert(data.message || "Sesión inválida"); logout(); return; }
    renderizarDashboard(data);
    limpiarFormularioPreferencias();
    cargarChecksPreferenciasDesdeDashboard(data);
    actualizarNavSegunSesion();
  } catch(error) {
    console.error(error);
    alert("No se pudo cargar el panel docente");
    logout();
  } finally {
    mostrarCargandoPanel(false);  // ← ocultar overlay siempre
  }
}

function renderizarDashboard(data) {
  const docente      = data.docente      || {};
  const preferencias = data.preferencias || {};
  const alertas      = Array.isArray(data.alertas)   ? data.alertas   : [];
  const historial    = Array.isArray(data.historial)  ? data.historial : [];
  const estadisticas = data.estadisticas || {};
  const nombreCompleto = `${docente.nombre||""} ${docente.apellido||""}`.trim();

  setText("panel-bienvenida",  nombreCompleto ? `Bienvenido/a, ${nombreCompleto}` : "Bienvenido/a");
  setText("panel-subtitulo",   docente.email  ? `Sesión iniciada con ${docente.email}` : "Panel docente");

  setInner("panel-datos-docente", `
    <p><strong>ID:</strong> ${esc(docente.id||"-")}</p>
    <p><strong>Nombre:</strong> ${esc(docente.nombre||"-")}</p>
    <p><strong>Apellido:</strong> ${esc(docente.apellido||"-")}</p>
    <p><strong>Email:</strong> ${esc(docente.email||"-")}</p>
    <p><strong>Celular:</strong> ${esc(docente.celular||"-")}</p>
    <p><strong>Estado:</strong> ${docente.activo
      ? '<span class="badge badge-ok">● Activo</span>'
      : '<span class="badge badge-off">● Inactivo</span>'}</p>
  `);

  setInner("panel-preferencias-resumen", `
    <p><strong>Distrito principal:</strong> ${esc(preferencias.distrito_principal||"-")}</p>
    <p><strong>Segundo distrito:</strong>   ${esc(preferencias.segundo_distrito||"-")}</p>
    <p><strong>Tercer distrito:</strong>    ${esc(preferencias.tercer_distrito||"-")}</p>
    <p><strong>Materia / cargo:</strong>    ${esc(preferencias.cargos_csv||preferencias.materias_csv||"-")}</p>
    <p><strong>Nivel / modalidad:</strong>  ${esc(preferencias.nivel_modalidad||"-")}</p>
    <p><strong>Turno:</strong>              ${traducirTurnoPlano(preferencias.turnos_csv||"-")}</p>
    <p><strong>Alertas activas:</strong>    ${preferencias.alertas_activas ? "✓ Sí" : "✗ No"}</p>
    <p><strong>Email:</strong>              ${preferencias.alertas_email    ? "✓ Sí" : "✗ No"}</p>
    <p><strong>WhatsApp:</strong>           ${preferencias.alertas_whatsapp ? "✓ Sí" : "✗ No"}</p>
  `);

  // ALERTAS APD — tarjetas mejoradas
  const panelAlertas = document.getElementById("panel-alertas");
  if (panelAlertas) {
    if (alertas.length > 0) {
      panelAlertas.innerHTML = `
        <p class="alertas-contador"><strong>${alertas.length}</strong> alerta${alertas.length>1?"s":""} compatible${alertas.length>1?"s":""}</p>
        <div class="alertas-grid">
          ${alertas.map(a => `
            <div class="alerta-item">
              <div class="alerta-header">
                <span class="alerta-badge">${esc(a.turno ? traducirTurnoPlano(a.turno) : "")}</span>
                <span class="alerta-nivel">${esc(a.nivel_modalidad||"")}</span>
              </div>
              <h4>${esc(a.titulo||"APD")}</h4>
              <div class="alerta-body">
                <p><span class="label">Cargo/Materia</span> ${esc(a.cargo||a.materia||"-")}</p>
                <p><span class="label">Distrito</span> ${esc(a.distrito||"-")}</p>
                <p><span class="label">Escuela</span> ${esc(a.escuela||"-")}</p>
                ${a.domicilio ? `<p><span class="label">Domicilio</span> ${esc(a.domicilio)}</p>` : ""}
                ${a.jornada   ? `<p><span class="label">Jornada</span> ${esc(a.jornada)}</p>`   : ""}
                ${a.modulos   ? `<p><span class="label">Módulos</span> ${esc(a.modulos)}</p>`   : ""}
              </div>
              <div class="alerta-footer">
                <span class="alerta-cierre">⏱ Cierre: ${formatearFechaCorta(a.fecha_cierre_fmt||"-")}</span>
              </div>
            </div>
          `).join("")}
        </div>`;
    } else {
      panelAlertas.innerHTML = `<div class="empty-state">
        <p>No hay alertas compatibles todavía.</p>
        <p class="empty-hint">Revisá tus preferencias: distrito, materia y turno deben coincidir con los APD publicados.</p>
      </div>`;
    }
  }

  // HISTORIAL
  const panelHistorial = document.getElementById("panel-historial");
  if (panelHistorial) {
    panelHistorial.innerHTML = historial.length > 0
      ? `<ul class="lista-simple">${historial.map(h=>`<li>${esc(String(h))}</li>`).join("")}</ul>`
      : `<p class="empty-state">Sin historial todavía.</p>`;
  }

  // ESTADÍSTICAS
  setInner("panel-estadisticas", `
    <div class="stats-grid">
      <div class="stat-item">
        <span class="stat-num">${estadisticas.total_alertas ?? 0}</span>
        <span class="stat-label">Total alertas</span>
      </div>
      <div class="stat-item">
        <span class="stat-num">${estadisticas.alertas_leidas ?? 0}</span>
        <span class="stat-label">Vistas</span>
      </div>
      <div class="stat-item">
        <span class="stat-num">${estadisticas.alertas_no_leidas ?? 0}</span>
        <span class="stat-label">Sin ver</span>
      </div>
    </div>
    <p class="ultimo-acceso">Último acceso: ${formatearFechaCorta(estadisticas.ultimo_acceso||"-")}</p>
  `);
}

/* =====================
   PREFERENCIAS
===================== */

function limpiarFormularioPreferencias() {
  document.getElementById("form-preferencias")?.reset();
  ["pref-distrito-principal","pref-segundo-distrito","pref-tercer-distrito","pref-cargos","pref-turnos"].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = "";
  });
  document.querySelectorAll('input[name="pref-nivel-modalidad"]').forEach(c => c.checked = false);
  ["sugerencias-distrito-principal","sugerencias-segundo-distrito","sugerencias-tercer-distrito","sugerencias-cargos"].forEach(id => {
    const b = document.getElementById(id); if (b) { b.innerHTML = ""; b.style.display = "none"; }
  });
}

function cargarChecksPreferenciasDesdeDashboard(data) {
  const pref = data.preferencias || {};
  setCheckboxValue("pref-alertas-activas",   !!pref.alertas_activas);
  setCheckboxValue("pref-alertas-email",     !!pref.alertas_email);
  setCheckboxValue("pref-alertas-whatsapp",  !!pref.alertas_whatsapp);
}

function obtenerNivelModalidadSeleccionadoCSV() {
  return Array.from(document.querySelectorAll('input[name="pref-nivel-modalidad"]:checked'))
    .map(el => String(el.value||"").trim().toUpperCase()).filter(Boolean).join(",");
}

async function guardarPreferencias(event) {
  event.preventDefault();
  const token = obtenerToken();
  if (!token) { showMsg("preferencias-msg","Sesión no válida","error"); return; }

  const btnSubmit = event.submitter || document.querySelector("#form-preferencias button[type='submit']");
  setButtonLoading(btnSubmit, "Guardando...");
  showMsg("preferencias-msg", "Guardando preferencias...", "info");

  const segundo = (document.getElementById("pref-segundo-distrito")?.value||"").trim().toUpperCase();
  const tercero = (document.getElementById("pref-tercer-distrito")?.value||"").trim().toUpperCase();
  const materiaCargo = (document.getElementById("pref-cargos")?.value||"").trim().toUpperCase();

  const payload = {
    action: "save_preferences", token,
    distrito_principal: (document.getElementById("pref-distrito-principal")?.value||"").trim().toUpperCase(),
    otros_distritos_c:  normalizarListaCSV([segundo,tercero].filter(Boolean).join(",")),
    materias_csv:       normalizarListaCSV(materiaCargo),
    cargos_csv:         normalizarListaCSV(materiaCargo),
    nivel_modalidad:    normalizarListaCSV(obtenerNivelModalidadSeleccionadoCSV()),
    turnos_csv:         normalizarListaCSV(document.getElementById("pref-turnos")?.value||""),
    alertas_activas:    document.getElementById("pref-alertas-activas")?.checked  || false,
    alertas_email:      document.getElementById("pref-alertas-email")?.checked    || false,
    alertas_whatsapp:   document.getElementById("pref-alertas-whatsapp")?.checked || false
  };

  try {
    const data = await enviarPost(payload);
    if (!data.ok) { showMsg("preferencias-msg", data.message||"No se pudieron guardar", "error"); return; }
    showMsg("preferencias-msg", data.message || "Preferencias guardadas ✓", "ok");
    await cargarDashboard();
  } catch(error) {
    console.error(error);
    showMsg("preferencias-msg", "Error de conexión al guardar", "error");
  } finally {
    restoreButton(btnSubmit);
  }
}

/* =====================
   HELPERS UI
===================== */

function normalizarListaCSV(texto) {
  return String(texto||"").split(",").map(x=>x.trim().toUpperCase()).filter(Boolean).join(",");
}

function esc(texto) {
  return String(texto).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}

function setText(id, texto) { const el=document.getElementById(id); if(el) el.textContent=texto; }
function setInner(id, html) { const el=document.getElementById(id); if(el) el.innerHTML=html; }
function setCheckboxValue(id, val) { const el=document.getElementById(id); if(el) el.checked=!!val; }

function traducirTurnoPlano(valor) {
  const txt = String(valor||"").trim().toUpperCase();
  if (!txt||txt==="-") return "-";
  return txt.split(",").map(v=>{
    if(v==="M") return "Mañana";
    if(v==="T") return "Tarde";
    if(v==="N") return "Noche";
    if(v==="V") return "Vespertino";
    if(v==="ALTERNADO") return "Alternado";
    return v;
  }).join(", ");
}

function formatearFechaCorta(valor) {
  const txt = String(valor||"").trim();
  if (!txt||txt==="-") return "-";
  const d = new Date(txt);
  return !isNaN(d.getTime()) ? d.toLocaleString("es-AR") : esc(txt);
}

/* =====================
   AUTOCOMPLETE
===================== */

function debounce(fn, delay=320) {
  let timer=null;
  return function(...args){ clearTimeout(timer); timer=setTimeout(()=>fn.apply(this,args),delay); };
}

async function buscarSugerencias(tipo, texto) {
  const url = `${WEB_APP_URL}?accion=sugerencias&tipo=${encodeURIComponent(tipo)}&q=${encodeURIComponent(texto)}`;
  const res = await fetch(url);
  return await res.json();
}

function renderizarListaAutocomplete(lista, items, input) {
  if (!items||!items.length) { lista.innerHTML=""; lista.style.display="none"; return; }
  lista.innerHTML = items.map(item=>`<div class="autocomplete-item">${esc(item.label||"")}</div>`).join("");
  lista.style.display = "block";
  lista.querySelectorAll(".autocomplete-item").forEach(el => {
    el.addEventListener("mousedown", function(e){ e.preventDefault(); input.value=this.textContent.trim(); lista.innerHTML=""; lista.style.display="none"; });
  });
}

function activarAutocomplete(inputId, listaId, tipo) {
  const input=document.getElementById(inputId), lista=document.getElementById(listaId);
  if(!input||!lista) return;
  input.addEventListener("input", debounce(async function(){
    const texto=input.value.trim();
    if(texto.length<2){lista.innerHTML="";lista.style.display="none";return;}
    try {
      const data=await buscarSugerencias(tipo,texto);
      if(!data.ok){lista.innerHTML="";lista.style.display="none";return;}
      renderizarListaAutocomplete(lista,data.items||[],input);
    } catch(error){lista.innerHTML="";lista.style.display="none";}
  },320));
  input.addEventListener("blur",  ()=>setTimeout(()=>{lista.style.display="none";},120));
  input.addEventListener("focus", ()=>{ if(input.value.trim().length>=2) input.dispatchEvent(new Event("input")); });
}

/* =====================
   INIT
===================== */

document.addEventListener("DOMContentLoaded", () => {
  // Formularios
  document.getElementById("form-registro")?.addEventListener("submit", registrarDocente);
  document.getElementById("form-login")?.addEventListener("submit", loginPassword);
  document.getElementById("form-preferencias")?.addEventListener("submit", guardarPreferencias);

  // Logout
  document.getElementById("btn-logout")?.addEventListener("click", logout);
  document.getElementById("btnCerrarSesion")?.addEventListener("click", logout);

  // FIX BOTÓN RECARGAR: el problema era que restoreButton se llamaba antes de
  // que cargarDashboard terminara. Ahora está dentro del bloque try/finally.
  const btnRecargar = document.getElementById("btn-recargar-panel");
  if (btnRecargar) {
    btnRecargar.addEventListener("click", async () => {
      setButtonLoading(btnRecargar, "Recargando...");
      try {
        await cargarDashboard();
      } catch(e) {
        console.error("Error en recargar:", e);
      } finally {
        restoreButton(btnRecargar);
      }
    });
  }

  // Navegación pública
  document.getElementById("btnLogin")?.addEventListener("click",   () => mostrarSeccion("login"));
  document.getElementById("btnRegistro")?.addEventListener("click", () => mostrarSeccion("registro"));
  document.getElementById("btnMiPanel")?.addEventListener("click",  () => cargarDashboard());

  // Autocomplete
  activarAutocomplete("pref-distrito-principal", "sugerencias-distrito-principal", "distrito");
  activarAutocomplete("pref-segundo-distrito",   "sugerencias-segundo-distrito",   "distrito");
  activarAutocomplete("pref-tercer-distrito",    "sugerencias-tercer-distrito",    "distrito");
  activarAutocomplete("pref-cargos",             "sugerencias-cargos",             "cargo_area");

  // Estado inicial
  actualizarNavSegunSesion();
  if (obtenerToken()) { cargarDashboard(); } else { mostrarSeccion("inicio"); }
});
