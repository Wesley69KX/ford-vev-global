const app = {
    fotos: [],
    logoBase64Cache: null,
    checklist: [
        { id: 1, item: "Integridade de Lataria (Sem Riscos)", status: "OK" },
        { id: 2, item: "Nível de Fluidos (Óleo/Arrefecimento)", status: "OK" },
        { id: 3, item: "Pressão e Estado dos Pneus", status: "OK" },
        { id: 4, item: "Funcionamento Elétrico (Faróis/Painel)", status: "OK" }
    ],

    init() {
        this.renderChecklist();
        this.converterLogoParaBase64('logo.png');
    },

    renderChecklist() {
        const area = document.getElementById('checklist-area');
        area.innerHTML = this.checklist.map(c => `
            <div class="check-item">
                <span>${c.item}</span>
                <div class="check-btns">
                    <button class="btn-status ${c.status === 'OK' ? 'active' : ''}" onclick="app.setCheck(${c.id}, 'OK')">OK</button>
                    <button class="btn-status ${c.status === 'FALHA' ? 'active' : ''}" onclick="app.setCheck(${c.id}, 'FALHA')">FALHA</button>
                </div>
            </div>
        `).join('');
    },

    setCheck(id, status) {
        const item = this.checklist.find(x => x.id === id);
        item.status = status;
        this.renderChecklist();
    },

    handleFotos(e) {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                this.fotos.push(ev.target.result);
                this.renderGaleria();
            };
            reader.readAsDataURL(file);
        });
    },

    renderGaleria() {
        const g = document.getElementById('galeria');
        g.innerHTML = this.fotos.map(f => `<img src="${f}" class="photo-thumb">`).join('');
    },

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

    async gerarPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const vin = document.getElementById('f-id').value || "N/A";

        // --- CORREÇÃO DA LOGO ESTICADA ---
        if (this.logoBase64Cache) {
            const imgProps = doc.getImageProperties(this.logoBase64Cache);
            const maxWidth = 45; // Largura máxima desejada
            const ratio = imgProps.height / imgProps.width;
            const finalHeight = maxWidth * ratio; // Calcula altura proporcional
            doc.addImage(this.logoBase64Cache, 'PNG', 14, 10, maxWidth, finalHeight);
        }

        // Título Formal
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(0, 52, 120);
        doc.text("RELATÓRIO TÉCNICO DE ENGENHARIA", 200, 20, { align: "right" });

        // Tabela de Dados Principais
        doc.autoTable({
            startY: 35,
            head: [['Especificação', 'Dados do Veículo']],
            body: [
                ['VIN / Placa', vin],
                ['Quilometragem', document.getElementById('f-km').value + ' km'],
                ['Nº Motor', document.getElementById('f-motor').value],
                ['Transmissão', document.getElementById('f-trans').value],
                ['Inspetor / CC', 'EJA 3108 - CC 2748']
            ],
            theme: 'grid',
            headStyles: { fillColor: [0, 52, 120] }
        });

        // Tabela de Checklist
        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 10,
            head: [['Item de Inspeção', 'Status']],
            body: this.checklist.map(c => [c.item, c.status]),
            theme: 'striped',
            headStyles: { fillColor: [100, 100, 100] }
        });

        // Conclusão
        let y = doc.lastAutoTable.finalY + 15;
        doc.setFontSize(11);
        doc.text("CONCLUSÃO TÉCNICA:", 14, y);
        doc.setFont("helvetica", "normal");
        const obs = doc.splitTextToSize(document.getElementById('f-obs').value || "Nenhuma avaria detectada durante a inspeção.", 180);
        doc.text(obs, 14, y + 7);

        // Fotos (Página de Anexos)
        if (this.fotos.length > 0) {
            doc.addPage();
            doc.text("ANEXOS FOTOGRÁFICOS", 105, 15, { align: "center" });
            let xPos = 14;
            let yPos = 25;
            this.fotos.forEach((foto, i) => {
                doc.addImage(foto, 'JPEG', xPos, yPos, 85, 65);
                xPos = xPos === 14 ? 110 : 14;
                if (xPos === 14) yPos += 75;
            });
        }

        doc.save(`Relatorio_VEV_${vin}.pdf`);
    }
};

window.onload = () => app.init();
