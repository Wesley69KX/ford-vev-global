const app = {
    fotos: [],
    logoBase64Cache: null,

    init() {
        this.converterLogoParaBase64('logo.png');
    },

    abrirModal() { window.appUI.abrirModal(); },
    fecharModal() { window.appUI.fecharModal(); },

    handleFotos(e) {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                this.comprimir(ev.target.result, 1600, 1600, (img) => {
                    this.fotos.push(img);
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

    renderGaleria() {
        const g = document.getElementById('galeria');
        g.innerHTML = this.fotos.map((f, i) => `
            <div style="position:relative">
                <img src="${f}" class="thumb">
                <div onclick="app.fotos.splice(${i},1);app.renderGaleria()" style="position:absolute; top:-5px; right:-5px; background:red; color:white; border-radius:50%; width:22px; height:22px; font-size:14px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-weight:bold;">×</div>
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

    async gerarPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        const id = document.getElementById('f-id').value || "S/N";
        const km = document.getElementById('f-km').value || "---";
        const motorista = document.getElementById('f-motorista').value || "Não Informado";
        const registro = document.getElementById('f-registro').value || "---";
        const obs = document.getElementById('f-obs').value || "Nenhuma anomalia crítica registrada.";

        // --- LOGO DISCRETA (30% menor) ---
        if (this.logoBase64Cache) {
            const props = doc.getImageProperties(this.logoBase64Cache);
            const w = 28; // Reduzido de 40 para 28
            const h = (props.height * w) / props.width;
            doc.addImage(this.logoBase64Cache, 'PNG', 14, 12, w, h);
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(0, 52, 120);
        doc.text("RELATÓRIO TÉCNICO DE ENGENHARIA", 196, 20, { align: "right" });
        
        doc.setDrawColor(200, 200, 200);
        doc.line(14, 28, 196, 28);

        // --- TABELA DE IDENTIFICAÇÃO (MAIS PROFISSIONAL) ---
        doc.autoTable({
            startY: 35,
            head: [['INFORMAÇÕES DO VEÍCULO E CONDUTOR', 'DETALHES']],
            body: [
                ['PLACA / VIN', id],
                ['QUILOMETRAGEM', km + " KM"],
                ['CONDUTOR RESPONSÁVEL', motorista],
                ['REGISTRO / CDSID', registro],
                ['DATA DA EMISSÃO', new Date().toLocaleDateString('pt-BR')],
                ['LOCAL / CC', 'CENTRO DE CUSTO: 2748'],
                ['INSPETOR TÉCNICO', 'EJA: 3108']
            ],
            theme: 'grid',
            headStyles: { fillColor: [0, 52, 120], fontSize: 9 },
            styles: { fontSize: 8, cellPadding: 2 }
        });

        // --- PARECER TÉCNICO ---
        let finalY = doc.lastAutoTable.finalY;
        doc.setFontSize(10);
        doc.setTextColor(0, 52, 120);
        doc.text("PARECER TÉCNICO E OBSERVAÇÕES:", 14, finalY + 12);
        
        doc.setFont("helvetica", "normal");
        doc.setTextColor(50, 50, 50);
        const splitObs = doc.splitTextToSize(obs, 180);
        doc.text(splitObs, 14, finalY + 18);

        // --- FOTOS EM GRID ORGANIZADO ---
        if (this.fotos.length > 0) {
            doc.addPage();
            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.setTextColor(0, 52, 120);
            doc.text("EVIDÊNCIAS FOTOGRÁFICAS (ALTA RESOLUÇÃO)", 105, 15, { align: "center" });
            
            let y = 25;
            let x = 14;
            this.fotos.forEach((foto, index) => {
                if (y + 70 > 280) { doc.addPage(); y = 20; x = 14; }
                
                doc.addImage(foto, 'JPEG', x, y, 85, 65);
                doc.setFontSize(8);
                doc.text(`Evidência #${index + 1}`, x, y + 70);
                
                x = x === 14 ? 110 : 14;
                if (x === 14) y += 80;
            });
        }

        // --- RODAPÉ ---
        const pageCount = doc.internal.getNumberOfPages();
        for(let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Ford VEV Global - Documento Gerado Eletronicamente via Concierge DOT - Página ${i} de ${pageCount}`, 105, 290, {align: "center"});
        }

        const fileName = `Relatorio_VEV_${id}_${Date.now()}.pdf`;
        
        // Reset e Share
        this.fecharModal();
        this.limparForm();
        
        const blob = doc.output('blob');
        const file = new File([blob], fileName, { type: "application/pdf" });
        if (navigator.share) {
            await navigator.share({ files: [file], title: fileName });
        } else {
            doc.save(fileName);
        }
    },

    limparForm() {
        document.getElementById('f-id').value = '';
        document.getElementById('f-km').value = '';
        document.getElementById('f-motorista').value = '';
        document.getElementById('f-registro').value = '';
        document.getElementById('f-obs').value = '';
        this.fotos = [];
        this.renderGaleria();
    }
};

window.onload = () => app.init();
