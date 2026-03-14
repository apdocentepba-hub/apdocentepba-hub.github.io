const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwFtHAZ8ItzTK7MQdqn-FaVVO6s4s4HTIttZDC0daJgn6TgkJvFBafgNLTG_PcG0HxMbg/exec";

function mostrarSeccion(id) {
  document.querySelectorAll("main section").forEach(sec => sec.classList.add("hidden"));
  const destino = document.getElementById(id);
  if (destino) destino.classList.remove("hidden");
}

function guardarToken(token) {
  localStorage.setItem("apd_token", token);
}

function obtenerToken() {
  return localStorage.getItem("apd_token");
}

function borrarToken() {
  localStorage.removeItem("apd_token");
}

function actualizarNavSegunSesion() {
  const navPublico = document.getElementById("navPublico");
  const navPrivado = document.getElementById("navPrivado");
  const hayToken = !!obtenerToken();

  if (!navPublico || !navPrivado) return;

  navPublico.classList.toggle("hidden", hayToken);
  navPrivado.classList.toggle("hidden", !hayToken);
}

function logout() {
  borrarToken();
  actualizarNavSegunSesion();
  limpiarMensajes();
  mostrarSeccion("inicio");
}

function limpiarMensajes() {
  ["login-msg", "registro-msg", "preferencias-msg"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = "";
  });
}

async function enviarPost(payload) {
  const res = await fetch(WEB_APP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(payload)
  });

  const text = await res.text();

  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Respuesta no JSON:", text);
    throw new Error("El backend no devolvió JSON válido");
  }
}

function setButtonLoading(btn, text) {
  if (!btn) return "";
  const original = btn.dataset.originalText || btn.textContent;
  btn.dataset.originalText = original;
  btn.disabled = true;
  btn.textContent = text;
  return original;
}

function restoreButton(btn) {
  if (!btn) return;
  btn.disabled = false;
  btn.textContent = btn.dataset.originalText || btn.textContent;
}

async function registrarDocente(event) {
  event.preventDefault();

  const msg = document.getElementById("registro-msg");
  const btnSubmit = event.submitter || document.querySelector("#form-registro button[type='submit']");
  setButtonLoading(btnSubmit, "Registrando...");

  if (msg) msg.textContent = "Procesando registro...";

  const payload = {
    action: "register",
    nombre: document.getElementById("reg-nombre")?.value.trim() || "",
    apellido: document.getElementById("reg-apellido")?.value.trim() || "",
    email: document.getElementById("reg-email")?.value.trim() || "",
    celular: document.getElementById("reg-celular")?.value.trim() || "",
    password: document.getElementById("reg-password")?.value || ""
  };

  try {
    const data = await enviarPost(payload);

    if (data.ok) {
      if (msg) msg.textContent = data.message || "Registro correcto";
      document.getElementById("form-registro")?.reset();
      setTimeout(() => mostrarSeccion("login"), 600);
    } else {
      if (msg) msg.textContent = data.message || "No se pudo registrar";
    }
  } catch (error) {
    console.error("Error en registro:", error);
    if (msg) msg.textContent = "Error de conexión al registrar";
  } finally {
    restoreButton(btnSubmit);
  }
}

async function loginPassword(event) {
  event.preventDefault();

  const msg = document.getElementById("login-msg");
  const btnSubmit = event.submitter || document.querySelector("#form-login button[type='submit']");
  setButtonLoading(btnSubmit, "Ingresando...");

  if (msg) msg.textContent = "Ingresando...";

  const payload = {
    action: "login_password",
    email: document.getElementById("login-email")?.value.trim() || "",
    password: document.getElementById("login-password")?.value || ""
  };

  try {
    const data = await enviarPost(payload);

    if (!data.ok || !data.token) {
      if (msg) msg.textContent = data.message || "Login incorrecto";
      return;
    }

    guardarToken(data.token);
    actualizarNavSegunSesion();
    if (msg) msg.textContent = "Login correcto";
    await cargarDashboard();
  } catch (error) {
    console.error("Error en login:", error);
    if (msg) msg.textContent = "Error de conexión en login";
  } finally {
    restoreButton(btnSubmit);
  }
}

async function handleGoogleLogin(response) {
  const msg = document.getElementById("login-msg");
  if (msg) msg.textContent = "Validando Google...";

  try {
    const data = await enviarPost({
      action: "login_google",
      credential: response.credential
    });

    if (!data.ok || !data.token) {
      if (msg) msg.textContent = data.message || "No se pudo iniciar con Google";
      return;
    }

    guardarToken(data.token);
    actualizarNavSegunSesion();
    if (msg) msg.textContent = "Login con Google correcto";
    await cargarDashboard();
  } catch (error) {
    console.error("Error en login Google:", error);
    if (msg) msg.textContent = "Error de conexión con Google";
  }
}

async function cargarDashboard() {
  const token = obtenerToken();

  if (!token) {
    actualizarNavSegunSesion();
    mostrarSeccion("inicio");
    return;
  }

  mostrarSeccion("panel-docente");

  try {
    const data = await enviarPost({
      action: "dashboard",
      token
    });

    if (!data.ok) {
      alert(data.message || "Sesión inválida");
      logout();
      return;
    }

    renderizarDashboard(data);
    limpiarFormularioPreferencias();
    cargarChecksPreferenciasDesdeDashboard(data);
    actualizarNavSegunSesion();
  } catch (error) {
    console.error("Error al cargar dashboard:", error);
    alert("No se pudo cargar el panel docente");
    logout();
  }
}

function renderizarDashboard(data) {
  const docente = data.docente || {};
  const preferencias = data.preferencias || {};
  const alertas = Array.isArray(data.alertas) ? data.alertas : [];
  const historial = Array.isArray(data.historial) ? data.historial : [];
  const estadisticas = data.estadisticas || {};

  const nombreCompleto = `${docente.nombre || ""} ${docente.apellido || ""}`.trim();

  const panelBienvenida = document.getElementById("panel-bienvenida");
  const panelSubtitulo = document.getElementById("panel-subtitulo");
  const panelDatos = document.getElementById("panel-datos-docente");
  const panelPreferenciasResumen = document.getElementById("panel-preferencias-resumen");
  const panelAlertas = document.getElementById("panel-alertas");
  const panelHistorial = document.getElementById("panel-historial");
  const panelEstadisticas = document.getElementById("panel-estadisticas");

  if (panelBienvenida) {
    panelBienvenida.textContent = nombreCompleto ? `Bienvenido/a, ${nombreCompleto}` : "Bienvenido/a";
  }

  if (panelSubtitulo) {
    panelSubtitulo.textContent = docente.email ? `Sesión iniciada con ${docente.email}` : "Panel docente";
  }

  if (panelDatos) {
    panelDatos.innerHTML = `
      <p><strong>ID:</strong> ${escapeHtml(docente.id || "-")}</p>
      <p><strong>Nombre:</strong> ${escapeHtml(docente.nombre || "-")}</p>
      <p><strong>Apellido:</strong> ${escapeHtml(docente.apellido || "-")}</p>
      <p><strong>Email:</strong> ${escapeHtml(docente.email || "-")}</p>
      <p><strong>Celular:</strong> ${escapeHtml(docente.celular || "-")}</p>
      <p><strong>Estado:</strong> ${
        docente.activo
          ? '<span class="badge-ok">Activo</span>'
          : '<span class="badge-off">Inactivo</span>'
      }</p>
    `;
  }

  if (panelPreferenciasResumen) {
    panelPreferenciasResumen.innerHTML = `
      <p><strong>Distrito principal:</strong> ${escapeHtml(preferencias.distrito_principal || "-")}</p>
      <p><strong>Segundo distrito:</strong> ${escapeHtml(preferencias.segundo_distrito || "-")}</p>
      <p><strong>Tercer distrito:</strong> ${escapeHtml(preferencias.tercer_distrito || "-")}</p>
      <p><strong>Materia / cargo:</strong> ${escapeHtml(preferencias.cargos_csv || preferencias.materias_csv || "-")}</p>
      <p><strong>Nivel / modalidad:</strong> ${escapeHtml(preferencias.nivel_modalidad || "-")}</p>
      <p><strong>Turno:</strong> ${escapeHtml(preferencias.turnos_csv || "-")}</p>
      <p><strong>Alertas activas:</strong> ${preferencias.alertas_activas ? "Sí" : "No"}</p>
      <p><strong>Email:</strong> ${preferencias.alertas_email ? "Sí" : "No"}</p>
      <p><strong>WhatsApp:</strong> ${preferencias.alertas_whatsapp ? "Sí" : "No"}</p>
    `;
  }

  if (panelAlertas) {
    if (alertas.length > 0) {
      panelAlertas.innerHTML = `
        <div class="alertas-grid">
          ${alertas.map(a => `
            <div class="alerta-item">
              <h4>${escapeHtml(a.titulo || "APD")}</h4>
              <p><strong>Distrito:</strong> ${escapeHtml(a.distrito || "-")}</p>
              <p><strong>Escuela:</strong> ${escapeHtml(a.escuela || "-")}</p>
              <p><strong>Turno:</strong> ${traducirTurno(a.turno || "-")}</p>
              <p><strong>Nivel / modalidad:</strong> ${escapeHtml(a.nivel_modalidad || "-")}</p>
              <p><strong>Cierre:</strong> ${formatearFechaCorta(a.fecha_cierre_fmt || "-")}</p>
            </div>
          `).join("")}
        </div>
      `;
    } else {
      panelAlertas.innerHTML = `<p>No hay alertas publicadas compatibles todavía.</p>`;
    }
  }

  if (panelHistorial) {
    if (historial.length > 0) {
      panelHistorial.innerHTML = `
        <ul class="lista-simple">
          ${historial.map(h => `<li>${escapeHtml(String(h))}</li>`).join("")}
        </ul>
      `;
    } else {
      panelHistorial.innerHTML = `<p>Sin historial todavía.</p>`;
    }
  }

  if (panelEstadisticas) {
    panelEstadisticas.innerHTML = `
      <p><strong>Total alertas:</strong> ${estadisticas.total_alertas ?? 0}</p>
      <p><strong>Leídas:</strong> ${estadisticas.alertas_leidas ?? 0}</p>
      <p><strong>No leídas:</strong> ${estadisticas.alertas_no_leidas ?? 0}</p>
      <p><strong>Último acceso:</strong> ${formatearFechaCorta(estadisticas.ultimo_acceso || "-")}</p>
    `;
  }
}

function traducirTurno(valor) {
  const v = String(valor || "").toUpperCase().trim();
  if (v === "M") return "Mañana";
  if (v === "T") return "Tarde";
  if (v === "N") return "Noche";
  if (v === "V") return "Vespertino";
  return escapeHtml(valor || "-");
}

function formatearFechaCorta(valor) {
  const txt = String(valor || "").trim();
  if (!txt || txt === "-") return "-";

  const d = new Date(txt);
  if (!isNaN(d.getTime())) {
    return d.toLocaleString("es-AR");
  }
  return escapeHtml(txt);
}

function limpiarFormularioPreferencias() {
  const form = document.getElementById("form-preferencias");
  if (form) form.reset();

  setInputValue("pref-distrito-principal", "");
  setInputValue("pref-segundo-distrito", "");
  setInputValue("pref-tercer-distrito", "");
  setInputValue("pref-cargos", "");
  setInputValue("pref-turnos", "");

  document.querySelectorAll('input[name="pref-nivel-modalidad"]').forEach(chk => {
    chk.checked = false;
  });

  [
    "sugerencias-distrito-principal",
    "sugerencias-segundo-distrito",
    "sugerencias-tercer-distrito",
    "sugerencias-cargos"
  ].forEach(id => {
    const box = document.getElementById(id);
    if (box) {
      box.innerHTML = "";
      box.style.display = "none";
    }
  });
}

function cargarChecksPreferenciasDesdeDashboard(data) {
  const preferencias = data.preferencias || {};

  setCheckboxValue("pref-alertas-activas", !!preferencias.alertas_activas);
  setCheckboxValue("pref-alertas-email", !!preferencias.alertas_email);
  setCheckboxValue("pref-alertas-whatsapp", !!preferencias.alertas_whatsapp);
}

function obtenerNivelModalidadSeleccionadoCSV() {
  return Array.from(document.querySelectorAll('input[name="pref-nivel-modalidad"]:checked'))
    .map(el => String(el.value || "").trim().toUpperCase())
    .filter(Boolean)
    .join(",");
}

function setInputValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
}

function setCheckboxValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.checked = !!value;
}

async function guardarPreferencias(event) {
  event.preventDefault();

  const token = obtenerToken();
  const msg = document.getElementById("preferencias-msg");
  const btnSubmit = event.submitter || document.querySelector("#form-preferencias button[type='submit']");

  if (!token) {
    if (msg) msg.textContent = "Sesión no válida";
    return;
  }

  setButtonLoading(btnSubmit, "Guardando...");
  if (msg) msg.textContent = "Guardando preferencias...";

  const segundoDistrito = (document.getElementById("pref-segundo-distrito")?.value || "").trim().toUpperCase();
  const tercerDistrito = (document.getElementById("pref-tercer-distrito")?.value || "").trim().toUpperCase();
  const otrosDistritos = [segundoDistrito, tercerDistrito].filter(Boolean).join(",");

  const materiaCargo = (document.getElementById("pref-cargos")?.value || "").trim().toUpperCase();

  const payload = {
    action: "save_preferences",
    token: token,
    distrito_principal: (document.getElementById("pref-distrito-principal")?.value || "").trim().toUpperCase(),
    otros_distritos_c: normalizarListaCSV(otrosDistritos),
    materias_csv: normalizarListaCSV(materiaCargo),
    cargos_csv: normalizarListaCSV(materiaCargo),
    nivel_modalidad: normalizarListaCSV(obtenerNivelModalidadSeleccionadoCSV()),
    turnos_csv: normalizarListaCSV(document.getElementById("pref-turnos")?.value || ""),
    alertas_activas: document.getElementById("pref-alertas-activas")?.checked || false,
    alertas_email: document.getElementById("pref-alertas-email")?.checked || false,
    alertas_whatsapp: document.getElementById("pref-alertas-whatsapp")?.checked || false
  };

  try {
    const data = await enviarPost(payload);

    if (!data.ok) {
      if (msg) msg.textContent = data.message || "No se pudieron guardar las preferencias";
      return;
    }

    if (msg) msg.textContent = data.message || "Preferencias guardadas";
    await cargarDashboard();
  } catch (error) {
    console.error("Error al guardar preferencias:", error);
    if (msg) msg.textContent = "Error de conexión al guardar preferencias";
  } finally {
    restoreButton(btnSubmit);
  }
}

function normalizarListaCSV(texto) {
  return String(texto || "")
    .split(",")
    .map(x => x.trim().toUpperCase())
    .filter(Boolean)
    .join(",");
}

function escapeHtml(texto) {
  return String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function debounce(fn, delay = 320) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

async function buscarSugerencias(tipo, texto) {
  const url = `${WEB_APP_URL}?accion=sugerencias&tipo=${encodeURIComponent(tipo)}&q=${encodeURIComponent(texto)}`;
  const res = await fetch(url);
  return await res.json();
}

function renderizarListaAutocomplete(lista, items, input) {
  if (!items || !items.length) {
    lista.innerHTML = "";
    lista.style.display = "none";
    return;
  }

  lista.innerHTML = items.map(item => `
    <div class="autocomplete-item">${escapeHtml(item.label || "")}</div>
  `).join("");

  lista.style.display = "block";

  lista.querySelectorAll(".autocomplete-item").forEach(el => {
    el.addEventListener("mousedown", function (e) {
      e.preventDefault();
      input.value = this.textContent.trim();
      lista.innerHTML = "";
      lista.style.display = "none";
    });
  });
}

function activarAutocomplete(inputId, listaId, tipo) {
  const input = document.getElementById(inputId);
  const lista = document.getElementById(listaId);

  if (!input || !lista) return;

  input.addEventListener("input", debounce(async function () {
    const texto = input.value.trim();

    if (texto.length < 2) {
      lista.innerHTML = "";
      lista.style.display = "none";
      return;
    }

    try {
      const data = await buscarSugerencias(tipo, texto);

      if (!data.ok) {
        lista.innerHTML = "";
        lista.style.display = "none";
        return;
      }

      renderizarListaAutocomplete(lista, data.items || [], input);
    } catch (error) {
      console.error("Error autocomplete:", error);
      lista.innerHTML = "";
      lista.style.display = "none";
    }
  }, 320));

  input.addEventListener("blur", function () {
    setTimeout(() => {
      lista.style.display = "none";
    }, 120);
  });

  input.addEventListener("focus", function () {
    if (input.value.trim().length >= 2) {
      input.dispatchEvent(new Event("input"));
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const formRegistro = document.getElementById("form-registro");
  const formLogin = document.getElementById("form-login");
  const formPreferencias = document.getElementById("form-preferencias");

  const btnLogoutPanel = document.getElementById("btn-logout");
  const btnRecargar = document.getElementById("btn-recargar-panel");

  const btnLogin = document.getElementById("btnLogin");
  const btnRegistro = document.getElementById("btnRegistro");
  const btnMiPanel = document.getElementById("btnMiPanel");
  const btnCerrarSesion = document.getElementById("btnCerrarSesion");

  if (formRegistro) formRegistro.addEventListener("submit", registrarDocente);
  if (formLogin) formLogin.addEventListener("submit", loginPassword);
  if (formPreferencias) formPreferencias.addEventListener("submit", guardarPreferencias);

  if (btnLogoutPanel) btnLogoutPanel.addEventListener("click", logout);
  if (btnCerrarSesion) btnCerrarSesion.addEventListener("click", logout);

 if (btnRecargar) {
  btnRecargar.addEventListener("click", async () => {
    console.log("CLICK EN RECARGAR");
    setButtonLoading(btnRecargar, "Recargando...");
    try {
      await cargarDashboard();
    } catch (e) {
      console.error("Error en recargar:", e);
    } finally {
      restoreButton(btnRecargar);
    }
  });
}

  if (btnLogin) btnLogin.addEventListener("click", () => mostrarSeccion("login"));
  if (btnRegistro) btnRegistro.addEventListener("click", () => mostrarSeccion("registro"));
  if (btnMiPanel) btnMiPanel.addEventListener("click", () => cargarDashboard());

  activarAutocomplete("pref-distrito-principal", "sugerencias-distrito-principal", "distrito");
  activarAutocomplete("pref-segundo-distrito", "sugerencias-segundo-distrito", "distrito");
  activarAutocomplete("pref-tercer-distrito", "sugerencias-tercer-distrito", "distrito");
  activarAutocomplete("pref-cargos", "sugerencias-cargos", "cargo_area");

  actualizarNavSegunSesion();

  if (obtenerToken()) {
    cargarDashboard();
  } else {
    mostrarSeccion("inicio");
  }
});
