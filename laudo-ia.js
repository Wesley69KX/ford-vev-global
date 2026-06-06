// ─────────────────────────────────────────────────────────────
// LAUDO IA — Smart Laudo IA
// Ford VEV · TPG Insight AI · Campo de Provas Tatuí
// ─────────────────────────────────────────────────────────────

// Voice recording feature removed (typing only).

// ─────────────────────────────────────────────────────────────
// 2. CONTEXTO DO TURNO ATIVO
// ─────────────────────────────────────────────────────────────
const LaudoContexto = {

    // Retorna dados do turno ativo para herdar no laudo
    obterDoTurno() {
        const d = (typeof TurnoEngine !== 'undefined')
            ? TurnoEngine.dados
            : null;

        if (!d) {
            return {
                projeto:   (typeof app !== 'undefined' && app.projetoAtual) || 'N/A',
                tipoTeste: (typeof app !== 'undefined' && app.testeAtual) || 'N/A',
                operador:  (typeof app !== 'undefined' && app.operadorAtual) || localStorage.getItem('app_vev_operador') || 'N/A',
                veiculo:   (typeof app !== 'undefined' && app.veiculoAtual) || localStorage.getItem('app_vev_veiculo') || 'N/A',
                vin:       (typeof app !== 'undefined' && app.vinGlobal) || 'N/A',
                eja:       '',
                cc:        '',
                uid:       firebase.auth().currentUser?.uid || 'anonimo',
                turnoData: (typeof app !== 'undefined' ? app.obterDataDoTurno() : new Date().toISOString().split('T')[0]),
                horaAtual: new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
            };
        }

        return {
            projetoId:  d.projetoId  || '',
            projeto:    d.projeto    || d.tipoTeste || '',
            tipoTeste:  d.tipoTeste  || '',
            operador:   d.operador   || '',
            veiculo:    d.veiculo    || '',
            veiculoId:  d.veiculoId  || '',
            vin:        d.vin        || '',
            eja:        d.eja        || '',
            cc:         d.cc         || '',
            uid:        d.uid        || firebase.auth().currentUser?.uid || '',
            turnoData:  (typeof app !== 'undefined' ? app.obterDataDoTurno() : new Date().toISOString().split('T')[0]),
            horaAtual:  new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
            kmInicial:  d.kmInicial  || '',
            horaInicio: d.horaInicio || '',
        };
    },

    // Preenche o painel de contexto no topo do modal
    preencherPainel() {
        const ctx = this.obterDoTurno();

        const set = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.innerText = val || '—';
        };

        set('laudo-ctx-projeto',   ctx.projeto);
        set('laudo-ctx-teste',     ctx.tipoTeste);
        set('laudo-ctx-operador',  ctx.operador);
        set('laudo-ctx-veiculo',   ctx.veiculo);
        set('laudo-ctx-vin',       ctx.vin);
        set('laudo-ctx-eja',       ctx.eja);
        set('laudo-ctx-cc',        ctx.cc);
        set('laudo-ctx-data',
            `${ctx.turnoData} ${ctx.horaAtual}`);

        // Alerta visual se não houver turno ativo
        const alerta = document.getElementById('laudo-ctx-sem-turno');
        const painel = document.getElementById('laudo-ctx-painel');

        if (!ctx.projeto && !ctx.operador) {
            if (alerta) alerta.style.display = 'flex';
            if (painel) painel.style.opacity = '0.5';
        } else {
            if (alerta) alerta.style.display = 'none';
            if (painel) painel.style.opacity = '1';
        }
    }
};

// ─────────────────────────────────────────────────────────────
// 3. IA ENGINE
// ─────────────────────────────────────────────────────────────
const IAEngine = {
    // MOCK_LOCAL = análise por palavras-chave (sem API)
    // FORDLLM_OFICIAL = requer credenciais corporativas
    provider: 'MOCK_LOCAL',

    setProvider(valor) {
        this.provider = valor;
        console.log(`[IAEngine] Provider: ${valor}`);
        this._atualizarBadgeProvider();
    },

    _atualizarBadgeProvider() {
        const badge = document.getElementById('ia-provider-badge-header');
        if (!badge) return;

        const config = {
            MOCK_LOCAL: {
                label: 'MOCK LOCAL',
                style: 'background:rgba(59,130,246,0.15);color:#60a5fa;border-color:#3b82f6;'
            },
            FORDLLM_OFICIAL: {
                label: 'FordLLM Oficial',
                style: 'background:rgba(34,197,94,0.15);color:#4ade80;border-color:#22c55e;'
            }
        };

        const c = config[this.provider] || config.MOCK_LOCAL;
        badge.innerText = c.label;
        badge.style.cssText = c.style +
            'padding:4px 10px;border-radius:20px;font-size:0.7rem;' +
            'font-weight:700;border:1px solid;display:inline-block;';
    },

    async analisarLaudo({ texto, imagemBase64, imagemNome, contexto }) {
        switch (this.provider) {
            case 'MOCK_LOCAL':
                return await this._mockAnalise({ texto, imagemBase64, imagemNome, contexto });
            case 'FORDLLM_OFICIAL':
                return await this._fordllmAnalise({ texto, imagemBase64, contexto });
            default:
                throw new Error(`Provider desconhecido: ${this.provider}`);
        }
    },

    async _mockAnalise({ texto, imagemBase64, contexto }) {
        const inicio = Date.now();
        await this._simularEtapas();

        const t = (texto || '').toLowerCase();

        const mapa = {
            'Freios':        ['freio','frenagem','pastilha','disco','abs','pinça','pedal','fluido de freio','desaceleração'],
            'Suspensão':     ['suspensão','amortecedor','mola','barra estabilizadora','pivô','bandeja','cubo','rolamento'],
            'Motor':         ['motor','temperatura','superaquecimento','óleo','ruído','vibração','potência','rpm','rotação','escapamento'],
            'Elétrico':      ['elétrico','sensor','falha','dtc','bateria','alternador','chicote','conector','módulo','tensão'],
            'Transmissão':   ['câmbio','transmissão','marcha','embreagem','diferencial','eixo','caixa de câmbio'],
            'Direção':       ['direção','volante','assistência','servo','cremalheira','esterçamento'],
            'Carroceria':    ['lataria','porta','vidro','borracha','vedação','ruído interno','acabamento','rangido'],
            'Pneus':         ['pneu','desgaste','pressão','rodagem','alinhamento','balanceamento','carcaça'],
            'Arrefecimento': ['arrefecimento','radiador','líquido','temperatura do motor','ventoinha','termostato'],
        };

        let category = 'Geral';
        let maxM = 0;

        for (const [cat, kws] of Object.entries(mapa)) {
            const m = kws.filter(k => t.includes(k)).length;
            if (m > maxM) { maxM = m; category = cat; }
        }

        const criticos  = ['crítico','grave','parada','perigo','urgente','severo','trinca','ruptura','quebrou','falha total','fumaça','incêndio'];
        const moderados = ['moderado','intermitente','esporádico','eventual','anormal','reduzido','oscila','instável','irregular'];

        let severidade = 'Leve';
        if (criticos.some(p => t.includes(p)))    severidade = 'Crítico';
        else if (moderados.some(p => t.includes(p))) severidade = 'Moderado';

        const titulos = {
            'Freios':        `Anomalia no Sistema de Frenagem — ${severidade}`,
            'Suspensão':     `Ocorrência em Componente de Suspensão — ${severidade}`,
            'Motor':         `Anomalia de Powertrain Detectada — ${severidade}`,
            'Elétrico':      `Falha em Sistema Elétrico/Eletrônico — ${severidade}`,
            'Transmissão':   `Anomalia no Sistema de Transmissão — ${severidade}`,
            'Direção':       `Ocorrência no Sistema de Direção — ${severidade}`,
            'Carroceria':    `Ocorrência em Carroceria/NVH — ${severidade}`,
            'Pneus':         `Anomalia em Sistema de Rodagem — ${severidade}`,
            'Arrefecimento': `Falha no Sistema de Arrefecimento — ${severidade}`,
            'Geral':         `Ocorrência Técnica em Campo de Provas — ${severidade}`,
        };

        const causas = {
            'Freios':        'Desgaste acentuado. Inspeção de discos/pastilhas recomendada.',
            'Suspensão':     'Ruído/folga estrutural. Verificar fixações.',
            'Motor':         'Anomalia de powertrain. Verificar OBD/lubrificação.',
            'Elétrico':      'Falha de sinal/sensor. Verificar chicote e DTCs.',
            'Transmissão':   'Patinação ou tranco. Verificar fluido e torque.',
            'Direção':       'Rigidez/desalinhamento. Verificar servo e cremalheira.',
            'Carroceria':    'NVH elevado / vibração. Verificar vedação/acabamento.',
            'Pneus':         'Desgaste irregular. Requer alinhamento/calibragem.',
            'Arrefecimento': 'Líquido no mínimo. Vazamento ou sobreaquecimento.',
            'Geral':         'Anomalia técnica sob investigação.',
        };

        const textoCorrigido = (texto || '').trim().charAt(0).toUpperCase() +
            (texto || '').trim().slice(1);

        const parecerFinal = `Sistema: ${category}. Condição: ${causas[category]} Relato: "${textoCorrigido}".`;

        const tempoMs = Date.now() - inicio;

        return {
            titulo:       titulos[category],
            categoria:    category,
            severidade,
            causaRaiz:    causas[category],
            parecerFinal,
            contexto,

            // Transparência de IA
            ia: {
                provider:      'MOCK_LOCAL',
                modelo:        'TPG Keyword Engine v1.0',
                versao:        '1.0.0',
                tempoMs,
                confianca:     maxM > 2 ? 'Alta' : maxM > 0 ? 'Média' : 'Baixa',
                isMock:        true,
                timestamp:     new Date().toISOString(),
            },

            timestamp: new Date().toLocaleString('pt-BR'),
        };
    },

    async _simularEtapas() {
        const steps  = ['ia-step-1','ia-step-2','ia-step-3','ia-step-4'];
        const labels = [
            'Processando relato técnico',
            'Categorizando anomalia',
            'Analisando imagem',
            'Gerando parecer técnico'
        ];
        const delays = [700, 600, 900, 500];

        const first = document.getElementById(steps[0]);
        if (first) first.classList.add('ativo');

        for (let i = 0; i < steps.length; i++) {
            await new Promise(r => setTimeout(r, delays[i]));

            const curr = document.getElementById(steps[i]);
            if (curr) {
                curr.classList.remove('ativo');
                curr.classList.add('concluido');
                curr.textContent = `${labels[i]}`;
            }

            if (i < steps.length - 1) {
                const next = document.getElementById(steps[i + 1]);
                if (next) next.classList.add('ativo');
            }
        }

        await new Promise(r => setTimeout(r, 300));
    },

    async _fordllmAnalise({ texto, imagemBase64, contexto }) {
        throw new Error(
            'FordLLM Oficial requer credenciais corporativas Ford.\n' +
            'Configure o backend intermediário antes de ativar.'
        );
    }
};

// ─────────────────────────────────────────────────────────────
// 4. SALVAR ISSUE NO FIRESTORE
// ─────────────────────────────────────────────────────────────
async function salvarIssueNoFirestore(resultado, textoOriginal, midiasInfo) {
    try {
        const ctx = LaudoContexto.obterDoTurno();
        const db  = firebase.firestore();

        const payload = {
            // Contexto do turno
            uid:        ctx.uid,
            projetoId:  ctx.projetoId  || '',
            projeto:    ctx.projeto     || '',
            tipoTeste:  ctx.tipoTeste   || '',
            operador:   ctx.operador    || '',
            veiculoId:  ctx.veiculoId   || '',
            veiculo:    ctx.veiculo     || '',
            vin:        ctx.vin         || '',
            eja:        ctx.eja         || '',
            cc:         ctx.cc          || '',
            turnoData:  ctx.turnoData,
            horaRegistro: ctx.horaAtual,

            // Dados do issue
            relatoOriginal: textoOriginal || '',
            titulo:         resultado.titulo      || '',
            categoria:      resultado.categoria   || '',
            severidade:     resultado.severidade  || '',
            causaRaiz:      resultado.causaRaiz   || '',
            parecerFinal:   resultado.parecerFinal || '',
            status:         'aberto',

            // Mídias
            totalMidias:    midiasInfo?.total    || 0,
            totalImagens:   midiasInfo?.imagens  || 0,
            totalVideos:    midiasInfo?.videos   || 0,

            // Dados de IA — transparência total
            ia: resultado.ia || {},

            // Timestamps
            criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
        };

        const ref = await db.collection('vev_issues').add(payload);

// Notifica se for Crítico
if (payload.severidade === 'Crítico') {
    if (window.app && typeof window.app._dispararNotificacaoCritico === 'function') {
        window.app._dispararNotificacaoCritico(payload);
    }
}

        console.log('[Laudo] Issue salvo:', ref.id);

        return ref.id;

    } catch (e) {
        console.warn('[Laudo] Falha ao salvar issue:', e);
        return null;
    }
}

// ─────────────────────────────────────────────────────────────
// 5. FUNÇÕES PRINCIPAIS
// ─────────────────────────────────────────────────────────────
let _ultimoResultadoIA   = null;
let _textoOriginalLaudo  = '';

async function acionarAnaliseIA() {
    const texto     = document.getElementById('i-obs')?.value.trim() || '';
    const container = document.getElementById('ia-resultado-container');

    if (!texto && !_temMidia()) {
        alert('Descreva a anomalia por texto ou anexe uma foto.');
        return;
    }

    if (texto.length > 0 && texto.length < 8) {
        alert('Descreva a anomalia com mais detalhes para uma análise precisa.');
        return;
    }

    _textoOriginalLaudo = texto;

    const imgData  = await _obterPrimeiraImagem();
    const contexto = LaudoContexto.obterDoTurno();

    container.innerHTML = _htmlLoading();
    container.style.display = 'block';
    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    try {
        const seletor = document.getElementById('seletor-ia');
        if (seletor) IAEngine.setProvider(seletor.value);

        const resultado = await IAEngine.analisarLaudo({
            texto:        texto || 'Imagem anexada para análise',
            imagemBase64: imgData?.base64,
            imagemNome:   imgData?.nome,
            contexto,
        });

        _ultimoResultadoIA = resultado;
        container.innerHTML = _htmlResultado(resultado);
        container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    } catch (erro) {
        console.error('[IAEngine]', erro);
        container.innerHTML = _htmlErro(erro.message);
    }
}

async function aplicarResultadoIA() {
    if (!_ultimoResultadoIA) return;

    const r = _ultimoResultadoIA;

    const ta = document.getElementById('i-obs');
    if (ta) {
        ta.value = r.parecerFinal;
        ta.dataset.tituloIA = r.titulo || 'Ocorrência';
        ta.dataset.categoriaIA = r.categoria || 'Geral';
        ta.dataset.severidadeIA = r.severidade || 'N/A';
        ta.dataset.causaRaizIA = r.causaRaiz || '';
    }

    const container = document.getElementById('ia-resultado-container');

    if (container) {
        container.innerHTML = `
            <div style="text-align:center;padding:1.5rem;
                        background:rgba(16,185,129,0.1);
                        border:1px solid rgba(16,185,129,0.3);
                        border-radius:16px;margin-bottom:1rem;">
                <span class="material-icons"
                      style="color:var(--neon-green);font-size:2rem;">
                    check_circle
                </span>
                <p style="color:var(--neon-green);font-weight:800;margin-top:8px;">
                    Parecer técnico aplicado ao formulário!
                </p>
                <p style="color:var(--text-secondary);font-size:0.8rem;margin-top:4px;">
                    Você pode agora clicar em EMITIR RELATÓRIO ou DEIXAR EM ABERTO.
                </p>
            </div>
        `;
    }

    document.getElementById('i-obs')?.scrollIntoView({
        behavior: 'smooth', block: 'center'
    });

    _ultimoResultadoIA  = null;
}

function descartarResultadoIA() {
    _ultimoResultadoIA  = null;
    _textoOriginalLaudo = '';

    const c = document.getElementById('ia-resultado-container');
    if (c) { c.innerHTML = ''; c.style.display = 'none'; }
}

// ─────────────────────────────────────────────────────────────
// 6. ABRIR MODAL DO LAUDO — herda dados do turno
// ─────────────────────────────────────────────────────────────
function abrirModalLaudo() {
    appUI.abrirModal('modal-laudo');

    // Preenche painel de contexto automaticamente
    LaudoContexto.preencherPainel();

    // Atualiza badge do provider
    IAEngine._atualizarBadgeProvider();
}

function fecharModalLaudo() {
    appUI.fecharModal('modal-laudo');

    const c = document.getElementById('ia-resultado-container');
    if (c) { c.innerHTML = ''; c.style.display = 'none'; }

    _ultimoResultadoIA  = null;
    _textoOriginalLaudo = '';
}

// ─────────────────────────────────────────────────────────────
// 7. HELPERS
// ─────────────────────────────────────────────────────────────
function _temMidia() {
    const g = document.getElementById('galeria-avaria');
    return g && g.children.length > 0;
}

async function _obterPrimeiraImagem() {
    const input = document.getElementById('media-input');
    if (!input?.files?.length) return null;

    const file = input.files[0];
    if (!file.type.startsWith('image/')) return null;

    return new Promise(res => {
        const r = new FileReader();
        r.onload  = e => res({ base64: e.target.result, nome: file.name });
        r.onerror = () => res(null);
        r.readAsDataURL(file);
    });
}

// ─────────────────────────────────────────────────────────────
// 8. HTML HELPERS
// ─────────────────────────────────────────────────────────────
function _htmlLoading() {
    return `
        <div class="ia-loading">
            <div class="ia-loading-spinner"></div>
            <p style="color:var(--neon-blue);font-weight:800;font-size:0.9rem;margin-bottom:4px;">
                Analisando com IA...
            </p>
            <p style="color:var(--text-secondary);font-size:0.75rem;">
                TPG Insight AI · Ford VEV
            </p>
            <ul class="ia-loading-steps">
                <li class="ia-loading-step" id="ia-step-1">Processando relato técnico</li>
                <li class="ia-loading-step" id="ia-step-2">Categorizando anomalia</li>
                <li class="ia-loading-step" id="ia-step-3">Analisando imagem</li>
                <li class="ia-loading-step" id="ia-step-4">Gerando parecer técnico</li>
            </ul>
        </div>
    `;
}

function _htmlResultado(r) {
    const icones  = { 'Crítico': 'Critico', 'Moderado': 'Moderado', 'Leve': 'Leve' };
    const classes = { 'Crítico': 'critico', 'Moderado': 'moderado', 'Leve': 'leve' };
    const ia      = r.ia || {};

    // Badge de transparência de IA
    const isMock     = ia.isMock === true;
    const badgeLabel = isMock ? 'MODO SIMULADO' : 'IA REAL';
    const badgeStyle = isMock
        ? 'background:rgba(251,191,36,0.15);color:#fbbf24;border:1px solid #fbbf24;'
        : 'background:rgba(34,197,94,0.15);color:#4ade80;border:1px solid #22c55e;';

    // Bloco de informações de IA
    const iaInfoHTML = `
        <div style="background:rgba(0,0,0,0.3);border-radius:10px;
                    padding:10px 14px;margin-bottom:12px;
                    border:1px solid rgba(255,255,255,0.06);">

            <div style="display:flex;align-items:center;
                        justify-content:space-between;margin-bottom:8px;">
                <span style="font-size:0.72rem;font-weight:700;
                              color:var(--text-secondary);letter-spacing:0.5px;">
                    TRANSPARÊNCIA DE IA
                </span>
                <span style="${badgeStyle}
                              padding:2px 8px;border-radius:20px;
                              font-size:0.65rem;font-weight:700;">
                    ${badgeLabel}
                </span>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
                <div style="font-size:0.72rem;color:var(--text-secondary);">
                    Modelo:
                    <span style="color:var(--text-primary);font-weight:600;">
                        ${ia.modelo || 'N/A'}
                    </span>
                </div>
                <div style="font-size:0.72rem;color:var(--text-secondary);">
                    Versão:
                    <span style="color:var(--text-primary);font-weight:600;">
                        ${ia.versao || 'N/A'}
                    </span>
                </div>
                <div style="font-size:0.72rem;color:var(--text-secondary);">
                    Confiança:
                    <span style="color:var(--text-primary);font-weight:600;">
                        ${ia.confianca || 'N/A'}
                    </span>
                </div>
                <div style="font-size:0.72rem;color:var(--text-secondary);">
                    Tempo:
                    <span style="color:var(--text-primary);font-weight:600;">
                        ${ia.tempoMs ? ia.tempoMs + 'ms' : 'N/A'}
                    </span>
                </div>
            </div>

            ${isMock ? `
                <div style="margin-top:8px;font-size:0.68rem;color:#fbbf24;
                             border-top:1px solid rgba(255,255,255,0.06);padding-top:6px;">
                    Análise baseada em palavras-chave. Conecte FordLLM para IA real.
                </div>
            ` : ''}
        </div>
    `;

    // Contexto do turno no resultado
    const ctx = r.contexto || {};
    const ctxHTML = (ctx.projeto || ctx.operador) ? `
        <div style="background:rgba(59,130,246,0.06);
                    border:1px solid rgba(59,130,246,0.15);
                    border-radius:10px;padding:10px 14px;margin-bottom:12px;
                    font-size:0.75rem;color:var(--text-secondary);">
            <div style="font-weight:700;color:var(--neon-blue);margin-bottom:6px;font-size:0.72rem;">
                CONTEXTO DO TURNO
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">
                ${ctx.projeto   ? `<div>Projeto: ${ctx.projeto}</div>` : ''}
                ${ctx.tipoTeste ? `<div>Teste: ${ctx.tipoTeste}</div>` : ''}
                ${ctx.operador  ? `<div>Operador: ${ctx.operador}</div>` : ''}
                ${ctx.veiculo   ? `<div>Veículo: ${ctx.veiculo}</div>` : ''}
                ${ctx.vin       ? `<div>VIN: ${ctx.vin}</div>` : ''}
            </div>
        </div>
    ` : '';

    return `
        <div class="ia-result-card">
            <div class="ia-result-header">
                <div class="ia-result-header-left">
                    <span class="material-icons" style="font-size:1.1rem;">auto_awesome</span>
                    Análise Técnica IA
                </div>
                <span id="ia-provider-badge-header"></span>
            </div>

            <div class="ia-result-body">

                ${ctxHTML}

                ${iaInfoHTML}

                <div class="ia-section">
                    <div class="ia-section-label">
                        <span class="material-icons">title</span> Título Gerado
                    </div>
                    <div class="ia-section-content"
                         style="font-weight:800;color:var(--neon-blue);">
                        ${r.titulo}
                    </div>
                </div>

                <div class="ia-badges-row">
                    <span class="ia-badge ia-badge-categoria">
                        <span class="material-icons" style="font-size:12px;">category</span>
                        ${r.categoria}
                    </span>
                    <span class="ia-badge ia-badge-severidade ${classes[r.severidade]}">
                        ${icones[r.severidade]} ${r.severidade}
                    </span>
                </div>

                <div class="ia-section">
                    <div class="ia-section-label">
                        <span class="material-icons">search</span> Causa Raiz Provável
                    </div>
                    <div class="ia-section-content">${r.causaRaiz}</div>
                </div>

                <div class="ia-parecer-final">
                    <div class="ia-section-label" style="margin-bottom:10px;">
                        <span class="material-icons">description</span>
                        Parecer Técnico Final
                    </div>
                    <div class="ia-parecer-text">${r.parecerFinal}</div>
                </div>

                <div style="text-align:center;font-size:0.7rem;color:var(--text-secondary);">
                    Gerado em ${r.timestamp} · TPG Insight AI · Ford VEV
                </div>

                <div class="ia-action-row">
                    <button class="btn-aplicar" onclick="aplicarResultadoIA()">
                        <span class="material-icons">check_circle</span>
                        Aplicar ao Laudo
                    </button>
                    <button class="btn-descartar" onclick="descartarResultadoIA()">
                        <span class="material-icons">cancel</span>
                        Descartar
                    </button>
                </div>

            </div>
        </div>
    `;
}

function _htmlErro(msg) {
    return `
        <div style="background:rgba(239,68,68,0.1);
                    border:1px solid rgba(239,68,68,0.3);
                    border-radius:16px;padding:1.5rem;
                    text-align:center;margin-bottom:1rem;">
            <span class="material-icons"
                  style="color:var(--neon-red);font-size:2rem;">
                error_outline
            </span>
            <p style="color:var(--neon-red);font-weight:800;margin:8px 0 4px;">
                Erro na Análise IA
            </p>
            <p style="color:var(--text-secondary);font-size:0.8rem;">
                ${msg}
            </p>
            <button onclick="descartarResultadoIA()"
                    style="margin-top:12px;
                           background:rgba(239,68,68,0.2);
                           color:var(--neon-red);
                           border:1px solid var(--neon-red);
                           padding:8px 20px;border-radius:8px;
                           cursor:pointer;font-weight:700;">
                Fechar
            </button>
        </div>
    `;
}

// ─────────────────────────────────────────────────────────────
// 6. LAUDOS EM ABERTO (SALVAR LOCALMENTE E FINALIZAR COM TURNO)
// ─────────────────────────────────────────────────────────────
const LaudoPendente = {
    salvarEmAberto() {
        if (typeof TurnoEngine === 'undefined' || !TurnoEngine.dados) {
            alert("Atenção: Você precisa iniciar um turno para deixar o laudo em aberto.");
            return;
        }

        const d = TurnoEngine.dados;
        const obsEl = document.getElementById('i-obs');
        const relato = obsEl ? obsEl.value.trim() : '';

        if (!relato && (!app.fotos || app.fotos.length === 0)) {
            alert("Por favor, relate a ocorrência ou anexe uma foto antes de salvar.");
            return;
        }

        const titulo = obsEl.dataset.tituloIA || 'Ocorrência Manual';
        const categoria = obsEl.dataset.categoriaIA || 'Geral';
        const severidade = obsEl.dataset.severidadeIA || 'N/A';
        const causaRaiz = obsEl.dataset.causaRaizIA || '';
        const parecerFinal = relato;

        const laudo = {
            relatoOriginal: relato,
            titulo,
            categoria,
            severidade,
            causaRaiz,
            parecerFinal,
            fotos: JSON.parse(JSON.stringify(app.fotos || [])),
            timestamp: new Date().toISOString()
        };

        if (!d.laudosPendentes) {
            d.laudosPendentes = [];
        }

        d.laudosPendentes.push(laudo);

        TurnoEngine._cache = d;
        localStorage.setItem(TurnoEngine._chave(), JSON.stringify(d));

        try {
            firebase.database().ref('vev_turnos_ativos').child(d.uid).update({
                laudosPendentes: d.laudosPendentes
            });
        } catch (e) {
            console.warn('[LaudoPendente] Erro ao sincronizar RTDB:', e);
        }

        alert("Laudo salvo em aberto com sucesso! Ele será finalizado junto com o encerramento do turno.");

        if (typeof app !== 'undefined' && typeof app.resetarFormularioLaudo === 'function') {
            app.resetarFormularioLaudo();
        }

        if (obsEl) {
            delete obsEl.dataset.tituloIA;
            delete obsEl.dataset.categoriaIA;
            delete obsEl.dataset.severidadeIA;
            delete obsEl.dataset.causaRaizIA;
        }

        if (typeof fecharModalLaudo === 'function') {
            fecharModalLaudo();
        }

        this.atualizarContagemHome();
    },

    obterQuantidade() {
        if (typeof TurnoEngine === 'undefined') return 0;
        const d = TurnoEngine.dados;
        if (!d || !d.laudosPendentes) return 0;
        return d.laudosPendentes.length;
    },

    atualizarContagemHome() {
        const qtd = this.obterQuantidade();
        const el = document.getElementById('home-laudos-abertos-indicador');
        const txt = document.getElementById('home-laudos-abertos-text');
        if (el) {
            if (qtd > 0) {
                el.style.display = 'inline-flex';
                if (txt) txt.innerText = `${qtd} laudo(s) em aberto`;
            } else {
                el.style.display = 'none';
            }
        }
    }
};

window.LaudoPendente = LaudoPendente;