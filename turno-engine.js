// ─────────────────────────────────────────────────────────────
// 1. PRÉ-CADASTRO ENGINE (localStorage — apenas postos)
// ─────────────────────────────────────────────────────────────
const PreCadastroEngine = {
    _key: 'vev_pc_',

    getAll(tipo) {
        return JSON.parse(localStorage.getItem(this._key + tipo) || '[]')
    },

    add(tipo, item) {
        const lista = this.getAll(tipo)
        item.id = item.id || `${tipo}_${Date.now()}`
        lista.push(item)
        localStorage.setItem(this._key + tipo, JSON.stringify(lista))
        return item
    },

    update(tipo, id, dadosNovos) {
        const lista = this.getAll(tipo).map((i) => (i.id === id ? { ...i, ...dadosNovos } : i))
        localStorage.setItem(this._key + tipo, JSON.stringify(lista))
    },

    remove(tipo, id) {
        const lista = this.getAll(tipo).filter((i) => i.id !== id)
        localStorage.setItem(this._key + tipo, JSON.stringify(lista))
    },

    buscar(tipo, termo) {
        if (!termo) return this.getAll(tipo)
        const t = termo.toLowerCase()
        return this.getAll(tipo).filter((i) => JSON.stringify(i).toLowerCase().includes(t))
    },

    seedDefaults() {
        if (this.getAll('postos').length === 0) {
            ;['TPG'].forEach((nome) => this.add('postos', { nome }))
        }
    },
}

// ─────────────────────────────────────────────────────────────
// 2. TURNO ENGINE — Isolado por usuário autenticado
// ─────────────────────────────────────────────────────────────
const TurnoEngine = {
    _cache: null,

    _chave() {
        const uid = firebase.auth().currentUser?.uid || 'anonimo'
        return `vev_turno_ativo_${uid}`
    },

    get dados() {
        if (this._cache) return this._cache
        const s = localStorage.getItem(this._chave())
        return s ? (this._cache = JSON.parse(s)) : null
    },

    iniciar(dados) {
        dados.horaInicio = new Date().toLocaleString('pt-BR')
        dados.uid = firebase.auth().currentUser?.uid || 'anonimo'
        dados.abastecimentos = [] // suporte a múltiplos abastecimentos
        this._cache = dados
        localStorage.setItem(this._chave(), JSON.stringify(dados))

        // Salvar turno ativo no Realtime Database para monitoramento em tempo real
        try {
            firebase
                .database()
                .ref('vev_turnos_ativos')
                .child(dados.uid)
                .set({
                    ...dados,
                    timestamp: firebase.database.ServerValue.TIMESTAMP,
                })
            console.log('[RTDB] Turno ativo registrado no Realtime Database.')
        } catch (e) {
            console.warn('[RTDB] Erro ao registrar turno ativo no Realtime Database:', e)
        }

        this.sincronizarComApp()
    },

    // Adiciona um abastecimento intermediário ao turno ativo
    adicionarAbastecimento({ posto, tipoCombustivel, litros, kmAtual }) {
        const d = this.dados
        if (!d) return false

        const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        const abastecimento = {
            posto: posto || '',
            tipoCombustivel: tipoCombustivel || '',
            litros: parseFloat(String(litros).replace(',', '.')) || 0,
            kmAtual: parseFloat(String(kmAtual).replace(',', '.')) || 0,
            hora,
            timestamp: new Date().toISOString(),
        }

        if (!d.abastecimentos) d.abastecimentos = []
        d.abastecimentos.push(abastecimento)

        this._cache = d
        localStorage.setItem(this._chave(), JSON.stringify(d))

        // Sincronizar com RTDB
        try {
            const uid = firebase.auth().currentUser?.uid || 'anonimo'
            firebase.database().ref('vev_turnos_ativos').child(uid).update({
                abastecimentos: d.abastecimentos,
            })
        } catch (e) {
            /* ignore offline */
        }

        console.log('[TurnoEngine] Abastecimento registrado:', abastecimento)
        return true
    },

    // Total de litros somados de todos os abastecimentos
    get totalLitros() {
        const d = this.dados
        if (!d?.abastecimentos?.length) return 0
        return d.abastecimentos.reduce((sum, a) => sum + (parseFloat(a.litros) || 0), 0)
    },

    encerrar() {
        // Forçar salvar coordenadas pendentes no RTDB antes de limpar o turno
        if (window.GPSBatcher) {
            try {
                GPSBatcher.forcarSalvar()
            } catch (e) {
                console.warn('[TurnoEngine] Erro ao forçar salvar GPSBatcher:', e)
            }
        }

        // Salvar horaFim antes de limpar
        const d = this.dados
        if (d) {
            d.horaFim = new Date().toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
            })
            // Guardar snapshot final para uso do PDF/WhatsApp nesta sessão
            this._snapshotFinal = { ...d }
        }

        // Remover do Realtime Database também
        try {
            const uid = firebase.auth().currentUser?.uid || 'anonimo'
            firebase.database().ref('vev_turnos_ativos').child(uid).remove()
            console.log('[RTDB] Turno ativo removido do Realtime Database.')
        } catch (e) {
            console.warn('[RTDB] Erro ao remover turno ativo no Realtime Database:', e)
        }

        const chave = this._chave()
        this._cache = null
        localStorage.removeItem(chave)
        localStorage.removeItem('vev_turno_ativo')
    },

    calcTrip(kmFinal) {
        const d = this.dados
        if (!d?.kmInicial || !kmFinal) return null
        const kmFinalClean = String(kmFinal).replace(',', '.')
        if (isNaN(kmFinalClean)) return null
        const t = parseFloat(kmFinalClean) - parseFloat(String(d.kmInicial).replace(',', '.'))
        return t >= 0 ? t.toFixed(1) : null
    },

    sincronizarComApp() {
        const d = this.dados
        if (!d) {
            // Sem turno ativo: garantir que a home mostre o estado inativo
            if (typeof TurnoUI !== 'undefined') TurnoUI.atualizarBannerHome?.()
            return
        }

        const vinEl = document.getElementById('global-vin')
        if (vinEl) vinEl.value = d.vin || ''

        const nomeEl = document.getElementById('ui-nome-usuario')
        if (nomeEl && d.operador) nomeEl.innerText = d.operador

        if (typeof app !== 'undefined' && d.operador) {
            app.operadorAtual = d.operador
            app.vinGlobal = d.vin || ''
        }

        if (typeof TurnoUI !== 'undefined') TurnoUI.atualizarBannerHome?.()
        if (typeof LaudoPendente !== 'undefined') LaudoPendente.atualizarContagemHome()
    },

    gerarMensagemWhatsApp(enc) {
        const d = this._snapshotFinal || this.dados || {}
        const trip = this.calcTrip(enc.kmFinal)
        const hora = new Date().toLocaleString('pt-BR')
        const horaFim =
            d.horaFim ||
            new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

        let msg = `*ENCERRAMENTO DE TURNO — FORD VEV*\n`
        msg += `Campo de Provas Tatuí\n`
        msg += `${hora}\n\n`
        msg += `━━━━━━━━━━━━━━━━━━━━━━━━\n`
        msg += `*DADOS DO TURNO*\n`
        msg += `━━━━━━━━━━━━━━━━━━━━━━━━\n`

        if (d.projeto) msg += `• Projeto: *${d.projeto}*\n`
        if (d.tipoTeste) msg += `• Tipo de Teste: *${d.tipoTeste}*\n`
        if (d.operador) msg += `• Operador: *${d.operador}*\n`
        if (d.veiculo) msg += `• Veículo: *${d.veiculo}*\n`
        if (d.vin) msg += `• VIN: *${d.vin}*\n`
        if (d.eja) msg += `• EJA: *${d.eja}*\n`
        if (d.cc) msg += `• CC: *${d.cc}*\n`
        if (d.kmInicial) msg += `• Km Inicial: *${d.kmInicial} km*\n`
        if (d.outrasInfo) msg += `• Outras Informações: ${d.outrasInfo}\n`
        if (d.horaInicio) msg += `• Início: *${d.horaInicio}*\n`
        msg += `• Fim: *${horaFim}*\n`

        // Abastecimentos múltiplos
        const abastecimentos = d.abastecimentos || []
        const totalLitros = abastecimentos.reduce(
            (s, a) => s + (parseFloat(String(a.litros).replace(',', '.')) || 0),
            0
        )

        msg += `\n━━━━━━━━━━━━━━━━━━━━━━━━\n`
        msg += `*ABASTECIMENTO / FINAL*\n`
        msg += `━━━━━━━━━━━━━━━━━━━━━━━━\n`
        msg += `• Km Final: *${enc.kmFinal} km*\n`
        msg += `• Trip: *${trip || '—'} km*\n`

        if (abastecimentos.length > 0) {
            msg += `• Total Litros: *${totalLitros.toFixed(1)} L* (${abastecimentos.length} abastecimento(s))\n`
            abastecimentos.forEach((a, i) => {
                msg += `  ${i + 1}. ${a.posto} — ${a.tipoCombustivel} — *${a.litros} L* — ${a.kmAtual} km — ${a.hora}\n`
            })
        } else {
            msg += `• Posto: *${enc.posto || '—'}*\n`
            msg += `• Litros: *${enc.litros || '0'} L*\n`
        }

        if (enc.valorPago) msg += `• Valor Pago: *R$ ${enc.valorPago}*\n`
        if (enc.saldo) msg += `• Saldo: *R$ ${enc.saldo}*\n`
        if (enc.autonomia) msg += `• Autonomia: *${enc.autonomia} km*\n`
        if (enc.consumo) msg += `• Consumo: *${enc.consumo} km/l*\n`
        if (enc.temperatura) msg += `• Temperatura: *${enc.temperatura}*\n`
        if (enc.tempo) msg += `• Tempo: *${enc.tempo}*\n`

        if (enc.metricas && Object.keys(enc.metricas).length > 0) {
            msg += `\n━━━━━━━━━━━━━━━━━━━━━━━━\n`
            msg += `*MÉTRICAS OPERACIONAIS DO TESTE*\n`
            msg += `━━━━━━━━━━━━━━━━━━━━━━━━\n`

            const nomesMetricas = {
                ciclos: 'Ciclos realizados',
                laps: 'Quantidade de Laps',
                frenagens: 'Quantidade de Frenagens',
                kmRodado: 'Km rodado no teste',
                tempoExecucao: 'Tempo de execução',
                execucoes: 'Quantidade de execuções',
                observacoes: 'Observações',
            }

            Object.entries(enc.metricas).forEach(([chave, valor]) => {
                const label = nomesMetricas[chave] || chave
                msg += `• ${label}: *${valor}*\n`
            })
        }

        if (enc.problemas) {
            msg += `\n*Problemas encontrados:*\n${enc.problemas}\n`
        }

        if (enc.statusOperacional) {
            const statusMap = {
                concluido: 'Concluído com sucesso',
                parcial: 'Concluído parcialmente',
                interrompido: 'Interrompido',
            }
            msg += `\n*Status Operacional:* ${statusMap[enc.statusOperacional] || enc.statusOperacional}\n`
        }

        msg += `\n_Enviado via VEV — Ford VEV Tatuí_`

        return encodeURIComponent(msg)
    },
}

// ─────────────────────────────────────────────────────────────
// 3. TURNO UI — Interface
// ─────────────────────────────────────────────────────────────
const TurnoUI = {
    _projetoEditandoId: null,
    _cacheVeiculos: [],
    _cacheTestes: [],
    _cacheProjetos: [],

    // ── Mapeamento tipo → coleção Firestore ──────────────────
    _colecaoMap: {
        tiposTeste: 'vev_projetos',
        veiculos: 'vev_veiculos',
        operadores: 'vev_operadores',
        postos: 'vev_postos',
    },

    // ─────────────────────────────────────────────────────────
    // MODAL INÍCIO DE TURNO
    // ─────────────────────────────────────────────────────────
    async mostrar() {
        // Se já existe turno ativo, apenas exibir os dados sem abrir o formulário
        if (TurnoEngine.dados) {
            this.atualizarBannerHome()
            return
        }

        PreCadastroEngine.seedDefaults()

        const perfil = typeof RoleEngine !== 'undefined' ? RoleEngine.perfil : null
        const nome = perfil?.nome || localStorage.getItem('app_vev_operador') || ''

        const opDisp = document.getElementById('it-operador-display')
        const opVal = document.getElementById('it-operador-value')

        if (opDisp) {
            opDisp.innerHTML = nome
                ? `<span class="material-icons" style="font-size:1rem;opacity:0.6;">person</span>${nome}`
                : `<span style="opacity:0.5;">Não identificado</span>`
        }

        if (opVal) opVal.value = nome
        ;['it-vin', 'it-eja', 'it-cc'].forEach((id) => {
            const el = document.getElementById(id)
            if (el) el.value = ''
        })

        const oi = document.getElementById('it-outras-info')
        if (oi) oi.value = ''

        await this._popularSelects()

        document.getElementById('modal-inicio-turno').style.display = 'flex'
        document.body.style.overflow = 'hidden'
    },

    async _popularSelects() {
        const populateSelect = (id, items, defaultText, textSelector) => {
            const el = document.getElementById(id)
            if (!el) return
            el.innerHTML = `<option value="">${defaultText}</option>`
            items.forEach((item) => {
                const opt = document.createElement('option')
                opt.value = item.id || item.nome
                opt.textContent = textSelector(item)
                el.appendChild(opt)
            })
        }

        // 1. Carregar do localStorage imediatamente (UX instantânea)
        let projetos = JSON.parse(localStorage.getItem('vev_pc_projetos') || '[]')
        if (projetos.length === 0) {
            projetos = [
                { id: 'EET-DRIVE', nome: 'EET Ranger 2024 - Drive Team' },
                { id: 'VOCF-BR', nome: 'Ranger VoCF - Brasil' },
                { id: 'ESP', nome: 'Testes Especiais' },
                { id: '1MMILE', nome: '1M Mile' },
            ]
        }
        this._cacheProjetos = projetos
        populateSelect('it-projeto', projetos, 'Selecione o projeto...', (p) => p.nome)

        let testes = [
            {
                id: 'durabilidade_interno',
                nome: 'Durabilidade',
                ambiente: 'Interno',
                icone: 'timer',
                unidadeMetrica: 'kmRodado',
                metricasExtras: ['laps', 'tempoExecucao', 'ciclos'],
            },
            {
                id: 'especiais_interno',
                nome: 'Especiais',
                ambiente: 'Interno',
                icone: 'star',
                unidadeMetrica: 'kmRodado',
                metricasExtras: ['laps', 'tempoExecucao', 'ciclos'],
            },
            {
                id: 'durabilidade_externo',
                nome: 'Durabilidade',
                ambiente: 'Externo',
                icone: 'timer',
                unidadeMetrica: 'kmRodado',
                metricasExtras: ['laps', 'tempoExecucao', 'ciclos'],
            },
            {
                id: 'especiais_externo',
                nome: 'Especiais',
                ambiente: 'Externo',
                icone: 'star',
                unidadeMetrica: 'kmRodado',
                metricasExtras: ['laps', 'tempoExecucao', 'ciclos'],
            },
        ]
        this._cacheTestes = testes
        localStorage.setItem('vev_pc_testes_pista', JSON.stringify(testes))

        const selAmbiente = document.getElementById('it-ambiente')
        if (selAmbiente) selAmbiente.value = ''

        const selTeste = document.getElementById('it-tipo-teste')
        if (selTeste) {
            selTeste.innerHTML = '<option value="">Selecione o ambiente primeiro...</option>'
            selTeste.disabled = true
        }

        let veiculos = JSON.parse(localStorage.getItem('vev_pc_veiculos') || '[]')
        if (veiculos.length === 0) {
            veiculos =
                typeof PreCadastroEngine !== 'undefined' ? PreCadastroEngine.getAll('veiculos') : []
        }
        this._cacheVeiculos = veiculos
        populateSelect('it-veiculo', veiculos, 'Selecione o veículo...', (v) => {
            const vinLabel = v.vin ? ` - VIN: ${v.vin}` : ''
            return `${v.nome}${vinLabel}`
        })

        // 2. Buscar dados da rede em segundo plano sem bloquear o fluxo
        const timeoutPromise = (ms) =>
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))

        // Projetos em background
        Promise.race([DadosMestres.getProjetos(), timeoutPromise(1500)])
            .then((onlineProjetos) => {
                if (onlineProjetos && onlineProjetos.length > 0) {
                    localStorage.setItem('vev_pc_projetos', JSON.stringify(onlineProjetos))
                    this._cacheProjetos = onlineProjetos
                    const currentSel = document.getElementById('it-projeto')
                    if (currentSel && !currentSel.value) {
                        populateSelect(
                            'it-projeto',
                            onlineProjetos,
                            'Selecione o projeto...',
                            (p) => p.nome
                        )
                    }
                }
            })
            .catch((err) =>
                console.warn(
                    '[TurnoUI] Erro ou timeout ao obter projetos online, usando local:',
                    err
                )
            )

        // Testes de pista em background (filtra para manter apenas Durabilidade e Especiais e normaliza ambientes)
        Promise.race([DadosMestres.getTestesPista(), timeoutPromise(1500)])
            .then((onlineTestes) => {
                if (onlineTestes && onlineTestes.length > 0) {
                    const filtrados = onlineTestes.filter(
                        (t) => t.nome === 'Durabilidade' || t.nome === 'Especiais'
                    )
                    filtrados.forEach((t) => {
                        if (t.ambiente === 'Interna' || t.ambiente === 'Interno')
                            t.ambiente = 'Interno'
                        else if (t.ambiente === 'Externa' || t.ambiente === 'Externo')
                            t.ambiente = 'Externo'
                        else t.ambiente = 'Interno'
                    })
                    localStorage.setItem('vev_pc_testes_pista', JSON.stringify(filtrados))
                    this._cacheTestes = filtrados
                }
            })
            .catch((err) =>
                console.warn('[TurnoUI] Erro ou timeout ao obter testes online, usando local:', err)
            )

        // Veículos em background
        Promise.race([DadosMestres.getVeiculos(), timeoutPromise(1500)])
            .then((onlineVeiculos) => {
                if (onlineVeiculos && onlineVeiculos.length > 0) {
                    localStorage.setItem('vev_pc_veiculos', JSON.stringify(onlineVeiculos))
                    this._cacheVeiculos = onlineVeiculos
                    const currentSel = document.getElementById('it-veiculo')
                    if (currentSel && !currentSel.value) {
                        populateSelect(
                            'it-veiculo',
                            onlineVeiculos,
                            'Selecione o veículo...',
                            (v) => {
                                const vinLabel = v.vin ? ` - VIN: ${v.vin}` : ''
                                return `${v.nome}${vinLabel}`
                            }
                        )
                    }
                }
            })
            .catch((err) =>
                console.warn(
                    '[TurnoUI] Erro ou timeout ao obter veículos online, usando local:',
                    err
                )
            )
    },

    aoSelecionarAmbiente(sel) {
        const ambiente = sel.value
        const selTeste = document.getElementById('it-tipo-teste')
        if (!selTeste) return

        if (!ambiente) {
            selTeste.innerHTML = '<option value="">Selecione o ambiente primeiro...</option>'
            selTeste.disabled = true
            return
        }

        const testes = this._cacheTestes || []
        const filtrados = testes.filter((t) => {
            const env = t.ambiente || ''
            if (ambiente === 'Interno') return env === 'Interno' || env === 'Interna'
            if (ambiente === 'Externo') return env === 'Externo' || env === 'Externa'
            return env === ambiente
        })

        selTeste.innerHTML = '<option value="">Selecione o tipo de teste...</option>'
        selTeste.disabled = false

        if (filtrados.length === 0) {
            selTeste.innerHTML = '<option value="">Nenhum teste disponível neste ambiente</option>'
            selTeste.disabled = true
            return
        }

        filtrados.forEach((t) => {
            const o = document.createElement('option')
            o.value = t.id || t.nome
            o.textContent = t.nome
            o.dataset.categoria = t.categoria || ''
            selTeste.appendChild(o)
        })
    },

    aoSelecionarProjeto(sel) {
        const projetoId = sel.value
        const projetoNome = sel.options[sel.selectedIndex]?.text || ''
        console.log('[TurnoUI] Projeto selecionado:', projetoNome)
        if (!projetoId) return
        this._filtrarVeiculosPorProjeto(projetoId)
    },

    _filtrarVeiculosPorProjeto(projetoId) {
        const todos = this._cacheVeiculos || []

        const filtrados = todos.filter((v) => {
            const vinculados = v.projetosVinculados || []
            return vinculados.length === 0 || vinculados.includes(projetoId)
        })

        const selVeiculo = document.getElementById('it-veiculo')
        if (!selVeiculo) return

        selVeiculo.innerHTML = '<option value="">Selecione o veículo...</option>'

        if (filtrados.length === 0) {
            selVeiculo.innerHTML = `<option value="">Nenhum veículo vinculado a este projeto</option>`
            return
        }

        filtrados.forEach((v) => {
            const o = document.createElement('option')
            o.value = v.id
            const vinLabel = v.vin ? ` - VIN: ${v.vin}` : ''
            o.textContent = `${v.nome}${vinLabel}`
            selVeiculo.appendChild(o)
        })
        ;['it-vin', 'it-eja', 'it-cc'].forEach((id) => {
            const el = document.getElementById(id)
            if (el) el.value = ''
        })

        const oi = document.getElementById('it-outras-info')
        if (oi) oi.value = ''
    },

    aoSelecionarVeiculo(sel) {
        const veiculos = this._cacheVeiculos || []
        const v = veiculos.find((x) => x.id === sel.value)

        const set = (id, val) => {
            const el = document.getElementById(id)
            if (el) el.value = val || ''
        }

        set('it-vin', v?.vin || '')
        set('it-eja', v?.eja || '')
        set('it-cc', v?.cc || '')

        const oi = document.getElementById('it-outras-info')
        if (oi) oi.value = v?.outrasInfo || ''
    },

    async iniciarTurno() {
        const projetoEl = document.getElementById('it-projeto')
        const projetoId = projetoEl?.value
        const projetoNome = projetoEl?.options[projetoEl.selectedIndex]?.text?.trim() || ''

        const tipoTesteEl = document.getElementById('it-tipo-teste')
        const tipoTesteId = tipoTesteEl?.value
        const tipoTesteNome = tipoTesteEl?.options[tipoTesteEl.selectedIndex]?.text?.trim() || ''

        const operador = document.getElementById('it-operador-value')?.value || ''
        const veiEl = document.getElementById('it-veiculo')
        const veiId = veiEl?.value
        const vin = document.getElementById('it-vin')?.value.trim()
        const kmIniRaw = document.getElementById('it-km-inicial')?.value.trim() || ''
        const kmIni = kmIniRaw.replace(',', '.')
        const eja = document.getElementById('it-eja')?.value.trim()
        const cc = document.getElementById('it-cc')?.value.trim()
        const outrasInfo = document.getElementById('it-outras-info')?.value.trim()

        if (!projetoId) {
            if (window.VEVAlert)
                await VEVAlert.alert('Selecione o Projeto.', {
                    type: 'warning',
                    title: 'Campo Obrigatório',
                })
            else alert('Atenção: Selecione o Projeto.')
            return
        }
        if (!tipoTesteId) {
            if (window.VEVAlert)
                await VEVAlert.alert('Selecione o Tipo de Teste de Pista.', {
                    type: 'warning',
                    title: 'Campo Obrigatório',
                })
            else alert('Atenção: Selecione o Tipo de Teste de Pista.')
            return
        }
        if (!operador) {
            if (window.VEVAlert)
                await VEVAlert.alert('Operador não identificado. Faça login novamente.', {
                    type: 'error',
                    title: 'Sessão Expirada',
                })
            else alert('Atenção: Operador não identificado. Faça login novamente.')
            return
        }
        if (!veiId) {
            // Se o veículo não foi selecionado, exibe imediatamente o campo de digitação rápida
            document.getElementById('it-veiculo-nao-cadastrado-container').style.display = 'block'
            document.getElementById('it-veiculo-nome-rapido')?.focus()
            return
        }
        if (!kmIni) {
            if (window.VEVAlert)
                await VEVAlert.alert('Informe o Km Inicial.', {
                    type: 'warning',
                    title: 'Campo Obrigatório',
                })
            else alert('Atenção: Informe o Km Inicial.')
            return
        }

        // Valida KM contra último turno do veículo
        if (veiId && kmIni) {
            try {
                const snap = await firebase
                    .firestore()
                    .collection('vev_turnos_encerrados')
                    .where('veiculoId', '==', veiId)
                    .orderBy('horaInicio', 'desc')
                    .limit(1)
                    .get()

                if (!snap.empty) {
                    const ultimoTurno = snap.docs[0].data()
                    const ultimoKm = ultimoTurno.kmFinal || ultimoTurno.kmInicial || 0

                    if (
                        parseFloat(kmIni.replace(',', '.')) <
                        parseFloat(String(ultimoKm).replace(',', '.'))
                    ) {
                        // UX-1: Usar VEVAlert.confirm() async no lugar de confirm() síncrono
                        const confirmar = window.VEVAlert
                            ? await VEVAlert.confirm(
                                  `O KM informado (${kmIni} km) é menor que o último registro deste veículo (${ultimoKm} km).\n\nDeseja continuar mesmo assim?`,
                                  {
                                      title: 'KM Abaixo do Esperado',
                                      type: 'warning',
                                      confirmText: 'Continuar',
                                      cancelText: 'Corrigir',
                                  }
                              )
                            : confirm(
                                  `Atenção!\n\nO KM informado (${kmIni}) é menor que o último registro deste veículo (${ultimoKm} km).\n\nDeseja continuar mesmo assim?`
                              )
                        if (!confirmar) return
                    }
                }
            } catch (e) {
                console.warn('[KM Validação] Erro ao verificar histórico:', e)
            }
        }

        const veiculos = this._cacheVeiculos || []
        const veiObj = veiculos.find((x) => x.id === veiId)

        const testes = this._cacheTestes || []
        const testeObj = testes.find((t) => t.id === tipoTesteId)

        const dadosTurno = {
            projetoId,
            projeto: projetoNome,
            tipoTesteId,
            tipoTeste: tipoTesteNome,
            tipotesteMetricas: testeObj?.metricasExtras || [],
            tipotesteUnidade: testeObj?.unidadeMetrica || 'execucoes',
            operador,
            veiculo: veiObj?.nome || veiId,
            veiculoId: veiId,
            vin: vin || veiObj?.vin || '',
            eja: eja || veiObj?.eja || '',
            cc: cc || veiObj?.cc || '',
            outrasInfo: outrasInfo || veiObj?.outrasInfo || '',
            kmInicial: parseFloat(kmIni.replace(',', '.')),
        }

        TurnoEngine.iniciar(dadosTurno)

        document.getElementById('modal-inicio-turno').style.display = 'none'
        document.body.style.overflow = 'auto'

        // Atualizar home imediatamente após iniciar turno
        this.atualizarBannerHome()

        if (typeof app !== 'undefined') {
            app.operadorAtual = dadosTurno.operador
            app.vinGlobal = dadosTurno.vin || ''
            const vinEl = document.getElementById('global-vin')
            if (vinEl) vinEl.value = dadosTurno.vin || ''
            app.carregarEstadoHibrido?.()
        }
    },

    async salvarVeiculoRapido() {
        const nomeRapido = document.getElementById('it-veiculo-nome-rapido')?.value?.trim()
        if (!nomeRapido) {
            alert('Atenção: Por favor, digite o identificador do veículo.')
            return
        }

        const id = 'vei_reg_' + Date.now()
        const novoVei = {
            id: id,
            nome: nomeRapido,
            vin: 'REG_' + Math.floor(Math.random() * 900000 + 100000).toString(),
            status: 'Carro em Registro',
            projetoId: document.getElementById('it-projeto')?.value || 'geral',
            ativo: true,
        }

        try {
            // Grava no Firestore/Database
            await firebase.firestore().collection('vev_veiculos').doc(id).set(novoVei)

            // Sync to Realtime Database
            try {
                await firebase.database().ref('vev_veiculos').child(id).set(novoVei)
            } catch (e) {
                console.warn('[RTDB Sync Error] salvarVeiculoRapido:', e)
            }

            // Adiciona ao cache
            if (!this._cacheVeiculos) this._cacheVeiculos = []
            this._cacheVeiculos.push(novoVei)

            // Atualiza select
            const selVeiculo = document.getElementById('it-veiculo')
            if (selVeiculo) {
                const opt = document.createElement('option')
                opt.value = id
                opt.textContent = `${novoVei.nome} - VIN: ${novoVei.vin}`
                opt.selected = true
                selVeiculo.appendChild(opt)

                // Dispara o change handler para atualizar VIN/EJA/CC
                this.aoSelecionarVeiculo(selVeiculo)
            }

            // Oculta o container rápido
            document.getElementById('it-veiculo-nao-cadastrado-container').style.display = 'none'

            // Executa o iniciar turno diretamente com o veículo recém-criado
            await this.iniciarTurno()
        } catch (e) {
            console.error('Erro ao registrar veículo rápido:', e)
            alert('Erro ao registrar veículo no banco de dados.')
        }
    },

    async _verificarFormulariosObrigatorios(projetoId, projetoNome) {
        try {
            const snap = await firebase.firestore().collection('vev_projetos').doc(projetoId).get()
            const data = snap.data()
            return (data?.formularios?.length || 0) > 0
        } catch {
            return false
        }
    },

    _exibirModalFormularios(projetoId, projetoNome, momento) {
        return new Promise(async (resolve) => {
            let formularios = []

            try {
                const snap = await firebase
                    .firestore()
                    .collection('vev_projetos')
                    .doc(projetoId)
                    .get()
                formularios = snap.data()?.formularios || []
            } catch {
                formularios = []
            }

            const titulo =
                momento === 'inicio'
                    ? 'Formulários de Início de Turno'
                    : 'Formulários de Encerramento de Turno'

            const subtitulo =
                momento === 'inicio'
                    ? 'Preencha todos os formulários obrigatórios antes de iniciar o turno.'
                    : 'Preencha todos os formulários obrigatórios antes de encerrar o turno.'

            // SEC-2: Sanitizar dados do Firestore antes de inserir no DOM (XSS prevention)
            const _esc = (s) => {
                if (!s) return ''
                return String(s)
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;')
            }
            // URLs devem ser validadas — apenas http/https permitidos
            const _safeUrl = (url) => {
                if (!url) return '#'
                try {
                    const u = new URL(url)
                    return u.protocol === 'http:' || u.protocol === 'https:' ? url : '#'
                } catch {
                    return '#'
                }
            }

            const html = `
                <div id="modal-forms-obrigatorios" class="modal-overlay"
                     style="display:flex;z-index:9999;--accent:var(--neon-green);">
                    <div class="modal-content"
                         style="max-width:520px;max-height:90vh;overflow-y:auto;"
                         role="dialog" aria-modal="true" aria-labelledby="mfo-title">

                        <h3 class="modal-title" id="mfo-title" style="color:var(--neon-green);">
                            ${_esc(titulo)}
                        </h3>

                        <div style="background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.2);
                                    border-radius:12px;padding:12px;margin-bottom:1.2rem;
                                    font-size:0.82rem;color:var(--text-secondary);">
                            ${_esc(subtitulo)}
                        </div>

                        <div style="font-weight:700;font-size:0.8rem;
                                    color:var(--text-secondary);margin-bottom:10px;">
                            PROJETO: ${_esc(projetoNome)}
                        </div>

                        <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:1.5rem;">
                            ${
                                formularios.length > 0
                                    ? formularios
                                          .map(
                                              (f) => `
                                    <div style="background:rgba(255,255,255,0.04);
                                                border:1px solid rgba(255,255,255,0.08);
                                                border-radius:12px;padding:14px 16px;
                                                display:flex;align-items:center;
                                                justify-content:space-between;gap:12px;">
                                        <div style="display:flex;align-items:center;gap:10px;">
                                            <span style="font-size:1.4rem;">${_esc(f.icone || '')}</span>
                                            <div>
                                                <div style="font-size:0.88rem;font-weight:600;
                                                            color:var(--text-primary);">
                                                    ${_esc(f.nome)}
                                                </div>
                                                <div style="font-size:0.7rem;color:var(--neon-green);
                                                            margin-top:2px;">
                                                    Obrigatório
                                                </div>
                                            </div>
                                        </div>
                                        <a href="${_safeUrl(f.url)}" target="_blank"
                                           rel="noopener noreferrer"
                                           aria-label="Abrir formulário ${_esc(f.nome)}"
                                           style="background:var(--neon-green);color:#000;
                                                  border:none;border-radius:8px;padding:8px 14px;
                                                  font-size:0.78rem;font-weight:700;cursor:pointer;
                                                  text-decoration:none;white-space:nowrap;">
                                            Abrir
                                        </a>
                                    </div>
                                `
                                          )
                                          .join('')
                                    : `<div style="text-align:center;color:var(--text-secondary);
                                               font-size:0.85rem;padding:1rem;">
                                       Nenhum formulário cadastrado para este projeto
                                   </div>`
                            }
                        </div>

                        <div style="background:rgba(255,193,7,0.08);
                                    border:1px solid rgba(255,193,7,0.2);
                                    border-radius:10px;padding:10px 14px;margin-bottom:1.2rem;
                                    font-size:0.78rem;color:rgba(255,193,7,0.9);">
                            Ao confirmar, você declara que preencheu todos os formulários acima.
                        </div>

                        <div style="display:flex;gap:10px;">
                            <button class="btn-secondary" style="flex:1;"
                                    aria-label="Cancelar"
                                    onclick="TurnoUI._fecharModalForms(false)">
                                Cancelar
                            </button>
                            <button class="btn-primary"
                                    style="flex:2;background:var(--neon-green);color:#000;"
                                    aria-label="Confirmar preenchimento dos formulários"
                                    onclick="TurnoUI._fecharModalForms(true)">
                                Confirmei o Preenchimento
                            </button>
                        </div>

                    </div>
                </div>
            `

            const anterior = document.getElementById('modal-forms-obrigatorios')
            if (anterior) anterior.remove()

            document.body.insertAdjacentHTML('beforeend', html)
            this._resolveFormModal = resolve
        })
    },

    _fecharModalForms(confirmado) {
        const modal = document.getElementById('modal-forms-obrigatorios')
        if (modal) modal.remove()

        if (typeof this._resolveFormModal === 'function') {
            this._resolveFormModal(confirmado)
            this._resolveFormModal = null
        }
    },

    async _buscarIssuesDoTurno() {
        try {
            const d = TurnoEngine.dados
            if (!d) return { total: 0, lista: [] }

            const db = firebase.firestore()
            const snap = await db
                .collection('vev_issues')
                .where('uid', '==', d.uid || '')
                .where('turnoData', '==', new Date().toISOString().split('T')[0])
                .get()

            const lista = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
            return { total: lista.length, lista }
        } catch (e) {
            console.warn('[TurnoUI] Erro ao buscar issues:', e)
            return { total: 0, lista: [] }
        }
    },

    atualizarBanner() {
        // Compatibilidade: chama o novo método
        this.atualizarBannerHome()
    },

    // ── NOVO: atualiza toda a seção de status do turno na Home ──
    atualizarBannerHome() {
        const d = TurnoEngine.dados

        const activeBar = document.getElementById('turno-active-bar')
        const infoStrip = document.getElementById('turno-info-strip')
        const inactiveSection = document.getElementById('turno-inactive-section')
        const btnEncerrar = document.getElementById('btn-home-encerrar')

        if (!d) {
            // Turno inativo
            if (activeBar) activeBar.style.display = 'none'
            if (infoStrip) infoStrip.style.display = 'none'
            if (inactiveSection) inactiveSection.style.display = 'block'
            const activeActions = document.getElementById('turno-active-actions')
            if (activeActions) activeActions.style.display = 'none'
            return
        }

        // Turno ativo — mostrar chips, ocultar botão inicio
        if (activeBar) activeBar.style.display = 'flex'
        if (infoStrip) infoStrip.style.display = 'grid'
        if (inactiveSection) inactiveSection.style.display = 'none'
        if (btnEncerrar) btnEncerrar.style.display = 'flex'

        // Mostrar botão de encerrar + abastecimento na home quando turno está ativo
        const activeActions = document.getElementById('turno-active-actions')
        if (activeActions) activeActions.style.display = 'flex'
        // Atualizar histórico de abastecimentos se disponível
        if (typeof AbastecimentoUI !== 'undefined') AbastecimentoUI._renderHistorico?.()

        const set = (id, val) => {
            const el = document.getElementById(id)
            if (el) el.innerText = val || '—'
        }

        const setHTML = (id, val) => {
            const el = document.getElementById(id)
            if (el) el.innerHTML = val || ''
        }

        set('tab-ui-projeto', d.projeto)
        set('tab-ui-tipo', d.tipoTeste)
        set('tab-ui-tipo-teste', d.tipoTeste)
        set('tab-ui-operador', d.operador)
        set('tab-ui-veiculo', d.veiculo)
        set('tab-ui-km', d.kmInicial ? `${d.kmInicial} km` : null)
        set('tab-ui-vin', d.vin)
        set('tab-ui-eja', d.eja)
        set('tab-ui-cc', d.cc)
        set('tab-ui-outras-info', d.outrasInfo)

        // Preenche também os campos do encerramento
        const encProjeto = document.getElementById('enc-show-projeto')
        const encTipo = document.getElementById('enc-show-tipo')
        const encOperador = document.getElementById('enc-show-operador')
        const encVeiculo = document.getElementById('enc-show-veiculo')
        const encKmIni = document.getElementById('enc-show-km-ini')
        const encVin = document.getElementById('enc-show-vin')
        const encEja = document.getElementById('enc-show-eja')
        const encCc = document.getElementById('enc-show-cc')
        const encHora = document.getElementById('enc-show-hora')
        const encOutras = document.getElementById('enc-show-outras-info')

        if (encProjeto) encProjeto.innerText = d.projeto || '-'
        if (encTipo) encTipo.innerText = d.tipoTeste || '-'
        if (encOperador) encOperador.innerText = d.operador || '-'
        if (encVeiculo) encVeiculo.innerText = d.veiculo || '-'
        if (encKmIni) encKmIni.innerText = d.kmInicial ? `${d.kmInicial} km` : '-'
        if (encVin) encVin.innerText = d.vin || '-'
        if (encEja) encEja.innerText = d.eja || '-'
        if (encCc) encCc.innerText = d.cc || '-'
        if (encHora) encHora.innerText = d.horaInicio || '-'
        if (encOutras) encOutras.innerText = d.outrasInfo || '-'

        // Renderizar o badge de ambiente
        if (d.tipoTeste) {
            const local =
                typeof DadosMestres !== 'undefined'
                    ? DadosMestres.TESTES_PISTA.find((t) => t.nome === d.tipoTeste)
                    : null
            const env = local ? local.ambiente || 'VOC' : 'VOC'
            let cor = '#f9ab00'
            let bg = 'rgba(249,171,0,0.15)'
            let border = 'rgba(249,171,0,0.3)'
            if (env === 'Interna' || env === 'Interno') {
                cor = '#1a73e8'
                bg = 'rgba(26,115,232,0.15)'
                border = 'rgba(26,115,232,0.3)'
            } else if (env === 'Externa' || env === 'Externo') {
                cor = '#1e8e3e'
                bg = 'rgba(30,142,62,0.15)'
                border = 'rgba(30,142,62,0.3)'
            }
            setHTML(
                'tab-ui-ambiente-badge',
                `<span style="display:inline-flex;align-items:center;font-size:0.65rem;font-weight:800;letter-spacing:0.3px;color:${cor};background:${bg};border:1px solid ${border};padding:2px 6px;border-radius:4px;text-transform:uppercase;line-height:1;">${env}</span>`
            )
        } else {
            setHTML('tab-ui-ambiente-badge', '')
        }
    },

    // ── CORRIGIDO: fecha modal sem bloquear ──────────────────
    fecharSeTiver() {
        document.getElementById('modal-inicio-turno').style.display = 'none'
        document.body.style.overflow = 'auto'
    },

    fecharVisualizacao() {
        document.getElementById('modal-inicio-turno').style.display = 'none'
        document.body.style.overflow = 'auto'
    },

    // ─────────────────────────────────────────────────────────
    // CRUD — Gerenciar Cadastros
    // ─────────────────────────────────────────────────────────
    async abrirPC() {
        await this.renderTodasListas()
        if (window.abrirSidebarCadastro) {
            window.abrirSidebarCadastro()
        } else {
            const modal = document.getElementById('modal-precadastro')
            if (modal) modal.style.display = 'flex'
            document.body.style.overflow = 'hidden'
        }
    },

    async mostrarPreCadastro() {
        await this.abrirPC()
    },

    async abrirPCComAba(tipo) {
        await this.renderTodasListas()
        if (window.abrirSidebarCadastro) {
            window.abrirSidebarCadastro(tipo)
        } else {
            const modal = document.getElementById('modal-precadastro')
            if (modal) modal.style.display = 'flex'
            document.body.style.overflow = 'hidden'

            const tabMap = {
                tiposTeste: 0,
                veiculos: 1,
                postos: 2,
            }
            const idx = tabMap[tipo] !== undefined ? tabMap[tipo] : 0
            const buttons = document.querySelectorAll('.pc-tabs .pc-tab')
            if (buttons && buttons[idx]) {
                this.abaPC(tipo, buttons[idx])
            }
        }
    },

    fecharPC() {
        if (window.fecharSidebarPerfil) {
            window.fecharSidebarPerfil()
        } else {
            const modal = document.getElementById('modal-precadastro')
            if (modal) modal.style.display = 'none'
            document.body.style.overflow = 'auto'
            this._popularSelects()
        }
    },

    abaPC(tipo, btn) {
        document.querySelectorAll('.pc-tab').forEach((t) => t.classList.remove('active'))
        document.querySelectorAll('.pc-panel').forEach((p) => p.classList.remove('active'))
        btn.classList.add('active')
        document.getElementById(`pc-panel-${tipo}`)?.classList.add('active')
        if (tipo === 'veiculos') this.renderCheckboxesProjetos()
        this.renderListaFirestore(tipo)
    },

    async renderTodasListas() {
        await Promise.all(
            ['tiposTeste', 'veiculos', 'postos'].map((t) => this.renderListaFirestore(t))
        )
    },

    pesquisarPC(tipo, termo) {
        const lista = PreCadastroEngine.buscar(tipo, termo)
        this._renderItens(tipo, lista)
    },

    renderLista(tipo) {
        const lista = PreCadastroEngine.getAll(tipo)
        this._renderItens(tipo, lista)
    },

    // ── NOVO: lê do Firestore e renderiza a lista ────────────
    async renderListaFirestore(tipo) {
        const colecao = this._colecaoMap[tipo]

        if (!colecao) {
            this.renderLista(tipo)
            return
        }

        try {
            const snap = await firebase.firestore().collection(colecao).get()

            const lista = snap.docs
                .map((d) => ({ id: d.id, ...d.data() }))
                .filter((d) => d.ativo !== false)
                .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))

            this._renderItens(tipo, lista)
        } catch (e) {
            console.warn('[renderListaFirestore] Erro:', e)
            this.renderLista(tipo)
        }
    },

    _renderItens(tipo, lista) {
        if (tipo === 'operadores') {
            const tbody = document.getElementById('pc-tabela-corpo-operadores')
            if (tbody) {
                if (lista.length === 0) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="4" style="text-align:center; padding:2rem; color:var(--text-secondary);">
                                <span class="material-icons" style="font-size:2rem; opacity:0.3; display:block; margin-bottom:8px;">people_outline</span>
                                Nenhum membro de equipe cadastrado
                            </td>
                        </tr>`
                    return
                }

                tbody.innerHTML = lista
                    .map((item) => {
                        const cargoLabel =
                            {
                                Gerente: 'Gerente',
                                Coordenador: 'Coordenador',
                                Analista: 'Analista',
                            }[item.cargo || 'Analista'] || 'Analista'

                        const cargoColor =
                            {
                                Gerente: '#f9ab00',
                                Coordenador: '#1a73e8',
                                Analista: '#1e8e3e',
                            }[item.cargo || 'Analista'] || '#1e8e3e'

                        const cargoBg =
                            {
                                Gerente: 'rgba(249,171,0,0.12)',
                                Coordenador: 'rgba(26,115,232,0.12)',
                                Analista: 'rgba(30,142,62,0.12)',
                            }[item.cargo || 'Analista'] || 'rgba(30,142,62,0.12)'

                        const cargoBorder =
                            {
                                Gerente: 'rgba(249,171,0,0.3)',
                                Coordenador: 'rgba(26,115,232,0.3)',
                                Analista: 'rgba(30,142,62,0.3)',
                            }[item.cargo || 'Analista'] || 'rgba(30,142,62,0.3)'

                        const cargoIcon =
                            {
                                Gerente: 'admin_panel_settings',
                                Coordenador: 'assignment_ind',
                                Analista: 'engineering',
                            }[item.cargo || 'Analista'] || 'engineering'

                        return `
                        <tr style="border-bottom:1px solid var(--border-glass);">
                            <td style="padding:12px 10px; font-weight:600; color:var(--text-primary);">
                                ${item.nome}
                            </td>
                            <td style="padding:12px 10px; font-size:0.8rem; color:var(--text-secondary);">
                                <div style="display:flex; flex-direction:column; gap:2px;">
                                    <span>${item.email || '—'}</span>
                                    ${item.matricula ? `<span style="font-size:0.7rem; opacity:0.6;">Mat: ${item.matricula}</span>` : ''}
                                </div>
                            </td>
                            <td style="padding:12px 10px;">
                                <span style="
                                    display:inline-flex; align-items:center; gap:4px;
                                    font-size:0.68rem; font-weight:800;
                                    color:${cargoColor}; background:${cargoBg}; border:1px solid ${cargoBorder};
                                    padding:3px 8px; border-radius:6px; text-transform:uppercase;">
                                    <span class="material-icons" style="font-size:0.95rem; line-height:1;">${cargoIcon}</span>
                                    ${cargoLabel}
                                </span>
                            </td>
                            <td style="padding:12px 10px; text-align:right;">
                                <div style="display:inline-flex; gap:6px;">
                                    <button class="btn-pc-edit"
                                            onclick="TurnoUI.editarPC('operadores','${item.id}')"
                                            title="Editar operador"
                                            style="padding:4px; min-width:unset; background:none; border:none; color:var(--text-secondary); cursor:pointer;">
                                        <span class="material-icons" style="font-size:1.1rem;">edit</span>
                                    </button>
                                    <button class="btn-pc-del"
                                            onclick="TurnoUI.delPC('operadores','${item.id}')"
                                            title="Excluir operador"
                                            style="padding:4px; min-width:unset; background:none; border:none; color:var(--neon-red); cursor:pointer;">
                                        <span class="material-icons" style="font-size:1.1rem;">delete</span>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `
                    })
                    .join('')
                return
            }
        }

        const el = document.getElementById(`pc-lista-${tipo}`)
        if (!el) return

        if (lista.length === 0) {
            el.innerHTML = `
                <div class="pc-empty">
                    <span class="material-icons">inbox</span>
                    Nenhum item encontrado
                </div>`
            return
        }

        el.innerHTML = lista
            .map((item) => {
                let subs = []

                if (tipo === 'veiculos' && item.vin) subs.push(`VIN: ${item.vin}`)
                if (tipo === 'veiculos' && item.eja) subs.push(`EJA: ${item.eja}`)
                if (tipo === 'veiculos' && item.cc) subs.push(`CC: ${item.cc}`)

                if (tipo === 'tiposTeste') {
                    const totalForms = item.formularios?.length || 0
                    subs.push(`${totalForms} formulário(s)`)
                }

                const botoesProjeto =
                    tipo === 'tiposTeste'
                        ? `
                    <button class="btn-pc-edit"
                            onclick="TurnoUI.editarNomeProjeto('${item.id}')"
                            title="Editar nome do projeto">
                        <span class="material-icons" style="font-size:1rem;">edit</span>
                    </button>
                    <button class="btn-pc-edit"
                            onclick="TurnoUI.abrirGerenciarFormularios('${item.id}')"
                            title="Gerenciar formulários">
                        <span class="material-icons" style="font-size:1rem;">dynamic_form</span>
                    </button>
                  `
                        : `
                    <button class="btn-pc-edit"
                            onclick="TurnoUI.editarPC('${tipo}','${item.id}')"
                            title="Editar">
                        <span class="material-icons" style="font-size:1rem;">edit</span>
                    </button>
                  `

                return `
                <div class="pc-item">
                    <div class="pc-item-info">
                        <span class="pc-item-nome">${item.nome}</span>
                        ${subs.length ? `<span class="pc-item-sub">${subs.join(' · ')}</span>` : ''}
                    </div>
                    <div style="display:flex;gap:6px;flex-shrink:0;">
                        ${botoesProjeto}
                        <button class="btn-pc-del"
                                onclick="TurnoUI.delPC('${tipo}','${item.id}')"
                                title="Excluir">
                            <span class="material-icons" style="font-size:1rem;">delete</span>
                        </button>
                    </div>
                </div>
            `
            })
            .join('')
    },

    validarFormOperador() {
        const nome = document.getElementById('pc-in-operadores-nome')?.value.trim() || ''
        const email = document.getElementById('pc-in-operadores-email')?.value.trim() || ''
        const cargo = document.getElementById('pc-in-operadores-cargo')?.value
        const btn = document.getElementById('btn-pc-add-operadores')

        const emailMsg = document.getElementById('operador-val-email-msg')
        const emailIcon = document.getElementById('operador-val-email-icon')

        if (!email) {
            if (emailMsg) emailMsg.textContent = ''
            if (emailIcon) emailIcon.style.display = 'none'
            if (btn) {
                btn.disabled = true
                btn.style.opacity = '0.6'
                btn.style.cursor = 'not-allowed'
            }
            return
        }

        const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        const eValido = regexEmail.test(email)
        const eFord = email.toLowerCase().endsWith('@ford.com')

        if (!eValido) {
            if (emailMsg) {
                emailMsg.textContent = 'E-mail inválido'
                emailMsg.style.color = '#d93025'
            }
            if (emailIcon) {
                emailIcon.textContent = 'cancel'
                emailIcon.style.color = '#d93025'
                emailIcon.style.display = 'inline-block'
            }
        } else if (!eFord) {
            if (emailMsg) {
                emailMsg.textContent = 'Apenas e-mail @ford.com'
                emailMsg.style.color = '#f9ab00'
            }
            if (emailIcon) {
                emailIcon.textContent = 'warning'
                emailIcon.style.color = '#f9ab00'
                emailIcon.style.display = 'inline-block'
            }
        } else {
            if (emailMsg) {
                emailMsg.textContent = 'E-mail válido'
                emailMsg.style.color = '#1e8e3e'
            }
            if (emailIcon) {
                emailIcon.textContent = 'check_circle'
                emailIcon.style.color = '#1e8e3e'
                emailIcon.style.display = 'inline-block'
            }
        }

        const formValido = nome.length >= 3 && eValido && eFord && cargo
        if (btn) {
            if (formValido) {
                btn.disabled = false
                btn.style.opacity = '1'
                btn.style.cursor = 'pointer'
            } else {
                btn.disabled = true
                btn.style.opacity = '0.6'
                btn.style.cursor = 'not-allowed'
            }
        }
    },

    async addPC(tipo) {
        const nomeEl = document.getElementById(`pc-in-${tipo}-nome`)
        const nome = nomeEl?.value.trim()

        if (!nome) {
            alert('Informe um nome.')
            return
        }

        const item = { nome, ativo: true }

        if (tipo === 'operadores') {
            const mat = document.getElementById('pc-in-operadores-matricula')?.value.trim()
            if (mat) item.matricula = mat

            const email = document.getElementById('pc-in-operadores-email')?.value.trim()
            if (email) item.email = email

            const cargo = document.getElementById('pc-in-operadores-cargo')?.value || 'Analista'
            item.cargo = cargo
        }

        if (tipo === 'veiculos') {
            item.vin = document.getElementById('pc-in-veiculos-vin')?.value.trim() || ''
            item.eja = document.getElementById('pc-in-veiculos-eja')?.value.trim() || ''
            item.cc = document.getElementById('pc-in-veiculos-cc')?.value.trim() || ''
            item.outrasInfo =
                document.getElementById('pc-in-veiculos-outrasInfo')?.value.trim() || ''

            const checkboxes = document.querySelectorAll('.pc-veiculo-projeto-check:checked')
            item.projetosVinculados = Array.from(checkboxes).map((cb) => cb.value)
        }

        if (tipo === 'tiposTeste') {
            item.formularios = []
        }

        const colecao = this._colecaoMap[tipo]

        if (colecao) {
            try {
                const docRef = await firebase
                    .firestore()
                    .collection(colecao)
                    .add({
                        ...item,
                        criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
                    })
                console.log(`[addPC] ${tipo} salvo no Firestore`)

                // Sync to Realtime Database
                try {
                    await firebase
                        .database()
                        .ref(colecao)
                        .child(docRef.id)
                        .set({
                            id: docRef.id,
                            ...item,
                        })
                } catch (e) {
                    console.warn('[RTDB Sync Error] addPC:', e)
                }
            } catch (e) {
                console.error(`[addPC] Erro ao salvar no Firestore:`, e)
                alert('Erro ao salvar. Verifique a conexão.')
                return
            }
        } else {
            PreCadastroEngine.add(tipo, item)
        }

        document.querySelectorAll(`[id^="pc-in-${tipo}-"]`).forEach((i) => {
            i.value = ''
        })

        if (tipo === 'operadores') {
            const msg = document.getElementById('operador-val-email-msg')
            if (msg) msg.textContent = ''
            const icon = document.getElementById('operador-val-email-icon')
            if (icon) icon.style.display = 'none'
            const btn = document.getElementById('btn-pc-add-operadores')
            if (btn) {
                btn.disabled = true
                btn.style.opacity = '0.6'
                btn.style.cursor = 'not-allowed'
            }
        }

        await this.renderListaFirestore(tipo)
        await this._popularSelects()
        await this._sincronizarFormsData()
        if (window.togglePCView) {
            window.togglePCView(tipo, 'list')
        }
    },

    // ── CORRIGIDO: edita projeto no Firestore ─────────────────
    async editarNomeProjeto(id) {
        let projetoNome = ''
        try {
            const snap = await firebase.firestore().collection('vev_projetos').doc(id).get()
            projetoNome = snap.data()?.nome || ''
        } catch {
            projetoNome = ''
        }

        const novoNome = prompt('Editar nome do projeto:', projetoNome)
        if (!novoNome || !novoNome.trim()) return

        try {
            await firebase
                .firestore()
                .collection('vev_projetos')
                .doc(id)
                .update({ nome: novoNome.trim() })
            console.log('[editarNomeProjeto] Atualizado no Firestore')

            // Sync to Realtime Database
            try {
                await firebase
                    .database()
                    .ref('vev_projetos')
                    .child(id)
                    .update({ nome: novoNome.trim() })
            } catch (e) {
                console.warn('[RTDB Sync Error] editarNomeProjeto:', e)
            }
        } catch (e) {
            console.error('[editarNomeProjeto] Erro:', e)
            alert('Erro ao atualizar. Tente novamente.')
            return
        }

        await this.renderListaFirestore('tiposTeste')
        await this._popularSelects()
        await this._sincronizarFormsData()
    },

    // ── CORRIGIDO: edita item no Firestore ────────────────────
    async editarPC(tipo, id) {
        if (tipo === 'tiposTeste') {
            await this.editarNomeProjeto(id)
            return
        }

        const colecao = this._colecaoMap[tipo]
        let item = {}

        if (colecao) {
            try {
                const snap = await firebase.firestore().collection(colecao).doc(id).get()
                item = snap.data() || {}
                item.id = id
            } catch {
                item = {}
            }
        } else {
            item = PreCadastroEngine.getAll(tipo).find((i) => i.id === id) || {}
        }

        const novoNome = prompt(`Novo nome para "${item.nome}":`, item.nome || '')
        if (!novoNome || !novoNome.trim()) return

        const dadosNovos = { nome: novoNome.trim() }

        if (tipo === 'operadores') {
            const novaMat = prompt('Nova matrícula:', item.matricula || '')
            const novoEmail = prompt('E-mail:', item.email || '')
            if (novaMat !== null) dadosNovos.matricula = novaMat.trim()
            if (novoEmail !== null) dadosNovos.email = novoEmail.trim()
        }

        if (tipo === 'veiculos') {
            const novoVin = prompt('Novo VIN:', item.vin || '')
            const novoEja = prompt('Novo EJA:', item.eja || '')
            const novoCc = prompt('Novo CC:', item.cc || '')
            const novaObs = prompt('Novas Observações:', item.outrasInfo || '')

            if (novoVin !== null) dadosNovos.vin = novoVin.trim()
            if (novoEja !== null) dadosNovos.eja = novoEja.trim()
            if (novoCc !== null) dadosNovos.cc = novoCc.trim()
            if (novaObs !== null) dadosNovos.outrasInfo = novaObs.trim()
        }

        if (colecao) {
            try {
                await firebase.firestore().collection(colecao).doc(id).update(dadosNovos)
                console.log(`[editarPC] ${tipo} atualizado no Firestore`)

                // Sync to Realtime Database
                try {
                    await firebase.database().ref(colecao).child(id).update(dadosNovos)
                } catch (e) {
                    console.warn('[RTDB Sync Error] editarPC:', e)
                }
            } catch (e) {
                console.error('[editarPC] Erro:', e)
                alert('Erro ao atualizar. Tente novamente.')
                return
            }
        } else {
            PreCadastroEngine.update(tipo, id, dadosNovos)
        }

        await this.renderListaFirestore(tipo)
        await this._popularSelects()
    },

    // ── CORRIGIDO: remove do Firestore ────────────────────────
    async delPC(tipo, id) {
        const confirmar = window.VEVAlert
            ? await VEVAlert.confirm('Remover este item?', {
                  title: 'Confirmar Remoção',
                  type: 'warning',
                  confirmText: 'Remover',
                  cancelText: 'Cancelar',
                  confirmDanger: true,
              })
            : confirm('Remover este item?')
        if (!confirmar) return

        const colecao = this._colecaoMap[tipo]

        if (colecao) {
            try {
                await firebase.firestore().collection(colecao).doc(id).update({ ativo: false })
                console.log(`[delPC] ${tipo} desativado no Firestore`)

                // Sync to Realtime Database
                try {
                    await firebase.database().ref(colecao).child(id).update({ ativo: false })
                } catch (e) {
                    console.warn('[RTDB Sync Error] delPC:', e)
                }
            } catch (e) {
                console.error('[delPC] Erro:', e)
                alert('Erro ao remover. Tente novamente.')
                return
            }
        } else {
            PreCadastroEngine.remove(tipo, id)
        }

        await this.renderListaFirestore(tipo)
        await this._popularSelects()
        await this._sincronizarFormsData()
    },

    // ─────────────────────────────────────────────────────────
    // GERENCIAR FORMULÁRIOS POR PROJETO
    // ─────────────────────────────────────────────────────────
    async abrirGerenciarFormularios(projetoId) {
        let projeto = null

        try {
            const snap = await firebase.firestore().collection('vev_projetos').doc(projetoId).get()
            if (snap.exists) projeto = { id: snap.id, ...snap.data() }
        } catch (e) {
            console.error('[abrirGerenciarFormularios] Erro:', e)
        }

        if (!projeto) return

        this._projetoEditandoId = projetoId

        const overlay = document.getElementById('modal-gerenciar-forms')
        const titulo = document.getElementById('mgf-projeto-nome')

        if (titulo) titulo.textContent = projeto.nome

        this._renderFormulariosDoProjeto(projeto.formularios || [])

        if (overlay) {
            overlay.style.display = 'flex'
            document.body.style.overflow = 'hidden'
        }
    },

    _renderFormulariosDoProjeto(formularios) {
        const el = document.getElementById('mgf-lista')
        if (!el) return

        if (!formularios.length) {
            el.innerHTML = `
                <div class="pc-empty">
                    <span class="material-icons">link_off</span>
                    Nenhum formulário cadastrado
                </div>`
            return
        }

        el.innerHTML = formularios
            .map(
                (f, idx) => `
            <div class="pc-item">
                <div class="pc-item-info" style="min-width:0;">
                    <span class="pc-item-nome">${f.icone || ''} ${f.nome}</span>
                    <span class="pc-item-sub" style="word-break:break-all;">${f.url}</span>
                </div>
                <div style="display:flex;gap:6px;flex-shrink:0;">
                    <button class="btn-pc-edit"
                            onclick="TurnoUI.editarFormularioDoProjeto(${idx})"
                            title="Editar formulário">
                        <span class="material-icons" style="font-size:1rem;">edit</span>
                    </button>
                    <button class="btn-pc-del"
                            onclick="TurnoUI.removerFormularioDoProjeto(${idx})"
                            title="Remover formulário">
                        <span class="material-icons" style="font-size:1rem;">delete</span>
                    </button>
                </div>
            </div>
        `
            )
            .join('')
    },

    async adicionarFormularioAoProjeto() {
        const nome = document.getElementById('mgf-in-nome')?.value.trim()
        const url = document.getElementById('mgf-in-url')?.value.trim()
        const icone = document.getElementById('mgf-in-icone')?.value.trim() || 'assignment'

        if (!nome) {
            alert('Informe o nome do formulário.')
            return
        }
        if (!url) {
            alert('Informe a URL do formulário.')
            return
        }

        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            alert('Informe uma URL válida iniciando com http:// ou https://')
            return
        }

        const id = this._projetoEditandoId

        try {
            const snap = await firebase.firestore().collection('vev_projetos').doc(id).get()

            const formularios = [...(snap.data()?.formularios || [])]

            const duplicado = formularios.some(
                (f) =>
                    String(f.url || '').trim() === url ||
                    String(f.nome || '')
                        .trim()
                        .toLowerCase() === nome.toLowerCase()
            )

            if (duplicado) {
                alert('Este formulário já está cadastrado neste projeto.')
                return
            }

            formularios.push({ nome, url, icone })

            await firebase.firestore().collection('vev_projetos').doc(id).update({ formularios })
            try {
                await firebase.database().ref('vev_projetos').child(id).update({ formularios })
            } catch (e) {
                console.warn('[RTDB Sync Error] salvarFormLinks:', e)
            }

            ;['mgf-in-nome', 'mgf-in-url', 'mgf-in-icone'].forEach((fid) => {
                const el = document.getElementById(fid)
                if (el) el.value = ''
            })

            this._renderFormulariosDoProjeto(formularios)
            await this.renderListaFirestore('tiposTeste')
            await this._sincronizarFormsData()
        } catch (e) {
            console.error('[adicionarFormularioAoProjeto] Erro:', e)
            alert('Erro ao salvar formulário.')
        }
    },

    async editarFormularioDoProjeto(idx) {
        const id = this._projetoEditandoId

        try {
            const snap = await firebase.firestore().collection('vev_projetos').doc(id).get()

            const formularios = [...(snap.data()?.formularios || [])]
            const form = formularios[idx]
            if (!form) return

            const novoIcone = prompt('Ícone do formulário:', form.icone || 'assignment')
            if (novoIcone === null) return

            const novoNome = prompt('Nome do formulário:', form.nome || '')
            if (novoNome === null || !novoNome.trim()) return

            const novaUrl = prompt('URL do formulário:', form.url || '')
            if (novaUrl === null || !novaUrl.trim()) return

            if (!novaUrl.startsWith('http://') && !novaUrl.startsWith('https://')) {
                alert('Informe uma URL válida iniciando com http:// ou https://')
                return
            }

            formularios[idx] = {
                icone: novoIcone.trim() || 'assignment',
                nome: novoNome.trim(),
                url: novaUrl.trim(),
            }

            await firebase.firestore().collection('vev_projetos').doc(id).update({ formularios })
            try {
                await firebase.database().ref('vev_projetos').child(id).update({ formularios })
            } catch (e) {
                console.warn('[RTDB Sync Error] editarFormularioDoProjeto:', e)
            }

            this._renderFormulariosDoProjeto(formularios)
            await this.renderListaFirestore('tiposTeste')
            await this._sincronizarFormsData()
        } catch (e) {
            console.error('[editarFormularioDoProjeto] Erro:', e)
            alert('Erro ao editar formulário.')
        }
    },

    async removerFormularioDoProjeto(idx) {
        const confirmar = window.VEVAlert
            ? await VEVAlert.confirm('Remover este formulário?', {
                  title: 'Confirmar Remoção',
                  type: 'warning',
                  confirmText: 'Remover',
                  cancelText: 'Cancelar',
                  confirmDanger: true,
              })
            : confirm('Remover este formulário?')
        if (!confirmar) return

        const id = this._projetoEditandoId

        try {
            const snap = await firebase.firestore().collection('vev_projetos').doc(id).get()

            const formularios = (snap.data()?.formularios || []).filter((_, i) => i !== idx)

            await firebase.firestore().collection('vev_projetos').doc(id).update({ formularios })
            try {
                await firebase.database().ref('vev_projetos').child(id).update({ formularios })
            } catch (e) {
                console.warn('[RTDB Sync Error] removerFormLink:', e)
            }

            this._renderFormulariosDoProjeto(formularios)
            await this.renderListaFirestore('tiposTeste')
            await this._sincronizarFormsData()
        } catch (e) {
            console.error('[removerFormularioDoProjeto] Erro:', e)
            alert('Erro ao remover formulário.')
        }
    },

    // ── CORRIGIDO: lê projetos do Firestore ──────────────────
    async renderCheckboxesProjetos() {
        const container = document.getElementById('pc-veiculo-projetos-lista')
        if (!container) return

        try {
            const snap = await firebase.firestore().collection('vev_projetos').get()

            const projetos = snap.docs
                .map((d) => ({ id: d.id, ...d.data() }))
                .filter((d) => d.ativo !== false)
                .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))

            if (projetos.length === 0) {
                container.innerHTML = `
                    <div style="color:var(--text-secondary);font-size:0.78rem;text-align:center;">
                        Nenhum projeto cadastrado
                    </div>`
                return
            }

            container.innerHTML = projetos
                .map(
                    (p) => `
                <label style="display:flex;align-items:center;gap:8px;
                               padding:6px 4px;cursor:pointer;font-size:0.82rem;">
                    <input type="checkbox"
                           class="pc-veiculo-projeto-check"
                           value="${p.id}"
                           style="width:16px;height:16px;cursor:pointer;">
                    ${p.nome}
                </label>
            `
                )
                .join('')
        } catch (e) {
            console.warn('[renderCheckboxesProjetos] Erro:', e)
            container.innerHTML = `
                <div style="color:var(--text-secondary);font-size:0.78rem;text-align:center;">
                    Erro ao carregar projetos
                </div>`
        }
    },

    // ── CORRIGIDO: sincroniza FormsData via Firestore ─────────
    async _sincronizarFormsData() {
        if (typeof FormsData === 'undefined') return

        try {
            const snap = await firebase.firestore().collection('vev_projetos').get()

            snap.docs.forEach((doc) => {
                const data = doc.data()
                if (data.ativo === false) return
                const projeto = { id: doc.id, ...data }
                if (!projeto.formularios?.length) return

                FormsData.adicionarProjeto(projeto.nome, {
                    id: projeto.id,
                    necessitaFormulario: true,
                    formularios: projeto.formularios,
                })
            })
        } catch (e) {
            console.warn('[_sincronizarFormsData] Erro:', e)
        }
    },

    // ─────────────────────────────────────────────────────────
    // FECHAMENTO DE TURNO
    // ─────────────────────────────────────────────────────────
    prepararMetricas() {
        const d = TurnoEngine.dados
        const container = document.getElementById('enc-metricas-container')

        if (!container) return

        if (!d || !d.tipoTeste) {
            container.innerHTML = `
                <div style="color:var(--text-secondary);font-size:0.82rem;
                             text-align:center;padding:1rem;">
                    Inicie um turno para ver as métricas disponíveis
                </div>`
            return
        }

        const metricas = d.tipotesteMetricas || []
        const unidade = d.tipotesteUnidade || 'execucoes'

        const labels = {
            ciclos: { label: 'Ciclos realizados', icon: '', type: 'number' },
            laps: { label: 'Quantidade de Laps', icon: '', type: 'number' },
            frenagens: { label: 'Quantidade de Frenagens', icon: '', type: 'number' },
            kmRodado: { label: 'Km Rodado no Teste', icon: '', type: 'number' },
            tempoExecucao: {
                label: 'Tempo de Execução',
                icon: '',
                type: 'text',
                placeholder: 'Ex: 06:30',
            },
            execucoes: { label: 'Quantidade de Execuções', icon: '', type: 'number' },
            observacoes: { label: 'Observações do Teste', icon: '', type: 'textarea' },
        }

        const todasMetricas = [unidade, ...metricas.filter((m) => m !== unidade)]

        container.innerHTML = `
            <div style="background:rgba(168,85,247,0.06);border:1px solid rgba(168,85,247,0.2);
                        border-radius:12px;padding:12px;margin-bottom:12px;">
                <div style="font-size:0.75rem;color:var(--neon-purple);font-weight:700;margin-bottom:4px;">
                    Teste: ${d.tipoTeste}
                </div>
                <div style="font-size:0.72rem;color:var(--text-secondary);">
                    Preencha as métricas operacionais realizadas neste turno
                </div>
            </div>

            ${todasMetricas
                .map((metrica) => {
                    const m = labels[metrica] || { label: metrica, icon: '', type: 'number' }

                    if (m.type === 'textarea') {
                        return `
                        <div class="ford-group" style="margin-bottom:10px;">
                            <label class="ford-label" style="font-size:0.78rem;">
                                ${m.label}
                            </label>
                            <textarea id="enc-metrica-${metrica}"
                                      class="ford-input"
                                      rows="2"
                                      style="resize:none;"
                                      placeholder="Descreva..."></textarea>
                        </div>
                    `
                    }

                    return `
                    <div class="ford-group" style="margin-bottom:10px;">
                        <label class="ford-label" style="font-size:0.78rem;">
                            ${m.label}
                        </label>
                        <input type="${m.type}"
                               id="enc-metrica-${metrica}"
                               class="ford-input"
                               placeholder="${m.placeholder || '0'}"
                               inputmode="${m.type === 'number' ? 'numeric' : 'text'}">
                    </div>
                `
                })
                .join('')}

            <div class="ford-group" style="margin-bottom:10px;">
                <label class="ford-label" style="font-size:0.78rem;">
                    Problemas Encontrados
                </label>
                <textarea id="enc-problemas"
                          class="ford-input"
                          rows="2"
                          style="resize:none;"
                          placeholder="Descreva problemas ou anomalias encontradas..."></textarea>
            </div>

            <div class="ford-group">
                <label class="ford-label" style="font-size:0.78rem;">
                    Status Operacional
                </label>
                <select id="enc-status-operacional" class="ford-input">
                    <option value="concluido">Concluído com sucesso</option>
                    <option value="parcial">Concluído parcialmente</option>
                    <option value="interrompido">Interrompido</option>
                </select>
            </div>
        `
    },

    async prepararModal() {
        const d = TurnoEngine.dados

        const set = (id, val) => {
            const el = document.getElementById(id)
            if (el) el.innerText = val || '—'
        }

        set('enc-show-projeto', d?.projeto)
        set('enc-show-tipo', d?.tipoTeste)
        set('enc-show-operador', d?.operador)
        set('enc-show-veiculo', d?.veiculo)
        set('enc-show-vin', d?.vin)
        set('enc-show-eja', d?.eja)
        set('enc-show-cc', d?.cc)
        set('enc-show-outras-info', d?.outrasInfo)
        set('enc-show-km-ini', d?.kmInicial ? `${d.kmInicial} km` : null)
        set('enc-show-hora', d?.horaInicio)
        const qtdLaudos = d?.laudosPendentes ? d.laudosPendentes.length : 0
        set('enc-show-laudos-pendentes', `${qtdLaudos} laudo(s)`)

        let postos = []
        try {
            postos = await DadosMestres.getPostos()
        } catch (e) {
            console.warn('[TurnoUI] Erro ao carregar postos do Firestore:', e)
            postos = PreCadastroEngine.getAll('postos')
        }

        const postoSel = document.getElementById('enc-posto')

        if (postoSel) {
            postoSel.innerHTML = '<option value="">Não abasteci hoje</option>'
            postos.forEach((p) => {
                const o = document.createElement('option')
                const nomePosto = p.nome || ''
                o.value = nomePosto
                o.textContent = nomePosto
                postoSel.appendChild(o)
            })
        }

        ;[
            'enc-km-final',
            'enc-litros',
            'enc-valor-pago',
            'enc-saldo',
            'enc-autonomia',
            'enc-consumo',
            'enc-temperatura',
            'enc-tempo',
        ].forEach((id) => {
            const el = document.getElementById(id)
            if (el) el.value = ''
        })

        const tripDisplay = document.getElementById('enc-trip-display')
        if (tripDisplay) {
            tripDisplay.innerHTML = '— <small>Km Final − Km Inicial</small>'
        }

        this.prepararMetricas()

        const { total: totalIssues } = await this._buscarIssuesDoTurno()
        const elProblemas = document.getElementById('enc-problemas')

        if (elProblemas && totalIssues > 0) {
            elProblemas.value = `${totalIssues} issue(s) registrado(s) neste turno`
            elProblemas.style.color = 'var(--neon-yellow, orange)'
        }

        // Removida exibição de aviso de formulários no encerramento
    },

    calcTrip() {
        const kmFinal = document.getElementById('enc-km-final')?.value
        const trip = TurnoEngine.calcTrip(kmFinal)
        const el = document.getElementById('enc-trip-display')

        if (el) {
            el.innerHTML = trip
                ? `${trip} km <small>Km Final − Km Inicial</small>`
                : '— <small>Km Final − Km Inicial</small>'
        }
    },

    toggleOpcional(btn) {
        const body = document.getElementById('enc-opcional-body')
        const label = document.getElementById('enc-opcional-label')
        const icon = btn.querySelector('.material-icons')

        body.classList.toggle('aberto')
        const aberto = body.classList.contains('aberto')

        icon.innerText = aberto ? 'expand_less' : 'expand_more'
        label.innerText = aberto ? 'Ocultar Opcionais' : 'Informações Opcionais'
    },

    _coletar() {
        const g = (id) => document.getElementById(id)?.value || ''
        const pf = (val) => {
            if (!val) return ''
            const cleaned = val.replace(',', '.')
            const num = parseFloat(cleaned)
            return isNaN(num) ? val : num
        }

        const d = TurnoEngine.dados || {}
        const metricas = d.tipotesteMetricas || []
        const unidade = d.tipotesteUnidade || 'execucoes'
        const todasMetricas = [unidade, ...metricas.filter((m) => m !== unidade)]

        const metricasColetadas = {}
        todasMetricas.forEach((m) => {
            const val = g(`enc-metrica-${m}`)
            if (val) metricasColetadas[m] = pf(val)
        })

        return {
            kmFinal: pf(g('enc-km-final')),
            posto: g('enc-posto'),
            litros: pf(g('enc-litros')),
            valorPago: pf(g('enc-valor-pago')),
            saldo: pf(g('enc-saldo')),
            autonomia: pf(g('enc-autonomia')),
            consumo: pf(g('enc-consumo')),
            temperatura: g('enc-temperatura'),
            tempo: g('enc-tempo'),
            metricas: metricasColetadas,
            problemas: g('enc-problemas'),
            statusOperacional: g('enc-status-operacional') || 'concluido',
        }
    },

    _validar(enc) {
        if (!enc.kmFinal) {
            alert('Atenção: Informe o Km Final.')
            return false
        }
        return true
    },

    _syncWesleyHidden(enc) {
        const d = TurnoEngine.dados || {}
        const trip = TurnoEngine.calcTrip(enc.kmFinal)

        const s = (id, v) => {
            const el = document.getElementById(id)
            if (el) el.value = v || ''
        }

        s('t-turno', d.projeto || d.tipoTeste)
        s('t-tipo-teste', d.tipoTeste)
        s('t-veiculo', d.veiculo)
        s('t-posto', enc.posto)
        s('t-km', enc.kmFinal)
        s('t-trip', trip)
        s('t-litros', enc.litros)
        s('t-saldo', enc.saldo)
    },

    async finalizarTurno(modo) {
        if (modo === 'encerrar') {
            await this._executarEncerramentoCompleto()
            return
        }

        if (!this._turnoEncerradoNestaSessao) {
            alert('Atenção: Encerre o turno primeiro antes de enviar o resumo.')
            return
        }

        if (modo === 'whatsapp') {
            const url = `https://wa.me/?text=${TurnoEngine.gerarMensagemWhatsApp(this._dadosEncerramento)}`
            window.open(url, '_blank')
        }

        if (modo === 'pdf') {
            if (typeof app !== 'undefined' && typeof app.gerarRelatorioResumo === 'function') {
                app.gerarRelatorioResumo()
            } else {
                alert('ℹ️ Gerador de PDF disponível após conectar ao Firebase.')
            }
        }
    },

    async _executarEncerramentoCompleto() {
        const enc = this._coletar()
        if (!this._validar(enc)) return

        const d = TurnoEngine.dados

        // UX-1: Usar VEVAlert.confirm() async para encerramento de turno
        const confirmarEnc = window.VEVAlert
            ? await VEVAlert.confirm(
                  'Todos os dados do turno serão salvos na nuvem. Esta ação não pode ser desfeita.',
                  {
                      title: 'Confirmar Encerramento?',
                      type: 'warning',
                      confirmText: 'Encerrar Turno',
                      cancelText: 'Cancelar',
                      confirmDanger: true,
                  }
              )
            : confirm('Confirmar encerramento do turno?\nTodos os dados serão salvos.')

        if (!confirmarEnc) {
            return
        }

        const btnEncerrar = document.getElementById('btn-encerrar-turno')
        if (btnEncerrar) {
            btnEncerrar.disabled = true
            btnEncerrar.innerHTML = `
                <span class="material-icons" style="animation:spin 1s linear infinite;">sync</span>
                Salvando...
            `
        }

        const comTimeout = (promise, ms = 7000) => {
            return Promise.race([
                promise,
                new Promise((_, reject) =>
                    setTimeout(
                        () =>
                            reject(
                                new Error('Tempo limite de salvamento excedido (conexão instável).')
                            ),
                        ms
                    )
                ),
            ])
        }

        try {
            this._syncWesleyHidden(enc)

            // Salvar todos os laudos que ficaram em aberto no Firestore
            const laudosPendentes = d?.laudosPendentes || []
            if (laudosPendentes.length > 0) {
                console.log(
                    `[Turno] Salvando ${laudosPendentes.length} laudos pendentes no Firestore...`
                )
                const firestoreDB = firebase.firestore()
                for (const laudo of laudosPendentes) {
                    try {
                        const payload = {
                            uid: d.uid || 'anonimo',
                            projetoId: d.projetoId || '',
                            projeto: d.projeto || '',
                            tipoTeste: d.tipoTeste || '',
                            operador: d.operador || '',
                            veiculoId: d.veiculoId || '',
                            veiculo: d.veiculo || '',
                            vin: d.vin || '',
                            eja: d.eja || '',
                            cc: d.cc || '',
                            turnoData:
                                d.horaInicio && d.horaInicio.match(/(\d{2})\/(\d{2})\/(\d{4})/)
                                    ? d.horaInicio.match(/(\d{2})\/(\d{2})\/(\d{4})/)[0]
                                    : new Date().toLocaleDateString('pt-BR'),
                            horaRegistro: laudo.timestamp
                                ? new Date(laudo.timestamp).toLocaleTimeString('pt-BR', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                  })
                                : new Date().toLocaleTimeString('pt-BR'),

                            relatoOriginal: laudo.relatoOriginal || '',
                            titulo: laudo.titulo || 'Ocorrência em Aberto',
                            categoria: laudo.categoria || 'Geral',
                            severidade: laudo.severidade || 'N/A',
                            causaRaiz: laudo.causaRaiz || '',
                            parecerFinal: laudo.parecerFinal || '',
                            status: 'finalizado',

                            totalMidias: laudo.fotos ? laudo.fotos.length : 0,
                            totalImagens: laudo.fotos ? laudo.fotos.length : 0,
                            totalVideos: 0,

                            criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
                        }
                        await firestoreDB.collection('vev_issues').add(payload)
                    } catch (err) {
                        console.error('[Turno] Erro ao salvar laudo pendente:', err)
                    }
                }
            }

            if (typeof AnalyticsEngine !== 'undefined') {
                await comTimeout(AnalyticsEngine._salvarTurnoEncerrado(enc), 7000)
                console.log('[Turno] Dados salvos no Firestore.')
            }

            TurnoEngine.encerrar()
            // Notifica coordenador
            await comTimeout(NotificacoesEngine.turnoEncerrado(d, enc), 7000)

            this._dadosEncerramento = enc
            this._turnoEncerradoNestaSessao = true

            this.atualizarBanner()
            this._mostrarBotoesResumo()

            const statusEl = document.getElementById('enc-status-encerramento')
            if (statusEl) {
                statusEl.style.display = 'flex'
                statusEl.innerHTML = `
                    <span class="material-icons" style="color:var(--neon-green);">check_circle</span>
                    <span style="color:var(--neon-green);font-weight:700;">
                        Turno encerrado e salvo com sucesso!
                    </span>
                `
            }

            if (btnEncerrar) {
                btnEncerrar.innerHTML = 'Turno Encerrado'
                btnEncerrar.style.background = 'rgba(34,197,94,0.2)'
                btnEncerrar.style.color = 'var(--neon-green)'
            }

            console.log('[Turno] Fluxo completo de encerramento concluído.')

            // Fecha o modal de encerramento do turno automaticamente após 1 segundo
            setTimeout(() => {
                if (typeof appUI !== 'undefined') {
                    appUI.fecharModal('modal-turno')
                } else {
                    const modal = document.getElementById('modal-turno')
                    if (modal) {
                        modal.style.display = 'none'
                        document.body.style.overflow = 'auto'
                    }
                }
            }, 1000)
        } catch (e) {
            console.error('[Turno] Erro ao encerrar turno:', e)

            if (btnEncerrar) {
                btnEncerrar.disabled = false
                btnEncerrar.innerHTML = `
                    <span class="material-icons">logout</span>
                    ENCERRAR TURNO
                `
            }

            alert('Erro ao salvar. Verifique a conexão e tente novamente.\n\n' + e.message)
        }
    },

    _mostrarBotoesResumo() {
        const container = document.getElementById('enc-botoes-resumo')
        if (!container) return

        container.style.display = 'flex'
        container.style.flexDirection = 'column'
        container.style.gap = '10px'
        container.style.marginTop = '1rem'
    },
}

const HistoricoUI = {
    _diasFiltro: 7,
    _cacheTurnos: null,

    async abrir() {
        document.getElementById('modal-historico-turnos').style.display = 'flex'
        document.body.style.overflow = 'hidden'
        await this.carregar(this._diasFiltro)
    },

    fechar() {
        document.getElementById('modal-historico-turnos').style.display = 'none'
        document.body.style.overflow = 'auto'
    },

    async filtrar(dias, btn) {
        document.querySelectorAll('.btn-filtro-hist').forEach((b) => b.classList.remove('active'))
        btn.classList.add('active')
        this._diasFiltro = dias
        await this.carregar(dias)
    },

    async carregar(dias) {
        const lista = document.getElementById('hist-lista')
        const uid = firebase.auth().currentUser?.uid

        console.log('[HistoricoUI] UID do usuário logado:', uid)
        console.log('[HistoricoUI] Buscando em vev_turnos_encerrados...')

        console.log('[HistoricoUI] Elemento hist-lista:', lista)
        console.log('[HistoricoUI] Elemento hist-totais:', document.getElementById('hist-totais'))

        if (!uid) {
            lista.innerHTML = `
            <div style="text-align:center;padding:2rem;color:var(--text-secondary);">
                Faça login para ver seu histórico
            </div>`
            return
        }

        lista.innerHTML = `
        <div style="text-align:center;padding:2rem;color:var(--text-secondary);">
            <span class="material-icons"
                  style="font-size:2rem;animation:spin 1s linear infinite;">sync</span>
            <div style="margin-top:8px;font-size:0.85rem;">Carregando...</div>
        </div>`

        try {
            console.log('[HistoricoUI] Iniciando query Firestore...')

            const snap = await firebase
                .firestore()
                .collection('vev_turnos_encerrados')
                .where('uid', '==', uid)
                .limit(50)
                .get()

            console.log('[HistoricoUI] Query ok! Total docs:', snap.docs.length)

            let turnos = snap.docs.map((d) => ({ id: d.id, ...d.data() }))

            if (dias !== 'todos') {
                const dataLimite = new Date()
                dataLimite.setDate(dataLimite.getDate() - parseInt(dias))
                turnos = turnos.filter((t) => {
                    const data = t.criadoEm?.toDate ? t.criadoEm.toDate() : null
                    return data && data >= dataLimite
                })
            }

            turnos.sort((a, b) => {
                const da = a.criadoEm?.toDate ? a.criadoEm.toDate() : new Date(0)
                const db = b.criadoEm?.toDate ? b.criadoEm.toDate() : new Date(0)
                return db - da
            })

            console.log('[HistoricoUI] Turnos após filtro:', turnos.length)

            this._cacheTurnos = turnos
            this._renderTotais(turnos)
            this._renderLista(turnos)
        } catch (e) {
            console.error('[HistoricoUI] ERRO COMPLETO:', e)
            console.error('[HistoricoUI] Código:', e.code)
            console.error('[HistoricoUI] Mensagem:', e.message)
            lista.innerHTML = `
            <div style="text-align:center;padding:2rem;color:var(--text-secondary);">
                Erro: ${e.message}
            </div>`
        }
    },
    _renderTotais(turnos) {
        const el = document.getElementById('hist-totais')
        if (!el) return

        const totalKm = turnos.reduce((acc, t) => {
            const trip = (t.kmFinal || 0) - (t.kmInicial || 0)
            return acc + (trip > 0 ? trip : 0)
        }, 0)

        const totalIssues = turnos.reduce((acc, t) => acc + (t.totalIssues || 0), 0)
        const totalTurnos = turnos.length

        el.innerHTML = `
            <div class="hist-total-card">
                <div style="font-size:1.4rem;font-weight:800;color:var(--neon-blue);">
                    ${totalTurnos}
                </div>
                <div style="font-size:0.7rem;color:var(--text-secondary);margin-top:2px;">
                    Turnos
                </div>
            </div>
            <div class="hist-total-card">
                <div style="font-size:1.4rem;font-weight:800;color:var(--neon-green);">
                    ${totalKm.toFixed(0)} km
                </div>
                <div style="font-size:0.7rem;color:var(--text-secondary);margin-top:2px;">
                    KM Total
                </div>
            </div>
            <div class="hist-total-card">
                <div style="font-size:1.4rem;font-weight:800;
                            color:${totalIssues > 0 ? 'orange' : 'var(--text-secondary)'};">
                    ${totalIssues}
                </div>
                <div style="font-size:0.7rem;color:var(--text-secondary);margin-top:2px;">
                    Issues
                </div>
            </div>
        `
    },

    _renderLista(turnos) {
        const el = document.getElementById('hist-lista')
        if (!el) return

        if (!turnos.length) {
            el.innerHTML = `
                <div style="text-align:center;padding:2rem;color:var(--text-secondary);">
                    <span class="material-icons" style="font-size:2.5rem;opacity:0.3;">history</span>
                    <div style="margin-top:8px;font-size:0.85rem;">
                        Nenhum turno encontrado neste período
                    </div>
                </div>`
            return
        }

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
                font-size:0.6rem;font-weight:800;letter-spacing:0.3px;
                color:${cor};background:${bg};border:1px solid ${border};
                padding:1px 4px;border-radius:3px;text-transform:uppercase;
                line-height:1;margin-right:4px;">${env}</span>`
        }

        el.innerHTML = turnos
            .map((t) => {
                const trip = (t.kmFinal || 0) - (t.kmInicial || 0)
                const tripStr = trip > 0 ? `${trip.toFixed(0)} km` : '— km'
                const issues = t.totalIssues || 0

                const data = t.criadoEm?.toDate
                    ? t.criadoEm.toDate().toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                      })
                    : '—'

                const statusIcon =
                    {
                        concluido: '[OK]',
                        parcial: '[Atenção]',
                        interrompido: '[Interrompido]',
                    }[t.statusOperacional] || '—'

                return `
                <div class="hist-card">
                    <div style="display:flex;align-items:center;
                                justify-content:space-between;margin-bottom:8px;gap:8px;">
                        <span style="font-size:0.75rem;font-weight:700;color:var(--neon-blue);white-space:nowrap;">
                            Data: ${data} ${statusIcon}
                        </span>
                        <span style="font-size:0.7rem;color:var(--text-secondary);display:inline-flex;align-items:center;gap:4px;overflow:hidden;text-overflow:ellipsis;">
                            ${obterBadgeAmbienteHTML(t.tipoTeste)}
                            <span>${t.tipoTeste || '—'}</span>
                        </span>
                    </div>
                    <div style="font-size:0.9rem;font-weight:700;
                                color:var(--text-primary);margin-bottom:6px;">
                        Veículo: ${t.veiculo || '—'}
                    </div>
                    <div style="display:flex;gap:16px;flex-wrap:wrap;">
                        <span style="font-size:0.78rem;color:var(--text-secondary);">
                            Distância: <strong style="color:var(--text-primary);">${tripStr}</strong>
                        </span>
                        <span style="font-size:0.78rem;color:var(--text-secondary);">
                            Combustível: <strong style="color:var(--text-primary);">
                                ${t.litros ? t.litros + ' L' : '—'}
                            </strong>
                        </span>
                        <span style="font-size:0.78rem;
                                     color:${issues > 0 ? 'orange' : 'var(--text-secondary)'};">
                            Issues: <strong>${issues} issue${issues !== 1 ? 's' : ''}</strong>
                        </span>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;border-top:1px solid rgba(255,255,255,0.05);padding-top:8px;">
                        <span style="font-size:0.72rem;color:var(--text-secondary);">ID: ${t.id.substring(0, 8)}</span>
                        <button class="btn-primary" onclick="HistoricoUI.baixarPDF('${t.id}')" style="padding:4px 10px;font-size:0.75rem;border-radius:6px;display:inline-flex;align-items:center;gap:4px;cursor:pointer;background:var(--neon-blue);color:#000;border:none;font-weight:600;">
                            <span class="material-icons" style="font-size:0.9rem;">picture_as_pdf</span> PDF
                        </button>
                    </div>
                </div>
            `
            })
            .join('')
    },

    baixarPDF(turnoId) {
        if (!this._cacheTurnos) {
            alert('Erro: Turnos não carregados no cache.')
            return
        }
        const t = this._cacheTurnos.find((item) => item.id === turnoId)
        if (!t) {
            alert('Erro: Turno não encontrado.')
            return
        }

        const { jsPDF } = window.jspdf
        const doc = new jsPDF()

        // Header / Cabeçalho
        doc.setFillColor(15, 23, 42) // slate-900 style
        doc.rect(0, 0, 210, 42, 'F')
        doc.setFillColor(0, 72, 153) // Ford Blue accent line
        doc.rect(0, 0, 4, 42, 'F')
        doc.setTextColor(34, 211, 238) // neon blue style
        doc.setFontSize(13)
        doc.setFont(undefined, 'bold')
        doc.text('FORD VEV — RELATÓRIO DE ENCERRAMENTO DE TURNO', 105, 16, { align: 'center' })
        doc.setFontSize(8)
        doc.setFont(undefined, 'normal')
        doc.setTextColor(180, 190, 200)
        doc.text(
            `ID do Turno: ${t.id}  |  Gerado em: ${new Date().toLocaleString('pt-BR')}`,
            105,
            26,
            { align: 'center' }
        )

        // Section 1: Dados do Turno
        const dataTurno = [
            ['Operador', t.operador || '—', 'Cargo', t.cargo || '—'],
            ['Veículo', t.veiculo || '—', 'VIN', t.vin || '—'],
            ['Tipo de Teste', t.tipoTeste || '—', 'Status Operacional', t.statusOperacional || '—'],
            ['Data', t.data || '—', 'Horário', `${t.horaInicio || '—'} às ${t.horaFim || '—'}`],
        ]

        doc.autoTable({
            startY: 48,
            head: [
                [
                    {
                        content: 'IDENTIFICAÇÃO E DADOS OPERACIONAIS',
                        colSpan: 4,
                        styles: {
                            halign: 'left',
                            fillColor: [0, 72, 153],
                            textColor: [255, 255, 255],
                        },
                    },
                ],
            ],
            body: dataTurno,
            theme: 'grid',
            styles: { fontSize: 8.5 },
            columnStyles: {
                0: { fontStyle: 'bold', fillColor: [245, 247, 250], cellWidth: 35 },
                1: { cellWidth: 65 },
                2: { fontStyle: 'bold', fillColor: [245, 247, 250], cellWidth: 35 },
                3: { cellWidth: 55 },
            },
            margin: { left: 14, right: 14 },
        })

        // Section 2: Abastecimento & Consumo
        const tripVal =
            (parseFloat(String(t.kmFinal).replace(',', '.')) || 0) -
            (parseFloat(String(t.kmInicial).replace(',', '.')) || 0)
        const tripKm = t.tripKm !== undefined ? t.tripKm : tripVal > 0 ? tripVal : 0

        const dataAbastecimento = [
            [
                'Km Inicial',
                t.kmInicial !== undefined ? `${t.kmInicial} km` : '—',
                'Km Final',
                t.kmFinal !== undefined ? `${t.kmFinal} km` : '—',
            ],
            [
                'Distância Total',
                `${tripKm} km`,
                'Consumo Médio',
                t.consumoMedio ? `${t.consumoMedio} km/l` : t.consumo ? `${t.consumo} km/l` : '—',
            ],
            ['Posto', t.posto || '—', 'Litros Abastecidos', t.litros ? `${t.litros} L` : '—'],
            [
                'Valor Pago',
                t.valorPago ? `R$ ${t.valorPago}` : '—',
                'Saldo Disponível',
                t.saldo ? `R$ ${t.saldo}` : '—',
            ],
            [
                'Autonomia',
                t.autonomia ? `${t.autonomia} km` : '—',
                'Temperatura / Clima',
                `${t.temperatura || '—'} / ${t.tempo || '—'}`,
            ],
        ]

        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 8,
            head: [
                [
                    {
                        content: 'INFORMAÇÕES DE DESEMPENHO E ABASTECIMENTO',
                        colSpan: 4,
                        styles: {
                            halign: 'left',
                            fillColor: [0, 72, 153],
                            textColor: [255, 255, 255],
                        },
                    },
                ],
            ],
            body: dataAbastecimento,
            theme: 'grid',
            styles: { fontSize: 8.5 },
            columnStyles: {
                0: { fontStyle: 'bold', fillColor: [245, 247, 250], cellWidth: 35 },
                1: { cellWidth: 65 },
                2: { fontStyle: 'bold', fillColor: [245, 247, 250], cellWidth: 35 },
                3: { cellWidth: 55 },
            },
            margin: { left: 14, right: 14 },
        })

        // Section 3: Métricas & Resultados
        const bodyMetricas = []
        if (t.ciclosR389 !== undefined) bodyMetricas.push(['Ciclos R389 Realizados', t.ciclosR389])
        if (t.lapsFrenagem !== undefined) bodyMetricas.push(['Laps de Frenagem', t.lapsFrenagem])
        if (t.lapsDesaceleracao !== undefined)
            bodyMetricas.push(['Laps de Desaceleração', t.lapsDesaceleracao])
        if (t.kmRodagem !== undefined)
            bodyMetricas.push(['Km Rodado no Teste', `${t.kmRodagem} km`])

        // Adicionar métricas extras de t.metricas se houver
        if (t.metricas && Object.keys(t.metricas).length > 0) {
            const nomesMetricas = {
                ciclos: 'Ciclos realizados',
                laps: 'Quantidade de Laps',
                frenagens: 'Quantidade de Frenagens',
                kmRodado: 'Km rodado no teste',
                tempoExecucao: 'Tempo de execução',
                execucoes: 'Quantidade de execuções',
                observacoes: 'Observações',
            }
            Object.entries(t.metricas).forEach(([chave, valor]) => {
                const label = nomesMetricas[chave] || chave
                bodyMetricas.push([label, valor])
            })
        }

        if (t.problemas) {
            bodyMetricas.push(['Problemas Registrados', t.problemas])
        }

        if (bodyMetricas.length > 0) {
            doc.autoTable({
                startY: doc.lastAutoTable.finalY + 8,
                head: [
                    [
                        {
                            content: 'MÉTRICAS OPERACIONAIS E DADOS DO TESTE',
                            colSpan: 2,
                            styles: {
                                halign: 'left',
                                fillColor: [0, 72, 153],
                                textColor: [255, 255, 255],
                            },
                        },
                    ],
                ],
                body: bodyMetricas,
                theme: 'grid',
                styles: { fontSize: 8.5 },
                columnStyles: {
                    0: { fontStyle: 'bold', fillColor: [245, 247, 250], cellWidth: 70 },
                    1: { cellWidth: 112 },
                },
                margin: { left: 14, right: 14 },
            })
        }

        // Section 4: Laudos / Ocorrências Técnicas
        const laudos = t.laudos || []
        if (laudos.length > 0) {
            const bodyLaudos = laudos.map((l) => [
                l.hora || '—',
                l.categoria || '—',
                l.severidade ? l.severidade.toUpperCase() : '—',
                l.descricao || '—',
            ])

            doc.autoTable({
                startY: doc.lastAutoTable.finalY + 8,
                head: [
                    [
                        {
                            content: 'OCORRÊNCIAS / LAUDOS TÉCNICOS REGISTRADOS',
                            colSpan: 4,
                            styles: {
                                halign: 'left',
                                fillColor: [153, 27, 27],
                                textColor: [255, 255, 255],
                            },
                        },
                    ],
                    ['HORA', 'CATEGORIA', 'SEVERIDADE', 'DESCRIÇÃO'],
                ],
                body: bodyLaudos,
                theme: 'grid',
                styles: { fontSize: 8 },
                headStyles: { fillColor: [50, 50, 50] },
                columnStyles: {
                    0: { cellWidth: 20 },
                    1: { cellWidth: 40 },
                    2: { cellWidth: 30, fontStyle: 'bold' },
                    3: { cellWidth: 92 },
                },
                margin: { left: 14, right: 14 },
            })
        }

        // Rodapé
        const totalPaginas = doc.internal.getNumberOfPages()
        for (let i = 1; i <= totalPaginas; i++) {
            doc.setPage(i)
            doc.setFontSize(7)
            doc.setTextColor(150, 150, 150)
            doc.text(
                `Ford VEV - Central Operacional  |  Página ${i} de ${totalPaginas}`,
                105,
                287,
                { align: 'center' }
            )
        }

        const cleanVeiculo = (t.veiculo || 'Turno').replace(/\s+/g, '_')
        const dataDoc = t.data
            ? t.data.replace(/\//g, '-')
            : new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')
        doc.save(`Laudo_Ford_${cleanVeiculo}_${dataDoc}.pdf`)
    },
}

window.HistoricoUI = HistoricoUI

// ─────────────────────────────────────────────────────────
// Redireciona o histórico antigo para o novo HistoricoUI
// ─────────────────────────────────────────────────────────
if (typeof app !== 'undefined') {
    app.abrirModalHistorico = function () {
        HistoricoUI.abrir()
    }
}

// ─────────────────────────────────────────────────────────────
// 4. INTERCEPTAR abertura do modal-turno
// ─────────────────────────────────────────────────────────────
const _abrirOriginal = appUI.abrirModal.bind(appUI)

appUI.abrirModal = function (id) {
    if (id === 'modal-turno') {
        if (!TurnoEngine.dados) {
            alert('Atenção: Nenhum turno ativo para encerrar.')
            return
        }
        TurnoUI.prepararModal()
    }

    if (id === 'modal-laudo') {
        // Popular campos de contexto do laudo com dados do turno ativo
        const d = TurnoEngine.dados
        const setTxt = (elId, val) => {
            const el = document.getElementById(elId)
            if (el) el.innerText = val || '-'
        }
        const semTurno = document.getElementById('laudo-ctx-sem-turno')
        const painel = document.getElementById('laudo-ctx-painel')

        if (d) {
            if (semTurno) semTurno.style.display = 'none'
            if (painel) painel.style.display = 'block'
            setTxt('laudo-ctx-projeto', d.projeto)
            setTxt('laudo-ctx-teste', d.tipoTeste)
            setTxt('laudo-ctx-operador', d.operador)
            setTxt('laudo-ctx-veiculo', d.veiculo)
            setTxt('laudo-ctx-vin', d.vin)
            setTxt('laudo-ctx-data', new Date().toLocaleString('pt-BR'))
        } else {
            if (semTurno) semTurno.style.display = 'flex'
            if (painel) painel.style.display = 'none'
        }

        // Popular analista no laudo
        const analistaEl = document.getElementById('ui-analista-laudo')
        if (analistaEl) {
            const nome = d?.operador || (typeof app !== 'undefined' ? app.operadorAtual : '') || ''
            analistaEl.innerText = nome
        }
    }

    _abrirOriginal(id)
}

// ─────────────────────────────────────────────────────────────
// 5. SEED + BANNER + SINCRONIZAÇÃO
// ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    PreCadastroEngine.seedDefaults()

    if (typeof DadosMestres !== 'undefined') {
        try {
            await DadosMestres.sincronizar()
            console.log('[DadosMestres] Dados mestres sincronizados.')
        } catch (e) {
            console.warn('[DadosMestres] Falha ao sincronizar:', e)
        }
    }

    TurnoUI.atualizarBanner()
    TurnoEngine.sincronizarComApp()

    setTimeout(async () => {
        await TurnoUI._sincronizarFormsData()
    }, 500)

    // Ativa GPS de rodagem livre automaticamente se o turno já estiver ativo (desativado por solicitação do usuário)
    // setTimeout(() => {
    //     if (TurnoEngine.dados && typeof window.toggleCopilotoModo !== 'undefined' && typeof window.rastreadorGpsID !== 'undefined' && window.rastreadorGpsID === null) {
    //         window.toggleCopilotoModo('RODAGEM', 'rota-livre');
    //     }
    // }, 1500);
})

// ─────────────────────────────────────────────────────────────
// CONTROLADOR DE CONFIGURAÇÕES E AUDITORIA DE SEGURANÇA — v4.10
// ─────────────────────────────────────────────────────────────
const ConfiguracoesSistemaUI = {
    _configCache: {
        masterEmail: 'gerencia.tatui@ford.com',
        notificarLiquidos: true,
    },

    async abrir() {
        const modal = document.getElementById('modal-configuracoes-sistema')
        if (!modal) return

        modal.style.display = 'flex'
        document.body.style.overflow = 'hidden'

        // Carregar do Firestore
        try {
            const doc = await firebase
                .firestore()
                .collection('vev_configuracoes_globais')
                .doc('parametros')
                .get()

            if (doc.exists) {
                this._configCache = doc.data()
            } else {
                // Seed inicial se não existir
                await firebase
                    .firestore()
                    .collection('vev_configuracoes_globais')
                    .doc('parametros')
                    .set(this._configCache)
            }
        } catch (e) {
            console.warn('[Config] Erro ao carregar configurações do Firestore, usando locais:', e)
        }

        // Popular os campos
        const emailEl = document.getElementById('config-master-email')
        if (emailEl) emailEl.value = this._configCache.masterEmail || ''

        const notifyEl = document.getElementById('config-notify-liquids')
        if (notifyEl) notifyEl.checked = !!this._configCache.notificarLiquidos

        // Carregar Logs de Segurança
        await this.carregarLogsSeguranca()
    },

    fechar() {
        const modal = document.getElementById('modal-configuracoes-sistema')
        if (modal) {
            modal.style.display = 'none'
            document.body.style.overflow = 'auto'
        }
    },

    async salvar() {
        const emailEl = document.getElementById('config-master-email')
        const email = emailEl?.value.trim()

        const notifyEl = document.getElementById('config-notify-liquids')
        const notify = notifyEl ? notifyEl.checked : true

        if (!email) {
            alert('O e-mail da gerência é obrigatório.')
            return
        }

        const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!regexEmail.test(email)) {
            alert('Formato de e-mail inválido.')
            return
        }

        const user = firebase.auth().currentUser
        let editorNome = 'Usuário Desconhecido'
        let editorCargo = 'Gerente'

        try {
            if (user) {
                const userDoc = await firebase
                    .firestore()
                    .collection('vev_usuarios')
                    .doc(user.uid)
                    .get()
                if (userDoc.exists) {
                    editorNome = userDoc.data().nome || user.email
                    editorCargo = userDoc.data().cargo || 'Gerente'
                }
            }
        } catch (e) {
            console.warn('[Config] Erro ao carregar perfil do usuário para log:', e)
        }

        const novosParametros = {
            masterEmail: email,
            notificarLiquidos: notify,
            atualizadoEm: firebase.firestore.FieldValue.serverTimestamp(),
            atualizadoPor: editorNome,
        }

        try {
            // 1. Salvar novos parâmetros globais no Firestore
            await firebase
                .firestore()
                .collection('vev_configuracoes_globais')
                .doc('parametros')
                .set(novosParametros, { merge: true })

            this._configCache = { masterEmail: email, notificarLiquidos: notify }

            // 2. Gravar Log de Auditoria de Segurança
            await firebase
                .firestore()
                .collection('vev_logs_seguranca')
                .add({
                    uid: user?.uid || 'desconhecido',
                    operador: editorNome,
                    cargo: editorCargo,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    acao: 'Alteração de configurações globais',
                    detalhes: {
                        masterEmail: email,
                        notificarLiquidos: notify,
                    },
                })

            // 3. Exibir Toast Notification Premium
            if (typeof Toast !== 'undefined') {
                Toast.show('Configurações globais salvas com sucesso!')
            } else {
                alert('Configurações salvas com sucesso!')
            }

            // Recarregar os logs na tela
            await this.carregarLogsSeguranca()
        } catch (e) {
            console.error('[Config] Erro ao salvar configurações:', e)
            if (typeof Toast !== 'undefined') {
                Toast.show('Erro ao salvar as configurações.', 'error')
            } else {
                alert('Erro ao salvar.')
            }
        }
    },

    async carregarLogsSeguranca() {
        const el = document.getElementById('config-logs-corpo')
        if (!el) return

        try {
            const snap = await firebase
                .firestore()
                .collection('vev_logs_seguranca')
                .orderBy('timestamp', 'desc')
                .limit(10)
                .get()

            if (snap.empty) {
                el.innerHTML = `
                    <tr>
                        <td colspan="3" style="text-align:center; padding:15px; color:var(--text-secondary); font-size:0.78rem;">
                            Nenhum log de segurança registrado
                        </td>
                    </tr>`
                return
            }

            el.innerHTML = snap.docs
                .map((doc) => {
                    const data = doc.data()
                    const ts = data.timestamp?.toDate ? data.timestamp.toDate() : new Date()
                    const dataStr =
                        ts.toLocaleDateString('pt-BR') +
                        ' ' +
                        ts.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

                    let alteracoes = []
                    if (data.detalhes) {
                        if (data.detalhes.masterEmail)
                            alteracoes.push(`E-mail: ${data.detalhes.masterEmail}`)
                        if (data.detalhes.notificarLiquidos !== undefined) {
                            alteracoes.push(
                                `Alertas fluidos: ${data.detalhes.notificarLiquidos ? 'ON' : 'OFF'}`
                            )
                        }
                    }
                    const detalhesStr = alteracoes.join(' · ') || data.acao || 'Alteração'

                    return `
                    <tr style="border-bottom: 1px solid var(--border-glass, rgba(255,255,255,0.05)); font-size:0.75rem;">
                        <td style="padding:8px 10px; color:var(--text-primary); font-weight:600;">${data.operador || '—'}</td>
                        <td style="padding:8px 10px; color:var(--text-secondary);">${detalhesStr}</td>
                        <td style="padding:8px 10px; color:var(--text-secondary); text-align:right; font-family:'Roboto Mono',monospace;">${dataStr}</td>
                    </tr>
                `
                })
                .join('')
        } catch (e) {
            console.warn('[Config] Erro ao carregar logs:', e)
            el.innerHTML = `
                <tr>
                    <td colspan="3" style="text-align:center; padding:15px; color:var(--text-secondary); font-size:0.78rem;">
                        Não foi possível carregar o histórico de segurança
                    </td>
                </tr>`
        }
    },
}
