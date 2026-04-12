const app = {
    fotos: [], // Guarda as fotos tiradas
    logoBase64Cache: null, // Guarda a logo para o PDF

    init() {
        // Preenche a data de hoje automaticamente
        document.getElementById('f-data').value = new Date().toISOString().split('T')[0];
        
        // Converte a sua 'logo.png' silenciosamente para usar no PDF depois
        this.converterLogoParaBase64('logo.png');
    },

    // --- CÂMERA E FOTOS ---
    processarFotos(event) {
        const arquivos = event.target.files;
        if (!arquivos) return;

        Array.from(arquivos).forEach(arquivo => {
            const reader = new FileReader();
            reader.readAsDataURL(arquivo);
            reader.onload = (e) => {
                // Comprime a foto para não pesar o PDF
                this.comprimirImagem(e.target.result, 800, 800, (fotoComprimida) => {
                    this.fotos.push(fotoComprimida);
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
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > maxW) { height *= maxW / width; width = maxW; }
            } else {
                if (height > maxH) { width *= maxH / height; height = maxH; }
            }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            callback(canvas.toDataURL('image/jpeg', 0.7)); // Qualidade 70%
        };
    },

    atualizarGaleria() {
        const div = document.getElementById('galeria');
        div.innerHTML = '';
        this.fotos.forEach((foto, index) => {
            div.innerHTML += `
                <div class="photo-card">
                    <img src="${foto}">
                    <button class="delete-btn" onclick="app.removerFoto(${index})">X</button>
                </div>
            `;
        });
    },

    removerFoto(index) {
        this.fotos.splice(index, 1);
        this.atualizarGaleria();
    },

    converterLogoParaBase64(url) {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = url;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width; canvas.height = img.height;
            canvas.getContext('2d').drawImage(img, 0, 0);
            this.logoBase64Cache = canvas.toDataURL('image/png');
        };
    },

    // --- GERAÇÃO DE PDF ---
    async gerarPDF() {
        const id = document.getElementById('f-id').value.toUpperCase();
        const obs = document.getElementById('f-obs').value;
        const dataStr = document.getElementById('f-data').value;
        
        if (!id) return alert("Por favor, preencha a Placa/Identificação.");

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Cores do Tema (Azul e Branco)
        const primaryColor = [0, 52, 120];

        // --- CABEÇALHO ---
        // Desenha a Logo se ela carregou
        if (this.logoBase64Cache) {
            try { doc.addImage(this.logoBase64Cache, 'PNG', 14, 10, 40, 15, '', 'FAST'); } catch(e) {}
        }
        
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setFontSize(16); doc.setFont("helvetica", "bold");
        doc.text("RELATÓRIO DE INSPEÇÃO", 196, 20, {align: "right"});
        
        doc.setDrawColor(200, 200, 200);
        doc.line(14, 28, 196, 28); // Linha divisória

        // --- DADOS ---
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(12);
        
        // Formata Data
        const dataFormatada = dataStr ? dataStr.split('-').reverse().join('/') : '';

        doc.text(`Identificação: ${id}`, 14, 40);
        doc.text(`Data: ${dataFormatada}`, 14, 48);
        doc.text(`Inspetor: EJA 3108 / CC 2748`, 14, 56);

        // --- OBSERVAÇÕES ---
        doc.setFontSize(11); doc.setFont("helvetica", "bold");
        doc.text("Relato / Observações:", 14, 70);
        
        doc.setFont("helvetica", "normal");
        const linhasObs = doc.splitTextToSize(obs || "Nenhuma observação registrada.", 182);
        doc.text(linhasObs, 14, 78);

        // Calcula onde a foto vai começar baseada no tamanho do texto
        let eixoY_Fotos = 80 + (linhasObs.length * 6) + 10;

        // --- FOTOS ---
        if (this.fotos.length > 0) {
            doc.setFont("helvetica", "bold");
            doc.text("Evidências Fotográficas:", 14, eixoY_Fotos);
            eixoY_Fotos += 10;

            let xPos = 14;
            for (let i = 0; i < this.fotos.length; i++) {
                // Se a foto for passar do limite da página, cria uma nova página
                if (eixoY_Fotos + 60 > 280) { 
                    doc.addPage(); 
                    eixoY_Fotos = 20; 
                    xPos = 14; 
                }

                // Adiciona a foto quadrada (60x60mm)
                await this.desenharFotoNoPDF(doc, this.fotos[i], xPos, eixoY_Fotos, 60, 60);
                
                xPos += 64; // Move para o lado
                if (xPos > 150) { // Se passou de 3 fotos na linha, desce pra linha de baixo
                    xPos = 14; 
                    eixoY_Fotos += 64; 
                }
            }
        }

        // --- COMPARTILHAR OU SALVAR ---
        const nomeArquivo = `Inspecao_${id}.pdf`;
        
        // Tenta abrir o menu de compartilhamento do celular (WhatsApp, Email, etc)
        if (navigator.share && navigator.canShare) {
            try {
                const blob = doc.output('blob');
                const file = new File([blob], nomeArquivo, { type: "application/pdf" });
                await navigator.share({ 
                    files: [file], 
                    title: nomeArquivo, 
                    text: `Relatório de Inspeção - ${id}` 
                });
            } catch (e) { 
                doc.save(nomeArquivo); // Se o usuário cancelar, faz o download normal
            }
        } else {
            doc.save(nomeArquivo); // No PC, ele apenas faz o download
        }
    },

    // Função auxiliar para desenhar a foto sem distorcer no PDF
    async desenharFotoNoPDF(doc, base64, x, y, maxW, maxH) {
        return new Promise(resolve => {
            const img = new Image();
            img.src = base64;
            img.onload = () => {
                doc.addImage(base64, 'JPEG', x, y, maxW, maxH);
                resolve();
            };
        });
    }
};

window.onload = () => app.init();
