'use strict';

/* ══════════════════════════════════════════
   APDocentePBA — app.js v5
══════════════════════════════════════════ */

const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwFtHAZ8ItzTK7MQdqn-FaVVO6s4s4HTIttZDC0daJgn6TgkJvFBafgNLTG_PcG0HxMbg/exec";
const GOOGLE_CLIENT_ID = "650896364013-s3o36ckvoi42947v6ummmgdkdmsgondo.apps.googleusercontent.com";
const TOKEN_KEY = "apd_token_v2";

/* ──────────────────────────────────────────
   NAVEGACIÓN
────────────────────────────────────────── */

function mostrarSeccion(id) {
  document.querySelectorAll("main section").forEach(s => s.classList.add("hidden"));
  const dest = document.getElementById(id);
  if (dest) dest.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}
window.mostrarSeccion = mostrarSeccion;

/* ──────────────────────────────────────────
   SESIÓN
────────────────────────────────────────── */

const guardarToken = t => localStorage.setItem(TOKEN_KEY, t);
const obtenerToken = () => localStorage.getItem(TOKEN_KEY);
const borrarToken = () => localStorage.removeItem(TOKEN_KEY);

/* ──────────────────────────────────────────
   UI GENERAL
────────────────────────────────────────── */

function actualizarNav() {
  const ok = !!obtenerToken();
  document.getElementById("navPublico")?.classList.toggle("hidden", ok);
  document.getElementById("navPrivado")?.classList.toggle("hidden", !ok);
}

function logout() {
  borrarToken();
  actualizarNav();
  limpiarMsgs();
  mostrarSeccion("inicio");
}

function limpiarMsgs() {
  ["login-msg", "registro-msg", "preferencias-msg"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = "";
      el.className = "msg";
    }
  });
}

function showMsg(id, texto, tipo = "info") {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = texto;
  el.className = `msg msg-${tipo}`;
}

function btnLoad(btn, txt) {
  if (!btn) return;
  btn.dataset.orig = btn.textContent;
  btn.disabled = true;
  btn.textContent = txt;
}

function btnRestore(btn) {
  if (!btn) return;
  btn.disabled = false;
  btn.textContent = btn.dataset.orig || btn.textContent;
}

function setPanelLoading(activo) {
  document.getElementById("panel-loading")?.classList.toggle("hidden", !activo);
  document.getElementById("panel-content")?.classList.toggle("hidden", activo);
}

/* ──────────────────────────────────────────
   HTTP
────────────────────────────────────────── */

async function post(payload) {
  console.log("POST payload:", payload);

  const res = await fetch(WEB_APP_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  });

  const text = await res.text();
  console.log("HTTP status:", res.status);
  console.log("Raw response:", text);

  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("No JSON válido:", text);
    throw new Error("El backend no devolvió JSON válido");
  }
}

async function getJSON(url) {
  const res = await fetch(url);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Respuesta inválida del servidor");
  }
}

/* ──────────────────────────────────────────
   REGISTRO
────────────────────────────────────────── */

async function registrarDocente(e) {
  e.preventDefault();

  const btn = e.submitter || document.querySelector("#form-registro button[type='submit']");
  btnLoad(btn, "Registrando...");
  showMsg("registro-msg", "Procesando...", "info");

  try {
    const data = await post({
      action: "register",
      nombre: val("reg-nombre"),
      apellido: val("reg-apellido"),
      email: val("reg-email"),
      celular: val("reg-celular"),
      password: val("reg-password")
    });

    if (data.ok) {
      showMsg("registro-msg", data.message || "✓ Registro exitoso", "ok");
      document.getElementById("form-registro")?.reset();
      setTimeout(() => mostrarSeccion("login"), 1000);
    } else {
      showMsg("registro-msg", data.message || "No se pudo registrar", "error");
    }
  } catch (err) {
    console.error(err);
    showMsg("registro-msg", "Error de conexión. Intentá de nuevo.", "error");
  } finally {
    btnRestore(btn);
  }
}

/* ──────────────────────────────────────────
   LOGIN PASSWORD
────────────────────────────────────────── */

async function loginPassword(e) {
  e.preventDefault();

  const btn = e.submitter || document.querySelector("#form-login button[type='submit']");
  btnLoad(btn, "Ingresando...");
  showMsg("login-msg", "Verificando credenciales...", "info");

  try {
    const data = await post({
      action: "login_password",
      email: val("login-email"),
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
  } catch (err) {
    console.error(err);
    showMsg("login-msg", "Error de conexión. Intentá de nuevo.", "error");
  } finally {
    btnRestore(btn);
  }
}

/* ──────────────────────────────────────────
   LOGIN GOOGLE
────────────────────────────────────────── */

async function handleGoogleLogin(response) {
  showMsg("login-msg", "Validando con Google...", "info");

  try {
    const data = await post({
      action: "login_google",
      credential: response.credential
    });

    if (!data.ok || !data.token) {
      showMsg("login-msg", data.message || "No se pudo iniciar con Google", "error");
      return;
    }

    guardarToken(data.token);
    actualizarNav();
    showMsg("login-msg", "✓ Ingresando con Google...", "ok");
    await cargarDashboard();
  } catch (err) {
    console.error(err);
    showMsg("login-msg", "Error de conexión con Google", "error");
  }
}

window.handleGoogleLogin = handleGoogleLogin;

function initGoogleLogin() {
  const box = document.getElementById("google-login-box");
  const fallback = document.getElementById("google-login-fallback");
  if (!box) return;

  let tries = 0;
  const maxTries = 30;

  const timer = setInterval(() => {
    tries++;

    if (window.google && window.google.accounts && window.google.accounts.id) {
      clearInterval(timer);

      try {
        box.innerHTML = "";

        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: window.handleGoogleLogin,
          auto_select: false,
          cancel_on_tap_outside: true
        });

        window.google.accounts.id.renderButton(box, {
          theme: "outline",
          size: "large",
          shape: "rectangular",
          text: "signin_with",
          width: box.offsetWidth > 0 ? box.offsetWidth : 320,
          logo_alignment: "left"
        });

        fallback?.classList.add("hidden");
      } catch (e) {
        console.error("Error inicializando Google Sign-In:", e);
        fallback?.classList.remove("hidden");
      }

      return;
    }

    if (tries >= maxTries) {
      clearInterval(timer);
      fallback?.classList.remove("hidden");
      console.error("No cargó Google Sign-In");
    }
  }, 300);
}

/* ──────────────────────────────────────────
   DASHBOARD
────────────────────────────────────────── */

async function cargarDashboard() {
  const token = obtenerToken();
  if (!token) {
    actualizarNav();
    mostrarSeccion("inicio");
    return;
  }

  mostrarSeccion("panel-docente");
  setPanelLoading(true);

  try {
    const data = await post({ action: "dashboard", token });
    console.log("Dashboard response:", data);

    if (!data.ok) {
      alert(data.message || "Sesión inválida.");
      logout();
      return;
    }

    renderDashboard(data);
    cargarPrefsEnFormulario(data);
    actualizarNav();
  } catch (err) {
    console.error("Error cargarDashboard:", err);
    alert("No se pudo cargar el panel. Revisá tu conexión.");
    logout();
  } finally {
    setPanelLoading(false);
  }
}

/* ──────────────────────────────────────────
   RENDER DASHBOARD
────────────────────────────────────────── */

function renderDashboard(data) {
  const doc = data.docente || {};
  const pref = data.preferencias || {};
  const alts = Array.isArray(data.alertas) ? data.alertas : [];
  const hist = Array.isArray(data.historial) ? data.historial : [];
  const stats = data.estadisticas || {};

  const nombre = `${doc.nombre || ""} ${doc.apellido || ""}`.trim();

  setText("panel-bienvenida", nombre ? `Bienvenido/a, ${nombre}` : "Bienvenido/a");
  setText("panel-subtitulo", doc.email ? `Sesión: ${doc.email}` : "Panel docente");

  setHTML("panel-datos-docente", `
    <p><strong>ID:</strong> ${esc(doc.id || "-")}</p>
    <p><strong>Nombre:</strong> ${esc(nombre || "-")}</p>
    <p><strong>Email:</strong> ${esc(doc.email || "-")}</p>
    <p><strong>Celular:</strong> ${esc(doc.celular || "-")}</p>
    <p><strong>Estado:</strong> ${
      doc.activo
        ? '<span class="badge-ok">● Activo</span>'
        : '<span class="badge-off">● Inactivo</span>'
    }</p>
  `);

  const cargosDisplay = pref.cargos_csv || pref.materias_csv || "-";

  setHTML("panel-preferencias-resumen", `
    <p><strong>Distrito:</strong> ${esc(pref.distrito_principal || "-")}</p>
    ${pref.segundo_distrito ? `<p><strong>2° distrito:</strong> ${esc(pref.segundo_distrito)}</p>` : ""}
    ${pref.tercer_distrito ? `<p><strong>3° distrito:</strong> ${esc(pref.tercer_distrito)}</p>` : ""}
    <p><strong>Cargos/Mat.:</strong> ${esc(cargosDisplay)}</p>
    <p><strong>Nivel:</strong> ${esc(pref.nivel_modalidad || "(cualquiera)")}</p>
    <p><strong>Turno:</strong> ${esc(turnoTexto(pref.turnos_csv) || "(cualquiera)")}</p>
    <p><strong>Alertas:</strong> ${pref.alertas_activas ? "🔔 Activas" : "⏸ Pausadas"}</p>
    <p><strong>Email:</strong> ${pref.alertas_email ? "✓ Sí" : "✗ No"}</p>
  `);

  setHTML("panel-estadisticas", `
    <div class="stats-row">
      <div class="stat-box"><span class="stat-n">${stats.total_alertas ?? 0}</span><span class="stat-l">Alertas</span></div>
      <div class="stat-box"><span class="stat-n">${stats.alertas_leidas ?? 0}</span><span class="stat-l">Vistas</span></div>
      <div class="stat-box"><span class="stat-n">${stats.alertas_no_leidas ?? 0}</span><span class="stat-l">Sin ver</span></div>
    </div>
    <p class="stat-acceso">Último acceso: ${fmtFecha(stats.ultimo_acceso || "-")}</p>
  `);

  const badge = document.getElementById("alertas-badge");
  if (badge) {
    badge.textContent = String(alts.length);
    badge.classList.toggle("hidden", alts.length === 0);
  }

  const panelAlts = document.getElementById("panel-alertas");
  if (panelAlts) {
    if (alts.length > 0) {
      panelAlts.innerHTML = `
        <p class="alertas-count">${alts.length} oferta${alts.length > 1 ? "s" : ""} compatible${alts.length > 1 ? "s" : ""}</p>
        <div class="alertas-grid">${alts.map(renderAlertaCard).join("")}</div>
      `;
    } else {
      panelAlts.innerHTML = `
        <div class="empty-state">
          <p>No hay alertas compatibles todavía.</p>
          <p class="empty-hint">Configurá distrito y cargo/materia. Si dejás el turno en “Cualquier turno” se aceptan todos.</p>
        </div>
      `;
    }
  }

  const panelHist = document.getElementById("panel-historial");
  if (panelHist) {
    panelHist.innerHTML = hist.length > 0
      ? `<ul class="hist-list">${hist.map(h => `<li>${esc(String(h))}</li>`).join("")}</ul>`
      : `<p class="empty-hint">Sin historial todavía.</p>`;
  }
}

function renderAlertaCard(a) {
  const turno = a.turno ? turnoTexto(a.turno) : "";
  const cargoMat = a.cargo && a.materia && a.cargo !== a.materia
    ? `${a.cargo} — ${a.materia}`
    : (a.cargo || a.materia || "");

  return `
    <div class="alerta-card">
      <div class="alerta-tags">
        ${turno ? `<span class="tag tag-turno">${esc(turno)}</span>` : ""}
        ${a.nivel_modalidad ? `<span class="tag tag-nivel">${esc(a.nivel_modalidad)}</span>` : ""}
        <span class="tag tag-estado">Publicada</span>
      </div>
      <div class="alerta-titulo">${esc(a.titulo || "APD")}</div>
      <div class="alerta-info">
        ${arow("Cargo/Mat.", cargoMat)}
        ${arow("Distrito", a.distrito)}
        ${arow("Escuela", a.escuela)}
        ${a.domicilio ? arow("Domicilio", a.domicilio) : ""}
        ${a.jornada ? arow("Jornada", a.jornada) : ""}
        ${a.modulos ? arow("Módulos", a.modulos) : ""}
        ${a.curso_division ? arow("Curso/Div.", a.curso_division) : ""}
      </div>
      ${a.fecha_cierre_fmt ? `<div class="alerta-cierre">⏱ Cierre: ${esc(fmtFecha(a.fecha_cierre_fmt))}</div>` : ""}
    </div>
  `;
}

function arow(key, val) {
  if (!val) return "";
  return `
    <div class="alerta-row">
      <span class="alerta-key">${esc(key)}</span>
      <span class="alerta-val">${esc(String(val))}</span>
    </div>
  `;
}

/* ──────────────────────────────────────────
   PREFERENCIAS
────────────────────────────────────────── */

async function guardarPreferencias(e) {
  e.preventDefault();

  const token = obtenerToken();
  if (!token) {
    showMsg("preferencias-msg", "Sesión no válida", "error");
    return;
  }

  const btn = e.submitter || document.querySelector("#form-preferencias button[type='submit']");
  btnLoad(btn, "Guardando...");
  showMsg("preferencias-msg", "Guardando preferencias...", "info");

  const cargo1 = val("pref-cargo-1").toUpperCase().trim();
  const cargo2 = val("pref-cargo-2").toUpperCase().trim();
  const cargo3 = val("pref-cargo-3").toUpperCase().trim();
  const cargoCSV = [cargo1, cargo2, cargo3].filter(Boolean).join(",");

  const segundo = val("pref-segundo-distrito").toUpperCase().trim();
  const tercero = val("pref-tercer-distrito").toUpperCase().trim();
  const otrosDistritos = [segundo, tercero].filter(Boolean).join(",");

  try {
    const data = await post({
      action: "save_preferences",
      token,
      distrito_principal: val("pref-distrito-principal").toUpperCase().trim(),
      otros_distritos_c: otrosDistritos,
      materias_csv: cargoCSV,
      cargos_csv: cargoCSV,
      nivel_modalidad: getNivelCSV(),
      turnos_csv: val("pref-turnos"),
      alertas_activas: checked("pref-alertas-activas"),
      alertas_email: checked("pref-alertas-email"),
      alertas_whatsapp: checked("pref-alertas-whatsapp")
    });

    if (!data.ok) {
      showMsg("preferencias-msg", data.message || "No se pudieron guardar", "error");
      return;
    }

    showMsg("preferencias-msg", "✓ " + (data.message || "Preferencias guardadas"), "ok");
    await cargarDashboard();
  } catch (err) {
    console.error(err);
    showMsg("preferencias-msg", "Error de conexión al guardar", "error");
  } finally {
    btnRestore(btn);
  }
}

function cargarPrefsEnFormulario(data) {
  const p = data.preferencias || {};

  document.querySelectorAll('input[name="pref-nivel-modalidad"]').forEach(c => c.checked = false);
  document.querySelectorAll(".ac-list").forEach(l => {
    l.innerHTML = "";
    l.style.display = "none";
  });

  setVal("pref-distrito-principal", p.distrito_principal || "");
  setVal("pref-segundo-distrito", p.segundo_distrito || "");
  setVal("pref-tercer-distrito", p.tercer_distrito || "");

  const cargos = splitCSV(p.cargos_csv || p.materias_csv || "");
  setVal("pref-cargo-1", cargos[0] || "");
  setVal("pref-cargo-2", cargos[1] || "");
  setVal("pref-cargo-3", cargos[2] || "");

  setVal("pref-turnos", p.turnos_csv || "");

  if (p.nivel_modalidad) {
    const niveles = p.nivel_modalidad.split(",").map(s => s.trim().toUpperCase());
    document.querySelectorAll('input[name="pref-nivel-modalidad"]').forEach(cb => {
      cb.checked = niveles.includes(cb.value.trim().toUpperCase());
    });
  }

  setCheck("pref-alertas-activas", !!p.alertas_activas);
  setCheck("pref-alertas-email", !!p.alertas_email);
  setCheck("pref-alertas-whatsapp", !!p.alertas_whatsapp);
}

function getNivelCSV() {
  return Array.from(document.querySelectorAll('input[name="pref-nivel-modalidad"]:checked'))
    .map(el => el.value.trim().toUpperCase())
    .filter(Boolean)
    .join(",");
}

/* ──────────────────────────────────────────
   HELPERS DOM
────────────────────────────────────────── */

const val = id => (document.getElementById(id)?.value || "").trim();
const setVal = (id, v) => {
  const el = document.getElementById(id);
  if (el) el.value = v;
};
const checked = id => !!(document.getElementById(id)?.checked);
const setCheck = (id, v) => {
  const el = document.getElementById(id);
  if (el) el.checked = !!v;
};
const setText = (id, t) => {
  const el = document.getElementById(id);
  if (el) el.textContent = t;
};
const setHTML = (id, h) => {
  const el = document.getElementById(id);
  if (el) el.innerHTML = h;
};

function splitCSV(s) {
  return String(s || "").split(",").map(x => x.trim()).filter(Boolean);
}

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function turnoTexto(v) {
  const t = String(v || "").trim().toUpperCase();
  if (!t || t === "-") return "";
  return t.split(",").map(x => {
    if (x === "M") return "Mañana";
    if (x === "T") return "Tarde";
    if (x === "V") return "Vespertino";
    if (x === "N") return "Noche";
    if (x === "ALTERNADO") return "Alternado";
    return x;
  }).filter(Boolean).join(", ");
}

function fmtFecha(v) {
  const t = String(v || "").trim();
  if (!t || t === "-") return "-";

  const d = new Date(t);
  return isNaN(d.getTime()) ? t : d.toLocaleString("es-AR");
}

/* ──────────────────────────────────────────
   AUTOCOMPLETE
────────────────────────────────────────── */

function debounce(fn, ms = 320) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

async function fetchSugerencias(tipo, q) {
  const url = `${WEB_APP_URL}?accion=sugerencias&tipo=${encodeURIComponent(tipo)}&q=${encodeURIComponent(q)}`;
  return await getJSON(url);
}

function renderAC(lista, items, input) {
  if (!items?.length) {
    lista.innerHTML = "";
    lista.style.display = "none";
    return;
  }

  lista.innerHTML = items.map(it => `<div class="ac-item">${esc(it.label || "")}</div>`).join("");
  lista.style.display = "block";

  lista.querySelectorAll(".ac-item").forEach(el => {
    el.addEventListener("mousedown", ev => {
      ev.preventDefault();
      input.value = el.textContent.trim();
      lista.innerHTML = "";
      lista.style.display = "none";
    });
  });
}

function activarAC(inputId, listaId, tipo) {
  const input = document.getElementById(inputId);
  const lista = document.getElementById(listaId);
  if (!input || !lista) return;

  input.addEventListener("input", debounce(async () => {
    const q = input.value.trim();
    if (q.length < 2) {
      lista.innerHTML = "";
      lista.style.display = "none";
      return;
    }

    try {
      const data = await fetchSugerencias(tipo, q);
      renderAC(lista, data.ok ? data.items : [], input);
    } catch (err) {
      console.error("Autocomplete error:", err);
      lista.innerHTML = "";
      lista.style.display = "none";
    }
  }));

  input.addEventListener("blur", () => {
    setTimeout(() => {
      lista.style.display = "none";
    }, 150);
  });

  input.addEventListener("focus", () => {
    if (input.value.trim().length >= 2) {
      input.dispatchEvent(new Event("input"));
    }
  });
}

/* ──────────────────────────────────────────
   PASSWORD TOGGLES
────────────────────────────────────────── */

function initPwToggles() {
  document.querySelectorAll(".pw-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = document.getElementById(btn.dataset.target);
      if (!target) return;

      const show = target.type === "password";
      target.type = show ? "text" : "password";
      btn.textContent = show ? "🙈" : "👁";
    });
  });
}

/* ──────────────────────────────────────────
   INIT
────────────────────────────────────────── */

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("form-registro")?.addEventListener("submit", registrarDocente);
  document.getElementById("form-login")?.addEventListener("submit", loginPassword);
  document.getElementById("form-preferencias")?.addEventListener("submit", guardarPreferencias);

  document.getElementById("btn-logout")?.addEventListener("click", logout);
  document.getElementById("btnCerrarSesion")?.addEventListener("click", logout);

  const btnRecargar = document.getElementById("btn-recargar-panel");
  if (btnRecargar) {
    btnRecargar.addEventListener("click", async () => {
      btnLoad(btnRecargar, "↻ Recargando...");
      try {
        await cargarDashboard();
      } catch (e) {
        console.error(e);
      } finally {
        btnRestore(btnRecargar);
      }
    });
  }

  document.getElementById("btnLogin")?.addEventListener("click", () => mostrarSeccion("login"));
  document.getElementById("btnRegistro")?.addEventListener("click", () => mostrarSeccion("registro"));
  document.getElementById("btnMiPanel")?.addEventListener("click", () => cargarDashboard());

  activarAC("pref-distrito-principal", "sug-distrito-1", "distrito");
  activarAC("pref-segundo-distrito", "sug-distrito-2", "distrito");
  activarAC("pref-tercer-distrito", "sug-distrito-3", "distrito");
  activarAC("pref-cargo-1", "sug-cargo-1", "cargo_area");
  activarAC("pref-cargo-2", "sug-cargo-2", "cargo_area");
  activarAC("pref-cargo-3", "sug-cargo-3", "cargo_area");

  initPwToggles();
  initGoogleLogin();

  actualizarNav();

  if (obtenerToken()) {
    await cargarDashboard();
  } else {
    mostrarSeccion("inicio");
  }
});
