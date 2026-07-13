const tellQuestions = [
  ["Hvad skete der?","Fortæl kort, hvad du lagde mærke til."],
  ["Hvad ville barnet?","Hvad tror du, barnet prøvede at vise eller fortælle?"],
  ["Hvad gjorde du?","Fortæl, hvad du selv gjorde."],
  ["Hvad skete der bagefter?","Hvad gjorde barnet efter din hjælp?"],
  ["Hvorfor gjorde du det?","Fortæl, hvorfor du valgte at gøre sådan."]
];
const obsPoints = [
  "Opdagede selv situationen",
  "Gik hen til barnet",
  "Skabte kontakt til barnet",
  "Forsøgte at forstå barnets behov",
  "Handlede på barnets behov",
  "Tilpassede hjælpen undervejs",
  "Kunne bagefter fortælle om situationen"
];
let tellIndex = 0;
let session = JSON.parse(localStorage.getItem("pau_session") || '{"events":[],"tellAnswers":[]}' );

function logEvent(screen, choice){
  session.events.push({screen, choice, time:new Date().toISOString()});
  localStorage.setItem("pau_session", JSON.stringify(session));
}

function nextScreen(n){
  document.querySelectorAll(".screen").forEach(x=>x.classList.add("hidden"));
  document.getElementById("screen-"+n).classList.remove("hidden");
  window.scrollTo({top:0,behavior:"smooth"});
}
function midChoice(value){
  logEvent("B1", value);
  if(value==="Ja"){
    document.getElementById("mid-title").innerText="Tak.";
    document.getElementById("mid-text").innerText="Husk det. Du skal fortælle om det i eftermiddag.";
  } else {
    document.getElementById("mid-title").innerText="Det er okay.";
    document.getElementById("mid-text").innerText="Kig igen i eftermiddag.";
  }
  nextScreen(5);
}
function startTell(){
  tellIndex=0;
  showTell();
}
function showTell(){
  document.querySelectorAll(".screen").forEach(x=>x.classList.add("hidden"));
  document.getElementById("screen-7").classList.remove("hidden");
  document.getElementById("tell-question").innerText=tellQuestions[tellIndex][0];
  document.getElementById("tell-help").innerText=tellQuestions[tellIndex][1];
}
function tellAnswer(value){
  session.tellAnswers.push({question:tellQuestions[tellIndex][0], answer:value, time:new Date().toISOString()});
  localStorage.setItem("pau_session", JSON.stringify(session));
  tellIndex++;
  if(tellIndex>=tellQuestions.length){ nextScreen(8); } else { showTell(); }
}
function showSection(id){
  ["elev","vejleder","status"].forEach(x=>document.getElementById(x).classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
  if(id==="status") renderSummary();
  window.scrollTo({top:0,behavior:"smooth"});
}
function buildObs(){
  const root=document.getElementById("observations");
  root.innerHTML="";
  obsPoints.forEach((p,i)=>{
    const d=document.createElement("div");
    d.className="obs";
    d.innerHTML=`<div class="obs-title">${i+1}. ${p}</div>
    <div class="support-grid">
      ${["Selvstændigt","Efter kort påmindelse","Efter konkret instruktion","Ikke udført"].map(v=>
      `<label><input type="radio" name="obs${i}" value="${v}"> ${v}</label>`).join("")}
    </div>`;
    root.appendChild(d);
  });
}
function saveAdvisor(){
  const observations=obsPoints.map((p,i)=>{
    const x=document.querySelector(`input[name="obs${i}"]:checked`);
    return {point:p, support:x?x.value:"Ikke registreret"};
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
  localStorage.setItem("pau_advisor",JSON.stringify(data));
  alert("Registreringen er gemt på denne enhed.");
}
function renderSummary(){
  const data=JSON.parse(localStorage.getItem("pau_advisor") || "null");
  const el=document.getElementById("summary");
  if(!data){el.innerHTML="Der er endnu ikke gemt en vejlederregistrering.";return}
  el.innerHTML=`
    <p><strong>Dato og tidspunkt:</strong> ${new Date(data.date).toLocaleString("da-DK")}</p>
    <p><strong>Sted:</strong> ${data.place || "Ikke angivet"}</p>
    <p><strong>Barnets forbogstav:</strong> ${data.childInitial || "Ikke angivet"}</p>
    <h3>Handlinger og støtte</h3>
    <ol>${data.observations.map(o=>`<li><strong>${o.point}:</strong> ${o.support}</li>`).join("")}</ol>
    <p><strong>Vejlederens ord:</strong><br>${escapeHtml(data.promptText || "Ikke angivet")}</p>
    <p><strong>Referat af Fortæl-samtalen:</strong><br>${escapeHtml(data.tellSummary || "Ikke angivet")}</p>`;
}
function clearAll(){
  if(confirm("Vil du slette alle lokalt gemte oplysninger fra denne enhed?")){
    localStorage.removeItem("pau_session");
    localStorage.removeItem("pau_advisor");
    location.reload();
  }
}
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
}
buildObs();
