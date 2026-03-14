'use strict';

/* ══════════════════════════════════════════
   APDocentePBA — app.js v10
══════════════════════════════════════════ */

const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwFtHAZ8ItzTK7MQdqn-FaVVO6s4s4HTIttZDC0daJgn6TgkJvFBafgNLTG_PcG0HxMbg/exec";

/* ══════════════════════════════════════════
   NAVEGACIÓN
══════════════════════════════════════════ */

function mostrarSeccion(id) {
  document.querySelectorAll("main section").forEach(s => s.classList.add("hidden"));
  const dest = document.getElementById(id);
  if (dest) dest.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ══════════════════════════════════════════
   TOKEN
══════════════════════════════════════════ */

const TOKEN_KEY = "apd_token_v2";
const guardarToken  = t  => localStorage.setItem(TOKEN_KEY, t);
const obtenerToken  = () => localStorage.getItem(TOKEN_KEY);
const borrarToken   = () => localStorage.removeItem(TOKEN_KEY);

/* ══════════════════════════════════════════
   NAV
══════════════════════════════════════════ */

function actualizarNav() {
  const ok = !!obtenerToken();
  document.getElementById("navPublico")?.classList.toggle("hidden",  ok);
  document.getElementById("navPrivado")?.classList.toggle("hidden", !ok);
}

function logout() {
  borrarToken();
  actualizarNav();
  limpiarMsgs();
  mostrarSeccion("inicio");
}

function limpiarMsgs() {
  ["login-msg","registro-msg","preferencias-msg"].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = ""; el.className = "msg"; }
  });
}

/* ══════════════════════════════════════════
   MENSAJES
══════════════════════════════════════════ */

function showMsg(id, texto, tipo = "info") {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = texto;
  el.className   = `msg msg-${tipo}`;
}

/* ══════════════════════════════════════════
   BOTONES CON ESTADO
══════════════════════════════════════════ */

function btnLoad(btn, txt) {
  if (!btn) return;
  btn.dataset.orig = btn.textContent;
  btn.disabled     = true;
  btn.textContent  = txt;
}

function btnRestore(btn) {
  if (!btn) return;
  btn.disabled    = false;
  btn.textContent = btn.dataset.orig || btn.textContent;
}

/* ══════════════════════════════════════════
   HTTP POST
══════════════════════════════════════════ */

async function post(payload) {
  const res  = await fetch(WEB_APP_URL, {
    method:  "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body:    JSON.stringify(payload)
  });
  const text = await res.text();
  try { return JSON.parse(text); }
  catch(e) {
    console.error("Respuesta no JSON:", text);
    throw new Error("El backend no devolvió JSON válido");
  }
}

/* ══════════════════════════════════════════
   CARGA DEL PANEL
══════════════════════════════════════════ */

function setPanelLoading(activo) {
  document.getElementById("panel-loading")?.classList.toggle("hidden", !activo);
  document.getElementById("panel-content")?.classList.toggle("hidden",  activo);
}

/* ══════════════════════════════════════════
   REGISTRO
══════════════════════════════════════════ */

async function registrarDocente(e) {
  e.preventDefault();
  const btn = e.submitter || document.querySelector("#form-registro button[type='submit']");
  btnLoad(btn, "Registrando...");
  showMsg("registro-msg", "Procesando...", "info");

  try {
    const data = await post({
      action:   "register",
      nombre:   val("reg-nombre"),
      apellido: val("reg-apellido"),
      email:    val("reg-email"),
      celular:  val("reg-celular"),
      password: val("reg-password")
    });

    if (data.ok) {
      showMsg("registro-msg", data.message || "✓ Registro exitoso", "ok");
      document.getElementById("form-registro")?.reset();
      setTimeout(() => mostrarSeccion("login"), 1200);
    } else {
      showMsg("registro-msg", data.message || "No se pudo registrar", "error");
    }
  } catch(err) {
    console.error(err);
    showMsg("registro-msg", "Error de conexión. Intentá de nuevo.", "error");
  } finally {
    btnRestore(btn);
  }
}

/* ══════════════════════════════════════════
   LOGIN
══════════════════════════════════════════ */

async function loginPassword(e) {
  e.preventDefault();
  const btn = e.submitter || document.querySelector("#form-login button[type='submit']");
  btnLoad(btn, "Ingresando...");
  showMsg("login-msg", "Verificando credenciales...", "info");

  try {
    const data = await post({
      action:   "login_password",
      email:    val("login-email"),
      password: val("login-password")
    });

    if (!data.ok || !data.token) {
      showMsg("login-msg", data.message || "Login incorrecto", "error");
      return;
    }

    guardarToken(data.token);
    actualizarNav();
    showMsg("login-msg", "✓ Ingresando...", "ok");
    await cargarDashboard();
  } catch(err) {
    console.error(err);
    showMsg("login-msg", "Error de conexión. Intentá de nuevo.", "error");
  } finally {
    btnRestore(btn);
  }
}

/* ══════════════════════════════════════════
   GOOGLE LOGIN
══════════════════════════════════════════ */

async function handleGoogleLogin(response) {
  showMsg("login-msg", "Validando con Google...", "info");
  try {
    const data = await post({ action: "login_google", credential: response.credential });
    if (!data.ok || !data.token) {
      showMsg("login-msg", data.message || "No se pudo iniciar con Google", "error");
      return;
    }
    guardarToken(data.token);
    actualizarNav();
    await cargarDashboard();
  } catch(err) {
    console.error(err);
    showMsg("login-msg", "Error de conexión con Google", "error");
  }
}

/* ══════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════ */

async function cargarDashboard() {
  const token = obtenerToken();
  if (!token) { actualizarNav(); mostrarSeccion("inicio"); return; }

  mostrarSeccion("panel-docente");
  setPanelLoading(true);

  try {
    const data = await post({ action: "dashboard", token });

    if (!data.ok) {
      alert(data.message || "Sesión inválida. Volvé a ingresar.");
      logout();
      return;
    }

    renderDashboard(data);
    limpiarFormPrefs();
    cargarChecksDesdeData(data);
    actualizarNav();
  } catch(err) {
    console.error(err);
    alert("No se pudo cargar el panel. Revisá tu conexión.");
    logout();
  } finally {
    setPanelLoading(false);
  }
}

/* ══════════════════════════════════════════
   RENDER DASHBOARD
══════════════════════════════════════════ */

function renderDashboard(data) {
  const doc   = data.docente      || {};
  const pref  = data.preferencias || {};
  const alts  = Array.isArray(data.alertas)  ? data.alertas  : [];
  const hist  = Array.isArray(data.historial) ? data.historial : [];
  const stats = data.estadisticas || {};

  const nombre = `${doc.nombre||""} ${doc.apellido||""}`.trim();

  setText("panel-bienvenida", nombre ? `Bienvenido/a, ${nombre}` : "Bienvenido/a");
  setText("panel-subtitulo",  doc.email ? `Sesión: ${doc.email}` : "Panel docente");

  // Datos docente
  setHTML("panel-datos-docente", `
    <p><strong>ID:</strong> ${esc(doc.id||"-")}</p>
    <p><strong>Nombre:</strong> ${esc(nombre||"-")}</p>
    <p><strong>Email:</strong> ${esc(doc.email||"-")}</p>
    <p><strong>Celular:</strong> ${esc(doc.celular||"-")}</p>
    <p><strong>Estado:</strong> ${doc.activo
      ? '<span class="badge-ok">● Activo</span>'
      : '<span class="badge-off">● Inactivo</span>'}</p>
  `);

  // Preferencias resumen
  setHTML("panel-preferencias-resumen", `
    <p><strong>Distrito:</strong> ${esc(pref.distrito_principal||"-")}</p>
    ${pref.segundo_distrito ? `<p><strong>2°:</strong> ${esc(pref.segundo_distrito)}</p>` : ""}
    ${pref.tercer_distrito  ? `<p><strong>3°:</strong> ${esc(pref.tercer_distrito)}</p>`  : ""}
    <p><strong>Materia/Cargo:</strong> ${esc(pref.cargos_csv||pref.materias_csv||"-")}</p>
    <p><strong>Nivel:</strong> ${esc(pref.nivel_modalidad||"-")}</p>
    <p><strong>Turno:</strong> ${turnoTexto(pref.turnos_csv||"-")}</p>
    <p><strong>Alertas:</strong> ${pref.alertas_activas ? "🔔 Activas" : "⏸ Pausadas"}</p>
    <p><strong>Email:</strong> ${pref.alertas_email ? "✓" : "✗"} &nbsp; <strong>WhatsApp:</strong> ${pref.alertas_whatsapp ? "✓" : "✗"}</p>
  `);

  // Estadísticas
  setHTML("panel-estadisticas", `
    <div class="stats-row">
      <div class="stat-box"><span class="stat-n">${stats.total_alertas??0}</span><span class="stat-l">Alertas</span></div>
      <div class="stat-box"><span class="stat-n">${stats.alertas_leidas??0}</span><span class="stat-l">Vistas</span></div>
      <div class="stat-box"><span class="stat-n">${stats.alertas_no_leidas??0}</span><span class="stat-l">Sin ver</span></div>
    </div>
    <p class="stat-acceso">Último acceso: ${fmtFecha(stats.ultimo_acceso||"-")}</p>
  `);

  // Badge de alertas
  const badge = document.getElementById("alertas-badge");
  if (badge) {
    badge.textContent = String(alts.length);
    badge.classList.toggle("hidden", alts.length === 0);
  }

  // Alertas APD
  const panelAlts = document.getElementById("panel-alertas");
  if (panelAlts) {
    if (alts.length > 0) {
      panelAlts.innerHTML = `
        <p class="alertas-count">${alts.length} oferta${alts.length>1?"s":""} compatible${alts.length>1?"s":""} con tus preferencias</p>
        <div class="alertas-grid">
          ${alts.map(a => renderAlertaCard(a)).join("")}
        </div>`;
    } else {
      panelAlts.innerHTML = `
        <div class="empty-state">
          <p>No hay alertas compatibles todavía.</p>
          <p class="empty-hint">Asegurate de tener configurado tu distrito, materia, nivel y turno en las preferencias de abajo.</p>
        </div>`;
    }
  }

  // Historial
  const panelHist = document.getElementById("panel-historial");
  if (panelHist) {
    if (hist.length > 0) {
      panelHist.innerHTML = `<ul class="hist-list">${hist.map(h=>`<li>${esc(String(h))}</li>`).join("")}</ul>`;
    } else {
      panelHist.innerHTML = `<p class="empty-hint">Sin historial todavía.</p>`;
    }
  }
}

function renderAlertaCard(a) {
  const turno = a.turno ? turnoTexto(a.turno) : "";
  return `
    <div class="alerta-card">
      <div class="alerta-tags">
        ${turno  ? `<span class="tag tag-turno">${esc(turno)}</span>` : ""}
        ${a.nivel_modalidad ? `<span class="tag tag-nivel">${esc(a.nivel_modalidad)}</span>` : ""}
        <span class="tag tag-estado">Publicada</span>
      </div>
      <div class="alerta-titulo">${esc(a.titulo||"APD")}</div>
      <div class="alerta-info">
        ${arow("Cargo/Mat.",  a.cargo && a.materia && a.cargo!==a.materia ? a.cargo+" — "+a.materia : (a.cargo||a.materia))}
        ${arow("Distrito",   a.distrito)}
        ${arow("Escuela",    a.escuela)}
        ${a.domicilio    ? arow("Domicilio",  a.domicilio)    : ""}
        ${a.jornada      ? arow("Jornada",    a.jornada)      : ""}
        ${a.modulos      ? arow("Módulos",    a.modulos)      : ""}
        ${a.curso_division ? arow("Curso",    a.curso_division) : ""}
      </div>
      ${a.fecha_cierre_fmt ? `<div class="alerta-cierre">⏱ Cierre: ${esc(fmtFecha(a.fecha_cierre_fmt))}</div>` : ""}
    </div>`;
}

function arow(key, val) {
  if (!val) return "";
  return `<div class="alerta-row"><span class="alerta-key">${esc(key)}</span><span class="alerta-val">${esc(String(val))}</span></div>`;
}

/* ══════════════════════════════════════════
   PREFERENCIAS
══════════════════════════════════════════ */

function limpiarFormPrefs() {
  document.getElementById("form-preferencias")?.reset();
  ["pref-distrito-principal","pref-segundo-distrito","pref-tercer-distrito","pref-cargos"].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = "";
  });
  document.querySelectorAll('input[name="pref-nivel-modalidad"]').forEach(c => c.checked = false);
  document.querySelectorAll(".ac-list").forEach(l => { l.innerHTML=""; l.style.display="none"; });
}

function cargarChecksDesdeData(data) {
  const p = data.preferencias || {};
  setCheck("pref-alertas-activas",  !!p.alertas_activas);
  setCheck("pref-alertas-email",    !!p.alertas_email);
  setCheck("pref-alertas-whatsapp", !!p.alertas_whatsapp);

  // Cargar valores de texto en los campos
  if (p.distrito_principal) setVal("pref-distrito-principal", p.distrito_principal);
  if (p.segundo_distrito)   setVal("pref-segundo-distrito",   p.segundo_distrito);
  if (p.tercer_distrito)    setVal("pref-tercer-distrito",    p.tercer_distrito);
  if (p.cargos_csv)         setVal("pref-cargos",             p.cargos_csv);
  if (p.turnos_csv)         setVal("pref-turnos",             p.turnos_csv);

  // Cargar checkboxes de nivel/modalidad
  if (p.nivel_modalidad) {
    const niveles = p.nivel_modalidad.split(",").map(s=>s.trim().toUpperCase());
    document.querySelectorAll('input[name="pref-nivel-modalidad"]').forEach(cb => {
      cb.checked = niveles.includes(cb.value.toUpperCase());
    });
  }
}

function getNivelSeleccionadoCSV() {
  return Array.from(document.querySelectorAll('input[name="pref-nivel-modalidad"]:checked'))
    .map(el => el.value.trim().toUpperCase()).filter(Boolean).join(",");
}

async function guardarPreferencias(e) {
  e.preventDefault();
  const token = obtenerToken();
  if (!token) { showMsg("preferencias-msg","Sesión no válida","error"); return; }

  const btn = e.submitter || document.querySelector("#form-preferencias button[type='submit']");
  btnLoad(btn, "Guardando...");
  showMsg("preferencias-msg", "Guardando preferencias...", "info");

  const segundo = val("pref-segundo-distrito").toUpperCase();
  const tercero = val("pref-tercer-distrito").toUpperCase();
  const cargo   = val("pref-cargos").toUpperCase();

  try {
    const data = await post({
      action:            "save_preferences",
      token,
      distrito_principal: val("pref-distrito-principal").toUpperCase(),
      otros_distritos_c:  normCSV([segundo, tercero].filter(Boolean).join(",")),
      materias_csv:       normCSV(cargo),
      cargos_csv:         normCSV(cargo),
      nivel_modalidad:    normCSV(getNivelSeleccionadoCSV()),
      turnos_csv:         normCSV(val("pref-turnos")),
      alertas_activas:    checked("pref-alertas-activas"),
      alertas_email:      checked("pref-alertas-email"),
      alertas_whatsapp:   checked("pref-alertas-whatsapp")
    });

    if (!data.ok) {
      showMsg("preferencias-msg", data.message || "No se pudieron guardar", "error");
      return;
    }

    showMsg("preferencias-msg", "✓ " + (data.message || "Preferencias guardadas"), "ok");
    await cargarDashboard();
  } catch(err) {
    console.error(err);
    showMsg("preferencias-msg", "Error de conexión al guardar", "error");
  } finally {
    btnRestore(btn);
  }
}

/* ══════════════════════════════════════════
   HELPERS DOM
══════════════════════════════════════════ */

const val     = id => (document.getElementById(id)?.value||"").trim();
const setVal  = (id,v) => { const el=document.getElementById(id); if(el) el.value=v; };
const checked = id => !!(document.getElementById(id)?.checked);
const setCheck = (id,v) => { const el=document.getElementById(id); if(el) el.checked=!!v; };
const setText = (id,t) => { const el=document.getElementById(id); if(el) el.textContent=t; };
const setHTML = (id,h) => { const el=document.getElementById(id); if(el) el.innerHTML=h; };

function esc(s) {
  return String(s||"")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function normCSV(txt) {
  return String(txt||"").split(",").map(x=>x.trim().toUpperCase()).filter(Boolean).join(",");
}

function turnoTexto(v) {
  const t = String(v||"").trim().toUpperCase();
  if (!t||t==="-") return "-";
  return t.split(",").map(x => {
    if (x==="M") return "Mañana";
    if (x==="T") return "Tarde";
    if (x==="V") return "Vespertino";
    if (x==="N") return "Noche";
    if (x==="ALTERNADO") return "Alternado";
    return x;
  }).join(", ");
}

function fmtFecha(v) {
  const t = String(v||"").trim();
  if (!t||t==="-") return "-";
  const d = new Date(t);
  return isNaN(d.getTime()) ? t : d.toLocaleString("es-AR");
}

/* ══════════════════════════════════════════
   AUTOCOMPLETE
══════════════════════════════════════════ */

function debounce(fn, ms=320) {
  let timer;
  return function(...args){ clearTimeout(timer); timer=setTimeout(()=>fn.apply(this,args),ms); };
}

async function fetchSugerencias(tipo, q) {
  const url = `${WEB_APP_URL}?accion=sugerencias&tipo=${encodeURIComponent(tipo)}&q=${encodeURIComponent(q)}`;
  const res  = await fetch(url);
  return res.json();
}

function renderAC(lista, items, input) {
  if (!items?.length) { lista.innerHTML=""; lista.style.display="none"; return; }
  lista.innerHTML = items.map(it=>`<div class="ac-item">${esc(it.label||"")}</div>`).join("");
  lista.style.display = "block";
  lista.querySelectorAll(".ac-item").forEach(el => {
    el.addEventListener("mousedown", ev => {
      ev.preventDefault();
      input.value = el.textContent.trim();
      lista.innerHTML=""; lista.style.display="none";
    });
  });
}

function activarAC(inputId, listaId, tipo) {
  const input = document.getElementById(inputId);
  const lista = document.getElementById(listaId);
  if (!input||!lista) return;

  input.addEventListener("input", debounce(async () => {
    const q = input.value.trim();
    if (q.length < 2) { lista.innerHTML=""; lista.style.display="none"; return; }
    try {
      const data = await fetchSugerencias(tipo, q);
      renderAC(lista, data.ok ? data.items : [], input);
    } catch(_){ lista.innerHTML=""; lista.style.display="none"; }
  }));

  input.addEventListener("blur",  ()=>setTimeout(()=>{lista.style.display="none";},150));
  input.addEventListener("focus", ()=>{ if(input.value.trim().length>=2) input.dispatchEvent(new Event("input")); });
}

/* ══════════════════════════════════════════
   MOSTRAR/OCULTAR CONTRASEÑA
══════════════════════════════════════════ */

function initPwToggles() {
  document.querySelectorAll(".pw-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = document.getElementById(btn.dataset.target);
      if (!target) return;
      const show = target.type === "password";
      target.type   = show ? "text"     : "password";
      btn.textContent = show ? "🙈" : "👁";
    });
  });
}

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */

document.addEventListener("DOMContentLoaded", () => {

  // Formularios
  document.getElementById("form-registro")?.addEventListener("submit",     registrarDocente);
  document.getElementById("form-login")?.addEventListener("submit",         loginPassword);
  document.getElementById("form-preferencias")?.addEventListener("submit",  guardarPreferencias);

  // Logout
  document.getElementById("btn-logout")?.addEventListener("click",      logout);
  document.getElementById("btnCerrarSesion")?.addEventListener("click", logout);

  // Recargar panel — FIX: async + finally garantiza que el botón siempre vuelve
  const btnRecargar = document.getElementById("btn-recargar-panel");
  if (btnRecargar) {
    btnRecargar.addEventListener("click", async () => {
      btnLoad(btnRecargar, "↻ Recargando...");
      try { await cargarDashboard(); }
      catch(e){ console.error(e); }
      finally { btnRestore(btnRecargar); }
    });
  }

  // Nav pública
  document.getElementById("btnLogin")?.addEventListener("click",    () => mostrarSeccion("login"));
  document.getElementById("btnRegistro")?.addEventListener("click", () => mostrarSeccion("registro"));
  document.getElementById("btnMiPanel")?.addEventListener("click",  () => cargarDashboard());

  // Autocomplete
  activarAC("pref-distrito-principal", "sugerencias-distrito-principal", "distrito");
  activarAC("pref-segundo-distrito",   "sugerencias-segundo-distrito",   "distrito");
  activarAC("pref-tercer-distrito",    "sugerencias-tercer-distrito",    "distrito");
  activarAC("pref-cargos",             "sugerencias-cargos",             "cargo_area");

  // Mostrar/ocultar contraseña
  initPwToggles();

  // Estado inicial
  actualizarNav();
  if (obtenerToken()) { cargarDashboard(); } else { mostrarSeccion("inicio"); }
});
