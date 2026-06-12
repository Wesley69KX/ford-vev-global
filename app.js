// ====================================================
// 1. CONFIGURAÇÃO DO FIREBASE
// ====================================================
const firebaseConfig = {
    apiKey: 'AIzaSyCY5aZ2WzeY8miMomN3OgR6al4psXGnE3A',
    authDomain: 'ford-vev.firebaseapp.com',
    databaseURL: 'https://ford-vev-default-rtdb.firebaseio.com',
    projectId: 'ford-vev',
    storageBucket: 'ford-vev.firebasestorage.app',
    messagingSenderId: '391022165832',
    appId: '1:391022165832:web:cfa6c741c946a030b37d7d',
    measurementId: 'G-EDFWJB8XE3',
}

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig)
}
const db = firebase.database()

// Ativar persistência offline do Firestore para evitar travamentos em rede lenta ou offline
try {
    firebase
        .firestore()
        .enablePersistence({ synchronizeTabs: true })
        .catch((err) => {
            console.warn('[Firestore] Falha ao habilitar persistência offline:', err.code)
        })
} catch (e) {
    console.warn('[Firestore] Erro ao configurar persistência offline:', e)
}

// ====================================================
// 2. O CORAÇÃO DO APLICATIVO
// ====================================================
const app = {
    fotos: [],
    videosFiles: [],
    etapaAtualIndex: 0,
    checkins: [],
    operadorAtual: null,
    vinGlobal: '',
    etapaDesaceleracaoIndex: 0,
    checkinsDesaceleracao: [],
    ciclosFrenagem: [],
    logRodagem: [],
    rodagemDistanciaMts: 0,
    rastroGps: [],

    roteiroFrenagem: [
        'Pista Baixa - Volta 1',
        'Pista Baixa - Volta 2',
        'Pista Baixa - Volta 3',
        'Pista Baixa - Volta 4',
        'Pista Alta - Volta 1',
        'Pista Alta - Volta 2',
        'Pista Alta - Volta 3',
        'Pista Alta - Volta 4',
    ],
    sequenciaDiasPares: [
        'Labirinto: 1ª volta + Mata-burro',
        'Power Hop Hill',
        'Lombadas: 1ª passagem',
        'Pistas 1-2',
        'Pista 4-3',
        'Slalom',
        'Pista 4-3',
        'Slalom',
        'Pistas 4-3',
        'Pistas 7-8',
        'Pistas 2-1',
        'Pistas 7-8',
        'P. de Baixa',
        'Pistas 1-2',
        'Pista 4-3',
        'Slalom',
        'Pista 4-3',
        'Slalom',
        'Pistas 4-3',
        'Pistas 7-8',
        'Pistas 2-1',
        'Pistas 7-8',
        'P. de Baixa',
        'Pistas 1-2',
        'Pista 4-3',
        'Pista 5-8',
        'Pistas 4-3',
        'Pistas 5-8',
        'Pistas 4-3',
        'Pistas 9-10',
        'Pistas 2-1',
        'Pistas 9-10',
        'P. de Baixa',
        'Pistas 1-2',
        'Pista 4-3',
        'Pista 5-8',
        'Pistas 4-3',
        'Pistas 5-8',
        'Pistas 4-3',
        'Pistas 9-10',
        'Pista de Alta + bolacha',
        'Pista de Baixa + bolacha',
    ],
    roteiroDesaceleracao: [
        'Alta',
        'Alta',
        'Alta',
        'Alta (100 a 20km/h)',
        'Alta',
        'Alta',
        'Alta',
        'Alta (100 a 20km/h)',
        'Alta',
        'Alta',
        'Alta',
        'Alta (100 a 0km/h)',
        'Alta',
        'Alta',
        'Alta',
        'Alta (100 a 20km/h)',
        'Power Hop Hill',
        'Enrola Camisa',
        'Enrola Camisa',
        'Power Hop Hill',
    ],

    init() {
        this.verificarSessao()
    },

    verificarApiKey() {
        const apiKey =
            localStorage.getItem('gemini_api_key') || localStorage.getItem('cofre_chave_gemini')
        if (!apiKey) {
            // Não bloqueia mais no início, deixa para abrir inline no laudo se necessário.
        }
    },

    salvarApiKeyInicial() {
        const keyInput = document.getElementById('input-api-key')?.value?.trim()
        if (!keyInput) {
            alert('Atenção: Por favor, digite ou cole uma Chave API válida.')
            return
        }
        localStorage.setItem('gemini_api_key', keyInput)
        localStorage.setItem('cofre_chave_gemini', keyInput)
        document.getElementById('modal-api-key').style.display = 'none'
        document.body.style.overflow = 'auto'
        alert('Chave API do Gemini configurada com sucesso!')
    },

    alternarPainelApiKey() {
        const container = document.getElementById('container-config-ia-key')
        if (!container) return
        if (container.style.display === 'none' || container.style.display === '') {
            container.style.display = 'flex'
            const input = document.getElementById('i-gemini-api-key')
            if (input) {
                input.value =
                    localStorage.getItem('gemini_api_key') ||
                    localStorage.getItem('cofre_chave_gemini') ||
                    ''
                input.focus()
            }
        } else {
            container.style.display = 'none'
        }
    },

    salvarApiKeyInline() {
        const keyInput = document.getElementById('i-gemini-api-key')?.value?.trim()
        if (!keyInput) {
            alert('Por favor, insira uma Chave API válida.')
            return
        }
        localStorage.setItem('gemini_api_key', keyInput)
        localStorage.setItem('cofre_chave_gemini', keyInput)
        document.getElementById('container-config-ia-key').style.display = 'none'
        alert('Chave API do Gemini atualizada com sucesso!')
    },

    obterDataDoTurno() {
        try {
            const agora = new Date()

            // Obter hora local de São Paulo
            const horaSPStr = agora.toLocaleTimeString('pt-BR', {
                timeZone: 'America/Sao_Paulo',
                hour: '2-digit',
                hour12: false,
            })
            const horaSP = parseInt(horaSPStr, 10)

            // Se a hora local em São Paulo for menor que 3 (00:00 às 02:59), consideramos o dia anterior
            let dataReferencia = agora
            if (horaSP < 3) {
                dataReferencia = new Date(agora.getTime() - 24 * 3600 * 1000)
            }

            const options = {
                timeZone: 'America/Sao_Paulo',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            }
            const formatter = new Intl.DateTimeFormat('fr-CA', options)
            return formatter.format(dataReferencia)
        } catch (e) {
            const agora = new Date()
            const utcTime = agora.getTime() + agora.getTimezoneOffset() * 60000
            let brasiliaTime = new Date(utcTime - 3 * 3600000)

            // Fallback respeitando as 03:00 AM
            if (brasiliaTime.getHours() < 3) {
                brasiliaTime = new Date(brasiliaTime.getTime() - 24 * 3600 * 1000)
            }
            return brasiliaTime.toISOString().split('T')[0]
        }
    },

    setVin(valor) {
        this.vinGlobal = valor.toUpperCase()
        this.salvarEstadoHibrido()
    },

    salvarEstadoHibrido() {
        if (!this.operadorAtual) return
        const dataHoje = this.obterDataDoTurno()
        // PERF-3: Separar rastroGps do estado principal
        // GPS é salvo via GPSBatcher com debounce de 30s para reduzir writes no RTDB
        const estado = {
            data: dataHoje,
            vinGlobal: this.vinGlobal,
            etapaAtualIndex: this.etapaAtualIndex,
            checkins: this.checkins,
            etapaDesaceleracaoIndex: this.etapaDesaceleracaoIndex,
            checkinsDesaceleracao: this.checkinsDesaceleracao,
            ciclosFrenagem: this.ciclosFrenagem,
            logRodagem: this.logRodagem,
            rodagemDistanciaMts: this.rodagemDistanciaMts,
            rastroGps: this.rastroGps, // mantido para compatibilidade/leitura local
            ultimaAtualizacao: new Date().toLocaleTimeString('pt-BR'),
        }
        // Salvar estado principal sem GPS no RTDB (mais leve)
        const estadoSemGps = { ...estado }
        delete estadoSemGps.rastroGps
        db.ref(`vev_turnos/${dataHoje}/${this.operadorAtual}`)
            .set(estadoSemGps)
            .catch((err) => console.log('Erro Firebase:', err))
        // Backup local completo (inclui GPS para uso offline)
        localStorage.setItem(`vev_estado_backup_${this.operadorAtual}`, JSON.stringify(estado))
    },

    async carregarEstadoHibrido() {
        if (!this.operadorAtual) return
        const dataHoje = this.obterDataDoTurno()
        try {
            const getCloudPromise = db
                .ref(`vev_turnos/${dataHoje}/${this.operadorAtual}`)
                .once('value')

            // Corrida de 2.5s para evitar congelamento offline
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(
                    () => reject(new Error('Limite de tempo de resposta da rede excedido')),
                    2500
                )
            )

            const snapshot = await Promise.race([getCloudPromise, timeoutPromise])
            const estadoNuvem = snapshot.val()
            if (estadoNuvem) {
                this.vinGlobal = estadoNuvem.vinGlobal || ''
                if (document.getElementById('global-vin'))
                    document.getElementById('global-vin').value = this.vinGlobal
                this.etapaAtualIndex = estadoNuvem.etapaAtualIndex || 0
                this.checkins = estadoNuvem.checkins || []
                this.etapaDesaceleracaoIndex = estadoNuvem.etapaDesaceleracaoIndex || 0
                this.checkinsDesaceleracao = estadoNuvem.checkinsDesaceleracao || []
                this.ciclosFrenagem = estadoNuvem.ciclosFrenagem || []
                this.logRodagem = estadoNuvem.logRodagem || []
                this.rodagemDistanciaMts = estadoNuvem.rodagemDistanciaMts || 0
                this.rastroGps = estadoNuvem.rastroGps || []
            } else {
                this.restaurarBackupLocal()
            }
        } catch (error) {
            console.warn(
                '[carregarEstadoHibrido] Carregando a partir do Backup Local Offline:',
                error.message
            )
            this.restaurarBackupLocal()
        }

        this.atualizarInterfaceCola()
        this.atualizarInterfaceDesaceleracao()
        this.renderListaFrenagem()
        this.renderLogRodagem()
    },

    restaurarBackupLocal() {
        const salvoLocal = localStorage.getItem(`vev_estado_backup_${this.operadorAtual}`)
        const dataHoje = this.obterDataDoTurno()
        if (salvoLocal) {
            const estadoLocal = JSON.parse(salvoLocal)
            if (estadoLocal.data === dataHoje) {
                this.vinGlobal = estadoLocal.vinGlobal || ''
                if (document.getElementById('global-vin'))
                    document.getElementById('global-vin').value = this.vinGlobal
                this.etapaAtualIndex = estadoLocal.etapaAtualIndex || 0
                this.checkins = estadoLocal.checkins || []
                this.etapaDesaceleracaoIndex = estadoLocal.etapaDesaceleracaoIndex || 0
                this.checkinsDesaceleracao = estadoLocal.checkinsDesaceleracao || []
                this.ciclosFrenagem = estadoLocal.ciclosFrenagem || []
                this.logRodagem = estadoLocal.logRodagem || []
                this.rodagemDistanciaMts = estadoLocal.rodagemDistanciaMts || 0
                this.rastroGps = estadoLocal.rastroGps || []
                return
            }
        }
        this.vinGlobal = ''
        if (document.getElementById('global-vin')) document.getElementById('global-vin').value = ''
        this.etapaAtualIndex = 0
        this.checkins = []
        this.etapaDesaceleracaoIndex = 0
        this.checkinsDesaceleracao = []
        this.ciclosFrenagem = []
        this.logRodagem = []
        this.rodagemDistanciaMts = 0
        this.rastroGps = []
    },

    // ── ALTERADO: compatível com Firebase Auth ──────────────────
    verificarSessao() {
        const usuarioSalvo = localStorage.getItem('app_vev_operador')
        if (usuarioSalvo) {
            this.operadorAtual = usuarioSalvo
            const ui = document.getElementById('ui-nome-usuario')
            if (ui) ui.innerText = usuarioSalvo
            this.carregarEstadoHibrido()
        }
    },

    // ── DESATIVADO: fluxo legado substituído por Firebase Auth ──
    // efetuarLogin() removida por segurança — não use senhas hardcoded.
    efetuarLogin() {
        console.warn('[VEV] efetuarLogin() legada chamada. Use Firebase Auth.')
    },

    // ── ALTERADO: chama Firebase Auth signOut ───────────────────
    async efetuarLogout() {
        const confirmado = await (window.VEVAlert?.confirm(
            'Os dados do turno atual ficarão salvos na nuvem.',
            {
                title: 'Encerrar Sessão?',
                confirmText: 'Sair',
                cancelText: 'Cancelar',
                type: 'warning',
                confirmDanger: true,
            }
        ) ??
            Promise.resolve(
                window.confirm('Deseja encerrar seu turno? Os dados ficarão salvos na nuvem.')
            ))
        if (confirmado) {
            // CORRIGIDO: Para o GPS e libera a tela bloqueada por WakeLock
            if (typeof pararCopilotoKX === 'function') {
                pararCopilotoKX()
            }
            if (typeof liberarTela === 'function') {
                liberarTela()
            }
            if (typeof DashboardGestao !== 'undefined') {
                DashboardGestao.parar()
            }
            if (typeof BannerCronometro !== 'undefined') {
                BannerCronometro.parar()
            }

            localStorage.removeItem('app_vev_operador')
            localStorage.removeItem('vev_turno_ativo')
            this.operadorAtual = null
            const ui = document.getElementById('ui-nome-usuario')
            if (ui) ui.innerText = 'NÃO LOGADO'
            this.vinGlobal = ''
            if (document.getElementById('global-vin'))
                document.getElementById('global-vin').value = ''
            this.etapaAtualIndex = 0
            this.checkins = []
            this.etapaDesaceleracaoIndex = 0
            this.checkinsDesaceleracao = []
            this.ciclosFrenagem = []
            this.logRodagem = []
            this.rodagemDistanciaMts = 0
            this.rastroGps = []
            // Desloga do Firebase Auth
            if (typeof firebase !== 'undefined' && firebase.auth) {
                firebase
                    .auth()
                    .signOut()
                    .catch((e) => console.log('[logout]', e))
            }
        }
    },

    // HISTÓRICO DE 7 DIAS
    async abrirModalHistorico() {
        appUI.abrirModal('modal-historico')
        const container = document.getElementById('lista-historico-nuvem')
        // UX-3: Skeleton loader em vez de texto simples
        if (window.VEVSkeleton) {
            container.innerHTML = VEVSkeleton.gerarListaHistorico(4)
        } else {
            container.innerHTML =
                '<div style="text-align: center; padding: 2rem; color: #fff;">Buscando seus relatórios antigos...</div>'
        }
        try {
            const getCloudPromise = db.ref('vev_turnos').orderByKey().limitToLast(7).once('value')
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Tempo limite de rede excedido')), 2500)
            )
            const snapshot = await Promise.race([getCloudPromise, timeoutPromise])
            const dias = snapshot.val()
            if (!dias) {
                container.innerHTML =
                    '<div style="text-align: center; padding: 2rem; color: #fff;">Nenhum histórico encontrado na nuvem.</div>'
                return
            }
            let html = ''
            const datasKeys = Object.keys(dias).reverse()
            let encontrouAlgum = false
            datasKeys.forEach((dataString) => {
                const turnosDoDia = dias[dataString]
                const meunome = this.operadorAtual
                if (turnosDoDia && turnosDoDia[meunome]) {
                    encontrouAlgum = true
                    const dadosOp = turnosDoDia[meunome]
                    const tFren = (dadosOp.ciclosFrenagem || []).length
                    const tR389 = (dadosOp.checkins || []).length
                    const tDesacel = (dadosOp.checkinsDesaceleracao || []).length
                    html += `<div style="background:rgba(255,255,255,0.1);border-radius:12px;margin-bottom:15px;overflow:hidden;">
                        <div style="background:rgba(255,255,255,0.2);padding:10px 15px;font-weight:bold;color:#fff;">Data: ${dataString.split('-').reverse().join('/')}</div>
                        <div style="padding:12px 15px;display:flex;justify-content:space-between;align-items:center;">
                            <div><strong style="color:var(--neon-blue);">Seus Testes</strong><br><span style="font-size:0.8rem;color:#ccc;">Fren: ${tFren} | R389: ${tR389} | Desacel: ${tDesacel}</span></div>
                            <button onclick="app.baixarRelatorioAntigo('${dataString}','${meunome}')" style="background:var(--neon-blue);color:#000;border:none;padding:10px;border-radius:8px;font-weight:bold;cursor:pointer;" aria-label="Baixar PDF do dia ${dataString}">BAIXAR PDF</button>
                        </div></div>`
                }
            })
            if (!encontrouAlgum) {
                html =
                    '<div style="text-align:center;padding:2rem;color:#fff;">Você não possui testes registrados nos últimos 7 dias.</div>'
            }
            container.innerHTML = html
        } catch (e) {
            console.warn('[Historico] Erro ou timeout ao buscar histórico:', e)
            container.innerHTML =
                '<div style="text-align:center;padding:2rem;color:red;">Não foi possível carregar o histórico offline. Verifique sua conexão.</div>'
        }
    },

    async baixarRelatorioAntigo(dataString, operador) {
        try {
            const getCloudPromise = db.ref(`vev_turnos/${dataString}/${operador}`).once('value')
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Tempo limite de rede excedido')), 2500)
            )
            const snapshot = await Promise.race([getCloudPromise, timeoutPromise])
            const dadosOp = snapshot.val()
            if (!dadosOp) return alert('Dados não encontrados.')
            const { jsPDF } = window.jspdf
            const doc = new jsPDF()
            doc.setFillColor(15, 23, 42)
            doc.rect(0, 0, 210, 30, 'F')
            doc.setTextColor(255, 255, 255)
            doc.setFontSize(14)
            doc.text(
                `RELATÓRIO HISTÓRICO - ${dataString.split('-').reverse().join('/')}`,
                105,
                15,
                { align: 'center' }
            )
            doc.setFontSize(10)
            doc.text(`Operador: ${operador}`, 105, 22, { align: 'center' })
            let currentY = 35
            doc.setTextColor(0, 0, 0)
            if (dadosOp.ciclosFrenagem && dadosOp.ciclosFrenagem.length > 0) {
                doc.text('FRENAGEM:', 14, currentY)
                const tableData = dadosOp.ciclosFrenagem.map((f) => [
                    `C${f.ciclo}`,
                    f.etapa,
                    f.hora,
                    f.observacao || 'OK',
                ])
                doc.autoTable({
                    startY: currentY + 5,
                    head: [['CICLO', 'ETAPA', 'HORA', 'STATUS']],
                    body: tableData,
                })
                currentY = doc.lastAutoTable.finalY + 15
            }
            if (dadosOp.checkins && dadosOp.checkins.length > 0) {
                doc.text('R389:', 14, currentY)
                const tableData = dadosOp.checkins.map((c, i) => [i + 1, c.atividade, c.hora])
                doc.autoTable({
                    startY: currentY + 5,
                    head: [['#', 'ATIVIDADE', 'HORA']],
                    body: tableData,
                })
                currentY = doc.lastAutoTable.finalY + 15
            }
            if (dadosOp.checkinsDesaceleracao && dadosOp.checkinsDesaceleracao.length > 0) {
                doc.text('DESACELERAÇÃO 16 LAPS:', 14, currentY)
                const tableData = dadosOp.checkinsDesaceleracao.map((c, i) => [
                    i + 1,
                    c.atividade,
                    c.hora,
                ])
                doc.autoTable({
                    startY: currentY + 5,
                    head: [['LAP/ETAPA', 'ATIVIDADE', 'HORA']],
                    body: tableData,
                })
            }
            const veiculo = dadosOp.veiculo || 'Carro'
            const veiculoSanitizado = veiculo.replace(/\s+/g, '_')
            const vin = dadosOp.vin || 'N/A'
            const nomeOp = operador.split(' ')[0]
            const fileName = `Historico_${veiculoSanitizado}_${vin}_${nomeOp}_${dataString}.pdf`
            const textShare = `Relatório Histórico - Veículo: ${veiculo} - VIN: ${vin} - Analista: ${operador}`
            await this.salvarECompartilharPDF(doc, fileName, textShare, 'Relatório Histórico')
        } catch (e) {
            console.error('[Historico PDF]', e)
            alert('Erro ou timeout ao buscar/gerar PDF do relatório antigo.')
        }
    },

    async melhorarTextoComIA(botao) {
        const textarea = document.getElementById('i-obs')
        const textoOriginal = textarea.value.trim()
        if (textoOriginal === '') return alert('Digite algo antes de usar a IA.')
        if (textoOriginal.toUpperCase() === 'RESETAR') {
            localStorage.removeItem('gemini_api_key')
            localStorage.removeItem('cofre_chave_gemini')
            textarea.value = ''
            return alert('Chaves apagadas!')
        }

        const originalHtml = botao.innerHTML
        botao.disabled = true
        botao.innerHTML =
            '<span class="material-icons" style="font-size:1rem; animation: spin 1s linear infinite;">sync</span> Refinando...'

        const systemInstruction =
            "Atue como Engenheiro Automotivo Sênior de Testes de Pista no Campo de Provas da Ford (Tatuí). " +
            "Sua tarefa é receber a descrição de uma anomalia ou defeito relatada de forma informal pelo operador, e reescrevê-la " +
            "como um parecer técnico formal de engenharia, conciso e profissional, ideal para relatórios técnicos oficiais (padrão SAE/Ford).\n\n" +
            "Diretrizes de Terminologia Técnica:\n" +
            "- Substitua 'barulho' por 'ruído anormal (NVH)', 'atrito metal-metal', 'vibração espúria' ou 'ressonância acústica', detalhando a localização provável.\n" +
            "- Substitua 'vazamento' por 'perda de estanqueidade' ou 'indício de vazamento / gotejamento' de fluido, especificando o componente.\n" +
            "- Substitua termos informais de pista por termos oficiais de desenvolvimento automotivo. Exemplos:\n" +
            "  * 'motor fraco/sem força' -> 'limitação de torque/potência no powertrain' ou 'comportamento anormal na curva de resposta do acelerador'\n" +
            "  * 'freio borrachudo/mole' -> 'baixa resposta pedal de freio com indício de ar na linha de pressão hidráulica'\n" +
            "  * 'freio fazendo barulhão/chiando' -> 'ruído de atrito metal-metal na frenagem de baixa velocidade'\n" +
            "  * 'amortecedor batendo seco' -> 'ruído de impacto por fim de curso do conjunto telescópico de amortecimento'\n" +
            "  * 'marcha raspando' -> 'dificuldade de acoplamento do sincronizador da engrenagem'\n" +
            "  * 'bateria fraca' -> 'subtensão detectada no sistema elétrico auxiliar / falha de carga'\n" +
            "  * 'luz piscando' -> 'intermitência de sinal / falha de contato no circuito elétrico'\n\n" +
            "Não adicione saudações, introduções, justificativas ou explicações adicionais. Retorne estritamente o parecer reescrito de forma limpa, técnica e direta."

        try {
            let API_KEY =
                localStorage.getItem('gemini_api_key') || localStorage.getItem('cofre_chave_gemini')
            if (!API_KEY) {
                this.alternarPainelApiKey()
                botao.disabled = false
                botao.innerHTML = originalHtml
                alert('Nenhuma API Key configurada. Insira sua chave no campo inline aberto.')
                return
            }

            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`
            const resposta = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemInstruction: {
                        parts: [{ text: systemInstruction }],
                    },
                    contents: [
                        {
                            parts: [{ text: textoOriginal }],
                        },
                    ],
                }),
            })
            const dados = await resposta.json()
            if (
                dados.candidates &&
                dados.candidates[0].content &&
                dados.candidates[0].content.parts
            ) {
                textarea.value = dados.candidates[0].content.parts[0].text.trim()
            } else if (dados.error) {
                alert('Erro da API Gemini: ' + (dados.error.message || 'Erro desconhecido'))
            } else {
                alert('Resposta inválida da API da IA.')
            }
        } catch (e) {
            console.error(e)
            alert('Erro na comunicação com a IA.')
        } finally {
            botao.disabled = false
            botao.innerHTML = originalHtml
        }
    },

    // =====================================
    // CONTROLES DE PISTA E LOGS
    // =====================================
    registrarPassagem(forcarVindoDoCopiloto = false) {
        if (this.etapaAtualIndex >= this.sequenciaDiasPares.length) {
            this.etapaAtualIndex = 0
            const vin = this.vinGlobal || 'NÃO INFORMADO'
            this.checkins.push({
                atividade: '--- NOVA SÉRIE R389 (AUTO-REINÍCIO) ---',
                hora: new Date().toLocaleTimeString('pt-BR'),
                vin,
                operador: this.operadorAtual,
            })
        }
        const nomeEtapa = this.sequenciaDiasPares[this.etapaAtualIndex]
        const vin = this.vinGlobal || 'NÃO INFORMADO'
        this.checkins.push({
            atividade: nomeEtapa,
            hora: new Date().toLocaleTimeString('pt-BR'),
            vin,
            operador: this.operadorAtual,
        })
        if ('vibrate' in navigator) navigator.vibrate(50)
        this.etapaAtualIndex++

        // Auto-reinício imediato ao concluir a última etapa
        if (this.etapaAtualIndex >= this.sequenciaDiasPares.length) {
            this.etapaAtualIndex = 0
            this.checkins.push({
                atividade: '--- AUTO-REINÍCIO R389 ---',
                hora: new Date().toLocaleTimeString('pt-BR'),
                vin,
                operador: this.operadorAtual,
            })
            if (typeof falar === 'function') {
                falar('R389 finalizado. Reiniciando novo ciclo.')
            }
        }

        this.salvarEstadoHibrido()
        this.atualizarInterfaceCola()
    },

    definirEtapaR389(index) {
        this.etapaAtualIndex = index
        this.salvarEstadoHibrido()
        this.atualizarInterfaceCola()
    },

    async novaVolta(forcarVindoDoCopiloto = false) {
        const confirmar =
            forcarVindoDoCopiloto ||
            (window.VEVAlert
                ? await VEVAlert.confirm('Iniciar nova volta na R389?', {
                      title: 'Nova Volta R389',
                      type: 'info',
                      confirmText: 'Confirmar',
                      cancelText: 'Cancelar',
                  })
                : confirm('Iniciar nova volta na R389?'))
        if (confirmar) {
            this.etapaAtualIndex = 0
            const vin = this.vinGlobal || 'NÃO INFORMADO'
            this.checkins.push({
                atividade: '--- NOVA SÉRIE R389 ---',
                hora: new Date().toLocaleTimeString('pt-BR'),
                vin,
                operador: this.operadorAtual,
            })
            this.salvarEstadoHibrido()
            this.atualizarInterfaceCola()
        }
    },

    atualizarInterfaceCola() {
        const etapaEl = document.getElementById('etapa-atual')
        if (!etapaEl) return
        etapaEl.innerText =
            this.etapaAtualIndex < this.sequenciaDiasPares.length
                ? this.sequenciaDiasPares[this.etapaAtualIndex]
                : 'CICLO R389 CONCLUÍDO'
        const lista = document.getElementById('lista-cola')
        if (!lista) return
        lista.innerHTML = this.sequenciaDiasPares
            .map(
                (e, i) =>
                    `<div class="log-item ${i < this.etapaAtualIndex ? 'concluido' : i === this.etapaAtualIndex ? 'ativo' : ''}" onclick="app.definirEtapaR389(${i})" style="cursor:pointer;">
                <span class="material-icons" style="color:${i === this.etapaAtualIndex ? 'var(--accent)' : 'inherit'};">
                    ${i < this.etapaAtualIndex ? 'check_circle' : 'radio_button_unchecked'}
                </span>${e}
            </div>`
            )
            .join('')
        setTimeout(() => {
            const a = document.querySelector('#lista-cola .log-item.ativo')
            if (a) a.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 100)
    },

    async resetarRoteiro() {
        const confirmar = window.VEVAlert
            ? await VEVAlert.confirm('APAGAR os registros do R389?', {
                  title: 'Resetar Roteiro R389',
                  type: 'warning',
                  confirmText: 'Resetar',
                  cancelText: 'Cancelar',
                  confirmDanger: true,
              })
            : confirm('APAGAR os registros do R389?')
        if (confirmar) {
            this.etapaAtualIndex = 0
            this.checkins = []
            this.salvarEstadoHibrido()
            this.atualizarInterfaceCola()
        }
    },

    async gerarRelatorioRoteiro() {
        if (this.checkins.length === 0) return alert('Sem registros.')
        const vin = this.vinGlobal || 'N/A'
        const { jsPDF } = window.jspdf
        const doc = new jsPDF()
        doc.setFillColor(15, 23, 42)
        doc.rect(0, 0, 210, 40, 'F')
        doc.setTextColor(168, 85, 247)
        doc.setFontSize(16)
        doc.text('LOG DE CICLOS (R389)', 105, 20, { align: 'center' })
        doc.setFontSize(10)
        doc.text(
            `Data: ${new Date().toLocaleDateString('pt-BR')} | Analista: ${this.operadorAtual || 'Analista'} | VIN: ${vin}`,
            105,
            28,
            { align: 'center' }
        )
        const dadosTabela = this.checkins.map((c, i) => [i + 1, c.atividade, c.hora])
        doc.autoTable({
            startY: 45,
            head: [['#', 'CICLO / ETAPA', 'HORA']],
            body: dadosTabela,
            headStyles: { fillColor: [168, 85, 247], textColor: [255, 255, 255] },
        })
        const veiculo =
            (typeof TurnoEngine !== 'undefined' && TurnoEngine.dados?.veiculo) || 'Carro'
        const veiculoSanitizado = veiculo.replace(/\s+/g, '_')
        const nomeOp = (this.operadorAtual || 'Analista').split(' ')[0]
        const fileName = `Log_R389_${veiculoSanitizado}_${vin}_${nomeOp}.pdf`
        const textShare = `Log R389 - Veículo: ${veiculo} - VIN: ${vin} - Analista: ${this.operadorAtual || 'Analista'}`
        await this.salvarECompartilharPDF(doc, fileName, textShare, 'Controle R389')
    },

    registrarPassagemDesaceleracao(forcarVindoDoCopiloto = false) {
        if (this.etapaDesaceleracaoIndex >= this.roteiroDesaceleracao.length) {
            this.etapaDesaceleracaoIndex = 0
            const vin = this.vinGlobal || 'NÃO INFORMADO'
            this.checkinsDesaceleracao.push({
                atividade: '--- NOVO CICLO (AUTO-REINÍCIO) ---',
                hora: new Date().toLocaleTimeString('pt-BR'),
                vin,
                operador: this.operadorAtual,
            })
        }
        const nomeEtapa = this.roteiroDesaceleracao[this.etapaDesaceleracaoIndex]
        const vin = this.vinGlobal || 'NÃO INFORMADO'
        this.checkinsDesaceleracao.push({
            atividade: nomeEtapa,
            hora: new Date().toLocaleTimeString('pt-BR'),
            vin,
            operador: this.operadorAtual,
        })
        if ('vibrate' in navigator) navigator.vibrate(50)
        this.etapaDesaceleracaoIndex++

        // Auto-reinício imediato ao concluir o ciclo
        if (this.etapaDesaceleracaoIndex >= this.roteiroDesaceleracao.length) {
            this.etapaDesaceleracaoIndex = 0
            this.checkinsDesaceleracao.push({
                atividade: '--- AUTO-REINÍCIO DESACELERAÇÃO ---',
                hora: new Date().toLocaleTimeString('pt-BR'),
                vin,
                operador: this.operadorAtual,
            })
            if (typeof falar === 'function') {
                falar('Desaceleração finalizada. Reiniciando novo ciclo.')
            }
        }

        this.salvarEstadoHibrido()
        this.atualizarInterfaceDesaceleracao()
    },

    definirEtapaDesaceleracao(index) {
        this.etapaDesaceleracaoIndex = index
        this.salvarEstadoHibrido()
        this.atualizarInterfaceDesaceleracao()
    },

    async novaVoltaDesaceleracao(forcarVindoDoCopiloto = false) {
        const confirmar =
            forcarVindoDoCopiloto ||
            (window.VEVAlert
                ? await VEVAlert.confirm('Iniciar novo ciclo?', {
                      title: 'Novo Ciclo Desaceleração',
                      type: 'info',
                      confirmText: 'Confirmar',
                      cancelText: 'Cancelar',
                  })
                : confirm('Iniciar novo ciclo?'))
        if (confirmar) {
            this.etapaDesaceleracaoIndex = 0
            const vin = this.vinGlobal || 'NÃO INFORMADO'
            this.checkinsDesaceleracao.push({
                atividade: '--- NOVO CICLO DE DESACELERAÇÃO ---',
                hora: new Date().toLocaleTimeString('pt-BR'),
                vin,
                operador: this.operadorAtual,
            })
            this.salvarEstadoHibrido()
            this.atualizarInterfaceDesaceleracao()
        }
    },

    atualizarInterfaceDesaceleracao() {
        const etapaEl = document.getElementById('etapa-desaceleracao-atual')
        if (!etapaEl) return
        etapaEl.innerText =
            this.etapaDesaceleracaoIndex < this.roteiroDesaceleracao.length
                ? this.roteiroDesaceleracao[this.etapaDesaceleracaoIndex]
                : 'TESTE CONCLUÍDO'
        const lista = document.getElementById('lista-desaceleracao')
        if (!lista) return
        lista.innerHTML = this.roteiroDesaceleracao
            .map(
                (e, i) =>
                    `<div class="log-item ${i < this.etapaDesaceleracaoIndex ? 'concluido' : i === this.etapaDesaceleracaoIndex ? 'ativo' : ''}" onclick="app.definirEtapaDesaceleracao(${i})" style="cursor:pointer;">
                <span class="material-icons" style="color:${i === this.etapaDesaceleracaoIndex ? 'var(--accent)' : 'inherit'};">
                    ${i < this.etapaDesaceleracaoIndex ? 'check_circle' : 'radio_button_unchecked'}
                </span>${i + 1}. ${e}
            </div>`
            )
            .join('')
        setTimeout(() => {
            const a = document.querySelector('#lista-desaceleracao .log-item.ativo')
            if (a) a.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 100)
    },

    async resetarDesaceleracao() {
        const confirmar = window.VEVAlert
            ? await VEVAlert.confirm('APAGAR os registros?', {
                  title: 'Resetar Registros',
                  type: 'warning',
                  confirmText: 'Resetar',
                  cancelText: 'Cancelar',
                  confirmDanger: true,
              })
            : confirm('APAGAR os registros?')
        if (confirmar) {
            this.etapaDesaceleracaoIndex = 0
            this.checkinsDesaceleracao = []
            this.salvarEstadoHibrido()
            this.atualizarInterfaceDesaceleracao()
        }
    },

    async gerarRelatorioDesaceleracao() {
        if (this.checkinsDesaceleracao.length === 0) return alert('Sem registros.')
        const vin = this.vinGlobal || 'N/A'
        const { jsPDF } = window.jspdf
        const doc = new jsPDF()
        doc.setFillColor(15, 23, 42)
        doc.rect(0, 0, 210, 40, 'F')
        doc.setTextColor(236, 72, 153)
        doc.setFontSize(16)
        doc.text('LOG DE DESACELERAÇÃO (16 LAPS)', 105, 20, { align: 'center' })
        doc.setFontSize(10)
        doc.text(
            `Data: ${new Date().toLocaleDateString('pt-BR')} | Analista: ${this.operadorAtual || 'Analista'} | VIN: ${vin}`,
            105,
            28,
            { align: 'center' }
        )
        const dadosTabela = this.checkinsDesaceleracao.map((c, i) => [i + 1, c.atividade, c.hora])
        doc.autoTable({
            startY: 45,
            head: [['LAP / ETAPA', 'ATIVIDADE', 'HORA']],
            body: dadosTabela,
            headStyles: { fillColor: [236, 72, 153], textColor: [255, 255, 255] },
        })
        const veiculo =
            (typeof TurnoEngine !== 'undefined' && TurnoEngine.dados?.veiculo) || 'Carro'
        const veiculoSanitizado = veiculo.replace(/\s+/g, '_')
        const nomeOp = (this.operadorAtual || 'Analista').split(' ')[0]
        const fileName = `Log_Desaceleracao_${veiculoSanitizado}_${vin}_${nomeOp}.pdf`
        const textShare = `Log de Desaceleração - Veículo: ${veiculo} - VIN: ${vin} - Analista: ${this.operadorAtual || 'Analista'}`
        await this.salvarECompartilharPDF(doc, fileName, textShare, 'Log de Desaceleração')
    },

    registrarVoltaFrenagem() {
        if (this.frenagemLapIndex === undefined) {
            this.frenagemLapIndex = this.ciclosFrenagem.length % 8
        }
        const totalVoltas = this.ciclosFrenagem.length
        const indexNoCiclo = this.frenagemLapIndex
        const numeroCicloAtual = Math.floor(totalVoltas / 8) + 1
        const nomeEtapa = this.roteiroFrenagem[indexNoCiclo]
        const obs = document.getElementById('f-obs')?.value || 'OK'
        const vin = this.vinGlobal || 'NÃO INFORMADO'
        this.ciclosFrenagem.push({
            ciclo: numeroCicloAtual,
            etapa: nomeEtapa,
            observacao: obs,
            hora: new Date().toLocaleTimeString('pt-BR'),
            operador: this.operadorAtual,
            vin,
        })
        if (document.getElementById('f-obs')) document.getElementById('f-obs').value = ''
        if ('vibrate' in navigator) navigator.vibrate(50)

        // Incrementar o lap ativamente e resetar/dar wrap em 8
        const oldLap = this.frenagemLapIndex
        this.frenagemLapIndex = (this.frenagemLapIndex + 1) % 8

        // Auto-reinício de ciclo falado
        if (oldLap === 7) {
            if (typeof falar === 'function') {
                falar('Ciclo de frenagem concluído. Iniciando novo ciclo.')
            }
        }

        this.salvarEstadoHibrido()
        this.renderListaFrenagem()
    },

    definirLapFrenagem(lapNum) {
        this.frenagemLapIndex = lapNum - 1
        this.salvarEstadoHibrido()
        this.renderListaFrenagem()
    },

    renderListaFrenagem() {
        if (this.frenagemLapIndex === undefined) {
            this.frenagemLapIndex = this.ciclosFrenagem.length % 8
        }
        const indexNoCiclo = this.frenagemLapIndex
        const totalVoltas = this.ciclosFrenagem.length
        const numeroCicloAtual = Math.floor(totalVoltas / 8) + 1
        const voltaAtual = indexNoCiclo + 1
        const elCiclo = document.getElementById('f-ciclo-atual')
        const elProg = document.getElementById('f-progresso-ciclo')
        const elProx = document.getElementById('f-proxima-etapa')
        if (elCiclo) elCiclo.innerText = `CICLO ${numeroCicloAtual}`
        if (elProg) elProg.innerText = `Lap ${voltaAtual}/8`
        if (elProx) elProx.innerText = this.roteiroFrenagem[indexNoCiclo]

        // Atualizar estado visual dos botões seletores de lap
        for (let i = 1; i <= 8; i++) {
            const btn = document.getElementById(`f-btn-lap-${i}`)
            if (btn) {
                if (i === voltaAtual) {
                    btn.classList.add('active')
                } else {
                    btn.classList.remove('active')
                }
            }
        }

        const lista = document.getElementById('lista-frenagem')
        if (!lista) return
        if (totalVoltas === 0) {
            lista.innerHTML =
                '<div style="color:#475569;text-align:center;padding:1rem;">Nenhuma volta registrada.</div>'
            return
        }
        let htmlLista = ''
        const listaReversa = [...this.ciclosFrenagem].reverse()
        let cicloAnterior = null
        listaReversa.forEach((f) => {
            if (f.ciclo !== cicloAnterior && cicloAnterior !== null) {
                htmlLista += `<div style="background:rgba(16,185,129,0.1);color:var(--neon-green);padding:8px;text-align:center;font-size:0.85rem;font-weight:bold;">FIM DO CICLO ${cicloAnterior}</div>`
            }
            cicloAnterior = f.ciclo
            htmlLista += `<div class="log-item" style="justify-content:space-between;">
                <div><strong style="color:var(--text-primary);">${f.etapa}</strong><br>
                <span style="color:var(--text-secondary);">Obs: ${f.observacao}</span></div>
                <div style="text-align:right;opacity:0.6;"><div style="font-size:0.75rem;">${f.hora}</div>
                <div style="font-size:0.75rem;font-weight:bold;color:var(--accent);">C${f.ciclo}</div></div>
            </div>`
        })
        lista.innerHTML = htmlLista
    },

    async resetarFrenagem() {
        const confirmar = window.VEVAlert
            ? await VEVAlert.confirm('APAGAR os dados?', {
                  title: 'Resetar Dados Frenagem',
                  type: 'warning',
                  confirmText: 'Resetar',
                  cancelText: 'Cancelar',
                  confirmDanger: true,
              })
            : confirm('APAGAR os dados?')
        if (confirmar) {
            this.ciclosFrenagem = []
            this.salvarEstadoHibrido()
            this.renderListaFrenagem()
        }
    },

    async gerarRelatorioFrenagem() {
        if (this.ciclosFrenagem.length === 0) return alert('Nenhum dado.')
        const vin = this.vinGlobal || 'N/A'
        const { jsPDF } = window.jspdf
        const doc = new jsPDF()
        doc.setFillColor(15, 23, 42)
        doc.rect(0, 0, 210, 40, 'F')
        doc.setTextColor(249, 115, 22)
        doc.setFontSize(16)
        doc.text('LOG DETALHADO DE FRENAGEM', 105, 20, { align: 'center' })
        doc.setFontSize(10)
        doc.text(
            `Data: ${new Date().toLocaleDateString('pt-BR')} | Analista: ${this.operadorAtual || 'Analista'} | VIN: ${vin}`,
            105,
            28,
            { align: 'center' }
        )
        const dados = this.ciclosFrenagem.map((f) => [
            `Ciclo ${f.ciclo}`,
            f.etapa,
            f.hora,
            f.observacao,
        ])
        doc.autoTable({
            startY: 45,
            head: [['CICLO', 'VOLTA / ETAPA', 'HORA', 'STATUS']],
            body: dados,
            headStyles: { fillColor: [249, 115, 22] },
        })
        const veiculo =
            (typeof TurnoEngine !== 'undefined' && TurnoEngine.dados?.veiculo) || 'Carro'
        const veiculoSanitizado = veiculo.replace(/\s+/g, '_')
        const nomeOp = (this.operadorAtual || 'Analista').split(' ')[0]
        const fileName = `Log_Fren_${veiculoSanitizado}_${vin}_${nomeOp}.pdf`
        const textShare = `Log Detalhado de Frenagem - Veículo: ${veiculo} - VIN: ${vin} - Analista: ${this.operadorAtual || 'Analista'}`
        await this.salvarECompartilharPDF(doc, fileName, textShare, 'Log Detalhado de Frenagem')
    },

    renderLogRodagem() {
        const lista = document.getElementById('lista-rodagem')
        if (!lista) return
        if (this.logRodagem.length === 0) {
            lista.innerHTML =
                '<div style="color:#475569;text-align:center;padding:1rem;">Nenhum evento severo detectado.</div>'
            return
        }
        lista.innerHTML = [...this.logRodagem]
            .reverse()
            .map(
                (f) =>
                    `<div class="log-item" style="justify-content:space-between;border-left:4px solid var(--neon-cyan);background:rgba(34,211,238,0.05);margin-bottom:5px;border-radius:8px;">
                <div><strong style="color:var(--neon-cyan);">${f.evento}</strong><br>
                <span style="color:var(--text-secondary);font-size:0.8rem;">Intensidade: ${f.forca} | Vel: ${f.vel}</span></div>
                <div style="text-align:right;opacity:0.6;font-size:0.75rem;">${f.hora}</div>
            </div>`
            )
            .join('')
    },

    async resetarRodagem() {
        const confirmar = window.VEVAlert
            ? await VEVAlert.confirm(
                  'APAGAR todo o histórico de viagem, caixa preta e o traçado do mapa?',
                  {
                      title: 'Resetar Dados Rodagem',
                      type: 'warning',
                      confirmText: 'Resetar',
                      cancelText: 'Cancelar',
                      confirmDanger: true,
                  }
              )
            : confirm('APAGAR todo o histórico de viagem, caixa preta e o traçado do mapa?')
        if (confirmar) {
            this.logRodagem = []
            this.rastroGps = []
            this.rodagemDistanciaMts = 0
            this.salvarEstadoHibrido()
            this.renderLogRodagem()
        }
    },

    // Helper: captura gráfico Chart.js de velocidade como imagem base64
    _capturarGraficoVelocidade() {
        const chart = window._chartTelemetria
        if (!chart) return null
        try {
            return chart.toBase64Image('image/png', 1.0)
        } catch (e) {
            return null
        }
    },

    async gerarRelatorioRodagem() {
        if (!this.rastroGps || this.rastroGps.length < 2) {
            return alert(
                'Nenhum dado GPS registrado. Ative o Ford Free-Rolling Analytics e percorra um trajeto.'
            )
        }
        const vin = this.vinGlobal || 'N/A'

        // Métricas da sessão
        let somaVel = 0
        let velMax = 0
        this.rastroGps.forEach((p) => {
            if (p.vel > velMax) velMax = p.vel
            somaVel += p.vel
        })
        const velMedia = somaVel / this.rastroGps.length
        const distKm = (this.rodagemDistanciaMts / 1000).toFixed(3)

        const { jsPDF } = window.jspdf
        const doc = new jsPDF({ compress: true })

        // Cabeçalho
        doc.setFillColor(15, 23, 42)
        doc.rect(0, 0, 210, 42, 'F')
        doc.setFillColor(0, 72, 153)
        doc.rect(0, 0, 4, 42, 'F')
        doc.setTextColor(34, 211, 238)
        doc.setFontSize(13)
        doc.setFont(undefined, 'bold')
        doc.text('FORD FREE-ROLLING ANALYTICS', 105, 16, { align: 'center' })
        doc.setFontSize(8)
        doc.setFont(undefined, 'normal')
        doc.setTextColor(180, 190, 200)
        doc.text(
            `Analista: ${this.operadorAtual}  |  VIN: ${vin}  |  Data: ${new Date().toLocaleDateString('pt-BR')}`,
            105,
            26,
            { align: 'center' }
        )

        // Métricas resumo
        doc.autoTable({
            startY: 48,
            head: [['MÉTRICA', 'VALOR']],
            body: [
                ['Distância Total', `${distKm} km`],
                ['Velocidade Média', `${velMedia.toFixed(1)} km/h`],
                ['Velocidade Máxima', `${velMax.toFixed(1)} km/h`],
                ['Pontos GPS Registrados', `${this.rastroGps.length}`],
            ],
            headStyles: { fillColor: [34, 211, 238], textColor: [0, 0, 0] },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 90 } },
            margin: { left: 14, right: 14 },
        })

        // Gráfico de velocidade x tempo (Chart.js canvas)
        const graficoBase64 = this._capturarGraficoVelocidade()
        if (graficoBase64) {
            const yGraf = doc.lastAutoTable.finalY + 14
            doc.setFontSize(9)
            doc.setFont(undefined, 'bold')
            doc.setTextColor(34, 211, 238)
            doc.text('GRÁFICO — VELOCIDADE × TEMPO', 14, yGraf)
            doc.addImage(graficoBase64, 'PNG', 14, yGraf + 4, 182, 70)
        }

        const veiculo =
            (typeof TurnoEngine !== 'undefined' && TurnoEngine.dados?.veiculo) || 'Carro'
        const veiculoSanitizado = veiculo.replace(/\s+/g, '_')
        const nomeOp = (this.operadorAtual || 'Analista').split(' ')[0]
        const fileName = `FRA_GPS_${veiculoSanitizado}_${vin}_${nomeOp}_${Date.now()}.pdf`
        const textShare = `Ford Free-Rolling GPS - Veículo: ${veiculo} - VIN: ${vin} - Analista: ${this.operadorAtual || 'Analista'}`
        await this.salvarECompartilharPDF(doc, fileName, textShare, 'Ford Free-Rolling GPS')
    },

    async gerarRelatorioResumo() {
        if (
            this.checkins.length === 0 &&
            this.ciclosFrenagem.length === 0 &&
            this.checkinsDesaceleracao.length === 0 &&
            this.rodagemDistanciaMts === 0
        )
            return alert('Sem dados no turno.')
        const vin = this.vinGlobal || 'NÃO INFORMADO'
        const resumoR389 = {}
        this.checkins.forEach((r) => {
            if (!r.atividade.includes('---')) {
                let nome = r.atividade.split(':')[0].trim()
                resumoR389[nome] = (resumoR389[nome] || 0) + 1
            }
        })
        const resumoDesaceleracao = {}
        this.checkinsDesaceleracao.forEach((r) => {
            if (!r.atividade.includes('---')) {
                resumoDesaceleracao[r.atividade] = (resumoDesaceleracao[r.atividade] || 0) + 1
            }
        })
        const totalVoltasFrenagem = this.ciclosFrenagem.length
        const ciclosCompletosFrenagem = Math.floor(totalVoltasFrenagem / 8)
        const voltasRestantesBaixa = Math.min(totalVoltasFrenagem % 8, 4)
        const voltasRestantesAlta = Math.max(0, (totalVoltasFrenagem % 8) - 4)

        const { jsPDF } = window.jspdf
        const doc = new jsPDF()

        // Cabecalho
        doc.setFillColor(15, 23, 42)
        doc.rect(0, 0, 210, 42, 'F')
        doc.setFillColor(0, 72, 153)
        doc.rect(0, 0, 4, 42, 'F')
        doc.setTextColor(56, 189, 248)
        doc.setFontSize(13)
        doc.setFont(undefined, 'bold')
        doc.text('RESUMO GERAL DO TURNO', 105, 16, { align: 'center' })
        doc.setFontSize(8)
        doc.setFont(undefined, 'normal')
        doc.setTextColor(180, 190, 200)
        doc.text(
            `VIN: ${vin}  |  Data: ${new Date().toLocaleDateString('pt-BR')}  |  Analista: ${this.operadorAtual}`,
            105,
            26,
            { align: 'center' }
        )

        let currentY = 48

        // Secao Frenagem
        if (totalVoltasFrenagem > 0) {
            doc.setTextColor(0, 0, 0)
            doc.setFontSize(11)
            doc.setFont(undefined, 'bold')
            doc.text('TESTE DE FRENAGEM', 14, currentY)
            doc.autoTable({
                startY: currentY + 4,
                body: [
                    ['Ciclos Completos (8 Voltas)', `${ciclosCompletosFrenagem} Ciclo(s)`],
                    ['Voltas Extra (Pista Baixa)', `${voltasRestantesBaixa} Volta(s)`],
                    ['Voltas Extra (Pista Alta)', `${voltasRestantesAlta} Volta(s)`],
                    ['TOTAL GERAL DE VOLTAS', `${totalVoltasFrenagem} Volta(s)`],
                ],
                theme: 'grid',
                columnStyles: { 0: { fontStyle: 'bold', cellWidth: 100 } },
                margin: { left: 14, right: 14 },
            })
            currentY = doc.lastAutoTable.finalY + 14
        }

        // Secao R389
        if (Object.keys(resumoR389).length > 0) {
            doc.setTextColor(0, 0, 0)
            doc.setFontSize(11)
            doc.setFont(undefined, 'bold')
            doc.text('CICLOS R389', 14, currentY)
            doc.autoTable({
                startY: currentY + 4,
                head: [['PISTA / ATIVIDADE', 'TOTAL NO TURNO']],
                body: Object.keys(resumoR389).map((k) => [k, `${resumoR389[k]} vezes`]),
                headStyles: { fillColor: [168, 85, 247] },
                margin: { left: 14, right: 14 },
            })
            currentY = doc.lastAutoTable.finalY + 14
        }

        // Secao Desaceleracao
        if (Object.keys(resumoDesaceleracao).length > 0) {
            doc.setTextColor(0, 0, 0)
            doc.setFontSize(11)
            doc.setFont(undefined, 'bold')
            doc.text('DESACELERACAO 16 LAPS', 14, currentY)
            doc.autoTable({
                startY: currentY + 4,
                head: [['PISTA / ATIVIDADE', 'PASSAGENS']],
                body: Object.keys(resumoDesaceleracao).map((k) => [
                    k,
                    `${resumoDesaceleracao[k]} passagens`,
                ]),
                headStyles: { fillColor: [236, 72, 153] },
                margin: { left: 14, right: 14 },
            })
            currentY = doc.lastAutoTable.finalY + 14
        }

        // Secao Free-Rolling GPS (4 casas decimais, max 60 pontos para peso controlado)
        if (this.rastroGps && this.rastroGps.length >= 2) {
            let somaVel = 0
            let velMax = 0
            this.rastroGps.forEach((p) => {
                if (p.vel > velMax) velMax = p.vel
                somaVel += p.vel
            })
            const velMedia = somaVel / this.rastroGps.length

            if (currentY > 240) {
                doc.addPage()
                currentY = 20
            }

            doc.setTextColor(0, 0, 0)
            doc.setFontSize(11)
            doc.setFont(undefined, 'bold')
            doc.text('TELEMETRIA GPS FREE-ROLLING', 14, currentY)

            // Resumo GPS
            doc.autoTable({
                startY: currentY + 4,
                body: [
                    ['Distancia Total', `${(this.rodagemDistanciaMts / 1000).toFixed(3)} km`],
                    ['Velocidade Media GPS', `${velMedia.toFixed(1)} km/h`],
                    ['Velocidade Maxima GPS', `${velMax.toFixed(1)} km/h`],
                    ['Pontos Registrados', `${this.rastroGps.length}`],
                ],
                theme: 'grid',
                columnStyles: { 0: { fontStyle: 'bold', cellWidth: 90 } },
                margin: { left: 14, right: 14 },
            })
            currentY = doc.lastAutoTable.finalY + 6

            // Amostragem do rastro (max 60 pontos, 4 casas decimais)
            const total = this.rastroGps.length
            const step = Math.max(1, Math.floor(total / 60))
            const pontos = this.rastroGps.filter((_, i) => i % step === 0).slice(0, 60)

            doc.autoTable({
                startY: currentY,
                head: [['#', 'Latitude (4d)', 'Longitude (4d)', 'Vel. km/h']],
                body: pontos.map((p, i) => [
                    i * step + 1,
                    parseFloat(p.lat.toFixed(4)),
                    parseFloat(p.lng.toFixed(4)),
                    (p.vel || 0).toFixed(1),
                ]),
                headStyles: { fillColor: [15, 118, 110], textColor: [255, 255, 255] },
                styles: { fontSize: 7, cellPadding: 2 },
                columnStyles: {
                    0: { cellWidth: 12, halign: 'center' },
                    1: { cellWidth: 42, fontStyle: 'bold' },
                    2: { cellWidth: 42, fontStyle: 'bold' },
                    3: { cellWidth: 28, halign: 'right' },
                },
                margin: { left: 14, right: 14 },
            })
        }

        const veiculo =
            (typeof TurnoEngine !== 'undefined' && TurnoEngine.dados?.veiculo) || 'Carro'
        const veiculoSanitizado = veiculo.replace(/\s+/g, '_')
        const nomeOp = (this.operadorAtual || 'Analista').split(' ')[0]
        const fileName = `Resumo_${veiculoSanitizado}_${vin}_${nomeOp}_${Date.now()}.pdf`
        const textShare = `Resumo Geral do Turno - Veículo: ${veiculo} - VIN: ${vin} - Analista: ${this.operadorAtual || 'Analista'}`
        await this.salvarECompartilharPDF(doc, fileName, textShare, 'Resumo Geral do Turno')
    },

    handleMedia(e) {
        Array.from(e.target.files).forEach((file) => {
            if (file.type.startsWith('video/')) {
                this.videosFiles.push(file)
                this.renderGaleria()
            } else if (file.type.startsWith('image/')) {
                const reader = new FileReader()
                reader.onload = (ev) => {
                    this.comprimir(ev.target.result, 3840, 3840, (img) => {
                        this.fotos.push({ src: img, legenda: '' })
                        this.renderGaleria()
                    })
                }
                reader.readAsDataURL(file)
            }
        })
        e.target.value = ''
    },

    comprimir(base64, maxW, maxH, cb) {
        // Resolução reduzida para 1080px max — peso ideal para folha A4 e envio rápido abaixo de 2MB
        const limW = Math.min(maxW, 1080)
        const limH = Math.min(maxH, 1080)
        const img = new Image()
        img.src = base64
        img.onload = () => {
            const canvas = document.createElement('canvas')
            let w = img.width,
                h = img.height
            if (w > h) {
                if (w > limW) {
                    h *= limW / w
                    w = limW
                }
            } else {
                if (h > limH) {
                    w *= limH / h
                    h = limH
                }
            }
            canvas.width = w
            canvas.height = h
            const ctx = canvas.getContext('2d')
            ctx.imageSmoothingEnabled = true
            ctx.imageSmoothingQuality = 'high'
            ctx.drawImage(img, 0, 0, w, h)
            // Qualidade 0.68: balanço ideal entre nitidez técnica cristalina e tamanho compacto de arquivo (68%)
            cb(canvas.toDataURL('image/jpeg', 0.68))
        }
    },

    removerFoto(index) {
        this.fotos.splice(index, 1)
        this.renderGaleria()
    },
    removerVideo(index) {
        this.videosFiles.splice(index, 1)
        this.renderGaleria()
    },

    renderGaleria() {
        const g = document.getElementById('galeria-avaria')
        if (!g) return
        let html = ''
        this.fotos.forEach((f, i) => {
            html += `<div class="photo-wrapper" style="position:relative;margin-bottom:10px;">
                <button onclick="app.removerFoto(${i})" style="position:absolute;top:5px;right:5px;background:rgba(239,68,68,0.9);color:white;width:28px;height:28px;border-radius:50%;border:none;cursor:pointer;">×</button>
                <img src="${f.src}" style="width:100%;height:120px;object-fit:cover;border-radius:12px;display:block;">
                <input type="text" placeholder="Legenda..." value="${f.legenda}" oninput="app.fotos[${i}].legenda=this.value" style="width:100%;font-size:0.75rem;padding:8px;background:rgba(0,0,0,0.8);border:none;color:white;margin-top:5px;border-radius:6px;">
            </div>`
        })
        this.videosFiles.forEach((v, i) => {
            html += `<div class="photo-wrapper" style="position:relative;margin-bottom:10px;background:rgba(56,189,248,0.1);border:1px solid #38bdf8;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:1rem;">
                <button onclick="app.removerVideo(${i})" style="position:absolute;top:5px;right:5px;background:#0284c7;color:white;width:28px;height:28px;border-radius:50%;border:none;cursor:pointer;">×</button>
                <span class="material-icons" style="font-size:3rem;color:#38bdf8;">movie</span>
                <p style="font-size:0.7rem;color:#38bdf8;font-weight:bold;margin-top:10px;text-align:center;">${v.name}</p>
            </div>`
        })
        g.innerHTML = html
    },
    async obterClimaTatui() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2500);
            const res = await fetch("https://api.open-meteo.com/v1/forecast?latitude=-23.355&longitude=-47.857&current=temperature_2m,weather_code", { signal: controller.signal });
            clearTimeout(timeoutId);
            const data = await res.json();
            const temp = data.current.temperature_2m;
            const code = data.current.weather_code;
            const weatherMap = {
                0: "Ceu Limpo",
                1: "Principalmente Limpo",
                2: "Parcialmente Nublado",
                3: "Encoberto",
                45: "Nevoeiro", 48: "Nevoeiro",
                51: "Garoa Leve", 53: "Garoa Moderada", 55: "Garoa Densa",
                61: "Chuva Fraca", 63: "Chuva Moderada", 65: "Chuva Forte",
                80: "Pancadas de Chuva Leves", 81: "Pancadas de Chuva Moderadas", 82: "Pancadas de Chuva Fortes",
                95: "Trovoada", 96: "Trovoada com Granizo", 99: "Trovoada com Granizo Forte"
            };
            this._tempoClima = {
                temp: temp,
                condicao: weatherMap[code] || "Nublado"
            };
        } catch (e) {
            console.warn("Erro ao obter clima de Tatui:", e);
            if (!this._tempoClima) {
                this._tempoClima = { temp: "N/A", condicao: "N/A" };
            }
        }
    },

    async gerarECompartilharLaudo(dadosRecuperados = null) {
        // — Dados brutos —
        const getVal = (recVal, domId, fallback) => {
            if (recVal && recVal !== '-') return recVal
            const dom = document.getElementById(domId)
            if (dom && dom.innerText && dom.innerText.trim() !== '-') return dom.innerText.trim()
            return fallback
        }

        const id = dadosRecuperados?.vin || this.vinGlobal || 'NÃO INFORMADO'
        const vin = getVal(dadosRecuperados?.vin, 'laudo-ctx-vin', id)
        const analista = getVal(
            dadosRecuperados?.operador,
            'laudo-ctx-operador',
            this.operadorAtual || 'N/A'
        )
        const projeto = getVal(dadosRecuperados?.projeto, 'laudo-ctx-projeto', 'N/A')
        const tipoTeste = getVal(dadosRecuperados?.tipoTeste, 'laudo-ctx-teste', 'N/A')
        const veiculo = getVal(
            dadosRecuperados?.veiculo,
            'laudo-ctx-veiculo',
            (typeof TurnoEngine !== 'undefined' && TurnoEngine.dados?.veiculo) || 'N/A'
        )
        const parecer =
            dadosRecuperados?.parecerFinal ||
            document.getElementById('i-obs')?.value ||
            'Sem observações.'

        const obsEl = document.getElementById('i-obs')
        const tipoIssue = dadosRecuperados?.titulo || obsEl?.dataset.tituloIA || 'Ocorrência Manual'
        const categoria = dadosRecuperados?.categoria || obsEl?.dataset.categoriaIA || 'Geral'
        const severidade = dadosRecuperados?.severidade || obsEl?.dataset.severidadeIA || 'N/A'
        const causaRaiz = dadosRecuperados?.causaRaiz || obsEl?.dataset.causaRaizIA || ''

        const dataAtual = dadosRecuperados?.criadoEm
            ? new Date(dadosRecuperados.criadoEm.seconds * 1000).toLocaleString('pt-BR')
            : new Date().toLocaleString('pt-BR')

        // Busca o clima da regiao em tempo real
        await this.obterClimaTatui()
        const condicaoClima = this._tempoClima?.condicao || "N/A"
        const tempClima = this._tempoClima?.temp || "N/A"

        // Cache dos dados para gerar o PDF se o usuário desejar
        this._ultimoLaudoInfo = {
            vin,
            analista,
            projeto,
            tipoTeste,
            veiculo,
            parecer,
            tipoIssue,
            dataAtual,
            categoria,
            severidade,
            causaRaiz,
            condicaoClima,
            tempClima,
            fotos: JSON.parse(JSON.stringify(this.fotos || dadosRecuperados?.fotos || []))
        }

        // Salvar no Firestore se for emissão imediata e não recuperado
        if (!dadosRecuperados) {
            const r = {
                titulo: tipoIssue,
                categoria: categoria,
                severidade: severidade,
                causaRaiz: causaRaiz,
                parecerFinal: parecer,
            }
            const totalMidias = this.fotos ? this.fotos.length : 0
            try {
                if (typeof salvarIssueNoFirestore === 'function') {
                    await salvarIssueNoFirestore(r, parecer, {
                        total: totalMidias,
                        imagens: totalMidias,
                        videos: 0,
                    })
                }
            } catch (err) {
                console.warn('[Laudo] Erro ao salvar no Firestore:', err)
            }
        }

        // Se estava editando um laudo em aberto, remove-o da lista de pendentes
        if (
            typeof LaudoPendente !== 'undefined' &&
            LaudoPendente.indexEdicao !== null &&
            LaudoPendente.indexEdicao !== undefined
        ) {
            const d = typeof TurnoEngine !== 'undefined' ? TurnoEngine.dados : null
            if (d && d.laudosPendentes) {
                d.laudosPendentes.splice(LaudoPendente.indexEdicao, 1)
                LaudoPendente.indexEdicao = null
                // Salva no localStorage e RTDB
                TurnoEngine._cache = d
                localStorage.setItem(TurnoEngine._chave(), JSON.stringify(d))
                try {
                    firebase.database().ref('vev_turnos_ativos').child(d.uid).update({
                        laudosPendentes: d.laudosPendentes,
                    })
                } catch (e) {
                    console.warn('[LaudoPendente] Erro ao sincronizar RTDB:', e)
                }
                LaudoPendente.atualizarContagemHome()
            }
        }

        // Monta a mensagem de texto para o Teams (Sem emojis, super formal)
        let msg = `LAUDO TECNICO DE OCORRENCIA (VEV)\n\n`
        msg += `DADOS DO VEICULO\n`
        msg += `- Veiculo: ${veiculo}\n`
        msg += `- VIN: ${vin}\n`
        msg += `- Projeto: ${projeto}\n`
        msg += `- Tipo de Teste: ${tipoTeste}\n\n`
        msg += `INFORMACOES DE CAMPO\n`
        msg += `- Analista: ${analista}\n`
        msg += `- Data/Hora: ${dataAtual}\n`
        msg += `- Condicoes Climaticas: ${condicaoClima}, ${tempClima}C\n\n`
        msg += `DETALHES DA OCORRENCIA\n`
        msg += `- Titulo: ${tipoIssue}\n`
        msg += `- Categoria: ${categoria}\n`
        msg += `- Severidade: ${severidade}\n`
        if (causaRaiz) {
            msg += `- Causa Raiz: ${causaRaiz}\n\n`
        } else {
            msg += `\n`
        }
        msg += `PARECER TECNICO\n`
        msg += `${parecer}`

        this._ultimoLaudoInfo.mensagemFormatada = msg

        // Copia automaticamente para o clipboard
        this.copiarTexto(msg, 'Relatório copiado para o Teams!')

        // Exibe no textarea do modal de sucesso
        const taSucesso = document.getElementById('laudo-copiar-texto')
        if (taSucesso) {
            taSucesso.value = msg
        }

        // Exibe o modal de sucesso
        if (typeof appUI !== 'undefined') {
            appUI.abrirModal('modal-laudo-sucesso')
        } else {
            const el = document.getElementById('modal-laudo-sucesso')
            if (el) el.style.display = 'flex'
        }
    },

    // Nova função para re-copiar o texto da tela de sucesso
    recopiarTextoLaudo() {
        const text =
            this._ultimoLaudoInfo?.mensagemFormatada ||
            document.getElementById('laudo-copiar-texto')?.value
        if (text) {
            this.copiarTexto(text, 'Mensagem copiada para o Teams!')
        }
    },

    // Nova função para disparar a geração de PDF a partir da tela de sucesso
    gerarPDFLaudoSucesso() {
        if (this._ultimoLaudoInfo) {
            this.baixarLaudoPDFOriginal(this._ultimoLaudoInfo)
        } else {
            alert('Erro: Dados do laudo não disponíveis.')
        }
    },

    // Nova função para fechar a tela de sucesso e limpar formulário
    fecharModalSucessoLaudo() {
        if (typeof appUI !== 'undefined') {
            appUI.fecharModal('modal-laudo-sucesso')
        } else {
            const el = document.getElementById('modal-laudo-sucesso')
            if (el) el.style.display = 'none'
        }
        if (typeof fecharModalLaudo === 'function') {
            fecharModalLaudo()
        }
        if (typeof this.resetarFormularioLaudo === 'function') {
            this.resetarFormularioLaudo()
        }
    },

    // PDF original isolado e parametrizado
    async baixarLaudoPDFOriginal(info) {
        if (!info) info = this._ultimoLaudoInfo
        if (!info) return alert('Nenhum relatório emitido recentemente para gerar PDF.')

        const { jsPDF } = window.jspdf
        const doc = new jsPDF({ compress: true })
        const pageW = 210
        const pageH = 297
        const CINZA = [45, 52, 63] // cinza-grafite corporativo
        const CINZA2 = [30, 41, 59] // grafite escuro
        const BRANCO = [255, 255, 255]
        const TEXTO = [30, 30, 30]
        const LABEL = [90, 100, 115]

        const { vin, analista, projeto, tipoTeste, veiculo, parecer, tipoIssue, dataAtual, fotos, condicaoClima = "N/A", tempClima = "N/A" } =
            info

        // ── CABEÇALHO LIMPO ─────────────────────────────────────
        // Barra topo cinza-grafite corporativa
        doc.setFillColor(...CINZA2)
        doc.rect(0, 0, pageW, 18, 'F')

        // Linha accent lateral esquerda (Ford Blue)
        doc.setFillColor(0, 72, 153)
        doc.rect(0, 0, 4, 18, 'F')

        // Título do documento
        doc.setTextColor(...BRANCO)
        doc.setFontSize(10)
        doc.setFont(undefined, 'bold')
        doc.text('LAUDO TÉCNICO DE OCORRÊNCIA', 12, 11)

        // Metadado direita
        doc.setFontSize(7)
        doc.setFont(undefined, 'normal')
        doc.setTextColor(180, 190, 200)
        doc.text(`Ford VEV  |  Emitido: ${dataAtual}`, pageW - 10, 11, { align: 'right' })

        // Linha separadora sutil
        doc.setDrawColor(60, 72, 90)
        doc.setLineWidth(0.4)
        doc.line(0, 18, pageW, 18)

        let y = 26

        // ── BLOCO: DADOS DO TURNO ────────────────────────────────
        // Cabeçalho da seção
        doc.setFillColor(50, 60, 75)
        doc.roundedRect(10, y, pageW - 20, 7, 1, 1, 'F')
        doc.setTextColor(...BRANCO)
        doc.setFontSize(7.5)
        doc.setFont(undefined, 'bold')
        doc.text('DADOS DO TURNO', 14, y + 4.8)
        y += 10

        doc.autoTable({
            startY: y,
            body: [
                ['Veículo', veiculo, 'VIN', vin],
                ['Analista', analista, 'Projeto', projeto],
                ['Tipo Teste', tipoTeste, 'Data / Hora', dataAtual],
                ['Tipo Issue', tipoIssue, 'Clima / Temp.', `${condicaoClima} (${tempClima}°C)`],
            ],
            theme: 'plain',
            styles: {
                fontSize: 8,
                cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
                lineColor: [220, 225, 232],
                lineWidth: 0.25,
            },
            columnStyles: {
                0: {
                    fontStyle: 'bold',
                    textColor: LABEL,
                    fillColor: [245, 247, 250],
                    cellWidth: 28,
                },
                2: {
                    fontStyle: 'bold',
                    textColor: LABEL,
                    fillColor: [245, 247, 250],
                    cellWidth: 28,
                },
                1: { textColor: TEXTO },
                3: { textColor: TEXTO },
            },
            alternateRowStyles: { fillColor: [250, 251, 253] },
            margin: { left: 10, right: 10 },
        })

        y = doc.lastAutoTable.finalY + 12

        // ── BLOCO: PARECER TÉCNICO ───────────────────────────────
        doc.setFillColor(50, 60, 75)
        doc.roundedRect(10, y, pageW - 20, 7, 1, 1, 'F')
        doc.setTextColor(...BRANCO)
        doc.setFontSize(7.5)
        doc.setFont(undefined, 'bold')
        doc.text('PARECER TÉCNICO', 14, y + 4.8)
        y += 10

        const parecerLines = doc.splitTextToSize(parecer, pageW - 30)
        const parecerH = Math.max(20, parecerLines.length * 5 + 8)

        doc.setDrawColor(220, 225, 232)
        doc.setFillColor(250, 251, 253)
        doc.setLineWidth(0.25)
        doc.roundedRect(10, y, pageW - 20, parecerH, 2, 2, 'FD')

        doc.setTextColor(...TEXTO)
        doc.setFontSize(8.5)
        doc.setFont(undefined, 'normal')
        doc.text(parecerLines, 14, y + 6)
        y += parecerH + 14

        // ── BLOCO: EVIDÊNCIAS FOTOGRÁFICAS ───────────────────────
        if (fotos && fotos.length > 0) {
            doc.setFillColor(50, 60, 75)
            doc.roundedRect(10, y, pageW - 20, 7, 1, 1, 'F')
            doc.setTextColor(...BRANCO)
            doc.setFontSize(7.5)
            doc.setFont(undefined, 'bold')
            doc.text('EVIDÊNCIAS FOTOGRÁFICAS', 14, y + 4.8)
            y += 12

            for (let i = 0; i < fotos.length; i++) {
                const f = fotos[i]
                if (y > 220) {
                    doc.addPage()
                    y = 20
                }

                try {
                    const imgProps = doc.getImageProperties(f.src)
                    const ratio = imgProps.height / imgProps.width
                    const imgW = 85
                    const imgH = imgW * ratio

                    doc.setDrawColor(200, 205, 215)
                    doc.setLineWidth(0.3)
                    doc.roundedRect(13, y - 1, imgW + 2, imgH + 2, 1, 1)
                    doc.addImage(f.src, 'JPEG', 14, y, imgW, imgH, undefined, 'MEDIUM')

                    doc.setTextColor(...LABEL)
                    doc.setFontSize(7.5)
                    doc.setFont(undefined, 'italic')
                    doc.text(`Fig. ${i + 1}: ${f.legenda || 'Sem legenda'}`, 14, y + imgH + 6)
                    y += imgH + 14
                } catch (imgErr) {
                    console.warn('[PDF Imagem] Erro ao carregar/adicionar imagem no PDF:', imgErr)
                }
            }
        }

        // ── RODAPÉ em todas as páginas ───────────────────────────
        const totalPages = doc.getNumberOfPages()
        for (let p = 1; p <= totalPages; p++) {
            doc.setPage(p)
            doc.setDrawColor(200, 205, 215)
            doc.setLineWidth(0.3)
            doc.line(10, pageH - 16, pageW - 10, pageH - 16)

            doc.setTextColor(...LABEL)
            doc.setFontSize(6.5)
            doc.setFont(undefined, 'normal')
            doc.text('Ford Motor Company — Documento Confidencial — VEV', 10, pageH - 9)
            doc.text(`Pág. ${p} / ${totalPages}`, pageW - 10, pageH - 9, { align: 'right' })
        }

        const veiculoSanitizado = (veiculo || 'Carro')
            .replace(/[^a-zA-Z0-9]/g, '_')
            .replace(/_+/g, '_')
        const vinSanitizado = (vin || 'NAO_INFORMADO')
            .replace(/[^a-zA-Z0-9]/g, '_')
            .replace(/_+/g, '_')
        const analistaSanitizado = (analista || 'Analista')
            .split(' ')[0]
            .replace(/[^a-zA-Z0-9]/g, '_')
            .replace(/_+/g, '_')
        const dateStr = new Date().toISOString().slice(0, 10)
        const fileName = `Laudo_Ford_${vinSanitizado}_${analistaSanitizado}_${veiculoSanitizado}_${dateStr}.pdf`
        const textShare = `Laudo Técnico de Ocorrência - Veículo: ${veiculo} - VIN: ${vin} - Analista: ${analista}`

        await this.salvarECompartilharPDF(doc, fileName, textShare, 'Laudo Técnico de Ocorrência')
    },

    // Helper — carrega imagem como base64
    _loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => {
                const canvas = document.createElement('canvas')
                canvas.width = img.width
                canvas.height = img.height
                canvas.getContext('2d').drawImage(img, 0, 0)
                resolve(canvas.toDataURL('image/png'))
            }
            img.onerror = reject
            img.src = src
        })
    },

    async salvarECompartilharPDF(doc, fileName, textShare, titleShare = 'Relatório Ford') {
        try {
            doc.save(fileName)
        } catch (saveErr) {
            console.error('Erro ao salvar PDF localmente:', saveErr)
        }

        if (navigator.share && navigator.canShare) {
            try {
                const blob = doc.output('blob')
                const file = new File([blob], fileName, { type: 'application/pdf' })
                if (navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: titleShare,
                        text: textShare,
                        // url removido para evitar que o navegador anexe automaticamente o link da aplicação
                    })
                    console.log('[Compartilhar] Compartilhado via Web Share API.')
                    return
                }
            } catch (shareErr) {
                if (shareErr.name !== 'AbortError') {
                    console.warn('[Compartilhar] Falha no compartilhamento nativo:', shareErr)
                } else {
                    return // Usuário cancelou — não fazer mais nada
                }
            }
        }

        // Fallback: download via link <a> (sem abrir nova aba, evita reload do PWA)
        try {
            const blob = doc.output('blob')
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = fileName
            a.style.display = 'none'
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            setTimeout(() => URL.revokeObjectURL(url), 10000)
            console.log('[Compartilhar] Download iniciado.')
        } catch (dlErr) {
            console.error('[Compartilhar] Erro ao baixar PDF:', dlErr)
            try {
                doc.save(fileName)
            } catch (e) {
                /* ignore */
            }
        }
    },

    // ── FORD FREE-ROLLING ANALYTICS — PDF Executivo GPS ────────────
    // Funcao dedicada para relatorio de performance de viagem GPS.
    // Coordenadas com 4 casas decimais | Max 100 pontos de rastro.
    // Peso estimado: abaixo de 150KB sem fotos.
    async gerarRelatorioPerformanceGPS(viagem) {
        // Aceita objeto de viagem do FreeRollingPersistence ou usa sessao atual
        const v = viagem || {
            userID: firebase.auth().currentUser?.uid || 'N/A',
            timestamp: new Date().toISOString(),
            copilotName: 'Dark Horse',
            avgSpeed: (() => {
                if (!this.rastroGps || !this.rastroGps.length) return 0
                const s = this.rastroGps.reduce((acc, p) => acc + (p.vel || 0), 0)
                return parseFloat((s / this.rastroGps.length).toFixed(1))
            })(),
            distance: parseFloat((this.rodagemDistanciaMts / 1000).toFixed(3)),
            maxSpeed: (() => {
                if (!this.rastroGps || !this.rastroGps.length) return 0
                return parseFloat(Math.max(...this.rastroGps.map((p) => p.vel || 0)).toFixed(1))
            })(),
            routeCoords: this.rastroGps || [],
            operador: this.operadorAtual || 'N/A',
            veiculo: (typeof TurnoEngine !== 'undefined' && TurnoEngine.dados?.veiculo) || 'Carro',
            vin: this.vinGlobal || 'N/A',
        }

        if (!v.routeCoords || v.routeCoords.length < 2) {
            return alert(
                'Nenhum dado GPS disponivel. Ative o Free-Rolling Analytics e percorra um trajeto.'
            )
        }

        const { jsPDF } = window.jspdf
        const doc = new jsPDF({ compress: true })
        const pageW = 210
        const pageH = 297

        const dataFmt = new Date(v.timestamp).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })

        // ── CABECALHO EXECUTIVO ──────────────────────────────────────
        doc.setFillColor(15, 23, 42)
        doc.rect(0, 0, pageW, 46, 'F')
        doc.setFillColor(0, 72, 153)
        doc.rect(0, 0, 5, 46, 'F')

        doc.setTextColor(255, 255, 255)
        doc.setFontSize(14)
        doc.setFont(undefined, 'bold')
        doc.text('FORD FREE-ROLLING ANALYTICS', 14, 16)

        doc.setFontSize(8)
        doc.setFont(undefined, 'normal')
        doc.setTextColor(160, 180, 210)
        doc.text('Relatório de Performance GPS — Documento Técnico Corporativo', 14, 24)

        doc.setTextColor(100, 160, 240)
        doc.setFontSize(7.5)
        doc.text(
            `Analista: ${v.operador}   |   Veículo/VIN: ${v.veiculo}   |   Data: ${dataFmt}`,
            14,
            33
        )
        doc.text(
            `Copiloto: ${v.copilotName}   |   Gerado em: ${new Date().toLocaleString('pt-BR')}`,
            14,
            40
        )

        // Linha separadora
        doc.setDrawColor(0, 72, 153)
        doc.setLineWidth(0.5)
        doc.line(0, 46, pageW, 46)

        let y = 54

        // ── METRICAS PRINCIPAIS ──────────────────────────────────────
        doc.setFillColor(240, 245, 255)
        doc.roundedRect(10, y, pageW - 20, 7, 1, 1, 'F')
        doc.setTextColor(0, 48, 120)
        doc.setFontSize(8)
        doc.setFont(undefined, 'bold')
        doc.text('METRICAS DA SESSAO', 14, y + 5)
        y += 10

        doc.autoTable({
            startY: y,
            body: [
                ['Distancia Total', `${v.distance} km`, 'Velocidade Media', `${v.avgSpeed} km/h`],
                [
                    'Velocidade Maxima',
                    `${v.maxSpeed} km/h`,
                    'Pontos GPS',
                    `${v.routeCoords.length}`,
                ],
            ],
            theme: 'plain',
            styles: {
                fontSize: 9,
                cellPadding: { top: 4, right: 6, bottom: 4, left: 6 },
                lineColor: [210, 220, 235],
                lineWidth: 0.25,
            },
            columnStyles: {
                0: {
                    fontStyle: 'bold',
                    textColor: [60, 80, 110],
                    fillColor: [245, 248, 255],
                    cellWidth: 50,
                },
                1: { fontStyle: 'bold', textColor: [0, 48, 153], cellWidth: 40 },
                2: {
                    fontStyle: 'bold',
                    textColor: [60, 80, 110],
                    fillColor: [245, 248, 255],
                    cellWidth: 50,
                },
                3: { fontStyle: 'bold', textColor: [0, 48, 153], cellWidth: 40 },
            },
            margin: { left: 10, right: 10 },
        })

        y = doc.lastAutoTable.finalY + 14

        // ── GRÁFICO DE VELOCIDADE × TEMPO (Chart.js canvas → base64) ────────────
        const graficoBase64 = this._capturarGraficoVelocidade()
        if (graficoBase64) {
            doc.setFillColor(240, 245, 255)
            doc.roundedRect(10, y, pageW - 20, 7, 1, 1, 'F')
            doc.setTextColor(0, 48, 120)
            doc.setFontSize(8)
            doc.setFont(undefined, 'bold')
            doc.text('GRÁFICO — VELOCIDADE × TEMPO', 14, y + 5)
            y += 10
            doc.addImage(graficoBase64, 'PNG', 10, y, pageW - 20, 75)
            y += 80
        } else {
            doc.setFontSize(8)
            doc.setTextColor(150, 160, 180)
            doc.text('Gráfico não disponível — ative o GPS durante a sessão.', 14, y)
            y += 12
        }

        // ── RODAPE em todas as paginas ────────────────────────────────────────
        const totalPages = doc.getNumberOfPages()
        for (let pg = 1; pg <= totalPages; pg++) {
            doc.setPage(pg)
            doc.setDrawColor(200, 210, 230)
            doc.setLineWidth(0.3)
            doc.line(10, pageH - 16, pageW - 10, pageH - 16)
            doc.setTextColor(130, 150, 180)
            doc.setFontSize(6.5)
            doc.setFont(undefined, 'normal')
            doc.text(
                'Ford Motor Company — Documento Técnico Confidencial — VEV Campo de Provas Tatuí',
                10,
                pageH - 9
            )
            doc.text(`Pag. ${pg} / ${totalPages}`, pageW - 10, pageH - 9, { align: 'right' })
        }

        const tsFile = new Date(v.timestamp).toISOString().slice(0, 10)
        const modeloCarro =
            v.veiculo && v.veiculo !== v.vin
                ? v.veiculo
                : (typeof TurnoEngine !== 'undefined' && TurnoEngine.dados?.veiculo) || 'Carro'
        const vinCarro =
            v.vin || (v.veiculo && v.veiculo.length > 5 ? v.veiculo : this.vinGlobal || 'N/A')
        const veiculoSanitizado = modeloCarro.replace(/\s+/g, '_')
        const fileName = `FRA_Performance_${veiculoSanitizado}_${vinCarro}_${v.operador.split(' ')[0]}_${tsFile}.pdf`
        const textShare = `Performance GPS - Veículo: ${modeloCarro} - VIN: ${vinCarro} - Analista: ${v.operador}`
        await this.salvarECompartilharPDF(doc, fileName, textShare, 'Performance GPS')
    },

    // ── ALTERADO: lê campos enc- + salva no Firestore ──────────
    async finalizarTurnoIntegrado() {
        const turno = typeof TurnoEngine !== 'undefined' ? TurnoEngine.dados : null

        // Lê dos campos visíveis do modal Encerrar Turno (enc-)
        const kmFinalRaw =
            document.getElementById('enc-km-final')?.value ||
            document.getElementById('t-km')?.value ||
            '0'
        const kmFinal = parseFloat(kmFinalRaw.replace(',', '.')) || 0

        const litrosRaw =
            document.getElementById('enc-litros')?.value ||
            document.getElementById('t-litros')?.value ||
            '0'
        const litros = parseFloat(litrosRaw.replace(',', '.')) || 0

        const postoEl = document.getElementById('enc-posto')
        const posto =
            postoEl?.options[postoEl.selectedIndex]?.text ||
            document.getElementById('t-posto')?.value ||
            'N/A'
        const trip =
            document.getElementById('enc-trip-display')?.innerText ||
            document.getElementById('t-trip')?.value ||
            '0'

        const veiculo =
            turno?.veiculo || document.getElementById('t-veiculo')?.value || 'Não informado'
        const turnoNum = document.getElementById('t-turno')?.value || '1º Turno'
        const vin = this.vinGlobal || 'NÃO INFORMADO'

        const saldoRaw = document.getElementById('t-saldo')?.value || '0'
        const saldo = parseFloat(saldoRaw.replace(',', '.')) || 0

        const dataHoje = new Date().toLocaleDateString('pt-BR').substring(0, 5)

        // 1. Salvar no Firestore
        await this.salvarTurnoNoFirestore({ kmFinal, litros, posto })

        // 2. Copiar texto para WhatsApp
        const texto = `*FECHAMENTO DE TURNO - VEV*\n*Operador:* ${this.operadorAtual}\n*Data:* ${dataHoje} (${turnoNum})\n\n*Dados do Veículo:*\n*Modelo:* ${veiculo}\n*VIN:* ${vin}\n\n*Módulos do Turno:*\n*Ciclos R389:* ${this.checkins.length}\n*Laps Frenagem:* ${this.ciclosFrenagem.length}\n*Laps Desacel.:* ${this.checkinsDesaceleracao.length}\n\n*Abastecimento:*\n*Posto:* ${posto}\n*Odômetro:* ${kmFinal} km\n*Trip:* ${trip} km\n*Litragem:* ${litros} L\n*Saldo:* R$ ${saldo}`
        this.copiarTexto(
            texto,
            'Texto copiado! Cole no grupo do WhatsApp.\n\nDados também salvos no dashboard.'
        )
    },

    // ── NOVO: salvar turno completo no Firestore ────────────────
    async salvarTurnoNoFirestore(dadosEnc = {}) {
        try {
            const user = firebase.auth().currentUser
            if (!user) {
                console.warn('[Firestore] Usuário não autenticado')
                return
            }

            const turno = typeof TurnoEngine !== 'undefined' ? TurnoEngine.dados : null
            const kmIniRaw = String(turno?.kmInicial || 0).replace(',', '.')
            const kmIni = parseFloat(kmIniRaw)
            const kmFinalRaw = String(dadosEnc.kmFinal || 0).replace(',', '.')
            const kmFinal = parseFloat(kmFinalRaw)
            const litrosRaw = String(dadosEnc.litros || 0).replace(',', '.')
            const litros = parseFloat(litrosRaw)
            const trip = kmFinal - kmIni

            const laudos = JSON.parse(localStorage.getItem('vev_laudos') || '[]')

            const docData = {
                // Identificação
                uid: user.uid,
                email: user.email || '',
                operador: this.operadorAtual || turno?.operador || '',
                cargo:
                    (typeof RoleEngine !== 'undefined' ? RoleEngine.perfil?.cargo : '') ||
                    'Analista',
                data: new Date().toLocaleDateString('pt-BR'),
                diaSemana: new Date().toLocaleDateString('pt-BR', { weekday: 'long' }),
                mes: new Date().toLocaleDateString('pt-BR', { month: 'long' }),
                semana: this._getSemanaAno(),
                horaInicio: turno?.horaInicio || '',
                horaFim: new Date().toLocaleTimeString('pt-BR'),
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),

                // Veículo
                veiculo: turno?.veiculo || '',
                vin: turno?.vin || this.vinGlobal || '',
                tipoTeste: turno?.tipoTeste || '',

                // KM & Consumo
                kmInicial: kmIni,
                kmFinal: kmFinal,
                tripKm: parseFloat(trip.toFixed(1)),
                litros: litros,
                consumoMedio: trip > 0 && litros > 0 ? parseFloat((trip / litros).toFixed(2)) : 0,
                posto: dadosEnc.posto || '',

                // Módulos operacionais
                ciclosR389: this.checkins.length,
                lapsFrenagem: this.ciclosFrenagem.length,
                lapsDesaceleracao: this.checkinsDesaceleracao.length,
                kmRodagem: parseFloat((this.rodagemDistanciaMts / 1000).toFixed(2)),

                // Ocorrências / laudos
                totalOcorrencias: laudos.length,
                ocorrenciasCritico: laudos.filter((l) => l.severidade === 'critico').length,
                ocorrenciasModerat: laudos.filter((l) => l.severidade === 'moderado').length,
                ocorrenciasLeve: laudos.filter((l) => l.severidade === 'leve').length,
                laudos: laudos.map((l) => ({
                    descricao: l.obs || '',
                    severidade: l.severidade || '',
                    categoria: l.categoria || '',
                    hora: l.hora || '',
                    veiculo: turno?.veiculo || '',
                    vin: turno?.vin || '',
                })),
            }

            const docRef = await firebase
                .firestore()
                .collection('vev_turnos_encerrados')
                .add(docData)
            console.log('[Firestore] Turno salvo no dashboard')

            // Salvar também no Realtime Database (RTDB)
            try {
                const rtdbPayload = {
                    ...docData,
                    timestamp: firebase.database.ServerValue.TIMESTAMP,
                }
                firebase.database().ref('vev_turnos_encerrados').child(docRef.id).set(rtdbPayload)
                console.log('[RTDB] Turno salvo com sucesso no Realtime Database.')
            } catch (rtdbErr) {
                console.error('[RTDB] Erro ao salvar turno no Realtime Database:', rtdbErr)
            }
        } catch (e) {
            console.error('[Firestore] Erro ao salvar turno:', e)
        }
    },

    _getSemanaAno() {
        const now = new Date()
        const start = new Date(now.getFullYear(), 0, 1)
        return Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7)
    },
}

window.onload = () => app.init()

// ====================================================
// 3. COPILOTO KX E ACELERÔMETRO (FUSÃO DE SENSORES)
// ====================================================
const COORD_ALTA = { lat: -23.392783132651925, lng: -47.91720937962347, raio: 85 }
const COORD_BAIXA = { lat: -23.398088084486734, lng: -47.92362656463522, raio: 40 }

const MAPA_PISTAS = {
    Alta: COORD_ALTA,
    'Alta (100 a 20km/h)': COORD_ALTA,
    'Alta (100 a 0km/h)': COORD_ALTA,
    'P. de Baixa': COORD_BAIXA,
    'Pista de Alta': COORD_ALTA,
    'Pista Baixa - Volta 1': COORD_BAIXA,
    'Pista Baixa - Volta 2': COORD_BAIXA,
    'Pista Baixa - Volta 3': COORD_BAIXA,
    'Pista Baixa - Volta 4': COORD_BAIXA,
    'Pista Alta - Volta 1': COORD_ALTA,
    'Pista Alta - Volta 2': COORD_ALTA,
    'Pista Alta - Volta 3': COORD_ALTA,
    'Pista Alta - Volta 4': COORD_ALTA,
    'Labirinto: 1ª volta + Mata-burro': { lat: -23.389897, lng: -47.90375, raio: 30 },
    'Power Hop Hill': { lat: -23.389408, lng: -47.920772, raio: 30 },
    'Lombadas: 1ª passagem': { lat: -23.395171, lng: -47.920321, raio: 30 },
    'Pistas 1-2': { lat: -23.397242, lng: -47.924486, raio: 40 },
    'Pista 4-3': { lat: -23.395709, lng: -47.923097, raio: 40 },
    Slalom: { lat: -23.39748, lng: -47.924208, raio: 40 },
    'Pistas 7-8': { lat: -23.397314, lng: -47.924327, raio: 40 },
    'Pistas 2-1': { lat: -23.39649, lng: -47.923867, raio: 40 },
    'Pista 5-8': { lat: -23.397269, lng: -47.924365, raio: 40 },
    'Pistas 9-10': { lat: -23.397469, lng: -47.924218, raio: 40 },
    'Pista de Alta + bolacha': COORD_ALTA,
    'Pista de Baixa + bolacha': COORD_BAIXA,
    'Enrola Camisa': { lat: 0, lng: 0, raio: 40 },
}

let rastreadorGpsID = null
let bloqueioTempo = false
let mapaTelemetria = null
let markerCarro = null
let circulosPistas = []
let cadeadoTela = null
let memoriaRodagem = {
    ativa: false,
    ultimaPosicao: null,
    ultimoTempo: 0,
    velocidadeAnterior: 0,
    ultimoTempoTrace: 0,
}
let ultimoEventoG = 0

async function manterTelaLigada() {
    if ('wakeLock' in navigator) {
        try {
            if (cadeadoTela !== null) return
            cadeadoTela = await navigator.wakeLock.request('screen')
            cadeadoTela.addEventListener('release', () => {
                cadeadoTela = null
            })
        } catch (err) {}
    }
}
function liberarTela() {
    if (cadeadoTela !== null) {
        cadeadoTela.release().then(() => {
            cadeadoTela = null
        })
    }
}
document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && rastreadorGpsID !== null) await manterTelaLigada()
})

function falar(mensagem) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
        const u = new SpeechSynthesisUtterance(mensagem)
        u.lang = 'pt-BR'
        u.rate = 1.15
        window.speechSynthesis.speak(u)
    }
}
function calcularDistanciaMetros(lat1, lon1, lat2, lon2) {
    const R = 6371e3
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lon2 - lon1) * Math.PI) / 180
    const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function abrirMapaAoVivo() {
    const container = document.getElementById('container-mapa')
    container.style.display = 'block'
    // PERF-2: Lazy load Leaflet - só carrega quando o mapa for aberto
    if (typeof L === 'undefined' || !L.map) {
        if (window.LeafletLoader) {
            LeafletLoader.carregar(() => abrirMapaAoVivo())
        } else {
            // Fallback: carregar Leaflet diretamente
            const s = document.createElement('script')
            s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
            s.onload = () => abrirMapaAoVivo()
            document.head.appendChild(s)
            if (!document.getElementById('leaflet-css-lazy')) {
                const l = document.createElement('link')
                l.id = 'leaflet-css-lazy'
                l.rel = 'stylesheet'
                l.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
                document.head.appendChild(l)
            }
        }
        return
    }
    if (!mapaTelemetria) {
        mapaTelemetria = L.map('mapa-gps').setView([-23.395171, -47.920321], 15)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap',
        }).addTo(mapaTelemetria)
        Object.keys(MAPA_PISTAS).forEach((nome) => {
            const p = MAPA_PISTAS[nome]
            if (p.lat !== 0) {
                const jaDesenhado = circulosPistas.some(
                    (c) => c.getLatLng().lat === p.lat && c.getLatLng().lng === p.lng
                )
                if (!jaDesenhado) {
                    const c = L.circle([p.lat, p.lng], {
                        color: '#38bdf8',
                        fillColor: '#38bdf8',
                        fillOpacity: 0.3,
                        radius: p.raio,
                    })
                        .addTo(mapaTelemetria)
                        .bindPopup(nome)
                    circulosPistas.push(c)
                }
            }
        })
    }
    setTimeout(() => mapaTelemetria.invalidateSize(), 400)
}

function atualizarPosicaoNoMapa(lat, lng) {
    if (!mapaTelemetria) return
    if (!markerCarro) {
        markerCarro = L.circleMarker([lat, lng], {
            color: '#ef4444',
            fillColor: '#ef4444',
            fillOpacity: 1,
            radius: 6,
        }).addTo(mapaTelemetria)
        mapaTelemetria.setView([lat, lng], 16)
    } else {
        markerCarro.setLatLng([lat, lng])
    }
}

// [REMOVIDO v2.0] analisarForcaG — acelerômetro desativado por diretriz de engenharia.
// O sistema opera exclusivamente via GPS de alta precisão (Ford Free-Rolling Analytics).

let copilotoAtivoModo = null
let copilotoAtivoSuffix = null

function toggleCopilotoModo(modo, idSuffix) {
    if (rastreadorGpsID !== null) {
        const prevSuffix = copilotoAtivoSuffix
        pararCopilotoKX()
        if (prevSuffix) {
            const btn = document.getElementById(`btn-kx-${prevSuffix}`)
            const txt = document.getElementById(`txt-kx-${prevSuffix}`)
            if (btn) {
                btn.classList.remove('ativo')
                btn.innerHTML = '<span class="material-icons">play_arrow</span> Iniciar'
            }
            if (txt) txt.textContent = 'Assistente Inativo'
            const card = document.getElementById(`mini-kx-${prevSuffix}`)
            if (card) card.classList.remove('pulse')
        }

        // Remove estado visual ativo do hero telemetria
        document.querySelector('.telemetry-hero')?.classList.remove('gps-ativo')
    } else {
        copilotoAtivoModo = modo
        copilotoAtivoSuffix = idSuffix

        const sel = document.getElementById('gps-rota-selecionada')
        if (sel) sel.value = modo

        iniciarCopilotoKX()

        const btn = document.getElementById(`btn-kx-${idSuffix}`)
        const txt = document.getElementById(`txt-kx-${idSuffix}`)
        if (btn) {
            btn.classList.add('ativo')
            btn.innerHTML = '<span class="material-icons">stop</span> Parar'
        }
        if (txt) txt.textContent = 'Buscando satélites...'
        const card = document.getElementById(`mini-kx-${idSuffix}`)
        if (card) card.classList.add('pulse')

        // Adiciona estado visual ativo ao hero telemetria
        document.querySelector('.telemetry-hero')?.classList.add('gps-ativo')
    }
}
window.toggleCopilotoModo = toggleCopilotoModo

function iniciarCopilotoKX() {
    if (!navigator.geolocation) return alert('Dispositivo não suporta GPS.')
    manterTelaLigada()
    const btnAtivar = document.getElementById('btn-ativar-kx')
    if (btnAtivar)
        btnAtivar.innerHTML = '<span class="material-icons">radar</span> Dark Horse Ativo'

    const initText = 'Buscando satélites... Aguarde.'
    const statusEl = document.getElementById('status-kx')
    if (statusEl) statusEl.innerHTML = initText
    if (copilotoAtivoSuffix) {
        const txt = document.getElementById(`txt-kx-${copilotoAtivoSuffix}`)
        if (txt) txt.textContent = 'Buscando satélites...'
    }

    // Usar copilotoAtivoModo como fonte primaria; fallback para o select DOM
    const sel = document.getElementById('gps-rota-selecionada')
    if (sel) sel.value = copilotoAtivoModo || sel.value
    const modoSelecionado = copilotoAtivoModo || (sel ? sel.value : 'RODAGEM')
    let nomePistaAlvo = ''

    const painelRodagem = document.getElementById('painel-rodagem')
    if (modoSelecionado === 'RODAGEM') {
        if (painelRodagem) painelRodagem.style.display = 'block'
        // GPS exclusivo — acelerômetro removido (Ford Free-Rolling Analytics v2.0)
        memoriaRodagem = {
            ultimaPosicao: null,
            ultimoTempo: Date.now(),
            velocidadeAnterior: 0,
            ultimoTempoTrace: Date.now(),
            velMax: 0,
            somaVel: 0,
            contVel: 0,
        }
        const elVelAtual = document.getElementById('ui-vel-atual')
        if (elVelAtual) elVelAtual.innerHTML = '0 <span style="font-size:0.8rem;">km/h</span>'
        app.renderLogRodagem()
        falar('Ford Free-Rolling Analytics ativado. Dark Horse em operação.')
    } else {
        if (painelRodagem) painelRodagem.style.display = 'none'
        if (modoSelecionado === 'R389') {
            nomePistaAlvo = app.sequenciaDiasPares[app.etapaAtualIndex]
            falar('Dark Horse ativado. Siga para: ' + nomePistaAlvo)
        } else if (modoSelecionado === 'FRENAGEM') {
            nomePistaAlvo = app.roteiroFrenagem[app.ciclosFrenagem.length % 8]
            falar('Dark Horse ativado. Siga para: ' + nomePistaAlvo)
        } else if (modoSelecionado === 'DESACELERACAO') {
            nomePistaAlvo = app.roteiroDesaceleracao[app.etapaDesaceleracaoIndex]
            falar('Dark Horse ativado. Siga para: ' + nomePistaAlvo)
        }
    }

    rastreadorGpsID = navigator.geolocation.watchPosition(
        (posicao) => {
            const statusText = `Sinal: Conectado (Margem: ${posicao.coords.accuracy.toFixed(0)}m)`
            const stEl = document.getElementById('status-kx')
            if (stEl) stEl.innerHTML = statusText
            if (copilotoAtivoSuffix) {
                const txt = document.getElementById(`txt-kx-${copilotoAtivoSuffix}`)
                if (txt) txt.textContent = `Conectado (${posicao.coords.accuracy.toFixed(0)}m)`
            }

            atualizarPosicaoNoMapa(posicao.coords.latitude, posicao.coords.longitude)

            if (modoSelecionado === 'RODAGEM') {
                const agora = Date.now()
                let velKmH = 0
                if (memoriaRodagem.ultimaPosicao) {
                    const deltaMts = calcularDistanciaMetros(
                        memoriaRodagem.ultimaPosicao.lat,
                        memoriaRodagem.ultimaPosicao.lng,
                        posicao.coords.latitude,
                        posicao.coords.longitude
                    )
                    if (posicao.coords.accuracy < 25 && deltaMts > 1)
                        app.rodagemDistanciaMts += deltaMts
                    velKmH =
                        posicao.coords.speed !== null && posicao.coords.speed >= 0
                            ? posicao.coords.speed * 3.6
                            : (deltaMts / ((agora - memoriaRodagem.ultimoTempo) / 1000)) * 3.6
                }
                memoriaRodagem.ultimaPosicao = {
                    lat: posicao.coords.latitude,
                    lng: posicao.coords.longitude,
                }
                memoriaRodagem.ultimoTempo = agora
                memoriaRodagem.velocidadeAnterior = velKmH

                // Acumuladores para cálculo de vel. média e máx ao salvar viagem
                if (velKmH > 0) {
                    memoriaRodagem.somaVel = (memoriaRodagem.somaVel || 0) + velKmH
                    memoriaRodagem.contVel = (memoriaRodagem.contVel || 0) + 1
                    if (velKmH > (memoriaRodagem.velMax || 0)) memoriaRodagem.velMax = velKmH
                }

                // ── IDs legados (compatibilidade) ──────────────────────────────
                const elVelAtual = document.getElementById('ui-vel-atual')
                const elDistTotal = document.getElementById('ui-dist-total')
                if (elVelAtual)
                    elVelAtual.innerHTML = `${velKmH.toFixed(0)} <span style="font-size:0.8rem;">km/h</span>`
                if (elDistTotal)
                    elDistTotal.innerHTML = `${(app.rodagemDistanciaMts / 1000).toFixed(2)} <span style="font-size:0.8rem;">km</span>`
                const rlVel = document.getElementById('ui-rl-vel')
                const rlDist = document.getElementById('ui-rl-dist')
                const rlPontos = document.getElementById('rl-pontos-cont')
                if (rlVel)
                    rlVel.innerHTML = `${velKmH.toFixed(0)} <span style="font-size:0.8rem;">km/h</span>`
                if (rlDist)
                    rlDist.innerHTML = `${(app.rodagemDistanciaMts / 1000).toFixed(2)} <span style="font-size:0.8rem;">km</span>`
                if (rlPontos) rlPontos.innerText = `${app.rastroGps.length} pontos`

                // ── Painel Telemetria em tempo real (screen-telemetry) ──────────
                const distKm = (app.rodagemDistanciaMts / 1000).toFixed(2)
                const velMedia =
                    memoriaRodagem.contVel > 0
                        ? (memoriaRodagem.somaVel / memoriaRodagem.contVel).toFixed(1)
                        : '0.0'
                const velMax = (memoriaRodagem.velMax || 0).toFixed(1)

                const elTelDist = document.getElementById('ui-tel-dist')
                const elTelVel = document.getElementById('ui-tel-vel')
                const elTelMedia = document.getElementById('ui-tel-velmedia')
                const elTelMax = document.getElementById('ui-tel-velmax')

                if (elTelDist) elTelDist.innerHTML = `${distKm}<span>km</span>`
                if (elTelVel) elTelVel.innerHTML = `${velKmH.toFixed(0)}<span>km/h</span>`
                if (elTelMedia) elTelMedia.innerHTML = `${velMedia}<span>km/h</span>`
                if (elTelMax) elTelMax.innerHTML = `${velMax}<span>km/h</span>`

                // ── Distribuição de faixas de velocidade em tempo real ──────────
                const pts = app.rastroGps || []
                if (pts.length > 0) {
                    let f1 = 0,
                        f2 = 0,
                        f3 = 0,
                        f4 = 0
                    pts.forEach((p) => {
                        const v = p.vel || 0
                        if (v < 80) f1++
                        else if (v < 160) f2++
                        else if (v < 230) f3++
                        else f4++
                    })
                    const tot = pts.length
                    const pct1 = ((f1 / tot) * 100).toFixed(0)
                    const pct2 = ((f2 / tot) * 100).toFixed(0)
                    const pct3 = ((f3 / tot) * 100).toFixed(0)
                    const pct4 = ((f4 / tot) * 100).toFixed(0)
                    const setFaixa = (idLbl, idBar, pct) => {
                        const el1 = document.getElementById(idLbl)
                        const el2 = document.getElementById(idBar)
                        if (el1) el1.textContent = `${pct}%`
                        if (el2) el2.style.width = `${pct}%`
                    }
                    setFaixa('tel-faixa1-lbl', 'tel-faixa1-bar', pct1)
                    setFaixa('tel-faixa2-lbl', 'tel-faixa2-bar', pct2)
                    setFaixa('tel-faixa3-lbl', 'tel-faixa3-bar', pct3)
                    setFaixa('tel-faixa4-lbl', 'tel-faixa4-bar', pct4)
                }

                // ── Gráfico velocidade × tempo (Chart.js) — atualização ao vivo ─
                if (typeof Chart !== 'undefined' && window._chartTelemetria) {
                    const ch = window._chartTelemetria
                    const label = new Date().toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                    })
                    if (ch.data.labels.length >= 60) {
                        ch.data.labels.shift()
                        ch.data.datasets[0].data.shift()
                    }
                    ch.data.labels.push(label)
                    ch.data.datasets[0].data.push(parseFloat(velKmH.toFixed(1)))
                    ch.update('none') // 'none' = sem animação, performance máxima
                }

                if (agora - memoriaRodagem.ultimoTempoTrace > 3000) {
                    const ponto = {
                        lat: posicao.coords.latitude,
                        lng: posicao.coords.longitude,
                        vel: velKmH,
                    }
                    app.rastroGps.push(ponto)
                    memoriaRodagem.ultimoTempoTrace = agora

                    if (window.GPSBatcher) {
                        window.GPSBatcher.adicionar(ponto)
                    }

                    app.salvarEstadoHibrido()
                }
                return
            }

            if (bloqueioTempo) return
            if (modoSelecionado === 'R389') {
                nomePistaAlvo = app.sequenciaDiasPares[app.etapaAtualIndex]
                if (!nomePistaAlvo) return
            } else if (modoSelecionado === 'FRENAGEM') {
                nomePistaAlvo = app.roteiroFrenagem[app.ciclosFrenagem.length % 8]
            } else if (modoSelecionado === 'DESACELERACAO') {
                nomePistaAlvo = app.roteiroDesaceleracao[app.etapaDesaceleracaoIndex]
                if (!nomePistaAlvo) return
            }

            const alvo = MAPA_PISTAS[nomePistaAlvo]
            if (!alvo || alvo.lat === 0) return
            const distancia = calcularDistanciaMetros(
                posicao.coords.latitude,
                posicao.coords.longitude,
                alvo.lat,
                alvo.lng
            )

            if (distancia <= alvo.raio) {
                bloqueioTempo = true
                setTimeout(() => {
                    bloqueioTempo = false
                }, 12000)
                if (modoSelecionado === 'R389') {
                    app.registrarPassagem(true)
                    app.etapaAtualIndex >= app.sequenciaDiasPares.length
                        ? (app.novaVolta(true), falar('Ciclo concluído.'))
                        : falar(`Check. Siga para: ${app.sequenciaDiasPares[app.etapaAtualIndex]}`)
                } else if (modoSelecionado === 'FRENAGEM') {
                    app.registrarVoltaFrenagem()
                    const ni = app.ciclosFrenagem.length % 8
                    ni === 0
                        ? falar('Ciclo finalizado.')
                        : falar(`Check. Siga para: ${app.roteiroFrenagem[ni]}`)
                } else if (modoSelecionado === 'DESACELERACAO') {
                    app.registrarPassagemDesaceleracao(true)
                    app.etapaDesaceleracaoIndex >= app.roteiroDesaceleracao.length
                        ? (app.novaVoltaDesaceleracao(true), falar('Teste concluído.'))
                        : falar(
                              `Check. Siga para: ${app.roteiroDesaceleracao[app.etapaDesaceleracaoIndex]}`
                          )
                }
            }
        },
        (erro) => {
            console.warn('GPS Warning/Error Code:', erro.code, erro.message)
            const statusEl = document.getElementById('status-kx')
            if (statusEl) {
                if (erro.code === 3) {
                    statusEl.innerHTML = `<span style="color:#eab308; font-weight: 500;"><span class="material-icons" style="font-size:0.9rem;vertical-align:middle;margin-right:2px;animation:spin 2s linear infinite;">sync</span> Sinal instável (Reconectando...)</span>`
                } else {
                    statusEl.innerHTML = `<span style="color:#ef4444;"><span class="material-icons" style="font-size:0.9rem;vertical-align:middle;margin-right:2px;">gps_off</span> Sem sinal GPS</span>`
                }
            }
            if (copilotoAtivoSuffix) {
                const txt = document.getElementById(`txt-kx-${copilotoAtivoSuffix}`)
                if (txt) {
                    if (erro.code === 3) {
                        txt.innerHTML = `<span style="color:#eab308;">Sinal instável...</span>`
                    } else {
                        txt.innerHTML = `<span style="color:#ef4444;">Sem sinal GPS</span>`
                    }
                }
            }
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 25000 }
    )
}

function pararCopilotoKX() {
    if (rastreadorGpsID !== null) {
        // Persiste a viagem antes de encerrar (somente modo Free-Rolling com distância mínima)
        const modoAtual = document.getElementById('gps-rota-selecionada')?.value
        if (modoAtual === 'RODAGEM' && app.rodagemDistanciaMts > 100) {
            FreeRollingPersistence.salvarViagem()
        }

        navigator.geolocation.clearWatch(rastreadorGpsID)
        rastreadorGpsID = null

        const btnAtivar = document.getElementById('btn-ativar-kx')
        if (btnAtivar)
            btnAtivar.innerHTML =
                '<span class="material-icons">play_arrow</span> Iniciar Dark Horse'

        const statusEl = document.getElementById('status-kx')
        if (statusEl) statusEl.innerHTML = ''

        if (copilotoAtivoSuffix) {
            const btn = document.getElementById(`btn-kx-${copilotoAtivoSuffix}`)
            const txt = document.getElementById(`txt-kx-${copilotoAtivoSuffix}`)
            if (btn) {
                btn.classList.remove('ativo')
                btn.innerHTML = '<span class="material-icons">play_arrow</span> Iniciar'
            }
            if (txt) txt.textContent = 'Assistente Inativo'
            const card = document.getElementById(`mini-kx-${copilotoAtivoSuffix}`)
            if (card) card.classList.remove('pulse')
        }

        copilotoAtivoModo = null
        copilotoAtivoSuffix = null

        // GPS exclusivo — sem devicemotion (Free-Rolling Analytics v2.0)
        memoriaRodagem = {
            ultimaPosicao: null,
            ultimoTempo: Date.now(),
            velocidadeAnterior: 0,
            ultimoTempoTrace: Date.now(),
            velMax: 0,
            somaVel: 0,
            contVel: 0,
        }

        liberarTela()
        falar('Dark Horse desativado.')
    }
}

// ====================================================
// FORD FREE-ROLLING ANALYTICS — Persistência v2.0
// Schema: { userID, timestamp, copilotName, avgSpeed,
//           distance, maxSpeed, routeCoords }
// Dual storage: localStorage (offline) + Firestore (cloud)
// ====================================================
const FreeRollingPersistence = {
    _KEY_LOCAL: 'vev_viagens_free_rolling',
    _COL_FIRESTORE: 'vev_viagens',
    _MAX_LOCAL: 50, // Máximo de viagens no localStorage

    // ── Salva viagem ao encerrar o modo RODAGEM ───────────────
    salvarViagem() {
        const turno = typeof TurnoEngine !== 'undefined' ? TurnoEngine.dados : null
        const uid = firebase.auth().currentUser?.uid || 'anonimo'

        const velMedia =
            memoriaRodagem.contVel > 0 ? memoriaRodagem.somaVel / memoriaRodagem.contVel : 0

        const pts = app.rastroGps || []
        let f1 = 0,
            f2 = 0,
            f3 = 0,
            f4 = 0
        pts.forEach((p) => {
            const v = p.vel || 0
            if (v < 80) f1++
            else if (v < 160) f2++
            else if (v < 230) f3++
            else f4++
        })
        const total = pts.length || 1
        const speedDistribution = {
            faixa1: parseFloat(((f1 / total) * 100).toFixed(1)),
            faixa2: parseFloat(((f2 / total) * 100).toFixed(1)),
            faixa3: parseFloat(((f3 / total) * 100).toFixed(1)),
            faixa4: parseFloat(((f4 / total) * 100).toFixed(1)),
        }

        const viagem = {
            userID: uid,
            timestamp: new Date().toISOString(),
            copilotName: 'Dark Horse',
            avgSpeed: parseFloat(velMedia.toFixed(1)),
            distance: parseFloat((app.rodagemDistanciaMts / 1000).toFixed(3)),
            maxSpeed: parseFloat((memoriaRodagem.velMax || 0).toFixed(1)),
            routeCoords: [...pts],
            speedDistribution,
            // Metadados do turno (se disponível)
            operador: turno?.operador || uid,
            veiculo: turno?.veiculo || 'N/A',
            projeto: turno?.projeto || 'N/A',
        }

        // 1. Persistência local (offline-first)
        this._salvarLocal(viagem)

        // 2. Persistência na nuvem (Firestore — cria coleção automaticamente)
        this._salvarFirestore(viagem)

        console.info('[FRA] Viagem salva:', viagem.timestamp, `${viagem.distance} km`)
        return viagem
    },

    _salvarLocal(viagem) {
        try {
            const lista = this._carregarLocal()
            lista.unshift(viagem) // mais recente primeiro
            if (lista.length > this._MAX_LOCAL) lista.splice(this._MAX_LOCAL)
            localStorage.setItem(this._KEY_LOCAL, JSON.stringify(lista))
        } catch (e) {
            console.warn('[FRA] Erro ao salvar localmente:', e)
        }
    },

    async _salvarFirestore(viagem) {
        try {
            const fs = firebase.firestore()
            const uid = viagem.userID
            const id = `${uid}_${Date.now()}`

            // routeCoords pode ser grande — salva resumo (máx 500 pontos)
            const viagemCloud = { ...viagem }
            if (viagemCloud.routeCoords.length > 500) {
                const step = Math.floor(viagemCloud.routeCoords.length / 500)
                viagemCloud.routeCoords = viagemCloud.routeCoords.filter((_, i) => i % step === 0)
            }

            await fs.collection('viagens').doc(uid).collection('historico').doc(id).set(viagemCloud)
        } catch (e) {
            console.warn('[FRA] Firestore offline — dados retidos localmente:', e.message)
        }
    },

    _carregarLocal() {
        try {
            return JSON.parse(localStorage.getItem(this._KEY_LOCAL) || '[]')
        } catch {
            return []
        }
    },

    // ── Carrega histórico (local + Firestore) ─────────────────
    async carregarHistorico() {
        const local = this._carregarLocal()

        try {
            const uid = firebase.auth().currentUser?.uid || 'anonimo'
            const snap = await firebase
                .firestore()
                .collection('viagens')
                .doc(uid)
                .collection('historico')
                .orderBy('timestamp', 'desc')
                .limit(30)
                .get()

            const nuvem = snap.docs.map((d) => d.data())

            // Merge: preferir nuvem, evitar duplicatas por timestamp
            const tsLocal = new Set(local.map((v) => v.timestamp))
            const exclusivos = nuvem.filter((v) => !tsLocal.has(v.timestamp))

            return [...local, ...exclusivos].sort(
                (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
            )
        } catch (e) {
            console.warn('[FRA] Firestore indisponível — usando cache local.')
            return local
        }
    },
}
window.FreeRollingPersistence = FreeRollingPersistence

// ====================================================
// FORD FREE-ROLLING ANALYTICS — Exportação & Share
// ====================================================

/**
 * Gera download de arquivo da viagem em formato JSON.
 * Inclui metadados completos e array de coordenadas.
 */
function exportarViagemJSON(viagem) {
    const payload = JSON.stringify(viagem, null, 2)
    const blob = new Blob([payload], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const ts = viagem.timestamp.replace(/[:.]/g, '-').slice(0, 19)
    a.href = url
    a.download = `FRA_${viagem.copilotName}_${ts}.json`
    a.click()
    URL.revokeObjectURL(url)
}
window.exportarViagemJSON = exportarViagemJSON

/**
 * Gera download de arquivo CSV com log de velocidade ponto-a-ponto.
 * Colunas: Timestamp,Latitude,Longitude,Velocidade_kmh
 */
function exportarViagemCSV(viagem) {
    const header = 'Timestamp,Latitude,Longitude,Velocidade_kmh\n'
    const ts0 = new Date(viagem.timestamp).getTime()
    // Estimativa de timestamp por ponto (3s de intervalo padrão)
    const linhas = viagem.routeCoords
        .map((p, i) => {
            const t = new Date(ts0 + i * 3000).toISOString()
            return `${t},${p.lat},${p.lng},${(p.vel || 0).toFixed(1)}`
        })
        .join('\n')

    const blob = new Blob([header + linhas], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const tsF = viagem.timestamp.replace(/[:.]/g, '-').slice(0, 19)
    a.href = url
    a.download = `FRA_${viagem.copilotName}_${tsF}.csv`
    a.click()
    URL.revokeObjectURL(url)
}
window.exportarViagemCSV = exportarViagemCSV

/**
 * Renderiza o modal de Histórico de Performance com viagens carregadas.
 */
async function abrirHistoricoPerformance() {
    const modal = document.getElementById('modal-historico-performance')
    if (!modal) return
    modal.style.display = 'flex'
    document.body.style.overflow = 'hidden'

    const lista = document.getElementById('fra-lista-viagens')
    if (!lista) return
    lista.innerHTML =
        '<div style="text-align:center;padding:2rem;color:var(--text-secondary);"><span class="material-icons" style="font-size:1.5rem;animation:spin 1s linear infinite;vertical-align:middle;margin-right:8px;">sync</span>Carregando histórico...</div>'

    const viagens = await FreeRollingPersistence.carregarHistorico()

    if (!viagens.length) {
        lista.innerHTML = `
            <div style="text-align:center;padding:3rem 1rem;color:var(--text-secondary);">
                <span class="material-icons" style="font-size:3rem;opacity:0.2;display:block;margin-bottom:8px;">route</span>
                Nenhuma viagem registrada ainda.<br>
                <small>Ative o Ford Free-Rolling Analytics e percorra um trajeto.</small>
            </div>`
        return
    }

    lista.innerHTML = viagens
        .map((v, idx) => {
            const data = new Date(v.timestamp).toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            })

            // Retrocompatibilidade do cálculo de faixas de velocidade (TripRank)
            let dist = v.speedDistribution
            if (!dist) {
                let f1 = 0,
                    f2 = 0,
                    f3 = 0,
                    f4 = 0
                const pts = v.routeCoords || []
                pts.forEach((p) => {
                    const vel = p.vel || 0
                    if (vel < 80) f1++
                    else if (vel < 160) f2++
                    else if (vel < 230) f3++
                    else f4++
                })
                const tot = pts.length || 1
                dist = {
                    faixa1: parseFloat(((f1 / tot) * 100).toFixed(1)),
                    faixa2: parseFloat(((f2 / tot) * 100).toFixed(1)),
                    faixa3: parseFloat(((f3 / tot) * 100).toFixed(1)),
                    faixa4: parseFloat(((f4 / tot) * 100).toFixed(1)),
                }
            }

            return `
        <div class="fra-card-viagem" style="
            background: linear-gradient(135deg, rgba(15,23,42,0.85), rgba(30,41,59,0.7));
            border: 1px solid rgba(0,200,150,0.3);
            border-radius: 18px;
            padding: 20px;
            margin-bottom: 16px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.35);
        ">
            <div class="fra-card-header" style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:15px;">
                <div>
                    <div class="fra-card-copiloto" style="display:flex;align-items:center;gap:6px;font-size:0.9rem;font-weight:800;color:#00c896;">
                        <span class="material-icons" style="font-size:1.1rem;color:#00c896;">radar</span>
                        TPG ${v.copilotName || 'Dark Horse'}
                    </div>
                    <div class="fra-card-data" style="font-size:0.75rem;color:rgba(168,196,240,0.6);margin-top:3px;">${data}</div>
                </div>
                <div class="fra-card-badges">
                    <span class="fra-badge" style="
                        font-size:0.62rem;font-weight:800;
                        background:rgba(0,200,150,0.12);
                        color:#00c896;
                        border:1px solid rgba(0,200,150,0.35);
                        padding:3px 10px;border-radius:20px;
                        text-transform:uppercase;letter-spacing:0.5px;
                    ">${v.veiculo || 'VEÍCULO'}</span>
                </div>
            </div>
            
            <!-- Metricas Principais -->
            <div class="fra-card-metricas" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px;text-align:center;">
                <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04);border-radius:10px;padding:8px 4px;">
                    <div style="font-size:1.3rem;font-weight:900;color:#38bdf8;font-family:'Roboto Mono',monospace;">${v.distance}</div>
                    <div style="font-size:0.6rem;color:rgba(168,196,240,0.5);font-weight:700;text-transform:uppercase;margin-top:2px;">Distância (km)</div>
                </div>
                <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04);border-radius:10px;padding:8px 4px;">
                    <div style="font-size:1.3rem;font-weight:900;color:#00c896;font-family:'Roboto Mono',monospace;">${v.avgSpeed}</div>
                    <div style="font-size:0.6rem;color:rgba(168,196,240,0.5);font-weight:700;text-transform:uppercase;margin-top:2px;">Vel. Média (km/h)</div>
                </div>
                <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04);border-radius:10px;padding:8px 4px;">
                    <div style="font-size:1.3rem;font-weight:900;color:#fbbf24;font-family:'Roboto Mono',monospace;">${v.maxSpeed}</div>
                    <div style="font-size:0.6rem;color:rgba(168,196,240,0.5);font-weight:700;text-transform:uppercase;margin-top:2px;">Vel. Máxima (km/h)</div>
                </div>
            </div>

            <!-- Distribuição de Velocidade -->
            <div style="margin-bottom:16px;background:rgba(255,255,255,0.01);border:1px solid rgba(255,255,255,0.03);border-radius:12px;padding:12px;">
                <div style="font-size:0.7rem;color:rgba(168,196,240,0.6);font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;display:flex;align-items:center;gap:4px;">
                    <span class="material-icons" style="font-size:0.85rem;">bar_chart</span> Distribuição de Velocidade
                </div>
                <div style="display:flex;flex-direction:column;gap:6px;">
                    <div>
                        <div style="display:flex;justify-content:space-between;font-size:0.65rem;color:rgba(255,255,255,0.7);margin-bottom:2px;">
                            <span>&lt; 80 km/h</span>
                            <span style="font-weight:700;color:#10b981;">${dist.faixa1}%</span>
                        </div>
                        <div style="width:100%;height:5px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;">
                            <div style="width:${dist.faixa1}%;height:100%;background:linear-gradient(90deg, #059669, #10b981);border-radius:3px;"></div>
                        </div>
                    </div>
                    <div>
                        <div style="display:flex;justify-content:space-between;font-size:0.65rem;color:rgba(255,255,255,0.7);margin-bottom:2px;">
                            <span>80 - 160 km/h</span>
                            <span style="font-weight:700;color:#3b82f6;">${dist.faixa2}%</span>
                        </div>
                        <div style="width:100%;height:5px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;">
                            <div style="width:${dist.faixa2}%;height:100%;background:linear-gradient(90deg, #1d4ed8, #3b82f6);border-radius:3px;"></div>
                        </div>
                    </div>
                    <div>
                        <div style="display:flex;justify-content:space-between;font-size:0.65rem;color:rgba(255,255,255,0.7);margin-bottom:2px;">
                            <span>160 - 230 km/h</span>
                            <span style="font-weight:700;color:#a855f7;">${dist.faixa3}%</span>
                        </div>
                        <div style="width:100%;height:5px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;">
                            <div style="width:${dist.faixa3}%;height:100%;background:linear-gradient(90deg, #7e22ce, #a855f7);border-radius:3px;"></div>
                        </div>
                    </div>
                    <div>
                        <div style="display:flex;justify-content:space-between;font-size:0.65rem;color:rgba(255,255,255,0.7);margin-bottom:2px;">
                            <span>&gt; 230 km/h</span>
                            <span style="font-weight:700;color:#ef4444;">${dist.faixa4}%</span>
                        </div>
                        <div style="width:100%;height:5px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;">
                            <div style="width:${dist.faixa4}%;height:100%;background:linear-gradient(90deg, #b91c1c, #ef4444);border-radius:3px;"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Gráfico de Linha: Speed Over Time -->
            <div style="margin-top:14px;background:rgba(0,0,0,0.25);border:1px solid rgba(255,255,255,0.04);border-radius:12px;padding:12px;position:relative;">
                <div style="font-size:0.7rem;color:rgba(168,196,240,0.6);font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;display:flex;align-items:center;gap:4px;">
                    <span class="material-icons" style="font-size:0.85rem;color:#38bdf8;">timeline</span> Velocidade pelo Tempo (Speed Over Time)
                </div>
                <div style="position:relative;height:120px;width:100%;">
                    <canvas id="chart-viagem-${idx}" style="max-height:120px;width:100%;"></canvas>
                </div>
            </div>

            <!-- Ações -->
            <div class="fra-card-actions" style="display:flex;gap:8px;margin-top:14px;">
                <button class="fra-btn-action fra-btn-json"
                    onclick="exportarViagemJSON(FreeRollingPersistence._carregarLocal()[${idx}])">
                    <span class="material-icons">download</span> JSON
                </button>
                <button class="fra-btn-action fra-btn-csv"
                    onclick="exportarViagemCSV(FreeRollingPersistence._carregarLocal()[${idx}])">
                    <span class="material-icons">table_chart</span> CSV
                </button>
            </div>
        </div>`
        })
        .join('')

    // Sincronizar criação dos gráficos Chart.js dinamicamente
    setTimeout(() => {
        viagens.forEach((v, idx) => {
            const canvas = document.getElementById(`chart-viagem-${idx}`)
            if (!canvas) return

            const pts = v.routeCoords || []
            // Amostragem inteligente (max 50 pontos para renderização suave e performática)
            const step = Math.max(1, Math.floor(pts.length / 50))
            const pontosFiltrados = pts.filter((_, i) => i % step === 0).slice(0, 50)

            const labels = pontosFiltrados.map((_, i) => `${i * 3 * step}s`)
            const dadosVelocidade = pontosFiltrados.map((p) => parseFloat((p.vel || 0).toFixed(0)))

            const ctx = canvas.getContext('2d')

            // Gradiente azul-neon sutil de preenchimento
            const gradient = ctx.createLinearGradient(0, 0, 0, 100)
            gradient.addColorStop(0, 'rgba(56, 189, 248, 0.25)')
            gradient.addColorStop(1, 'rgba(56, 189, 248, 0)')

            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Velocidade',
                            data: dadosVelocidade,
                            borderColor: '#0284c7',
                            borderWidth: 2,
                            pointRadius: 0,
                            pointHoverRadius: 4,
                            pointBackgroundColor: '#38bdf8',
                            fill: true,
                            backgroundColor: gradient,
                            tension: 0.3,
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    return ` ${context.parsed.y} km/h`
                                },
                            },
                        },
                    },
                    scales: {
                        x: {
                            display: false,
                            grid: { display: false },
                        },
                        y: {
                            grid: {
                                color: 'rgba(255, 255, 255, 0.05)',
                                drawTicks: false,
                            },
                            ticks: {
                                color: 'rgba(255, 255, 255, 0.4)',
                                font: { size: 8, family: 'Courier New' },
                                maxTicksLimit: 3,
                            },
                        },
                    },
                },
            })
        })
    }, 150)
}

window.abrirHistoricoPerformance = abrirHistoricoPerformance

function desenharRotaColorida() {
    abrirMapaAoVivo()
    if (!mapaTelemetria || app.rastroGps.length < 2) {
        return alert('Não há dados suficientes de GPS salvos.')
    }
    let velMax = 0
    let somaVel = 0
    app.rastroGps.forEach((p) => {
        if (p.vel > velMax) velMax = p.vel
        somaVel += p.vel
    })
    alert(
        `Estatísticas da Rota:\n\nVelocidade Máxima: ${velMax.toFixed(1)} km/h\nVelocidade Média: ${(somaVel / app.rastroGps.length).toFixed(1)} km/h`
    )
    mapaTelemetria.eachLayer((layer) => {
        if (layer instanceof L.Polyline && !(layer instanceof L.Polygon))
            mapaTelemetria.removeLayer(layer)
    })
    for (let i = 0; i < app.rastroGps.length - 1; i++) {
        const p1 = app.rastroGps[i]
        const p2 = app.rastroGps[i + 1]
        const cor = p1.vel > 80 ? '#ef4444' : p1.vel > 40 ? '#f97316' : '#10b981'
        L.polyline(
            [
                [p1.lat, p1.lng],
                [p2.lat, p2.lng],
            ],
            { color: cor, weight: 6, opacity: 0.8 }
        ).addTo(mapaTelemetria)
    }
    mapaTelemetria.setView([app.rastroGps[0].lat, app.rastroGps[0].lng], 14)
}

// ====================================================
// ROTA LIVRE / PERCURSO LIVRE FUNCTIONS
// ====================================================
let mapaRotaLivre = null

function exportarRotaGoogleMaps() {
    if (!app.rastroGps || app.rastroGps.length < 2) {
        alert(
            'Atenção: Nenhuma coordenada registrada. Ative o Copiloto na Rota Livre e ande um pouco.'
        )
        return
    }
    const total = app.rastroGps.length
    const origem = `${app.rastroGps[0].lat},${app.rastroGps[0].lng}`
    const destino = `${app.rastroGps[total - 1].lat},${app.rastroGps[total - 1].lng}`

    let waypointsStr = ''
    if (total > 2) {
        const intermediarios = app.rastroGps.slice(1, total - 1)
        const numWaypoints = Math.min(10, intermediarios.length)
        const step = Math.floor(intermediarios.length / numWaypoints) || 1
        const selecionados = []
        for (let i = 0; i < intermediarios.length; i += step) {
            if (selecionados.length < numWaypoints) {
                selecionados.push(`${intermediarios[i].lat},${intermediarios[i].lng}`)
            }
        }
        waypointsStr = '&waypoints=' + selecionados.join('|')
    }

    const url = `https://www.google.com/maps/dir/?api=1&origin=${origem}&destination=${destino}${waypointsStr}`
    window.open(url, '_blank')
}
window.exportarRotaGoogleMaps = exportarRotaGoogleMaps

// ── Salvar e-mail master de alertas ──────────────────────────
async function salvarEmailMaster() {
    const input = document.getElementById('ops-email-master')
    const status = document.getElementById('ops-email-status')
    const email = input?.value?.trim()
    if (!email || !email.includes('@')) return

    try {
        if (window.db && window.firebase) {
            await db
                .collection('vev_config')
                .doc('alertas')
                .set({ emailMaster: email }, { merge: true })
        } else {
            localStorage.setItem('vev_emailMaster', email)
        }
        if (status) {
            status.style.color = 'var(--neon-green)'
            status.textContent = `✓ Salvo: ${email}`
            setTimeout(() => {
                status.textContent = ''
            }, 4000)
        }
    } catch (err) {
        console.error('[VEV] Erro ao salvar e-mail master:', err)
        if (status) {
            status.style.color = 'var(--neon-red)'
            status.textContent = '✕ Erro ao salvar. Tente novamente.'
        }
    }
}
window.salvarEmailMaster = salvarEmailMaster

// ── Carregar tabela RBAC da equipe ────────────────────────────
async function carregarTabelaEquipe() {
    const tbody = document.getElementById('ops-team-tbody')
    if (!tbody) return

    try {
        let operadores = []

        if (window.db) {
            const snap = await db.collection('vev_operadores').orderBy('nome').get()
            snap.forEach((doc) => operadores.push({ id: doc.id, ...doc.data() }))
        } else {
            const raw = localStorage.getItem('vev_operadores')
            if (raw) operadores = JSON.parse(raw)
        }

        if (operadores.length === 0) {
            tbody.innerHTML = `<tr>
                <td colspan="5" style="text-align:center;padding:1.5rem;color:var(--text-secondary);font-size:0.8rem;">
                    <span class="material-icons" style="font-size:1.5rem;opacity:0.3;display:block;margin-bottom:4px;">people</span>
                    Nenhum membro cadastrado ainda.
                </td>
            </tr>`
            return
        }

        const roleLbl = { analista: 'Analista', coordenador: 'Coordenador', gerente: 'Gerente' }
        tbody.innerHTML = operadores
            .map((op) => {
                const role = (op.role || 'analista').toLowerCase()
                const nome = op.nome || '—'
                const email = op.email || '—'
                return `<tr>
                <td style="font-weight:600;">${nome}</td>
                <td style="font-size:0.75rem;color:var(--text-secondary);">${email}</td>
                <td><span class="ops-team-badge ${role}">${roleLbl[role] || role}</span></td>
                <td style="text-align:center;"><span class="ops-team-badge ativo">Ativo</span></td>
                <td style="text-align:center;">
                    <span class="material-icons" style="font-size:1rem;color:var(--text-secondary);cursor:pointer;opacity:0.5;"
                        onclick="TurnoUI.abrirPCComAba('operadores')">edit</span>
                </td>
            </tr>`
            })
            .join('')
    } catch (err) {
        console.warn('[VEV] carregarTabelaEquipe:', err)
    }
}
window.carregarTabelaEquipe = carregarTabelaEquipe

// ── Sync stats da Rota Livre no painel do Coordenador ────────
function atualizarStatsAdminRota() {
    const pontos = app?.rastroGps?.length ?? 0
    const dist = app?.rodagemDistanciaMts
        ? (app.rodagemDistanciaMts / 1000).toFixed(2) + ' km'
        : '0.00 km'
    const vel = app?.velocidadeAtual ? Math.round(app.velocidadeAtual) + ' km/h' : '0 km/h'

    const elPontos = document.getElementById('coord-admin-pontos')
    const elDist = document.getElementById('coord-admin-dist')
    const elVel = document.getElementById('coord-admin-vel')
    if (elPontos) elPontos.textContent = pontos
    if (elDist) elDist.textContent = dist
    if (elVel) elVel.textContent = vel
}
window.atualizarStatsAdminRota = atualizarStatsAdminRota

async function limparRotaLivre() {
    const confirmar = window.VEVAlert
        ? await VEVAlert.confirm('Deseja APAGAR todo o histórico de coordenadas da Rota Livre?', {
              title: 'Limpar Rota Livre',
              type: 'warning',
              confirmText: 'Limpar',
              cancelText: 'Cancelar',
              confirmDanger: true,
          })
        : confirm('Deseja APAGAR todo o histórico de coordenadas da Rota Livre?')
    if (confirmar) {
        app.rastroGps = []
        app.rodagemDistanciaMts = 0
        app.logRodagem = []
        app.salvarEstadoHibrido()

        const rlVel = document.getElementById('ui-rl-vel')
        const rlDist = document.getElementById('ui-rl-dist')
        const rlPontos = document.getElementById('rl-pontos-cont')
        if (rlVel) rlVel.innerHTML = '0 <span style="font-size:0.8rem;">km/h</span>'
        if (rlDist) rlDist.innerHTML = '0.00 <span style="font-size:0.8rem;">km</span>'
        if (rlPontos) rlPontos.innerText = '0 pontos'

        if (mapaRotaLivre) {
            mapaRotaLivre.eachLayer((layer) => {
                if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
                    mapaRotaLivre.removeLayer(layer)
                }
            })
        }
        // UX-1: Substituir alert() nativo por modal estilizado
        if (window.VEVAlert) {
            await VEVAlert.alert('Rota limpa com sucesso.', {
                type: 'success',
                title: 'Rota Limpa',
            })
        } else {
            alert('Rota limpa com sucesso.')
        }
    }
}
window.limparRotaLivre = limparRotaLivre

function abrirMapaRotaLivre() {
    const container = document.getElementById('rl-container-mapa')
    if (!container) return

    container.style.display = 'block'

    // PERF-2: Lazy load Leaflet para o mapa de rota livre
    const _initMapaRotaLivre = () => {
        setTimeout(() => {
            if (!mapaRotaLivre) {
                mapaRotaLivre = L.map('rl-mapa').setView([-23.395171, -47.920321], 15)
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19,
                    attribution: '© OpenStreetMap',
                }).addTo(mapaRotaLivre)
            } else {
                mapaRotaLivre.invalidateSize()
            }

            if (app.rastroGps.length >= 2) {
                mapaRotaLivre.eachLayer((layer) => {
                    if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
                        mapaRotaLivre.removeLayer(layer)
                    }
                })

                const latlngs = app.rastroGps.map((p) => [p.lat, p.lng])
                L.polyline(latlngs, { color: '#0055ff', weight: 6, opacity: 0.85 }).addTo(
                    mapaRotaLivre
                )

                const last = app.rastroGps[app.rastroGps.length - 1]
                mapaRotaLivre.setView([last.lat, last.lng], 15)
            } else {
                if (window.VEVAlert) {
                    VEVAlert.alert('Rastro GPS vazio. Ative o copiloto para gravar.', {
                        type: 'info',
                        title: 'Sem Dados GPS',
                    })
                } else {
                    alert('Rastro GPS vazio. Ative o copiloto para gravar.')
                }
            }
        }, 300)
    }

    // Verificar se Leaflet está carregado, senão lazy-load
    if (typeof L === 'undefined' || !L.map) {
        if (window.LeafletLoader) {
            LeafletLoader.carregar(_initMapaRotaLivre)
        } else {
            const s = document.createElement('script')
            s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
            s.onload = _initMapaRotaLivre
            document.head.appendChild(s)
            if (!document.getElementById('leaflet-css-lazy')) {
                const l = document.createElement('link')
                l.id = 'leaflet-css-lazy'
                l.rel = 'stylesheet'
                l.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
                document.head.appendChild(l)
            }
        }
    } else {
        _initMapaRotaLivre()
    }
}
window.abrirMapaRotaLivre = abrirMapaRotaLivre

// ====================================================
// 4. MÓDULO DE INSTALAÇÃO (PWA)
// ====================================================
let promptDeInstalacao
const bannerInstalacao = document.getElementById('banner-instalacao')
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    promptDeInstalacao = e
    if (bannerInstalacao) bannerInstalacao.style.display = 'flex'
})
function instalarPWA() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
    if (isIOS) return alert("No iPhone: Toque em Compartilhar → 'Adicionar à Tela de Início'.")
    if (promptDeInstalacao) {
        promptDeInstalacao.prompt()
        promptDeInstalacao.userChoice.then((r) => {
            if (r.outcome === 'accepted') bannerInstalacao.style.display = 'none'
            promptDeInstalacao = null
        })
    } else {
        alert('App já instalado ou ação bloqueada.')
    }
}
window.addEventListener('appinstalled', () => {
    if (bannerInstalacao) bannerInstalacao.style.display = 'none'
})
/* ═══════════════════════════════════════════════════════════
   DASHBOARD GESTÃO — Tempo Real
   Lê: vev_turnos_dashboard + vev_issues
   ═══════════════════════════════════════════════════════════ */

const DashboardGestao = {
    _intervalo: null,
    _intervaloData: null,
    _unsubscribeCriticos: null, // CORRIGIDO: Referência do listener

    // ── Inicializa o dashboard ─────────────────────────────
    iniciar() {
        this.parar() // CORRIGIDO: Evita loops e timers duplicados
        // Auto-acesso: qualquer usuario @ford.com autenticado visualiza o dashboard.
        // Permissoes de escrita sao controladas pelo Firestore Rules, nao pela UI.
        const painel = document.getElementById('dashboard-gestao')
        if (!painel) return

        // Mostra o painel
        painel.style.display = 'block'

        // Atualiza data/hora no header
        this._atualizarDataHora()
        this._intervaloData = setInterval(() => this._atualizarDataHora(), 60000)

        // Primeira carga
        this.atualizar()

        // Atualização automática a cada 60 segundos
        this._intervalo = setInterval(() => this.atualizar(), 60000)
        this._iniciarListenerCriticos()
        this._solicitarPermissaoNotificacao()
    },

    // ══════════════════════════════════════════
    // LISTENER TEMPO REAL — Issues Críticos
    // ══════════════════════════════════════════
    _iniciarListenerCriticos() {
        const hojeISO = new Date().toISOString().split('T')[0]
        const db = firebase.firestore()

        // CORRIGIDO: Guarda referência para desinscrever
        this._unsubscribeCriticos = db
            .collection('vev_issues')
            .where('turnoData', '==', hojeISO)
            .where('severidade', '==', 'Crítico')
            .onSnapshot(
                (snap) => {
                    const total = snap.docs.length
                    const card = document.getElementById('card-issues-criticos')
                    const counter = document.getElementById('dash-issues-criticos')

                    if (!card || !counter) return

                    counter.textContent = total
                    card.style.display = total > 0 ? '' : 'none'
                },
                (err) => {
                    console.warn('[Dashboard] Listener críticos erro:', err)
                }
            )
    },

    // ══════════════════════════════════════════
    // PUSH NOTIFICATION — Permissão
    // ══════════════════════════════════════════
    async _solicitarPermissaoNotificacao() {
        if (!('Notification' in window)) return
        if (Notification.permission === 'default') {
            await Notification.requestPermission()
        }
    },

    _dispararNotificacaoCritico(dados) {
        if (!('Notification' in window)) return
        if (Notification.permission !== 'granted') return

        const titulo = 'Issue Crítico Registrado!'
        const corpo = `Veículo: ${dados.veiculo || dados.vin || 'N/A'} · Analista: ${dados.operador || 'N/A'} · ${dados.titulo || ''}`

        const n = new Notification(titulo, {
            body: corpo,
            icon: '/ford_logo_icon_145825.png',
            badge: '/ford_logo_icon_145825.png',
            tag: 'issue-critico',
            requireInteraction: true,
        })

        n.onclick = () => {
            window.focus()
            n.close()
        }
    },

    // ── Para o dashboard ───────────────────────────────────
    parar() {
        if (this._intervalo) {
            clearInterval(this._intervalo)
            this._intervalo = null
        }
        if (this._intervaloData) {
            clearInterval(this._intervaloData)
            this._intervaloData = null
        }
        if (this._unsubscribeCriticos) {
            this._unsubscribeCriticos() // CORRIGIDO: Cancela a inscrição do listener
            this._unsubscribeCriticos = null
        }
    },

    // ── Atualiza todos os cards ────────────────────────────
    async atualizar() {
        try {
            const hojeISO = new Date().toISOString().split('T')[0] // "2026-05-22"

            console.log('[Dashboard] Buscando turnoData:', hojeISO)

            const db = firebase.firestore()

            // ── Busca paralela ────────────────────────────────
            const [snapTurnos, snapIssues] = await Promise.all([
                db.collection('vev_turnos_encerrados').where('turnoData', '==', hojeISO).get(),

                db.collection('vev_issues').where('turnoData', '==', hojeISO).get(),
            ])

            console.log('[Dashboard] Turnos encerrados:', snapTurnos.size)
            console.log('[Dashboard] Issues:', snapIssues.size)

            const turnosEncerrados = snapTurnos.docs.map((d) => ({
                id: d.id,
                ...d.data(),
            }))

            // ── Turno ativo no momento (localStorage) ─────────
            const turnoAtivo = typeof TurnoEngine !== 'undefined' ? TurnoEngine.dados : null

            // ── Métricas ──────────────────────────────────────

            // Sessões = encerradas + 1 se tem turno ativo agora
            const totalTurnos = turnosEncerrados.length + (turnoAtivo ? 1 : 0)

            // Issues = coleção vev_issues (mais preciso)
            const totalIssues = snapIssues.size

            // Analistas únicos pelos turnos encerrados + ativo atual
            const uidsEncerrados = turnosEncerrados.map((t) => t.uid).filter(Boolean)

            const todosUids = new Set(uidsEncerrados)
            if (turnoAtivo?.uid) todosUids.add(turnoAtivo.uid)
            const totalAnalistas = todosUids.size

            // Km = campo "trip" de cada turno encerrado
            const kmTotal = turnosEncerrados.reduce((acc, t) => {
                if (t.trip) return acc + (t.trip || 0)
                if (t.kmFinal && t.kmInicial) return acc + (t.kmFinal - t.kmInicial)
                return acc
            }, 0)

            // ── Atualiza cards ────────────────────────────────
            this._setValor('dash-turnos-hoje', totalTurnos)
            this._setValor('dash-issues-hoje', totalIssues)
            this._setValor('dash-analistas', totalAnalistas || '0')
            this._setValor(
                'dash-km-hoje',
                kmTotal > 0 ? kmTotal.toLocaleString('pt-BR') + ' km' : '—'
            )

            // ── Gráficos Analíticos (Km por Projeto, Km por Veículo, Testes) ──
            const kmPorProjeto = {}
            const kmPorVeiculo = {}
            const testesExecutados = {
                'Ciclos R389': 0,
                Frenagem: 0,
                'Desaceleração 16 Laps': 0,
                'Free-Rolling Analytics': 0,
            }

            const obterKmTurno = (t) => {
                if (t.tripKm) return parseFloat(t.tripKm || 0)
                if (t.trip) return parseFloat(t.trip || 0)
                if (t.kmFinal && t.kmInicial)
                    return parseFloat(t.kmFinal || 0) - parseFloat(t.kmInicial || 0)
                return 0
            }

            const distAmbientes = {
                'Pistas Internas': 0,
                'Pistas Externas': 0,
                VOC: 0,
            }

            const contarAmbiente = (nomeTeste) => {
                if (!nomeTeste) return
                const local = DadosMestres.TESTES_PISTA.find((x) => x.nome === nomeTeste)
                const env = local ? local.ambiente || 'VOC' : 'VOC'
                if (env === 'Interna' || env === 'Interno') distAmbientes['Pistas Internas']++
                else if (env === 'Externa' || env === 'Externo') distAmbientes['Pistas Externas']++
                else distAmbientes['VOC']++
            }

            // 1. Processar turnos encerrados
            turnosEncerrados.forEach((t) => {
                const projeto = t.projeto || 'Sem Projeto'
                const veiculo = t.veiculo || 'Sem Veículo'
                const km = obterKmTurno(t)

                kmPorProjeto[projeto] = (kmPorProjeto[projeto] || 0) + km
                kmPorVeiculo[veiculo] = (kmPorVeiculo[veiculo] || 0) + km

                testesExecutados['Ciclos R389'] += parseInt(t.ciclosR389 || 0)
                testesExecutados['Frenagem'] += parseInt(t.lapsFrenagem || 0)
                testesExecutados['Desaceleração 16 Laps'] += parseInt(t.lapsDesaceleracao || 0)
                if (t.kmRodagem && parseFloat(t.kmRodagem) > 0) {
                    testesExecutados['Free-Rolling Analytics'] += 1
                }

                if (t.tipoTeste) contarAmbiente(t.tipoTeste)
            })

            // 2. Processar turno ativo atual
            if (turnoAtivo) {
                const projeto = turnoAtivo.projeto || 'Sem Projeto'
                const veiculo = turnoAtivo.veiculo || 'Sem Veículo'

                let kmAtivo = 0
                if (typeof app !== 'undefined') {
                    kmAtivo = parseFloat((app.rodagemDistanciaMts || 0) / 1000)
                }

                if (kmAtivo > 0) {
                    kmPorProjeto[projeto] = (kmPorProjeto[projeto] || 0) + kmAtivo
                    kmPorVeiculo[veiculo] = (kmPorVeiculo[veiculo] || 0) + kmAtivo
                }

                if (typeof app !== 'undefined') {
                    testesExecutados['Ciclos R389'] += parseInt(app.checkins?.length || 0)
                    testesExecutados['Frenagem'] += parseInt(app.ciclosFrenagem?.length || 0)
                    testesExecutados['Desaceleração 16 Laps'] += parseInt(
                        app.checkinsDesaceleracao?.length || 0
                    )
                    if (app.rodagemDistanciaMts && parseFloat(app.rodagemDistanciaMts) > 0) {
                        testesExecutados['Free-Rolling Analytics'] += 1
                    }
                }

                if (turnoAtivo.tipoTeste) contarAmbiente(turnoAtivo.tipoTeste)
            }

            // Renderiza os gráficos horizontais
            this._renderGraficoBarras('dash-grafico-projetos', kmPorProjeto, 'km', '#3b82f6')
            this._renderGraficoBarras('dash-grafico-testes', testesExecutados, 'voltas', '#f59e0b')
            this._renderGraficoBarras('dash-grafico-veiculos', kmPorVeiculo, 'km', '#10b981')
            this._renderGraficoBarras('dash-grafico-ambientes', distAmbientes, 'sessões', '#12b5cb')

            // ── Tabela ────────────────────────────────────────
            this._renderTabela(turnosEncerrados, turnoAtivo)

            // ── Timestamp ─────────────────────────────────────
            const elAtt = document.getElementById('dash-ultima-atualizacao')
            if (elAtt) {
                elAtt.textContent = `Atualizado às ${new Date().toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                })}`
            }
        } catch (e) {
            console.error('[Dashboard] ERRO:', e)
        }
    },

    // ── Renderiza gráfico de barras horizontal no estilo Power BI ──
    _renderGraficoBarras(containerId, dados, unidade, cor) {
        const el = document.getElementById(containerId)
        if (!el) return

        const sorted = Object.entries(dados || {})
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5) // top 5

        if (sorted.length === 0 || sorted.every((item) => item[1] === 0)) {
            el.innerHTML = `
            <div style="color:var(--text-secondary);font-size:0.75rem;text-align:center;padding:30px 0;display:flex;flex-direction:column;align-items:center;gap:6px;">
                <span class="material-icons" style="font-size:1.5rem;opacity:0.4;">bar_chart</span>
                Nenhum dado registrado hoje
            </div>
        `
            return
        }

        const maximo = sorted[0][1] || 1

        el.innerHTML = sorted
            .map(([label, valor]) => {
                const pct = maximo > 0 ? (valor / maximo) * 100 : 0

                let valorFormatado = valor
                if (unidade === 'km') {
                    valorFormatado = `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km`
                } else if (unidade === 'voltas') {
                    const lbl = valor === 1 ? 'lap' : 'laps'
                    valorFormatado = `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} ${lbl}`
                } else {
                    valorFormatado = `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} ${unidade}`
                }

                return `
            <div class="dash-chart-row" style="margin-bottom: 12px; display: flex; flex-direction: column; gap: 4px;">
                <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;">
                    <span class="dash-chart-label" title="${label}" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 70%; font-weight: 600;">
                        ${label}
                    </span>
                    <span class="dash-chart-value" style="font-family: 'Roboto Mono', monospace; font-weight: 700; color: var(--text-primary);">
                        ${valorFormatado}
                    </span>
                </div>
                <div class="dash-chart-track" style="height: 6px; background: var(--bg-surface-2); border: 1px solid var(--border-glass); border-radius: 3px; overflow: hidden; width: 100%;">
                    <div class="dash-chart-fill" style="width: ${pct}%; height: 100%; background: ${cor}; border-radius: 3px; transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);"></div>
                </div>
            </div>
        `
            })
            .join('')
    },

    // ── Seta valor no card com animação ───────────────────
    _setValor(id, valor) {
        const el = document.getElementById(id)
        if (!el) return

        el.classList.remove('atualizado')
        void el.offsetWidth
        el.classList.add('atualizado')

        // Se for número puro — anima contagem
        const numero = parseFloat(String(valor).replace(/\./g, '').replace(',', '.'))
        const ehNumero = !isNaN(numero) && String(valor).trim() !== '—'

        if (ehNumero) {
            this._contarAte(el, numero, 1200)
        } else {
            el.textContent = valor
        }
    },

    // ══════════════════════════════════════════
    // ANIMAÇÃO CONTADORA
    // ══════════════════════════════════════════
    _contarAte(el, alvo, duracao) {
        const inicio = performance.now()
        const valorInicio = 0

        const step = (agora) => {
            const progresso = Math.min((agora - inicio) / duracao, 1)

            // Easing — desacelera no final
            const ease = 1 - Math.pow(1 - progresso, 3)

            const valorAtual = Math.floor(ease * alvo)
            el.textContent = valorAtual.toLocaleString('pt-BR')

            if (progresso < 1) {
                requestAnimationFrame(step)
            } else {
                el.textContent = alvo.toLocaleString('pt-BR')
            }
        }

        requestAnimationFrame(step)
    },

    // ── Renderiza tabela de turnos ─────────────────────────
    _renderTabela(turnosEncerrados, turnoAtivo) {
        const corpo = document.getElementById('dash-tabela-corpo')
        if (!corpo) return

        const extrairHora = (str) => {
            if (!str) return '—'
            const m = str.match(/(\d{2}):(\d{2})(?::(\d{2}))?/)
            return m ? m[0] : str
        }

        const temEncerrados = turnosEncerrados && turnosEncerrados.length > 0
        const temAtivo = !!turnoAtivo

        if (!temEncerrados && !temAtivo) {
            corpo.innerHTML = `
            <div class="dash-vazio">
                <span class="material-icons"
                      style="font-size:2rem;opacity:0.2;
                             display:block;margin-bottom:8px;">
                    inbox
                </span>
                Nenhum turno registrado hoje ainda
            </div>`
            return
        }

        // Cabeçalho
        let html = `
        <div class="dash-tabela-linha">
            <span class="dash-tabela-th">Operador</span>
            <span class="dash-tabela-th">Projeto</span>
            <span class="dash-tabela-th">Veículo</span>
            <span class="dash-tabela-th">Início</span>
            <span class="dash-tabela-th">Status</span>
        </div>`

        const obterBadgeAmbienteHTML = (nomeTeste) => {
            if (!nomeTeste) return ''
            const local = DadosMestres.TESTES_PISTA.find((x) => x.nome === nomeTeste)
            const env = local ? local.ambiente || 'VOC' : 'VOC'
            let cor = '#f9ab00'
            let bg = 'rgba(249,171,0,0.12)'
            let border = 'rgba(249,171,0,0.25)'
            if (env === 'Interna' || env === 'Interno') {
                cor = '#1a73e8'
                bg = 'rgba(26,115,232,0.12)'
                border = 'rgba(26,115,232,0.25)'
            } else if (env === 'Externa' || env === 'Externo') {
                cor = '#1e8e3e'
                bg = 'rgba(30,142,62,0.12)'
                border = 'rgba(30,142,62,0.25)'
            }
            return `<span style="
            display:inline-flex;align-items:center;
            font-size:0.58rem;font-weight:800;letter-spacing:0.3px;
            color:${cor};background:${bg};border:1px solid ${border};
            padding:1px 4px;border-radius:3px;text-transform:uppercase;
            line-height:1;margin-right:2px;">${env}</span>`
        }

        // Turno ativo primeiro (se existir)
        if (temAtivo) {
            const badgeAtivo = obterBadgeAmbienteHTML(turnoAtivo.tipoTeste)
            html += `
            <div class="dash-tabela-linha"
                 style="background:rgba(34,197,94,0.04);
                        border-left:2px solid rgba(34,197,94,0.4);">
                <span class="dash-tabela-td" style="font-weight:600;">
                    ${turnoAtivo.operador || '—'}
                </span>
                <span class="dash-tabela-td"
                      title="${turnoAtivo.projeto || '—'}">
                    ${turnoAtivo.projeto || '—'}<br>
                    <small style="font-size:0.68rem; color:var(--text-secondary); display:inline-flex; align-items:center; gap:2px; margin-top:2px; flex-wrap:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%;">
                        ${badgeAtivo}
                        <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${turnoAtivo.tipoTeste || '—'}</span>
                    </small>
                </span>
                <span class="dash-tabela-td">
                    ${turnoAtivo.veiculo || '—'}
                </span>
                <span class="dash-tabela-td">
                    ${turnoAtivo.horaInicio ? extrairHora(turnoAtivo.horaInicio) : '—'}
                </span>
                <span class="dash-tabela-td">
                    <span style="
                        display:inline-flex;align-items:center;gap:4px;
                        font-size:0.65rem;font-weight:700;
                        color:#22c55e;
                        background:rgba(34,197,94,0.12);
                        border:1px solid rgba(34,197,94,0.3);
                        padding:2px 8px;border-radius:6px;">
                        <span style="width:6px;height:6px;
                                     background:#22c55e;border-radius:50%;
                                     box-shadow:0 0 0 2px rgba(34,197,94,0.35);">
                        </span>
                        EM CAMPO
                    </span>
                </span>
            </div>`
        }

        // Turnos encerrados
        turnosEncerrados.forEach((t) => {
            const horaInicio = t.horaInicio ? extrairHora(t.horaInicio) : '—'

            const kmInfo = t.trip
                ? `${t.trip} km`
                : t.kmFinal && t.kmInicial
                  ? `${t.kmFinal - t.kmInicial} km`
                  : '—'

            const badge = obterBadgeAmbienteHTML(t.tipoTeste)

            html += `
            <div class="dash-tabela-linha">
                <span class="dash-tabela-td"
                      title="${t.operador || '—'}">
                    ${t.operador || '—'}
                </span>
                <span class="dash-tabela-td"
                      title="${t.projeto || '—'}">
                    ${t.projeto || '—'}<br>
                    <small style="font-size:0.68rem; color:var(--text-secondary); display:inline-flex; align-items:center; gap:2px; margin-top:2px; flex-wrap:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%;">
                        ${badge}
                        <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${t.tipoTeste || '—'}</span>
                    </small>
                </span>
                <span class="dash-tabela-td">
                    ${t.veiculo || '—'}
                </span>
                <span class="dash-tabela-td">
                    ${horaInicio}
                </span>
                <span class="dash-tabela-td">
                    <span style="
                        font-size:0.65rem;font-weight:700;
                        color:var(--text-secondary);
                        background:var(--bg-surface-2);
                        border:1px solid var(--border-glass);
                        padding:2px 8px;border-radius:6px;">
                        ${kmInfo}
                    </span>
                </span>
            </div>`
        })

        corpo.innerHTML = html
    },

    // ── Atualiza data e hora no header ─────────────────────
    _atualizarDataHora() {
        const el = document.getElementById('dash-data-atual')
        if (!el) return

        const agora = new Date()
        el.textContent = agora.toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        })
    },
}

// ── Cronômetro do banner ───────────────────────────────────
const BannerCronometro = {
    _intervalo: null,

    iniciar() {
        this.parar() // CORRIGIDO: Limpa qualquer temporizador duplicado antes de iniciar
        const d = TurnoEngine?.dados
        if (!d?.horaInicio) return

        // horaInicio vem como string "dd/mm/yyyy, HH:MM:SS" ou similar
        const match = d.horaInicio.match(/(\d{2})\/(\d{2})\/(\d{4})[^\d]*(\d{2}):(\d{2}):(\d{2})/)
        let inicio
        if (match) {
            const [, dia, mes, ano, hora, min, seg] = match
            inicio = new Date(
                parseInt(ano),
                parseInt(mes) - 1,
                parseInt(dia),
                parseInt(hora),
                parseInt(min),
                parseInt(seg)
            )
        } else {
            inicio = new Date(d.horaInicio)
        }

        if (isNaN(inicio)) return

        this._intervalo = setInterval(() => {
            const diff = Math.floor((Date.now() - inicio) / 1000)
            const h = String(Math.floor(diff / 3600)).padStart(2, '0')
            const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0')
            const s = String(diff % 60).padStart(2, '0')

            const el = document.getElementById('banner-cronometro')
            if (el) el.textContent = `${h}:${m}:${s}`
        }, 1000)
    },

    parar() {
        if (this._intervalo) {
            clearInterval(this._intervalo)
            this._intervalo = null // CORRIGIDO: Limpa a referência
        }
    },
}

// ─────────────────────────────────────────────────────────────
// TOAST NOTIFICATIONS SYSTEM — v4.10
// ─────────────────────────────────────────────────────────────
const Toast = {
    show(mensagem, tipo = 'success') {
        let container = document.getElementById('vev-toast-container')
        if (!container) {
            container = document.createElement('div')
            container.id = 'vev-toast-container'
            container.className = 'vev-toast-container'
            document.body.appendChild(container)
        }

        const toast = document.createElement('div')
        toast.className = 'vev-toast'

        let icone = 'check_circle'
        let corIcone = '#1e8e3e'
        if (tipo === 'error') {
            icone = 'error'
            corIcone = '#d93025'
        } else if (tipo === 'warning') {
            icone = 'warning'
            corIcone = '#f9ab00'
        } else if (tipo === 'info') {
            icone = 'info'
            corIcone = '#1a73e8'
        }

        toast.innerHTML = `
            <span class="material-icons" style="color:${corIcone}; font-size:1.4rem;">${icone}</span>
            <div style="flex:1; font-size:0.85rem; font-weight:600; line-height:1.4; color:var(--text-primary);">${mensagem}</div>
            <div class="vev-toast-progress" style="background:${corIcone};"></div>
        `

        container.appendChild(toast)

        // Remove do DOM após fechar
        setTimeout(() => {
            toast.classList.add('closing')
            toast.addEventListener('animationend', () => {
                toast.remove()
            })
        }, 4000)
    },
}

window.app = app
app.gerarECompartilharLaudoRecuperado = (issue) => app.gerarECompartilharLaudo(issue)

app.copiarTexto = (texto, mensagemSucesso = 'Texto copiado com sucesso!') => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard
            .writeText(texto)
            .then(() => {
                if (typeof Toast !== 'undefined') Toast.show(mensagemSucesso)
                else alert(mensagemSucesso)
            })
            .catch(() => {
                app._fallbackCopiarTexto(texto, mensagemSucesso)
            })
    } else {
        app._fallbackCopiarTexto(texto, mensagemSucesso)
    }
}

app._fallbackCopiarTexto = (texto, mensagemSucesso) => {
    try {
        const ta = document.createElement('textarea')
        ta.value = texto
        ta.style.position = 'fixed'
        ta.style.top = '0'
        ta.style.left = '0'
        ta.style.width = '2em'
        ta.style.height = '2em'
        ta.style.padding = '0'
        ta.style.border = 'none'
        ta.style.outline = 'none'
        ta.style.boxShadow = 'none'
        ta.style.background = 'transparent'
        document.body.appendChild(ta)
        ta.focus()
        ta.select()
        const ok = document.execCommand('copy')
        document.body.removeChild(ta)
        if (ok) {
            if (typeof Toast !== 'undefined') Toast.show(mensagemSucesso)
            else alert(mensagemSucesso)
        } else {
            alert('Não foi possível copiar o texto.')
        }
    } catch (e) {
        alert('Erro ao copiar o texto.')
    }
}

// Inicialização segura e resiliente do aplicativo no carregamento do DOM
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('[VEV] Inicializando app via DOMContentLoaded...')
            app.init()
        })
    } else {
        console.log('[VEV] Inicializando app imediatamente...')
        app.init()
    }
}
