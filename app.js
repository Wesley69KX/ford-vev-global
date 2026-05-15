// ====================================================
// 1. CONFIGURAÇÃO DO FIREBASE
// ====================================================
const firebaseConfig = {
    apiKey: "AIzaSyCY5aZ2WzeY8miMomN3OgR6al4psXGnE3A",
    authDomain: "ford-vev.firebaseapp.com",
    databaseURL: "https://ford-vev-default-rtdb.firebaseio.com",
    projectId: "ford-vev",
    storageBucket: "ford-vev.firebasestorage.app",
    messagingSenderId: "391022165832",
    appId: "1:391022165832:web:cfa6c741c946a030b37d7d",
    measurementId: "G-EDFWJB8XE3"
};

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const db = firebase.database();

// ====================================================
// 2. O CORAÇÃO DO APLICATIVO
// ====================================================
const app = {
    fotos: [], videosFiles: [], etapaAtualIndex: 0, checkins: [],
    operadorAtual: null, vinGlobal: "",
    etapaDesaceleracaoIndex: 0, checkinsDesaceleracao: [], ciclosFrenagem: [],
    
    logRodagem: [], rodagemDistanciaMts: 0, rastroGps: [],
    
    roteiroFrenagem: [
        "Pista Baixa - Volta 1", "Pista Baixa - Volta 2", "Pista Baixa - Volta 3", "Pista Baixa - Volta 4",
        "Pista Alta - Volta 1",  "Pista Alta - Volta 2",  "Pista Alta - Volta 3",  "Pista Alta - Volta 4"
    ],
    sequenciaDiasPares: [
        "Labirinto: 1ª volta + Mata-burro",  "Power Hop Hill", "Lombadas: 1ª passagem",
        "Pistas 1-2", "Pista 4-3", "Slalom", "Pista 4-3", "Slalom" , "Pistas 4-3", "Pistas 7-8", "Pistas 2-1", "Pistas 7-8", "P. de Baixa",
         "Pistas 1-2", "Pista 4-3", "Slalom", "Pista 4-3", "Slalom" , "Pistas 4-3", "Pistas 7-8", "Pistas 2-1", "Pistas 7-8", "P. de Baixa",
        "Pistas 1-2", "Pista 4-3", "Pista 5-8", "Pistas 4-3", "Pistas 5-8", "Pistas 4-3", "Pistas 9-10", "Pistas 2-1" , "Pistas 9-10", "P. de Baixa",
                "Pistas 1-2", "Pista 4-3", "Pista 5-8" , "Pistas 4-3", "Pistas 5-8", "Pistas 4-3", "Pistas 9-10",
        "Pista de Alta + bolacha", "Pista de Baixa + bolacha",
    ],
    roteiroDesaceleracao: [
        "Alta", "Alta", "Alta", "Alta (100 a 20km/h)",
        "Alta", "Alta", "Alta", "Alta (100 a 20km/h)",
        "Alta", "Alta", "Alta", "Alta (100 a 0km/h)",
        "Alta", "Alta", "Alta", "Alta (100 a 20km/h)",
        "Power Hop Hill", "Enrola Camisa", "Enrola Camisa", "Power Hop Hill"
    ],

    init() { this.verificarSessao(); },

    obterDataDoTurno() {
        let data = new Date();
        if (data.getHours() < 3) { data.setDate(data.getDate() - 1); }
        return data.toISOString().split('T')[0]; 
    },

    setVin(valor) {
        this.vinGlobal = valor.toUpperCase();
        this.salvarEstadoHibrido();
    },

    salvarEstadoHibrido() {
        if (!this.operadorAtual) return;
        const dataHoje = this.obterDataDoTurno();
        const estado = {
            data: dataHoje, vinGlobal: this.vinGlobal,
            etapaAtualIndex: this.etapaAtualIndex, checkins: this.checkins,
            etapaDesaceleracaoIndex: this.etapaDesaceleracaoIndex, checkinsDesaceleracao: this.checkinsDesaceleracao,
            ciclosFrenagem: this.ciclosFrenagem,
            logRodagem: this.logRodagem, rodagemDistanciaMts: this.rodagemDistanciaMts,
            rastroGps: this.rastroGps,
            ultimaAtualizacao: new Date().toLocaleTimeString('pt-BR')
        };
        db.ref(`vev_turnos/${dataHoje}/${this.operadorAtual}`).set(estado).catch(err => console.log("Erro Firebase:", err));
        localStorage.setItem(`vev_estado_backup_${this.operadorAtual}`, JSON.stringify(estado));
    },

    async carregarEstadoHibrido() {
        if (!this.operadorAtual) return;
        const dataHoje = this.obterDataDoTurno();
        try {
            const snapshot = await db.ref(`vev_turnos/${dataHoje}/${this.operadorAtual}`).once('value');
            const estadoNuvem = snapshot.val();
            if (estadoNuvem) {
                this.vinGlobal = estadoNuvem.vinGlobal || "";
                if(document.getElementById('global-vin')) document.getElementById('global-vin').value = this.vinGlobal;
                this.etapaAtualIndex = estadoNuvem.etapaAtualIndex || 0; this.checkins = estadoNuvem.checkins || [];
                this.etapaDesaceleracaoIndex = estadoNuvem.etapaDesaceleracaoIndex || 0; this.checkinsDesaceleracao = estadoNuvem.checkinsDesaceleracao || [];
                this.ciclosFrenagem = estadoNuvem.ciclosFrenagem || [];
                this.logRodagem = estadoNuvem.logRodagem || []; this.rodagemDistanciaMts = estadoNuvem.rodagemDistanciaMts || 0;
                this.rastroGps = estadoNuvem.rastroGps || [];
            } else { this.restaurarBackupLocal(); }
        } catch (error) { this.restaurarBackupLocal(); }
        
        this.atualizarInterfaceCola(); this.atualizarInterfaceDesaceleracao(); this.renderListaFrenagem(); this.renderLogRodagem();
    },

    restaurarBackupLocal() {
        const salvoLocal = localStorage.getItem(`vev_estado_backup_${this.operadorAtual}`);
        const dataHoje = this.obterDataDoTurno(); 
        
        if (salvoLocal) {
            const estadoLocal = JSON.parse(salvoLocal);
            if (estadoLocal.data === dataHoje) {
                this.vinGlobal = estadoLocal.vinGlobal || "";
                if(document.getElementById('global-vin')) document.getElementById('global-vin').value = this.vinGlobal;
                this.etapaAtualIndex = estadoLocal.etapaAtualIndex || 0; this.checkins = estadoLocal.checkins || [];
                this.etapaDesaceleracaoIndex = estadoLocal.etapaDesaceleracaoIndex || 0; this.checkinsDesaceleracao = estadoLocal.checkinsDesaceleracao || [];
                this.ciclosFrenagem = estadoLocal.ciclosFrenagem || [];
                this.logRodagem = estadoLocal.logRodagem || []; this.rodagemDistanciaMts = estadoLocal.rodagemDistanciaMts || 0;
                this.rastroGps = estadoLocal.rastroGps || [];
                return; 
            }
        }
        this.vinGlobal = ""; if(document.getElementById('global-vin')) document.getElementById('global-vin').value = "";
        this.etapaAtualIndex = 0; this.checkins = []; this.etapaDesaceleracaoIndex = 0; this.checkinsDesaceleracao = []; this.ciclosFrenagem = []; this.logRodagem = []; this.rodagemDistanciaMts = 0; this.rastroGps = [];
    },

    verificarSessao() {
        const usuarioSalvo = localStorage.getItem("app_vev_operador");
        if (usuarioSalvo) {
            this.operadorAtual = usuarioSalvo; document.getElementById("ui-nome-usuario").innerText = usuarioSalvo;
            document.getElementById("modal-login").style.display = "none"; document.body.style.overflow = "auto";
            this.carregarEstadoHibrido();
        } else {
            document.getElementById("modal-login").style.display = "flex"; document.body.style.overflow = "hidden";
        }
    },

    efetuarLogin() {
        const nomeDigitado = document.getElementById("login-nome").value.trim().toUpperCase();
        const senhaDigitada = document.getElementById("login-senha").value.trim();
        if (nomeDigitado.length < 3) return alert("Digite seu nome completo.");
        const USUARIOS_PERMITIDOS = ["WESLEY SILVA", "JOAO OLIVEIRA" , "HEBER PAES" , "TESTE" , "GILSOM OLIVEIRA" , "PAULA BARBOSA " , "RENATA MUNAKATA", "CARLA CERPE" , "RAFAEL TORRES" , "CAIO CORTEZ" , "JOAO GAUDENCI" ]; 
        const SENHA_CORRETA = "1234";

        let usuarioExiste = false; for(let i=0; i < USUARIOS_PERMITIDOS.length; i++) { if(nomeDigitado.includes(USUARIOS_PERMITIDOS[i])) { usuarioExiste = true; break; } }
        if (!usuarioExiste) return alert("❌ Operador não cadastrado no sistema.");
        if (senhaDigitada !== SENHA_CORRETA) return alert("❌ PIN Incorreto.");

        localStorage.setItem("app_vev_operador", document.getElementById("login-nome").value.trim());
        this.verificarSessao(); document.getElementById("login-nome").value = ""; document.getElementById("login-senha").value = "";
    },

    efetuarLogout() {
        if(confirm("Deseja encerrar seu turno? Os dados ficarão salvos na nuvem para hoje.")) {
            localStorage.removeItem("app_vev_operador"); this.operadorAtual = null; document.getElementById("ui-nome-usuario").innerText = "NÃO LOGADO";
            this.vinGlobal = ""; if(document.getElementById('global-vin')) document.getElementById('global-vin').value = "";
            this.etapaAtualIndex = 0; this.checkins = []; this.etapaDesaceleracaoIndex = 0; this.checkinsDesaceleracao = []; this.ciclosFrenagem = []; this.logRodagem = []; this.rodagemDistanciaMts = 0; this.rastroGps = [];
            this.verificarSessao();
        }
    },

    // HISTÓRICO DE 7 DIAS 
    async abrirModalHistorico() {
        appUI.abrirModal('modal-historico'); const container = document.getElementById('lista-historico-nuvem');
        container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #fff;">Buscando seus relatórios antigos...</div>';
        try {
            const snapshot = await db.ref('vev_turnos').orderByKey().limitToLast(7).once('value'); const dias = snapshot.val();
            if (!dias) { container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #fff;">Nenhum histórico encontrado na nuvem.</div>'; return; }
            let html = ''; const datasKeys = Object.keys(dias).reverse(); let encontrouAlgum = false;
            datasKeys.forEach(dataString => {
                const turnosDoDia = dias[dataString]; const meunome = this.operadorAtual; 
                if (turnosDoDia && turnosDoDia[meunome]) {
                    encontrouAlgum = true; const dadosOp = turnosDoDia[meunome];
                    const tFren = (dadosOp.ciclosFrenagem || []).length; const tR389 = (dadosOp.checkins || []).length; const tDesacel = (dadosOp.checkinsDesaceleracao || []).length;
                    html += `<div style="background: rgba(255,255,255,0.1); border-radius: 12px; margin-bottom: 15px; overflow: hidden;"><div style="background: rgba(255,255,255,0.2); padding: 10px 15px; font-weight: bold; color: #fff;">🗓️ Data: ${dataString.split('-').reverse().join('/')}</div><div style="padding: 12px 15px; display: flex; justify-content: space-between; align-items: center;"><div><strong style="color: var(--neon-blue); font-size: 1.1rem;">👤 Seus Testes</strong><br><span style="font-size: 0.8rem; color: #ccc;">Fren: ${tFren} | R389: ${tR389} | Desacel: ${tDesacel}</span></div><button onclick="app.baixarRelatorioAntigo('${dataString}', '${meunome}')" style="background: var(--neon-blue); color: #000; border: none; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer;">BAIXAR PDF</button></div></div>`;
                }
            });
            if (!encontrouAlgum) { html = '<div style="text-align: center; padding: 2rem; color: #fff;">Você não possui testes registrados nos últimos 7 dias.</div>'; }
            container.innerHTML = html;
        } catch (e) { container.innerHTML = '<div style="text-align: center; padding: 2rem; color: red;">Erro ao buscar no banco de dados.</div>'; }
    },

    async baixarRelatorioAntigo(dataString, operador) {
        try {
            const snapshot = await db.ref(`vev_turnos/${dataString}/${operador}`).once('value'); const dadosOp = snapshot.val();
            if(!dadosOp) return alert("Dados não encontrados.");
            const { jsPDF } = window.jspdf; const doc = new jsPDF();
            doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 30, 'F'); doc.setTextColor(255, 255, 255); doc.setFontSize(14); 
            doc.text(`RELATÓRIO HISTÓRICO - ${dataString.split('-').reverse().join('/')}`, 105, 15, { align: "center" });
            doc.setFontSize(10); doc.text(`Operador: ${operador}`, 105, 22, { align: "center" });
            let currentY = 35; doc.setTextColor(0, 0, 0);

            if (dadosOp.ciclosFrenagem && dadosOp.ciclosFrenagem.length > 0) {
                doc.text("FRENAGEM:", 14, currentY);
                const tableData = dadosOp.ciclosFrenagem.map(f => [`C${f.ciclo}`, f.etapa, f.hora, f.observacao || "OK"]);
                doc.autoTable({ startY: currentY + 5, head: [['CICLO', 'ETAPA', 'HORA', 'STATUS']], body: tableData }); currentY = doc.lastAutoTable.finalY + 15;
            }
            if (dadosOp.checkins && dadosOp.checkins.length > 0) {
                doc.text("R389:", 14, currentY);
                const tableData = dadosOp.checkins.map((c, i) => [i+1, c.atividade, c.hora]);
                doc.autoTable({ startY: currentY + 5, head: [['#', 'ATIVIDADE', 'HORA']], body: tableData }); currentY = doc.lastAutoTable.finalY + 15;
            }
            if (dadosOp.checkinsDesaceleracao && dadosOp.checkinsDesaceleracao.length > 0) {
                doc.text("DESACELERAÇÃO 16 LAPS:", 14, currentY);
                const tableData = dadosOp.checkinsDesaceleracao.map((c, i) => [i+1, c.atividade, c.hora]);
                doc.autoTable({ startY: currentY + 5, head: [['LAP/ETAPA', 'ATIVIDADE', 'HORA']], body: tableData }); currentY = doc.lastAutoTable.finalY + 15;
            }
            if (dadosOp.logRodagem && dadosOp.logRodagem.length > 0) {
                doc.text("RODAGEM LIVRE (EVENTOS EXTREMOS):", 14, currentY);
                const tableData = dadosOp.logRodagem.map(c => [c.hora, c.evento, c.forca, c.vel]);
                doc.autoTable({ startY: currentY + 5, head: [['HORA', 'EVENTO', 'INTENSIDADE', 'VELOCIDADE']], body: tableData, headStyles: { fillColor: [34, 211, 238], textColor: [0,0,0] } });
            }
            doc.save(`Historico_${operador.split(' ')[0]}_${dataString}.pdf`);
        } catch (e) { alert("Erro ao gerar PDF."); }
    },

    async melhorarTextoComIA(botao) {
        const textarea = document.getElementById('i-obs'); const textoOriginal = textarea.value.trim(); const modeloEscolhido = document.getElementById('seletor-ia').value;
        if (textoOriginal === "") return alert("Digite algo antes de usar a IA.");
        if (textoOriginal.toUpperCase() === "RESETAR") { localStorage.removeItem("cofre_chave_gemini"); textarea.value = ""; return alert("Chave apagada!"); }
        
        botao.innerHTML = '...';
        const promptComando = "Você é um algoritmo de conversão de texto. Atue como Analista de Produto Automotivo. Melhore tecnicamente e formalize o texto a seguir para um laudo de avaria de pista. REGRAS ESTRITAS DE SAÍDA: 1. NÃO altere os fatos. 2. NÃO adicione informações que não estão no original. 3. NÃO use nenhuma formatação Markdown. 4. RETORNE EXCLUSIVAMENTE O TEXTO REESCRITO. Texto original: " + textoOriginal;

        try {
            if (modeloEscolhido === "FORD") {
                alert("Para usar a IA Corporativa, solicite o 'Endpoint URL' e o 'API Token' para a TI."); botao.innerHTML = '<span class="material-icons" style="font-size: 1rem;">auto_awesome</span> Melhorar'; return;
            } else if (modeloEscolhido === "PESSOAL") {
                let API_KEY = localStorage.getItem("cofre_chave_gemini");
                if (!API_KEY) { API_KEY = prompt("Cole sua Chave API do Google:"); if (!API_KEY) { botao.innerHTML = '<span class="material-icons" style="font-size: 1rem;">auto_awesome</span> Melhorar'; return; } localStorage.setItem("cofre_chave_gemini", API_KEY.trim()); }
                const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
                const resposta = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: promptComando }] }] }) });
                const dados = await resposta.json(); if (dados.candidates) { textarea.value = dados.candidates[0].content.parts[0].text.trim(); }
            }
        } catch (e) { alert("Erro na comunicação com a IA."); }
        botao.innerHTML = '<span class="material-icons" style="font-size: 1rem;">auto_awesome</span> Melhorar';
    },

    // =====================================
    // CONTROLES DE PISTA E LOGS
    // =====================================
    registrarPassagem(forcarVindoDoCopiloto = false) {
        if (this.etapaAtualIndex >= this.sequenciaDiasPares.length) return this.novaVolta(forcarVindoDoCopiloto); 
        const nomeEtapa = this.sequenciaDiasPares[this.etapaAtualIndex]; const vin = this.vinGlobal || "NÃO INFORMADO";
        this.checkins.push({ atividade: nomeEtapa, hora: new Date().toLocaleTimeString('pt-BR'), vin: vin, operador: this.operadorAtual });
        if ('vibrate' in navigator) navigator.vibrate(50); this.etapaAtualIndex++; this.salvarEstadoHibrido(); this.atualizarInterfaceCola();
    },

    novaVolta(forcarVindoDoCopiloto = false) {
        if(forcarVindoDoCopiloto || confirm("Iniciar nova volta na R389?")) {
            this.etapaAtualIndex = 0; const vin = this.vinGlobal || "NÃO INFORMADO";
            this.checkins.push({ atividade: "--- NOVA SÉRIE R389 ---", hora: new Date().toLocaleTimeString('pt-BR'), vin: vin, operador: this.operadorAtual });
            this.salvarEstadoHibrido(); this.atualizarInterfaceCola();
        }
    },

    atualizarInterfaceCola() {
        if (this.etapaAtualIndex < this.sequenciaDiasPares.length) { document.getElementById('etapa-atual').innerText = this.sequenciaDiasPares[this.etapaAtualIndex]; } else { document.getElementById('etapa-atual').innerText = "✅ CICLO R389 CONCLUÍDO"; }
        const lista = document.getElementById('lista-cola');
        lista.innerHTML = this.sequenciaDiasPares.map((e, i) => `<div class="log-item ${i < this.etapaAtualIndex ? 'concluido' : (i === this.etapaAtualIndex ? 'ativo' : '')}"><span class="material-icons" style="color: ${i === this.etapaAtualIndex ? 'var(--accent)' : 'inherit'};">${i < this.etapaAtualIndex ? 'check_circle' : 'radio_button_unchecked'}</span>${e}</div>`).join('');
        setTimeout(() => { const itemAtivo = document.querySelector('#lista-cola .log-item.ativo'); if(itemAtivo) itemAtivo.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100);
    },
    resetarRoteiro() { if(confirm("APAGAR os registros do R389?")) { this.etapaAtualIndex = 0; this.checkins = []; this.salvarEstadoHibrido(); this.atualizarInterfaceCola(); } },
    async gerarRelatorioRoteiro() {
        if (this.checkins.length === 0) return alert("Sem registros."); const vin = this.vinGlobal || "N/A";
        const { jsPDF } = window.jspdf; const doc = new jsPDF(); doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 40, 'F'); doc.setTextColor(168, 85, 247); doc.setFontSize(16); doc.text("LOG DE CICLOS (R389)", 105, 20, { align: "center" }); doc.setFontSize(10); doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')} | Analista: ${this.operadorAtual} | VIN: ${vin}`, 105, 28, { align: "center" });
        const dadosTabela = this.checkins.map((c, i) => [i + 1, c.atividade, c.hora]); doc.autoTable({ startY: 45, head: [['#', 'CICLO / ETAPA', 'HORA']], body: dadosTabela, headStyles: { fillColor: [168, 85, 247], textColor: [255,255,255] }, didParseCell: function(data) { if(data.row.raw[1].includes("--- INÍCIO") || data.row.raw[1].includes("--- NOVA")) { data.cell.styles.fillColor = [241, 245, 249]; data.cell.styles.fontStyle = 'bold'; } } });
        doc.save(`Log_R389_${this.operadorAtual.split(' ')[0]}.pdf`);
    },

    registrarPassagemDesaceleracao(forcarVindoDoCopiloto = false) {
        if (this.etapaDesaceleracaoIndex >= this.roteiroDesaceleracao.length) return this.novaVoltaDesaceleracao(forcarVindoDoCopiloto); 
        const nomeEtapa = this.roteiroDesaceleracao[this.etapaDesaceleracaoIndex]; const vin = this.vinGlobal || "NÃO INFORMADO";
        this.checkinsDesaceleracao.push({ atividade: nomeEtapa, hora: new Date().toLocaleTimeString('pt-BR'), vin: vin, operador: this.operadorAtual });
        if ('vibrate' in navigator) navigator.vibrate(50); this.etapaDesaceleracaoIndex++; this.salvarEstadoHibrido(); this.atualizarInterfaceDesaceleracao();
    },
    novaVoltaDesaceleracao(forcarVindoDoCopiloto = false) {
        if(forcarVindoDoCopiloto || confirm("Iniciar novo ciclo?")) {
            this.etapaDesaceleracaoIndex = 0; const vin = this.vinGlobal || "NÃO INFORMADO";
            this.checkinsDesaceleracao.push({ atividade: "--- NOVO CICLO DE DESACELERAÇÃO ---", hora: new Date().toLocaleTimeString('pt-BR'), vin: vin, operador: this.operadorAtual });
            this.salvarEstadoHibrido(); this.atualizarInterfaceDesaceleracao();
        }
    },
    atualizarInterfaceDesaceleracao() {
        if (this.etapaDesaceleracaoIndex < this.roteiroDesaceleracao.length) { document.getElementById('etapa-desaceleracao-atual').innerText = this.roteiroDesaceleracao[this.etapaDesaceleracaoIndex]; } else { document.getElementById('etapa-desaceleracao-atual').innerText = "✅ TESTE CONCLUÍDO"; }
        const lista = document.getElementById('lista-desaceleracao');
        lista.innerHTML = this.roteiroDesaceleracao.map((e, i) => `<div class="log-item ${i < this.etapaDesaceleracaoIndex ? 'concluido' : (i === this.etapaDesaceleracaoIndex ? 'ativo' : '')}"><span class="material-icons" style="color: ${i === this.etapaDesaceleracaoIndex ? 'var(--accent)' : 'inherit'};">${i < this.etapaDesaceleracaoIndex ? 'check_circle' : 'radio_button_unchecked'}</span>${i + 1}. ${e}</div>`).join('');
        setTimeout(() => { const itemAtivo = document.querySelector('#lista-desaceleracao .log-item.ativo'); if(itemAtivo) itemAtivo.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100);
    },
    resetarDesaceleracao() { if(confirm("APAGAR os registros?")) { this.etapaDesaceleracaoIndex = 0; this.checkinsDesaceleracao = []; this.salvarEstadoHibrido(); this.atualizarInterfaceDesaceleracao(); } },
    async gerarRelatorioDesaceleracao() {
        if (this.checkinsDesaceleracao.length === 0) return alert("Sem registros."); const vin = this.vinGlobal || "N/A";
        const { jsPDF } = window.jspdf; const doc = new jsPDF(); doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 40, 'F'); doc.setTextColor(236, 72, 153); doc.setFontSize(16); doc.text("LOG DE DESACELERAÇÃO (16 LAPS)", 105, 20, { align: "center" }); doc.setFontSize(10); doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')} | Analista: ${this.operadorAtual} | VIN: ${vin}`, 105, 28, { align: "center" });
        const dadosTabela = this.checkinsDesaceleracao.map((c, i) => [i + 1, c.atividade, c.hora]); doc.autoTable({ startY: 45, head: [['LAP / ETAPA', 'ATIVIDADE', 'HORA']], body: dadosTabela, headStyles: { fillColor: [236, 72, 153], textColor: [255,255,255] }, didParseCell: function(data) { if(data.row.raw[1].includes("--- NOVO")) { data.cell.styles.fillColor = [253, 232, 243]; data.cell.styles.fontStyle = 'bold'; } } });
        doc.save(`Log_Desaceleracao_${this.operadorAtual.split(' ')[0]}.pdf`);
    },

    registrarVoltaFrenagem() {
        const totalVoltas = this.ciclosFrenagem.length; const indexNoCiclo = totalVoltas % 8; const numeroCicloAtual = Math.floor(totalVoltas / 8) + 1; const nomeEtapa = this.roteiroFrenagem[indexNoCiclo]; const obs = document.getElementById('f-obs').value || "OK"; const vin = this.vinGlobal || "NÃO INFORMADO";
        this.ciclosFrenagem.push({ ciclo: numeroCicloAtual, etapa: nomeEtapa, observacao: obs, hora: new Date().toLocaleTimeString('pt-BR'), operador: this.operadorAtual, vin: vin });
        document.getElementById('f-obs').value = ''; if ('vibrate' in navigator) navigator.vibrate(50); this.salvarEstadoHibrido(); this.renderListaFrenagem();
    },
    renderListaFrenagem() {
        const totalVoltas = this.ciclosFrenagem.length; const numeroCicloAtual = Math.floor(totalVoltas / 8) + 1; const indexNoCiclo = totalVoltas % 8; const voltaAtual = indexNoCiclo + 1;
        document.getElementById('f-ciclo-atual').innerText = `CICLO ${numeroCicloAtual}`; document.getElementById('f-progresso-ciclo').innerText = `Lap ${voltaAtual}/8`; document.getElementById('f-proxima-etapa').innerText = this.roteiroFrenagem[indexNoCiclo];
        const lista = document.getElementById('lista-frenagem'); if(totalVoltas === 0) return lista.innerHTML = '<div style="color: #475569; text-align: center; padding: 1rem;">Nenhuma volta registrada.</div>';
        let htmlLista = ''; const listaReversa = [...this.ciclosFrenagem].reverse(); let cicloAnterior = null;
        listaReversa.forEach((f, i) => {
            if (f.ciclo !== cicloAnterior && cicloAnterior !== null) { htmlLista += `<div style="background: rgba(16, 185, 129, 0.1); color: var(--success); padding: 8px; text-align: center; font-size: 0.85rem; font-weight: bold; border-top: 1px solid rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.05);">✅ FIM DO CICLO ${cicloAnterior}</div>`; }
            cicloAnterior = f.ciclo; htmlLista += `<div class="log-item" style="justify-content: space-between;"><div><strong style="color: var(--text-primary);">${f.etapa}</strong><br><span style="color: var(--text-secondary);">Obs: ${f.observacao}</span></div><div style="text-align: right; opacity: 0.6;"><div style="font-size: 0.75rem;">${f.hora}</div><div style="font-size: 0.75rem; font-weight: bold; color: var(--accent);">C${f.ciclo}</div></div></div>`;
        });
        lista.innerHTML = htmlLista;
    },
    resetarFrenagem() { if(confirm("APAGAR os dados?")) { this.ciclosFrenagem = []; this.salvarEstadoHibrido(); this.renderListaFrenagem(); } },
    async gerarRelatorioFrenagem() {
        if(this.ciclosFrenagem.length === 0) return alert("Nenhum dado."); const vin = this.vinGlobal || "N/A";
        const { jsPDF } = window.jspdf; const doc = new jsPDF(); doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 40, 'F'); doc.setTextColor(249, 115, 22); doc.setFontSize(16); doc.text("LOG DETALHADO DE FRENAGEM", 105, 20, { align: "center" }); doc.setFontSize(10); doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')} | Analista: ${this.operadorAtual} | VIN: ${vin}`, 105, 28, { align: "center" });
        const dados = this.ciclosFrenagem.map(f => [`Ciclo ${f.ciclo}`, f.etapa, f.hora, f.observacao]); doc.autoTable({ startY: 45, head: [['CICLO', 'VOLTA / ETAPA', 'HORA', 'STATUS']], body: dados, headStyles: { fillColor: [249, 115, 22] }, didParseCell: function(data) { if(data.row.index > 0 && data.row.raw[0] !== data.table.body[data.row.index - 1].raw[0]) { data.cell.styles.lineWidth = { top: 1 }; data.cell.styles.lineColor = [249, 115, 22]; } } });
        doc.save(`Log_Fren_${this.operadorAtual.split(' ')[0]}.pdf`);
    },

    // RODAGEM LIVRE E TRACE
    renderLogRodagem() {
        const lista = document.getElementById('lista-rodagem');
        if(this.logRodagem.length === 0) return lista.innerHTML = '<div style="color: #475569; text-align: center; padding: 1rem;">Nenhum evento severo detectado.</div>';
        let htmlLista = '';
        const listaReversa = [...this.logRodagem].reverse();
        listaReversa.forEach(f => {
            htmlLista += `<div class="log-item" style="justify-content: space-between; border-left: 4px solid var(--neon-cyan); background: rgba(34, 211, 238, 0.05); margin-bottom: 5px; border-radius: 8px;"><div><strong style="color: var(--neon-cyan);">${f.evento}</strong><br><span style="color: var(--text-secondary); font-size: 0.8rem;">Intensidade: ${f.forca} | Vel: ${f.vel}</span></div><div style="text-align: right; opacity: 0.6; font-size: 0.75rem;">${f.hora}</div></div>`;
        });
        lista.innerHTML = htmlLista;
    },
    resetarRodagem() { if(confirm("APAGAR todo o histórico de viagem, caixa preta e o traçado do mapa?")) { this.logRodagem = []; this.rastroGps = []; this.salvarEstadoHibrido(); this.renderLogRodagem(); } },
    async gerarRelatorioRodagem() {
        if(this.logRodagem.length === 0) return alert("Nenhum evento registrado."); const vin = this.vinGlobal || "N/A";
        const { jsPDF } = window.jspdf; const doc = new jsPDF(); doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 40, 'F'); doc.setTextColor(34, 211, 238); doc.setFontSize(16); doc.text("CAIXA PRETA: EVENTOS EXTREMOS", 105, 20, { align: "center" }); doc.setFontSize(10); doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')} | Analista: ${this.operadorAtual} | VIN: ${vin}`, 105, 28, { align: "center" });
        const dados = this.logRodagem.map(f => [f.hora, f.evento, f.forca, f.vel]); doc.autoTable({ startY: 45, head: [['HORA', 'EVENTO', 'INTENSIDADE G', 'VELOCIDADE MOMENTO']], body: dados, headStyles: { fillColor: [34, 211, 238], textColor: [0,0,0] } });
        doc.save(`RodagemLivre_${this.operadorAtual.split(' ')[0]}.pdf`);
    },

    // RESUMO PDF GERAL
    gerarRelatorioResumo() {
        if (this.checkins.length === 0 && this.ciclosFrenagem.length === 0 && this.checkinsDesaceleracao.length === 0 && this.rodagemDistanciaMts === 0) return alert("Sem dados no turno.");
        const vin = this.vinGlobal || "NÃO INFORMADO";
        const resumoR389 = {}; this.checkins.forEach(r => { if(!r.atividade.includes("---")) { let nome = r.atividade.split(':')[0].trim(); resumoR389[nome] = (resumoR389[nome] || 0) + 1; } });
        const resumoDesaceleracao = {}; this.checkinsDesaceleracao.forEach(r => { if(!r.atividade.includes("---")) { resumoDesaceleracao[r.atividade] = (resumoDesaceleracao[r.atividade] || 0) + 1; } });
        const totalVoltasFrenagem = this.ciclosFrenagem.length; const ciclosCompletosFrenagem = Math.floor(totalVoltasFrenagem / 8); const voltasRestantesBaixa = Math.min(totalVoltasFrenagem % 8, 4); const voltasRestantesAlta = Math.max(0, (totalVoltasFrenagem % 8) - 4);

        const { jsPDF } = window.jspdf; const doc = new jsPDF(); doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 40, 'F'); doc.setTextColor(56, 189, 248); doc.setFontSize(16); doc.text("RESUMO GERAL DO TURNO", 105, 20, { align: "center" }); doc.setFontSize(10); doc.text(`VIN: ${vin} | DATA: ${new Date().toLocaleDateString('pt-BR')} | OP: ${this.operadorAtual}`, 105, 28, { align: "center" });
        let currentY = 45;

        // Adiciona Tracker Livre no Resumo Geral
        if (this.rodagemDistanciaMts > 0) {
            doc.setTextColor(0, 0, 0); doc.setFontSize(12); doc.setFont(undefined, 'bold'); doc.text("RESUMO: TRACKER LIVRE (GPS)", 14, currentY);
            const distKm = (this.rodagemDistanciaMts / 1000).toFixed(2);
            doc.autoTable({ startY: currentY + 5, body: [['Distância Total Mapeada', `${distKm} km`], ['Eventos Extremos Registrados', `${this.logRodagem.length}`]], theme: 'grid', headStyles: { fillColor: [34, 211, 238], textColor: [0,0,0] }, columnStyles: { 0: { fontStyle: 'bold', cellWidth: 100 } } }); currentY = doc.lastAutoTable.finalY + 15;
        }
        if (totalVoltasFrenagem > 0) {
            doc.setTextColor(0, 0, 0); doc.setFontSize(12); doc.setFont(undefined, 'bold'); doc.text("RESUMO: TESTE DE FRENAGEM", 14, currentY);
            const tabelaFrenagem = [ ['Ciclos Completos (8 Voltas)', `${ciclosCompletosFrenagem} Ciclo(s)`], ['Voltas Extra (Pista Baixa)', `${voltasRestantesBaixa} Volta(s)`], ['Voltas Extra (Pista Alta)', `${voltasRestantesAlta} Volta(s)`], ['TOTAL GERAL DE VOLTAS', `${totalVoltasFrenagem} Volta(s)`] ]; doc.autoTable({ startY: currentY + 5, body: tabelaFrenagem, theme: 'grid', headStyles: { fillColor: [249, 115, 22] }, columnStyles: { 0: { fontStyle: 'bold', cellWidth: 100 } } }); currentY = doc.lastAutoTable.finalY + 15;
        }
        if (Object.keys(resumoR389).length > 0) {
            doc.setTextColor(0, 0, 0); doc.setFontSize(12); doc.setFont(undefined, 'bold'); doc.text("RESUMO: CICLOS R389", 14, currentY);
            const tabelaR389 = Object.keys(resumoR389).map(k => [k, `${resumoR389[k]} vezes`]); doc.autoTable({ startY: currentY + 5, head: [['PISTA / ATIVIDADE', 'TOTAL NO TURNO']], body: tabelaR389, headStyles: { fillColor: [168, 85, 247] } }); currentY = doc.lastAutoTable.finalY + 15;
        }
        if (Object.keys(resumoDesaceleracao).length > 0) {
            doc.setTextColor(0, 0, 0); doc.setFontSize(12); doc.setFont(undefined, 'bold'); doc.text("RESUMO: DESACELERAÇÃO 16 LAPS", 14, currentY);
            const tabelaDesaceleracao = Object.keys(resumoDesaceleracao).map(k => [k, `${resumoDesaceleracao[k]} passagens`]); doc.autoTable({ startY: currentY + 5, head: [['PISTA / ATIVIDADE', 'TOTAL NO TURNO']], body: tabelaDesaceleracao, headStyles: { fillColor: [236, 72, 153] } });
        }
        doc.save(`Resumo_${this.operadorAtual.split(' ')[0]}_${Date.now()}.pdf`);
    },

    // LAUDO IA FOTOS
    handleMedia(e) {
        Array.from(e.target.files).forEach(file => {
            if (file.type.startsWith('video/')) { this.videosFiles.push(file); this.renderGaleria();
            } else if (file.type.startsWith('image/')) {
                const reader = new FileReader(); reader.onload = (ev) => { this.comprimir(ev.target.result, 3840, 3840, (img) => { this.fotos.push({ src: img, legenda: '' }); this.renderGaleria(); }); }; reader.readAsDataURL(file);
            }
        }); e.target.value = '';
    },
    comprimir(base64, maxW, maxH, cb) {
        const img = new Image(); img.src = base64;
        img.onload = () => {
            const canvas = document.createElement('canvas'); let w = img.width, h = img.height;
            if (w > h) { if (w > maxW) { h *= maxW / w; w = maxW; } } else { if (h > maxH) { w *= maxH / h; h = maxH; } }
            canvas.width = w; canvas.height = h; const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(img, 0, 0, w, h); cb(canvas.toDataURL('image/jpeg', 1.0)); 
        };
    },
    removerFoto(index) { this.fotos.splice(index, 1); this.renderGaleria(); }, removerVideo(index) { this.videosFiles.splice(index, 1); this.renderGaleria(); },
    renderGaleria() {
        const g = document.getElementById('galeria-avaria'); let html = '';
        this.fotos.forEach((f, i) => { html += `<div class="photo-wrapper" style="position: relative; margin-bottom: 10px;"><button class="btn-delete-photo" onclick="app.removerFoto(${i})" style="position: absolute; top: 5px; right: 5px; background: rgba(239, 68, 68, 0.9); color: white; width: 28px; height: 28px; border-radius: 50%; border: none; cursor: pointer;">×</button><img src="${f.src}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 12px; display: block; border: 1px solid rgba(255,255,255,0.1);"><input type="text" placeholder="Legenda..." value="${f.legenda}" oninput="app.fotos[${i}].legenda=this.value" style="width: 100%; font-size: 0.75rem; padding: 8px; background: rgba(0,0,0,0.8); border: none; color: white; margin-top: 5px; border-radius: 6px;"></div>`; });
        this.videosFiles.forEach((v, i) => { html += `<div class="photo-wrapper" style="position: relative; margin-bottom: 10px; background: rgba(56, 189, 248, 0.1); border: 1px solid #38bdf8; border-radius: 12px; display:flex; flex-direction:column; align-items:center; justify-content:center; padding: 1rem;"><button class="btn-delete-photo" onclick="app.removerVideo(${i})" style="position: absolute; top: 5px; right: 5px; background: #0284c7; color: white; width: 28px; height: 28px; border-radius: 50%; border: none; cursor: pointer;">×</button><span class="material-icons" style="font-size: 3rem; color: #38bdf8;">movie</span><p style="font-size: 0.7rem; color: #38bdf8; font-weight: bold; margin-top: 10px; text-align: center;">${v.name}</p></div>`; });
        g.innerHTML = html;
    },
    resetarFormularioLaudo() { document.getElementById('i-obs').value = ''; this.fotos = []; this.videosFiles = []; this.renderGaleria(); },
    async gerarECompartilharLaudo() { 
        const id = this.vinGlobal || "NÃO INFORMADO"; const motorista = this.operadorAtual || "N/A"; const parecer = document.getElementById('i-obs').value || "Sem observações.";
        const { jsPDF } = window.jspdf; const doc = new jsPDF(); doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 30, 'F'); doc.setTextColor(56, 189, 248); doc.setFontSize(18); doc.text("LAUDO TÉCNICO", 14, 20); doc.setFontSize(12); doc.text(`VIN: ${id}`, 196, 20, { align: "right" }); doc.setTextColor(0, 0, 0); doc.autoTable({ startY: 35, body: [['Veículo / VIN:', id, 'Data:', new Date().toLocaleString('pt-BR')], ['Analista de Produto:', motorista, 'Assinatura (Auto):', 'Autenticado no App']], theme: 'grid' });
        let currentY = doc.lastAutoTable.finalY + 10; doc.setFont(undefined, 'bold'); doc.text("PARECER TÉCNICO:", 14, currentY); currentY += 6; doc.setFont(undefined, 'normal'); doc.text(doc.splitTextToSize(parecer, 178), 14, currentY);
        
        if (this.fotos.length > 0) { let y = currentY + 30; this.fotos.forEach((f, i) => { if (y > 200) { doc.addPage(); y = 20; } const imgProps = doc.getImageProperties(f.src); const ratio = imgProps.height / imgProps.width; doc.addImage(f.src, 'JPEG', 14, y, 90, 90 * ratio, undefined, 'FAST'); doc.text(`Evidência ${i+1}: ${f.legenda || ''}`, 14, y + (90 * ratio) + 6); y += (90 * ratio) + 15; }); }
        const pdfBlob = doc.output('blob'); const pdfNome = `Laudo_${id}_${motorista.split(' ')[0]}.pdf`; const pdfFile = new File([pdfBlob], pdfNome, { type: 'application/pdf' }); let arquivosParaCompartilhar = [pdfFile]; if (this.videosFiles.length > 0) { this.videosFiles.forEach(video => { arquivosParaCompartilhar.push(video); }); }
        if (navigator.canShare && navigator.canShare({ files: arquivosParaCompartilhar })) { try { await navigator.share({ files: arquivosParaCompartilhar, title: `Laudo - ${id}`, text: `Laudo Técnico por ${motorista}.` }); setTimeout(() => { this.resetarFormularioLaudo(); }, 1000); } catch (err) { doc.save(pdfNome); this.resetarFormularioLaudo(); } } else { alert("Seu aparelho bloqueou o envio nativo dos vídeos via app. O PDF será baixado."); doc.save(pdfNome); this.resetarFormularioLaudo(); }
    },

    async finalizarTurnoIntegrado() {
        const v = document.getElementById('t-veiculo').value || "Não informado"; const dataHoje = new Date().toLocaleDateString('pt-BR').substring(0, 5); const turno = document.getElementById('t-turno').value; const vin = this.vinGlobal || "NÃO INFORMADO"; const posto = document.getElementById('t-posto').value || "N/A"; const trip = document.getElementById('t-trip').value || "0"; const km = document.getElementById('t-km').value || "0"; const litros = document.getElementById('t-litros').value || "0"; const saldo = document.getElementById('t-saldo').value || "0";
        const texto = `*FECHAMENTO DE TURNO - VEV*\n*Operador:* ${this.operadorAtual}\n*Data:* ${dataHoje} (${turno})\n\n*🚗 Dados do Veículo:*\n*Modelo:* ${v}\n*VIN:* ${vin}\n\n*⛽ Abastecimento:*\n*Posto Base:* ${posto}\n*Odômetro:* ${km} km\n*Trip:* ${trip} km\n*Litragem:* ${litros} L\n*Saldo Atual:* R$ ${saldo}`;
        try { await navigator.clipboard.writeText(texto); alert("✅ Texto copiado! Cole no grupo do WhatsApp."); } catch (e) { alert("Erro ao copiar o texto. Tente novamente."); }
    }
};

window.onload = () => app.init();


// ====================================================
// 3. COPILOTO KX E ACELERÔMETRO (FUSÃO DE SENSORES)
// ====================================================
const COORD_ALTA = { lat: -23.392783132651925, lng: -47.91720937962347, raio: 85 };
const COORD_BAIXA = { lat: -23.398088084486734, lng: -47.92362656463522, raio: 40 };

const MAPA_PISTAS = {
    "Alta":                      COORD_ALTA, "Alta (100 a 20km/h)":       COORD_ALTA, "Alta (100 a 0km/h)":        COORD_ALTA,
    "P. de Baixa":               COORD_BAIXA, "Pista de Alta":             COORD_ALTA, "Pista Baixa - Volta 1":     COORD_BAIXA, "Pista Baixa - Volta 2":     COORD_BAIXA, "Pista Baixa - Volta 3":     COORD_BAIXA, "Pista Baixa - Volta 4":     COORD_BAIXA, "Pista Alta - Volta 1":      COORD_ALTA, "Pista Alta - Volta 2":      COORD_ALTA, "Pista Alta - Volta 3":      COORD_ALTA, "Pista Alta - Volta 4":      COORD_ALTA,
    "Labirinto: 1ª volta + Mata-burro": { lat: -23.389897, lng: -47.903750, raio: 30 }, "Power Hop Hill":            { lat: -23.389408, lng: -47.920772, raio: 30 }, "Lombadas: 1ª passagem":     { lat: -23.395171, lng: -47.920321, raio: 30 }, "Pistas 1-2":                { lat: -23.397242, lng: -47.924486, raio: 40 }, "Pista 4-3":                 { lat: -23.395709, lng: -47.923097, raio: 40 }, "Slalom":                    { lat: -23.397480, lng: -47.924208, raio: 40 }, "Pistas 7-8":                { lat: -23.397314, lng: -47.924327, raio: 40 }, "Pistas 2-1":                { lat: -23.396490, lng: -47.923867, raio: 40 }, "Pista 5-8":                 { lat: -23.397269, lng: -47.924365, raio: 40 }, "Pistas 9-10":               { lat: -23.397469, lng: -47.924218, raio: 40 }, "Pista de Alta + bolacha":   COORD_ALTA, "Pista de Baixa + bolacha":  COORD_BAIXA, "Enrola Camisa":             { lat: 0.000000, lng: 0.000000, raio: 40 } 
};

let rastreadorGpsID = null; let bloqueioTempo = false; let mapaTelemetria = null; let markerCarro = null; let circulosPistas = []; let cadeadoTela = null;
let memoriaRodagem = { ativa: false, ultimaPosicao: null, ultimoTempo: 0, velocidadeAnterior: 0, ultimoTempoTrace: 0 };
let ultimoEventoG = 0;

async function manterTelaLigada() { if ('wakeLock' in navigator) { try { if (cadeadoTela !== null) return; cadeadoTela = await navigator.wakeLock.request('screen'); cadeadoTela.addEventListener('release', () => { cadeadoTela = null; }); } catch (err) { } } }
function liberarTela() { if (cadeadoTela !== null) { cadeadoTela.release().then(() => { cadeadoTela = null; }); } }
document.addEventListener('visibilitychange', async () => { if (document.visibilityState === 'visible' && rastreadorGpsID !== null) { await manterTelaLigada(); } });

function falar(mensagem) { if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); const locutor = new SpeechSynthesisUtterance(mensagem); locutor.lang = 'pt-BR'; locutor.rate = 1.15; window.speechSynthesis.speak(locutor); } }
function calcularDistanciaMetros(lat1, lon1, lat2, lon2) { const R = 6371e3; const φ1 = lat1 * Math.PI/180; const φ2 = lat2 * Math.PI/180; const Δφ = (lat2-lat1) * Math.PI/180; const Δλ = (lon2-lon1) * Math.PI/180; const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2); const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); return R * c; }

function abrirMapaAoVivo() { 
    const container = document.getElementById('container-mapa'); container.style.display = 'block'; 
    if (!mapaTelemetria) { 
        mapaTelemetria = L.map('mapa-gps').setView([-23.395171, -47.920321], 15); 
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(mapaTelemetria); 
        Object.keys(MAPA_PISTAS).forEach(nome => { 
            const p = MAPA_PISTAS[nome]; 
            if (p.lat !== 0) { 
                let jaDesenhado = circulosPistas.some(c => c.getLatLng().lat === p.lat && c.getLatLng().lng === p.lng); 
                if(!jaDesenhado) { 
                    let circulo = L.circle([p.lat, p.lng], { color: '#38bdf8', fillColor: '#38bdf8', fillOpacity: 0.3, radius: p.raio }).addTo(mapaTelemetria).bindPopup(nome); circulosPistas.push(circulo); 
                } 
            } 
        }); 
    } 
    setTimeout(() => { mapaTelemetria.invalidateSize(); }, 400); 
}

function atualizarPosicaoNoMapa(lat, lng) { if (!mapaTelemetria) return; if (!markerCarro) { markerCarro = L.circleMarker([lat, lng], { color: '#ef4444', fillColor: '#ef4444', fillOpacity: 1, radius: 6 }).addTo(mapaTelemetria); mapaTelemetria.setView([lat, lng], 16); } else { markerCarro.setLatLng([lat, lng]); } }

// ANÁLISE DE IMPACTO G-FORCE E FRENAGEM
function analisarForcaG(evento) {
    if(!memoriaRodagem.ativa) return;
    let y = evento.acceleration.y || 0; let z = evento.acceleration.z || 0;
    let agora = Date.now();
    if (agora - ultimoEventoG < 2000) return; // Espera 2 segundos entre alertas

    let evt = null; let forca = 0;
    if (Math.abs(y) > 12) { evt = "Frenagem/Aceleração Extrema"; forca = y; }
    else if (Math.abs(z) > 15) { evt = "Impacto Vertical (Suspensão)"; forca = z; }

    if (evt) {
        ultimoEventoG = agora; let hora = new Date().toLocaleTimeString('pt-BR');
        let velMomento = document.getElementById('ui-vel-atual') ? document.getElementById('ui-vel-atual').innerText.split(' ')[0] + " km/h" : "N/A";
        app.logRodagem.push({ hora: hora, evento: evt, forca: Math.abs(forca).toFixed(1) + "G", vel: velMomento });
        app.salvarEstadoHibrido(); app.renderLogRodagem(); falar(evt);
    }
}

function iniciarCopilotoKX() {
    if (!navigator.geolocation) return alert("Dispositivo não suporta GPS.");
    manterTelaLigada();
    const btnAtivar = document.getElementById('btn-ativar-kx'); if (btnAtivar) btnAtivar.innerHTML = '<span class="material-icons">radar</span> KX ATIVO';
    document.getElementById('status-kx').innerHTML = "Buscando satélites... Aguarde.";

    const modoSelecionado = document.getElementById('gps-rota-selecionada').value; let nomePistaAlvo = "";

    if (modoSelecionado === 'RODAGEM') {
        document.getElementById('painel-rodagem').style.display = 'block';
        memoriaRodagem = { ativa: true, ultimaPosicao: null, ultimoTempo: Date.now(), velocidadeAnterior: 0, ultimoTempoTrace: Date.now() };
        document.getElementById('ui-vel-atual').innerHTML = '0 <span style="font-size: 0.8rem;">km/h</span>';
        app.renderLogRodagem(); falar("Tracker ativado. Iniciando telemetria de viagem.");
        
        if (typeof DeviceMotionEvent.requestPermission === 'function') { DeviceMotionEvent.requestPermission().then(st => { if (st === 'granted') window.addEventListener('devicemotion', analisarForcaG); }).catch(e => console.error(e)); } else { window.addEventListener('devicemotion', analisarForcaG); }

    } else {
        document.getElementById('painel-rodagem').style.display = 'none';
        if (modoSelecionado === 'R389') { nomePistaAlvo = app.sequenciaDiasPares[app.etapaAtualIndex]; falar("Copiloto K X ativado. Siga para: " + nomePistaAlvo); }
        else if (modoSelecionado === 'FRENAGEM') { const indexNoCiclo = app.ciclosFrenagem.length % 8; nomePistaAlvo = app.roteiroFrenagem[indexNoCiclo]; falar("Copiloto ativado. Siga para: " + nomePistaAlvo); }
        else if (modoSelecionado === 'DESACELERACAO') { nomePistaAlvo = app.roteiroDesaceleracao[app.etapaDesaceleracaoIndex]; falar("Copiloto ativado. Siga para: " + nomePistaAlvo); }
    }
    
    rastreadorGpsID = navigator.geolocation.watchPosition((posicao) => {
        document.getElementById('status-kx').innerHTML = `Sinal: Conectado (Margem: ${posicao.coords.accuracy.toFixed(0)}m)`;
        atualizarPosicaoNoMapa(posicao.coords.latitude, posicao.coords.longitude);

        if (modoSelecionado === 'RODAGEM') {
            const agora = Date.now(); let velKmH = 0;
            if (memoriaRodagem.ultimaPosicao) {
                const deltaMts = calcularDistanciaMetros(memoriaRodagem.ultimaPosicao.lat, memoriaRodagem.ultimaPosicao.lng, posicao.coords.latitude, posicao.coords.longitude);
                if (posicao.coords.accuracy < 25 && deltaMts > 1) { app.rodagemDistanciaMts += deltaMts; }
                if (posicao.coords.speed !== null && posicao.coords.speed >= 0) { velKmH = posicao.coords.speed * 3.6; } else { const dt = (agora - memoriaRodagem.ultimoTempo) / 1000; if (dt > 0) velKmH = (deltaMts / dt) * 3.6; }
            }
            memoriaRodagem.ultimaPosicao = { lat: posicao.coords.latitude, lng: posicao.coords.longitude }; memoriaRodagem.ultimoTempo = agora; memoriaRodagem.velocidadeAnterior = velKmH;
            
            document.getElementById('ui-vel-atual').innerHTML = `${velKmH.toFixed(0)} <span style="font-size: 0.8rem;">km/h</span>`;
            document.getElementById('ui-dist-total').innerHTML = `${(app.rodagemDistanciaMts / 1000).toFixed(2)} <span style="font-size: 0.8rem;">km</span>`;

            // SALVA A MIGALHA DE PÃO PARA DESENHAR O HEATMAP A CADA 3 SEGUNDOS
            if (agora - memoriaRodagem.ultimoTempoTrace > 3000) {
                app.rastroGps.push({ lat: posicao.coords.latitude, lng: posicao.coords.longitude, vel: velKmH });
                memoriaRodagem.ultimoTempoTrace = agora;
                app.salvarEstadoHibrido();
            }
            return;
        }

        if (bloqueioTempo) return; 
        if (modoSelecionado === 'R389') { nomePistaAlvo = app.sequenciaDiasPares[app.etapaAtualIndex]; if (!nomePistaAlvo) return; }
        else if (modoSelecionado === 'FRENAGEM') { const indexNoCiclo = app.ciclosFrenagem.length % 8; nomePistaAlvo = app.roteiroFrenagem[indexNoCiclo]; }
        else if (modoSelecionado === 'DESACELERACAO') { nomePistaAlvo = app.roteiroDesaceleracao[app.etapaDesaceleracaoIndex]; if (!nomePistaAlvo) return; }

        let alvo = MAPA_PISTAS[nomePistaAlvo]; if (!alvo || alvo.lat === 0) return; 
        let distancia = calcularDistanciaMetros(posicao.coords.latitude, posicao.coords.longitude, alvo.lat, alvo.lng);
        
        if (distancia <= alvo.raio) {
            bloqueioTempo = true; setTimeout(() => { bloqueioTempo = false; }, 12000); console.log(`✅ Copiloto KX Check-in: ${nomePistaAlvo}`);
            if (modoSelecionado === 'R389') { app.registrarPassagem(true); if (app.etapaAtualIndex >= app.sequenciaDiasPares.length) { app.novaVolta(true); falar("Ciclo concluído. O sistema já vai recomeçar."); } else { falar(`Check. Siga para: ${app.sequenciaDiasPares[app.etapaAtualIndex]}`); } }
            else if (modoSelecionado === 'FRENAGEM') { app.registrarVoltaFrenagem(); const novoIndex = app.ciclosFrenagem.length % 8; if (novoIndex === 0) { falar("Ciclo finalizado. Iniciando próximo."); } else { falar(`Check. Siga para: ${app.roteiroFrenagem[novoIndex]}`); } }
            else if (modoSelecionado === 'DESACELERACAO') { app.registrarPassagemDesaceleracao(true); if (app.etapaDesaceleracaoIndex >= app.roteiroDesaceleracao.length) { app.novaVoltaDesaceleracao(true); falar("Teste concluído. O sistema já vai recomeçar."); } else { falar(`Check. Siga para: ${app.roteiroDesaceleracao[app.etapaDesaceleracaoIndex]}`); } }
        }
    }, (erro) => { document.getElementById('status-kx').innerHTML = `<span style="color: #ef4444;">Buscando sinal do satélite...</span>`; }, { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 });
}

function pararCopilotoKX() {
    if (rastreadorGpsID !== null) {
        navigator.geolocation.clearWatch(rastreadorGpsID); const btnAtivar = document.getElementById('btn-ativar-kx');
        if (btnAtivar) btnAtivar.innerHTML = '<span class="material-icons">play_arrow</span> ATIVAR KX';
        document.getElementById('status-kx').innerHTML = "";
        memoriaRodagem.ativa = false; window.removeEventListener('devicemotion', analisarForcaG);
        liberarTela(); falar("Copiloto desativado.");
    }
}

// FUNÇÃO PARA DESENHAR O HEATMAP NA TELA
function desenharRotaColorida() {
    abrirMapaAoVivo(); 
    if (!mapaTelemetria || app.rastroGps.length < 2) { return alert("Não há dados suficientes de GPS salvos para desenhar a rota."); }
    let velMax = 0; let somaVel = 0;
    app.rastroGps.forEach(ponto => { if(ponto.vel > velMax) velMax = ponto.vel; somaVel += ponto.vel; });
    let velMedia = somaVel / app.rastroGps.length;
    alert(`🗺️ Estatísticas da Rota:\n\nVelocidade Máxima: ${velMax.toFixed(1)} km/h\nVelocidade Média: ${velMedia.toFixed(1)} km/h`);
    
    // Limpa linhas antigas do mapa
    mapaTelemetria.eachLayer(function (layer) { if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) { mapaTelemetria.removeLayer(layer); } });

    for (let i = 0; i < app.rastroGps.length - 1; i++) {
        let p1 = app.rastroGps[i]; let p2 = app.rastroGps[i+1];
        let corDaLinha = '#10b981'; // Verde (0-40)
        if (p1.vel > 80) { corDaLinha = '#ef4444'; } else if (p1.vel > 40) { corDaLinha = '#f97316'; }
        L.polyline([[p1.lat, p1.lng], [p2.lat, p2.lng]], { color: corDaLinha, weight: 6, opacity: 0.8 }).addTo(mapaTelemetria);
    }
    mapaTelemetria.setView([app.rastroGps[0].lat, app.rastroGps[0].lng], 14);
}

// ====================================================
// 4. MÓDULO DE INSTALAÇÃO (PWA)
// ====================================================
let promptDeInstalacao; const bannerInstalacao = document.getElementById('banner-instalacao');
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); promptDeInstalacao = e; if (bannerInstalacao) bannerInstalacao.style.display = 'flex'; });
function instalarPWA() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS) return alert("🍎 No iPhone: Toque no ícone de Compartilhar (quadrado com setinha para cima) na barra do Safari e depois em 'Adicionar à Tela de Início'.");
    if (promptDeInstalacao) { promptDeInstalacao.prompt(); promptDeInstalacao.userChoice.then((resultado) => { if (resultado.outcome === 'accepted') bannerInstalacao.style.display = 'none'; promptDeInstalacao = null; }); } else { alert("App já instalado ou ação bloqueada."); }
}
window.addEventListener('appinstalled', () => { if (bannerInstalacao) bannerInstalacao.style.display = 'none'; });
