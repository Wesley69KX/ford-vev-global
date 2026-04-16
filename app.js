const app = {
    checkins: [],
    // AQUI VOCÊ PODE MUDAR O ROTEIRO E A "COLA" ABAIXO
    roteiroData: [
        { nome: "Frenagem 80km/h", cola: "Acionamento firme, observar desvio de trajetória." },
        { nome: "Pista de Ruído", cola: "Verificar barulhos no painel e suspensão dianteira." },
        { nome: "Slalom / Estabilidade", cola: "Teste de guinada rápida em baixa velocidade." },
        { nome: "Pista de Alta", cola: "Manter 120km/h constante para análise de vibração." },
        { nome: "Labirinto", cola: "Verificar fim de curso da direção e estalos." }
    ],

    init() {
        this.renderRoteiro();
    },

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
        
        // Salva na memória do app
        this.checkins.push({ atividade: nome, hora: horario, timestamp: agora });
        
        // Atualiza o log visual na tela
        const log = document.getElementById('log-roteiro');
        if(this.checkins.length === 1) log.innerHTML = "";
        log.innerHTML = `<div>[${horario}] ${nome} registrado.</div>` + log.innerHTML;
        
        // Feedback visual
        if ('vibrate' in navigator) navigator.vibrate(50);
    },

    async gerarRelatorioRoteiro() {
        if (this.checkins.length === 0) {
            alert("Nenhuma atividade registrada para gerar o relatório.");
            return;
        }

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
        
        // Opcional: Limpa após gerar
        if(confirm("Deseja limpar os dados para um novo teste?")) {
            this.checkins = [];
            document.getElementById('log-roteiro').innerHTML = "Aguardando início...";
        }
    },

    // Funções existentes de Avaria e Turno simplificadas para o exemplo
    async gerarPDFAvaria() {
        alert("Laudo de Avaria Gerado com Sucesso!");
        window.appUI.fecharModal('modal-laudo');
    },

    async finalizarTurnoIntegrado() {
        alert("Turno Finalizado e Resumo Copiado!");
        window.appUI.fecharModal('modal-turno');
    }
};

window.onload = () => app.init();
