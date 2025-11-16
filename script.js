/* RunVision Tabata PRO - Script principal (simplificado & estável)
   Autor: Mario Farias
*/

/* ----------------- HELPERS ----------------- */
const $ = q => document.querySelector(q);
const $$ = q => Array.from(document.querySelectorAll(q));

function formatTime(s){
    const m = Math.floor(s/60);
    const ss = Math.ceil(s%60);
    return `${m}:${ss.toString().padStart(2,'0')}`;
}

/* ----------------- ELEMENTOS ----------------- */
/* Timer / UI */
const protocolName = $('#protocolName');
const workTime = $('#workTime');
const restTime = $('#restTime');
const rounds = $('#rounds');
const prepare = $('#prepare');

const exercisesList = $('#exercisesList');
const newExercise = $('#newExercise');
const addExerciseBtn = $('#addExerciseBtn');

const savePreset = $('#savePreset');
const loadDefault = $('#loadDefault');
const exportBtn = $('#exportBtn');
const importBtn = $('#importBtn');
const fileInput = $('#fileInput');
const presetsContainer = $('#presetsContainer');

const startPauseBtn = $('#startPause');
const resetBtn = $('#resetBtn');
const fullscreenBtn = $('#fullscreenBtn');

const timeLeftEl = $('#timeLeft');
const phaseLabel = $('#phaseLabel');
const ring = $('#ring');
const progressBar = $('#progressBar');

const displayName = $('#displayName');
const currentExercise = $('#currentExercise');
const curRound = $('#curRound');
const totalRound = $('#totalRound');
const displayRounds = $('#displayRounds');
const displayWork = $('#displayWork');
const displayRest = $('#displayRest');
const totalTimeLeft = $('#totalTimeLeft');
const mediaPreview = $('#mediaPreview');

const openProgress = $('#openProgress');

/* Progress page */
const progressPage = $('#progressPage');
const closeProgress = $('#closeProgress');
const pesoInicialInput = $('#pesoInicial');
const pesoAtualInput = $('#pesoAtual');
const salvarPesoBtn = $('#salvarPesoBtn');
const resultadoPeso = $('#resultadoPeso');
const graficoPeso = $('#graficoPeso');
const historicoTreinos = $('#historicoTreinos');
const badgesContainer = $('#badgesContainer');
const metaSemanalInput = $('#metaSemanal');
const metaStatus = $('#metaStatus');

/* Toggles */
$('#vibrateToggle');
$('#voiceToggle');
$('#soundToggle');
$('#contrastToggle');
/* CTA (placeholder) */
/* ----------------- ESTADO ----------------- */
let state = {
    name: "Tabata PRO - Full Body",
    work: 20,
    rest: 10,
    rounds: 8,
    prepare: 5,
    exercises: [
        {name:'Burpee', media:''},
        {name:'Agachamento', media:''},
        {name:'Alpinista', media:''},
        {name:'Prancha', media:''}
    ],
    running:false,
    phase:'prepare',
    timeLeft:0,
    curRound:0,
    currentIdx:0,
    timer:null
};

/* ----------------- RENDER / SYNC ----------------- */
function renderExercises(){
    exercisesList.innerHTML = '';
    state.exercises.forEach((ex,i)=>{
        const div = document.createElement('div');
        div.className = 'exercise-item';
        div.innerHTML = `<input data-i="${i}" value="${ex.name}">
                         <input data-media="${i}" placeholder="url (opcional)" value="${ex.media}">
                         <button class="btn ghost" data-del="${i}">Rem</button>`;
        exercisesList.appendChild(div);
    });
}

function syncFromInputs(){
    state.name = protocolName.value || state.name;
    state.work = Math.max(5, parseInt(workTime.value)||20);
    state.rest = Math.max(5, parseInt(restTime.value)||10);
    state.rounds = Math.max(1, parseInt(rounds.value)||8);
    state.prepare = Math.max(0, parseInt(prepare.value)||5);
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

/* ----------------- PRESETS (localStorage) ----------------- */
function loadPresetsList(){
    const arr = JSON.parse(localStorage.getItem('rv_pro_presets') || '[]');
    presetsContainer.innerHTML = '';
    arr.forEach((p, i)=>{
        const b = document.createElement('button');
        b.className = 'chip';
        b.textContent = p.name;
        b.addEventListener('click', ()=> {
            protocolName.value = p.name;
            workTime.value = p.work;
            restTime.value = p.rest;
            rounds.value = p.rounds;
            prepare.value = p.prepare;
            state.exercises = p.exercises || [];
            syncFromInputs();
            syncToDisplay();
            renderExercises();
        });
        presetsContainer.appendChild(b);
    });
}

/* ----------------- TIMER (básico) ----------------- */
function start(){
    if(state.running) return;
    state.running = true;
    startPauseBtn.textContent = 'Pause';

    if(state.phase === 'finished') reset(true);

    if(!state.timeLeft){
        state.curRound = 0;
        state.currentIdx = 0;
        state.phase = state.prepare>0 ? 'prepare' : 'work';
        state.timeLeft = state.phase === 'prepare' ? state.prepare : state.work;
    }

    tick();
    state.timer = setInterval(tick, 250);
}

function pause(){
    state.running = false;
    startPauseBtn.textContent = 'Start';
    clearInterval(state.timer);
}

function reset(auto=false){
    clearInterval(state.timer);
    state.running = false;
    state.phase = state.prepare>0 ? 'prepare' : 'work';
    state.timeLeft = state.phase==='prepare' ? state.prepare : state.work;
    state.curRound = 0;
    state.currentIdx = 0;
    updateUI();
    startPauseBtn.textContent = 'Start';
    if(auto) start();
}

function tick(){
    if(!state.running) return;
    state.timeLeft = +(state.timeLeft - 0.25).toFixed(2);
    if(state.timeLeft < 0) state.timeLeft = 0;

    const totalPhase = state.phase==='work' ? state.work : (state.phase==='rest' ? state.rest : state.prepare);

    const pct = Math.min(1, Math.max(0, (totalPhase - state.timeLeft)/totalPhase));
    progressBar.style.width = (pct*100) + '%';
    ring.style.background = `conic-gradient(var(--accent) ${pct*360}deg, rgba(255,255,255,0.02) ${pct*360}deg)`;

    if(state.timeLeft === 0){
        if(state.phase === 'prepare'){
            state.phase = 'work';
            state.curRound = 1;
            state.timeLeft = state.work;

        } else if(state.phase === 'work'){
            state.phase = 'rest';
            state.timeLeft = state.rest;

        } else if(state.phase === 'rest'){
            if(state.curRound >= state.rounds){
                state.phase = 'finished';
                state.running = false;
                clearInterval(state.timer);
                onFinish();
            } else {
                state.curRound++;
                state.phase = 'work';
                state.timeLeft = state.work;
                state.currentIdx = (state.currentIdx + 1) % Math.max(1, state.exercises.length);
            }
        }
    }

    updateUI();
}

function updateUI(){
    timeLeftEl.textContent = formatTime(state.timeLeft);
    phaseLabel.textContent = state.phase.toUpperCase();
    currentExercise.textContent =
        (state.exercises[state.currentIdx] && state.exercises[state.currentIdx].name) || '-';

    curRound.textContent = state.curRound;

    syncToDisplay();

    const media = state.exercises[state.currentIdx] && state.exercises[state.currentIdx].media;
    mediaPreview.innerHTML = '';

    if(media){
        if(media.match(/\.(mp4|webm|ogg)$/i)){
            const v = document.createElement('video');
            v.src = media;
            v.autoplay=true;
            v.loop=true;
            v.muted=true;
            v.playsInline=true;
            v.style.width='100%';
            mediaPreview.appendChild(v);

        } else {
            const img = document.createElement('img');
            img.src = media;
            img.alt = 'img';
            mediaPreview.appendChild(img);
        }
    }
}

/* ----------------- ON FINISH ----------------- */
function onFinish(){
    salvarHistorico();
    verificarConquistas();
    renderHistorico();
    gerarGraficoPeso();
}

/* ----------------- EVENTS ----------------- */
startPauseBtn.addEventListener('click', ()=> state.running ? pause() : start());
resetBtn.addEventListener('click', ()=> reset());
fullscreenBtn.addEventListener('click', ()=>{
    if(!document.fullscreenElement) document.documentElement.requestFullscreen().catch(()=>{});
    else document.exitFullscreen().catch(()=>{});
});

/* add exercise */
addExerciseBtn.addEventListener('click', ()=>{
    const raw = newExercise.value.trim();
    if(!raw) return;
    const parts = raw.split('|').map(s=>s.trim());
    state.exercises.push({name: parts[0], media: parts[1] || ''});
    newExercise.value='';
    renderExercises();
});

/* edit / remove */
exercisesList.addEventListener('click', (e)=>{
    if(e.target.dataset.del){
        state.exercises.splice(+e.target.dataset.del,1);
        renderExercises();
    }
});
exercisesList.addEventListener('input', (e)=>{
    if(e.target.dataset.i !== undefined){
        state.exercises[+e.target.dataset.i].name = e.target.value;
    }
    if(e.target.dataset.media !== undefined){
        state.exercises[+e.target.dataset.media].media = e.target.value;
    }
});

/* presets */
savePreset.addEventListener('click', ()=>{
    syncFromInputs();
    const p = {
        name: state.name,
        work: state.work,
        rest: state.rest,
        rounds: state.rounds,
        prepare: state.prepare,
        exercises: state.exercises
    };
    const arr = JSON.parse(localStorage.getItem('rv_pro_presets') || '[]');
    arr.push(p);
    localStorage.setItem('rv_pro_presets', JSON.stringify(arr));
    loadPresetsList();
    alert('Preset salvo');
});

loadDefault.addEventListener('click', ()=>{
    protocolName.value = 'Tabata PRO - Full Body';
    workTime.value=20;
    restTime.value=10;
    rounds.value=8;
    prepare.value=5;

    state.exercises = [
        {name:'Burpee',media:''},
        {name:'Agachamento',media:''},
        {name:'Alpinista',media:''},
        {name:'Prancha',media:''}
    ];

    syncFromInputs();
    syncToDisplay();
    renderExercises();
});

exportBtn.addEventListener('click', ()=>{
    syncFromInputs();
    const blob = new Blob(
        [JSON.stringify({
            name:state.name,
            work:state.work,
            rest:state.rest,
            rounds:state.rounds,
            prepare:state.prepare,
            exercises:state.exercises
        },null,2)],
        {type:'application/json'}
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (state.name||'preset') + '.json';
    a.click();
});

importBtn.addEventListener('click', ()=> fileInput.click());

fileInput.addEventListener('change', (e)=>{
    const f = e.target.files[0];
    if(!f) return;

    const r = new FileReader();
    r.onload = ()=>{
        try {
            const d = JSON.parse(r.result);
            protocolName.value = d.name || protocolName.value;
            workTime.value = d.work || workTime.value;
            restTime.value = d.rest || restTime.value;
            rounds.value = d.rounds || rounds.value;
            prepare.value = d.prepare || prepare.value;
            state.exercises = d.exercises || state.exercises;

            syncFromInputs();
            syncToDisplay();
            renderExercises();
        } catch(err){
            alert('Arquivo inválido');
        }
    };
    r.readAsText(f);
    fileInput.value='';
});

/* objective tabs */
$$('.obj-btn').forEach(b=>{
    b.addEventListener('click', ()=>{
        $$('.obj-btn').forEach(x=>x.classList.remove('active'));
        b.classList.add('active');
        const target = b.dataset.target;
        $$('.objective-list').forEach(l=>l.classList.remove('show'));
        document.getElementById(target).classList.add('show');
    });
});

/* presets dos objetivos (SEM IMAGENS AINDA) */
const presets = {
    iniciante1:{ name:"Full Body Leve", exercises:["Agachamento","Caminhada no Lugar","Elevação de Joelhos Leve","Prancha","Polichinelo Adaptado","Corrida Estacionária","Panturrilha","Toque no Joelho Alternado"] },
    iniciante2:{ name:"Pernas e Glúteos", exercises:["Agachamento","Avanço Alternado","Glúteo Ponte","Elevação de Perna Lateral","Agachamento Isométrico","Elevação de Pelve","Pulsos de Glúteo","Agachamento Sumo"] },
    iniciante3:{ name:"Core & Abs Leve", exercises:["Prancha","Toque no Calcanhar","Abs Curto","Prancha Lateral","Elevação de Pernas Leve","Bicicleta Lenta","Abdominal Isométrico","Prancha com Toque"] },
    iniciante4:{ name:"Mobilidade + HIIT Leve", exercises:["Mobilidade Quadril","Mobilidade Coluna","Mobilidade Tornozelo","Polichinelo Adaptado","Agachamento","Prancha","Corrida Leve","Toque Alternado no Pé"] },
    iniciante5:{ name:"Cardio Leve", exercises:["Marcha","Elevação de Joelhos","Polichinelo Adaptado","Corrida Leve","Passo Lateral","Chute Frontal","Giro de Tronco","Passada"] },
    iniciante6:{ name:"Braços & Ombros", exercises:["Flexão Adaptada","Braços Circulares","Tríceps Testa","Isometria Ombro","Abertura Braços","Prancha Baixa","Flexão Parede","Pulsos Ombro"] },
    iniciante7:{ name:"Treino 7 Minutos", exercises:["Agachamento","Flexão Adaptada","Prancha","Corrida Estacionária","Polichinelo Adaptado","Abdominal Curto","Passo Lateral","Elevação de Joelhos"] },
    iniciante8:{ name:"ABS 4 Minutos", exercises:["Crunch","Elevação Pernas","Bicicleta","Prancha","Crunch","Bicicleta","Prancha Baixa","Toque no Calcanhar"] },
    iniciante9:{ name:"HIIT Sem Impacto", exercises:["Passo Lateral","Chutes Frontais","Agachamento","Corrida Estacionária","Agachamento Sumo","Prancha","Polichinelo Sem Pulo","Marcha Rápida"] },
    iniciante10:{ name:"Glúteos Leve", exercises:["Glúteo Ponte","Abdução","Elevação Quadril","Prancha","Pulsos Glúteo","Elevação Perna","Passada","Agachamento Sumo"] },

    inter1:{ name:"Full Body Médio", exercises:["Agachamento","Flexão","Polichinelo","Prancha","Burpee Leve","Corrida","Afundo","Mountain Climbers"] },
    inter2:{ name:"Pernas Explosivas", exercises:["Agachamento Explosivo","Afundo Explosivo","Saltos","Salto Lateral","Isometria","Agachamento Sumo","Saltos Curtos","Joelho Alto"] },
    inter3:{ name:"ABS Intenso", exercises:["Crunch","Bicicleta","Prancha","Toque no Pé","V Sit","Abdominal Explosivo","Elevação Pernas","Prancha Lateral"] },
    inter4:{ name:"HIIT 12 Min", exercises:["Burpee","Mountain Climbers","Polichinelo","Corrida Rápida","Agachamento","Salto Lateral","Agachamento Pulsado","Sprint"] },
    inter5:{ name:"Cardio Médio", exercises:["Corrida","Joelho Alto","Polichinelo","Burpee Leve","Saltos Laterais","Passo Rápido","Chute Frontal","Sprint"] },
    inter6:{ name:"Glúteo + Core", exercises:["Glúteo Ponte","Prancha","Abdução","Elevação Pernas","Agachamento Sumo","Prancha Lateral","Crunch","Pulsos Glúteo"] },
    inter7:{ name:"Treino Militar", exercises:["Burpee","Flexão","Agachamento","Corrida","Abdominal","Mountain Climbers","Polichinelo","Sprint"] },
    inter8:{ name:"HIIT Pirâmide", exercises:["Agachamento","Corrida","Mountain Climbers","Flexão","Burpee","Flexão","Corrida","Agachamento"] },
    inter9:{ name:"Braços & Core", exercises:["Flexão","Prancha","Bicicleta","Flexão Diamante","Prancha Lateral","Dips","Abdominal","Flexão Militar"] },
    inter10:{ name:"Full Body Mix", exercises:["Burpee","Flexão","Agachamento","Mountain Climbers","Corrida","Elevação Pernas","Polichinelo","Sprint"] },

    avan1:{ name:"Full Body Avançado", exercises:["Burpee","Flexão Explosiva","Agachamento Salto","Mountain Turbo","Pistol","Prancha Avançada","Saltos Explosivos","Sprint"] },
    avan2:{ name:"HIIT Brutal", exercises:["Burpee","Sprint","Agachamento Explosivo","Mountain Turbo","Polichinelo Rápido","Corrida Explosiva","Sungo Explosivo","Sprint Final"] },
    avan3:{ name:"ABS Infernal", exercises:["V Sit","Elevação Pernas","Abd Explosivo","Bicicleta Turbo","Prancha Avançada","Crunch Rápido","Tesoura","Prancha Explosiva"] },
    avan4:{ name:"Pernas PRO", exercises:["Agachamento Explosivo","Pistol","Afundo Salto","Box Jump","Sprint Est.","Glúteo Iso","Sumo Explosivo","Burpee Salto Alto"] },
    avan5:{ name:"Cardio Hard", exercises:["Sprint","Burpee","Corrida Turbo","Saltos Rápidos","Chuting","Mountain Turbo","Agachamento Explosivo","Sprint"] },
    avan6:{ name:"Militar Pesado", exercises:["Burpee Militar","Flexão Militar","Agachamento","Corrida Militar","Mountain Climbers","Abdominal Militar","Polichinelo Militar","Sprint"] },
    avan7:{ name:"Tabata 20/10", exercises:["Burpee","Agachamento Explosivo","Flexão Explosiva","Mountain Climbers","Sprint","Abdominal","Saltos Laterais","Burpee"] },
    avan8:{ name:"Full Body Sprint", exercises:["Sprint","Corrida","Burpee","Flexão","Agachamento","Mountain Climbers","Sprint","Burpee Final"] },
    avan9:{ name:"Core Avançado", exercises:["V Sit","Prancha","Prancha Lateral","Tesoura","Prancha Dinâmica","Elevação Pernas","Bicicleta Turbo","Prancha Final"] },
    avan10:{ name:"Explosão PRO", exercises:["Burpee","Sprint","Flexão","Agachamento Explosivo","Mountain Turbo","Flexão Explosiva","Sprint","Burpee Final"] }
};

/* carregar presets ao clicar */
$$('.obj-item').forEach(btn=>{
    btn.addEventListener('click', ()=>{
        const key = btn.dataset.preset;
        const p = presets[key];
        if(!p) return;

        protocolName.value = p.name;
        workTime.value = p.work || 20;
        restTime.value = p.rest || 10;
        rounds.value = p.rounds || 8;
        prepare.value = p.prepare || 5;

        state.exercises = p.exercises.map(name=>({name, media:''}));

        syncFromInputs();
        syncToDisplay();
        renderExercises();
    });
});

/* ----------------- PROGRESS PAGE ----------------- */
openProgress.addEventListener('click', ()=>{
    progressPage.setAttribute('aria-hidden','false');
    renderHistorico();
    renderBadges();
    gerarGraficoPeso();
});
closeProgress.addEventListener('click', ()=>{
    progressPage.setAttribute('aria-hidden','true');
});

/* localStorage datasets */
let pesoLog = JSON.parse(localStorage.getItem('rv_peso') || '[]');
let historico = JSON.parse(localStorage.getItem('rv_hist') || '[]');
let conquistas = JSON.parse(localStorage.getItem('rv_badges') || '[]');

salvarPesoBtn.addEventListener('click', ()=>{
    const inicial = parseFloat(pesoInicialInput.value);
    const atual = parseFloat(pesoAtualInput.value);
    if(isNaN(inicial) || isNaN(atual)){
        alert('Preencha pesos válidos');
        return;
    }
    pesoLog.push({inicial, atual, data:new Date().toLocaleDateString()});
    localStorage.setItem('rv_peso', JSON.stringify(pesoLog));

    resultadoPeso.textContent = `Progresso: ${(inicial - atual).toFixed(1)} kg`;

    verificarConquistasPeso(inicial, atual);
    gerarGraficoPeso();
});

/* gráfico simples */
function gerarGraficoPeso(){
    const c = graficoPeso;
    if(!c) return;
    const ctx = c.getContext('2d');

    ctx.clearRect(0,0,c.width,c.height);

    if(pesoLog.length === 0){
        ctx.fillStyle = '#fff';
        ctx.font = '16px Arial';
        ctx.fillText('Sem dados de peso', 10, 30);
        return;
    }
    pesoLog.map(p=>p.data);
    const values = pesoLog.map(p=>p.atual);
    const max = Math.max(...values);
    const min = Math.min(...values);

    const pad = 30;
    const w = c.width - pad*2;
    const h = c.height - pad*2;

    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad,pad);
    ctx.lineTo(pad,pad+h);
    ctx.lineTo(pad+w,pad+h);
    ctx.stroke();

    ctx.strokeStyle = '#ff6a00';
    ctx.lineWidth = 2;

    ctx.beginPath();
    values.forEach((v,i)=>{
        const x = pad + (w/(values.length-1||1))*i;
        const y = pad + h - ((v-min)/((max-min)||1))*h;

        if(i===0) ctx.moveTo(x,y);
        else ctx.lineTo(x,y);

        ctx.beginPath();
        ctx.fillStyle = '#ff6a00';
        ctx.arc(x,y,3,0,Math.PI*2);
        ctx.fill();
    });
    ctx.stroke();
}

/* histórico */
function salvarHistorico(){
    historico.push({
        nome: state.name,
        data: new Date().toLocaleDateString(),
        calorias: Math.round((state.work*state.rounds)*0.17)
    });
    localStorage.setItem('rv_hist', JSON.stringify(historico));
}

function renderHistorico(){
    historicoTreinos.innerHTML = '';
    if(historico.length===0){
        historicoTreinos.innerHTML = '<div>Nenhum treino registrado</div>';
        return;
    }
    historico.forEach(h=>{
        const d = document.createElement('div');
        d.textContent = `${h.data} — ${h.nome} — ${h.calorias} kcal`;
        historicoTreinos.appendChild(d);
    });
}

/* badges */
const BADGES = {
    primeiro:"Primeiro Treino",
    cinco:"5 Treinos",
    dez:"10 Treinos",
    pesoMenos2:"Perdeu 2kg",
    semanaCheia:"Semana Perfeita"
};

function verificarConquistas(){
    const total = historico.length;
    if(total>=1) addBadge('primeiro');
    if(total>=5) addBadge('cinco');
    if(total>=10) addBadge('dez');
}

function verificarConquistasPeso(inicial, atual){
    if(inicial - atual >= 2) addBadge('pesoMenos2');
}

function addBadge(key){
    if(!conquistas.includes(key)){
        conquistas.push(key);
        localStorage.setItem('rv_badges', JSON.stringify(conquistas));
    }
    renderBadges();
}

function renderBadges(){
    badgesContainer.innerHTML = '';
    if(conquistas.length===0){
        badgesContainer.innerHTML = '<div>Nenhuma conquista</div>';
        return;
    }
    conquistas.forEach(k=>{
        const b = document.createElement('div');
        b.className = 'badge';
        b.textContent = BADGES[k] || k;
        badgesContainer.appendChild(b);
    });
}

/* meta semanal */
metaSemanalInput.addEventListener('input', ()=> calcularMetaSemanal());

function calcularMetaSemanal(){
    const agora = new Date();
    const semana = historico.filter(h=>{
        const p = h.data.split('/').reverse().join('-');
        const d = new Date(p);
        return (agora - d) <= 7*24*60*60*1000;
    });

    const feitos = semana.length;
    const meta = parseInt(metaSemanalInput.value || 0);

    if(!meta){
        metaStatus.textContent = "Nenhuma meta definida.";
        return;
    }

    metaStatus.textContent = `Você treinou ${feitos}/${meta} essa semana.`;

    if(feitos >= meta) addBadge('semanaCheia');
}

/* ----------------- INIT ----------------- */
function init(){
    loadPresetsList();
    syncFromInputs();
    syncToDisplay();
    renderExercises();
    renderHistorico();
    renderBadges();
    gerarGraficoPeso();

    state.phase = state.prepare>0 ? 'prepare' : 'work';
    state.timeLeft = state.phase === 'prepare' ? state.prepare : state.work;

    updateUI();
}

init();
