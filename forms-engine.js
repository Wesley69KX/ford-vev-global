// ============================================================
// forms-engine.js | TPG Insight AI v2.0
// Motor de exibição dinâmica de formulários por projeto
// ============================================================

const FormsEngine = {

    _modalId: 'modal-forms-projeto',
    _projetoAtual: null,

    // Inicializa e injeta o modal no DOM (chamado 1x)
    init() {
        if (document.getElementById(this._modalId)) return;

        const modal = document.createElement('div');
        modal.id    = this._modalId;
        modal.className = 'modal-forms-overlay';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');

        modal.innerHTML = `
            <div class="modal-forms-box">

                <div class="modal-forms-header">
                    <div class="modal-forms-icone-topo"><span class="material-icons" style="font-size: 2.4rem; color: var(--accent, #00bcf2);">assignment</span></div>
                    <h2 class="modal-forms-titulo">Formulários do Projeto</h2>
                    <p class="modal-forms-subtitulo" id="forms-projeto-nome">—</p>
                    <div class="modal-forms-badge">
                        <span class="material-icons" style="font-size: 1rem; vertical-align: middle; margin-right: 4px;">warning</span> Necessita preenchimento de formulário
                    </div>
                </div>

                <div class="modal-forms-lista" id="forms-lista-botoes">
                    <!-- Botões injetados por JS -->
                </div>

                <div class="modal-forms-footer">
                    <button class="btn-fechar-forms" onclick="FormsEngine.fechar()">
                        ✕ &nbsp;Fechar
                    </button>
                </div>

            </div>
        `;

        document.body.appendChild(modal);

        // Fechar ao clicar fora do box
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.fechar();
        });

        // Fechar com ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.fechar();
        });

        console.log('[FormsEngine] Modal inicializado.');
    },

    // Abre o modal para um projeto específico
    abrir(nomeProjeto) {
        this.init();

        const projeto = FormsData.getProjeto(nomeProjeto);
        if (!projeto || !projeto.necessitaFormulario) {
            console.warn('[FormsEngine] Projeto sem formulários:', nomeProjeto);
            return;
        }

        this._projetoAtual = nomeProjeto;

        // Nome do projeto no header
        document.getElementById('forms-projeto-nome').textContent = nomeProjeto;

        // Renderiza os botões
        const lista = document.getElementById('forms-lista-botoes');
        lista.innerHTML = '';

        projeto.formularios.forEach((form, i) => {
            const a = document.createElement('a');
            a.href   = form.url;
            a.target = '_blank';
            a.rel    = 'noopener noreferrer';
            a.className = 'forms-btn-card';
            a.style.animationDelay = `${i * 55}ms`;
            a.innerHTML = `
                <span class="forms-btn-icone"><span class="material-icons">${form.icone}</span></span>
                <span class="forms-btn-nome">${form.nome}</span>
                <span class="forms-btn-seta">↗</span>
            `;
            lista.appendChild(a);
        });

        // Exibe com animação
        const overlay = document.getElementById(this._modalId);
        overlay.style.display = 'flex';
        requestAnimationFrame(() => {
            requestAnimationFrame(() => overlay.classList.add('ativo'));
        });
    },

    // Fecha o modal
    fechar() {
        const overlay = document.getElementById(this._modalId);
        if (!overlay) return;
        overlay.classList.remove('ativo');
        setTimeout(() => { overlay.style.display = 'none'; }, 280);
        this._projetoAtual = null;
    },

    // Ponto de entrada: chamar quando projeto for selecionado
    verificarEExibir(nomeProjeto) {
        if (!nomeProjeto) return;
        if (FormsData.necessitaFormulario(nomeProjeto)) {
            this.abrir(nomeProjeto);
        }
    }
};

// Auto-inicializa
document.addEventListener('DOMContentLoaded', () => FormsEngine.init());