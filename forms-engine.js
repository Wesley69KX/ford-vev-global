// ============================================================
// forms-engine.js | Ford VEV · Central de Links dos Projetos
// Motor inteligente de exibição, filtragem e navegação de formulários
// Sincronizado com a planilha de rodagem (Forms - Rodagem.xlsx)
// ============================================================

const FormsEngine = {
    _centralModalId: 'modal-central-links-vev',
    _projetoModalId: 'modal-forms-projeto',
    _filtroProjetoAtivo: 'ALL',
    _termoBusca: '',
    _projetoAtual: null,

    // Injeta estilos CSS específicos para a Central de Links
    _injetarEstilos() {
        if (document.getElementById('styles-forms-engine')) return;

        const style = document.createElement('style');
        style.id = 'styles-forms-engine';
        style.textContent = `
            /* ── Estilos da Central de Links Ford VEV ── */
            .modal-central-overlay {
                position: fixed;
                inset: 0;
                background: rgba(4, 7, 13, 0.88);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                z-index: 10000;
                display: none;
                align-items: center;
                justify-content: center;
                padding: 16px;
                opacity: 0;
                transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            }
            .modal-central-overlay.ativo {
                opacity: 1;
            }

            .modal-central-box {
                background: #0f131a;
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 20px;
                width: 100%;
                max-width: 680px;
                max-height: 90vh;
                display: flex;
                flex-direction: column;
                box-shadow: 0 24px 60px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(28, 105, 212, 0.25);
                overflow: hidden;
                transform: scale(0.96) translateY(10px);
                transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            }
            .modal-central-overlay.ativo .modal-central-box {
                transform: scale(1) translateY(0);
            }

            .modal-central-header {
                padding: 20px 24px 16px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                background: linear-gradient(180deg, rgba(28, 105, 212, 0.12) 0%, rgba(15, 19, 26, 0) 100%);
                position: relative;
            }

            .modal-central-header-top {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 8px;
            }

            .modal-central-titulo-wrap {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .modal-central-icon-hub {
                width: 44px;
                height: 44px;
                border-radius: 12px;
                background: linear-gradient(135deg, #1c69d4 0%, #0d47a1 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                color: #fff;
                box-shadow: 0 4px 14px rgba(28, 105, 212, 0.4);
            }

            .modal-central-titulo {
                margin: 0;
                font-size: 1.25rem;
                font-weight: 800;
                color: #fff;
                letter-spacing: -0.3px;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .modal-central-subtitulo {
                margin: 4px 0 0;
                font-size: 0.8rem;
                color: rgba(255, 255, 255, 0.6);
            }

            .modal-central-close {
                background: rgba(255, 255, 255, 0.06);
                border: 1px solid rgba(255, 255, 255, 0.1);
                color: rgba(255, 255, 255, 0.8);
                width: 36px;
                height: 36px;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            .modal-central-close:hover {
                background: rgba(239, 68, 68, 0.2);
                border-color: rgba(239, 68, 68, 0.5);
                color: #ef4444;
            }

            /* Barra de busca e filtros por projeto */
            .modal-central-toolbar {
                padding: 12px 24px;
                background: rgba(255, 255, 255, 0.02);
                border-bottom: 1px solid rgba(255, 255, 255, 0.06);
                display: flex;
                flex-direction: column;
                gap: 10px;
            }

            .modal-central-search-box {
                position: relative;
                width: 100%;
            }
            .modal-central-search-box input {
                width: 100%;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 10px;
                padding: 9px 12px 9px 36px;
                color: #fff;
                font-size: 0.84rem;
                outline: none;
                transition: all 0.2s ease;
                box-sizing: border-box;
            }
            .modal-central-search-box input:focus {
                border-color: #1c69d4;
                background: rgba(28, 105, 212, 0.08);
                box-shadow: 0 0 0 2px rgba(28, 105, 212, 0.25);
            }
            .modal-central-search-icon {
                position: absolute;
                left: 10px;
                top: 50%;
                transform: translateY(-50%);
                color: rgba(255, 255, 255, 0.4);
                font-size: 1.1rem;
                pointer-events: none;
            }

            .modal-central-chips {
                display: flex;
                gap: 6px;
                overflow-x: auto;
                padding-bottom: 4px;
                scrollbar-width: thin;
            }
            .modal-central-chips::-webkit-scrollbar {
                height: 4px;
            }
            .modal-central-chips::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.2);
                border-radius: 4px;
            }

            .proj-chip-btn {
                background: rgba(255, 255, 255, 0.04);
                border: 1px solid rgba(255, 255, 255, 0.08);
                color: rgba(255, 255, 255, 0.7);
                border-radius: 20px;
                padding: 6px 14px;
                font-size: 0.76rem;
                font-weight: 600;
                white-space: nowrap;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 5px;
            }
            .proj-chip-btn:hover {
                background: rgba(255, 255, 255, 0.1);
                color: #fff;
            }
            .proj-chip-btn.ativo {
                background: #1c69d4;
                border-color: #3b82f6;
                color: #fff;
                box-shadow: 0 2px 10px rgba(28, 105, 212, 0.4);
            }

            /* Lista de links */
            .modal-central-content {
                padding: 16px 24px;
                overflow-y: auto;
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .proj-group-title {
                font-size: 0.78rem;
                font-weight: 700;
                color: rgba(255, 255, 255, 0.5);
                text-transform: uppercase;
                letter-spacing: 0.8px;
                margin: 8px 0 4px;
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .form-link-card {
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.07);
                border-radius: 14px;
                padding: 12px 16px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            }
            .form-link-card:hover {
                background: rgba(255, 255, 255, 0.06);
                border-color: rgba(255, 255, 255, 0.15);
                transform: translateY(-1px);
            }

            .form-link-main {
                display: flex;
                align-items: center;
                gap: 12px;
                flex: 1;
                min-width: 0;
            }

            .form-link-icon-box {
                width: 40px;
                height: 40px;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.25rem;
                flex-shrink: 0;
            }

            .form-link-info {
                display: flex;
                flex-direction: column;
                min-width: 0;
            }

            .form-link-nome {
                font-size: 0.88rem;
                font-weight: 700;
                color: #fff;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .form-link-badge-tag {
                font-size: 0.65rem;
                font-weight: 700;
                padding: 2px 6px;
                border-radius: 6px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .form-link-desc {
                font-size: 0.74rem;
                color: rgba(255, 255, 255, 0.55);
                margin-top: 2px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .form-link-actions {
                display: flex;
                align-items: center;
                gap: 6px;
                flex-shrink: 0;
            }

            .btn-action-open {
                background: #1c69d4;
                color: #fff;
                border: none;
                border-radius: 8px;
                padding: 8px 14px;
                font-size: 0.78rem;
                font-weight: 700;
                text-decoration: none;
                display: inline-flex;
                align-items: center;
                gap: 5px;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            .btn-action-open:hover {
                background: #2563eb;
                transform: scale(1.03);
            }

            .btn-action-copy {
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                color: rgba(255, 255, 255, 0.8);
                border-radius: 8px;
                padding: 8px 10px;
                font-size: 0.78rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                display: inline-flex;
                align-items: center;
                gap: 4px;
            }
            .btn-action-copy:hover {
                background: rgba(255, 255, 255, 0.12);
                color: #fff;
            }

            /* Footer de utilidades */
            .modal-central-footer {
                padding: 14px 24px;
                background: rgba(0, 0, 0, 0.4);
                border-top: 1px solid rgba(255, 255, 255, 0.06);
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
            }

            .central-quick-pill {
                background: rgba(255, 255, 255, 0.04);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 10px;
                padding: 6px 12px;
                font-size: 0.75rem;
                color: rgba(255, 255, 255, 0.7);
                display: flex;
                align-items: center;
                gap: 6px;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            .central-quick-pill:hover {
                background: rgba(255, 255, 255, 0.08);
                color: #fff;
            }

            /* Toast feedback */
            .vev-toast-feedback {
                position: fixed;
                bottom: 24px;
                left: 50%;
                transform: translateX(-50%) translateY(50px);
                background: #10b981;
                color: #000;
                font-weight: 700;
                font-size: 0.82rem;
                padding: 10px 20px;
                border-radius: 30px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                z-index: 10001;
                opacity: 0;
                transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                pointer-events: none;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .vev-toast-feedback.visivel {
                transform: translateX(-50%) translateY(0);
                opacity: 1;
            }
        `;
        document.head.appendChild(style);
    },

    // Inicialização e injeção do modal no DOM
    init() {
        this._injetarEstilos();
        if (document.getElementById(this._centralModalId)) return;

        const modal = document.createElement('div');
        modal.id = this._centralModalId;
        modal.className = 'modal-central-overlay';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');

        modal.innerHTML = `
            <div class="modal-central-box">
                <!-- Header -->
                <div class="modal-central-header">
                    <div class="modal-central-header-top">
                        <div class="modal-central-titulo-wrap">
                            <div class="modal-central-icon-hub">
                                <span class="material-icons">share_location</span>
                            </div>
                            <div>
                                <h2 class="modal-central-titulo">
                                    Central de Links dos Projetos
                                </h2>
                                <p class="modal-central-subtitulo">
                                    Formulários oficiais Microsoft Forms por Programa e Teste de Campo
                                </p>
                            </div>
                        </div>
                        <button class="modal-central-close" onclick="FormsEngine.fecharCentral()" aria-label="Fechar">
                            <span class="material-icons">close</span>
                        </button>
                    </div>
                </div>

                <!-- Barra de ferramentas (busca + filtros de projeto) -->
                <div class="modal-central-toolbar">
                    <div class="modal-central-search-box">
                        <span class="material-icons modal-central-search-icon">search</span>
                        <input type="text" id="central-input-busca" placeholder="Buscar por projeto, issue, abastecimento ou KM..." oninput="FormsEngine._filtrarLista()">
                    </div>
                    <div class="modal-central-chips" id="central-chips-projetos">
                        <!-- Chips injetados via JS -->
                    </div>
                </div>

                <!-- Conteúdo com os cards de links -->
                <div class="modal-central-content" id="central-lista-cards">
                    <!-- Cards renderizados dinamicamente -->
                </div>

                <!-- Footer com utilidades rápidas -->
                <div class="modal-central-footer">
                    <div class="central-quick-pill" onclick="FormsEngine.copiarTexto('4760', 'Senha do cartão copiada: 4760')">
                        <span class="material-icons" style="color: #f59e0b; font-size: 1rem;">credit_card</span>
                        <span>Cartão Abast: <strong style="color: #fff; font-family: monospace;">4760</strong> (Copiar)</span>
                    </div>

                    <a href="tel:1532519000" class="central-quick-pill" style="text-decoration: none;">
                        <span class="material-icons" style="color: #ef4444; font-size: 1rem;">phone</span>
                        <span>Guincho / Apoio: <strong style="color: #fff;">(15) 3251-9000</strong></span>
                    </a>

                    <a href="https://www.ford.com" target="_blank" rel="noopener noreferrer" class="central-quick-pill" style="text-decoration: none;">
                        <span class="material-icons" style="color: #60a5fa; font-size: 1rem;">corporate_fare</span>
                        <span>Portal Ford</span>
                    </a>
                </div>
            </div>
            <div id="vev-toast-feedback" class="vev-toast-feedback">
                <span class="material-icons">check_circle</span>
                <span id="vev-toast-text">Link copiado com sucesso!</span>
            </div>
        `;

        document.body.appendChild(modal);

        // Fechar ao clicar fora
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.fecharCentral();
        });

        // Fechar com Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('ativo')) {
                this.fecharCentral();
            }
        });

        console.log('[FormsEngine] Central de Links inicializada com sucesso.');
    },

    // Abre a Central de Links
    abrirCentral(projetoInicial) {
        this.init();

        const overlay = document.getElementById(this._centralModalId);
        if (!overlay) return;

        // Se veio um projeto específico, seleciona ele
        if (projetoInicial) {
            const proj = FormsData.getProjeto(projetoInicial);
            this._filtroProjetoAtivo = proj ? proj.nome : 'ALL';
        } else {
            // Se houver turno ativo, define como padrão o projeto do turno
            const turnoProj = typeof TurnoEngine !== 'undefined' && TurnoEngine.dados?.projeto;
            if (turnoProj && FormsData.getProjeto(turnoProj)) {
                this._filtroProjetoAtivo = FormsData.getProjeto(turnoProj).nome;
            } else {
                this._filtroProjetoAtivo = 'ALL';
            }
        }

        const inputBusca = document.getElementById('central-input-busca');
        if (inputBusca) inputBusca.value = '';
        this._termoBusca = '';

        this._renderChips();
        this._renderCards();

        overlay.style.display = 'flex';
        requestAnimationFrame(() => {
            requestAnimationFrame(() => overlay.classList.add('ativo'));
        });
        document.body.style.overflow = 'hidden';
    },

    // Fecha a Central de Links
    fecharCentral() {
        const overlay = document.getElementById(this._centralModalId);
        if (!overlay) return;

        overlay.classList.remove('ativo');
        setTimeout(() => {
            overlay.style.display = 'none';
            document.body.style.overflow = 'auto';
        }, 250);
    },

    // Renderiza os chips / abas de filtro por projeto
    _renderChips() {
        const container = document.getElementById('central-chips-projetos');
        if (!container) return;

        const projetos = FormsData.getTodosProjetos();
        let html = `
            <button class="proj-chip-btn ${this._filtroProjetoAtivo === 'ALL' ? 'ativo' : ''}" onclick="FormsEngine.selecionarFiltroProjeto('ALL')">
                <span class="material-icons" style="font-size: 0.9rem;">star</span>
                Todos os Projetos
            </button>
        `;

        projetos.forEach((p) => {
            const ativo = this._filtroProjetoAtivo === p.nome;
            html += `
                <button class="proj-chip-btn ${ativo ? 'ativo' : ''}" onclick="FormsEngine.selecionarFiltroProjeto('${p.nome.replace(/'/g, "\\'")}')">
                    <span class="material-icons" style="font-size: 0.9rem;">${p.icone || 'directions_car'}</span>
                    ${p.apelido || p.nome}
                </button>
            `;
        });

        container.innerHTML = html;
    },

    // Seleciona um filtro de projeto
    selecionarFiltroProjeto(nomeProjeto) {
        this._filtroProjetoAtivo = nomeProjeto;
        this._renderChips();
        this._renderCards();
    },

    // Filtra lista ao digitar na busca
    _filtrarLista() {
        const input = document.getElementById('central-input-busca');
        this._termoBusca = input ? input.value.trim().toLowerCase() : '';
        this._renderCards();
    },

    // Renderiza os cards de formulários
    _renderCards() {
        const container = document.getElementById('central-lista-cards');
        if (!container) return;

        const todosProjetos = FormsData.getTodosProjetos();
        const projetosFiltrados = this._filtroProjetoAtivo === 'ALL'
            ? todosProjetos
            : todosProjetos.filter(p => p.nome === this._filtroProjetoAtivo);

        let html = '';
        let totalRenderizado = 0;

        projetosFiltrados.forEach((proj) => {
            let forms = proj.formularios || [];

            // Aplica busca por texto se houver
            if (this._termoBusca) {
                forms = forms.filter(f => 
                    (f.nome || '').toLowerCase().includes(this._termoBusca) ||
                    (f.descricao || '').toLowerCase().includes(this._termoBusca) ||
                    (f.tipo || '').toLowerCase().includes(this._termoBusca) ||
                    (proj.nome || '').toLowerCase().includes(this._termoBusca) ||
                    (proj.apelido || '').toLowerCase().includes(this._termoBusca)
                );
            }

            if (forms.length === 0) return;

            // Título do grupo
            html += `
                <div class="proj-group-title">
                    <span class="material-icons" style="font-size: 1rem; color: ${proj.cor || '#1c69d4'};">${proj.icone || 'directions_car'}</span>
                    <span>${proj.nome}</span>
                    <span style="opacity: 0.6; font-weight: normal; font-size: 0.7rem;">(${forms.length} link${forms.length > 1 ? 's' : ''})</span>
                </div>
            `;

            forms.forEach((form) => {
                totalRenderizado++;
                const corIcone = form.cor || '#1c69d4';
                const badgeTxt = form.badge || (form.tipo ? form.tipo.toUpperCase() : 'FORMULÁRIO');

                html += `
                    <div class="form-link-card">
                        <div class="form-link-main">
                            <div class="form-link-icon-box" style="background: ${corIcone}1a; color: ${corIcone}; border: 1px solid ${corIcone}33;">
                                <span class="material-icons">${form.icone || 'assignment'}</span>
                            </div>
                            <div class="form-link-info">
                                <div class="form-link-nome">
                                    <span>${form.nome}</span>
                                    <span class="form-link-badge-tag" style="background: ${corIcone}22; color: ${corIcone}; border: 1px solid ${corIcone}44;">
                                        ${badgeTxt}
                                    </span>
                                </div>
                                <div class="form-link-desc">${form.descricao || form.url}</div>
                            </div>
                        </div>
                        <div class="form-link-actions">
                            <button class="btn-action-copy" onclick="FormsEngine.copiarTexto('${form.url.replace(/'/g, "\\'")}', 'Link copiado: ${form.nome.replace(/'/g, "\\'")}')" title="Copiar link">
                                <span class="material-icons" style="font-size: 0.95rem;">content_copy</span>
                                <span>Copiar</span>
                            </button>
                            <a href="${form.url}" target="_blank" rel="noopener noreferrer" class="btn-action-open" title="Abrir formulário">
                                <span>Abrir</span>
                                <span class="material-icons" style="font-size: 0.95rem;">open_in_new</span>
                            </a>
                        </div>
                    </div>
                `;
            });
        });

        if (totalRenderizado === 0) {
            html = `
                <div style="text-align: center; padding: 40px 20px; color: rgba(255, 255, 255, 0.4);">
                    <span class="material-icons" style="font-size: 3rem; margin-bottom: 8px; opacity: 0.3;">search_off</span>
                    <div style="font-size: 0.95rem; font-weight: 600; color: rgba(255, 255, 255, 0.7);">Nenhum formulário encontrado</div>
                    <div style="font-size: 0.78rem; margin-top: 4px;">Tente buscar por outro termo ou selecione outro projeto.</div>
                </div>
            `;
        }

        container.innerHTML = html;
    },

    // Utilitário de copiar texto com toast animado
    copiarTexto(texto, mensagem) {
        if (!texto) return;

        const copiarFallback = () => {
            const ta = document.createElement('textarea');
            ta.value = texto;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            try {
                document.execCommand('copy');
                this._exibirToast(mensagem || 'Link copiado para a área de transferência!');
            } catch (err) {
                console.warn('Erro ao copiar:', err);
            }
            document.body.removeChild(ta);
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(texto)
                .then(() => {
                    this._exibirToast(mensagem || 'Link copiado para a área de transferência!');
                })
                .catch(() => copiarFallback());
        } else {
            copiarFallback();
        }
    },

    // Exibe toast notification
    _exibirToast(msg) {
        const toast = document.getElementById('vev-toast-feedback');
        const txt = document.getElementById('vev-toast-text');
        if (!toast || !txt) return;

        txt.textContent = msg;
        toast.classList.add('visivel');

        if (this._toastTimer) clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => {
            toast.classList.remove('visivel');
        }, 2600);
    },

    // Atualiza dinamicamente os links na tela Home de acordo com o projeto ativo ou selecionado
    _homeProjetoSelecionado: '1 Millions Mile',

    setHomeProjeto(nome) {
        this._homeProjetoSelecionado = nome;
        this.renderizarLinksHome(nome);
    },

    renderizarLinksHome(nomeProjeto) {
        const containerDinamico = document.getElementById('forms-links-container');
        if (!containerDinamico) return;

        const projNomeAtivo = nomeProjeto || this._homeProjetoSelecionado || '1 Millions Mile';
        const proj = FormsData.getProjeto(projNomeAtivo) || FormsData.getTodosProjetos()[0];
        const todosProjetos = FormsData.getTodosProjetos();

        if (!proj) return;

        let chipsHtml = `
            <div style="display: flex; gap: 6px; overflow-x: auto; padding-bottom: 8px; margin-bottom: 10px; scrollbar-width: none;">
        `;

        todosProjetos.forEach(p => {
            const isAtivo = p.nome === proj.nome;
            chipsHtml += `
                <button onclick="FormsEngine.setHomeProjeto('${p.nome.replace(/'/g, "\\'")}')"
                        style="background: ${isAtivo ? '#1c69d4' : 'rgba(255,255,255,0.05)'};
                               border: 1px solid ${isAtivo ? '#3b82f6' : 'rgba(255,255,255,0.1)'};
                               color: ${isAtivo ? '#fff' : 'rgba(255,255,255,0.75)'};
                               padding: 6px 13px; border-radius: 20px; font-size: 0.76rem; font-weight: 700;
                               white-space: nowrap; cursor: pointer; display: flex; align-items: center; gap: 5px;
                               box-shadow: ${isAtivo ? '0 2px 10px rgba(28,105,212,0.4)' : 'none'}; transition: all 0.2s ease;">
                    <span class="material-icons" style="font-size: 0.88rem;">${p.icone || 'directions_car'}</span>
                    <span>${p.apelido || p.nome}</span>
                </button>
            `;
        });
        chipsHtml += `</div>`;

        let headerHtml = `
            <div style="background: linear-gradient(135deg, rgba(28, 105, 212, 0.15) 0%, rgba(15, 19, 26, 0.5) 100%);
                        border: 1px solid rgba(28, 105, 212, 0.3); border-radius: 14px; padding: 12px 14px; margin-bottom: 10px;
                        display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 36px; height: 36px; border-radius: 10px; background: ${proj.cor || '#1c69d4'}25; border: 1px solid ${proj.cor || '#1c69d4'}45; display: flex; align-items: center; justify-content: center; color: ${proj.cor || '#1c69d4'};">
                        <span class="material-icons" style="font-size: 1.25rem;">${proj.icone || 'directions_car'}</span>
                    </div>
                    <div>
                        <div style="font-size: 0.85rem; font-weight: 800; color: #fff;">${proj.nome}</div>
                        <div style="font-size: 0.72rem; color: rgba(255,255,255,0.6);">${proj.formularios?.length || 0} formulários cadastrados</div>
                    </div>
                </div>
                <button onclick="FormsEngine.abrirCentral('${proj.nome.replace(/'/g, "\\'")}')" 
                        style="background: #1c69d4; color: #fff; border: none; border-radius: 8px; padding: 6px 12px; font-size: 0.74rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                    <span>Ver Todos</span>
                    <span class="material-icons" style="font-size: 0.85rem;">open_in_new</span>
                </button>
            </div>
        `;

        let cardsHtml = `
            <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px;">
                ${(proj.formularios || []).map(f => `
                    <div class="ext-link-btn" style="border-left: 3px solid ${f.cor || '#1c69d4'};">
                        <span class="ext-link-icon material-icons" style="color: ${f.cor || '#1c69d4'}">${f.icone || 'assignment'}</span>
                        <div class="ext-link-body" style="cursor: pointer;" onclick="window.open('${f.url}', '_blank')">
                            <div class="ext-link-title" style="display: flex; align-items: center; gap: 6px;">
                                <span>${f.nome}</span>
                                <span style="font-size: 0.62rem; font-weight: 700; padding: 2px 6px; border-radius: 6px; background: ${f.cor || '#1c69d4'}22; color: ${f.cor || '#1c69d4'};">
                                    ${f.badge || 'FORM'}
                                </span>
                            </div>
                            <div class="ext-link-desc">${f.descricao || proj.nome}</div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 4px; flex-shrink: 0;">
                            <button onclick="event.stopPropagation(); FormsEngine.copiarTexto('${f.url.replace(/'/g, "\\'")}', 'Link copiado: ${f.nome.replace(/'/g, "\\'")}')"
                                    style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: rgba(255,255,255,0.8); border-radius: 6px; padding: 6px 8px; cursor: pointer; display: flex; align-items: center;" title="Copiar Link">
                                <span class="material-icons" style="font-size: 0.9rem;">content_copy</span>
                            </button>
                            <a href="${f.url}" target="_blank" rel="noopener noreferrer"
                               style="background: #1c69d4; color: #fff; border-radius: 6px; padding: 6px 10px; font-size: 0.72rem; font-weight: 700; text-decoration: none; display: flex; align-items: center; gap: 3px;">
                                <span>Abrir</span>
                                <span class="material-icons" style="font-size: 0.85rem;">open_in_new</span>
                            </a>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        containerDinamico.innerHTML = chipsHtml + headerHtml + cardsHtml;
    },

    // Modal popup rápido para quando o operador precisa preencher formulário de um projeto
    abrir(nomeProjeto) {
        this.abrirCentral(nomeProjeto);
    },

    fechar() {
        this.fecharCentral();
    },

    verificarEExibir(nomeProjeto) {
        if (!nomeProjeto) return;
        if (FormsData.necessitaFormulario(nomeProjeto)) {
            this.abrirCentral(nomeProjeto);
        }
    }
};

// Exporta globalmente
if (typeof window !== 'undefined') {
    window.FormsEngine = FormsEngine;
    document.addEventListener('DOMContentLoaded', () => {
        FormsEngine.init();
        setTimeout(() => {
            FormsEngine.renderizarLinksHome();
        }, 600);
    });
}
