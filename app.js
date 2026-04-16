const app = {
    // Arrays para Laudo de Avaria
    fotos: [],
    videosFiles: [], // Guarda os arquivos de vídeo para enviar depois
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
                // É um vídeo! Guarda o arquivo bruto para enviar no final
                this.videosFiles.push(file);
                this.renderGaleria();
            } else if (file.type.startsWith('image/')) {
                // É uma foto! Comprime para o PDF
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
        
        // Renderiza as fotos
        this.fotos.forEach((f, i) => {
            html += `
            <div class="photo-wrapper">
                <button class="btn-delete-photo" onclick="app.removerFoto(${i})">×</button>
                <img src="${f.src}">
                <input type="text" placeholder="Legenda da foto..." oninput="app.fotos[${i}].legenda=this.value">
            </div>`;
        });

        // Renderiza os vídeos (apenas um ícone visual para mostrar que anexou)
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
        const parecer = document.getElementById('i-obs').value || "Sem observações adicionais.";
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // CABEÇALHO DO PDF PROFISSIONAL
        if (this.logoBase64Cache) doc.addImage(this.logoBase64Cache, 'PNG', 14, 10, 30, 10);
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(0, 52, 120); // Azul Ford
        doc.text("LAUDO TÉCNICO DE AVARIA", 196, 18, { align: "right" });
        
        // Linha Divisória
        doc.setDrawColor(0, 52, 120);
        doc.setLineWidth(0.5);
        doc.line(14, 24, 196, 24);

        // INFORMAÇÕES DO VEÍCULO (TABELA LIMPA)
        doc.autoTable({
            startY: 28,
            body: [
                ['Veículo / VIN:', id, 'Data / Hora:', new Date().toLocaleString('pt-BR')],
                ['Condutor / Eng:', motorista, 'Total de Vídeos:', this.videosFiles.length.toString()],
                ['Parecer Técnico:', { content: parecer, colSpan: 3 }]
            ],
            theme: 'plain',
            styles: { fontSize: 10, cellPadding: 2, textColor: [30, 41, 59] },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 35 }, 2: { fontStyle: 'bold', cellWidth: 35 } }
        });

        // FOTOS
        if (this.fotos.length > 0) {
            let y = doc.lastAutoTable.finalY + 10;
            this.fotos.forEach((f, i) => {
                if (y > 200) { doc.addPage(); y = 20; }
                const imgProps = doc.getImageProperties(f.src);
                const ratio = imgProps.height / imgProps.width;
                doc.addImage(f.src, 'JPEG', 14, y, 90, 90 * ratio); // Foto maior
                
                doc.setFont("helvetica", "normal");
                doc.setFontSize(10);
                doc.text(`Evidência ${i+1}: ${f.legenda || 'Sem legenda'}`, 14, y + (90 * ratio) + 5);
                y += (90 * ratio) + 15;
            });
        }

        // TENTAR COMPARTILHAR PDF + VÍDEO NO TEAMS/WPP
        const fileName = `Laudo_${id}.pdf`;
        const pdfBlob = doc.output('blob');
        const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
        
        // Junta o arquivo do PDF com os arquivos de vídeo selecionados
        const arquivosParaEnviar = [pdfFile, ...this.videosFiles];

        // Usa a função nativa do iPhone/Android de compartilhar
        if (navigator.canShare && navigator.canShare({ files: arquivosParaEnviar })) {
            try {
                await navigator.share({
                    title: 'Laudo de Avaria',
                    text: `Laudo técnico e mídias anexadas - VIN: ${id}`,
                    files: arquivosParaEnviar
                });
                window.appUI.fecharModal('modal-laudo');
            } catch (e) {
                console.log("Compartilhamento cancelado", e);
                // Se o usuário cancelar, apenas baixa o PDF normalmente
                doc.save(fileName);
            }
        } else {
            // Se o celular/computador for antigo e não suportar envio simultâneo
            doc.save(fileName);
            if(this.videosFiles.length > 0) {
                alert("O PDF foi baixado! Você precisa anexar os vídeos manualmente lá no Teams/WhatsApp.");
            }
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
