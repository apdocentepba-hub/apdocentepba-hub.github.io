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

function setNavPanelVisible(visible) {
  const btn = document.getElementById("btn-nav-panel");
  if (!btn) return;

  if (visible) {
    btn.classList.remove("hidden");
  } else {
    btn.classList.add("hidden");
  }
}

function logout() {
  borrarToken();
  setNavPanelVisible(false);
  mostrarSeccion("inicio");
}

async function enviarPost(payload) {
  const res = await fetch(WEB_APP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(payload)
  });

  return await res.json();
}

async function registrarDocente(event) {
  event.preventDefault();

  const msg = document.getElementById("registro-msg");
  msg.textContent = "Procesando...";

  const payload = {
    action: "register",
    nombre: document.getElementById("reg-nombre").value.trim(),
    apellido: document.getElementById("reg-apellido").value.trim(),
    email: document.getElementById("reg-email").value.trim(),
    celular: document.getElementById("reg-celular").value.trim(),
    password: document.getElementById("reg-password").value
  };

  try {
    const data = await enviarPost(payload);

    if (data.ok) {
      msg.textContent = data.message || "Registro correcto";
      document.getElementById("form-registro").reset();
      mostrarSeccion("login");
    } else {
      msg.textContent = data.message || "No se pudo registrar";
    }
  } catch (error) {
    console.error(error);
    msg.textContent = "Error de conexión al registrar";
  }
}

async function loginPassword(event) {
  event.preventDefault();

  const msg = document.getElementById("login-msg");
  msg.textContent = "Ingresando...";

  const payload = {
    action: "login_password",
    email: document.getElementById("login-email").value.trim(),
    password: document.getElementById("login-password").value
  };

  try {
    const data = await enviarPost(payload);

    if (!data.ok || !data.token) {
      msg.textContent = data.message || "Login incorrecto";
      return;
    }

    msg.textContent = "Login correcto";
    guardarToken(data.token);
    setNavPanelVisible(true);
    await cargarDashboard();
  } catch (error) {
    console.error(error);
    msg.textContent = "Error de conexión en login";
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
    setNavPanelVisible(true);
    await cargarDashboard();
  } catch (error) {
    console.error(error);
    if (msg) msg.textContent = "Error de conexión con Google";
  }
}

async function cargarDashboard() {
  const token = obtenerToken();

  if (!token) {
    setNavPanelVisible(false);
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
    setNavPanelVisible(true);
  } catch (error) {
    console.error(error);
    alert("No se pudo cargar el panel docente");
  }
}

function renderizarDashboard(data) {
  const docente = data.docente || {};
  const preferencias = data.preferencias || {};
  const alertas = data.alertas || [];
  const historial = data.historial || [];
  const estadisticas = data.estadisticas || {};

  const nombreCompleto = `${docente.nombre || ""} ${docente.apellido || ""}`.trim();

  document.getElementById("panel-bienvenida").textContent =
    nombreCompleto ? `Bienvenido/a, ${nombreCompleto}` : "Bienvenido/a";

  document.getElementById("panel-subtitulo").textContent =
    docente.email ? `Sesión iniciada con ${docente.email}` : "Panel docente";

  document.getElementById("panel-datos-docente").innerHTML = `
    <p><strong>ID:</strong> ${docente.id || "-"}</p>
    <p><strong>Nombre:</strong> ${docente.nombre || "-"}</p>
    <p><strong>Apellido:</strong> ${docente.apellido || "-"}</p>
    <p><strong>Email:</strong> ${docente.email || "-"}</p>
    <p><strong>Celular:</strong> ${docente.celular || "-"}</p>
    <p><strong>Estado:</strong> ${
      docente.activo
        ? '<span class="badge-ok">Activo</span>'
        : '<span class="badge-off">Inactivo</span>'
    }</p>
  `;

  document.getElementById("panel-preferencias").innerHTML = `
    <p><strong>Modo de alertas:</strong> ${preferencias.modo_alertas || "-"}</p>
    <p><strong>Distrito:</strong> ${preferencias.distrito || "-"}</p>
    <p><strong>Nivel:</strong> ${preferencias.nivel || "-"}</p>
    <p><strong>Materias:</strong> ${preferencias.materias || "-"}</p>
  `;

  if (alertas.length > 0) {
    document.getElementById("panel-alertas").innerHTML = `
      <ul class="lista-simple">
        ${alertas.map(a => `<li>${a}</li>`).join("")}
      </ul>
    `;
  } else {
    document.getElementById("panel-alertas").innerHTML = `<p>No hay alertas aún.</p>`;
  }

  if (historial.length > 0) {
    document.getElementById("panel-historial").innerHTML = `
      <ul class="lista-simple">
        ${historial.map(h => `<li>${h}</li>`).join("")}
      </ul>
    `;
  } else {
    document.getElementById("panel-historial").innerHTML = `<p>Sin historial todavía.</p>`;
  }

  document.getElementById("panel-estadisticas").innerHTML = `
    <p><strong>Total alertas:</strong> ${estadisticas.total_alertas ?? 0}</p>
    <p><strong>Leídas:</strong> ${estadisticas.alertas_leidas ?? 0}</p>
    <p><strong>No leídas:</strong> ${estadisticas.alertas_no_leidas ?? 0}</p>
    <p><strong>Último acceso:</strong> ${estadisticas.ultimo_acceso || "-"}</p>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  const formRegistro = document.getElementById("form-registro");
  const formLogin = document.getElementById("form-login");
  const btnLogout = document.getElementById("btn-logout");
  const btnRecargar = document.getElementById("btn-recargar-panel");

  if (formRegistro) formRegistro.addEventListener("submit", registrarDocente);
  if (formLogin) formLogin.addEventListener("submit", loginPassword);
  if (btnLogout) btnLogout.addEventListener("click", logout);
  if (btnRecargar) btnRecargar.addEventListener("click", cargarDashboard);

  const token = obtenerToken();
  if (token) {
    cargarDashboard();
  } else {
    setNavPanelVisible(false);
    mostrarSeccion("inicio");
  }
});
