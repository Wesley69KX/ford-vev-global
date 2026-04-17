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
    },

    // ==========================================
    // IA - ASSISTENTE DE ENGENHARIA GEMINI
    // ==========================================
    async melhorarTextoComIA(botao) {
        const textarea = document.getElementById('i-obs');
        const textoOriginal = textarea.value.trim();

        if (textoOriginal.length < 5) {
            return alert("Escreva um pouco mais sobre o problema antes de chamar a IA.");
        }

        const conteudoOriginalBotao = botao.innerHTML;
        botao.innerHTML = '<span class="material-icons" style="font-size: 1rem;">hourglass_empty</span> GERANDO...';
        botao.style.background = "#f1f5f9";
        botao.style.color = "#64748b";
        botao.disabled = true;

        // A SUA CHAVE EXATA DO PRINT (NOVO FORMATO DO GOOGLE)
       const API_KEY = "AIzaSyB9_xYz1234567890abcdefGHIJKLMNOP"; 

        const promptComando = "Atue como um Engenheiro Automotivo Sênior. Reescreva este texto em linguagem técnica para um laudo de avaria, sendo direto, estritamente profissional, sem aspas ou introduções. O texto é: " + textoOriginal;

        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${API_KEY}`;
            
            const resposta = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: promptComando }] }]
                })
            });

            if (!resposta.ok) {
                const erroStatus = resposta.status;
                throw new Error(`O Google recusou a conexão (Código: ${erroStatus}). Se a chave for nova, pode demorar alguns minutos para ativar.`);
            }

            const dados = await resposta.json();
            
            if (dados.candidates && dados.candidates.length > 0) {
                // Verificação de bloqueio por palavras sensíveis
                if (dados.candidates[0].finishReason === "SAFETY") {
                    alert("A IA bloqueou a mensagem por identificar palavras muito fortes ou impróprias. Tente usar termos mais neutros.");
                    return;
                }

                if (dados.candidates[0].content && dados.candidates[0].content.parts) {
                    textarea.value = dados.candidates[0].content.parts[0].text.trim();
                    
                    botao.innerHTML = '<span class="material-icons" style="font-size: 1rem;">check</span> PRONTO!';
                    botao.style.background = "#dcfce7";
                    botao.style.color = "#16a34a";
                }
            } else {
                alert("A IA rodou, mas devolveu uma resposta vazia.");
            }
        } catch (error) {
            console.error("ERRO DO GEMINI:", error);
            alert("Falha de conexão: " + error.message);
        } finally {
            setTimeout(() => {
                botao.innerHTML = conteudoOriginalBotao;
                botao.style.background = "#ede9fe";
                botao.style.color = "#8b5cf6";
                botao.disabled = false;
            }, 3000);
        }
    },

    // ==========================================
    // LÓGICA DO GUIA PASSO A PASSO
    // ==========================================
    atualizarInterfaceCola() {
        if (this.etapaAtualIndex < this.sequenciaDiasPares.length) {
            document.getElementById('etapa-atual').innerText = this.sequenciaDiasPares[this.etapaAtualIndex];
            let seguinte = "Fim do Teste";
            if(this.etapaAtualIndex + 1 < this.sequenciaDiasPares.length) seguinte = `Em seguida: ${this.sequenciaDiasPares[this.etapaAtualIndex + 1]}`;
            document.getElementById('etapa-seguinte').innerText = seguinte;
        } else {
            document.getElementById('etapa-atual').innerText = "✅ TESTE CONCLUÍDO!";
            document.getElementById('etapa-seguinte').innerText = "Gere o relatório abaixo ou reinicie.";
        }

        const listaCola = document.getElementById('lista-cola');
        listaCola.innerHTML = this.sequenciaDiasPares.map((etapa, idx) => {
            let classe = "cola-item"; let icone = "radio_button_unchecked";
            if (idx < this.etapaAtualIndex) { classe += " concluido"; icone = "check_circle"; } 
            else if (idx === this.etapaAtualIndex) { classe += " ativo"; icone = "play_circle_filled"; }

            return `<div class="${classe}" onclick="app.pularParaEtapa(${idx})">
                        <span class="material-icons cola-icon">${icone}</span><span>${idx + 1}. ${etapa}</span>
                    </div>`;
        }).join('');

        setTimeout(() => {
            const itemAtivo = document.querySelector('.cola-item.ativo');
            if(itemAtivo) itemAtivo.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    },

    pularParaEtapa(idx) {
        if(confirm(`Deseja definir "${this.sequenciaDiasPares[idx]}" como o passo atual?`)) {
            this.etapaAtualIndex = idx;
            this.atualizarInterfaceCola();
        }
    },

    registrarPassagem() {
        if (this.etapaAtualIndex >= this.sequenciaDiasPares.length) return alert("O teste já foi concluído.");
        const nomeEtapa = this.sequenciaDiasPares[this.etapaAtualIndex];
        const agora = new Date();
        
        this.checkins.push({ atividade: nomeEtapa, hora: agora.toLocaleTimeString('pt-BR') });
        if ('vibrate' in navigator) navigator.vibrate(50);
        this.etapaAtualIndex++;
        this.atualizarInterfaceCola();
    },

    resetarRoteiro() {
        if(confirm("Tem certeza que deseja apagar todos os registros e voltar para o passo 1?")) {
            this.etapaAtualIndex = 0;
            this.checkins = [];
            this.atualizarInterfaceCola();
        }
    },

    async gerarRelatorioRoteiro() {
        if (this.checkins.length === 0) return alert("Nenhuma passagem registrada no guia.");
        const { jsPDF } = window.jspdf; const doc = new jsPDF();
        
        doc.setFontSize(16);
        doc.text("RELATÓRIO DE CONTROLE DE CICLOS (R389)", 105, 20, { align: "center" });
        doc.setFontSize(10);
        doc.text(`Data de Execução: ${new Date().toLocaleDateString('pt-BR')}`, 105, 28, { align: "center" });

        const dadosTabela = this.checkins.map((c, i) => [i + 1, c.atividade, c.hora]);
        doc.autoTable({
            startY: 35,
            head: [['#', 'CICLO EXECUTADO (DIAS PARES)', 'HORÁRIO DO CHECK-IN']],
            body: dadosTabela,
            theme: 'grid',
            headStyles: { fillColor: [139, 92, 246] }
        });
        doc.save(`Ciclos_R389_${Date.now()}.pdf`);
    },

    // ==========================================
    // LÓGICA DE FRENAGEM
    // ==========================================
    adicionarCicloFrenagem() {
        const vel = document.getElementById('f-vel').value;
        const obs = document.getElementById('f-obs').value || "S/ Obs";
        
        if(!vel) return alert("Por favor, digite a velocidade.");

        const hora = new Date().toLocaleTimeString('pt-BR');
        this.ciclosFrenagem.push({ velocidade: vel + " km/h", observacao: obs, hora: hora });

        document.getElementById('f-contador').innerText = this.ciclosFrenagem.length;
        this.renderListaFrenagem();

        document.getElementById('f-vel').value = '';
        document.getElementById('f-obs').value = '';
        if ('vibrate' in navigator) navigator.vibrate(50);
    },

    renderListaFrenagem() {
        const lista = document.getElementById('lista-frenagem');
        if(this.ciclosFrenagem.length === 0) {
            lista.innerHTML = '<div style="color: #94a3b8; text-align: center; padding: 1rem;">Nenhum ciclo anotado ainda.</div>';
            return;
        }

        lista.innerHTML = this.ciclosFrenagem.map((c, i) => `
            <div style="padding: 10px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between;">
                <div>
                    <strong style="color: #f97316;">Ciclo ${i + 1}</strong> <span style="color: #64748b; font-size: 0.75rem;">(${c.hora})</span><br>
                    <strong>Vel:</strong> ${c.velocidade} | <strong>Obs:</strong> ${c.observacao}
                </div>
            </div>
        `).reverse().join(''); 
    },

    resetarFrenagem() {
        if(confirm("Tem certeza que deseja apagar todos os ciclos de frenagem?")) {
            this.ciclosFrenagem = [];
            document.getElementById('f-contador').innerText = "0";
            this.renderListaFrenagem();
        }
    },

    async gerarRelatorioFrenagem() {
        if (this.ciclosFrenagem.length === 0) return alert("Nenhum ciclo de frenagem registrado.");
        const { jsPDF } = window.jspdf; const doc = new jsPDF();
        
        doc.setFontSize(16);
        doc.setTextColor(249, 115, 22); 
        doc.text("RELATÓRIO DE TESTE DE FRENAGEM", 105, 20, { align: "center" });
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.text(`Data de Execução: ${new Date().toLocaleDateString('pt-BR')} - Ciclos: ${this.ciclosFrenagem.length}`, 105, 28, { align: "center" });

        const dadosTabela = this.ciclosFrenagem.map((c, i) => [i + 1, c.hora, c.velocidade, c.observacao]);
        doc.autoTable({
            startY: 35,
            head: [['CICLO', 'HORÁRIO', 'VELOCIDADE', 'OBSERVAÇÕES / CONDIÇÕES']],
            body: dadosTabela,
            theme: 'grid',
            headStyles: { fillColor: [249, 115, 22] }
        });
        doc.save(`Frenagem_${Date.now()}.pdf`);
    },

    // ==========================================
    // LAUDO DE AVARIA
    // ==========================================
    handleMedia(e) {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            if (file.type.startsWith('video/')) { this.videosFiles.push(file); this.renderGaleria(); } 
            else if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    this.comprimir(ev.target.result, 1600, 1600, (img) => { this.fotos.push({ src: img, legenda: '' }); this.renderGaleria(); });
                };
                reader.readAsDataURL(file);
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
        this.fotos.forEach((f, i) => {
            html += `<div class="photo-wrapper"><button class="btn-delete-photo" onclick="app.removerFoto(${i})">×</button><img src="${f.src}"><input type="text" placeholder="Legenda..." oninput="app.fotos[${i}].legenda=this.value"></div>`;
        });
        this.videosFiles.forEach((v, i) => {
            html += `<div class="photo-wrapper" style="background: #e0f2fe; border-color: #7dd3fc; display:flex; flex-direction:column; align-items:center; justify-content:center; padding: 1rem;"><button class="btn-delete-photo" style="background: #0284c7;" onclick="app.removerVideo(${i})">×</button><span class="material-icons" style="font-size: 3rem; color: #0284c7;">movie</span><p style="font-size: 0.7rem; color: #0284c7; font-weight: bold; margin-top: 10px;">Vídeo Anexado</p></div>`;
        });
        g.innerHTML = html;
    },

    async gerarECompartilharLaudo() {
        const id = document.getElementById('i-id').value || "SN"; const motorista = document.getElementById('i-motorista').value || "Não informado"; const parecer = document.getElementById('i-obs').value || "Sem observações adicionais.";
        const { jsPDF } = window.jspdf; const doc = new jsPDF();
        
        doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(0, 52, 120); doc.text("FORD VEV - ENGENHARIA", 14, 18);
        doc.setFontSize(12); doc.setTextColor(30, 41, 59); doc.text("LAUDO TÉCNICO DE AVARIA", 196, 18, { align: "right" });
        doc.setDrawColor(0, 52, 120); doc.setLineWidth(0.8); doc.line(14, 22, 196, 22);

        doc.autoTable({
            startY: 28,
            body: [['Veículo / VIN:', id, 'Data da Inspeção:', new Date().toLocaleString('pt-BR')], ['Condutor / Eng:', motorista, 'Mídias Anexadas:', `${this.fotos.length} Foto(s), ${this.videosFiles.length} Vídeo(s)`]],
            theme: 'grid', headStyles: { fillColor: [240, 248, 255] }, styles: { fontSize: 10, cellPadding: 4, textColor: [30, 41, 59], lineColor: [200, 200, 200] },
            columnStyles: { 0: { fontStyle: 'bold', fillColor: [241, 245, 249], cellWidth: 35 }, 2: { fontStyle: 'bold', fillColor: [241, 245, 249], cellWidth: 35 } }
        });

        let currentY = doc.lastAutoTable.finalY + 10;
        doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(0, 52, 120); doc.text("PARECER TÉCNICO / DESCRIÇÃO:", 14, currentY);
        currentY += 4; doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(30, 41, 59);
        const splitText = doc.splitTextToSize(parecer, 178); const boxHeight = (splitText.length * 5) + 10;
        doc.setFillColor(248, 250, 252); doc.setDrawColor(203, 213, 225); doc.rect(14, currentY, 182, boxHeight, 'FD'); doc.text(splitText, 18, currentY + 7);

        if (this.fotos.length > 0) {
            let y = currentY + boxHeight + 15;
            this.fotos.forEach((f, i) => {
                if (y > 200) { doc.addPage(); y = 20; }
                const imgProps = doc.getImageProperties(f.src); const ratio = imgProps.height / imgProps.width;
                doc.setDrawColor(200, 200, 200); doc.rect(14, y, 90, 90 * ratio); doc.addImage(f.src, 'JPEG', 14, y, 90, 90 * ratio);
                doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.text(`Evidência ${i+1}:`, 14, y + (90 * ratio) + 6);
                doc.setFont("helvetica", "normal"); doc.text(`${f.legenda || 'Sem legenda'}`, 36, y + (90 * ratio) + 6);
                y += (90 * ratio) + 15;
            });
        }

        const fileName = `Laudo_Avaria_${id}.pdf`; const pdfBlob = doc.output('blob'); const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
        const videosRenomeados = [];
        for (let i = 0; i < this.videosFiles.length; i++) {
            const file = this.videosFiles[i]; const extension = file.name.split('.').pop() || 'mp4';
            const novoNome = `Video_Evidencia_${id}_0${i+1}.${extension}`;
            const arrayBuffer = await file.arrayBuffer(); const novoBlob = new Blob([arrayBuffer], { type: file.type });
            videosRenomeados.push(new File([novoBlob], novoNome, { type: file.type }));
        }

        const arquivosParaEnviar = [pdfFile, ...videosRenomeados];
        const mensagemTexto = `Segue o Laudo Técnico de Avaria (PDF) e o(s) vídeo(s) referente(s) ao laudo acima.\n\n🚗 VIN: ${id}\n👤 Condutor/Eng: ${motorista}`;

        if (navigator.canShare && navigator.canShare({ files: arquivosParaEnviar })) {
            try { await navigator.share({ title: `Laudo - ${id}`, text: mensagemTexto, files: arquivosParaEnviar }); window.appUI.fecharModal('modal-laudo'); } 
            catch (e) { doc.save(fileName); }
        } else { doc.save(fileName); if(this.videosFiles.length > 0) alert("Baixado! Anexe o vídeo manualmente."); }
    },

    // ==========================================
    // FECHAMENTO DE TURNO
    // ==========================================
    async finalizarTurnoIntegrado() {
        const v = document.getElementById('t-veiculo').value; const dataBruta = document.getElementById('t-data').value;
        let dataFormatada = dataBruta ? `${dataBruta.split('-')[2]}/${dataBruta.split('-')[1]}` : "";
        const texto = `*Abastecimento ${v}*\n${document.getElementById('t-turno').value} ${dataFormatada}\nVIN: ${document.getElementById('t-vin').value}\nTrip: ${document.getElementById('t-trip').value}\nKm: ${document.getElementById('t-km').value}\nLitros: ${document.getElementById('t-litros').value}\nSaldo: R$ ${document.getElementById('t-saldo').value}`;
        try { await navigator.clipboard.writeText(texto); alert("Texto copiado!"); } catch (e) {}
        const { jsPDF } = window.jspdf; const doc = new jsPDF();
        doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.text("FECHAMENTO DE TURNO", 14, 20);
        doc.setFont("helvetica", "normal"); doc.setFontSize(12); doc.text(doc.splitTextToSize(texto.replace(/\*/g,''), 180), 14, 35);
        doc.save(`Turno_${document.getElementById('t-vin').value}.pdf`); window.appUI.fecharModal('modal-turno');
    }
};

window.onload = () => app.init();
