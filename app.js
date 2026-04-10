// ===============================================================
// ===============================================================
// COLOQUE O NOME DO ARQUIVO DA SUA LOGO AQUI
const LOGO_BASE64 = "logo.png"; 
// ===============================================================
// BANCO DE DADOS DO APLICATIVO
const appConfig = {
    formularios: [
        {
            titulo: "Check List de Segurança",
            descricao: "Inspeção diária obrigatória",
            icone: "fact_check",
            link: "https://forms.office.com/r/LGrPxcte1T",
            estilo: "normal"
        },
        {
            titulo: "Forms de Abastecimento",
            descricao: "Registro de litragem e quilometragem",
            icone: "local_gas_station",
            link: "https://forms.office.com/r/FmGd5gJF5e",
            estilo: "normal"
        },
        {
            titulo: "Drive Team Issues",
            descricao: "Reporte de problemas e anomalias",
            icone: "report_problem",
            link: "https://forms.office.com/r/KqBNKV9zjS",
            estilo: "danger" // Fica vermelho
        }
    ],
    informacoes: [
        {
            titulo: "Senha do Cartão",
            valor: "958355",
            icone: "password",
            tipo: "senha"
        },
        {
            titulo: "Número do Guincho",
            valor: "0800 703 3673",
            link_tel: "08007033673",
            icone: "support_agent",
            tipo: "telefone"
        }
    ]
};

// MOTOR DO APLICATIVO
const app = {
    init() {
        this.aplicarLogo();
        this.renderizarTela();
    },

    aplicarLogo() {
        if (LOGO_BASE64 && LOGO_BASE64.trim() !== "") {
            document.getElementById('app-header-logo').src = LOGO_BASE64;
            document.getElementById('app-favicon').href = LOGO_BASE64;
        } else {
            // Se não tiver logo, põe uma imagem transparente para não ficar quebrado
            document.getElementById('app-header-logo').src = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
        }
    },

    renderizarTela() {
        const container = document.getElementById('app-content');
        let html = '';

        // SEÇÃO: FORMULÁRIOS
        html += `<h3>Formulários Operacionais</h3><div class="menu-grid">`;
        
        appConfig.formularios.forEach(form => {
            const classeCard = form.estilo === 'danger' ? 'card danger-card' : 'card';
            html += `
                <a href="${form.link}" target="_blank" class="${classeCard}">
                    <div class="icon-box"><span class="material-icons">${form.icone}</span></div>
                    <div class="card-text">
                        <strong>${form.titulo}</strong>
                        <span>${form.descricao}</span>
                    </div>
                    <span class="material-icons external-icon">open_in_new</span>
                </a>
            `;
        });
        html += `</div>`;

        // SEÇÃO: DADOS IMPORTANTES
        html += `<h3>Dados Importantes</h3><div class="menu-grid">`;
        
        appConfig.informacoes.forEach(info => {
            html += `
                <div class="card info-card">
                    <div class="icon-box"><span class="material-icons">${info.icone}</span></div>
                    <div class="card-text">
                        <strong>${info.titulo}</strong>
                        <span style="font-size: 1.1rem; color: #000; font-weight: bold; margin-top: 3px; ${info.tipo === 'senha' ? 'font-family: monospace; letter-spacing: 2px;' : ''}">${info.valor}</span>
                    </div>
            `;
            
            // Adiciona o botão verde de ligar se for um telefone
            if (info.tipo === 'telefone') {
                html += `
                    <a href="tel:${info.link_tel}" class="btn-call">
                        <span class="material-icons">call</span>
                    </a>
                `;
            }
            
            html += `</div>`;
        });
        html += `</div>`;

        container.innerHTML = html;
    }
};

// Inicia o app quando a página carrega
window.onload = () => app.init();
