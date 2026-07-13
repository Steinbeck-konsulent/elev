const obsPoints=[
"Opdagede selv situationen","Gik hen til barnet","Skabte kontakt til barnet",
"Forsøgte at forstå barnets behov","Handlede på barnets behov",
"Tilpassede hjælpen undervejs","Kunne bagefter fortælle om situationen"
];
let activePin="";

function buildObs(){
  const root=document.getElementById("observations"); root.innerHTML="";
  obsPoints.forEach((p,i)=>{
    const d=document.createElement("div"); d.className="obs";
    d.innerHTML=`<div class="obs-title">${i+1}. ${p}</div><div class="support-grid">${
      ["Selvstændigt","Efter kort påmindelse","Efter konkret instruktion","Ikke udført"]
      .map(v=>`<label><input type="radio" name="obs${i}" value="${v}"> ${v}</label>`).join("")
    }</div>`;
    root.appendChild(d);
  });
}

async function deriveKey(pin,salt){
  const enc=new TextEncoder();
  const material=await crypto.subtle.importKey("raw",enc.encode(pin),{name:"PBKDF2"},false,["deriveKey"]);
  return crypto.subtle.deriveKey(
    {name:"PBKDF2",salt,iterations:150000,hash:"SHA-256"},
    material,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]
  );
}
function b64(bytes){return btoa(String.fromCharCode(...new Uint8Array(bytes)))}
function unb64(s){return Uint8Array.from(atob(s),c=>c.charCodeAt(0))}

async function encryptJson(obj,pin){
  const salt=crypto.getRandomValues(new Uint8Array(16));
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const key=await deriveKey(pin,salt);
  const data=new TextEncoder().encode(JSON.stringify(obj));
  const cipher=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,data);
  return {salt:b64(salt),iv:b64(iv),cipher:b64(cipher)};
}
async function decryptJson(payload,pin){
  const salt=unb64(payload.salt), iv=unb64(payload.iv);
  const key=await deriveKey(pin,salt);
  const plain=await crypto.subtle.decrypt({name:"AES-GCM",iv},key,unb64(payload.cipher));
  return JSON.parse(new TextDecoder().decode(plain));
}
async function pinVerifier(pin){
  const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode("PAU:"+pin));
  return b64(bytes);
}

async function unlock(){
  const pin=document.getElementById("pin").value.trim();
  const msg=document.getElementById("lockMessage");
  if(pin.length<4){msg.textContent="Koden skal være mindst fire tegn.";return}
  const stored=localStorage.getItem("pau_pin_verifier");
  const verify=await pinVerifier(pin);
  if(!stored){
    localStorage.setItem("pau_pin_verifier",verify);
  }else if(stored!==verify){
    msg.textContent="Forkert kode.";return
  }
  activePin=pin;
  document.getElementById("lockScreen").classList.add("hidden");
  document.getElementById("advisorApp").classList.remove("hidden");
  await loadAdvisor();
}
function lockNow(){
  activePin="";
  document.getElementById("pin").value="";
  document.getElementById("advisorApp").classList.add("hidden");
  document.getElementById("lockScreen").classList.remove("hidden");
}
async function saveAdvisor(){
  const observations=obsPoints.map((p,i)=>{
    const x=document.querySelector(`input[name="obs${i}"]:checked`);
    return {point:p,support:x?x.value:"Ikke registreret"};
  });
  const data={
    date:new Date().toISOString(),
    description:"Første observation efter introduktion og modellering",
    place:document.getElementById("place").value,
    childInitial:document.getElementById("initial").value.trim().slice(0,2),
    observations,
    promptText:document.getElementById("promptText").value.trim(),
    tellSummary:document.getElementById("tellSummary").value.trim()
  };
  const enc=await encryptJson(data,activePin);
  localStorage.setItem("pau_advisor_encrypted",JSON.stringify(enc));
  alert("Registreringen er gemt krypteret på denne enhed.");
  renderSummary(data);
}
async function loadAdvisor(){
  const raw=localStorage.getItem("pau_advisor_encrypted");
  if(!raw)return;
  try{
    const data=await decryptJson(JSON.parse(raw),activePin);
    document.getElementById("place").value=data.place||"";
    document.getElementById("initial").value=data.childInitial||"";
    data.observations.forEach((o,i)=>{
      const radio=[...document.querySelectorAll(`input[name="obs${i}"]`)].find(r=>r.value===o.support);
      if(radio)radio.checked=true;
    });
    document.getElementById("promptText").value=data.promptText||"";
    document.getElementById("tellSummary").value=data.tellSummary||"";
    renderSummary(data);
  }catch(e){
    document.getElementById("summary").textContent="De gemte data kunne ikke åbnes med denne kode.";
  }
}
function renderSummary(data){
  if(!data){
    const raw=localStorage.getItem("pau_advisor_encrypted");
    if(!raw){document.getElementById("summary").textContent="Der er endnu ikke gemt en registrering.";return}
    loadAdvisor(); return
  }
  document.getElementById("summary").innerHTML=`
    <p><strong>Dato og tidspunkt:</strong> ${new Date(data.date).toLocaleString("da-DK")}</p>
    <p><strong>Sted:</strong> ${data.place||"Ikke angivet"}</p>
    <p><strong>Barnets forbogstav:</strong> ${data.childInitial||"Ikke angivet"}</p>
    <h3>Handlinger og støtte</h3>
    <ol>${data.observations.map(o=>`<li><strong>${escapeHtml(o.point)}:</strong> ${escapeHtml(o.support)}</li>`).join("")}</ol>
    <p><strong>Vejlederens ord:</strong><br>${escapeHtml(data.promptText||"Ikke angivet")}</p>
    <p><strong>Referat af Fortæl-samtalen:</strong><br>${escapeHtml(data.tellSummary||"Ikke angivet")}</p>`;
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function resetAdvisor(){
  if(confirm("Vil du slette alle vejlederdata og den lokale kode fra denne enhed?")){
    localStorage.removeItem("pau_advisor_encrypted");
    localStorage.removeItem("pau_pin_verifier");
    location.reload();
  }
}
buildObs();
