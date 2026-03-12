const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwFtHAZ8ItzTK7MQdqn-FaVVO6s4s4HTIttZDC0daJgn6TgkJvFBafgNLTG_PcG0HxMbg/exec";
const TOKEN_KEY = "apd_token";

function qs(id) {
  return document.getElementById(id);
}

function showView(id) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  qs(id).classList.add("active");
}

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(v => v.classList.remove("active"));
  qs(id).classList.add("active");

  document.querySelectorAll(".sidebtn").forEach(b => b.classList.remove("active"));
  document.querySelector(`.sidebtn[data-screen="${id.replace("screen-", "")}"]`)?.classList.add("active");
}

async function api(action, data = {}) {
  const payload = { action, ...data };

  const res = await fetch(WEB_APP_URL, {
    method: "POST",
    body: JSON.stringify(payload)
  });

  return await res.json();
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function logout() {
  localStorage.removeItem(TOKEN_KEY);
  qs("btnLogout").classList.add("hidden");
  showView("view-public");
}

function setupTabs() {
  document.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

      btn.classList.add("active");
      qs("tab-" + btn.dataset.tab).classList.add("active");
    });
  });
}

function setupScreens() {
  document.querySelectorAll(".sidebtn").forEach(btn => {
    btn.addEventListener("click", () => {
      showScreen("screen-" + btn.dataset.screen);
    });
  });
}

async function registerDocente() {
  try {
    const data = {
      nombre: qs("reg_nombre").value.trim(),
      email: qs("reg_email").value.trim(),
      celular: qs("reg_celular").value.trim(),
      distrito_principal: qs("reg_distrito_principal").value.trim(),
      otros_distritos_csv: qs("reg_otros_distritos").value.trim(),
      materias_csv: qs("reg_materias").value.trim(),
      nivel_modalidad: qs("reg_nivel").value.trim(),
      turno_interes: qs("reg_turno").value.trim(),
      tipo_cargo: qs("reg_tipo_cargo").value.trim(),
      acepta_email: qs("reg_email_alerts").checked ? "SI" : "NO",
      acepta_terminos: qs("reg_terms").checked ? "SI" : "NO"
    };

    const r = await api("register", data);
    qs("login_msg").textContent = r.ok ? "Registro guardado. Ahora pedí tu código." : (r.error || "Error");
    console.log("register response:", r);
  } catch (err) {
    console.error("Error en registerDocente:", err);
    qs("login_msg").textContent = "Error al registrar. Revisá la consola.";
  }
}

async function sendCode() {
  try {
    const email = qs("login_email").value.trim();
    const r = await api("request_login", { email });
    qs("login_msg").textContent = r.ok ? "Código enviado a tu email." : (r.error || "Error");
    console.log("request_login response:", r);
  } catch (err) {
    console.error("Error en sendCode:", err);
    qs("login_msg").textContent = "Error al enviar código. Revisá la consola.";
  }
}

async function verifyCode() {
  try {
    const email = qs("login_email").value.trim();
    const otp = qs("login_code").value.trim();

    const r = await api("verify_login", { email, otp });

    if (!r.ok) {
      qs("login_msg").textContent = r.error || "Error";
      return;
    }

    setToken(r.token);
    qs("btnLogout").classList.remove("hidden");
    await loadDashboard();
    showView("view-panel");
  } catch (err) {
    console.error("Error en verifyCode:", err);
    qs("login_msg").textContent = "Error al ingresar. Revisá la consola.";
  }
}

async function loadDashboard() {
  const token = getToken();
  if (!token) return;

  try {
    const r = await api("dashboard", { token });

    if (!r.ok) {
      logout();
      return;
    }

    const { docente, stats, probabilities, notifications } = r;

    qs("welcomeBox").innerHTML = `
      <h3>Bienvenido/a</h3>
      <p><b>${docente.nombre || ""}</b><br>${docente.email || ""}</p>
      <p>Plan: ${docente.plan || "FREE"}</p>
    `;

    qs("stat_total").textContent = stats.total || 0;
    qs("stat_top_distrito").textContent = stats.porDistrito?.[0]?.label || "-";
    qs("stat_top_materia").textContent = stats.porMateria?.[0]?.label || "-";

    qs("probabilities").innerHTML = probabilities.length
      ? probabilities.map(p => `
        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #eee">
          <span>${p.combinacion}</span>
          <span class="badge ${p.probabilidad.toLowerCase()}">${p.probabilidad}</span>
        </div>
      `).join("")
      : "<p>Sin datos suficientes todavía.</p>";

    qs("pref_nombre").value = docente.nombre || "";
    qs("pref_celular").value = docente.celular || "";
    qs("pref_distrito_principal").value = docente.distrito_principal || "";
    qs("pref_otros_distritos").value = docente.otros_distritos_csv || "";
    qs("pref_materias").value = docente.materias_csv || "";
    qs("pref_nivel").value = docente.nivel_modalidad || "";
    qs("pref_turno").value = docente.turno_interes || "";
    qs("pref_tipo_cargo").value = docente.tipo_cargo || "";
    qs("pref_alertas").checked = String(docente.acepta_email || "").toUpperCase() === "SI";

    renderNotifications(notifications);
  } catch (err) {
    console.error("Error en loadDashboard:", err);
  }
}

function renderNotifications(list) {
  if (!list?.length) {
    qs("notificationsTable").innerHTML = "<p>No hay notificaciones todavía.</p>";
    return;
  }

  qs("notificationsTable").innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Distrito</th>
          <th>Materia</th>
          <th>Turno</th>
          <th>Estado</th>
          <th>Cierre</th>
        </tr>
      </thead>
      <tbody>
        ${list.map(n => `
          <tr>
            <td>${n.created_at || ""}</td>
            <td>${n.distrito || ""}</td>
            <td>${n.materia || ""}</td>
            <td>${n.turno || ""}</td>
            <td>${n.estado || ""}</td>
            <td>${n.fecha_cierre_fmt || ""}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

async function savePreferences() {
  try {
    const token = getToken();

    const data = {
      token,
      nombre: qs("pref_nombre").value.trim(),
      celular: qs("pref_celular").value.trim(),
      distrito_principal: qs("pref_distrito_principal").value.trim(),
      otros_distritos_csv: qs("pref_otros_distritos").value.trim(),
      materias_csv: qs("pref_materias").value.trim(),
      nivel_modalidad: qs("pref_nivel").value.trim(),
      turno_interes: qs("pref_turno").value.trim(),
      tipo_cargo: qs("pref_tipo_cargo").value.trim(),
      acepta_email: qs("pref_alertas").checked ? "SI" : "NO"
    };

    const r = await api("save_preferences", data);
    qs("pref_msg").textContent = r.ok ? "Preferencias guardadas." : (r.error || "Error");
  } catch (err) {
    console.error("Error en savePreferences:", err);
    qs("pref_msg").textContent = "Error al guardar.";
  }
}

async function boot() {
  setupTabs();
  setupScreens();

  qs("btnGoPublic").onclick = () => showView("view-public");
  qs("btnGoLogin").onclick = () => showView("view-login");
  qs("btnGoLogin2").onclick = () => showView("view-login");

  qs("btnGoPanel").onclick = async () => {
    if (!getToken()) {
      showView("view-login");
      return;
    }
    await loadDashboard();
    showView("view-panel");
  };

  qs("btnLogout").onclick = logout;
  qs("btnStart").onclick = () => showView("view-login");

  qs("btnRegister").onclick = registerDocente;
  qs("btnSendCode").onclick = sendCode;
  qs("btnVerifyCode").onclick = verifyCode;
  qs("btnSavePrefs").onclick = savePreferences;

  if (getToken()) {
    qs("btnLogout").classList.remove("hidden");
    await loadDashboard();
    showView("view-panel");
  } else {
    showView("view-public");
  }
}

boot();
