const app = {
    fotos: [],
    videosFiles: [], 
    etapaAtualIndex: 0,
    checkins: [],
    
    // VARIÁVEIS DE FRENAGEM (V3.4)
    ciclosFrenagem: [],
    roteiroFrenagem: [
        "Pista Baixa - Volta 1", "Pista Baixa - Volta 2", "Pista Baixa - Volta 3", "Pista Baixa - Volta 4",
        "Pista Alta - Volta 1",  "Pista Alta - Volta 2",  "Pista Alta - Volta 3",  "Pista Alta - Volta 4"
    ],
    
    // ROTEIRO EXATO
    sequenciaDiasPares: [
        "Labirinto: 1ª volta + mata-burro (30 km/h)",
        "Labirinto: 2ª volta + mata-burro",
        "Labirinto: 3ª volta",
        "Enrola Camisa: 1ª volta",
        "Enrola Camisa: 2ª volta",
        "Enrola Camisa: 3ª volta",
        "Enrola Camisa: 4ª volta",
        "Areia Pista: 1ª volta",
        "Areia Pista: 2ª volta (360º horário)",
        "Areia Pista: 3ª volta (360º anti-horário)",
        "Power Hop Hill (1x) - 60 km/h",
        "Seguir p/ 2ª Rotatória - 60 km/h",
        "Lombadas: 1ª passagem",
        "Lombadas: 2ª passagem",
        "Lombadas: 3ª passagem",
        "Lombadas: 4ª passagem",
        "Lombadas: 5ª passagem",
        "[Esp] Pistas 1-2 (50 km/h)",
        "[Esp] Pista 4-3 (20 km/h)",
        "[Esp] Slalom 11,09,12,10 (20 km/h)",
        "[Esp] Pista 4-3 (20 km/h)",
        "[Esp] Slalom 11,09,12,10 (20 km/h)",
        "[Esp] Pista 4-3 (20 km/h)",
        "[Esp] Pistas 7-8 (20, 15 km/h)",
        "[Esp] Pistas 2-1 (50 km/h)",
        "[Esp] Pistas 7-8 (20, 15 km/h)",
        "[Esp] P. de Baixa",
        "[Esp] Pistas 1-2",
        "[Esp] Pista 4-3",
        "[Esp] Slalom 11,09,12,10",
        "[Esp] Pista 4-3",
        "[Esp] Slalom 11,09,12,10",
        "[Esp] Pista 4-3",
        "[Esp] Pistas 7-8",
        "[Esp] Pistas 2-1",
        "[Esp] Pistas 7-8",
        "[Esp] P. de Baixa",
        "[Esp] Pistas 1-2",
        "[Esp] Pista 4-3",
        "[Esp] Pistas 5-8",
        "[Esp] Pista 4-3",
        "[Esp] Pistas 5-8",
        "[Esp] Pista 4-3",
        "[Esp] Pistas 09-10",
        "[Esp] Pistas 2-1",
        "[Esp] Pistas 09-10",
        "[Esp] P. de Baixa",
        "[Esp] Pistas 1-13",
        "[Esp] Pista 4-3",
        "[Esp] Pistas 5-8",
        "[Esp] Pista 4-3",
        "[Esp] Pistas 5-8",
        "[Esp] Pista 4-3",
        "[Esp] Pistas 09-10",
        "10 metros marcha-à-ré + Manobra",
        "Pista de Alta",
        "Pista de Alta + bolacha",
        "Pista de Baixa + bolacha",
        "Condição: Veículo Vazio",
        "Condição: Veículo Carregado"
    ],

    init() {
        document.getElementById('t-data').value = new Date().toISOString().split('T')[0];
        this.atualizarInterfaceCola();
        this.renderListaFrenagem(); // Inicializa o modal de frenagem
    },

    // ==========================================
    // IA - GEMINI
    // ==========================================
    async melhorarTextoComIA(botao) {
        const textarea = document.getElementById('i-obs');
        const textoOriginal = textarea.value.trim();

        if (textoOriginal.toUpperCase() === "RESETAR") {
            localStorage.removeItem("cofre_chave_gemini");
            textarea.value = "";
            return alert("✅ Chave apagada com sucesso!");
        }

        if (textoOriginal.length < 5) return alert("Escreva um pouco mais sobre o problema.");

        let API_KEY = localStorage.getItem("cofre_chave_gemini");
        if (!API_KEY) {
            API_KEY = prompt("Cole sua Chave de API do Google aqui:");
            if (!API_KEY) return; 
            localStorage.setItem("cofre_chave_gemini", API_KEY.trim());
        }

        const conteudoOriginalBotao = botao.innerHTML;
        botao.innerHTML = 'GERANDO...';
        botao.disabled = true;

        const promptComando = "Atue como um Engenheiro Automotivo Sênior. Reescreva este texto em linguagem técnica para um laudo de avaria, sendo direto, estritamente profissional, sem aspas ou introduções. O texto é: " + textoOriginal;

        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
            const resposta = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: promptComando }] }] })
            });

            if (!resposta.ok) {
                if(resposta.status === 400 || resposta.status === 401 || resposta.status === 403) {
                    localStorage.removeItem("cofre_chave_gemini");
                    throw new Error(`Chave recusada. Apagada da memória.`);
                }
                throw new Error(`Google recusou a conexão.`);
            }

            const dados = await resposta.json();
            if (dados.candidates && dados.candidates.length > 0) {
                if (dados.candidates[0].finishReason === "SAFETY") return alert("A IA bloqueou a mensagem.");
                if (dados.candidates[0].content && dados.candidates[0].content.parts) {
                    textarea.value = dados.candidates[0].content.parts[0].text.trim();
                    botao.innerHTML = 'PRONTO!';
                }
            }
        } catch (error) { alert("Atenção: " + error.message); } 
        finally {
            setTimeout(() => { botao.innerHTML = conteudoOriginalBotao; botao.disabled = false; }, 3000);
        }
    },

    // ==========================================
    // ROTEIRO: LOOP CONTÍNUO (V3.3)
    // ==========================================
    novaVolta() {
        if(confirm("Deseja iniciar uma NOVA VOLTA mantendo todo o histórico já registrado?")) {
            this.etapaAtualIndex = 0;
            const vin = document.getElementById('c-vin').value || "---";
            this.checkins.push({ atividade: "--- INÍCIO DE NOVA VOLTA ---", hora: new Date().toLocaleTimeString('pt-BR'), vin: vin });
            this.atualizarInterfaceCola();
        }
    },

    registrarPassagem() {
        if (this.etapaAtualIndex >= this.sequenciaDiasPares.length) return this.novaVolta(); 
        
        const nomeEtapa = this.sequenciaDiasPares[this.etapaAtualIndex];
        const agora = new Date();
        const vin = document.getElementById('c-vin').value || "Não Informado";

        this.checkins.push({ atividade: nomeEtapa, hora: agora.toLocaleTimeString('pt-BR'), vin: vin });
        if ('vibrate' in navigator) navigator.vibrate(50);
        this.etapaAtualIndex++;
        this.atualizarInterfaceCola();
    },

    gerarRelatorioResumo() {
        if (this.checkins.length === 0) return alert("Você precisa registrar passagens no guia antes de gerar o resumo.");
        
        const vin = document.getElementById('c-vin').value || "Veículo em Teste";
        const resumo = {};

        this.checkins.forEach(r => {
            let nomePista = r.atividade;
            if(nomePista.includes("--- INÍCIO")) return;
            if (nomePista.includes(':')) nomePista = nomePista.split(':')[0].trim();
            if (nomePista.includes('(') && !nomePista.includes('[Esp]')) nomePista = nomePista.split('(')[0].trim();
            resumo[nomePista] = (resumo[nomePista] || 0) + 1;
        });

        const { jsPDF } = window.jspdf; const doc = new jsPDF();
        
        doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(56, 189, 248); doc.setFontSize(18); doc.text("ENGINEERING SUMMARY - R389", 105, 20, { align: "center" });
        doc.setFontSize(10); doc.text(`VIN: ${vin} | DATA: ${new Date().toLocaleDateString('pt-BR')}`, 105, 28, { align: "center" });

        doc.setTextColor(0, 0, 0); doc.setFontSize(12); doc.text("RESUMO DE CICLOS (CONTAGEM DE VOLTAS):", 14, 50);
        const tabelaResumo = Object.keys(resumo).map(pista => [pista, `${resumo[pista]} volta(s)`]);
        doc.autoTable({ startY: 55, head: [['PISTA / TESTE', 'TOTAL EXECUTADO']], body: tabelaResumo, theme: 'striped', headStyles: { fillColor: [56, 189, 248], textColor: [0,0,0] } });
        doc.save(`Resumo_Turno_${vin}_${Date.now()}.pdf`);
    },

    atualizarInterfaceCola() {
        if (this.etapaAtualIndex < this.sequenciaDiasPares.length) {
            document.getElementById('etapa-atual').innerText = this.sequenciaDiasPares[this.etapaAtualIndex];
            let seguinte = "Fim do Ciclo";
            if(this.etapaAtualIndex + 1 < this.sequenciaDiasPares.length) seguinte = `Em seguida: ${this.sequenciaDiasPares[this.etapaAtualIndex + 1]}`;
            document.getElementById('etapa-seguinte').innerText = seguinte;
        } else {
            document.getElementById('etapa-atual').innerText = "✅ CICLO FECHADO!";
            document.getElementById('etapa-seguinte').innerText = "Clique para iniciar uma NOVA VOLTA e continuar gravando.";
        }
        
        const listaCola = document.getElementById('lista-cola');
        listaCola.innerHTML = this.sequenciaDiasPares.map((etapa, idx) => {
            let classe = "cola-item"; let icone = "radio_button_unchecked";
            if (idx < this.etapaAtualIndex) { classe += " concluido"; icone = "check_circle"; } 
            else if (idx === this.etapaAtualIndex) { classe += " ativo"; icone = "play_circle_filled"; }
            return `<div class="${classe}" onclick="app.pularParaEtapa(${idx})"><span class="material-icons cola-icon">${icone}</span><span>${idx + 1}. ${etapa}</span></div>`;
        }).join('');
        
        setTimeout(() => { const itemAtivo = document.querySelector('.cola-item.ativo'); if(itemAtivo) itemAtivo.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100);
    },

    pularParaEtapa(idx) { if(confirm(`Pular para "${this.sequenciaDiasPares[idx]}"?`)) { this.etapaAtualIndex = idx; this.atualizarInterfaceCola(); } },
    resetarRoteiro() { if(confirm("Tem certeza que deseja APAGAR TODOS os registros do turno atual?")) { this.etapaAtualIndex = 0; this.checkins = []; this.atualizarInterfaceCola(); } },

    async gerarRelatorioRoteiro() {
        if (this.checkins.length === 0) return alert("Nenhuma passagem registrada.");
        const { jsPDF } = window.jspdf; const doc = new jsPDF();
        
        doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(168, 85, 247); doc.setFontSize(16); doc.text("LOG DE CICLOS (R389)", 105, 20, { align: "center" });
        doc.setFontSize(10); doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 105, 28, { align: "center" });
        
        const dadosTabela = this.checkins.map((c, i) => [i + 1, c.atividade, c.hora]);
        doc.autoTable({ 
            startY: 45, head: [['#', 'CICLO / ETAPA', 'HORA']], body: dadosTabela, headStyles: { fillColor: [168, 85, 247], textColor: [255,255,255] },
            didParseCell: function(data) { if(data.row.raw[1].includes("--- INÍCIO")) { data.cell.styles.fillColor = [241, 245, 249]; data.cell.styles.fontStyle = 'bold'; } }
        });
        doc.save(`Log_R389_${Date.now()}.pdf`);
    },

    // ==========================================
    // LÓGICA DE FRENAGEM (V3.4 - CHECKPOINTS)
    // ==========================================
    adicionarCicloFrenagem() {
        if (this.ciclosFrenagem.length >= this.roteiroFrenagem.length) {
            return alert("✅ Você já completou as 8 voltas oficiais do teste de frenagem!");
        }

        const vel = document.getElementById('f-vel').value; 
        const obs = document.getElementById('f-obs').value || "OK - Sem anomalias";
        
        if(!vel) return alert("Por favor, informe a velocidade registrada.");

        const nomeEtapa = this.roteiroFrenagem[this.ciclosFrenagem.length];

        this.ciclosFrenagem.push({ 
            etapa: nomeEtapa, 
            velocidade: vel + " km/h", 
            observacao: obs, 
            hora: new Date().toLocaleTimeString('pt-BR') 
        });

        document.getElementById('f-vel').value = ''; 
        document.getElementById('f-obs').value = '';
        if ('vibrate' in navigator) navigator.vibrate(50);
        
        this.renderListaFrenagem();
    },

    renderListaFrenagem() {
        // Atualiza Interface Superior (Próxima Etapa e Contador)
        document.getElementById('f-contador').innerText = `${this.ciclosFrenagem.length}/8`;
        
        let proximaEtapaTexto = "✅ TESTE CONCLUÍDO";
        if (this.ciclosFrenagem.length < this.roteiroFrenagem.length) {
            proximaEtapaTexto = this.roteiroFrenagem[this.ciclosFrenagem.length];
        }
        document.getElementById('f-proxima-etapa').innerText = proximaEtapaTexto;

        // Renderiza Lista Inferior
        const lista = document.getElementById('lista-frenagem');
        if(this.ciclosFrenagem.length === 0) {
            return lista.innerHTML = '<div style="color: #475569; text-align: center; padding: 1rem;">Nenhum checkpoint registrado.</div>';
        }

        lista.innerHTML = this.ciclosFrenagem.map((c, i) => `
            <div style="padding: 10px; border-bottom: 1px solid #334155; display: flex; flex-direction: column;">
                <div>
                    <strong style="color: #f97316;">${c.etapa}</strong> <span style="color: #64748b; font-size: 0.75rem;">(${c.hora})</span>
                </div>
                <div style="margin-top: 4px;">
                    <span style="color: #94a3b8;">Velocidade:</span> ${c.velocidade} <br>
                    <span style="color: #94a3b8;">Status:</span> ${c.observacao}
                </div>
            </div>
        `).reverse().join(''); 
    },

    resetarFrenagem() { 
        if(confirm("Deseja apagar os dados e REINICIAR do zero o teste de frenagem?")) { 
            this.ciclosFrenagem = []; 
            this.renderListaFrenagem(); 
        } 
    },

    async gerarRelatorioFrenagem() {
        if (this.ciclosFrenagem.length === 0) return alert("Nenhum ciclo registrado.");
        const { jsPDF } = window.jspdf; const doc = new jsPDF();
        
        doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(249, 115, 22);
        doc.setFontSize(16); doc.text("RELATÓRIO DE FRENAGEM OFICIAL", 105, 20, { align: "center" });
        doc.setFontSize(10); doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')} - Protocolo: 8 Laps`, 105, 28, { align: "center" });

        const dadosTabela = this.ciclosFrenagem.map(c => [c.etapa, c.hora, c.velocidade, c.observacao]);
        doc.autoTable({ startY: 45, head: [['CHECKPOINT', 'HORÁRIO', 'VEL', 'STATUS / ANOMALIA']], body: dadosTabela, headStyles: { fillColor: [249, 115, 22], textColor: [255,255,255] } });
        doc.save(`Frenagem_Oficial_${Date.now()}.pdf`);
    },

    // ==========================================
    // LAUDO DE AVARIA
    // ==========================================
    handleMedia(e) {
        Array.from(e.target.files).forEach(file => {
            if (file.type.startsWith('video/')) { this.videosFiles.push(file); this.renderGaleria(); } 
            else if (file.type.startsWith('image/')) {
                const reader = new FileReader(); reader.onload = (ev) => { this.comprimir(ev.target.result, 1600, 1600, (img) => { this.fotos.push({ src: img, legenda: '' }); this.renderGaleria(); }); }; reader.readAsDataURL(file);
            }
        });
    },
    comprimir(base64, maxW, maxH, cb) {
        const img = new Image(); img.src = base64;
        img.onload = () => {
            const canvas = document.createElement('canvas'); let w = img.width, h = img.height;
            if (w > h) { if (w > maxW) { h *= maxW / w; w = maxW; } } else { if (h > maxH) { w *= maxH / h; h = maxH; } }
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d'); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(img, 0, 0, w, h);
            cb(canvas.toDataURL('image/jpeg', 0.95));
        };
    },
    removerFoto(index) { this.fotos.splice(index, 1); this.renderGaleria(); },
    removerVideo(index) { this.videosFiles.splice(index, 1); this.renderGaleria(); },
    renderGaleria() {
        const g = document.getElementById('galeria-avaria'); let html = '';
        this.fotos.forEach((f, i) => html += `<div class="photo-wrapper"><button class="btn-delete-photo" onclick="app.removerFoto(${i})">×</button><img src="${f.src}"><input type="text" placeholder="Legenda..." oninput="app.fotos[${i}].legenda=this.value"></div>`);
        this.videosFiles.forEach((v, i) => html += `<div class="photo-wrapper" style="background: rgba(56, 189, 248, 0.1); border-color: #38bdf8; display:flex; flex-direction:column; align-items:center; justify-content:center; padding: 1rem;"><button class="btn-delete-photo" style="background: #0284c7;" onclick="app.removerVideo(${i})">×</button><span class="material-icons" style="font-size: 3rem; color: #38bdf8;">movie</span><p style="font-size: 0.7rem; color: #38bdf8; font-weight: bold; margin-top: 10px;">Vídeo Anexado</p></div>`);
        g.innerHTML = html;
    },
    async gerarECompartilharLaudo() {
        const id = document.getElementById('i-id').value || "SN"; const motorista = document.getElementById('i-motorista').value || "Não informado"; const parecer = document.getElementById('i-obs').value || "Sem observações.";
        const { jsPDF } = window.jspdf; const doc = new jsPDF();
        
        doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 30, 'F'); doc.setTextColor(56, 189, 248); doc.setFontSize(18); doc.text("LAUDO DE AVARIA", 14, 20); doc.setFontSize(12); doc.text(`VIN: ${id}`, 196, 20, { align: "right" });
        doc.setTextColor(0, 0, 0);

        doc.autoTable({ startY: 35, body: [['Veículo / VIN:', id, 'Data:', new Date().toLocaleString('pt-BR')], ['Condutor:', motorista, 'Mídias:', `${this.fotos.length} Foto(s), ${this.videosFiles.length} Vídeo(s)`]], theme: 'grid' });
        let currentY = doc.lastAutoTable.finalY + 10; doc.setFont(undefined, 'bold'); doc.text("PARECER TÉCNICO:", 14, currentY); currentY += 6; doc.setFont(undefined, 'normal'); doc.text(doc.splitTextToSize(parecer, 178), 14, currentY);
        if (this.fotos.length > 0) {
            let y = currentY + 30;
            this.fotos.forEach((f, i) => {
                if (y > 200) { doc.addPage(); y = 20; }
                const imgProps = doc.getImageProperties(f.src); const ratio = imgProps.height / imgProps.width;
                doc.addImage(f.src, 'JPEG', 14, y, 90, 90 * ratio); doc.text(`Evidência ${i+1}: ${f.legenda}`, 14, y + (90 * ratio) + 6); y += (90 * ratio) + 15;
            });
        }
        doc.save(`Laudo_${id}.pdf`);
    },

    // ==========================================
    // FECHAMENTO DE TURNO
    // ==========================================
    async finalizarTurnoIntegrado() {
        const v = document.getElementById('t-veiculo').value; const dataBruta = document.getElementById('t-data').value;
        let dataFormatada = dataBruta ? `${dataBruta.split('-')[2]}/${dataBruta.split('-')[1]}` : "";
        const texto = `*Abastecimento ${v}*\n${document.getElementById('t-turno').value} ${dataFormatada}\nVIN: ${document.getElementById('t-vin').value}\nTrip: ${document.getElementById('t-trip').value}\nKm: ${document.getElementById('t-km').value}\nLitros: ${document.getElementById('t-litros').value}\nSaldo: R$ ${document.getElementById('t-saldo').value}`;
        try { await navigator.clipboard.writeText(texto); alert("Texto copiado para o WhatsApp!"); } catch (e) {}
        const { jsPDF } = window.jspdf; const doc = new jsPDF();
        
        doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 30, 'F'); doc.setTextColor(16, 185, 129); doc.setFontSize(16); doc.text("FECHAMENTO DE TURNO", 14, 20); doc.setTextColor(0,0,0);
        
        doc.setFontSize(12); doc.text(doc.splitTextToSize(texto.replace(/\*/g,''), 180), 14, 40);
        doc.save(`Turno_${document.getElementById('t-vin').value}.pdf`);
    }
};

window.onload = () => app.init();
