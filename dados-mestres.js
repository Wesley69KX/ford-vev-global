// ─────────────────────────────────────────────────────────────
// DADOS MESTRES — Projetos e Tipos de Teste de Pista
// Ford VEV · Sincronizado com a planilha de rodagem (Forms - Rodagem.xlsx)
// ─────────────────────────────────────────────────────────────

const DadosMestres = {
    // ─────────────────────────────────────────────────────────
    // PROJETOS PADRÃO COM FORMULÁRIOS VINCULADOS
    // ─────────────────────────────────────────────────────────
    PROJETOS: [
        {
            nome: '1 Millions Mile',
            codigo: '1MMILE',
            apelido: '1MM',
            descricao: 'Programa de Durabilidade Estendida — 1 Million Miles',
            icone: 'directions_car',
            cor: '#1c69d4',
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
                {
                    nome: 'FORMS KM - Durability',
                    tipo: 'km',
                    icone: 'speed',
                    cor: '#3b82f6',
                    url: 'https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=eruQyfRRm0O9NpwH-xBBwP_dTP0IZDtLtTBWw5vI8tFUNFlUN1VMVEYzWUMxUDRGUFIzNkdGM1lLSiQlQCN0PWcu&origin=Invitation&channel=1',
                    descricao: 'Registro de quilometragem e horários do turno',
                    badge: 'Quilometragem'
                },
                {
                    nome: 'Inspeção de Segurança - Durability',
                    tipo: 'seguranca',
                    icone: 'verified_user',
                    cor: '#10b981',
                    url: 'https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=eruQyfRRm0O9NpwH-xBBwEz6JfaQaUtJqXKHV06yxwtUQ1JVRkIyQ05IVUZDS0RKT0tTSjIzQzFZRy4u',
                    descricao: 'Checklist obrigatório de segurança veicular e pista',
                    badge: 'Segurança'
                }
            ]
        },
        {
            nome: 'Ranger 100k',
            codigo: 'RANGER100K',
            apelido: 'Ranger 100k',
            descricao: 'Teste de Durabilidade 100.000 KM — Linha Ranger',
            icone: 'local_shipping',
            cor: '#0ea5e9',
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
                {
                    nome: 'FORMS KM - Durability',
                    tipo: 'km',
                    icone: 'speed',
                    cor: '#3b82f6',
                    url: 'https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=eruQyfRRm0O9NpwH-xBBwP_dTP0IZDtLtTBWw5vI8tFUNFlUN1VMVEYzWUMxUDRGUFIzNkdGM1lLSiQlQCN0PWcu&origin=Invitation&channel=1',
                    descricao: 'Registro de quilometragem e horários do turno',
                    badge: 'Quilometragem'
                },
                {
                    nome: 'Inspeção de Segurança - Durability',
                    tipo: 'seguranca',
                    icone: 'verified_user',
                    cor: '#10b981',
                    url: 'https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=eruQyfRRm0O9NpwH-xBBwEz6JfaQaUtJqXKHV06yxwtUQ1JVRkIyQ05IVUZDS0RKT0tTSjIzQzFZRy4u',
                    descricao: 'Checklist obrigatório de segurança veicular e pista',
                    badge: 'Segurança'
                }
            ]
        },
        {
            nome: 'Territory 100k',
            codigo: 'TERRITORY100K',
            apelido: 'Territory 100k',
            descricao: 'Teste de Durabilidade 100.000 KM — Linha Territory',
            icone: 'directions_car',
            cor: '#6366f1',
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
                {
                    nome: 'FORMS KM - Durability',
                    tipo: 'km',
                    icone: 'speed',
                    cor: '#3b82f6',
                    url: 'https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=eruQyfRRm0O9NpwH-xBBwP_dTP0IZDtLtTBWw5vI8tFUNFlUN1VMVEYzWUMxUDRGUFIzNkdGM1lLSiQlQCN0PWcu&origin=Invitation&channel=1',
                    descricao: 'Registro de quilometragem e horários do turno',
                    badge: 'Quilometragem'
                },
                {
                    nome: 'Inspeção de Segurança - Durability',
                    tipo: 'seguranca',
                    icone: 'verified_user',
                    cor: '#10b981',
                    url: 'https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=eruQyfRRm0O9NpwH-xBBwEz6JfaQaUtJqXKHV06yxwtUQ1JVRkIyQ05IVUZDS0RKT0tTSjIzQzFZRy4u',
                    descricao: 'Checklist obrigatório de segurança veicular e pista',
                    badge: 'Segurança'
                }
            ]
        },
        {
            nome: 'Homologação',
            codigo: 'HOMOLOG',
            apelido: 'Homologação',
            descricao: 'Protocolos de Ensaios e Homologação Veicular',
            icone: 'fact_check',
            cor: '#8b5cf6',
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
                {
                    nome: 'FORMS KM - Durability',
                    tipo: 'km',
                    icone: 'speed',
                    cor: '#3b82f6',
                    url: 'https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=eruQyfRRm0O9NpwH-xBBwP_dTP0IZDtLtTBWw5vI8tFUNFlUN1VMVEYzWUMxUDRGUFIzNkdGM1lLSiQlQCN0PWcu&origin=Invitation&channel=1',
                    descricao: 'Registro de quilometragem e horários do turno',
                    badge: 'Quilometragem'
                },
                {
                    nome: 'Inspeção de Segurança - Durability',
                    tipo: 'seguranca',
                    icone: 'verified_user',
                    cor: '#10b981',
                    url: 'https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=eruQyfRRm0O9NpwH-xBBwEz6JfaQaUtJqXKHV06yxwtUQ1JVRkIyQ05IVUZDS0RKT0tTSjIzQzFZRy4u',
                    descricao: 'Checklist obrigatório de segurança veicular e pista',
                    badge: 'Segurança'
                }
            ]
        },
        {
            nome: 'VoC',
            codigo: 'VOC',
            apelido: 'VoC',
            descricao: 'Voice of Customer — Avaliação de Percepção do Cliente',
            icone: 'record_voice_over',
            cor: '#ec4899',
            formularios: [
                {
                    nome: 'FORMS KM - Durability',
                    tipo: 'km',
                    icone: 'speed',
                    cor: '#3b82f6',
                    url: 'https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=eruQyfRRm0O9NpwH-xBBwP_dTP0IZDtLtTBWw5vI8tFUNFlUN1VMVEYzWUMxUDRGUFIzNkdGM1lLSiQlQCN0PWcu&origin=Invitation&channel=1',
                    descricao: 'Registro de quilometragem e horários do turno',
                    badge: 'Quilometragem'
                },
                {
                    nome: 'Inspeção de Segurança - Durability',
                    tipo: 'seguranca',
                    icone: 'verified_user',
                    cor: '#10b981',
                    url: 'https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=eruQyfRRm0O9NpwH-xBBwEz6JfaQaUtJqXKHV06yxwtUQ1JVRkIyQ05IVUZDS0RKT0tTSjIzQzFZRy4u',
                    descricao: 'Checklist obrigatório de segurança veicular e pista',
                    badge: 'Segurança'
                }
            ]
        },
        {
            nome: 'Testes Especiais',
            codigo: 'ESP',
            apelido: 'Especiais',
            descricao: 'Ensaios Dinâmicos, Frenagem, R389 e Testes Customizados',
            icone: 'auto_awesome',
            cor: '#eab308',
            formularios: [
                {
                    nome: 'FORMS KM - Durability',
                    tipo: 'km',
                    icone: 'speed',
                    cor: '#3b82f6',
                    url: 'https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=eruQyfRRm0O9NpwH-xBBwP_dTP0IZDtLtTBWw5vI8tFUNFlUN1VMVEYzWUMxUDRGUFIzNkdGM1lLSiQlQCN0PWcu&origin=Invitation&channel=1',
                    descricao: 'Registro de quilometragem e horários do turno',
                    badge: 'Quilometragem'
                },
                {
                    nome: 'Inspeção de Segurança - Durability',
                    tipo: 'seguranca',
                    icone: 'verified_user',
                    cor: '#10b981',
                    url: 'https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=eruQyfRRm0O9NpwH-xBBwEz6JfaQaUtJqXKHV06yxwtUQ1JVRkIyQ05IVUZDS0RKT0tTSjIzQzFZRy4u',
                    descricao: 'Checklist obrigatório de segurança veicular e pista',
                    badge: 'Segurança'
                }
            ]
        }
    ],

    // ─────────────────────────────────────────────────────────
    // TIPOS DE TESTE DE PISTA
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
    // SEED NO FIRESTORE E RTDB
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
            } else {
                const doc = snap.docs[0]
                const data = doc.data() || {}
                // Se os formulários estiverem vazios no Firestore, atualiza com os padrões da planilha
                if (!data.formularios || data.formularios.length === 0) {
                    await db.collection('vev_projetos').doc(doc.id).update({
                        formularios: projeto.formularios,
                        codigo: projeto.codigo || data.codigo,
                        apelido: projeto.apelido || data.apelido || projeto.nome,
                        descricao: projeto.descricao || data.descricao || '',
                        icone: projeto.icone || data.icone || 'directions_car',
                        cor: projeto.cor || data.cor || '#1c69d4'
                    })
                    console.log('[DadosMestres] Formulários atualizados para:', projeto.nome)
                }
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

        // Sincronizar vev_projetos, vev_veiculos, vev_operadores e vev_postos do Firestore para o RTDB
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
}

if (typeof window !== 'undefined') {
    window.DadosMestres = DadosMestres
}
