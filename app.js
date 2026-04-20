const app = {
    fotos: [], videosFiles: [], etapaAtualIndex: 0, checkins: [],
    
    // GESTÃO DE SESSÃO / LOGIN
    operadorAtual: null,

    // VARIÁVEIS DE FRENAGEM
    ciclosFrenagem: [],
    roteiroFrenagem: [
        "Pista Baixa - Volta 1", "Pista Baixa - Volta 2", "Pista Baixa - Volta 3", "Pista Baixa - Volta 4",
        "Pista Alta - Volta 1",  "Pista Alta - Volta 2",  "Pista Alta - Volta 3",  "Pista Alta - Volta 4"
    ],
    
    sequenciaDiasPares: [
        "Labirinto: 1ª volta", "Labirinto: 2ª volta", "Labirinto: 3ª volta", "Enrola Camisa: 1ª volta",
        "Enrola Camisa: 2ª volta", "Enrola Camisa: 3ª volta", "Enrola Camisa: 4ª volta", "Areia Pista: 1ª volta",
        "Areia Pista: 2ª volta", "Areia Pista: 3ª volta", "Power Hop Hill", "Lombadas: 1ª passagem",
        "Lombadas: 2ª passagem", "Lombadas: 3ª passagem", "Lombadas: 4ª passagem", "Lombadas: 5ª passagem",
        "Pistas 1-2", "Pista 4-3", "Slalom", "Pista 4-3", "Slalom", "Pistas 7-8", "Pistas 2-1", "P. de Baixa",
        "10 metros marcha-à-ré", "Pista de Alta", "Pista de Alta + bolacha", "Pista de Baixa + bolacha",
        "Condição: Veículo Vazio", "Condição: Veículo Carregado"
    ],

    init() {
        this.verificarSessao();
        document.getElementById('t-data').value = new Date().toISOString().split('T')[0];
        this.atualizarInterfaceCola();
        this.renderListaFrenagem(); 
    },

    // ==========================================
    // MÓDULO DE ACESSO E LOG (COM TRAVA DE USUÁRIO)
    // ==========================================
    verificarSessao() {
        const usuarioSalvo = localStorage.getItem("app_vev_operador");
        if (usuarioSalvo) {
            this.operadorAtual = usuarioSalvo;
            document.getElementById("ui-nome-usuario").innerText = usuarioSalvo;
            document.getElementById("i-motorista").value = usuarioSalvo; // Preenche Laudo
            document.getElementById("modal-login").style.display = "none";
            document.body.style.overflow = "auto";
        } else {
            // Trava o app na tela de login
            document.getElementById("modal-login").style.display = "flex";
            document.body.style.overflow = "hidden";
        }
    },

    efetuarLogin() {
        // Converte o nome digitado para Maiúsculo para facilitar a busca
        const nomeDigitado = document.getElementById("login-nome").value.trim().toUpperCase();
        const senhaDigitada = document.getElementById("login-senha").value.trim();

        if (nomeDigitado.length < 3) return alert("Por favor, digite seu nome completo.");
        
        // 1. LISTA DE QUEM PODE ENTRAR E A SENHA
        // Colocando os nomes em Maiúsculo aqui para comparar com o que o cara digitou
        const USUARIOS_PERMITIDOS = ["WESLEY", "CLEIDIVALDO"]; 
        const SENHA_CORRETA = "1234";

        // 2. VERIFICAÇÃO DE SEGURANÇA
        let usuarioExiste = false;
        
        // O loop varre a lista e vê se o nome que o cara digitou contém "WESLEY" ou "CLEIDIVALDO"
        for(let i=0; i < USUARIOS_PERMITIDOS.length; i++) {
            if(nomeDigitado.includes(USUARIOS_PERMITIDOS[i])) {
                usuarioExiste = true;
                break; // Achou o nome, pode parar de procurar
            }
        }

        if (!usuarioExiste) return alert("❌ Operador não cadastrado no sistema.");
        if (senhaDigitada !== SENHA_CORRETA) return alert("❌ PIN Incorreto. Acesso Negado.");

        // Se chegou até aqui, é porque a senha tá certa e o nome tá na lista!
        // Salva Sessão usando o nome exatamente como o cara digitou lá na caixa de texto
        const nomeParaSalvar = document.getElementById("login-nome").value.trim();
        localStorage.setItem("app_vev_operador", nomeParaSalvar);
        
        this.verificarSessao();
        
        // Limpa campos
        document.getElementById("login-nome").value = "";
        document.getElementById("login-senha").value = "";
    },

    efetuarLogout() {
        if(confirm("Deseja encerrar seu turno e sair do sistema? Seus registros locais não serão perdidos.")) {
            localStorage.removeItem("app_vev_operador");
            this.operadorAtual = null;
            document.getElementById("ui-nome-usuario").innerText = "NÃO LOGADO";
            this.verificarSessao();
        }
    },

    // ==========================================
    // IA - GEMINI
    // ==========================================
    async melhorarTextoComIA(botao) {
        const textarea = document.getElementById('i-obs');
        const textoOriginal = textarea.value.trim();
        if (textoOriginal.toUpperCase() === "RESETAR") { localStorage.removeItem("cofre_chave_gemini"); textarea.value = ""; return alert("Chave apagada!"); }
        let API_KEY = localStorage.getItem("cofre_chave_gemini");
        if (!API_KEY) { API_KEY = prompt("Chave API Google:"); if (!API_KEY) return; localStorage.setItem("cofre_chave_gemini", API_KEY.trim()); }
        botao.innerHTML = '...';
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
            const resposta = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: "Atue como Engenheiro Automotivo. Reescreva de forma técnica: " + textoOriginal }] }] }) });
            const dados = await resposta.json();
            if (dados.candidates) textarea.value = dados.candidates[0].content.parts[0].text.trim();
        } catch (e) { alert("Erro na IA."); }
        botao.innerHTML = '<span class="material-icons" style="font-size: 1rem;">auto_awesome</span> PROCESSAR COM IA';
    },

    // ==========================================
    // ROTEIRO E RESUMO (COM ASSINATURA)
    // ==========================================
    registrarPassagem() {
        if (this.etapaAtualIndex >= this.sequenciaDiasPares.length) return this.novaVolta(); 
        const nomeEtapa = this.sequenciaDiasPares[this.etapaAtualIndex];
        const vin = document.getElementById('c-vin')?.value || "---";
        this.checkins.push({ atividade: nomeEtapa, hora: new Date().toLocaleTimeString('pt-BR'), vin: vin, operador: this.operadorAtual });
        if ('vibrate' in navigator) navigator.vibrate(50);
        this.etapaAtualIndex++;
        this.atualizarInterfaceCola();
    },

    novaVolta() {
        if(confirm("Iniciar nova volta na R389?")) {
            this.etapaAtualIndex = 0;
            this.checkins.push({ atividade: "--- NOVA SÉRIE R389 ---", hora: new Date().toLocaleTimeString('pt-BR'), vin: document.getElementById('c-vin')?.value || "---", operador: this.operadorAtual });
            this.atualizarInterfaceCola();
        }
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
        doc.setFontSize(10); 
        
        // ASSINATURA DO OPERADOR INJETADA AQUI
        doc.text(`VIN: ${vin} | DATA: ${new Date().toLocaleDateString('pt-BR')} | OP: ${this.operadorAtual}`, 105, 28, { align: "center" });
        
        let currentY = 45;

        if (totalVoltasFrenagem > 0) {
            doc.setTextColor(0, 0, 0); doc.setFontSize(12); doc.setFont(undefined, 'bold');
            doc.text("RESUMO: TESTE DE FRENAGEM", 14, currentY);
            
            const tabelaFrenagem = [
                ['Ciclos Completos (8 Voltas)', `${ciclosCompletosFrenagem} Ciclo(s)`],
                ['Voltas Extra (Pista Baixa)', `${voltasRestantesBaixa} Volta(s)`],
                ['Voltas Extra (Pista Alta)', `${voltasRestantesAlta} Volta(s)`],
                ['TOTAL GERAL DE VOLTAS', `${totalVoltasFrenagem} Volta(s)`]
            ];
            
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
    },

    async gerarRelatorioRoteiro() {
        if (this.checkins.length === 0) return alert("Nenhuma passagem registrada.");
        const { jsPDF } = window.jspdf; const doc = new jsPDF();
        
        doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(168, 85, 247); doc.setFontSize(16); doc.text("LOG DE CICLOS (R389)", 105, 20, { align: "center" });
        doc.setFontSize(10); doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')} | Operador: ${this.operadorAtual}`, 105, 28, { align: "center" });
        
        const dadosTabela = this.checkins.map((c, i) => [i + 1, c.atividade, c.hora]);
        doc.autoTable({ 
            startY: 45, head: [['#', 'CICLO / ETAPA', 'HORA']], body: dadosTabela, headStyles: { fillColor: [168, 85, 247], textColor: [255,255,255] },
            didParseCell: function(data) { if(data.row.raw[1].includes("--- INÍCIO")) { data.cell.styles.fillColor = [241, 245, 249]; data.cell.styles.fontStyle = 'bold'; } }
        });
        doc.save(`Log_R389_${this.operadorAtual.split(' ')[0]}.pdf`);
    },

    // ==========================================
    // FRENAGEM
    // ==========================================
    registrarVoltaFrenagem() {
        const totalVoltas = this.ciclosFrenagem.length;
        const indexNoCiclo = totalVoltas % 8; 
        const numeroCicloAtual = Math.floor(totalVoltas / 8) + 1;
        
        const nomeEtapa = this.roteiroFrenagem[indexNoCiclo];
        const obs = document.getElementById('f-obs').value || "OK";
        
        this.ciclosFrenagem.push({ 
            ciclo: numeroCicloAtual, etapa: nomeEtapa, observacao: obs, hora: new Date().toLocaleTimeString('pt-BR'), operador: this.operadorAtual 
        });
        
        document.getElementById('f-obs').value = '';
        if ('vibrate' in navigator) navigator.vibrate(50);
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
                    <div>
                        <strong style="color: var(--text-primary);">${f.etapa}</strong><br>
                        <span style="color: var(--text-secondary);">Obs: ${f.observacao}</span>
                    </div>
                    <div style="text-align: right; opacity: 0.6;">
                        <div style="font-size: 0.65rem;">${f.hora}</div>
                        <div style="font-size: 0.65rem; font-weight: bold; color: var(--accent);">C${f.ciclo}</div>
                    </div>
                </div>
            `;
        });
        lista.innerHTML = htmlLista;
    },

    resetarFrenagem() { if(confirm("Apagar todo o histórico de frenagem do turno?")) { this.ciclosFrenagem = []; this.renderListaFrenagem(); } },
    
    async gerarRelatorioFrenagem() {
        if(this.ciclosFrenagem.length === 0) return alert("Nenhum dado.");
        const { jsPDF } = window.jspdf; const doc = new jsPDF();
        
        doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(249, 115, 22); doc.setFontSize(16); doc.text("LOG DETALHADO DE FRENAGEM", 105, 20, { align: "center" });
        doc.setFontSize(10); doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')} | OP: ${this.operadorAtual}`, 105, 28, { align: "center" });
        
        const dados = this.ciclosFrenagem.map(f => [`Ciclo ${f.ciclo}`, f.etapa, f.hora, f.observacao]);
        doc.autoTable({ 
            startY: 45, head: [['CICLO', 'VOLTA / ETAPA', 'HORA', 'STATUS']], body: dados, headStyles: { fillColor: [249, 115, 22] },
            didParseCell: function(data) { if(data.row.index > 0 && data.row.raw[0] !== data.table.body[data.row.index - 1].raw[0]) { data.cell.styles.lineWidth = { top: 1 }; data.cell.styles.lineColor = [249, 115, 22]; } }
        });
        doc.save(`Log_Fren_${this.operadorAtual.split(' ')[0]}.pdf`);
    },

    // MÍDIAS E LAUDO
    handleMedia(e) { Array.from(e.target.files).forEach(f => { if(f.type.startsWith('image/')) { const r = new FileReader(); r.onload = (ev) => this.fotos.push({ src: ev.target.result }); r.readAsDataURL(f); } }); },
    async gerarECompartilharLaudo() { 
        const id = document.getElementById('i-id').value || "SN"; 
        const motorista = document.getElementById('i-motorista').value || this.operadorAtual; // Pega do login automático
        const parecer = document.getElementById('i-obs').value || "Sem observações.";
        const { jsPDF } = window.jspdf; const doc = new jsPDF();
        
        doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 30, 'F'); doc.setTextColor(56, 189, 248); doc.setFontSize(18); doc.text("LAUDO TÉCNICO", 14, 20); doc.setFontSize(12); doc.text(`VIN: ${id}`, 196, 20, { align: "right" });
        doc.setTextColor(0, 0, 0);

        doc.autoTable({ startY: 35, body: [['Veículo / VIN:', id, 'Data:', new Date().toLocaleString('pt-BR')], ['Engenheiro:', motorista, 'Assinatura (Auto):', 'Autenticado no App']], theme: 'grid' });
        let currentY = doc.lastAutoTable.finalY + 10; doc.setFont(undefined, 'bold'); doc.text("PARECER TÉCNICO:", 14, currentY); currentY += 6; doc.setFont(undefined, 'normal'); doc.text(doc.splitTextToSize(parecer, 178), 14, currentY);
        
        if (this.fotos.length > 0) {
            let y = currentY + 30;
            this.fotos.forEach((f, i) => {
                if (y > 200) { doc.addPage(); y = 20; }
                const imgProps = doc.getImageProperties(f.src); const ratio = imgProps.height / imgProps.width;
                doc.addImage(f.src, 'JPEG', 14, y, 90, 90 * ratio); doc.text(`Evidência ${i+1}: ${f.legenda || ''}`, 14, y + (90 * ratio) + 6); y += (90 * ratio) + 15;
            });
        }
        doc.save(`Laudo_${id}_${motorista.split(' ')[0]}.pdf`);
    },

    // FECHAMENTO DE TURNO
    async finalizarTurnoIntegrado() {
        const v = document.getElementById('t-veiculo').value; const dataBruta = document.getElementById('t-data').value;
        let dataFormatada = dataBruta ? `${dataBruta.split('-')[2]}/${dataBruta.split('-')[1]}` : "";
        const texto = `*Fechamento: ${this.operadorAtual}*\n*Abastecimento ${v}*\n${document.getElementById('t-turno').value} ${dataFormatada}\nVIN: ${document.getElementById('t-vin').value}\nTrip: ${document.getElementById('t-trip').value}\nKm: ${document.getElementById('t-km').value}\nLitros: ${document.getElementById('t-litros').value}\nSaldo: R$ ${document.getElementById('t-saldo').value}`;
        
        try { await navigator.clipboard.writeText(texto); alert("Copiado para o WhatsApp!"); } catch (e) {}
    }
};

window.onload = () => app.init();
