// ============================================================
// forms-data.js | Ford VEV · Central de Links dos Projetos
// Banco de Dados Oficial de Projetos e Formulários Microsoft Forms
// Sincronizado com a planilha de rodagem (Forms - Rodagem.xlsx)
// ============================================================

const FORMS_PADRAO_KM = {
    nome: 'FORMS KM - Durability',
    tipo: 'km',
    icone: 'speed',
    cor: '#3b82f6',
    url: 'https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=eruQyfRRm0O9NpwH-xBBwP_dTP0IZDtLtTBWw5vI8tFUNFlUN1VMVEYzWUMxUDRGUFIzNkdGM1lLSiQlQCN0PWcu&origin=Invitation&channel=1',
    descricao: 'Registro de quilometragem e horários do turno',
    badge: 'Quilometragem'
};

const FORMS_PADRAO_SEGURANCA = {
    nome: 'Inspeção de Segurança - Durability',
    tipo: 'seguranca',
    icone: 'verified_user',
    cor: '#10b981',
    url: 'https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=eruQyfRRm0O9NpwH-xBBwEz6JfaQaUtJqXKHV06yxwtUQ1JVRkIyQ05IVUZDS0RKT0tTSjIzQzFZRy4u',
    descricao: 'Checklist obrigatório de segurança veicular e pista',
    badge: 'Segurança'
};

const FormsData = {
    _projetos: {
        '1 Millions Mile': {
            id: '1mmile',
            codigo: '1MMILE',
            nome: '1 Millions Mile',
            apelido: '1MM',
            descricao: 'Programa de Durabilidade Estendida — 1 Million Miles',
            icone: 'directions_car',
            cor: '#1c69d4',
            necessitaFormulario: true,
            formularios: [
                {
                    nome: 'FORMS Issue Próprio',
                    tipo: 'issue',
                    icone: 'report_problem',
                    cor: '#ef4444',
                    url: 'https://forms.office.com/r/KqBNKV9zjS',
                    descricao: 'Reportar falhas, anomalias e quebras no programa 1MM',
                    badge: 'Ocorrências'
                },
                {
                    nome: 'FORMS Abastecimento Próprio',
                    tipo: 'abastecimento',
                    icone: 'local_gas_station',
                    cor: '#f59e0b',
                    url: 'https://forms.office.com/r/FmGd5gJF5e',
                    descricao: 'Registro de abastecimento e litros do programa 1MM',
                    badge: 'Abastecimento'
                },
                FORMS_PADRAO_KM,
                FORMS_PADRAO_SEGURANCA
            ]
        },

        'Ranger 100k': {
            id: 'ranger100k',
            codigo: 'RANGER100K',
            nome: 'Ranger 100k',
            apelido: 'Ranger 100k',
            descricao: 'Teste de Durabilidade 100.000 KM — Linha Ranger',
            icone: 'local_shipping',
            cor: '#0ea5e9',
            necessitaFormulario: true,
            formularios: [
                {
                    nome: 'FORMS Issue - Durability',
                    tipo: 'issue',
                    icone: 'report_problem',
                    cor: '#ef4444',
                    url: 'https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=eruQyfRRm0O9NpwH-xBBwMbiyYR43kVDhboTj33D64NUMDEwSFJROUlHNVg1RTRQMFlJU1ZCNk9KSy4u',
                    descricao: 'Reportar problemas e ocorrências durante a rodagem Ranger 100k',
                    badge: 'Ocorrências'
                },
                {
                    nome: 'FORMS Abastecimento - Durability',
                    tipo: 'abastecimento',
                    icone: 'local_gas_station',
                    cor: '#f59e0b',
                    url: 'https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=eruQyfRRm0O9NpwH-xBBwMbiyYR43kVDhboTj33D64NUNTlPV1JUUlBHODFFRzhaMTNaWlhLTExHVC4u',
                    descricao: 'Registro de abastecimento do veículo Ranger 100k',
                    badge: 'Abastecimento'
                },
                FORMS_PADRAO_KM,
                FORMS_PADRAO_SEGURANCA
            ]
        },

        'Territory 100k': {
            id: 'territory100k',
            codigo: 'TERRITORY100K',
            nome: 'Territory 100k',
            apelido: 'Territory 100k',
            descricao: 'Teste de Durabilidade 100.000 KM — Linha Territory',
            icone: 'directions_car',
            cor: '#6366f1',
            necessitaFormulario: true,
            formularios: [
                {
                    nome: 'FORMS Issue - Durability',
                    tipo: 'issue',
                    icone: 'report_problem',
                    cor: '#ef4444',
                    url: 'https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=eruQyfRRm0O9NpwH-xBBwMbiyYR43kVDhboTj33D64NUMDEwSFJROUlHNVg1RTRQMFlJU1ZCNk9KSy4u',
                    descricao: 'Reportar problemas e ocorrências no Territory 100k',
                    badge: 'Ocorrências'
                },
                {
                    nome: 'FORMS Abastecimento - Durability',
                    tipo: 'abastecimento',
                    icone: 'local_gas_station',
                    cor: '#f59e0b',
                    url: 'https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=eruQyfRRm0O9NpwH-xBBwMbiyYR43kVDhboTj33D64NUNTlPV1JUUlBHODFFRzhaMTNaWlhLTExHVC4u',
                    descricao: 'Registro de abastecimento do veículo Territory 100k',
                    badge: 'Abastecimento'
                },
                FORMS_PADRAO_KM,
                FORMS_PADRAO_SEGURANCA
            ]
        },

        'Homologação': {
            id: 'homologacao',
            codigo: 'HOMOLOG',
            nome: 'Homologação',
            apelido: 'Homologação',
            descricao: 'Protocolos de Ensaios e Homologação Veicular',
            icone: 'fact_check',
            cor: '#8b5cf6',
            necessitaFormulario: true,
            formularios: [
                {
                    nome: 'FORMS Issue - Durability',
                    tipo: 'issue',
                    icone: 'report_problem',
                    cor: '#ef4444',
                    url: 'https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=eruQyfRRm0O9NpwH-xBBwMbiyYR43kVDhboTj33D64NUMDEwSFJROUlHNVg1RTRQMFlJU1ZCNk9KSy4u',
                    descricao: 'Reportar problemas e apontamentos do ensaio de Homologação',
                    badge: 'Ocorrências'
                },
                FORMS_PADRAO_KM,
                FORMS_PADRAO_SEGURANCA
            ]
        },

        'VoC': {
            id: 'voc',
            codigo: 'VOC',
            nome: 'VoC',
            apelido: 'VoC',
            descricao: 'Voice of Customer — Avaliação de Percepção do Cliente',
            icone: 'record_voice_over',
            cor: '#ec4899',
            necessitaFormulario: true,
            formularios: [
                FORMS_PADRAO_KM,
                FORMS_PADRAO_SEGURANCA
            ]
        },

        'Testes Especiais': {
            id: 'esp',
            codigo: 'ESP',
            nome: 'Testes Especiais',
            apelido: 'Especiais',
            descricao: 'Ensaios Dinâmicos, Frenagem, R389 e Testes Customizados',
            icone: 'auto_awesome',
            cor: '#eab308',
            necessitaFormulario: true,
            formularios: [
                FORMS_PADRAO_KM,
                FORMS_PADRAO_SEGURANCA
            ]
        }
    },

    // ── API pública ──────────────────────────────────────────
    getProjeto(nome) {
        if (!nome) return null;
        if (this._projetos[nome]) return this._projetos[nome];

        // Normalização flexível por apelido / código / chave minúscula
        const norm = String(nome).trim().toLowerCase().replace(/[\s\-_]/g, '');
        
        for (const [key, p] of Object.entries(this._projetos)) {
            const kNorm = key.toLowerCase().replace(/[\s\-_]/g, '');
            const codNorm = (p.codigo || '').toLowerCase().replace(/[\s\-_]/g, '');
            const apeNorm = (p.apelido || '').toLowerCase().replace(/[\s\-_]/g, '');
            const idNorm = (p.id || '').toLowerCase().replace(/[\s\-_]/g, '');
            
            if (norm === kNorm || norm === codNorm || norm === apeNorm || norm === idNorm) {
                return p;
            }
            if (norm.includes('1m') || norm.includes('million')) {
                if (kNorm.includes('million') || codNorm.includes('1m')) return p;
            }
            if (norm.includes('ranger') && kNorm.includes('ranger')) return p;
            if (norm.includes('territory') && kNorm.includes('territory')) return p;
            if (norm.includes('homolog') && kNorm.includes('homolog')) return p;
            if (norm.includes('voc') && kNorm.includes('voc')) return p;
            if ((norm.includes('especia') || norm.includes('esp')) && kNorm.includes('especia')) return p;
        }

        return null;
    },

    getNomes() {
        return Object.keys(this._projetos);
    },

    getTodosProjetos() {
        return Object.values(this._projetos);
    },

    necessitaFormulario(nome) {
        const p = this.getProjeto(nome);
        return p ? p.necessitaFormulario === true : false;
    },

    // Adiciona ou atualiza projeto dinamicamente
    adicionarProjeto(nome, config) {
        if (!nome) return;
        const exist = this.getProjeto(nome);
        if (exist) {
            this._projetos[exist.nome] = { ...exist, ...config };
        } else {
            this._projetos[nome] = {
                id: config.id || ('proj_' + Date.now()),
                codigo: config.codigo || nome.toUpperCase().replace(/\s+/g, '_'),
                nome: nome,
                apelido: config.apelido || nome,
                descricao: config.descricao || `Formulários do projeto ${nome}`,
                icone: config.icone || 'assignment',
                cor: config.cor || '#1c69d4',
                necessitaFormulario: Boolean(config.formularios?.length),
                formularios: config.formularios || []
            };
        }
    }
};

// Torna acessível globalmente
if (typeof window !== 'undefined') {
    window.FormsData = FormsData;
}
