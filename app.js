const WEB_APP_URL="https://script.google.com/macros/s/AKfycbwFtHAZ8ItzTK7MQdqn-FaVVO6s4s4HTIttZDC0daJgn6TgkJvFBafgNLTG_PcG0HxMbg/exec"

const GOOGLE_CLIENT_ID="650896364013-s3o36ckvoi42947v6ummmgdkdmsgondo.apps.googleusercontent.com"

const TOKEN_KEY="apd_token"

function qs(id){
return document.getElementById(id)
}

function showView(id){

document.querySelectorAll(".view")
.forEach(v=>v.classList.remove("active"))

qs(id).classList.add("active")

}

qs("btnHome").onclick=()=>{
showView("view-home")
}

qs("btnAuth").onclick=()=>{
showView("view-auth")
}

qs("btnHeroRegister").onclick=()=>{
showView("view-auth")
showRegister()
}

qs("tabLogin").onclick=showLogin
qs("tabRegister").onclick=showRegister

function showLogin(){

qs("tabLogin").classList.add("active")
qs("tabRegister").classList.remove("active")

qs("loginBox").hidden=false
qs("registerBox").hidden=true

}

function showRegister(){

qs("tabRegister").classList.add("active")
qs("tabLogin").classList.remove("active")

qs("loginBox").hidden=true
qs("registerBox").hidden=false

}

qs("btnRegister").onclick=async()=>{

let data={
action:"register",
nombre:qs("regNombre").value,
apellido:qs("regApellido").value,
email:qs("regEmail").value,
password:qs("regPassword").value
}

let r=await fetch(WEB_APP_URL,{
method:"POST",
body:JSON.stringify(data)
})

let j=await r.json()

qs("authMsg").innerText=j.message||j.error

}

qs("btnLogin").onclick=async()=>{

let data={
action:"login_password",
email:qs("loginEmail").value,
password:qs("loginPassword").value
}

let r=await fetch(WEB_APP_URL,{
method:"POST",
body:JSON.stringify(data)
})

let j=await r.json()

if(j.token){

localStorage.setItem(TOKEN_KEY,j.token)

alert("Login correcto")

}

}

function renderGoogleButton(){

google.accounts.id.initialize({
client_id:GOOGLE_CLIENT_ID,
callback:handleGoogleLogin
})

google.accounts.id.renderButton(
qs("googleLoginBox"),
{
theme:"outline",
size:"large"
}
)

}

function handleGoogleLogin(response){

fetch(WEB_APP_URL,{
method:"POST",
body:JSON.stringify({
action:"login_google",
credential:response.credential
})
})

.then(r=>r.json())
.then(j=>{

if(j.token){

localStorage.setItem(TOKEN_KEY,j.token)

alert("Login Google correcto")

}

})

}

window.onload=renderGoogleButton
