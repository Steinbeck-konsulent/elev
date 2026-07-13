const tellQuestions=[
["Hvad skete der?","Fortæl kort, hvad du lagde mærke til."],
["Hvad ville barnet?","Hvad tror du, barnet prøvede at vise eller fortælle?"],
["Hvad gjorde du?","Fortæl, hvad du selv gjorde."],
["Hvad skete der bagefter?","Hvad gjorde barnet efter din hjælp?"],
["Hvorfor gjorde du det?","Fortæl, hvorfor du valgte at gøre sådan."]
];
let tellIndex=0;
let session=JSON.parse(sessionStorage.getItem("pau_elev_session")||'{"events":[],"tellAnswers":[]}');

function save(){sessionStorage.setItem("pau_elev_session",JSON.stringify(session))}
function nextScreen(n){
  document.querySelectorAll(".screen").forEach(x=>x.classList.add("hidden"));
  document.getElementById("screen-"+n).classList.remove("hidden");
  window.scrollTo({top:0,behavior:"smooth"});
}
function midChoice(value){
  session.events.push({screen:"B1",choice:value,time:new Date().toISOString()}); save();
  if(value==="Ja"){
    document.getElementById("mid-title").innerText="Tak.";
    document.getElementById("mid-text").innerText="Husk det. Du skal fortælle om det i eftermiddag.";
  }else{
    document.getElementById("mid-title").innerText="Det er okay.";
    document.getElementById("mid-text").innerText="Kig igen i eftermiddag.";
  }
  nextScreen(5);
}
function startTell(){tellIndex=0;showTell()}
function showTell(){
  document.querySelectorAll(".screen").forEach(x=>x.classList.add("hidden"));
  document.getElementById("screen-7").classList.remove("hidden");
  document.getElementById("tell-question").innerText=tellQuestions[tellIndex][0];
  document.getElementById("tell-help").innerText=tellQuestions[tellIndex][1];
}
function tellAnswer(value){
  session.tellAnswers.push({question:tellQuestions[tellIndex][0],answer:value,time:new Date().toISOString()}); save();
  tellIndex++;
  tellIndex>=tellQuestions.length?nextScreen(8):showTell();
}
function resetElev(){
  if(confirm("Vil du nulstille elevdelen på denne enhed?")){
    sessionStorage.removeItem("pau_elev_session"); location.reload();
  }
}
