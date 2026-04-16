const app = {
    // Arrays para Laudo de Avaria
    fotos: [],
    videosFiles: [], 
    logoBase64Cache: null,
    
    // Arrays para o Roteiro
    checkins: [],
    roteiroData: [
        { nome: "Frenagem 80km/h", cola: "Acionamento firme, observar desvio de trajetória." },
        { nome: "Pista de Ruído", cola: "Verificar barulhos no painel e suspensão dianteira." },
        { nome: "Slalom / Estabilidade", cola: "Teste de guinada rápida em baixa velocidade." },
        { nome: "Pista de Alta", cola: "Manter 120km/h constante para análise de vibração." },
        { nome: "Labirinto", cola: "Verificar fim de curso da direção e estalos." }
    ],

    init() {
        this.converterLogoParaBase64('logo.png');
        document.getElementById('t-data').value = new Date().toISOString().split('T')[0];
        this.renderRoteiro();
    },

    // ==========================================
    // MÓDULO: ROTEIRO DE TESTE (COLA)
    // ==========================================
    renderRoteiro() {
        const container = document.getElementById('lista-roteiro');
        container.innerHTML = this.roteiroData.map((item, index) => `
            <div class="roteiro-item" onclick="app.marcarEtapa('${item.nome}')">
                <h4>${item.nome}</h4>
                <p>${item.cola}</p>
            </div>
        `).join('');
    },

    marcarEtapa(nome) {
        const agora = new Date();
        const horario = agora.toLocaleTimeString('pt-BR');
        this.checkins.push({ atividade: nome, hora: horario, timestamp: agora });
        
        const log = document.getElementById('log-roteiro');
        if(this.checkins.length === 1) log.innerHTML = "";
        log.innerHTML = `<div><strong style="color:#8b5cf6">[${horario}]</strong> ${nome} concluído.</div>` + log.innerHTML;
        
        if ('vibrate' in navigator) navigator.vibrate(50);
    },

    async gerarRelatorioRoteiro() {
        if (this.checkins.length === 0) return alert("Nenhuma atividade registrada.");

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(16);
        doc.text("RELATÓRIO DE EXECUÇÃO DE TESTE", 105, 20, { align: "center" });
        doc.setFontSize(10);
        doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 105, 28, { align: "center" });

        const dadosTabela = this.checkins.map((c, i) => [i + 1, c.atividade, c.hora]);

        doc.autoTable({
            startY: 35,
            head: [['#', 'ATIVIDADE EXECUTADA', 'HORÁRIO DO CHECK-IN']],
            body: dadosTabela,
            theme: 'grid',
            headStyles: { fillColor: [0, 52, 120] }
        });

        doc.save(`Relatorio_Teste_${Date.now()}.pdf`);
    },

    // ==========================================
    // MÓDULO: LAUDO DE AVARIA (FOTOS E VÍDEOS)
    // ==========================================
    converterLogoParaBase64(url) {
        const img = new Image();
        img.src = url;
        img.onload = () => {
            const cv = document.createElement('canvas');
            cv.width = img.width; cv.height = img.height;
            cv.getContext('2d').drawImage(img, 0, 0);
            this.logoBase64Cache = cv.toDataURL('image/png');
        };
    },

    handleMedia(e) {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            if (file.type.startsWith('video/')) {
                this.videosFiles.push(file);
                this.renderGaleria();
            } else if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    this.comprimir(ev.target.result, 1600, 1600, (img) => {
                        this.fotos.push({ src: img, legenda: '' });
                        this.renderGaleria();
                    });
                };
                reader.readAsDataURL(file);
            }
        });
    },

    comprimir(base64, maxW, maxH, cb) {
        const img = new Image();
        img.src = base64;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let w = img.width, h = img.height;
            if (w > h) { if (w > maxW) { h *= maxW / w; w = maxW; } } else { if (h > maxH) { w *= maxH / h; h = maxH; } }
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, w, h);
            cb(canvas.toDataURL('image/jpeg', 0.95));
        };
    },

    removerFoto(index) { this.fotos.splice(index, 1); this.renderGaleria(); },
    removerVideo(index) { this.videosFiles.splice(index, 1); this.renderGaleria(); },

    renderGaleria() {
        const g = document.getElementById('galeria-avaria');
        let html = '';
        
        this.fotos.forEach((f, i) => {
            html += `
            <div class="photo-wrapper">
                <button class="btn-delete-photo" onclick="app.removerFoto(${i})">×</button>
                <img src="${f.src}">
                <input type="text" placeholder="Legenda da foto..." oninput="app.fotos[${i}].legenda=this.value">
            </div>`;
        });

        this.videosFiles.forEach((v, i) => {
            html += `
            <div class="photo-wrapper" style="background: #e0f2fe; border-color: #7dd3fc; display:flex; flex-direction:column; align-items:center; justify-content:center; padding: 1rem;">
                <button class="btn-delete-photo" style="background: #0284c7;" onclick="app.removerVideo(${i})">×</button>
                <span class="material-icons" style="font-size: 3rem; color: #0284c7;">movie</span>
                <p style="font-size: 0.7rem; color: #0284c7; font-weight: bold; margin-top: 10px;">Vídeo Anexado</p>
                <p style="font-size: 0.6rem; color: #64748b;">Pronto p/ Envio</p>
            </div>`;
        });

        g.innerHTML = html;
    },

    async gerarECompartilharLaudo() {
        const id = document.getElementById('i-id').value || "SN";
        const motorista = document.getElementById('i-motorista').value || "Não informado";
        const parecer = document.getElementById('i-obs').value || "Sem observações adicionais registradas no momento da inspeção.";
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // ==========================================
        // CABEÇALHO PROFISSIONAL
        // ==========================================
        if (this.logoBase64Cache) doc.addImage(this.logoBase64Cache, 'PNG', 14, 10, 30, 10);
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(0, 52, 120);
        doc.text("LAUDO TÉCNICO DE AVARIA / INSPEÇÃO", 196, 16, { align: "right" });
        
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text("Documento Oficial de Engenharia e Qualidade", 196, 21, { align: "right" });
        
        // Linha Azul
        doc.setDrawColor(0, 52, 120);
        doc.setLineWidth(0.5);
        doc.line(14, 25, 196, 25);

        // ==========================================
        // TABELA COM FUNDO COLORIDO
        // ==========================================
        doc.autoTable({
            startY: 30,
            body: [
                ['Veículo / VIN:', id, 'Data da Inspeção:', new Date().toLocaleString('pt-BR')],
                ['Condutor / Eng:', motorista, 'Mídias Anexadas:', `${this.fotos.length} Foto(s), ${this.videosFiles.length} Vídeo(s)`]
            ],
            theme: 'grid',
            headStyles: { fillColor: [240, 248, 255] },
            styles: { fontSize: 10, cellPadding: 4, textColor: [30, 41, 59], lineColor: [200, 200, 200] },
            columnStyles: { 
                0: { fontStyle: 'bold', fillColor: [241, 245, 249], cellWidth: 35 }, 
                2: { fontStyle: 'bold', fillColor: [241, 245, 249], cellWidth: 35 } 
            }
        });

        // ==========================================
        // CAIXA DE PARECER TÉCNICO (BOX SOMBREADO)
        // ==========================================
        let currentY = doc.lastAutoTable.finalY + 10;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(0, 52, 120);
        doc.text("PARECER TÉCNICO / DESCRIÇÃO DA AVARIA:", 14, currentY);

        currentY += 4;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);

        // Quebra o texto para caber no box
        const splitText = doc.splitTextToSize(parecer, 178);
        const boxHeight = (splitText.length * 5) + 10;
        
        // Desenha a caixa de fundo cinza claro
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(203, 213, 225);
        doc.rect(14, currentY, 182, boxHeight, 'FD'); 
        doc.text(splitText, 18, currentY + 7);

        // ==========================================
        // RENDERIZAÇÃO DE FOTOS
        // ==========================================
        if (this.fotos.length > 0) {
            let y = currentY + boxHeight + 15;
            this.fotos.forEach((f, i) => {
                if (y > 200) { doc.addPage(); y = 20; }
                const imgProps = doc.getImageProperties(f.src);
                const ratio = imgProps.height / imgProps.width;
                
                doc.setDrawColor(200, 200, 200);
                doc.rect(14, y, 90, 90 * ratio); // Borda na foto
                doc.addImage(f.src, 'JPEG', 14, y, 90, 90 * ratio);
                
                doc.setFont("helvetica", "bold");
                doc.setFontSize(10);
                doc.text(`Evidência ${i+1}:`, 14, y + (90 * ratio) + 6);
                doc.setFont("helvetica", "normal");
                doc.text(`${f.legenda || 'Sem legenda'}`, 36, y + (90 * ratio) + 6);
                
                y += (90 * ratio) + 15;
            });
        }

        // ==========================================
        // PREPARAÇÃO PARA O ENVIO (WHATSAPP/TEAMS)
        // ==========================================
        const fileName = `Laudo_Avaria_${id}.pdf`;
        const pdfBlob = doc.output('blob');
        const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
        
        // 🚀 O SEGREDO DOS VÍDEOS: Renomeando os arquivos para ficar profissional
        const videosRenomeados = this.videosFiles.map((file, index) => {
            // Pega a extensão original ou usa mp4
            const extension = file.name.split('.').pop() || 'mp4';
            return new File([file], `Video_Evidencia_${id}_0${index+1}.${extension}`, { type: file.type });
        });

        const arquivosParaEnviar = [pdfFile, ...videosRenomeados];
        
        // Texto que será enviado junto com a mensagem
        const mensagemTexto = `Segue o Laudo Técnico de Avaria (PDF) e o(s) vídeo(s) referente(s) ao laudo acima.\n\n🚗 VIN: ${id}\n👤 Condutor/Eng: ${motorista}`;

        if (navigator.canShare && navigator.canShare({ files: arquivosParaEnviar })) {
            try {
                await navigator.share({
                    title: `Laudo Técnico - ${id}`,
                    text: mensagemTexto,
                    files: arquivosParaEnviar
                });
                window.appUI.fecharModal('modal-laudo');
            } catch (e) {
                console.log("Compartilhamento cancelado pelo usuário", e);
                doc.save(fileName);
            }
        } else {
            doc.save(fileName);
            if(this.videosFiles.length > 0) alert("Baixado! Anexe o vídeo manualmente no WhatsApp/Teams.");
        }
    },

    // ==========================================
    // MÓDULO: FECHAMENTO DE TURNO
    // ==========================================
    async finalizarTurnoIntegrado() {
        const v = document.getElementById('t-veiculo').value;
        const dataBruta = document.getElementById('t-data').value;
        let dataFormatada = dataBruta ? `${dataBruta.split('-')[2]}/${dataBruta.split('-')[1]}` : "";

        const texto = `*Abastecimento ${v}*\n${document.getElementById('t-turno').value} ${dataFormatada}\nVIN: ${document.getElementById('t-vin').value}\nTrip: ${document.getElementById('t-trip').value}\nKm: ${document.getElementById('t-km').value}\nLitros: ${document.getElementById('t-litros').value}\nSaldo: R$ ${document.getElementById('t-saldo').value}`;
        
        try { await navigator.clipboard.writeText(texto); alert("Texto copiado para o WhatsApp!"); } catch (e) {}
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.setFont("helvetica", "bold"); doc.setFontSize(16);
        doc.text("FECHAMENTO DE TURNO", 14, 20);
        doc.setFont("helvetica", "normal"); doc.setFontSize(12);
        doc.text(doc.splitTextToSize(texto.replace(/\*/g,''), 180), 14, 35);
        doc.save(`Turno_${document.getElementById('t-vin').value}.pdf`);
        window.appUI.fecharModal('modal-turno');
    }
};

window.onload = () => app.init();
