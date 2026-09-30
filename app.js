/*
  VALORANT Map Veto — no PHP.
  Multiplayer transport: PeerJS (WebRTC). One player creates a room; the other joins with the code.
  Map images/data: https://valorant-api.com/v1/maps
  The selected map pool is intentionally fixed below so it is easy to edit.
*/

const MAP_POOL = [
  "Abyss", "Ascent", "Haven", "Lotus", "Split", "Summit", "Sunset"
];

const state = {
  room: null,
  peer: null,
  conn: null,
  isHost: false,
  playerName: "",
  players: { p1: "", p2: "" },
  turn: 1,
  banned: [],
  phase: "waiting",
  mapData: {}
};

const $ = id => document.getElementById(id);
const setup = $("setup"), game = $("game"), result = $("result");
const mapsEl = $("maps");

function toast(msg){
  const el=$("toast"); el.textContent=msg; el.classList.add("show");
  clearTimeout(window.__toast); window.__toast=setTimeout(()=>el.classList.remove("show"),2200);
}
function setStatus(text, cls=""){
  $("statusText").textContent=text; $("statusDot").className="dot "+cls;
}
function randomCode(){ return Math.random().toString(36).slice(2,8).toUpperCase(); }

async function loadMaps(){
  try{
    const res = await fetch("https://valorant-api.com/v1/maps?language=en-US");
    if(!res.ok) throw new Error("API");
    const json=await res.json();
    for(const m of json.data){
      if(MAP_POOL.includes(m.displayName)) state.mapData[m.displayName]=m;
    }
  }catch(e){ console.warn(e); }
  renderMaps();
}

function mapImage(name){
  const m=state.mapData[name];
  return m?.splash || m?.displayIcon ||
    `https://placehold.co/800x450/111/fff?text=${encodeURIComponent(name)}`;
}
function renderMaps(){
  mapsEl.innerHTML="";
  for(const name of MAP_POOL){
    const banned=state.banned.includes(name);
    const div=document.createElement("article");
    div.className="map"+(banned?" banned":"");
    div.dataset.map=name;
    div.innerHTML=`
      <img src="${mapImage(name)}" alt="${name}">
      <button class="ban-btn">BAN</button>
      <div class="map-info"><div class="map-name">${name}</div>
      <div class="map-state">${banned?"MAPA ZAKÁZÁNA":"DOSTUPNÁ"}</div></div>`;
    div.querySelector(".ban-btn").onclick=(e)=>{e.stopPropagation(); banMap(name)};
    mapsEl.appendChild(div);
  }
}

function canAct(){ return state.phase==="veto" && state.turn === mySlot(); }
function mySlot(){ return state.isHost ? 1 : 2; }

function banMap(name){
  if(!canAct() || state.banned.includes(name)) return;
  if(!confirm(`Zakázat mapu ${name}?`)) return;
  state.banned.push(name);
  if(state.banned.length>=6){
    state.phase="finished";
  }else{
    state.turn=state.turn===1?2:1;
  }
  broadcastState();
  applyState();
}

function makeState(){
  return {
    players: state.players,
    turn: state.turn,
    banned: state.banned,
    phase: state.phase
  };
}
function broadcastState(){
  if(state.conn && state.conn.open) state.conn.send({type:"state", state:makeState()});
}
function applyRemote(s){
  state.players=s.players; state.turn=s.turn; state.banned=s.banned; state.phase=s.phase;
  applyState();
}

function applyState(){
  $("p1Name").textContent=state.players.p1||"Čeká se…";
  $("p2Name").textContent=state.players.p2||"Čeká se…";
  const both=!!state.players.p1 && !!state.players.p2;
  $("p1Action").textContent=state.phase==="waiting" ? "Čeká se…" : (state.phase==="finished"?"Hotovo":state.turn===1?"Banování…":"Čeká na soupeře");
  $("p2Action").textContent=state.phase==="waiting" ? "Čeká se…" : (state.phase==="finished"?"Hotovo":state.turn===2?"Banování…":"Čeká na soupeře");
  $("p1Card").classList.toggle("active",state.turn===1 && state.phase==="veto");
  $("p2Card").classList.toggle("active",state.turn===2 && state.phase==="veto");
  $("remainingCount").textContent=MAP_POOL.length-state.banned.length;

  if(state.phase==="waiting"){
    $("phaseTitle").textContent="Čekání na druhého hráče";
    $("phaseText").textContent="Po připojení druhého hráče začne banování.";
  }else if(state.phase==="veto"){
    $("phaseTitle").textContent=state.turn===mySlot()?"Jsi na tahu":"Soupeř banuje";
    $("phaseText").textContent=state.turn===mySlot()?"Vyber mapu, kterou chceš zakázat.":"Počkej, až soupeř provede svůj ban.";
  }else{
    $("phaseTitle").textContent="Veto dokončeno";
    $("phaseText").textContent="Zůstala poslední mapa.";
  }
  renderMaps();
  if(state.phase==="finished") showResult();
}

function showGame(){
  setup.classList.add("hidden"); game.classList.remove("hidden");
}
function showResult(){
  result.classList.remove("hidden"); game.classList.add("hidden");
  const chosen=MAP_POOL.find(m=>!state.banned.includes(m));
  $("resultTitle").textContent=chosen||"—";
  $("resultMap").innerHTML=`<div class="map selected">
    <img src="${mapImage(chosen)}" alt="${chosen}">
    <div class="map-info"><div class="map-name">${chosen}</div><div class="map-state">VYBRANÁ MAPA</div></div>
  </div>`;
}

function createPeer(id){
  return new Promise((resolve,reject)=>{
    state.peer=new Peer(id);
    state.peer.on("open",()=>resolve());
    state.peer.on("error",reject);
    state.peer.on("connection",conn=>{
      if(state.isHost){
        state.conn=conn;
        wireConnection(conn);
      }
    });
  });
}
function wireConnection(conn){
  state.conn=conn;
  conn.on("open",()=>{
    setStatus("Připojeno","ok");
    if(state.isHost){
      state.phase="veto";
      conn.send({type:"state",state:makeState()});
      applyState();
    }
  });
  conn.on("data",msg=>{
    if(msg.type==="state") applyRemote(msg.state);
    if(msg.type==="hello"){
      state.players.p2=msg.name;
      state.phase="veto";
      broadcastState(); applyState();
    }
    if(msg.type==="restart" && state.isHost){
      resetVeto(false); broadcastState();
    }
  });
  conn.on("close",()=>{setStatus("Soupeř odpojen","wait"); toast("Druhý hráč se odpojil.");});
}

async function createRoom(){
  const name=$("playerName").value.trim()||"Player 1";
  state.playerName=name; state.isHost=true;
  const code=randomCode(); state.room=code;
  state.players.p1=name; state.players.p2="";
  state.phase="waiting"; state.banned=[]; state.turn=1;
  try{
    await createPeer("veto-"+code);
    $("roomCodeLabel").textContent=code; $("copyBtn").disabled=false;
    showGame(); applyState(); setStatus("Room vytvořen • čeká se","wait");
  }catch(e){toast("Room se nepodařilo vytvořit."); console.error(e);}
}
async function joinRoom(){
  const name=$("playerName").value.trim()||"Player 2";
  const code=$("roomCodeInput").value.trim().toUpperCase();
  if(!code){toast("Zadej kód roomu.");return;}
  state.playerName=name; state.isHost=false; state.room=code;
  try{
    await createPeer();
    const conn=state.peer.connect("veto-"+code,{reliable:true});
    wireConnection(conn);
    conn.on("open",()=>{
      conn.send({type:"hello",name});
      setStatus("Připojeno","ok");
      $("roomCodeLabel").textContent=code; $("copyBtn").disabled=false;
      showGame(); applyState();
    });
  }catch(e){toast("Room nebyl nalezen nebo připojení selhalo."); console.error(e);}
}

function resetVeto(send=true){
  state.banned=[]; state.turn=1; state.phase=state.players.p2?"veto":"waiting";
  if(send && state.conn?.open) state.conn.send({type:"state",state:makeState()});
  result.classList.add("hidden"); game.classList.remove("hidden"); applyState();
}
function newRoom(){
  location.reload();
}

$("createBtn").onclick=createRoom;
$("joinBtn").onclick=joinRoom;
$("resetBtn").onclick=()=>{if(state.isHost)resetVeto();else toast("Restart může udělat Player 1.");};
$("newVetoBtn").onclick=()=>{if(state.isHost)resetVeto();else toast("Nové veto může spustit Player 1.");};
$("copyBtn").onclick=async()=>{
  try{await navigator.clipboard.writeText(state.room);toast("Kód zkopírován.");}catch{toast(state.room);}
};
document.addEventListener("keydown",e=>{
  if(e.key.toLowerCase()==="r" && state.room && state.isHost) resetVeto();
  if(e.key.toLowerCase()==="n") newRoom();
});

loadMaps();
