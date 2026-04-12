const app = {
    fotos: [],
    logoBase64Cache: null,

    init() {
        this.converterLogoParaBase64('logo.png');
    },

    // --- CONTROLE DA JANELA (MODAL) ---
    abrirModal() {
        document.getElementById('modal-laudo').style.display = 'flex';
    },

    fecharModal() {
        document.getElementById('modal-laudo').style.display = 'none';
    },

    // --- PROCESSAMENTO DE FOTOS HD ---
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
                <div onclick="app.fotos.splice(${i},1);app.renderGaleria()" style="position:absolute; top:-5px; right:-5px; background:red; color:white; border-radius:50%; width:20px; height:20px; font-size:14px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-weight:bold;">×</div>
            </div>
        `).join('');
    },

    // --- CORREÇÃO DA LOGO ---
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

    // --- GERAÇÃO DO PDF FORMAL ---
    async gerarPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const id = document.getElementById('f-id').value || "S/N";

        if (this.logoBase64Cache) {
            const props = doc.getImageProperties(this.logoBase64Cache);
            const w = 40; 
            const h = (props.height * w) / props.width;
            doc.addImage(this.logoBase64Cache, 'PNG', 14, 10, w, h);
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(0, 52, 120);
        doc.text("LAUDO TÉCNICO DE INVARIA", 196, 20, { align: "right" });

        doc.autoTable({
            startY: 30,
            head: [['Campo', 'Informação Técnica']],
            body: [
                ['Veículo / Placa', id],
                ['Data do Registro', new Date().toLocaleDateString('pt-BR')],
                ['Inspetor Responsável', 'EJA: 3108 / CC: 2748']
            ],
            headStyles: { fillColor: [0, 52, 120] }
        });

        doc.setFontSize(11);
        doc.text("PARECER TÉCNICO:", 14, doc.lastAutoTable.finalY + 15);
        doc.setFont("helvetica", "normal");
        const obs = doc.splitTextToSize(document.getElementById('f-obs').value || "Nenhuma anomalia crítica registrada no momento do laudo.", 180);
        doc.text(obs, 14, doc.lastAutoTable.finalY + 22);

        if (this.fotos.length > 0) {
            doc.addPage();
            doc.text("ANEXOS FOTOGRÁFICOS (EVIDÊNCIAS)", 105, 15, { align: "center" });
            let y = 25;
            for (let f of this.fotos) {
                if (y + 70 > 280) { doc.addPage(); y = 20; }
                doc.addImage(f, 'JPEG', 14, y, 90, 65);
                y += 75;
            }
        }

        const fileName = `Laudo_Invaria_${id}.pdf`;
        
        // Fecha a janela do laudo e limpa os campos
        this.fecharModal();
        document.getElementById('f-id').value = '';
        document.getElementById('f-obs').value = '';
        this.fotos = [];
        this.renderGaleria();

        if (navigator.share && navigator.canShare) {
            try {
                const blob = doc.output('blob');
                const file = new File([blob], fileName, { type: "application/pdf" });
                await navigator.share({ files: [file], title: fileName });
            } catch (e) { doc.save(fileName); }
        } else {
            doc.save(fileName);
        }
    }
};

window.onload = () => app.init();
