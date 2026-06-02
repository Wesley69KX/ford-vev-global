// ─────────────────────────────────────────────────────────────
// FASE 3 — ANALYTICS ENGINE
// Ford VEV · TPG Insight AI · Campo de Provas Tatuí
// ─────────────────────────────────────────────────────────────
const AnalyticsEngine = {
    _periodo: 7,
    _dados: [],
    _cargoAtual: 'Analista',

    // ─────────────────────────────────────────────────────────
    // Abre o modal e carrega os dados conforme perfil
    // ─────────────────────────────────────────────────────────
    async abrir() {
        const cargo = this._obterCargoAtual();

        this._cargoAtual = cargo;

        // Título dinâmico por cargo
        const titulo = document.getElementById('anl-titulo-cargo');

        if (titulo) {
            if (cargo === 'Gerente') {
                titulo.innerText = '📊 Visão Gerencial — Consolidado da Equipe';
            } else if (cargo === 'Coordenador') {
                titulo.innerText = '📊 Analytics — Desempenho Operacional da Equipe';
            } else {
                titulo.innerText = '📊 Analytics — TPG Insight AI';
            }
        }

        appUI.abrirModal('modal-analytics');

        await this.carregar(cargo);
    },

    // ─────────────────────────────────────────────────────────
    // Identifica cargo atual
    // ─────────────────────────────────────────────────────────
    _obterCargoAtual() {
        if (typeof RoleEngine !== 'undefined' && RoleEngine.perfil?.cargo) {
            return RoleEngine.perfil.cargo;
        }

        return localStorage.getItem('app_vev_cargo') || 'Analista';
    },

    // ─────────────────────────────────────────────────────────
    // Define período e recarrega dados
    // ─────────────────────────────────────────────────────────
    async setPeriodo(dias, btn) {
        document.querySelectorAll('.analytics-periodo-btn')
            .forEach(b => b.classList.remove('active'));

        if (btn) btn.classList.add('active');

        this._periodo = dias;

        await this.carregar(this._cargoAtual || this._obterCargoAtual());
    },

    // ─────────────────────────────────────────────────────────
    // Busca dados no Firestore
    // ─────────────────────────────────────────────────────────
    async carregar(cargo) {
        this._mostrarLoading(true);
        this._mostrarVazio(false);

        try {
            const db = firebase.firestore();

            const dataLimite = new Date();
            dataLimite.setDate(dataLimite.getDate() - this._periodo);

            const snap = await db.collection('vev_turnos_encerrados')
                .where('dataEncerramento', '>=', dataLimite)
                .orderBy('dataEncerramento', 'desc')
                .get();

            this._dados = snap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            if (this._dados.length === 0) {
                this._limparDashboard();
                this._mostrarVazio(true);
                this._mostrarLoading(false);
                return;
            }

            this._mostrarVazio(false);
            this._renderizar(cargo || this._obterCargoAtual());

        } catch (e) {
            console.error('[Analytics] Erro ao carregar dados:', e);
            alert('Erro ao carregar dados do Analytics. Verifique a conexão ou os índices do Firestore.');
        }

        this._mostrarLoading(false);
    },

    // ─────────────────────────────────────────────────────────
    // Renderiza dashboard conforme perfil
    // Coordenador: visão equipe/analistas/testes
    // Gerente: visão equipe + KPIs gerenciais macro
    // ─────────────────────────────────────────────────────────
    async _renderizar(cargo) {
        const dados = this._dados || [];

        // ── Cards de resumo ─────────────────────────────────
        const totalKm = dados.reduce((s, d) =>
            s + (parseFloat(d.trip) || 0), 0);

        const totalTurnos = dados.length;

        const totalIssues = dados.reduce((s, d) =>
            s + (parseInt(d.issues) || 0), 0);

        const totalLitros = dados.reduce((s, d) =>
            s + (parseFloat(d.litros) || 0), 0);

        this._setCard(
            'anl-total-km',
            `${totalKm.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} km`
        );

        this._setCard('anl-total-turnos', `${totalTurnos}`);
        this._setCard('anl-total-issues', `${totalIssues}`);

        this._setCard(
            'anl-total-litros',
            `${totalLitros.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L`
        );

        // ── Km por Projeto ──────────────────────────────────
        const kmPorProjeto = {};

        dados.forEach(d => {
            const projeto = d.projeto || 'Sem Projeto';
            kmPorProjeto[projeto] = (kmPorProjeto[projeto] || 0) + (parseFloat(d.trip) || 0);
        });

        this._renderBarras(
            'anl-grafico-projetos',
            kmPorProjeto,
            'km',
            'var(--neon-purple)'
        );

        // ── Tipos de Teste mais executados ──────────────────
const testesExecutados = {};

dados.forEach(d => {
    // IMPORTANTE: buscar tipoTeste, não projeto
    const teste = d.tipoTeste
        || d.tipoteste
        || d.tipoTestePista
        || null;

    // IGNORA se for nome de projeto (proteção extra)
    const projetosConhecidos = dados
        .map(x => x.projeto)
        .filter(Boolean);

    if (!teste || projetosConhecidos.includes(teste)) return;

    testesExecutados[teste] = (testesExecutados[teste] || 0) + 1;
});

this._renderBarras(
    'anl-grafico-testes',
    testesExecutados,
    'turnos',
    'var(--neon-cyan)'
);


        // ── Km por Veículo ──────────────────────────────────
        const kmPorVeiculo = {};

        dados.forEach(d => {
            const veiculo = d.veiculo || 'Sem Veículo';
            kmPorVeiculo[veiculo] = (kmPorVeiculo[veiculo] || 0) + (parseFloat(d.trip) || 0);
        });

        this._renderBarras(
            'anl-grafico-veiculos',
            kmPorVeiculo,
            'km',
            'var(--neon-blue)'
        );

        // ── Estatísticas por operador ───────────────────────
        const opStats = {};

        dados.forEach(d => {
            const operador = d.operador || 'Desconhecido';

            if (!opStats[operador]) {
                opStats[operador] = {
                    turnos: 0,
                    km: 0,
                    issues: 0,
                    testes: {},
                    ciclos: 0,
                    laps: 0,
                    frenagens: 0,
                    execucoes: 0
                };
            }

            opStats[operador].turnos++;
            opStats[operador].km += parseFloat(d.trip) || 0;
            opStats[operador].issues += parseInt(d.issues) || 0;

            const teste = d.tipoTeste || d.tipoteste || d.tipoTestePista || '';

            if (teste) {
                opStats[operador].testes[teste] =
                    (opStats[operador].testes[teste] || 0) + 1;
            }

            const metricas = d.metricas || {};

            opStats[operador].ciclos += parseFloat(metricas.ciclos) || 0;
            opStats[operador].laps += parseFloat(metricas.laps) || 0;
            opStats[operador].frenagens += parseFloat(metricas.frenagens) || 0;
            opStats[operador].execucoes += parseFloat(metricas.execucoes) || 0;
        });

        this._renderTabelaOperadores('anl-tabela-operadores', opStats);
        
        // ── KPIs exclusivos do Gerente ──────────────────────────
    if (cargo === 'Gerente') {
        this._renderKPIsGerente(dados, opStats);
    } else {
        this._ocultarKPIsGerente();
    }

    // ── Buscar Issues reais do Firestore ────────────────────
    try {
        const db = firebase.firestore();
        const dataLimite = new Date();
        dataLimite.setDate(dataLimite.getDate() - this._periodo);

        const snapIssues = await db.collection('vev_issues')
            .where('criadoEm', '>=', dataLimite)
            .get();

        const issues = snapIssues.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Atualiza card com total real
        this._setCard('anl-total-issues', `${issues.length}`);

        // Issues por Projeto
        const issuesPorProjeto = {};
        issues.forEach(issue => {
            const projeto = issue.projeto || 'Sem Projeto';
            issuesPorProjeto[projeto] = (issuesPorProjeto[projeto] || 0) + 1;
        });

        this._renderBarras(
            'anl-grafico-issues',
            issuesPorProjeto,
            'issues',
            '#ef4444'
        );

    } catch (e) {
        console.warn('[Analytics] Issues não carregados:', e);
    }

    },

    // ─────────────────────────────────────────────────────────
    // Renderiza gráfico de barras horizontal
    // ─────────────────────────────────────────────────────────
    _renderBarras(containerId, dados, unidade, cor) {
        const el = document.getElementById(containerId);

        if (!el) return;

        const sorted = Object.entries(dados || {})
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6);

        if (sorted.length === 0) {
            el.innerHTML = `
                <p style="color:var(--text-secondary);font-size:0.8rem;text-align:center;">
                    Sem dados
                </p>
            `;
            return;
        }

        const maximo = sorted[0][1] || 1;

        el.innerHTML = sorted.map(([label, valor]) => {
            const pct = maximo > 0 ? (valor / maximo) * 100 : 0;
            const valorFormatado = this._formatarValorGrafico(valor, unidade);

            return `
                <div class="anl-barra-row">
                    <span class="anl-barra-label" title="${this._escapeHtml(label)}">
                        ${this._escapeHtml(label)}
                    </span>

                    <div class="anl-barra-track">
                        <div class="anl-barra-fill"
                             style="width:${pct}%;background:${cor};">
                        </div>
                    </div>

                    <span class="anl-barra-valor">${valorFormatado}</span>
                </div>
            `;
        }).join('');
    },

    // ─────────────────────────────────────────────────────────
    // Formata valores dos gráficos
    // ─────────────────────────────────────────────────────────
    _formatarValorGrafico(valor, unidade) {
        const n = parseFloat(valor) || 0;

        if (unidade === 'km') {
            return `${n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} km`;
        }

        if (unidade === 'turnos') {
            return `${n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} turno(s)`;
        }

        if (unidade === 'L' || unidade === 'litros') {
            return `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L`;
        }

        return `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${unidade || ''}`;
    },

    // ─────────────────────────────────────────────────────────
    // Renderiza tabela de operadores
    // ─────────────────────────────────────────────────────────
    _renderTabelaOperadores(containerId, opStats) {
        const el = document.getElementById(containerId);

        if (!el) return;

        const sorted = Object.entries(opStats || {})
            .sort((a, b) => b[1].km - a[1].km);

        if (sorted.length === 0) {
            el.innerHTML = `
                <p style="color:var(--text-secondary);font-size:0.8rem;text-align:center;">
                    Sem dados
                </p>
            `;
            return;
        }

        el.innerHTML = `
            <table class="anl-tabela">
                <thead>
                    <tr>
                        <th>Operador</th>
                        <th>Turnos</th>
                        <th>Km Total</th>
                        <th>Especialidade</th>
                        <th>Issues</th>
                    </tr>
                </thead>

                <tbody>
                    ${sorted.map(([nome, s], idx) => {
                        const especialidade = this._obterEspecialidade(s.testes);

                        return `
                            <tr>
                                <td>
                                    ${idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : ''}
                                    ${this._escapeHtml(nome)}
                                </td>

                                <td>${s.turnos}</td>

                                <td>
                                    ${s.km.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} km
                                </td>

                                <td>${this._escapeHtml(especialidade)}</td>

                                <td>${s.issues}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    },

    // ─────────────────────────────────────────────────────────
    // Identifica especialidade operacional do analista
    // ─────────────────────────────────────────────────────────
    _obterEspecialidade(testes) {
        const entradas = Object.entries(testes || {});

        if (entradas.length === 0) return '—';

        const top = entradas.sort((a, b) => b[1] - a[1])[0];

        return top ? top[0] : '—';
    },

    // ─────────────────────────────────────────────────────────
    // KPIs exclusivos para Gerente
    // ─────────────────────────────────────────────────────────
    _renderKPIsGerente(dados, opStats) {
        const container = document.getElementById('anl-kpis-gerente');

        if (!container) return;

        container.style.display = 'block';

        const totalKm = dados.reduce((s, d) =>
            s + (parseFloat(d.trip) || 0), 0);

        const mediaKmTurno = dados.length > 0
            ? totalKm / dados.length
            : 0;

        const topOp = Object.entries(opStats || {})
            .sort((a, b) => b[1].km - a[1].km)[0];

        const veiculos = {};
        dados.forEach(d => {
            const veiculo = d.veiculo || 'N/A';
            veiculos[veiculo] = (veiculos[veiculo] || 0) + 1;
        });

        const topVeiculo = Object.entries(veiculos)
            .sort((a, b) => b[1] - a[1])[0];

        const projetos = {};
        dados.forEach(d => {
            const projeto = d.projeto || 'N/A';
            projetos[projeto] = (projetos[projeto] || 0) + (parseFloat(d.trip) || 0);
        });

        const topProjeto = Object.entries(projetos)
            .sort((a, b) => b[1] - a[1])[0];

        const testes = {};
        dados.forEach(d => {
            const teste = d.tipoTeste || d.tipoteste || d.tipoTestePista || 'Não informado';
            testes[teste] = (testes[teste] || 0) + 1;
        });

        const topTeste = Object.entries(testes)
            .sort((a, b) => b[1] - a[1])[0];

        container.innerHTML = `
            <div class="analytics-section">
                <div class="analytics-section-title">
                    📈 KPIs Gerenciais
                </div>

                <div class="analytics-cards-grid" style="grid-template-columns:repeat(2,1fr);">

                    <div class="analytics-card">
                        <span class="material-icons" style="color:var(--neon-green);">
                            trending_up
                        </span>
                        <div class="analytics-card-valor">
                            ${mediaKmTurno.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km
                        </div>
                        <div class="analytics-card-label">
                            Média Km/Turno
                        </div>
                    </div>

                    <div class="analytics-card">
                        <span class="material-icons" style="color:gold;">
                            emoji_events
                        </span>
                        <div class="analytics-card-valor" style="font-size:1rem;">
                            ${topOp ? this._escapeHtml(topOp[0].split(' ')[0]) : '—'}
                        </div>
                        <div class="analytics-card-label">
                            Top Analista
                        </div>
                    </div>

                    <div class="analytics-card">
                        <span class="material-icons" style="color:var(--neon-blue);">
                            directions_car
                        </span>
                        <div class="analytics-card-valor" style="font-size:0.85rem;">
                            ${topVeiculo ? this._escapeHtml(topVeiculo[0]) : '—'}
                        </div>
                        <div class="analytics-card-label">
                            Veículo Mais Usado
                        </div>
                    </div>

                    <div class="analytics-card">
                        <span class="material-icons" style="color:var(--neon-purple);">
                            folder_special
                        </span>
                        <div class="analytics-card-valor" style="font-size:0.85rem;">
                            ${topProjeto ? this._escapeHtml(topProjeto[0]) : '—'}
                        </div>
                        <div class="analytics-card-label">
                            Projeto Líder
                        </div>
                    </div>

                    <div class="analytics-card">
                        <span class="material-icons" style="color:var(--neon-cyan);">
                            science
                        </span>
                        <div class="analytics-card-valor" style="font-size:0.85rem;">
                            ${topTeste ? this._escapeHtml(topTeste[0]) : '—'}
                        </div>
                        <div class="analytics-card-label">
                            Teste Mais Executado
                        </div>
                    </div>

                    <div class="analytics-card">
                        <span class="material-icons" style="color:var(--neon-orange);">
                            groups
                        </span>
                        <div class="analytics-card-valor">
                            ${Object.keys(opStats || {}).length}
                        </div>
                        <div class="analytics-card-label">
                            Analistas Ativos
                        </div>
                    </div>

                </div>
            </div>
        `;
    },

    // ─────────────────────────────────────────────────────────
    // Oculta KPIs de gerente quando cargo não for Gerente
    // ─────────────────────────────────────────────────────────
    _ocultarKPIsGerente() {
        const container = document.getElementById('anl-kpis-gerente');

        if (container) {
            container.style.display = 'none';
            container.innerHTML = '';
        }
    },

    // ─────────────────────────────────────────────────────────
    // Limpa dashboard quando não há dados
    // ─────────────────────────────────────────────────────────
    _limparDashboard() {
        this._setCard('anl-total-km', '—');
        this._setCard('anl-total-turnos', '—');
        this._setCard('anl-total-issues', '—');
        this._setCard('anl-total-litros', '—');

        [
            'anl-grafico-projetos',
            'anl-grafico-testes',
            'anl-grafico-veiculos',
            'anl-tabela-operadores'
        ].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = '';
        });

        this._ocultarKPIsGerente();
    },

    // ─────────────────────────────────────────────────────────
    // Helpers visuais
    // ─────────────────────────────────────────────────────────
    _setCard(id, valor) {
        const el = document.getElementById(id);

        if (el) el.innerText = valor;
    },

    _mostrarLoading(show) {
        const el = document.getElementById('anl-loading');

        if (el) el.style.display = show ? 'block' : 'none';
    },

    _mostrarVazio(show) {
        const el = document.getElementById('anl-vazio');

        if (el) el.style.display = show ? 'block' : 'none';

        [
            'anl-grafico-projetos',
            'anl-grafico-testes',
            'anl-grafico-veiculos',
            'anl-tabela-operadores'
        ].forEach(id => {
            const el2 = document.getElementById(id);

            if (el2) {
                el2.style.display = show ? 'none' : 'block';
            }
        });

        if (show) {
            this._ocultarKPIsGerente();
        }
    },

    // ─────────────────────────────────────────────────────────
    // Salva turno encerrado no Firestore para Analytics
    // Também cria sessão de teste em vev_sessoes_teste
    // ─────────────────────────────────────────────────────────
    async _salvarTurnoEncerrado(enc) {
        try {
            const d = TurnoEngine.dados || {};
            const trip = TurnoEngine.calcTrip(enc.kmFinal);
            const db = firebase.firestore();

            const metricas = enc.metricas || {};

            const payloadTurno = {
                uid: d.uid || firebase.auth().currentUser?.uid || '',
                operador: d.operador || '',

                projetoId: d.projetoId || '',
                projeto: d.projeto || d.tipoTeste || '',

                tipoTesteId: d.tipoTesteId || '',
                tipoTeste: d.tipoTeste || '',
                tipoteste: d.tipoTeste || '',

                veiculoId: d.veiculoId || '',
                veiculo: d.veiculo || '',

                vin: d.vin || '',
                eja: d.eja || '',
                cc: d.cc || '',
                outrasInfo: d.outrasInfo || '',

                kmInicial: parseFloat(d.kmInicial) || 0,
                kmFinal: parseFloat(enc.kmFinal) || 0,
                trip: parseFloat(trip) || 0,

                litros: parseFloat(enc.litros) || 0,
                posto: enc.posto || '',
                valorPago: parseFloat(enc.valorPago) || 0,
                saldo: parseFloat(enc.saldo) || 0,
                autonomia: parseFloat(enc.autonomia) || 0,
                consumo: parseFloat(enc.consumo) || 0,
                temperatura: enc.temperatura || '',
                tempo: enc.tempo || '',

                metricas,
                problemas: enc.problemas || '',
                statusOperacional: enc.statusOperacional || 'concluido',

                issues: 0,
                horaInicio: d.horaInicio || '',

                turnoData: new Date().toISOString().split('T')[0],
                dataEncerramento: firebase.firestore.FieldValue.serverTimestamp(),
                criadoEm: firebase.firestore.FieldValue.serverTimestamp()
            };

            const turnoRef = await db.collection('vev_turnos_encerrados')
                .add(payloadTurno);

            // Sessão de teste — estrutura preparada para dashboards futuros
            await db.collection('vev_sessoes_teste').add({
                turnoId: turnoRef.id,

                uid: payloadTurno.uid,
                operador: payloadTurno.operador,

                projetoId: payloadTurno.projetoId,
                projeto: payloadTurno.projeto,

                tipoTesteId: payloadTurno.tipoTesteId,
                tipoTeste: payloadTurno.tipoTeste,

                veiculoId: payloadTurno.veiculoId,
                veiculo: payloadTurno.veiculo,

                vin: payloadTurno.vin,
                eja: payloadTurno.eja,
                cc: payloadTurno.cc,

                data: payloadTurno.turnoData,

                ciclos: parseFloat(metricas.ciclos) || 0,
                laps: parseFloat(metricas.laps) || 0,
                frenagens: parseFloat(metricas.frenagens) || 0,
                execucoes: parseFloat(metricas.execucoes) || 0,
                kmRodado: parseFloat(metricas.kmRodado) || parseFloat(trip) || 0,
                tempoExecucao: metricas.tempoExecucao || enc.tempo || '',

                metricas,
                observacoes: metricas.observacoes || '',
                problemas: enc.problemas || '',
                status: enc.statusOperacional || 'concluido',

                criadoEm: firebase.firestore.FieldValue.serverTimestamp()
            });

            console.log('[Analytics] Turno e sessão de teste salvos com sucesso.');

        } catch (e) {
            console.warn('[Analytics] Falha ao salvar turno encerrado:', e);
        }
    },

    // ─────────────────────────────────────────────────────────
    // Segurança simples para textos renderizados no HTML
    // ─────────────────────────────────────────────────────────
    _escapeHtml(texto) {
        return String(texto || '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }
};