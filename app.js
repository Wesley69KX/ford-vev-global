const app = {
    fotos: [],
    videosFiles: [], 
    
    // ROTEIRO (DIAS PARES)
    etapaAtualIndex: 0,
    checkins: [],
    
    // FRENAGEM
    ciclosFrenagem: [],
    
    // ==========================================
    // ROTEIRO EXATO
    // ==========================================
    sequenciaDiasPares: [
        "Labirinto: 1ª volta + mata-burro (30 km/h)",
      //  "Labirinto: 2ª volta + mata-burro",
      //  "Labirinto: 3ª volta",
      //  "Enrola Camisa: 1ª volta",
      //  "Enrola Camisa: 2ª volta",
       // "Enrola Camisa: 3ª volta",
       // "Enrola Camisa: 4ª volta",
     //   "Areia Pista: 1ª volta",
      //  "Areia Pista: 2ª volta (360º horário)",
      //  "Areia Pista: 3ª volta (360º anti-horário)",
        "Power Hop Hill (1x) - 60 km/h",
        "Seguir p/ 2ª Rotatória - 60 km/h",
      //  "Lombadas: 1ª passagem",
       // "Lombadas: 2ª passagem",
       // "Lombadas: 3ª passagem",
      //  "Lombadas: 4ª passagem",
       // "Lombadas: 5ª passagem",
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
        "[Esp] Pistas 1-2",
        "[Esp] Pista 4-3",
        "[Esp] Pistas 5-8",
        "[Esp] Pista 4-3",
        "[Esp] Pistas 5-8",
        "[Esp] Pista 4-3",
        "[Esp] Pistas 09-10",
       // "10 metros marcha-à-ré + Manobra",
     //   "Pista de Alta",
        "Pista de Alta + bolacha",
        "Pista de Baixa + bolacha",
      //  "Condição: Veículo Vazio",
      //  "Condição: Veículo Carregado"
    ],

init() {
        document.getElementById('t-data').value = new Date().toISOString().split('T')[0];
        this.atualizarInterfaceCola();
    },

    // ==========================================
    // SINCRONIZAÇÃO COM FIREBASE
    // ==========================================
    registrarPassagem() {
        if (this.etapaAtualIndex >= this.sequenciaDiasPares.length) return alert("O teste já foi concluído.");
        
        const nomeEtapa = this.sequenciaDiasPares[this.etapaAtualIndex];
        const agora = new Date();
        const dataKey = agora.toISOString().split('T')[0]; // ex: 2026-04-20
        const vin = document.getElementById('t-vin')?.value || "SEM_VIN";

        const registro = {
            atividade: nomeEtapa,
            hora: agora.toLocaleTimeString('pt-BR'),
            timestamp: agora.getTime(),
            vin: vin
        };

        // Salva no Firebase: teste_automotivo / DATA / VIN / REGISTROS
        database.ref(`testes/${dataKey}/${vin}/passagens`).push(registro);

        // Registro local para interface
        this.checkins.push(registro);
        if ('vibrate' in navigator) navigator.vibrate(50);
        this.etapaAtualIndex++;
        this.atualizarInterfaceCola();
    },

    async gerarRelatorioDiarioFirebase() {
        const agora = new Date();
        const dataKey = agora.toISOString().split('T')[0];
        const vin = document.getElementById('t-vin')?.value || "SEM_VIN";
        
        alert("Buscando dados no Firebase... Aguarde.");

        database.ref(`testes/${dataKey}/${vin}/passagens`).once('value', (snapshot) => {
            const dados = snapshot.val();
            if (!dados) return alert("Nenhum registro encontrado para hoje.");

            const listaRegistros = Object.values(dados);
            
            // Lógica de Contagem de Voltas (Agrupamento)
            const resumo = {};
            listaRegistros.forEach(r => {
                const baseNome = r.atividade.split(':')[0]; // Pega só o nome da pista
                resumo[baseNome] = (resumo[baseNome] || 0) + 1;
            });

            this.exportarPDFEngenharia(listaRegistros, resumo, vin);
        });
    },

    exportarPDFEngenharia(registros, resumo, vin) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Estilo Dark/Tech para o PDF
        doc.setFillColor(15, 23, 42); // Fundo Slate 900
        doc.rect(0, 0, 210, 40, 'F');
        
        doc.setTextColor(56, 189, 248); // Azul Neon
        doc.setFontSize(18);
        doc.text("ENGINEERING TEST SUMMARY", 105, 20, { align: "center" });
        doc.setFontSize(10);
        doc.text(`VIN: ${vin} | DATA: ${new Date().toLocaleDateString('pt-BR')}`, 105, 28, { align: "center" });

        // Tabela de Agrupamento (Quantas voltas por pista)
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.text("RESUMO DE CICLOS EXECUTADOS:", 14, 50);
        
        const tabelaResumo = Object.keys(resumo).map(pista => [pista, resumo[pista]]);
        doc.autoTable({
            startY: 55,
            head: [['PISTA / TESTE', 'TOTAL DE VOLTAS/PASSAGENS']],
            body: tabelaResumo,
            theme: 'striped',
            headStyles: { fillColor: [56, 189, 248] }
        });

        // Tabela de Log Completo (Linha do Tempo)
        doc.text("LOG DETALHADO (TIMELINE):", 14, doc.lastAutoTable.finalY + 15);
        const tabelaLog = registros.map(r => [r.hora, r.atividade]);
        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 20,
            head: [['HORÁRIO', 'DESCRIÇÃO DA ETAPA']],
            body: tabelaLog,
            theme: 'grid'
        });

        doc.save(`Summary_Eng_${vin}_${Date.now()}.pdf`);
    },

    // ==========================================
    // IA - ASSISTENTE DE ENGENHARIA (Inalterado)
    // ==========================================
    async melhorarTextoComIA(botao) {
        const textarea = document.getElementById('i-obs');
        const textoOriginal = textarea.value.trim();
        if (textoOriginal.toUpperCase() === "RESETAR") {
            localStorage.removeItem("cofre_chave_gemini");
            textarea.value = ""; return alert("✅ Chave apagada!");
        }
        if (textoOriginal.length < 5) return alert("Escreva algo mais...");
        let API_KEY = localStorage.getItem("cofre_chave_gemini");
        if (!API_KEY) {
            API_KEY = prompt("Cole sua Chave Gemini:");
            if (!API_KEY) return; 
            localStorage.setItem("cofre_chave_gemini", API_KEY.trim());
        }
        const conteudoOriginalBotao = botao.innerHTML;
        botao.innerHTML = '...'; botao.disabled = true;
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
            const resposta = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: "Reescreva tecnicamente: " + textoOriginal }] }] })
            });
            const dados = await resposta.json();
            if (dados.candidates) textarea.value = dados.candidates[0].content.parts[0].text.trim();
        } catch (e) { alert("Erro na IA"); }
        botao.innerHTML = conteudoOriginalBotao; botao.disabled = false;
    },

    // Auxiliares de UI
    atualizarInterfaceCola() {
        if (this.etapaAtualIndex < this.sequenciaDiasPares.length) {
            document.getElementById('etapa-atual').innerText = this.sequenciaDiasPares[this.etapaAtualIndex];
            let seguinte = "Fim";
            if(this.etapaAtualIndex + 1 < this.sequenciaDiasPares.length) seguinte = `Em seguida: ${this.sequenciaDiasPares[this.etapaAtualIndex + 1]}`;
            document.getElementById('etapa-seguinte').innerText = seguinte;
        }
        const listaCola = document.getElementById('lista-cola');
        listaCola.innerHTML = this.sequenciaDiasPares.map((etapa, idx) => {
            let classe = "cola-item"; if (idx < this.etapaAtualIndex) classe += " concluido"; else if (idx === this.etapaAtualIndex) classe += " ativo";
            return `<div class="${classe}"><span>${idx + 1}. ${etapa}</span></div>`;
        }).join('');
    }
};

window.onload = () => app.init();
