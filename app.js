const app = {
    fotos: [],
    logoBase64Cache: null,

    init() {
        document.getElementById('f-data').value = new Date().toISOString().split('T')[0];
        this.converterLogoParaBase64('logo.png');
    },

    // --- PROCESSAMENTO DE MÍDIA ---
    processarFotos(event) {
        const arquivos = event.target.files;
        if (!arquivos) return;
        Array.from(arquivos).forEach(arquivo => {
            const reader = new FileReader();
            reader.readAsDataURL(arquivo);
            reader.onload = (e) => {
                this.comprimirImagem(e.target.result, 800, 800, (foto) => {
                    this.fotos.push({ src: foto, descricao: "" });
                    this.atualizarGaleria();
                });
            };
        });
    },

    comprimirImagem(base64, maxW, maxH, callback) {
        const img = new Image();
        img.src = base64;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let w = img.width, h = img.height;
            if (w > h) { if (w > maxW) { h *= maxW / w; w = maxW; } }
            else { if (h > maxH) { w *= maxH / h; h = maxH; } }
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            callback(canvas.toDataURL('image/jpeg', 0.7));
        };
    },

    atualizarGaleria() {
        const div = document.getElementById('galeria');
        div.innerHTML = '';
        this.fotos.forEach((f, i) => {
            div.innerHTML += `
                <div class="photo-card" style="margin-bottom:10px;">
                    <img src="${f.src}" style="width:100px; height:100px; object-fit:cover; border-radius:5px;">
                    <input type="text" placeholder="Legenda da foto..." onchange="app.fotos[${i}].descricao = this.value" style="display:block; width:100px; font-size:10px; margin-top:2px;">
                    <button onclick="app.removerFoto(${i})" style="background:red; color:white; border:none; padding:2px 5px; cursor:pointer;">X</button>
                </div>
            `;
        });
    },

    removerFoto(i) { this.fotos.splice(i, 1); this.atualizarGaleria(); },

    converterLogoParaBase64(url) {
        const img = new Image();
        img.src = url;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width; canvas.height = img.height;
            canvas.getContext('2d').drawImage(img, 0, 0);
            this.logoBase64Cache = canvas.toDataURL('image/png');
        };
    },

    // --- GERAÇÃO DO LAUDO FORMAL ---
    async gerarPDF() {
        const id = document.getElementById('f-id').value.toUpperCase();
        const obs = document.getElementById('f-obs').value;
        const dataInspecao = document.getElementById('f-data').value.split('-').reverse().join('/');
        
        if (!id) return alert("Preencha a Identificação do Veículo!");

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // 1. Cabeçalho Oficial
        if (this.logoBase64Cache) {
            doc.addImage(this.logoBase64Cache, 'PNG', 14, 10, 35, 12);
        }
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("LAUDO TÉCNICO DE INSPEÇÃO - INVARIA", 196, 18, {align: "right"});
        
        doc.setDrawColor(0, 52, 120);
        doc.setLineWidth(0.5);
        doc.line(14, 25, 196, 25);

        // 2. Informações Gerais (Tabela Simples)
        doc.setFontSize(10);
        doc.setFillColor(240, 240, 240);
        doc.rect(14, 30, 182, 25, 'F');
        
        doc.setTextColor(0);
        doc.text(`VEÍCULO / PLACA: ${id}`, 18, 38);
        doc.text(`DATA DA INSPEÇÃO: ${dataInspecao}`, 18, 45);
        doc.text(`RESPONSÁVEL: EJA 3108 - CC 2748`, 110, 38);
        doc.text(`STATUS: ${this.fotos.length > 0 ? 'COM ANOMALIAS' : 'CONFORME (OK)'}`, 110, 45);

        // 3. Corpo do Relatório
        doc.setFontSize(12);
        doc.text("1. DESCRIÇÃO DA INSPEÇÃO", 14, 65);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        const relato = doc.splitTextToSize(obs || "Inspeção realizada conforme padrões operacionais. Veículo não apresenta avarias externas ou mecânicas aparentes.", 182);
        doc.text(relato, 14, 72);

        // 4. Anexos Fotográficos (Se houver)
        let y = 80 + (relato.length * 5);
        if (this.fotos.length > 0) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.text("2. EVIDÊNCIAS FOTOGRÁFICAS", 14, y);
            y += 8;

            let xPos = 14;
            for (let i = 0; i < this.fotos.length; i++) {
                if (y + 55 > 270) { doc.addPage(); y = 20; xPos = 14; }
                
                doc.addImage(this.fotos[i].src, 'JPEG', xPos, y, 55, 55);
                doc.setFontSize(8);
                doc.setFont("helvetica", "italic");
                doc.text(`Fig. ${i+1}: ${this.fotos[i].descricao || 'Sem legenda'}`, xPos, y + 59);
                
                xPos += 62;
                if (xPos > 140) { xPos = 14; y += 68; }
            }
        }

        // 5. Rodapé e Assinatura
        const pageHeight = doc.internal.pageSize.height;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text("________________________________________________", 105, pageHeight - 25, {align: "center"});
        doc.text("Responsável Técnico pela Inspeção", 105, pageHeight - 20, {align: "center"});
        doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, pageHeight - 10);

        // 6. Enviar/Salvar
        const fileName = `Laudo_${id}_${Date.now()}.pdf`;
        if (navigator.share) {
            const blob = doc.output('blob');
            const file = new File([blob], fileName, { type: "application/pdf" });
            navigator.share({ files: [file], title: fileName });
        } else {
            doc.save(fileName);
        }
    }
};

window.onload = () => app.init();
