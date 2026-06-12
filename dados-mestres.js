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
                    url: 'https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=eruQyfRRm0O9NpwH-xBBwP_dTP0IZDtLtTBWw5vI8tFUNFlUN1VMVEYzWUMxUDRGUFIzNkdGM1lLSiQlQCN0PWcu',
                },
                {
                    nome: 'Check List de Inspeção de Segurança',
                    icone: 'check_circle',
                    url: 'https://forms.office.com/r/LGrPxcte1T',
                },
                {
                    nome: 'Forms de Abastecimento',
                    icone: 'local_gas_station',
                    url: 'https://forms.office.com/r/FmGd5gJF5e',
                },
                {
                    nome: 'Drive Team Issues',
                    icone: 'warning',
                    url: 'https://forms.office.com/r/KqBNKV9zjS',
                },
            ],
        },
        {
            nome: 'Ranger VoCF - Brasil',
            codigo: 'VOCF-BR',
            formularios: [
                {
                    nome: 'Forms Km Interno',
                    icone: 'add_road',
                    url: 'https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=eruQyfRRm0O9NpwH-xBBwP_dTP0IZDtLtTBWw5vI8tFUNFlUN1VMVEYzWUMxUDRGUFIzNkdGM1lLSiQlQCN0PWcu',
                },
                {
                    nome: 'Check List início de Turno',
                    icone: 'play_circle',
                    url: 'https://forms.office.com/r/AAq0BNZ9xW',
                },
                {
                    nome: 'Check List Final de Turno',
                    icone: 'stop_circle',
                    url: 'https://forms.office.com/r/n9QkaX0E0X',
                },
                {
                    nome: 'Forms Fim de Turno',
                    icone: 'flag',
                    url: 'https://forms.cloud.microsoft/r/QRptN3RzyH',
                },
            ],
        },
        { nome: 'Testes Especiais', codigo: 'ESP', formularios: [] },
        { nome: '1M Mile', codigo: '1MMILE', formularios: [] },
    ],

    // ─────────────────────────────────────────────────────────
    // TIPOS DE TESTE DE PISTA — entidade separada
    // ─────────────────────────────────────────────────────────
    TESTES_PISTA: [
        {
            nome: 'Durabilidade',
            categoria: 'Durabilidade',
            icone: 'timer',
            ambiente: 'Interno',
            unidadeMetrica: 'kmRodado',
            metricasExtras: ['laps', 'tempoExecucao', 'ciclos'],
            descricao: 'Teste de Durabilidade Estendida',
        },
        {
            nome: 'Especiais',
            categoria: 'Especiais',
            icone: 'star',
            ambiente: 'Interno',
            unidadeMetrica: 'kmRodado',
            metricasExtras: ['laps', 'tempoExecucao', 'ciclos'],
            descricao: 'Testes Especiais',
        },
        {
            nome: 'Durabilidade',
            categoria: 'Durabilidade',
            icone: 'timer',
            ambiente: 'Externo',
            unidadeMetrica: 'kmRodado',
            metricasExtras: ['laps', 'tempoExecucao', 'ciclos'],
            descricao: 'Teste de Durabilidade Estendida',
        },
        {
            nome: 'Especiais',
            categoria: 'Especiais',
            icone: 'star',
            ambiente: 'Externo',
            unidadeMetrica: 'kmRodado',
            metricasExtras: ['laps', 'tempoExecucao', 'ciclos'],
            descricao: 'Testes Especiais',
        },
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
        const db = firebase.firestore()

        console.log('[DadosMestres] Iniciando sincronização...')

        // Projetos
        for (const projeto of this.PROJETOS) {
            const snap = await db
                .collection('vev_projetos')
                .where('nome', '==', projeto.nome)
                .limit(1)
                .get()

            if (snap.empty) {
                await db.collection('vev_projetos').add({
                    ...projeto,
                    ativo: true,
                    criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
                })
                console.log('[DadosMestres] Projeto criado:', projeto.nome)
            }
        }

        // Testes de Pista (Sincroniza checando nome + ambiente)
        for (const teste of this.TESTES_PISTA) {
            const snap = await db
                .collection('vev_testes_pista')
                .where('nome', '==', teste.nome)
                .where('ambiente', '==', teste.ambiente)
                .limit(1)
                .get()

            if (snap.empty) {
                await db.collection('vev_testes_pista').add({
                    ...teste,
                    ativo: true,
                    criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
                })
                console.log('[DadosMestres] Teste criado:', teste.nome)
            }
        }

        // Sincronizar vev_projetos, vev_veiculos, vev_operadores e vev_postos do Firestore para o RTDB para consumo do dashboard
        try {
            const projSnap = await db.collection('vev_projetos').get()
            const rtdbProjRef = firebase.database().ref('vev_projetos')
            for (const doc of projSnap.docs) {
                await rtdbProjRef.child(doc.id).set({ id: doc.id, ...doc.data() })
            }

            const veiSnap = await db.collection('vev_veiculos').get()
            const rtdbVeiRef = firebase.database().ref('vev_veiculos')
            for (const doc of veiSnap.docs) {
                await rtdbVeiRef.child(doc.id).set({ id: doc.id, ...doc.data() })
            }

            const opSnap = await db.collection('vev_operadores').get()
            const rtdbOpRef = firebase.database().ref('vev_operadores')
            for (const doc of opSnap.docs) {
                await rtdbOpRef.child(doc.id).set({ id: doc.id, ...doc.data() })
            }

            const postoSnap = await db.collection('vev_postos').get()
            const rtdbPostoRef = firebase.database().ref('vev_postos')
            for (const doc of postoSnap.docs) {
                await rtdbPostoRef.child(doc.id).set({ id: doc.id, ...doc.data() })
            }
            console.log(
                '[DadosMestres] Projetos, veículos, operadores e postos sincronizados para o Realtime Database.'
            )
        } catch (e) {
            console.warn(
                '[DadosMestres] Falha ao sincronizar dados mestres para o Realtime Database:',
                e
            )
        }

        console.log('[DadosMestres] Sincronização concluída.')
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
        const snap = await firebase.firestore().collection('vev_projetos').get()

        return snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((d) => d.ativo !== false)
            .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))
    },

    async getTestesPista() {
        const snap = await firebase.firestore().collection('vev_testes_pista').get()

        return snap.docs
            .map((d) => {
                const data = d.data()
                const local = this.TESTES_PISTA.find((t) => t.nome === data.nome) || {}
                return {
                    id: d.id,
                    ...data,
                    ambiente: data.ambiente || local.ambiente || 'VOC',
                }
            })
            .filter((d) => d.ativo !== false)
            .sort((a, b) => a.nome.localeCompare(b.nome))
    },

    async getVeiculos() {
        const snap = await firebase.firestore().collection('vev_veiculos').get()

        return snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((d) => d.ativo !== false)
            .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))
    },

    async getPostos() {
        const snap = await firebase.firestore().collection('vev_postos').get()

        return snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((d) => d.ativo !== false)
            .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))
    },

    // ─────────────────────────────────────────────────────────
    // BUSCAR TESTES DO FIRESTORE (definição principal — usa sort)
    // ─────────────────────────────────────────────────────────
}
