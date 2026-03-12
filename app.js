const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwFtHAZ8ItzTK7MQdqn-FaVVO6s4s4HTIttZDC0daJgn6TgkJvFBafgNLTG_PcG0HxMbg/exec";
const GOOGLE_CLIENT_ID = "650896364013-s3o36ckvoi42947v6ummmgdkdmsgondo.apps.googleusercontent.com";
const TOKEN_KEY = "apd_token_v2";

function qs(id) {
  return document.getElementById(id);
}

function showView(id) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  qs(id).classList.add("active");
}

function showScreen(name) {
  document.querySelectorAll(".screen").forEach(v => v.classList.remove("active"));
  document.querySelectorAll(".sidebtn").forEach(v => v.classList.remove("active"));
  qs("screen-" + name).classList.add("active");
  document.querySelector(`.sidebtn[data-screen="${name}"]`)?.classList.add("active");
}

function setMsg(id, text) {
  qs(id).textContent = text || "";
}

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function api(action, data = {}) {
  const payload = { action, ...data };
  const body = new URLSearchParams();

  Object.entries(payload).forEach(([k, v]) => {
    body.append(k, v == null ? "" : String(v));
  });

  const res = await fetch(WEB_APP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
    },
    body: body.toString()
  });

  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (err) {
    console.error("Respuesta no JSON:", text);
    throw new Error("La API no devolvió JSON válido");
  }
}

function setupTabs() {
  document.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      qs("tab-" + btn.dataset.tab).classList.add("active");
      setMsg("auth_msg", "");
      setMsg("register_msg", "");
    });
  });
}

function setupSideMenu() {
  document.querySelectorAll(".sidebtn").forEach(btn => {
    btn.addEventListener("click", () => showScreen(btn.dataset.screen));
  });
}

async function registerUser() {
  try {
    setMsg("register_msg", "Guardando registro...");

    const r = await api("register", {
      nombre: qs("reg_nombre").value.trim(),
      apellido: qs("reg_apellido").value.trim(),
      email: qs("reg_email").value.trim(),
      password: qs("reg_password").value
    });

    if (!r.ok) {
      setMsg("register_msg", r.error || "No se pudo registrar");
      return;
    }

    setMsg("register_msg", "Registro creado. Ahora podés ingresar.");
    document.querySelector('.tab[data-tab="login"]').click();
    qs("login_email").value = qs("reg_email").value.trim();
    qs("login_password").value = "";
  } catch (err) {
    console.error(err);
    setMsg("register_msg", "Error al registrar");
  }
}

async function loginPassword() {
  try {
    setMsg("auth_msg", "Ingresando...");

    const r = await api("login_password", {
      email: qs("login_email").value.trim(),
      password: qs("login_password").value
    });

    if (!r.ok) {
      setMsg("auth_msg", r.error || "No se pudo ingresar");
      return;
    }

    setToken(r.token);
    setMsg("auth_msg", "");
    await loadDashboard();
    qs("btnLogout").classList.remove("hidden");
    showView("view-panel");
  } catch (err) {
    console.error(err);
    setMsg("auth_msg", "Error al ingresar");
  }
}

function renderGoogleButton() {
  if (!window.google || !window.google.accounts || GOOGLE_CLIENT_ID.indexOf("PONER_AQUI") !== -1) {
    return;
  }

  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleGoogleCredential
  });

  google.accounts.id.renderButton(
    qs("googleLoginBox"),
    {
      theme: "outline",
      size: "large",
      shape: "pill",
      text: "signin_with",
      width: 280
    }
  );
}

async function handleGoogleCredential(response) {
  try {
    setMsg("auth_msg", "Validando Google...");

    const r = await api("login_google", {
      credential: response.credential
    });

    if (!r.ok) {
      setMsg("auth_msg", r.error || "No se pudo ingresar con Google");
      return;
    }

    setToken(r.token);
    setMsg("auth_msg", "");
    await loadDashboard();
    qs("btnLogout").classList.remove("hidden");
    showView("view-panel");
  } catch (err) {
    console.error(err);
    setMsg("auth_msg", "Error al ingresar con Google");
  }
}

async function loadDashboard() {
  try {
    const token = getToken();
    if (!token) return;

    const r = await api("dashboard", { token });

    if (!r.ok) {
      clearToken();
      qs("btnLogout").classList.add("hidden");
      showView("view-auth");
      return;
    }

    const docente = r.docente || {};
    const alerts = r.alerts || [];
    const history = r.history || [];
    const stats = r.stats || {};

    const fullName = `${docente.nombre || ""} ${docente.apellido || ""}`.trim() || "Docente";

    qs("sideUserName").textContent = fullName;
    qs("sideUserEmail").textContent = docente.email || "";
    qs("avatarCircle").textContent = (docente.nombre || "D").charAt(0).toUpperCase();

    qs("welcomeTitle").textContent = "Hola, " + fullName;
    qs("welcomeSub").textContent = "Gestioná tu perfil, tus preferencias y tus alertas";

    qs("perfil_nombre").value = docente.nombre || "";
    qs("perfil_apellido").value = docente.apellido || "";
    qs("perfil_email").value = docente.email || "";
    qs("perfil_celular").value = docente.celular || "";
    qs("perfil_password").value = "";

    qs("pref_distrito_principal").value = docente.distrito_principal || "";
    qs("pref_otros_distritos").value = docente.otros_distritos_csv || "";
    qs("pref_materias").value = docente.materias_csv || "";
    qs("pref_nivel").value = docente.nivel_modalidad || "";
    qs("pref_turnos").value = docente.turnos_csv || "";
    qs("pref_cargos").value = docente.cargos_csv || "";
    qs("pref_acepta_email").checked = String(docente.acepta_email || "").toUpperCase() === "SI";

    qs("stat_total").textContent = stats.total_alertas || 0;
    qs("stat_distrito").textContent = stats.por_distrito?.[0]?.label || "-";
    qs("stat_materia").textContent = stats.por_materia?.[0]?.label || "-";
    qs("stat_cargo").textContent = stats.por_cargo?.[0]?.label || "-";

    renderAlerts("homeAlerts", alerts.slice(0, 5));
    renderAlerts("alertsList", alerts);
    renderHistory(history);

    renderStatList("statsDistrito", stats.por_distrito || []);
    renderStatList("statsMateria", stats.por_materia || []);
    renderStatList("statsTurno", stats.por_turno || []);
    renderStatList("statsCargo", stats.por_cargo || []);
  } catch (err) {
    console.error(err);
  }
}

function renderAlerts(containerId, alerts) {
  const box = qs(containerId);

  if (!alerts.length) {
    box.innerHTML = "<p>No hay alertas para mostrar todavía.</p>";
    return;
  }

  box.innerHTML = alerts.map(a => `
    <article class="alert-card">
      <div class="alert-top">
        <div>
          <h4 class="alert-title">${escapeHtml(a.materia || "APD sin materia")}</h4>
          <div class="alert-meta">
            <div><strong>Distrito:</strong> ${escapeHtml(a.distrito || "-")}</div>
            <div><strong>Turno:</strong> ${escapeHtml(a.turno || "-")}</div>
            <div><strong>Cargo:</strong> ${escapeHtml(a.cargo || "-")}</div>
            <div><strong>Publicado:</strong> ${escapeHtml(a.fecha_fmt || "-")}</div>
            <div><strong>Cierre:</strong> ${escapeHtml(a.fecha_cierre_fmt || "-")}</div>
          </div>
        </div>
        <span class="badge ${String(a.coincidencia || "").toLowerCase()}">${escapeHtml(a.coincidencia || "-")}</span>
      </div>

      <div class="alert-actions">
        <button onclick='recordAlertAction(${JSON.stringify(encodeURIComponent(JSON.stringify(a)))}, "me_interesa")'>Me interesa</button>
        <button onclick='recordAlertAction(${JSON.stringify(encodeURIComponent(JSON.stringify(a)))}, "ya_me_postule")'>Ya me postulé</button>
        <button onclick='recordAlertAction(${JSON.stringify(encodeURIComponent(JSON.stringify(a)))}, "no_me_interesa")'>No me interesa</button>
        ${a.link ? `<button onclick="window.open('${escapeAttr(a.link)}','_blank')">Abrir APD</button>` : ""}
      </div>
    </article>
  `).join("");
}

async function recordAlertAction(encodedAlert, action) {
  try {
    const a = JSON.parse(decodeURIComponent(encodedAlert));

    const r = await api("record_alert_action", {
      token: getToken(),
      apd_id: a.apd_id || "",
      distrito: a.distrito || "",
      materia: a.materia || "",
      turno: a.turno || "",
      cargo: a.cargo || "",
      alert_action: action
    });

    if (r.ok) {
      await loadDashboard();
      showScreen("historial");
    }
  } catch (err) {
    console.error(err);
  }
}

function renderHistory(history) {
  const box = qs("historyTable");

  if (!history.length) {
    box.innerHTML = "<p>No hay historial todavía.</p>";
    return;
  }

  box.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>APD</th>
            <th>Distrito</th>
            <th>Materia</th>
            <th>Turno</th>
            <th>Cargo</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          ${history.map(h => `
            <tr>
              <td>${escapeHtml(h.fecha || "")}</td>
              <td>${escapeHtml(h.apd_id || "")}</td>
              <td>${escapeHtml(h.distrito || "")}</td>
              <td>${escapeHtml(h.materia || "")}</td>
              <td>${escapeHtml(h.turno || "")}</td>
              <td>${escapeHtml(h.cargo || "")}</td>
              <td>${escapeHtml(h.accion || "")}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderStatList(containerId, items) {
  const box = qs(containerId);
  if (!items.length) {
    box.innerHTML = "<p>Sin datos.</p>";
    return;
  }

  box.innerHTML = items.map(i => `
    <div class="stat-list-item">
      <span>${escapeHtml(i.label || "-")}</span>
      <strong>${escapeHtml(String(i.value || 0))}</strong>
    </div>
  `).join("");
}

async function saveProfile() {
  try {
    setMsg("perfil_msg", "Guardando perfil...");

    const r = await api("save_profile", {
      token: getToken(),
      nombre: qs("perfil_nombre").value.trim(),
      apellido: qs("perfil_apellido").value.trim(),
      email: qs("perfil_email").value.trim(),
      celular: qs("perfil_celular").value.trim(),
      password: qs("perfil_password").value
    });

    if (!r.ok) {
      setMsg("perfil_msg", r.error || "No se pudo guardar");
      return;
    }

    setMsg("perfil_msg", "Perfil guardado");
    await loadDashboard();
  } catch (err) {
    console.error(err);
    setMsg("perfil_msg", "Error al guardar perfil");
  }
}

async function savePreferences() {
  try {
    setMsg("pref_msg", "Guardando preferencias...");

    const r = await api("save_preferences", {
      token: getToken(),
      distrito_principal: qs("pref_distrito_principal").value.trim(),
      otros_distritos_csv: qs("pref_otros_distritos").value.trim(),
      materias_csv: qs("pref_materias").value.trim(),
      nivel_modalidad: qs("pref_nivel").value.trim(),
      turnos_csv: qs("pref_turnos").value.trim(),
      cargos_csv: qs("pref_cargos").value.trim(),
      acepta_email: qs("pref_acepta_email").checked ? "SI" : "NO"
    });

    if (!r.ok) {
      setMsg("pref_msg", r.error || "No se pudieron guardar");
      return;
    }

    setMsg("pref_msg", "Preferencias guardadas");
    await loadDashboard();
  } catch (err) {
    console.error(err);
    setMsg("pref_msg", "Error al guardar preferencias");
  }
}

async function logout() {
  try {
    const token = getToken();
    if (token) {
      await api("logout", { token });
    }
  } catch (err) {
    console.error(err);
  }

  clearToken();
  qs("btnLogout").classList.add("hidden");
  showView("view-home");
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(str) {
  return String(str ?? "").replaceAll("'", "%27");
}

function bootNavigation() {
  qs("btnGoHome").onclick = () => showView("view-home");
  qs("btnGoAuth").onclick = () => showView("view-auth");
  qs("btnHeroRegister").onclick = () => {
    showView("view-auth");
    document.querySelector('.tab[data-tab="register"]').click();
  };
  qs("btnHeroLogin").onclick = () => {
    showView("view-auth");
    document.querySelector('.tab[data-tab="login"]').click();
  };
  qs("btnLogout").onclick = logout;
}

async function boot() {
  setupTabs();
  setupSideMenu();
  bootNavigation();

  qs("btnRegister").onclick = registerUser;
  qs("btnLogin").onclick = loginPassword;
  qs("btnSaveProfile").onclick = saveProfile;
  qs("btnSavePrefs").onclick = savePreferences;

  renderGoogleButton();

  if (getToken()) {
    qs("btnLogout").classList.remove("hidden");
    await loadDashboard();
    showView("view-panel");
  } else {
    showView("view-home");
  }
}

window.recordAlertAction = recordAlertAction;
boot();
