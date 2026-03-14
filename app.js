const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwFtHAZ8ItzTK7MQdqn-FaVVO6s4s4HTIttZDC0daJgn6TgkJvFBafgNLTG_PcG0HxMbg/exec";

function mostrarSeccion(id) {
  const secciones = document.querySelectorAll("main section");
  secciones.forEach(sec => sec.classList.add("hidden"));

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

  if (!navPublico || !navPrivado) return;

  const token = obtenerToken();

  if (token) {
    navPublico.style.display = "none";
    navPrivado.style.display = "flex";
  } else {
    navPublico.style.display = "flex";
    navPrivado.style.display = "none";
  }
}

function logout() {
  borrarToken();
  actualizarNavSegunSesion();
  mostrarSeccion("inicio");

  const loginMsg = document.getElementById("login-msg");
  const registroMsg = document.getElementById("registro-msg");
  const prefMsg = document.getElementById("preferencias-msg");

  if (loginMsg) loginMsg.textContent = "";
  if (registroMsg) registroMsg.textContent = "";
  if (prefMsg) prefMsg.textContent = "";
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

async function registrarDocente(event) {
  event.preventDefault();

  const msg = document.getElementById("registro-msg");
  const btnSubmit = event.submitter || document.querySelector("#form-registro button[type='submit']");

  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.textContent = "Registrando...";
  }

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

      setTimeout(() => {
        mostrarSeccion("login");
      }, 700);
    } else {
      if (msg) msg.textContent = data.message || "No se pudo registrar";
    }
  } catch (error) {
    console.error("Error en registro:", error);
    if (msg) msg.textContent = "Error de conexión al registrar";
  } finally {
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.textContent = "Registrarme";
    }
  }
}

async function loginPassword(event) {
  event.preventDefault();

  const msg = document.getElementById("login-msg");
  const btnSubmit = event.submitter || document.querySelector("#form-login button[type='submit']");

  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.textContent = "Ingresando...";
  }

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

    if (msg) msg.textContent = "Login correcto";
    guardarToken(data.token);
    actualizarNavSegunSesion();
    await cargarDashboard();
  } catch (error) {
    console.error("Error en login:", error);
    if (msg) msg.textContent = "Error de conexión en login";
  } finally {
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.textContent = "Ingresar";
    }
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

    if (msg) msg.textContent = "Login con Google correcto";
    guardarToken(data.token);
    actualizarNavSegunSesion();
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
      token: token
    });

    if (!data.ok) {
      alert(data.message || "Sesión inválida");
      logout();
      return;
    }

    renderizarDashboard(data);
    cargarFormularioPreferenciasDesdeDashboard(data);
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
              <p><strong>Turno:</strong> ${escapeHtml(a.turno || "-")}</p>
              <p><strong>Nivel / modalidad:</strong> ${escapeHtml(a.nivel_modalidad || "-")}</p>
              <p><strong>Cierre:</strong> ${escapeHtml(a.fecha_cierre_fmt || "-")}</p>
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
      <p><strong>Último acceso:</strong> ${escapeHtml(estadisticas.ultimo_acceso || "-")}</p>
    `;
  }
}

function cargarFormularioPreferenciasDesdeDashboard(data) {
  const preferencias = data.preferencias || {};

  setInputValue("pref-distrito-principal", preferencias.distrito_principal || "");
  setInputValue("pref-segundo-distrito", preferencias.segundo_distrito || "");
  setInputValue("pref-tercer-distrito", preferencias.tercer_distrito || "");
  setInputValue("pref-cargos", preferencias.cargos_csv || preferencias.materias_csv || "");
  setInputValue("pref-nivel-modalidad", preferencias.nivel_modalidad || "");
  setInputValue("pref-turnos", preferencias.turnos_csv || "");

  setCheckboxValue("pref-alertas-activas", !!preferencias.alertas_activas);
  setCheckboxValue("pref-alertas-email", !!preferencias.alertas_email);
  setCheckboxValue("pref-alertas-whatsapp", !!preferencias.alertas_whatsapp);
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

  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.textContent = "Guardando...";
  }

  if (msg) msg.textContent = "Guardando preferencias...";

  const segundoDistrito = (document.getElementById("pref-segundo-distrito")?.value || "").trim().toUpperCase();
  const tercerDistrito = (document.getElementById("pref-tercer-distrito")?.value || "").trim().toUpperCase();

  const otrosDistritos = [segundoDistrito, tercerDistrito]
    .filter(Boolean)
    .join(",");

  const materiaCargo = (document.getElementById("pref-cargos")?.value || "").trim().toUpperCase();

  const payload = {
    action: "save_preferences",
    token: token,
    distrito_principal: (document.getElementById("pref-distrito-principal")?.value || "").trim().toUpperCase(),
    otros_distritos_c: normalizarListaCSV(otrosDistritos),
    materias_csv: normalizarListaCSV(materiaCargo),
    cargos_csv: normalizarListaCSV(materiaCargo),
    nivel_modalidad: (document.getElementById("pref-nivel-modalidad")?.value || "").trim().toUpperCase(),
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
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.textContent = "Guardar preferencias";
    }
  }
}

function normalizarListaCSV(texto) {
  return texto
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

function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay || 320);
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

  lista.innerHTML = items.map(item => {
    return `<div class="autocomplete-item">${escapeHtml(item.label || "")}</div>`;
  }).join("");

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
    }, 150);
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
      btnRecargar.disabled = true;
      const textoOriginal = btnRecargar.textContent;
      btnRecargar.textContent = "Recargando...";
      try {
        await cargarDashboard();
      } finally {
        btnRecargar.disabled = false;
        btnRecargar.textContent = textoOriginal;
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

  const token = obtenerToken();

  if (token) {
    cargarDashboard();
  } else {
    mostrarSeccion("inicio");
  }
});
