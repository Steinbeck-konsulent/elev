
const obsPoints=[
"Opdagede selv situationen","Gik hen til barnet","Skabte kontakt til barnet",
"Forsøgte at forstå barnets behov","Handlede på barnets behov",
"Tilpassede hjælpen undervejs","Kunne bagefter fortælle om situationen"
];
let activePin="";
let records=[];

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
  return crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:150000,hash:"SHA-256"},material,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
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
  const key=await deriveKey(pin,unb64(payload.salt));
  const plain=await crypto.subtle.decrypt({name:"AES-GCM",iv:unb64(payload.iv)},key,unb64(payload.cipher));
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
  if(!stored){localStorage.setItem("pau_pin_verifier",verify)}
  else if(stored!==verify){msg.textContent="Forkert kode.";return}
  activePin=pin;
  document.getElementById("lockScreen").classList.add("hidden");
  document.getElementById("advisorApp").classList.remove("hidden");
  await loadRecords();
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
    id:crypto.randomUUID(),
    date:new Date().toISOString(),
    day:document.getElementById("day").value,
    studentId:document.getElementById("studentId").value.trim().slice(0,12),
    place:document.getElementById("place").value,
    childInitial:document.getElementById("initial").value.trim().slice(0,2),
    observations,
    promptText:document.getElementById("promptText").value.trim(),
    tellSummary:document.getElementById("tellSummary").value.trim()
  };
  records.push(data);
  const enc=await encryptJson(records,activePin);
  localStorage.setItem("pau_advisor_records_encrypted",JSON.stringify(enc));
  alert("Registreringen er gemt krypteret.");
  renderSummary(data); renderHistory();
}
async function loadRecords(){
  const raw=localStorage.getItem("pau_advisor_records_encrypted");
  if(!raw){records=[];renderHistory();return}
  try{
    records=await decryptJson(JSON.parse(raw),activePin);
    renderHistory();
    if(records.length)renderSummary(records[records.length-1]);
  }catch(e){
    document.getElementById("summary").textContent="De gemte data kunne ikke åbnes med denne kode.";
  }
}
function renderSummary(data){
  if(!data){document.getElementById("summary").textContent="Der er endnu ikke gemt en registrering.";return}
  document.getElementById("summary").innerHTML=`
    <p><strong>${escapeHtml(data.day)}</strong> · ${new Date(data.date).toLocaleString("da-DK")}</p>
    <p><strong>Elev-id:</strong> ${escapeHtml(data.studentId||"Ikke angivet")}</p>
    <p><strong>Sted:</strong> ${escapeHtml(data.place||"Ikke angivet")}</p>
    <p><strong>Barnets forbogstav:</strong> ${escapeHtml(data.childInitial||"Ikke angivet")}</p>
    <ol>${data.observations.map(o=>`<li><strong>${escapeHtml(o.point)}:</strong> ${escapeHtml(o.support)}</li>`).join("")}</ol>`;
}
function renderHistory(){
  const el=document.getElementById("history");
  if(!records.length){el.textContent="Ingen tidligere registreringer.";return}
  el.innerHTML=records.map((r,i)=>`<p><strong>${i+1}. ${escapeHtml(r.day)}</strong> · ${new Date(r.date).toLocaleDateString("da-DK")} · ${escapeHtml(r.studentId||"uden elev-id")}</p>`).join("");
}
function renderComparison(){
  const el=document.getElementById("comparison");
  if(records.length<2){el.textContent="Der skal være mindst to registreringer for at sammenligne.";return}
  const levels={"Selvstændigt":3,"Efter kort påmindelse":2,"Efter konkret instruktion":1,"Ikke udført":0,"Ikke registreret":null};
  let html="<table><thead><tr><th>Observation</th>"+records.map(r=>`<th>${escapeHtml(r.day)}</th>`).join("")+"</tr></thead><tbody>";
  obsPoints.forEach((p,idx)=>{
    html+=`<tr><td>${escapeHtml(p)}</td>`;
    records.forEach(r=>{html+=`<td>${escapeHtml(r.observations[idx]?.support||"Ikke registreret")}</td>`});
    html+="</tr>";
  });
  html+="</tbody></table>";
  el.innerHTML=html;
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function resetAdvisor(){
  if(confirm("Vil du slette alle vejlederdata og den lokale kode fra denne enhed?")){
    localStorage.removeItem("pau_advisor_records_encrypted");
    localStorage.removeItem("pau_pin_verifier");
    location.reload();
  }
}
buildObs();
