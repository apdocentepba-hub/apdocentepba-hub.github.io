const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwFtHAZ8ItzTK7MQdqn-FaVVO6s4s4HTIttZDC0daJgn6TgkJvFBafgNLTG_PcG0HxMbg/exec";
const GOOGLE_CLIENT_ID = "650896364013-s3o36ckvoi42947v6ummmgdkdmsgondo.apps.googleusercontent.com";
const TOKEN_KEY = "apd_token";

function qs(id) {
  return document.getElementById(id);
}

function setMsg(text) {
  const box = qs("authMsg");
  if (box) box.textContent = text || "";
}

function showView(id) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  const target = qs(id);
  if (target) target.classList.add("active");
}

function showLogin() {
  qs("tabLogin").classList.add("active");
  qs("tabRegister").classList.remove("active");
  qs("loginBox").hidden = false;
  qs("registerBox").hidden = true;
  setMsg("");
}

function showRegister() {
  qs("tabRegister").classList.add("active");
  qs("tabLogin").classList.remove("active");
  qs("loginBox").hidden = true;
  qs("registerBox").hidden = false;
  setMsg("");
}

async function postData(data) {
  const res = await fetch(WEB_APP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(data)
  });

  const text = await res.text();

  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Respuesta inválida:", text);
    throw new Error("La API no devolvió JSON válido");
  }
}

async function registerUser() {
  try {
    setMsg("Guardando registro...");

    const data = {
      action: "register",
      nombre: qs("regNombre").value.trim(),
      apellido: qs("regApellido").value.trim(),
      email: qs("regEmail").value.trim(),
      password: qs("regPassword").value
    };

    const j = await postData(data);
    setMsg(j.message || j.error || "Respuesta recibida");
  } catch (err) {
    console.error(err);
    setMsg("Error al registrar");
  }
}

async function loginUser() {
  try {
    setMsg("Ingresando...");

    const data = {
      action: "login_password",
      email: qs("loginEmail").value.trim(),
      password: qs("loginPassword").value
    };

    const j = await postData(data);

    if (j.token) {
      localStorage.setItem(TOKEN_KEY, j.token);
      setMsg("Login correcto");
      qs("btnLogout").hidden = false;
    } else {
      setMsg(j.message || j.error || "No se pudo ingresar");
    }
  } catch (err) {
    console.error(err);
    setMsg("Error al ingresar");
  }
}

function handleGoogleLogin(response) {
  postData({
    action: "login_google",
    credential: response.credential
  })
    .then(j => {
      if (j.token) {
        localStorage.setItem(TOKEN_KEY, j.token);
        setMsg("Login con Google correcto");
        qs("btnLogout").hidden = false;
      } else {
        setMsg(j.message || j.error || "No se pudo ingresar con Google");
      }
    })
    .catch(err => {
      console.error(err);
      setMsg("Error con Google");
    });
}

function renderGoogleButtonSafe() {
  if (!window.google || !window.google.accounts || !qs("googleLoginBox")) {
    return;
  }

  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleGoogleLogin
  });

  google.accounts.id.renderButton(
    qs("googleLoginBox"),
    {
      theme: "outline",
      size: "large"
    }
  );
}

function boot() {
  qs("btnHome").addEventListener("click", () => showView("view-home"));
  qs("btnAuth").addEventListener("click", () => {
    showView("view-auth");
    showLogin();
  });
  qs("btnHeroRegister").addEventListener("click", () => {
    showView("view-auth");
    showRegister();
  });
  qs("tabLogin").addEventListener("click", showLogin);
  qs("tabRegister").addEventListener("click", showRegister);
  qs("btnRegister").addEventListener("click", registerUser);
  qs("btnLogin").addEventListener("click", loginUser);
  qs("btnLogout").addEventListener("click", () => {
    localStorage.removeItem(TOKEN_KEY);
    qs("btnLogout").hidden = true;
    setMsg("Sesión cerrada");
    showView("view-home");
  });

  renderGoogleButtonSafe();
  setTimeout(renderGoogleButtonSafe, 1000);
}

document.addEventListener("DOMContentLoaded", boot);
