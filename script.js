const $ = (q)=>document.querySelector(q);

const protocolName = $('#protocolName');
const workTime = $('#workTime');
const restTime = $('#restTime');
const rounds = $('#rounds');
const prepare = $('#prepare');
const exercisesList = $('#exercisesList');
const newExercise = $('#newExercise');
const addExerciseBtn = $('#addExerciseBtn');
const presetsContainer = $('#presetsContainer');

const startPauseBtn = $('#startPause');
const resetBtn = $('#resetBtn');
const timeLeft = $('#timeLeft');
const phaseLabel = $('#phaseLabel');
const ring = $('#ring');
const bar = $('#progressBar');
const displayName = $('#displayName');
const currentExerciseLabel = $('#currentExercise');
const curRound = $('#curRound');
const totalRound = $('#totalRound');
const displayRounds = $('#displayRounds');
const displayWork = $('#displayWork');
const displayRest = $('#displayRest');
const totalTimeLeft = $('#totalTimeLeft');
const soundToggle = $('#soundToggle');

let state = {
  name: "Tabata 4 min - Full Body",
  work: 20,
  rest: 10,
  rounds: 8,
  prepare: 5,
  exercises: ["Burpee","Agachamento","Alpinista","Prancha"],
  running:false,
  phase:"prepare",
  timeLeft:0,
  curRound:0,
  currentIdx:0,
  sound:true,
  timer:null
};

// ---- AUDIO / VOZ ----

function beep(freq=880, dur=0.06, vol=0.2){
  if(!state.sound || !audioCtx) return;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.frequency.value = freq;
  g.gain.value = vol;
  o.connect(g); g.connect(audioCtx.destination);
  o.start();
  g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
  setTimeout(()=>o.stop(), dur*1000+20);
}

function speak(msg){
  if(!state.sound) return;
  const u = new SpeechSynthesisUtterance(msg);
  u.lang = "en-US";
  speechSynthesis.speak(u);
}

// ---- EXERCÍCIOS ----
function renderExercises(){
  exercisesList.innerHTML = "";
  state.exercises.forEach((ex,i)=>{
    const div = document.createElement("div");
    div.className="exercise-item";
    div.innerHTML = `
      <input value="${ex}" data-i="${i}">
      <button data-del="${i}" class="btn ghost">Rem</button>
    `;
    exercisesList.appendChild(div);
  });
}

// ---- SYNC ----
function sync(){
  state.name = protocolName.value;
  state.work = +workTime.value;
  state.rest = +restTime.value;
  state.rounds = +rounds.value;
  state.prepare = +prepare.value;
}

function syncDisplay(){
  displayName.textContent = state.name;
  displayRounds.textContent = state.rounds;
  displayWork.textContent = state.work + "s";
  displayRest.textContent = state.rest + "s";
  totalRound.textContent = state.rounds;
}

// ---- TIMER ----
function start(){
  if(state.running) return;

  if(audioCtx && audioCtx.state === "suspended")
      audioCtx.resume();

  state.running = true;
  startPauseBtn.textContent = "Pause";

  if(state.phase === "finished") reset(true);

  if(!state.timeLeft){
    state.curRound = 0;
    state.currentIdx = 0;
    state.phase = state.prepare>0 ? "prepare":"work";
    state.timeLeft = state.phase==="prepare"? state.prepare : state.work;
  }

  tick();
  state.timer = setInterval(tick,250);
}

function pause(){
  state.running=false;
  startPauseBtn.textContent="Start";
  clearInterval(state.timer);
}

function reset(startNow=false){
  clearInterval(state.timer);
  state.running=false;
  state.phase = state.prepare>0 ? "prepare" : "work";
  state.timeLeft = state.phase==="prepare" ? state.prepare : state.work;
  state.curRound=0;
  state.currentIdx=0;
  updateUI();
  startPauseBtn.textContent="Start";
  if(startNow) start();
}

function tick(){
  if(!state.running) return;

  state.timeLeft = +(state.timeLeft - 0.25).toFixed(2);
  if(state.timeLeft < 0) state.timeLeft = 0;

  const totalPhase =
    state.phase==="work"? state.work :
    state.phase==="rest"? state.rest :
    state.prepare;

  const pct = (totalPhase - state.timeLeft) / totalPhase;
  bar.style.width = (pct*100)+"%";
  ring.style.background =
     `conic-gradient(var(--accent) ${pct*360}deg, rgba(255,255,255,0.1) 0deg)`;

  // ✅ VOZ NOS ÚLTIMOS 5 SEGUNDOS
  if(state.timeLeft <=5 && state.timeLeft > 0){
    const t = Math.ceil(state.timeLeft);
    const words = {5:"five",4:"four",3:"three",2:"two",1:"one"};
    speak(words[t]);
  }

  // Troca de fase
  if(state.timeLeft === 0){
    if(state.phase==="prepare"){
      state.phase="work";
      state.curRound=1;
      state.timeLeft=state.work;
      beep(1000);
    }
    else if(state.phase==="work"){
      state.phase="rest";
      state.timeLeft=state.rest;
      beep(700);
    }
    else if(state.phase==="rest"){
      if(state.curRound >= state.rounds){
        state.phase="finished";
        state.running=false;
        clearInterval(state.timer);
        beep(1200);
      } else {
        state.curRound++;
        state.phase="work";
        state.timeLeft=state.work;
        state.currentIdx = (state.currentIdx+1) % state.exercises.length;
        beep(1000);
      }
    }
  }

  updateUI();
}

// ---- UI ----
function updateUI(){
  timeLeft.textContent = "0:"+Math.ceil(state.timeLeft).toString().padStart(2,"0");
  phaseLabel.textContent = state.phase.toUpperCase();
  currentExerciseLabel.textContent =
    state.exercises[state.currentIdx] || "-";
  curRound.textContent = state.curRound;
  syncDisplay();
}

// ---- EVENTOS ----
addExerciseBtn.addEventListener("click", ()=>{
  const v = newExercise.value.trim();
  if(!v) return;
  state.exercises.push(v);
  newExercise.value="";
  renderExercises();
});

exercisesList.addEventListener("click",(e)=>{
  if(e.target.dataset.del){
    const i = +e.target.dataset.del;
    state.exercises.splice(i,1);
    renderExercises();
  }
});

exercisesList.addEventListener("input",(e)=>{
  if(e.target.dataset.i){
    state.exercises[e.target.dataset.i] = e.target.value;
  }
});

startPauseBtn.addEventListener("click", ()=>{
  if(state.running) pause(); else start();
});
resetBtn.addEventListener("click", ()=> reset());

// Som
soundToggle.addEventListener("click",()=>{
  state.sound=!state.sound;
  soundToggle.textContent = "Som: " + (state.sound?"ON":"OFF");
});

// Quick presets
$('#quickTabata').addEventListener("click",()=>{
  protocolName.value="Tabata Clássico";
  workTime.value=20;
  restTime.value=10;
  rounds.value=8;
  prepare.value=5;
  state.exercises=["Burpee","Agachamento","Alpinista","Prancha"];
  sync(); renderExercises(); syncDisplay();
});

$('#quickTabataShort').addEventListener("click",()=>{
  protocolName.value="Tabata Curto 2 min";
  workTime.value=15;
  restTime.value=10;
  rounds.value=4;
  prepare.value=3;
  state.exercises=["Agachamento","Prancha","Polichinelo","Ponte de Glúteo"];
  sync(); renderExercises(); syncDisplay();
});

// Inputs gerais
[protocolName,workTime,restTime,rounds,prepare]
.forEach(el => el.addEventListener("input", ()=>{ sync(); syncDisplay(); }));

// Inicializar
renderExercises();
syncDisplay();
reset();
