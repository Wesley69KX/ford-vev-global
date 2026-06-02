// ============================================================
// forms-data.js | TPG Insight AI v2.0
// Banco de Dados de Projetos e Formulários Microsoft Forms
// ============================================================

const FormsData = {

    _projetos: {

        'EET Ranger 2024 - Drive Team': {
            id: 'eet-ranger-2024',
            necessitaFormulario: true,
            formularios: [
                {
                    nome: 'Forms Km Interno',
                    icone: 'add_road',
                    url: 'https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=eruQyfRRm0O9NpwH-xBBwP_dTP0IZDtLtTBWw5vI8tFUNFlUN1VMVEYzWUMxUDRGUFIzNkdGM1lLSiQlQCN0PWcu&origin=Invitation&channel=1'
                },
                {
                    nome: 'Check List de Inspeção de Segurança',
                    icone: 'assignment_turned_in',
                    url: 'https://forms.office.com/r/LGrPxcte1T'
                },
                {
                    nome: 'Forms de Abastecimento',
                    icone: 'local_gas_station',
                    url: 'https://forms.office.com/r/FmGd5gJF5e'
                },
                {
                    nome: 'Drive Team Issues',
                    icone: 'warning',
                    url: 'https://forms.office.com/r/KqBNKV9zjS'
                }
            ]
        },

        'Ranger VoCF - Brasil': {
            id: 'ranger-vocf-brasil',
            necessitaFormulario: true,
            formularios: [
                {
                    nome: 'Forms Km Interno',
                    icone: 'add_road',
                    url: 'https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=eruQyfRRm0O9NpwH-xBBwP_dTP0IZDtLtTBWw5vI8tFUNFlUN1VMVEYzWUMxUDRGUFIzNkdGM1lLSiQlQCN0PWcu&origin=Invitation&channel=1'
                },
                {
                    nome: 'Check List início de Turno',
                    icone: 'play_circle',
                    url: 'https://forms.office.com/r/AAq0BNZ9xW'
                },
                {
                    nome: 'Check List Final de Turno',
                    icone: 'stop_circle',
                    url: 'https://forms.office.com/r/n9QkaX0E0X'
                },
                {
                    nome: 'Check List Diário Segunda-feira',
                    icone: 'assignment',
                    url: 'https://forms.office.com/r/bHwmi1aZNE'
                },
                {
                    nome: 'Check List Diário Terça-feira',
                    icone: 'assignment',
                    url: 'https://forms.office.com/r/gJdB5Ybmup'
                },
                {
                    nome: 'Check List Diário Quarta-feira',
                    icone: 'assignment',
                    url: 'https://forms.office.com/r/bRX4ewKC9H'
                },
                {
                    nome: 'Check List Diário Quinta-feira',
                    icone: 'assignment',
                    url: 'https://forms.office.com/r/G32LmMhFzP'
                },
                {
                    nome: 'Check List Diário Sexta-feira',
                    icone: 'assignment',
                    url: 'https://forms.office.com/r/cZNpfqq0Nf'
                },
                {
                    nome: 'Check List Diário Sábado',
                    icone: 'assignment',
                    url: 'https://forms.office.com/r/SFZFAUVCQ8'
                },
                {
                    nome: 'Forms Fim de Turno',
                    icone: 'flag',
                    url: 'https://forms.cloud.microsoft/r/QRptN3RzyH'
                }
            ]
        }
    },

    // ── API pública ──────────────────────────────────────────
    getProjeto(nome) {
        return this._projetos[nome] || null;
    },

    getNomes() {
        return Object.keys(this._projetos);
    },

    necessitaFormulario(nome) {
        const p = this.getProjeto(nome);
        return p ? p.necessitaFormulario === true : false;
    },

    // Adiciona projeto dinamicamente (para futura tela admin)
    adicionarProjeto(nome, config) {
        this._projetos[nome] = config;
    }
};