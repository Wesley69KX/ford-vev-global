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

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();


// ====================================================
// 2. O CORAÇÃO DO APLICATIVO
// ====================================================
const app = {
    fotos: [], videosFiles: [], etapaAtualIndex: 0, checkins: [],
    operadorAtual: null,
    
    ciclosFrenagem: [],
    roteiroFrenagem: [
        "Pista Baixa - Volta 1", "Pista Baixa - Volta 2", "Pista Baixa - Volta 3", "Pista Baixa - Volta 4",
        "Pista Alta - Volta 1",  "Pista Alta - Volta 2",  "Pista Alta - Volta 3",  "Pista Alta - Volta 4"
    ],
    
     // ROTEIRO R389
    sequenciaDiasPares: [
        "Labirinto: 1ª volta + Mata-burro",  "Power Hop Hill", "Lombadas: 1ª passagem",
        "Pistas 1-2", "Pista 4-3", "Slalom", "Pista 4-3", "Slalom" , "Pistas 4-3", "Pistas 7-8", "Pistas 2-1", "Pistas 7-8", "P. de Baixa",
         "Pistas 1-2", "Pista 4-3", "Slalom", "Pista 4-3", "Slalom" , "Pistas 4-3", "Pistas 7-8", "Pistas 2-1", "Pistas 7-8", "P. de Baixa",
        "Pistas 1-2", "Pista 4-3", "Pista 5-8", "Pistas 4-3", "Pistas 5-8", "Pistas 4-3", "Pistas 9-10", "Pistas 2-1" , "Pistas 9-10", "P. de Baixa",
                "Pistas 1-2", "Pista 4-3", "Pista 5-8" , "Pistas 4-3", "Pistas 5-8", "Pistas 4-3", "Pistas 9-10",
        "Pista de Alta + bolacha", "Pista de Baixa + bolacha",
    ],

    init() {
        document.getElementById('t-data').value = new Date().toISOString().split('T')[0];
        this.verificarSessao();
    },

    salvarEstadoHibrido() {
        if (!this.operadorAtual) return;
        const dataHoje = new Date().toISOString().split('T')[0];
        const estado = {
            etapaAtualIndex: this.etapaAtualIndex,
            checkins: this.checkins,
            ciclosFrenagem: this.ciclosFrenagem,
            ultimaAtualizacao: new Date().toLocaleTimeString('pt-BR')
        };
        db.ref(`vev_turnos/${dataHoje}/${this.operadorAtual}`).set(estado).catch(err => console.log("Erro Firebase:", err));
        localStorage.setItem(`vev_estado_backup_${this.operadorAtual}`, JSON.stringify(estado));
    },

    async carregarEstadoHibrido() {
        if (!this.operadorAtual) return;
        const dataHoje = new Date().toISOString().split('T')[0];
        try {
            const snapshot = await db.ref(`vev_turnos/${dataHoje}/${this.operadorAtual}`).once('value');
            const estadoNuvem = snapshot.val();
            if (estadoNuvem) {
                this.etapaAtualIndex = estadoNuvem.etapaAtualIndex || 0;
                this.checkins = estadoNuvem.checkins || [];
                this.ciclosFrenagem = estadoNuvem.ciclosFrenagem || [];
            } else {
                this.restaurarBackupLocal();
            }
        } catch (error) {
            this.restaurarBackupLocal();
        }
        this.atualizarInterfaceCola();
        this.renderListaFrenagem();
    },

    restaurarBackupLocal() {
        const salvoLocal = localStorage.getItem(`vev_estado_backup_${this.operadorAtual}`);
        if (salvoLocal) {
            const estadoLocal = JSON.parse(salvoLocal);
            this.etapaAtualIndex = estadoLocal.etapaAtualIndex || 0;
            this.checkins = estadoLocal.checkins || [];
            this.ciclosFrenagem = estadoLocal.ciclosFrenagem || [];
        } else {
            this.etapaAtualIndex = 0; this.checkins = []; this.ciclosFrenagem = [];
        }
    },

    verificarSessao() {
        const usuarioSalvo = localStorage.getItem("app_vev_operador");
        if (usuarioSalvo) {
            this.operadorAtual = usuarioSalvo;
            document.getElementById("ui-nome-usuario").innerText = usuarioSalvo;
            document.getElementById("i-motorista").value = usuarioSalvo; 
            document.getElementById("modal-login").style.display = "none";
            document.body.style.overflow = "auto";
            this.carregarEstadoHibrido();
        } else {
            document.getElementById("modal-login").style.display = "flex";
            document.body.style.overflow = "hidden";
        }
    },

    efetuarLogin() {
        const nomeDigitado = document.getElementById("login-nome").value.trim().toUpperCase();
        const senhaDigitada = document.getElementById("login-senha").value.trim();
        if (nomeDigitado.length < 3) return alert("Digite seu nome completo.");
        
        const USUARIOS_PERMITIDOS = ["WESLEY", "JOAO OLIVEIRA" , "HEBER PAES" , "TESTE"]; 
        const SENHA_CORRETA = "1234";

        let usuarioExiste = false;
        for(let i=0; i < USUARIOS_PERMITIDOS.length; i++) {
            if(nomeDigitado.includes(USUARIOS_PERMITIDOS[i])) { usuarioExiste = true; break; }
        }

        if (!usuarioExiste) return alert("❌ Operador não cadastrado no sistema.");
        if (senhaDigitada !== SENHA_CORRETA) return alert("❌ PIN Incorreto.");

        const nomeParaSalvar = document.getElementById("login-nome").value.trim();
        localStorage.setItem("app_vev_operador", nomeParaSalvar);
        
        this.verificarSessao();
        document.getElementById("login-nome").value = "";
        document.getElementById("login-senha").value = "";
    },

    efetuarLogout() {
        if(confirm("Deseja encerrar seu turno? Os dados ficarão salvos na nuvem para hoje.")) {
            localStorage.removeItem("app_vev_operador");
            this.operadorAtual = null;
            document.getElementById("ui-nome-usuario").innerText = "NÃO LOGADO";
            this.etapaAtualIndex = 0; this.checkins = []; this.ciclosFrenagem = [];
            this.verificarSessao();
        }
    },

    async melhorarTextoComIA(botao) {
        const textarea = document.getElementById('i-obs');
        const textoOriginal = textarea.value.trim();
        if (textoOriginal.toUpperCase() === "RESETAR") { localStorage.removeItem("cofre_chave_gemini"); textarea.value = ""; return alert("Chave apagada!"); }
        
        let API_KEY = localStorage.getItem("cofre_chave_gemini");
        if (!API_KEY) { API_KEY = prompt("Cole sua Chave API do Google:"); if (!API_KEY) return; localStorage.setItem("cofre_chave_gemini", API_KEY.trim()); }
        
        botao.innerHTML = '...';
        try {
            const promptComando = "Você é um algoritmo de conversão de texto. Atue como Analista de Produto Automotivo. Melhore tecnicamente e formalize o texto a seguir para um laudo de avaria de pista. REGRAS ESTRITAS DE SAÍDA: 1. NÃO altere os fatos. 2. NÃO adicione informações que não estão no original. 3. NÃO use nenhuma formatação Markdown (sem asteriscos, sem negrito, sem listas). 4. RETORNE EXCLUSIVAMENTE O TEXTO REESCRITO em texto puro, sem NENHUMA saudação, introdução (como 'Aqui está') ou conclusão. Apenas cuspa o texto final. Texto original: " + textoOriginal;
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
            const resposta = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: promptComando }] }] }) });
            const dados = await resposta.json();
            if (dados.candidates) { textarea.value = dados.candidates[0].content.parts[0].text.trim(); }
        } catch (e) { alert("Erro na comunicação com a IA."); }
        botao.innerHTML = '<span class="material-icons" style="font-size: 1rem;">auto_awesome</span> PROCESSAR IA';
    },

    // ROTEIRO R389
    registrarPassagem() {
        if (this.etapaAtualIndex >= this.sequenciaDiasPares.length) return this.novaVolta(); 
        const nomeEtapa = this.sequenciaDiasPares[this.etapaAtualIndex];
        const vin = document.getElementById('c-vin')?.value || "---";
        this.checkins.push({ atividade: nomeEtapa, hora: new Date().toLocaleTimeString('pt-BR'), vin: vin, operador: this.operadorAtual });
        if ('vibrate' in navigator) navigator.vibrate(50);
        this.etapaAtualIndex++;
        
        this.salvarEstadoHibrido();
        this.atualizarInterfaceCola();
    },

    novaVolta() {
        if(confirm("Iniciar nova volta na R389?")) {
            this.etapaAtualIndex = 0;
            this.checkins.push({ atividade: "--- NOVA SÉRIE R389 ---", hora: new Date().toLocaleTimeString('pt-BR'), vin: document.getElementById('c-vin')?.value || "---", operador: this.operadorAtual });
            this.salvarEstadoHibrido();
            this.atualizarInterfaceCola();
        }
    },

    atualizarInterfaceCola() {
        if (this.etapaAtualIndex < this.sequenciaDiasPares.length) {
            document.getElementById('etapa-atual').innerText = this.sequenciaDiasPares[this.etapaAtualIndex];
        } else {
            document.getElementById('etapa-atual').innerText = "✅ CICLO R389 CONCLUÍDO";
        }
        const lista = document.getElementById('lista-cola');
        lista.innerHTML = this.sequenciaDiasPares.map((e, i) => `
            <div class="log-item ${i < this.etapaAtualIndex ? 'concluido' : (i === this.etapaAtualIndex ? 'ativo' : '')}">
                <span class="material-icons" style="font-size: 1rem; color: ${i === this.etapaAtualIndex ? 'var(--accent)' : 'inherit'};">${i < this.etapaAtualIndex ? 'check_circle' : 'radio_button_unchecked'}</span>
                ${e}
            </div>
        `).join('');
        setTimeout(() => { const itemAtivo = document.querySelector('.log-item.ativo'); if(itemAtivo) itemAtivo.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100);
    },

    resetarRoteiro() {
        if(confirm("Tem certeza que deseja APAGAR os registros do R389 no Banco de Dados?")) { 
            this.etapaAtualIndex = 0; 
            this.checkins = []; 
            this.salvarEstadoHibrido(); 
            this.atualizarInterfaceCola(); 
        }
    },

    async gerarRelatorioRoteiro() {
        if (this.checkins.length === 0) return alert("Nenhuma passagem registrada.");
        const { jsPDF } = window.jspdf; const doc = new jsPDF();
        doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(168, 85, 247); doc.setFontSize(16); doc.text("LOG DE CICLOS (R389)", 105, 20, { align: "center" });
        doc.setFontSize(10); doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')} | Analista: ${this.operadorAtual}`, 105, 28, { align: "center" });
        const dadosTabela = this.checkins.map((c, i) => [i + 1, c.atividade, c.hora]);
        doc.autoTable({ startY: 45, head: [['#', 'CICLO / ETAPA', 'HORA']], body: dadosTabela, headStyles: { fillColor: [168, 85, 247], textColor: [255,255,255] }, didParseCell: function(data) { if(data.row.raw[1].includes("--- INÍCIO")) { data.cell.styles.fillColor = [241, 245, 249]; data.cell.styles.fontStyle = 'bold'; } } });
        doc.save(`Log_R389_${this.operadorAtual.split(' ')[0]}.pdf`);
    },

    // FRENAGEM
    registrarVoltaFrenagem() {
        const totalVoltas = this.ciclosFrenagem.length;
        const indexNoCiclo = totalVoltas % 8; 
        const numeroCicloAtual = Math.floor(totalVoltas / 8) + 1;
        const nomeEtapa = this.roteiroFrenagem[indexNoCiclo];
        const obs = document.getElementById('f-obs').value || "OK";
        
        this.ciclosFrenagem.push({ ciclo: numeroCicloAtual, etapa: nomeEtapa, observacao: obs, hora: new Date().toLocaleTimeString('pt-BR'), operador: this.operadorAtual });
        document.getElementById('f-obs').value = '';
        if ('vibrate' in navigator) navigator.vibrate(50);
        
        this.salvarEstadoHibrido();
        this.renderListaFrenagem();
    },

    renderListaFrenagem() {
        const totalVoltas = this.ciclosFrenagem.length;
        const numeroCicloAtual = Math.floor(totalVoltas / 8) + 1;
        const indexNoCiclo = totalVoltas % 8;
        const voltaAtual = indexNoCiclo + 1;

        document.getElementById('f-ciclo-atual').innerText = `CICLO ${numeroCicloAtual}`;
        document.getElementById('f-progresso-ciclo').innerText = `Lap ${voltaAtual}/8`;
        document.getElementById('f-proxima-etapa').innerText = this.roteiroFrenagem[indexNoCiclo];

        const lista = document.getElementById('lista-frenagem');
        if(totalVoltas === 0) return lista.innerHTML = '<div style="color: #475569; text-align: center; padding: 1rem;">Nenhuma volta registrada.</div>';

        let htmlLista = '';
        const listaReversa = [...this.ciclosFrenagem].reverse();
        let cicloAnterior = null;
        
        listaReversa.forEach((f, i) => {
            if (f.ciclo !== cicloAnterior && cicloAnterior !== null) {
                 htmlLista += `<div style="background: rgba(16, 185, 129, 0.1); color: var(--success); padding: 8px; text-align: center; font-size: 0.75rem; font-weight: bold; border-top: 1px solid rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.05);">✅ FIM DO CICLO ${cicloAnterior}</div>`;
            }
            cicloAnterior = f.ciclo;
            htmlLista += `
                <div class="log-item" style="justify-content: space-between;">
                    <div><strong style="color: var(--text-primary);">${f.etapa}</strong><br><span style="color: var(--text-secondary);">Obs: ${f.observacao}</span></div>
                    <div style="text-align: right; opacity: 0.6;"><div style="font-size: 0.65rem;">${f.hora}</div><div style="font-size: 0.65rem; font-weight: bold; color: var(--accent);">C${f.ciclo}</div></div>
                </div>
            `;
        });
        lista.innerHTML = htmlLista;
    },

    resetarFrenagem() { 
        if(confirm("Deseja APAGAR os dados de Frenagem do Banco de Dados?")) { 
            this.ciclosFrenagem = []; 
            this.salvarEstadoHibrido();
            this.renderListaFrenagem(); 
        } 
    },
    
    async gerarRelatorioFrenagem() {
        if(this.ciclosFrenagem.length === 0) return alert("Nenhum dado.");
        const { jsPDF } = window.jspdf; const doc = new jsPDF();
        doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(249, 115, 22); doc.setFontSize(16); doc.text("LOG DETALHADO DE FRENAGEM", 105, 20, { align: "center" });
        doc.setFontSize(10); doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')} | Analista: ${this.operadorAtual}`, 105, 28, { align: "center" });
        const dados = this.ciclosFrenagem.map(f => [`Ciclo ${f.ciclo}`, f.etapa, f.hora, f.observacao]);
        doc.autoTable({ startY: 45, head: [['CICLO', 'VOLTA / ETAPA', 'HORA', 'STATUS']], body: dados, headStyles: { fillColor: [249, 115, 22] }, didParseCell: function(data) { if(data.row.index > 0 && data.row.raw[0] !== data.table.body[data.row.index - 1].raw[0]) { data.cell.styles.lineWidth = { top: 1 }; data.cell.styles.lineColor = [249, 115, 22]; } } });
        doc.save(`Log_Fren_${this.operadorAtual.split(' ')[0]}.pdf`);
    },

    gerarRelatorioResumo() {
        if (this.checkins.length === 0 && this.ciclosFrenagem.length === 0) return alert("Sem dados registrados no turno.");
        const vin = document.getElementById('c-vin')?.value || "VEV-TEST";
        
        const resumoR389 = {};
        this.checkins.forEach(r => {
            if(r.atividade.includes("---")) return;
            let nome = r.atividade.split(':')[0].trim();
            resumoR389[nome] = (resumoR389[nome] || 0) + 1;
        });

        const totalVoltasFrenagem = this.ciclosFrenagem.length;
        const ciclosCompletosFrenagem = Math.floor(totalVoltasFrenagem / 8);
        const voltasRestantesBaixa = Math.min(totalVoltasFrenagem % 8, 4);
        const voltasRestantesAlta = Math.max(0, (totalVoltasFrenagem % 8) - 4);

        const { jsPDF } = window.jspdf; const doc = new jsPDF();
        doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(56, 189, 248); doc.setFontSize(16); doc.text("RESUMO GERAL DO TURNO", 105, 20, { align: "center" });
        doc.setFontSize(10); doc.text(`VIN: ${vin} | DATA: ${new Date().toLocaleDateString('pt-BR')} | OP: ${this.operadorAtual}`, 105, 28, { align: "center" });
        
        let currentY = 45;

        if (totalVoltasFrenagem > 0) {
            doc.setTextColor(0, 0, 0); doc.setFontSize(12); doc.setFont(undefined, 'bold');
            doc.text("RESUMO: TESTE DE FRENAGEM", 14, currentY);
            const tabelaFrenagem = [ ['Ciclos Completos (8 Voltas)', `${ciclosCompletosFrenagem} Ciclo(s)`], ['Voltas Extra (Pista Baixa)', `${voltasRestantesBaixa} Volta(s)`], ['Voltas Extra (Pista Alta)', `${voltasRestantesAlta} Volta(s)`], ['TOTAL GERAL DE VOLTAS', `${totalVoltasFrenagem} Volta(s)`] ];
            doc.autoTable({ startY: currentY + 5, body: tabelaFrenagem, theme: 'grid', headStyles: { fillColor: [249, 115, 22] }, columnStyles: { 0: { fontStyle: 'bold', cellWidth: 100 } } });
            currentY = doc.lastAutoTable.finalY + 15;
        }

        if (Object.keys(resumoR389).length > 0) {
            doc.setTextColor(0, 0, 0); doc.setFontSize(12); doc.setFont(undefined, 'bold');
            doc.text("RESUMO: CICLOS R389", 14, currentY);
            const tabelaR389 = Object.keys(resumoR389).map(k => [k, `${resumoR389[k]} vezes`]);
            doc.autoTable({ startY: currentY + 5, head: [['PISTA / ATIVIDADE', 'TOTAL NO TURNO']], body: tabelaR389, headStyles: { fillColor: [168, 85, 247] } });
        }

        doc.save(`Resumo_${this.operadorAtual.split(' ')[0]}_${Date.now()}.pdf`);
    },

    handleMedia(e) {
        Array.from(e.target.files).forEach(file => {
            if (file.type.startsWith('video/')) {
                this.videosFiles.push(file); this.renderGaleria();
            } else if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (ev) => { this.comprimir(ev.target.result, 3840, 3840, (img) => { this.fotos.push({ src: img, legenda: '' }); this.renderGaleria(); }); };
                reader.readAsDataURL(file);
            }
        });
        e.target.value = '';
    },

    comprimir(base64, maxW, maxH, cb) {
        const img = new Image(); img.src = base64;
        img.onload = () => {
            const canvas = document.createElement('canvas'); let w = img.width, h = img.height;
            if (w > h) { if (w > maxW) { h *= maxW / w; w = maxW; } } else { if (h > maxH) { w *= maxH / h; h = maxH; } }
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(img, 0, 0, w, h);
            cb(canvas.toDataURL('image/jpeg', 1.0)); 
        };
    },

    removerFoto(index) { this.fotos.splice(index, 1); this.renderGaleria(); },
    removerVideo(index) { this.videosFiles.splice(index, 1); this.renderGaleria(); },

    renderGaleria() {
        const g = document.getElementById('galeria-avaria'); let html = '';
        this.fotos.forEach((f, i) => { html += `<div class="photo-wrapper"><button class="btn-delete-photo" onclick="app.removerFoto(${i})">×</button><img src="${f.src}"><input type="text" placeholder="Legenda..." value="${f.legenda}" oninput="app.fotos[${i}].legenda=this.value"></div>`; });
        this.videosFiles.forEach((v, i) => { html += `<div class="photo-wrapper" style="background: rgba(56, 189, 248, 0.1); border-color: #38bdf8; display:flex; flex-direction:column; align-items:center; justify-content:center; padding: 1rem;"><button class="btn-delete-photo" style="background: #0284c7;" onclick="app.removerVideo(${i})">×</button><span class="material-icons" style="font-size: 3rem; color: #38bdf8;">movie</span><p style="font-size: 0.7rem; color: #38bdf8; font-weight: bold; margin-top: 10px; text-align: center;">${v.name}</p></div>`; });
        g.innerHTML = html;
    },

    resetarFormularioLaudo() { document.getElementById('i-id').value = ''; document.getElementById('i-obs').value = ''; this.fotos = []; this.videosFiles = []; this.renderGaleria(); },

    async gerarECompartilharLaudo() { 
        const id = document.getElementById('i-id').value || "SN"; 
        const motorista = document.getElementById('i-motorista').value || this.operadorAtual; 
        const parecer = document.getElementById('i-obs').value || "Sem observações.";
        
        const { jsPDF } = window.jspdf; const doc = new jsPDF();
        doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 30, 'F'); doc.setTextColor(56, 189, 248); doc.setFontSize(18); doc.text("LAUDO TÉCNICO", 14, 20); doc.setFontSize(12); doc.text(`VIN: ${id}`, 196, 20, { align: "right" }); doc.setTextColor(0, 0, 0);
        doc.autoTable({ startY: 35, body: [['Veículo / VIN:', id, 'Data:', new Date().toLocaleString('pt-BR')], ['Analista de Produto:', motorista, 'Assinatura (Auto):', 'Autenticado no App']], theme: 'grid' });
        
        let currentY = doc.lastAutoTable.finalY + 10; doc.setFont(undefined, 'bold'); doc.text("PARECER TÉCNICO:", 14, currentY); currentY += 6; doc.setFont(undefined, 'normal'); doc.text(doc.splitTextToSize(parecer, 178), 14, currentY);
        
        if (this.fotos.length > 0) {
            let y = currentY + 30;
            this.fotos.forEach((f, i) => {
                if (y > 200) { doc.addPage(); y = 20; }
                const imgProps = doc.getImageProperties(f.src); const ratio = imgProps.height / imgProps.width;
                doc.addImage(f.src, 'JPEG', 14, y, 90, 90 * ratio, undefined, 'FAST'); doc.text(`Evidência ${i+1}: ${f.legenda || ''}`, 14, y + (90 * ratio) + 6); y += (90 * ratio) + 15;
            });
        }

        const pdfBlob = doc.output('blob'); const pdfNome = `Laudo_${id}_${motorista.split(' ')[0]}.pdf`; const pdfFile = new File([pdfBlob], pdfNome, { type: 'application/pdf' });
        let arquivosParaCompartilhar = [pdfFile];
        if (this.videosFiles.length > 0) { this.videosFiles.forEach(video => { arquivosParaCompartilhar.push(video); }); }

        if (navigator.canShare && navigator.canShare({ files: arquivosParaCompartilhar })) {
            try { await navigator.share({ files: arquivosParaCompartilhar, title: `Laudo - ${id}`, text: `Laudo Técnico por ${motorista}.` }); setTimeout(() => { this.resetarFormularioLaudo(); }, 1000); } 
            catch (err) { doc.save(pdfNome); this.resetarFormularioLaudo(); }
        } else {
            alert("Seu aparelho bloqueou o envio nativo dos vídeos via app. O PDF será baixado. Anexe os vídeos por fora.");
            doc.save(pdfNome); this.resetarFormularioLaudo();
        }
    },

    async finalizarTurnoIntegrado() {
        const v = document.getElementById('t-veiculo').value; const dataBruta = document.getElementById('t-data').value;
        let dataFormatada = dataBruta ? `${dataBruta.split('-')[2]}/${dataBruta.split('-')[1]}` : "";
        const texto = `*Fechamento: ${this.operadorAtual}*\n*Abastecimento ${v}*\n${document.getElementById('t-turno').value} ${dataFormatada}\nVIN: ${document.getElementById('t-vin').value}\nTrip: ${document.getElementById('t-trip').value}\nKm: ${document.getElementById('t-km').value}\nLitros: ${document.getElementById('t-litros').value}\nSaldo: R$ ${document.getElementById('t-saldo').value}`;
        try { await navigator.clipboard.writeText(texto); alert("Copiado para o WhatsApp!"); } catch (e) {}
    }
}; // <<<<<<<<<< FIM DO OBJETO APP (FECHAMENTO DA CHAVE AQUI)

// Inicializa o App
window.onload = () => app.init();



// ====================================================
// 3. MÓDULO DE TELEMETRIA GPS (ISOLADO E INTEGRADO)
// ====================================================

const MAPA_PISTAS = {
    "P. de Baixa":               { lat: -23.398088084486734,  lng: -47.92362656463522, raio: 40 },
    "Pista de Alta":             { lat: -23.392783132651925,  lng: -47.91720937962347, raio: 40 },
    "Labirinto: 1ª volta + Mata-burro": { lat: -23.389897937338947, lng:  -47.90375005479293, raio: 30 },
    "Power Hop Hill":            { lat: -23.389408882275966,  lng:  -47.920772503525185, raio: 30 },
    "Lombadas: 1ª passagem":     { lat: -23.395171846083837,  lng: -47.92032189243844, raio: 30 },
    "Pistas 1-2":                { lat: -23.397242119161156,  lng: -47.92448602193369, raio: 40 },
    "Pista 4-3":                 { lat: -23.395709726328462,  lng: -47.92309797877286, raio: 40 },
    "Slalom":                    { lat: -23.39748090007043,  lng: -47.9242084133005, raio: 40 },
    "Pistas 7-8":                { lat: -23.397314738151422,  lng: -47.924327771600595, raio: 40 },
    "Pistas 2-1":                { lat: -23.396490940978282,  lng: -47.92386790410527, raio: 40 },
    "Pista 5-8":                 { lat: -23.397269640868,  lng: -47.92436583698041, raio: 40 },
    "Pistas 9-10":               { lat: -23.397469035218407,  lng: -47.92421831548582, raio: 40 },
    "Pista de Alta + bolacha":   { lat: -23.393033414214045,  lng: -47.91519833780578, raio: 40 },
    "Pista de Baixa + bolacha":  { lat: -23.396999216729025,  lng: -47.91646970487802, raio: 40 }
};

let rastreadorGpsID = null;
let bloqueioTempo = false;

function falar(mensagem) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const locutor = new SpeechSynthesisUtterance(mensagem);
        locutor.lang = 'pt-BR'; locutor.rate = 1.1; locutor.pitch = 1.0;
        window.speechSynthesis.speak(locutor);
    }
}

function calcularDistanciaMetros(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI/180; const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180; const Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; 
}

function iniciarPilotoAutomatico() {
    if (!navigator.geolocation) return alert("Dispositivo não suporta GPS.");
    
    // Agora o GPS lê direto de dentro do aplicativo!
    let nomePistaInicial = app.sequenciaDiasPares[app.etapaAtualIndex];
    if (!nomePistaInicial) return alert("O ciclo de testes já foi concluído.");
    
    falar("Piloto automático ativado. Siga para: " + nomePistaInicial);
    
    rastreadorGpsID = navigator.geolocation.watchPosition((posicao) => {
        if (bloqueioTempo) return; 

        // Descobre onde o aplicativo parou
        let nomePistaAlvo = app.sequenciaDiasPares[app.etapaAtualIndex];
        
        if (!nomePistaAlvo) {
            navigator.geolocation.clearWatch(rastreadorGpsID);
            return;
        }

        let alvo = MAPA_PISTAS[nomePistaAlvo];
        if (!alvo || alvo.lat === 0) return console.warn(`Sem coordenadas: ${nomePistaAlvo}`);

        let distancia = calcularDistanciaMetros(posicao.coords.latitude, posicao.coords.longitude, alvo.lat, alvo.lng);
        
        if (distancia <= alvo.raio) {
            bloqueioTempo = true;
            setTimeout(() => { bloqueioTempo = false; }, 45000); 

            console.log(`✅ GPS Check-in: ${nomePistaAlvo}`);
            
            // A MÁGICA ACONTECE AQUI: O GPS "Aperta o botão" do aplicativo automaticamente!
            app.registrarPassagem();

            // Pega o nome da PRÓXIMA pista após o app.registrarPassagem() ter avançado a etapa
            let proximaPista = app.sequenciaDiasPares[app.etapaAtualIndex];

            if (proximaPista) {
                falar(`Check confirmado. Siga para: ${proximaPista}`);
            } else {
                falar("Ciclo concluído. Retorne à base.");
                navigator.geolocation.clearWatch(rastreadorGpsID);
            }
        }
    }, 
    (erro) => console.log("Aguardando satélite...", erro), 
    { enableHighAccuracy: true, maximumAge: 0 });
}

function pararPilotoAutomatico() {
    if (rastreadorGpsID !== null) {
        navigator.geolocation.clearWatch(rastreadorGpsID);
        falar("Piloto automático desativado.");
    }
}

// FERRAMENTA TEMPORÁRIA DE MAPEAMENTO PARA O SÁBADO
function mapearPontoAtual() {
    const painelResultado = document.getElementById('resultado-gps');
    const nomePonto = document.getElementById('nome-ponto').value;
    if (!nomePonto) return alert("Digite o nome do ponto antes.");

    painelResultado.innerHTML = "Buscando satélites... 🛰️";
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (posicao) => {
                const lat = posicao.coords.latitude; const lng = posicao.coords.longitude; const precisao = posicao.coords.accuracy;
                const linhaCodigo = `"${nomePonto}": { lat: ${lat}, lng: ${lng}, raio: 40 }, // Erro GPS: ${precisao.toFixed(1)}m`;
                painelResultado.innerHTML = `<span style="color: #10b981;">Capturado!</span><br><br>${linhaCodigo}`;
            },
            (erro) => { painelResultado.innerHTML = `<span style="color: #ef4444;">Erro: ${erro.message}</span>`; },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    }
}
