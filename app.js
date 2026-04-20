const app = {
    fotos: [], videosFiles: [], etapaAtualIndex: 0, checkins: [],
    
    // VARIÁVEIS DE FRENAGEM (V3.7 - CONTADOR DE CICLOS)
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
        this.atualizarInterfaceCola();
        this.renderListaFrenagem(); 
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
        botao.innerHTML = 'IA AUTO';
    },

    // ==========================================
    // ROTEIRO E RESUMO (V3.7)
    // ==========================================
    registrarPassagem() {
        if (this.etapaAtualIndex >= this.sequenciaDiasPares.length) return this.novaVolta(); 
        const nomeEtapa = this.sequenciaDiasPares[this.etapaAtualIndex];
        const vin = document.getElementById('c-vin')?.value || "---";
        this.checkins.push({ atividade: nomeEtapa, hora: new Date().toLocaleTimeString('pt-BR'), vin: vin });
        if ('vibrate' in navigator) navigator.vibrate(50);
        this.etapaAtualIndex++;
        this.atualizarInterfaceCola();
    },

    novaVolta() {
        if(confirm("Iniciar nova volta na R389?")) {
            this.etapaAtualIndex = 0;
            this.checkins.push({ atividade: "--- NOVA SÉRIE R389 ---", hora: new Date().toLocaleTimeString('pt-BR'), vin: document.getElementById('c-vin')?.value || "---" });
            this.atualizarInterfaceCola();
        }
    },

    gerarRelatorioResumo() {
        if (this.checkins.length === 0 && this.ciclosFrenagem.length === 0) return alert("Sem dados registrados no turno.");
        const vin = document.getElementById('c-vin')?.value || "VEV-TEST";
        
        // Cálculo R389
        const resumoR389 = {};
        this.checkins.forEach(r => {
            if(r.atividade.includes("---")) return;
            let nome = r.atividade.split(':')[0].trim();
            resumoR389[nome] = (resumoR389[nome] || 0) + 1;
        });

        // Cálculo Frenagem (Ciclos e Voltas Extra)
        const totalVoltasFrenagem = this.ciclosFrenagem.length;
        const ciclosCompletosFrenagem = Math.floor(totalVoltasFrenagem / 8);
        const voltasRestantesBaixa = Math.min(totalVoltasFrenagem % 8, 4);
        const voltasRestantesAlta = Math.max(0, (totalVoltasFrenagem % 8) - 4);

        const { jsPDF } = window.jspdf; const doc = new jsPDF();
        doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(56, 189, 248); doc.setFontSize(16); doc.text("RESUMO GERAL DO TURNO", 105, 20, { align: "center" });
        doc.setFontSize(10); doc.text(`VIN: ${vin} | DATA: ${new Date().toLocaleDateString('pt-BR')}`, 105, 28, { align: "center" });
        
        let currentY = 45;

        // Seção Frenagem
        if (totalVoltasFrenagem > 0) {
            doc.setTextColor(0, 0, 0); doc.setFontSize(12); doc.setFont(undefined, 'bold');
            doc.text("RESUMO: TESTE DE FRENAGEM", 14, currentY);
            
            const tabelaFrenagem = [
                ['Ciclos Completos (8 Voltas)', `${ciclosCompletosFrenagem} Ciclo(s)`],
                ['Voltas Extra (Pista Baixa)', `${voltasRestantesBaixa} Volta(s)`],
                ['Voltas Extra (Pista Alta)', `${voltasRestantesAlta} Volta(s)`],
                ['TOTAL GERAL DE VOLTAS', `${totalVoltasFrenagem} Volta(s)`]
            ];
            
            doc.autoTable({ 
                startY: currentY + 5, 
                body: tabelaFrenagem, 
                theme: 'grid',
                headStyles: { fillColor: [249, 115, 22] },
                columnStyles: { 0: { fontStyle: 'bold', cellWidth: 100 } }
            });
            currentY = doc.lastAutoTable.finalY + 15;
        }

        // Seção R389
        if (Object.keys(resumoR389).length > 0) {
            doc.setTextColor(0, 0, 0); doc.setFontSize(12); doc.setFont(undefined, 'bold');
            doc.text("RESUMO: CICLOS R389", 14, currentY);
            const tabelaR389 = Object.keys(resumoR389).map(k => [k, `${resumoR389[k]} vezes`]);
            doc.autoTable({ 
                startY: currentY + 5, 
                head: [['PISTA / ATIVIDADE', 'TOTAL NO TURNO']], 
                body: tabelaR389, 
                headStyles: { fillColor: [168, 85, 247] } 
            });
        }

        doc.save(`Resumo_Turno_${Date.now()}.pdf`);
    },

    atualizarInterfaceCola() {
        if (this.etapaAtualIndex < this.sequenciaDiasPares.length) {
            document.getElementById('etapa-atual').innerText = this.sequenciaDiasPares[this.etapaAtualIndex];
        } else {
            document.getElementById('etapa-atual').innerText = "✅ CICLO R389 CONCLUÍDO";
        }
        const lista = document.getElementById('lista-cola');
        lista.innerHTML = this.sequenciaDiasPares.map((e, i) => `<div class="cola-item ${i < this.etapaAtualIndex ? 'concluido' : (i === this.etapaAtualIndex ? 'ativo' : '')}">${e}</div>`).join('');
    },

    // ==========================================
    // FRENAGEM (V3.7 - LÓGICA DE CICLOS)
    // ==========================================
    registrarVoltaFrenagem() {
        const totalVoltas = this.ciclosFrenagem.length;
        const indexNoCiclo = totalVoltas % 8; // Volta para 0 a cada 8
        const numeroCicloAtual = Math.floor(totalVoltas / 8) + 1;
        
        const nomeEtapa = this.roteiroFrenagem[indexNoCiclo];
        const obs = document.getElementById('f-obs').value || "OK";
        
        this.ciclosFrenagem.push({ 
            ciclo: numeroCicloAtual,
            etapa: nomeEtapa, 
            observacao: obs, 
            hora: new Date().toLocaleTimeString('pt-BR') 
        });
        
        document.getElementById('f-obs').value = '';
        if ('vibrate' in navigator) navigator.vibrate(50);
        this.renderListaFrenagem();
    },

    renderListaFrenagem() {
        const totalVoltas = this.ciclosFrenagem.length;
        
        // Calcula o estado atual para exibir na tela superior
        const numeroCicloAtual = Math.floor(totalVoltas / 8) + 1;
        const indexNoCiclo = totalVoltas % 8;
        const voltaAtual = indexNoCiclo + 1;

        // Atualiza a UI Superior
        document.getElementById('f-ciclo-atual').innerText = `CICLO ${numeroCicloAtual}`;
        document.getElementById('f-progresso-ciclo').innerText = `Volta ${voltaAtual}/8`;
        document.getElementById('f-proxima-etapa').innerText = this.roteiroFrenagem[indexNoCiclo];

        // Atualiza a Lista de Histórico (com separadores de ciclo)
        const lista = document.getElementById('lista-frenagem');
        if(totalVoltas === 0) {
            return lista.innerHTML = '<div style="color: #475569; text-align: center; padding: 1rem;">Nenhuma volta registrada.</div>';
        }

        let htmlLista = '';
        // Inverte a lista para mostrar o mais recente no topo, mas agrupa visualmente
        const listaReversa = [...this.ciclosFrenagem].reverse();
        
        let cicloAnterior = null;
        
        listaReversa.forEach((f, i) => {
            // Insere um separador verde quando um ciclo completo é detectado na rolagem
            if (f.ciclo !== cicloAnterior && cicloAnterior !== null) {
                 htmlLista += `<div style="background: rgba(16, 185, 129, 0.1); color: var(--success); padding: 8px; text-align: center; font-size: 0.75rem; font-weight: bold; border-top: 1px solid #334155; border-bottom: 1px solid #334155;">✅ FIM DO CICLO ${cicloAnterior}</div>`;
            }
            cicloAnterior = f.ciclo;

            htmlLista += `
                <div style="padding:10px; border-bottom:1px solid #1e293b; font-size:0.8rem; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong style="color: var(--text-main);">${f.etapa}</strong><br>
                        <span style="color: #94a3b8;">Obs: ${f.observacao}</span>
                    </div>
                    <div style="text-align: right; opacity: 0.6;">
                        <div style="font-size: 0.65rem;">${f.hora}</div>
                        <div style="font-size: 0.65rem; font-weight: bold; color: var(--orange-neon);">C${f.ciclo}</div>
                    </div>
                </div>
            `;
        });
        
        lista.innerHTML = htmlLista;
    },

    resetarFrenagem() { 
        if(confirm("Apagar todo o histórico de frenagem do turno?")) { 
            this.ciclosFrenagem = []; 
            this.renderListaFrenagem(); 
        } 
    },
    
    async gerarRelatorioFrenagem() {
        if(this.ciclosFrenagem.length === 0) return alert("Nenhum dado.");
        const { jsPDF } = window.jspdf; const doc = new jsPDF();
        
        doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(249, 115, 22); doc.setFontSize(16); doc.text("LOG DETALHADO DE FRENAGEM", 105, 20, { align: "center" });
        doc.setFontSize(10); doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')} - Protocolo: 8 Laps / Ciclo`, 105, 28, { align: "center" });
        
        const dados = this.ciclosFrenagem.map(f => [`Ciclo ${f.ciclo}`, f.etapa, f.hora, f.observacao]);
        doc.autoTable({ 
            startY: 45, 
            head: [['CICLO', 'VOLTA / ETAPA', 'HORA', 'STATUS']], 
            body: dados, 
            headStyles: { fillColor: [249, 115, 22] },
            didParseCell: function(data) { 
                // Destaca visualmente o início de um novo ciclo no PDF
                if(data.row.index > 0 && data.row.raw[0] !== data.table.body[data.row.index - 1].raw[0]) {
                    data.cell.styles.lineWidth = { top: 1 };
                    data.cell.styles.lineColor = [249, 115, 22];
                }
            }
        });
        doc.save(`Log_Frenagem_${Date.now()}.pdf`);
    },

    // MÍDIAS E LAUDO
    handleMedia(e) { Array.from(e.target.files).forEach(f => { if(f.type.startsWith('image/')) { const r = new FileReader(); r.onload = (ev) => this.fotos.push({ src: ev.target.result }); r.readAsDataURL(f); } }); },
    async gerarECompartilharLaudo() { 
        const { jsPDF } = window.jspdf; const doc = new jsPDF();
        doc.text("LAUDO DE AVARIA", 10, 10); doc.text(document.getElementById('i-obs').value, 10, 20); doc.save(`Laudo_${Date.now()}.pdf`);
    }
};

window.onload = () => app.init();
