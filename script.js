/* RunVision Tabata PRO — script.js
   - Português TTS (pt-BR) countdown nos últimos 5s
   - Beep a cada segundo nos últimos 5s (metronome)
   - Vibração nos últimos 5s (navegador)
   - CTA modal com share
   - PWA support hooks (sw registration in HTML)
   - Presets (localStorage), export/import
   - Media preview por exercício (imagem/video)
   - Analytics hook (placeholder)
*/

const $ = (q) => document.querySelector(q);
// Elements
const protocolName = $('#protocolName');
const workTime = $('#workTime'); const restTime = $('#restTime');
const rounds = $('#rounds'); const prepare = $('#prepare');
const exercisesList = $('#exercisesList'); const newExercise = $('#newExercise');
const addExerciseBtn = $('#addExerciseBtn'); const savePreset = $('#savePreset');
const loadDefault = $('#loadDefault'); const exportBtn = $('#exportBtn'); const importBtn = $('#importBtn');
const fileInput = $('#fileInput'); const presetsContainer = $('#presetsContainer');

const startPauseBtn = $('#startPause'); const resetBtn = $('#resetBtn'); const fullscreenBtn = $('#fullscreenBtn');
const timeLeftEl = $('#timeLeft'); const phaseLabel = $('#phaseLabel'); const ring = $('#ring');
const progressBar = $('#progressBar'); const displayName = $('#displayName'); const currentExercise = $('#currentExercise');
const curRound = $('#curRound'); const totalRound = $('#totalRound'); const displayRounds = $('#displayRounds');
const displayWork = $('#displayWork'); const displayRest = $('#displayRest'); const totalTimeLeft = $('#totalTimeLeft');
const quickTabata = $('#quickTabata'); const quickTabataShort = $('#quickTabataShort'); const shareBtn = $('#shareBtn');
const mediaPreview = $('#mediaPreview');

const ctaModal = $('#ctaModal'); const closeModal = $('#closeModal'); const ctaButton = $('#ctaButton');
const couponCode = $('#couponCode'); const couponTimer = $('#couponTimer'); const ctaShare = $('#ctaShare');

// toggles
const vibrateToggle = $('#vibrateToggle'); const voiceToggle = $('#voiceToggle'); const soundToggle = $('#soundToggle');
const contrastToggle = $('#contrastToggle');

// analytics / CTA (config)
const ANALYTICS_HOOK = 'https://example.com/hook'; // substitua pela sua URL
const CTA_LINK = 'https://pay.kiwify.com.br/Xm4JqQH'; // substitua pela sua landing
const CTA_COUPON = 'RUNVISION10';

// state
let state = {
    name: 'Tabata PRO - Full Body',
    work: 20, rest: 10, rounds: 8, prepare: 5,
    exercises: [ {name:'Burpee', media:''}, {name:'Agachamento', media:''}, {name:'Alpinista', media:''}, {name:'Prancha', media:''} ],
    running:false, phase:'prepare', timeLeft:0, curRound:0, currentIdx:0, timer:null, lastFiveActive:false
};

// audio (WebAudio metronome + beeps)
window.webkitAudioContext = undefined;
const AudioCtx = window.AudioContext || window.webkitAudioContext;
const audioCtx = AudioCtx ? new AudioCtx() : null;
function beep(freq=880, dur=0.06, vol=0.2){
    if(!audioCtx || !stateSoundOn()) return;
    const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    g.gain.value = vol;
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
    setTimeout(()=>o.stop(), dur*1000+20);
}

// TTS wrapper (pt-BR)
function speakPT(msg){
    if(!voiceToggle.checked) return;
    if(typeof speechSynthesis === 'undefined') return;
    const u = new SpeechSynthesisUtterance(msg);
    u.lang = 'pt-BR';
    u.rate = 1.05;
    speechSynthesis.cancel(); // prevent overlapping
    speechSynthesis.speak(u);
}

// helpers
function stateSoundOn(){ return soundToggle.checked; }

function formatTime(s){
    const mm = Math.floor(s/60); const ss = Math.ceil(s%60);
    return `${mm}:${ss.toString().padStart(2,'0')}`;
}

// UI: render exercises (support "Name | url")
function parseExerciseLine(line){
    const parts = line.split('|').map(p=>p.trim());
    return { name: parts[0] || '', media: parts[1] || '' };
}

function renderExercises(){
    exercisesList.innerHTML = '';
    state.exercises.forEach((ex,i)=>{
        const div = document.createElement('div'); div.className='exercise-item';
        div.innerHTML = `
      <input data-i="${i}" value="${ex.name}" />
      <input data-media="${i}" placeholder="url mídia (opcional)" value="${ex.media}" />
      <button data-del="${i}" class="btn ghost">Rem</button>
    `;
        exercisesList.appendChild(div);
    });
}

// sync inputs <-> state
function syncFromInputs(){
    state.name = protocolName.value || 'Tabata PRO';
    state.work = Math.max(5, parseInt(workTime.value,10)||20);
    state.rest = Math.max(5, parseInt(restTime.value,10)||10);
    state.rounds = Math.max(1, parseInt(rounds.value,10)||8);
    state.prepare = Math.max(0, parseInt(prepare.value,10)||5);
}

function syncToDisplay(){
    displayName.textContent = state.name;
    displayRounds.textContent = state.rounds;
    displayWork.textContent = state.work + 's';
    displayRest.textContent = state.rest + 's';
    totalRound.textContent = state.rounds;
    const totalSecs = state.prepare + state.rounds*(state.work + state.rest);
    totalTimeLeft.textContent = 'Total: ' + formatTime(totalSecs);
}

// presets localstorage
function loadPresets(){ try{ return JSON.parse(localStorage.getItem('rv_pro_presets')||'[]') }catch(e){return[];} }
function savePresets(arr){ localStorage.setItem('rv_pro_presets', JSON.stringify(arr)) }
function renderPresets(){
    const arr = loadPresets(); presetsContainer.innerHTML='';
    arr.forEach((p,idx)=>{
        const el = document.createElement('button'); el.className='chip'; el.textContent=p.name;
        el.onclick = ()=>loadPreset(idx);
        presetsContainer.appendChild(el);
    });
}
function saveCurrentPreset(){
    syncFromInputs();
    const p = {
        name: state.name, work:state.work, rest:state.rest, rounds:state.rounds, prepare:state.prepare, exercises: state.exercises
    };
    const arr = loadPresets(); arr.push(p); savePresets(arr); renderPresets();
    alert('Preset salvo localmente');
}
function loadPreset(i){
    const arr = loadPresets(); if(!arr[i]) return;
    const p = arr[i];
    protocolName.value = p.name; workTime.value = p.work; restTime.value = p.rest; rounds.value = p.rounds; prepare.value = p.prepare;
    state.exercises = p.exercises || [];
    syncFromInputs(); syncToDisplay(); renderExercises();
}

// export/import
function exportPreset(){
    syncFromInputs();
    const data = { name: state.name, work:state.work, rest:state.rest, rounds:state.rounds, prepare:state.prepare, exercises:state.exercises };
    const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download=(state.name||'tabata')+'.json'; a.click(); URL.revokeObjectURL(url);
}
function importPresetFile(file){
    const reader = new FileReader();
    reader.onload = ()=>{ try{
        const d = JSON.parse(reader.result);
        protocolName.value = d.name || protocolName.value;
        workTime.value = d.work || workTime.value; restTime.value = d.rest || restTime.value;
        rounds.value = d.rounds || rounds.value; prepare.value = d.prepare || prepare.value;
        state.exercises = d.exercises || state.exercises;
        syncFromInputs(); syncToDisplay(); renderExercises();
    }catch(e){ alert('Arquivo inválido') } };
    reader.readAsText(file);
}

// quick presets
function loadDefaultPreset(){
    protocolName.value='Tabata PRO - Full Body'; workTime.value=20; restTime.value=10; rounds.value=8; prepare.value=5;
    state.exercises = [ {name:'Burpee',media:''}, {name:'Agachamento',media:''}, {name:'Alpinista',media:''}, {name:'Prancha',media:''} ];
    syncFromInputs(); syncToDisplay(); renderExercises();
}

// TIMER & PHASES
function start(){
    if(state.running) return;
    if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    state.running = true; startPauseBtn.textContent='Pause';
    if(state.phase==='finished') reset(true);
    if(!state.timeLeft){ state.curRound=0; state.currentIdx=0; state.phase = state.prepare>0 ? 'prepare' : 'work'; state.timeLeft = state.phase==='prepare'? state.prepare : state.work; }
    tick(); state.timer = setInterval(tick, 250);
}
function pause(){
    state.running=false; startPauseBtn.textContent='Start'; clearInterval(state.timer); stopLastFiveActions();
}
function reset(startNow=false){
    clearInterval(state.timer); stopLastFiveActions();
    state.running=false; state.phase = state.prepare>0 ? 'prepare' : 'work';
    state.timeLeft = state.phase==='prepare' ? state.prepare : state.work;
    state.curRound=0; state.currentIdx=0; updateUI(); startPauseBtn.textContent='Start';
    if(startNow) start();
}

let lastFiveInterval = null;
function startLastFiveActions(){
    // called when the phase enters the last 5 seconds
    if(lastFiveInterval) return;
    // every 1s beep + speak + vibrate
    let lastSec = Math.ceil(state.timeLeft);
    lastFiveInterval = setInterval(()=>{
        if(!state.running) { stopLastFiveActions(); return; }
        const t = Math.ceil(state.timeLeft);
        if(t<=0) { stopLastFiveActions(); return; }
        if(t<=5){
            // beep metronome
            beep(900,0.08,0.25);
            // speak number in pt-BR
            if(voiceToggle.checked){
                const map = {5:'cinco',4:'quatro',3:'três',2:'dois',1:'um'};
                const word = map[t] || '';
                if(word) speakPT(word);
            }
            // vibrate pattern
            if(vibrateToggle.checked && navigator.vibrate) navigator.vibrate(80);
        } else {
            // should not be here
        }
        // safety: stop when time passes
        if(t>lastSec) { lastSec = t; } else lastSec = t;
    }, 950); // slightly less than 1s to stay synced
}

function stopLastFiveActions(){
    if(lastFiveInterval){ clearInterval(lastFiveInterval); lastFiveInterval = null; }
}

function tick(){
    if(!state.running) return;
    state.timeLeft = +(state.timeLeft - 0.25).toFixed(2);
    if(state.timeLeft < 0) state.timeLeft = 0;
    const totalPhase = (state.phase==='work'? state.work : (state.phase==='rest'? state.rest : state.prepare));
    const pct = Math.min(1, Math.max(0, (totalPhase - state.timeLeft)/totalPhase));
    progressBar.style.width = (pct*100)+'%';
    ring.style.background = `conic-gradient(var(--accent) ${pct*360}deg, rgba(255,255,255,0.02) ${pct*360}deg)`;

    // Start last-5s actions when entering last five seconds
    if(state.timeLeft <= 5 && state.timeLeft > 0 && !lastFiveInterval){
        startLastFiveActions();
    }
    if(state.timeLeft > 5 && lastFiveInterval) stopLastFiveActions();

    // Phase transitions
    if(state.timeLeft === 0){
        stopLastFiveActions();
        if(state.phase === 'prepare'){
            state.phase='work'; state.curRound=1; state.timeLeft = state.work; beep(1000,0.09,0.25); if(voiceToggle.checked) speakPT('começou');
        } else if(state.phase === 'work'){
            state.phase='rest'; state.timeLeft = state.rest; beep(700,0.08,0.22); if(voiceToggle.checked) speakPT('descanso');
        } else if(state.phase === 'rest'){
            if(state.curRound >= state.rounds){
                // finished
                state.phase='finished'; state.running=false; clearInterval(state.timer); beep(1400,0.18,0.28);
                // CTA + analytics
                onFinish();
            } else {
                state.curRound++; state.phase='work'; state.timeLeft = state.work;
                state.currentIdx = (state.currentIdx+1) % Math.max(1, state.exercises.length);
                beep(1000,0.08,0.25); if(voiceToggle.checked) speakPT('próximo');
            }
        }
    }
    updateUI();
}

// update UI elements
function updateUI(){
    timeLeftEl.textContent = formatTime(state.timeLeft);
    phaseLabel.textContent = state.phase.toUpperCase();
    currentExercise.textContent = (state.exercises[state.currentIdx] && state.exercises[state.currentIdx].name) || '-';
    curRound.textContent = state.curRound;
    syncToDisplay();
    // show media preview if present
    const media = state.exercises[state.currentIdx] && state.exercises[state.currentIdx].media;
    renderMedia(media);
}

// render media preview
function renderMedia(mediaUrl){
    mediaPreview.innerHTML = '';
    if(!mediaUrl) { mediaPreview.setAttribute('aria-hidden','true'); return; }
    mediaPreview.setAttribute('aria-hidden','false');
    if(mediaUrl.match(/\.(mp4|webm|ogg)$/i)){
        const v = document.createElement('video'); v.src = mediaUrl; v.autoplay=true; v.loop=true; v.muted=true; v.playsInline=true; v.style.width='100%'; mediaPreview.appendChild(v);
    } else {
        const img = document.createElement('img'); img.src = mediaUrl; img.alt = 'Imagem exercício'; mediaPreview.appendChild(img);
    }
}

// CTA + analytics
function onFinish(){
    // open modal CTA
    showCTA();
    // analytics POST (non-blocking)
    fetch(ANALYTICS_HOOK, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({event:'workout_complete', protocol:state.name, timestamp: Date.now()}) }).catch(()=>{/*silent*/});
}

// CTA modal actions
function showCTA(){
    couponCode.textContent = CTA_COUPON;
    ctaButton.href = CTA_LINK;
    ctaModal.setAttribute('aria-hidden','false');
    // coupon countdown (30s default)
    let t=30; couponTimer.textContent = `00:${t.toString().padStart(2,'0')}`;
    const interval = setInterval(()=>{ t--; couponTimer.textContent = `00:${t.toString().padStart(2,'0')}`; if(t<=0){ clearInterval(interval); } },1000);
}
function hideCTA(){ ctaModal.setAttribute('aria-hidden','true'); }

// share preset
function shareCurrentPreset(){
    const data = { name: state.name, work: state.work, rest: state.rest, rounds: state.rounds, prepare: state.prepare, exercises:state.exercises };
    const text = `Preset RunVision: ${state.name}\n${JSON.stringify(data)}`;
    if(navigator.share){
        navigator.share({ title: state.name, text, url: location.href }).catch(()=>{/*silent*/});
    } else {
        // fallback: copy to clipboard
        navigator.clipboard.writeText(JSON.stringify(data)).then(()=> alert('Preset copiado para a área de transferência.'));
    }
}

// fullscreen
function toggleFullscreen(){
    if(!document.fullscreenElement){
        document.documentElement.requestFullscreen().catch(()=>{/*silent*/});
    } else {
        document.exitFullscreen().catch(()=>{/*silent*/});
    }
}

// event wiring
addExerciseBtn.addEventListener('click', ()=>{
    const raw = newExercise.value.trim(); if(!raw) return;
    // parse "Name | url"
    const ex = parseExerciseLine(raw);
    state.exercises.push(ex);
    newExercise.value = ''; renderExercises();
});
exercisesList.addEventListener('click',(e)=>{
    if(e.target.dataset.del){
        const i = +e.target.dataset.del; state.exercises.splice(i,1); renderExercises();
    }
});
exercisesList.addEventListener('input',(e)=>{
    if(e.target.dataset.i){
        const idx = +e.target.dataset.i; state.exercises[idx].name = e.target.value;
    }
    if(e.target.dataset.media){
        const idx = +e.target.dataset.media; state.exercises[idx].media = e.target.value;
    }
});

startPauseBtn.addEventListener('click', ()=> state.running ? pause() : start());
resetBtn.addEventListener('click', ()=> reset());
fullscreenBtn.addEventListener('click', toggleFullscreen);

savePreset.addEventListener('click', saveCurrentPreset);
loadDefault.addEventListener('click', loadDefaultPreset);

exportBtn.addEventListener('click', exportPreset);
importBtn.addEventListener('click', ()=> fileInput.click());
fileInput.addEventListener('change', (e)=> { const f = e.target.files[0]; if(f) importPresetFile(f); fileInput.value=''; });

quickTabata.addEventListener('click', ()=>{
    protocolName.value='Tabata Clássico'; workTime.value=20; restTime.value=10; rounds.value=8; prepare.value=5;
    state.exercises=[{name:'Burpee',media:''},{name:'Agachamento',media:''},{name:'Corrida estacionária',media:''},{name:'Alpinista',media:''}];
    syncFromInputs(); syncToDisplay(); renderExercises();
});
quickTabataShort.addEventListener('click', ()=>{
    protocolName.value='Tabata Curto'; workTime.value=15; restTime.value=10; rounds.value=4; prepare.value=3;
    state.exercises=[{name:'Agachamento',media:''},{name:'Prancha',media:''},{name:'Polichinelo',media:''}];
    syncFromInputs(); syncToDisplay(); renderExercises();
});

shareBtn.addEventListener('click', shareCurrentPreset);
closeModal.addEventListener('click', hideCTA);
ctaShare.addEventListener('click', ()=> {
    const url = CTA_LINK;
    const text = `Quero o RunVision: ${url} (cupom ${CTA_COUPON})`;
    if(navigator.share) navigator.share({title:'RunVision', text, url});
    else location.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
});

// keyboard friendly: space = start/pause
document.addEventListener('keydown', (e)=>{ if(e.code==='Space'){ e.preventDefault(); state.running?pause():start(); }});

// theme toggles
contrastToggle.addEventListener('change', ()=>{ document.body.classList.toggle('contrast', contrastToggle.checked); });

// inputs sync
[protocolName,workTime,restTime,rounds,prepare].forEach(el=>{
    el.addEventListener('input', ()=>{ syncFromInputs(); syncToDisplay(); });
});

// init
function init(){
    // load saved presets list
    renderPresets();
    syncFromInputs();
    syncToDisplay();
    renderExercises();
    // initial UI set
    state.phase = state.prepare>0 ? 'prepare' : 'work';
    state.timeLeft = state.phase==='prepare'? state.prepare : state.work;
    updateUI();
}
init();


// Utility: parse "Name | url"
