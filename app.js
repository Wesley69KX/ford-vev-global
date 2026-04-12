const app = {
    fotos: [],
    logoBase64Cache: null,

    init() {
        this.converterLogoParaBase64('logo.png');
        
        // MUDANÇA: Preenche automaticamente a data de hoje no formato YYYY-MM-DD (Padrão do calendário)
        const hoje = new Date();
        document.getElementById('t-data').value = hoje.toISOString().split('T')[0];
    },

    abrirModal(id) { window.appUI.abrirModal(id); },
    fecharModal(id) { window.appUI.fecharModal(id); },

    handleFotos(e) {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                this.comprimir(ev.target.result, 1600, 1600, (img) => {
                    this.fotos.push({ src: img, legenda: '' });
                    this.renderGaleria();
                });
            };
            reader.readAsDataURL(file);
        });
    },

    comprimir(base64, maxW, maxH, cb) {
        const img = new Image();
        img.src = base64;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let w = img.width, h = img.height;
            if (w > h) { if (w > maxW) { h *= maxW / w; w = maxW; } }
            else { if (h > maxH) { w *= maxH / h; h = maxH; } }
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, w, h);
            cb(canvas.toDataURL('image/jpeg', 0.95));
        };
    },

    atualizarLegenda(index, valor) { this.fotos[index].legenda = valor; },
    removerFoto(index) { this.fotos.splice(index, 1); this.renderGaleria(); },

    renderGaleria() {
        const g = document.getElementById('galeria-invaria');
        g.innerHTML = this.fotos.map((f, i) => `
            <div class="photo-wrapper">
                <button class="btn-delete-photo" onclick="app.removerFoto(${i})"><span class="material-icons" style="font-size:14px;">close</span></button>
                <img src="${f.src}">
                <input type="text" placeholder="Digite uma legenda..." value="${f.legenda}" oninput="app.atualizarLegenda(${i}, this.value)">
            </div>
        `).join('');
    },

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

    // ==========================================
    // 1. GERAR LAUDO INVARIA (FOTOS PROPORCIONAIS)
    // ==========================================
    async gerarPDFInvaria() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        const id = document.getElementById('i-id').value || "S/N";
        const motorista = document.getElementById('i-motorista').value || "---";
        const obs = document.getElementById('i-obs').value || "Sem observações.";

        if (this.logoBase64Cache) {
            const props = doc.getImageProperties(this.logoBase64Cache);
            const w = 28; 
            const h = (props.height * w) / props.width;
            doc.addImage(this.logoBase64Cache, 'PNG', 14, 12, w, h);
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(0, 52, 120);
        doc.text("LAUDO DE INVARIA - AUDITORIA", 196, 20, { align: "right" });
        
        doc.setDrawColor(200, 200, 200);
        doc.line(14, 28, 196, 28);

        doc.autoTable({
            startY: 35,
            head: [['INFORMAÇÕES DA AUDITORIA', 'DETALHES']],
            body: [
                ['PLACA / VIN', id],
                ['CONDUTOR / RESPONSÁVEL', motorista],
                ['DATA DA EMISSÃO', new Date().toLocaleDateString('pt-BR')],
                ['LOCAL / CC', 'CENTRO DE CUSTO: 2748']
            ],
            theme: 'grid',
            headStyles: { fillColor: [0, 52, 120], fontSize: 9 },
            styles: { fontSize: 8, cellPadding: 2 }
        });

        let finalY = doc.lastAutoTable.finalY;
        doc.setFontSize(10);
        doc.setTextColor(0, 52, 120);
        doc.text("PARECER TÉCNICO:", 14, finalY + 12);
        
        doc.setFont("helvetica", "normal");
        doc.setTextColor(50, 50, 50);
        const splitObs = doc.splitTextToSize(obs, 180);
        doc.text(splitObs, 14, finalY + 18);

        if (this.fotos.length > 0) {
            doc.addPage();
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.setTextColor(0, 52, 120);
            doc.text("ANEXO I - EVIDÊNCIAS FOTOGRÁFICAS", 14, 15);
            
            let y = 25;
            let x = 14;
            const boxWidth = 85;
            const boxHeight = 70;

            this.fotos.forEach((foto, index) => {
                if (y + boxHeight + 20 > 280) { doc.addPage(); y = 20; x = 14; }
                
                const imgProps = doc.getImageProperties(foto.src);
                const ratio = imgProps.height / imgProps.width;
                
                let renderWidth = boxWidth;
                let renderHeight = renderWidth * ratio;
                
                if (renderHeight > boxHeight) {
                    renderHeight = boxHeight;
                    renderWidth = renderHeight / ratio;
                }

                const offsetX = x + (boxWidth - renderWidth) / 2;
                const offsetY = y + (boxHeight - renderHeight) / 2;

                doc.setDrawColor(200);
                doc.rect(x, y, boxWidth, boxHeight); 
                doc.addImage(foto.src, 'JPEG', offsetX, offsetY, renderWidth, renderHeight); 
                
                doc.setFontSize(8);
                doc.setTextColor(0);
                doc.setFont("helvetica", "bold");
                doc.text(`Evidência #${index + 1}:`, x, y + boxHeight + 5);
                doc.setFont("helvetica", "normal");
                
                const txtLegenda = doc.splitTextToSize(foto.legenda || 'Sem legenda informada', boxWidth);
                doc.text(txtLegenda, x, y + boxHeight + 9);
                
                x = x === 14 ? 110 : 14;
                if (x === 14) y += boxHeight + 25;
            });
        }

        const fileName = `Invaria_${id}_${Date.now()}.pdf`;
        this.fecharModal('modal-laudo');
        this.salvarOuCompartilhar(doc, fileName);
    },

    // ==========================================
    // 2. FLUXO INTEGRADO: TURNO (ZAP + PDF)
    // ==========================================
    gerarTextoTurno() {
        const turno = document.getElementById('t-turno').value;
        const dataBruta = document.getElementById('t-data').value;
        const veiculo = document.getElementById('t-veiculo').value;
        const vin = document.getElementById('t-vin').value;
        const posto = document.getElementById('t-posto').value;
        const trip = document.getElementById('t-trip').value;
        const km = document.getElementById('t-km').value;
        const tipoComb = document.getElementById('t-tipo-comb').value;
        const litros = document.getElementById('t-litros').value;
        const saldo = document.getElementById('t-saldo').value;

        // MUDANÇA: Converte a data YYYY-MM-DD do calendário para DD/MM do zap
        let dataFormatada = "";
        if (dataBruta) {
            const partes = dataBruta.split('-'); // [YYYY, MM, DD]
            dataFormatada = `${partes[2]}/${partes[1]}`;
        }

        let texto = `*Abastecimento ${veiculo}*\n`;
        texto += `${turno} ${dataFormatada}\n`;
        texto += `VIN: ${vin}\n\n`;
        if(posto) texto += `Posto: ${posto}\n`;
        texto += `Trip: ${trip}\n`;
        texto += `Km: ${km}\n`;
        texto += `Litros ${tipoComb}: ${litros}\n`;
        if(saldo) texto += `Saldo Disponível: R$ ${saldo}\n`;

        return texto;
    },

    async finalizarTurnoIntegrado() {
        const texto = this.gerarTextoTurno();
        
        try {
            await navigator.clipboard.writeText(texto);
            alert("✅ O texto do abastecimento foi copiado com sucesso!\n\nCole no WhatsApp assim que o PDF terminar de baixar.");
        } catch (err) {
            console.log("Navegador não suporta cópia automática.", err);
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text("RELATÓRIO DE ABASTECIMENTO", 105, 20, { align: "center" });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        
        const textoLimpo = texto.replace(/\*/g, ''); 
        const linhas = doc.splitTextToSize(textoLimpo, 150);
        
        doc.setFillColor(245, 245, 245);
        doc.rect(20, 30, 170, (linhas.length * 7) + 20, 'F');
        doc.text(linhas, 30, 45);

        const fileName = `Abastecimento_${document.getElementById('t-vin').value}.pdf`;
        this.fecharModal('modal-turno');
        this.salvarOuCompartilhar(doc, fileName);
    },

    async salvarOuCompartilhar(doc, fileName) {
        const blob = doc.output('blob');
        const file = new File([blob], fileName, { type: "application/pdf" });
        if (navigator.share && navigator.canShare) {
            try { await navigator.share({ files: [file], title: fileName }); } 
            catch (e) { doc.save(fileName); }
        } else {
            doc.save(fileName);
        }
    }
};

window.onload = () => app.init();
