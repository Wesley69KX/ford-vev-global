const app = {
    fotos: [],
    logoBase64Cache: null,
    
    // VARIÁVEIS DO MODO PISTA
    voltaAtual: [],
    inicioVolta: null,
    cronometroInterval: null,

    init() {
        this.converterLogoParaBase64('logo.png');
        document.getElementById('t-data').value = new Date().toISOString().split('T')[0];
    },

    // =====================================
    // LÓGICA DO MODO PISTA E TELEMETRIA
    // =====================================
    registrarEtapa(etapa) {
        const agora = new Date();
        if(this.voltaAtual.length === 0) {
            this.inicioVolta = agora;
            this.iniciarCronometro();
        }

        const tempoDecorrido = this.formatarTempo(agora - this.inicioVolta);
        this.voltaAtual.push({ etapa: etapa, horario: agora.toLocaleTimeString('pt-BR'), tempo: tempoDecorrido });
        
        this.atualizarListaEtapas();
    },

    iniciarCronometro() {
        if(this.cronometroInterval) clearInterval(this.cronometroInterval);
        this.cronometroInterval = setInterval(() => {
            document.getElementById('cronometro').innerText = this.formatarTempo(new Date() - this.inicioVolta);
        }, 1000);
    },

    formatarTempo(ms) {
        let segundos = Math.floor((ms / 1000) % 60);
        let minutos = Math.floor((ms / (1000 * 60)) % 60);
        let horas = Math.floor((ms / (1000 * 60 * 60)) % 24);
        return `${horas.toString().padStart(2,'0')}:${minutos.toString().padStart(2,'0')}:${segundos.toString().padStart(2,'0')}`;
    },

    atualizarListaEtapas() {
        const lista = document.getElementById('lista-etapas');
        lista.innerHTML = this.voltaAtual.map(e => `
            <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #334155;">
                <span>${e.etapa}</span>
                <span style="color: #a78bfa;">[+${e.tempo}]</span>
            </div>
        `).join('');
    },

    async finalizarVolta() {
        if(this.voltaAtual.length === 0) return alert("Nenhuma etapa registrada.");
        clearInterval(this.cronometroInterval);

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text("RELATÓRIO DE TELEMETRIA - VOLTA", 105, 20, { align: "center" });

        const dadosTabela = this.voltaAtual.map((e, index) => [index + 1, e.etapa, e.horario, e.tempo]);
        
        doc.autoTable({
            startY: 30,
            head: [['#', 'ETAPA (PISTA)', 'HORÁRIO', 'TEMPO ACUMULADO']],
            body: dadosTabela,
            theme: 'grid',
            headStyles: { fillColor: [0, 52, 120] }
        });

        doc.save(`Telemetria_Volta_${Date.now()}.pdf`);

        // Reseta tudo
        this.voltaAtual = [];
        this.inicioVolta = null;
        document.getElementById('cronometro').innerText = "00:00:00";
        this.atualizarListaEtapas();
        window.appUI.fecharModal('modal-pista');
    },

    // =====================================
    // LÓGICA DE FOTOS E LAUDO DE AVARIA
    // =====================================
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
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, w, h);
            cb(canvas.toDataURL('image/jpeg', 0.95));
        };
    },

    renderGaleria() {
        const g = document.getElementById('galeria-avaria');
        g.innerHTML = this.fotos.map((f, i) => `
            <div class="photo-wrapper">
                <button class="btn-delete-photo" onclick="app.fotos.splice(${i},1);app.renderGaleria()">×</button>
                <img src="${f.src}">
                <input type="text" placeholder="Legenda..." oninput="app.fotos[${i}].legenda=this.value">
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

    async gerarPDFAvaria() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const id = document.getElementById('i-id').value || "S/N";
        
        if (this.logoBase64Cache) doc.addImage(this.logoBase64Cache, 'PNG', 14, 12, 28, 10);
        doc.setFontSize(14);
        doc.text("RELATÓRIO DE AVARIA - QUALIDADE", 196, 20, { align: "right" });

        doc.autoTable({
            startY: 35,
            body: [['VIN', id], ['MOTORISTA', document.getElementById('i-motorista').value], ['DATA', new Date().toLocaleDateString('pt-BR')]],
            theme: 'grid'
        });

        if (this.fotos.length > 0) {
            doc.addPage();
            let y = 20;
            this.fotos.forEach((f, i) => {
                const imgProps = doc.getImageProperties(f.src);
                const ratio = imgProps.height / imgProps.width;
                doc.addImage(f.src, 'JPEG', 14, y, 80, 80 * ratio);
                doc.text(f.legenda || `Foto ${i+1}`, 14, y + (80 * ratio) + 5);
                y += 100;
                if (y > 250) { doc.addPage(); y = 20; }
            });
        }
        
        const fileName = `Avaria_${id}.pdf`;
        doc.save(fileName);
        window.appUI.fecharModal('modal-laudo');
    },

    // =====================================
    // LÓGICA DE FECHAMENTO DE TURNO
    // =====================================
    async finalizarTurnoIntegrado() {
        const v = document.getElementById('t-veiculo').value;
        const dataBruta = document.getElementById('t-data').value;
        
        let dataFormatada = "";
        if (dataBruta) {
            const partes = dataBruta.split('-'); 
            dataFormatada = `${partes[2]}/${partes[1]}`;
        }

        const texto = `*Abastecimento ${v}*\n${document.getElementById('t-turno').value} ${dataFormatada}\nVIN: ${document.getElementById('t-vin').value}\nTrip: ${document.getElementById('t-trip').value}\nKm: ${document.getElementById('t-km').value}\nLitros: ${document.getElementById('t-litros').value}\nSaldo: R$ ${document.getElementById('t-saldo').value}`;
        
        try {
            await navigator.clipboard.writeText(texto);
            alert("Texto copiado para o WhatsApp!");
        } catch (e) {
            console.log("Erro ao copiar", e);
        }
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text("FECHAMENTO DE TURNO", 14, 20);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        doc.text(doc.splitTextToSize(texto.replace(/\*/g,''), 180), 14, 35);
        
        doc.save(`Turno_${document.getElementById('t-vin').value}.pdf`);
        window.appUI.fecharModal('modal-turno');
    }
};

window.onload = () => app.init();
