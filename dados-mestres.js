// ─────────────────────────────────────────────────────────────
// DADOS MESTRES — Projetos e Tipos de Teste de Pista
// Ford VEV · TPG Insight AI
// ─────────────────────────────────────────────────────────────

const DadosMestres = {

    // ─────────────────────────────────────────────────────────
    // PROJETOS PADRÃO
    // ─────────────────────────────────────────────────────────
    PROJETOS: [
        {
            nome: 'EET Ranger 2024 - Drive Team',
            codigo: 'EET-DRIVE',
            formularios: [
                {
                    nome: 'Forms Km Interno',
                    icone: 'add_road',
                    url: 'https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=eruQyfRRm0O9NpwH-xBBwP_dTP0IZDtLtTBWw5vI8tFUNFlUN1VMVEYzWUMxUDRGUFIzNkdGM1lLSiQlQCN0PWcu'
                },
                { nome: 'Check List de Inspeção de Segurança', icone: 'check_circle', url: 'https://forms.office.com/r/LGrPxcte1T' },
                { nome: 'Forms de Abastecimento', icone: 'local_gas_station', url: 'https://forms.office.com/r/FmGd5gJF5e' },
                { nome: 'Drive Team Issues', icone: 'warning', url: 'https://forms.office.com/r/KqBNKV9zjS' }
            ]
        },
        {
            nome: 'Ranger VoCF - Brasil',
            codigo: 'VOCF-BR',
            formularios: [
                {
                    nome: 'Forms Km Interno',
                    icone: 'add_road',
                    url: 'https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=eruQyfRRm0O9NpwH-xBBwP_dTP0IZDtLtTBWw5vI8tFUNFlUN1VMVEYzWUMxUDRGUFIzNkdGM1lLSiQlQCN0PWcu'
                },
                { nome: 'Check List início de Turno', icone: 'play_circle', url: 'https://forms.office.com/r/AAq0BNZ9xW' },
                { nome: 'Check List Final de Turno', icone: 'stop_circle', url: 'https://forms.office.com/r/n9QkaX0E0X' },
                { nome: 'Forms Fim de Turno', icone: 'flag', url: 'https://forms.cloud.microsoft/r/QRptN3RzyH' }
            ]
        },
        { nome: 'Testes Especiais', codigo: 'ESP', formularios: [] },
        { nome: '1M Mile', codigo: '1MMILE', formularios: [] }
    ],

    // ─────────────────────────────────────────────────────────
    // TIPOS DE TESTE DE PISTA — entidade separada
    // ─────────────────────────────────────────────────────────
    TESTES_PISTA: [
        {
            nome: 'Ciclos R389',
            categoria: 'Durabilidade',
            icone: 'sync',
            ambiente: 'Externa',
            unidadeMetrica: 'ciclos',
            metricasExtras: ['laps', 'kmRodado', 'tempoExecucao'],
            descricao: 'Controle de Trajeto em Loop Contínuo'
        },
        {
            nome: 'Desaceleração 16 Laps',
            categoria: 'Frenagem',
            icone: 'flag',
            ambiente: 'Externa',
            unidadeMetrica: 'laps',
            metricasExtras: ['frenagens', 'tempoExecucao'],
            descricao: 'Baterias de Alta + Pistas Especiais'
        },
        {
            nome: 'Protocolo de Frenagem',
            categoria: 'Frenagem',
            icone: 'block',
            ambiente: 'Externa',
            unidadeMetrica: 'frenagens',
            metricasExtras: ['laps', 'tempoExecucao'],
            descricao: 'Telemetria de Laps de Frenagem'
        },
        {
            nome: 'Rodagem de Pista',
            categoria: 'Durabilidade',
            icone: 'add_road',
            ambiente: 'Externa',
            unidadeMetrica: 'kmRodado',
            metricasExtras: ['laps', 'tempoExecucao'],
            descricao: 'Rodagem Geral de Pista'
        },
        {
            nome: 'Durabilidade',
            categoria: 'Durabilidade',
            icone: 'timer',
            ambiente: 'Interna',
            unidadeMetrica: 'kmRodado',
            metricasExtras: ['tempoExecucao', 'ciclos'],
            descricao: 'Teste de Durabilidade Estendida'
        },
        {
            nome: 'Aquaplanagem',
            categoria: 'Handling',
            icone: 'water_drop',
            ambiente: 'VOC',
            unidadeMetrica: 'execucoes',
            metricasExtras: ['tempoExecucao'],
            descricao: 'Teste de Controle em Pista Molhada'
        },
        {
            nome: 'Lane Change',
            categoria: 'Handling',
            icone: 'swap_horiz',
            ambiente: 'Externa',
            unidadeMetrica: 'execucoes',
            metricasExtras: ['laps', 'tempoExecucao'],
            descricao: 'Mudança de Faixa em Alta Velocidade'
        },
        {
            nome: 'Handling',
            categoria: 'Handling',
            icone: 'track_changes',
            ambiente: 'Externa',
            unidadeMetrica: 'laps',
            metricasExtras: ['tempoExecucao', 'kmRodado'],
            descricao: 'Avaliação de Manobrabilidade'
        },
        {
            nome: 'Brake Test',
            categoria: 'Frenagem',
            icone: 'lens',
            ambiente: 'Externa',
            unidadeMetrica: 'frenagens',
            metricasExtras: ['tempoExecucao'],
            descricao: 'Teste de Frenagem Padrão'
        },
        {
            nome: 'Endurance',
            categoria: 'Durabilidade',
            icone: 'directions_run',
            ambiente: 'Externa',
            unidadeMetrica: 'kmRodado',
            metricasExtras: ['tempoExecucao', 'ciclos'],
            descricao: 'Resistência de Longa Duração'
        },
        {
            nome: 'Outros',
            categoria: 'Geral',
            icone: 'assignment',
            ambiente: 'VOC',
            unidadeMetrica: 'execucoes',
            metricasExtras: ['tempoExecucao', 'observacoes'],
            descricao: 'Teste Não Categorizado'
        }
    ],

    // ─────────────────────────────────────────────────────────
    // SEED NO FIRESTORE
    // Função: sincronizar
    // O que faz: sincroniza os arrays locais `PROJETOS` e `TESTES_PISTA`
    //           com coleções do Firestore, criando documentos que
    //           ainda não existam (comparando pelo campo `nome`).
    // Recebe: nada.
    // Retorna: Promise (resolve quando a sincronização termina).
    // Observações: usa o SDK Firebase v8 (namespace `firebase`).
    // ─────────────────────────────────────────────────────────
    async sincronizar() {
        const db = firebase.firestore();

        console.log('[DadosMestres] Iniciando sincronização...');

        // Projetos
        for (const projeto of this.PROJETOS) {
            const snap = await db.collection('vev_projetos')
                .where('nome', '==', projeto.nome)
                .limit(1)
                .get();

            if (snap.empty) {
                await db.collection('vev_projetos').add({
                    ...projeto,
                    ativo: true,
                    criadoEm: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log('[DadosMestres] Projeto criado:', projeto.nome);
            }
        }

        // Testes de Pista
        for (const teste of this.TESTES_PISTA) {
            const snap = await db.collection('vev_testes_pista')
                .where('nome', '==', teste.nome)
                .limit(1)
                .get();

            if (snap.empty) {
                await db.collection('vev_testes_pista').add({
                    ...teste,
                    ativo: true,
                    criadoEm: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log('[DadosMestres] Teste criado:', teste.nome);
            }
        }

        console.log('[DadosMestres] Sincronização concluída.');
    },

    // ─────────────────────────────────────────────────────────
    // BUSCAR PROJETOS DO FIRESTORE
    // Função: getProjetos
    // O que faz: consulta a coleção `vev_projetos` filtrando por
    //           documentos ativos e retorna um array com id + dados.
    // Recebe: nada.
    // Retorna: Promise<Array<Object>> — lista de projetos.
    // ─────────────────────────────────────────────────────────
async getProjetos() {
    const snap = await firebase.firestore()
        .collection('vev_projetos')
        .where('ativo', '==', true)
        .get();

    return snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
},


async getTestesPista() {
    const snap = await firebase.firestore()
        .collection('vev_testes_pista')
        .where('ativo', '==', true)
        .get();

    return snap.docs
        .map(d => {
            const data = d.data();
            const local = this.TESTES_PISTA.find(t => t.nome === data.nome) || {};
            return {
                id: d.id,
                ...data,
                ambiente: data.ambiente || local.ambiente || 'VOC'
            };
        })
        .sort((a, b) => a.nome.localeCompare(b.nome));
},

async getVeiculos() {
    const snap = await firebase.firestore()
        .collection('vev_veiculos')
        .where('ativo', '==', true)
        .get();

    return snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
},

    // ─────────────────────────────────────────────────────────
    // BUSCAR TESTES DO FIRESTORE (definição principal — usa sort)
    // ─────────────────────────────────────────────────────────
};