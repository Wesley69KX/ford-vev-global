const app = {
    fotos: [],
    logoBase64Cache: null,
    versiculos: [
        { texto: '"O Senhor te guardará de todo mal; ele guardará a tua alma. O Senhor guardará a tua saída e a tua entrada."', ref: 'Salmos 121:7-8' },
        { texto: '"Mil cairão ao teu lado, e dez mil à tua direita, mas tu não serás atingido."', ref: 'Salmos 91:7' },
        { texto: '"Consagre ao Senhor tudo o que você faz, e os seus planos serão bem-sucedidos."', ref: 'Provérbios 16:3' },
        { texto: '"Seja forte e corajoso! Não se apavore nem desanime, pois o Senhor estará com você."', ref: 'Josué 1:9' },
        { texto: '"O Senhor é o meu pastor, nada me faltará."', ref: 'Salmos 23:1' }
    ],

    init() {
        this.converterLogoParaBase64('logo.png');
        this.carregarVersiculo();
        document.getElementById('t-data').value = new Date().toISOString().split('T')[0];
    },

    carregarVersiculo() {
        const index = new Date().getDate() % this.versiculos.length;
        document.getElementById('verse-text').innerText = this.versiculos[index].texto;
        document.getElementById('verse-ref').innerText = this.versiculos[index].ref;
    },

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
            body: [['VIN', id], ['MOTORISTA', document.getElementById('i-motorista').value], ['DATA', new Date().toLocaleDateString()]],
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
        doc.save(`Avaria_${id}.pdf`);
    },

    async finalizarTurnoIntegrado() {
        const v = document.getElementById('t-veiculo').value;
        const data = document.getElementById('t-data').value.split('-').reverse().slice(0,2).join('/');
        const texto = `*Abastecimento ${v}*\n${document.getElementById('t-turno').value} ${data}\nVIN: ${document.getElementById('t-vin').value}\nKm: ${document.getElementById('t-km').value}\nLitros: ${document.getElementById('t-litros').value}`;
        
        await navigator.clipboard.writeText(texto);
        alert("Texto copiado para o WhatsApp!");
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.text("FECHAMENTO DE TURNO", 14, 20);
        doc.text(doc.splitTextToSize(texto.replace(/\*/g,''), 180), 14, 35);
        doc.save(`Turno_${document.getElementById('t-vin').value}.pdf`);
    }
};
window.onload = () => app.init();
