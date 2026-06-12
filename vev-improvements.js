/**
 * ============================================================
 * VEV IMPROVEMENTS — Sistema de Melhorias Ford VEV Global
 * Agentes: UX, Performance, Código, Segurança, Acessibilidade
 * ============================================================
 */

// ============================================================
// 1. VEVALERT — Sistema de Modais Estilizados
//    Substitui nativos: alert(), confirm(), prompt()
// ============================================================
const VEVAlert = {
    _activeModals: [],

    /**
     * Substituto estilizado para alert()
     * @param {string} msg - Mensagem a exibir
     * @param {object} opts - { title, icon, type: 'info'|'success'|'warning'|'error' }
     * @returns {Promise<void>}
     */
    alert(msg, opts = {}) {
        return new Promise((resolve) => {
            const { title = 'Aviso', type = 'info', icon } = opts
            const iconMap = {
                info: 'info',
                success: 'check_circle',
                warning: 'warning',
                error: 'error',
            }
            const colorMap = {
                info: 'rgba(56,90,130,.15)',
                success: 'rgba(22,101,52,.15)',
                warning: 'rgba(217,119,6,.15)',
                error: 'rgba(153,27,27,.15)',
            }
            const borderMap = {
                info: 'rgba(56,90,130,.35)',
                success: 'rgba(22,101,52,.35)',
                warning: 'rgba(217,119,6,.35)',
                error: 'rgba(153,27,27,.35)',
            }
            const iconColorMap = {
                info: '#6ea3d4',
                success: '#4ade80',
                warning: '#fbbf24',
                error: '#f87171',
            }

            const usedIcon = icon || iconMap[type] || 'info'
            const id = `vevalert-${Date.now()}`

            const el = document.createElement('div')
            el.id = id
            el.setAttribute('role', 'dialog')
            el.setAttribute('aria-modal', 'true')
            el.setAttribute('aria-label', title)
            el.style.cssText = `
                position:fixed;inset:0;z-index:99999;
                display:flex;align-items:center;justify-content:center;
                padding:20px;
                background:rgba(0,0,0,0.7);
                backdrop-filter:blur(8px);
                -webkit-backdrop-filter:blur(8px);
                animation:vevOverlayIn 0.2s ease forwards;
            `

            el.innerHTML = `
                <div style="
                    background:#1e1e24;
                    border:1px solid ${borderMap[type]};
                    border-radius:20px;
                    padding:28px 24px 22px;
                    max-width:380px;width:100%;
                    box-shadow:0 24px 64px rgba(0,0,0,0.7);
                    animation:vevModalIn 0.25s cubic-bezier(.16,1,.3,1) forwards;
                " role="document">
                    <div style="display:flex;align-items:flex-start;gap:14px;margin-bottom:16px;">
                        <div style="
                            width:44px;height:44px;border-radius:12px;flex-shrink:0;
                            background:${colorMap[type]};border:1px solid ${borderMap[type]};
                            display:flex;align-items:center;justify-content:center;
                        ">
                            <span class="material-icons" style="font-size:1.4rem;color:${iconColorMap[type]};">${usedIcon}</span>
                        </div>
                        <div>
                            <div style="font-size:.9rem;font-weight:800;color:#f4f4f5;margin-bottom:4px;">${title}</div>
                            <div style="font-size:.82rem;color:#d4d4d8;line-height:1.5;">${msg}</div>
                        </div>
                    </div>
                    <button id="${id}-ok" style="
                        width:100%;padding:12px;border:none;border-radius:12px;
                        background:linear-gradient(135deg,#385a82,#4a6c94);
                        color:#fff;font-size:.9rem;font-weight:700;
                        cursor:pointer;font-family:inherit;
                        transition:all 0.2s ease;
                        box-shadow:0 4px 16px rgba(56,90,130,.35);
                    " aria-label="Confirmar">
                        OK
                    </button>
                </div>
            `

            document.body.appendChild(el)
            this._activeModals.push(el)

            const btn = el.querySelector(`#${id}-ok`)
            btn.focus()
            btn.addEventListener('click', () => this._close(el, resolve))
            el.addEventListener('click', (e) => {
                if (e.target === el) this._close(el, resolve)
            })
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' || e.key === 'Enter') this._close(el, resolve)
            })
        })
    },

    /**
     * Substituto estilizado para confirm()
     * @param {string} msg - Mensagem a exibir
     * @param {object} opts - { title, confirmText, cancelText, type }
     * @returns {Promise<boolean>}
     */
    confirm(msg, opts = {}) {
        return new Promise((resolve) => {
            const {
                title = 'Confirmação',
                confirmText = 'Confirmar',
                cancelText = 'Cancelar',
                type = 'warning',
                confirmDanger = false,
            } = opts

            const colorMap = {
                info: 'rgba(56,90,130,.15)',
                success: 'rgba(22,101,52,.15)',
                warning: 'rgba(217,119,6,.15)',
                error: 'rgba(153,27,27,.15)',
            }
            const borderMap = {
                info: 'rgba(56,90,130,.35)',
                success: 'rgba(22,101,52,.35)',
                warning: 'rgba(217,119,6,.35)',
                error: 'rgba(153,27,27,.35)',
            }
            const iconColorMap = {
                info: '#6ea3d4',
                success: '#4ade80',
                warning: '#fbbf24',
                error: '#f87171',
            }
            const iconMap = {
                info: 'info',
                success: 'check_circle',
                warning: 'warning',
                error: 'error',
            }

            const id = `vevconfirm-${Date.now()}`
            const confirmBg = confirmDanger
                ? 'linear-gradient(135deg,#991b1b,#7f1d1d)'
                : 'linear-gradient(135deg,#385a82,#4a6c94)'
            const confirmShadow = confirmDanger
                ? '0 4px 16px rgba(153,27,27,.35)'
                : '0 4px 16px rgba(56,90,130,.35)'

            const el = document.createElement('div')
            el.id = id
            el.setAttribute('role', 'dialog')
            el.setAttribute('aria-modal', 'true')
            el.setAttribute('aria-label', title)
            el.style.cssText = `
                position:fixed;inset:0;z-index:99999;
                display:flex;align-items:center;justify-content:center;
                padding:20px;
                background:rgba(0,0,0,0.75);
                backdrop-filter:blur(8px);
                -webkit-backdrop-filter:blur(8px);
            `

            el.innerHTML = `
                <div style="
                    background:#1e1e24;
                    border:1px solid ${borderMap[type]};
                    border-radius:20px;
                    padding:28px 24px 22px;
                    max-width:380px;width:100%;
                    box-shadow:0 24px 64px rgba(0,0,0,0.7);
                    animation:vevModalIn 0.25s cubic-bezier(.16,1,.3,1) forwards;
                " role="document">
                    <div style="display:flex;align-items:flex-start;gap:14px;margin-bottom:20px;">
                        <div style="
                            width:44px;height:44px;border-radius:12px;flex-shrink:0;
                            background:${colorMap[type]};border:1px solid ${borderMap[type]};
                            display:flex;align-items:center;justify-content:center;
                        ">
                            <span class="material-icons" style="font-size:1.4rem;color:${iconColorMap[type]};">${iconMap[type]}</span>
                        </div>
                        <div>
                            <div style="font-size:.9rem;font-weight:800;color:#f4f4f5;margin-bottom:4px;">${title}</div>
                            <div style="font-size:.82rem;color:#d4d4d8;line-height:1.5;">${msg}</div>
                        </div>
                    </div>
                    <div style="display:flex;gap:10px;">
                        <button id="${id}-cancel" style="
                            flex:1;padding:12px;border-radius:12px;
                            background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);
                            color:#d4d4d8;font-size:.88rem;font-weight:700;
                            cursor:pointer;font-family:inherit;transition:all 0.2s;
                        " aria-label="${cancelText}">
                            ${cancelText}
                        </button>
                        <button id="${id}-confirm" style="
                            flex:2;padding:12px;border:none;border-radius:12px;
                            background:${confirmBg};
                            color:#fff;font-size:.88rem;font-weight:700;
                            cursor:pointer;font-family:inherit;transition:all 0.2s;
                            box-shadow:${confirmShadow};
                        " aria-label="${confirmText}">
                            ${confirmText}
                        </button>
                    </div>
                </div>
            `

            document.body.appendChild(el)
            this._activeModals.push(el)

            el.querySelector(`#${id}-confirm`).focus()
            el.querySelector(`#${id}-confirm`).addEventListener('click', () =>
                this._close(el, resolve, true)
            )
            el.querySelector(`#${id}-cancel`).addEventListener('click', () =>
                this._close(el, resolve, false)
            )
            el.addEventListener('click', (e) => {
                if (e.target === el) this._close(el, resolve, false)
            })
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') this._close(el, resolve, false)
                if (e.key === 'Enter') this._close(el, resolve, true)
            })
        })
    },

    _close(el, resolve, value) {
        el.style.opacity = '0'
        el.style.transition = 'opacity 0.15s ease'
        setTimeout(() => {
            if (el.parentNode) el.parentNode.removeChild(el)
            const idx = this._activeModals.indexOf(el)
            if (idx > -1) this._activeModals.splice(idx, 1)
        }, 150)
        resolve(value)
    },
}

// Injetar animações CSS para os modais VEVAlert
;(function injectVEVAlertStyles() {
    if (document.getElementById('vevalert-styles')) return
    const style = document.createElement('style')
    style.id = 'vevalert-styles'
    style.textContent = `
        @keyframes vevModalIn {
            from { opacity:0; transform:scale(0.92) translateY(12px); }
            to   { opacity:1; transform:scale(1) translateY(0); }
        }
        @keyframes vevOverlayIn {
            from { opacity:0; }
            to   { opacity:1; }
        }
    `
    document.head.appendChild(style)
})()

// ============================================================
// 2. GPS BATCHING — Debounce do rastroGps para o Firebase
//    Salva acumulado a cada 30s, reduz writes no RTDB
// ============================================================
const GPSBatcher = {
    _pendentes: [],
    _timer: null,
    _intervalo: 30000, // 30 segundos

    adicionar(ponto) {
        this._pendentes.push(ponto)
        if (!this._timer) {
            this._timer = setTimeout(() => this._flush(), this._intervalo)
        }
    },

    _flush() {
        this._timer = null
        if (this._pendentes.length === 0) return

        const pontos = [...this._pendentes]
        this._pendentes = []

        // Salvar separado do estado principal — chave própria no RTDB
        if (typeof firebase !== 'undefined' && typeof app !== 'undefined' && app.operadorAtual) {
            const dataHoje = app.obterDataDoTurno?.() || new Date().toISOString().split('T')[0]
            const ref = firebase.database().ref(`vev_gps_batch/${dataHoje}/${app.operadorAtual}`)
            ref.once('value')
                .then((snap) => {
                    const existente = snap.val() || []
                    ref.set([...existente, ...pontos]).catch((e) => {
                        console.warn('[GPSBatcher] Erro ao salvar batch GPS:', e)
                    })
                })
                .catch(() => {
                    // Guardar no localStorage como backup
                    const key = `vev_gps_backup_${app.operadorAtual}`
                    const existente = JSON.parse(localStorage.getItem(key) || '[]')
                    localStorage.setItem(key, JSON.stringify([...existente, ...pontos].slice(-500)))
                })
        }
    },

    forcarSalvar() {
        if (this._timer) {
            clearTimeout(this._timer)
            this._timer = null
        }
        this._flush()
    },
}

// ============================================================
// 3. LAZY LOADER — Carregamento sob demanda do Leaflet
// ============================================================
const LeafletLoader = {
    _loaded: false,
    _loading: false,
    _callbacks: [],

    carregar(callback) {
        if (this._loaded) {
            callback?.()
            return
        }

        if (callback) this._callbacks.push(callback)

        if (this._loading) return
        this._loading = true

        // CSS do Leaflet
        if (!document.getElementById('leaflet-css-lazy')) {
            const link = document.createElement('link')
            link.id = 'leaflet-css-lazy'
            link.rel = 'stylesheet'
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
            document.head.appendChild(link)
        }

        // JS do Leaflet
        const script = document.createElement('script')
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
        script.onload = () => {
            this._loaded = true
            this._loading = false
            this._callbacks.forEach((cb) => cb?.())
            this._callbacks = []
            console.log('[LeafletLoader] Leaflet carregado dinamicamente.')
        }
        script.onerror = () => {
            console.warn('[LeafletLoader] Falha ao carregar Leaflet dinamicamente.')
            this._loading = false
        }
        document.head.appendChild(script)
    },
}

// ============================================================
// 4. ACCESSIBILITY ENHANCER — Melhorias de acessibilidade
// ============================================================
const VEVAccessibility = {
    init() {
        this._setupFocusVisible()
        this._addAriaLabels()
        this._setupReducedMotion()
        this._addDialogRoles()
        this._improveTouchTargets()
        console.log('[VEVAccessibility] Módulo de acessibilidade inicializado.')
    },

    // Focus ring visível para navegação por teclado
    _setupFocusVisible() {
        const style = document.createElement('style')
        style.id = 'vev-focus-visible'
        style.textContent = `
            /* Focus ring apenas para navegação por teclado (não mouse) */
            :focus-visible {
                outline: 2px solid rgba(56, 90, 130, 0.8) !important;
                outline-offset: 2px !important;
                border-radius: 4px;
            }
            /* Remove outline padrão bruto sem remover o focus-visible */
            :focus:not(:focus-visible) {
                outline: none !important;
            }
            /* Inputs com foco visível */
            input:focus-visible,
            select:focus-visible,
            textarea:focus-visible {
                border-color: rgba(56,90,130,.8) !important;
                box-shadow: 0 0 0 3px rgba(56,90,130,.18) !important;
                outline: none !important;
            }
            /* Botões com alto contraste de foco */
            button:focus-visible {
                outline: 2px solid rgba(56, 90, 130, 0.9) !important;
                outline-offset: 3px !important;
                box-shadow: 0 0 0 4px rgba(56,90,130,.15) !important;
            }
            /* Previne auto-zoom no iOS Safari ao focar em inputs definindo fonte mínima de 16px */
            input, select, textarea {
                font-size: 16px !important;
            }
        `
        document.head.appendChild(style)
    },

    // prefers-reduced-motion: respeitar preferência do sistema
    _setupReducedMotion() {
        const style = document.createElement('style')
        style.id = 'vev-reduced-motion'
        style.textContent = `
            @media (prefers-reduced-motion: reduce) {
                *,
                *::before,
                *::after {
                    animation-duration: 0.01ms !important;
                    animation-iteration-count: 1 !important;
                    transition-duration: 0.01ms !important;
                    scroll-behavior: auto !important;
                }
                .pulse-dot {
                    animation: none !important;
                    box-shadow: 0 0 8px var(--cyan) !important;
                }
                .welcome-bar {
                    animation: none !important;
                    width: 100% !important;
                }
                .login-particle {
                    animation: none !important;
                }
            }
        `
        document.head.appendChild(style)
    },

    // Adicionar aria-labels nos botões de ícone
    _addAriaLabels() {
        const ariaMap = {
            'btn-notificacoes': 'Notificações',
            'btn-sidebar-open': 'Abrir perfil',
            'btn-sidebar-close': 'Fechar painel',
            'btn-approval-panel': 'Aprovações pendentes',
            'btn-close-viewer': 'Fechar visualizador',
            'btn-pwa-install': 'Instalar aplicativo',
            'btn-pend-sair': 'Sair da conta',
        }

        Object.entries(ariaMap).forEach(([id, label]) => {
            const el = document.getElementById(id)
            if (el && !el.getAttribute('aria-label')) {
                el.setAttribute('aria-label', label)
            }
        })

        // Botões genéricos de fechar modal
        document.querySelectorAll('.close-btn:not([aria-label])').forEach((btn) => {
            btn.setAttribute('aria-label', 'Fechar')
        })

        // Botões de navegação inferior
        document.querySelectorAll('.nav-item:not([aria-label])').forEach((btn) => {
            const label = btn.querySelector('.nav-label')?.textContent
            if (label) btn.setAttribute('aria-label', label)
        })

        // Ícones de itens bento
        document.querySelectorAll('.bento-btn:not([aria-label])').forEach((btn) => {
            const label = btn.querySelector('.bento-label')?.textContent?.trim()
            if (label) btn.setAttribute('aria-label', label)
        })
    },

    // Adicionar role="dialog" e aria-modal nos modais
    _addDialogRoles() {
        document.querySelectorAll('.modal-overlay').forEach((overlay) => {
            const content = overlay.querySelector('.modal-content')
            if (content && !content.getAttribute('role')) {
                content.setAttribute('role', 'dialog')
                content.setAttribute('aria-modal', 'true')
                const title = content.querySelector('.modal-title')
                if (title) {
                    const titleId = 'modal-title-' + Math.random().toString(36).substr(2, 9)
                    title.id = titleId
                    content.setAttribute('aria-labelledby', titleId)
                }
            }
        })
    },

    // Melhorar áreas de toque para mínimo 44×44px
    _improveTouchTargets() {
        const style = document.createElement('style')
        style.id = 'vev-touch-targets'
        style.textContent = `
            /* Garantir touch target mínimo de 44×44px */
            .nav-item {
                min-height: 56px !important;
                min-width: 44px !important;
            }
            .nav-pill {
                padding: 6px 24px !important;
            }
            /* Bento buttons touch area */
            .bento-btn {
                min-height: 80px !important;
                padding: 16px 10px !important;
            }
            .bento-icon {
                width: 48px !important;
                height: 48px !important;
            }
            /* Header action buttons */
            .header-icon-btn {
                width: 40px !important;
                height: 40px !important;
            }
            /* Close buttons */
            .close-btn {
                width: 36px !important;
                height: 36px !important;
                min-width: 36px !important;
                min-height: 36px !important;
            }
            /* Feed cards swipeable area */
            .feed-card {
                min-height: 64px !important;
            }
            /* Filter chips */
            .filter-chip {
                min-height: 36px !important;
                display: inline-flex !important;
                align-items: center !important;
            }
        `
        document.head.appendChild(style)
    },
}

// ============================================================
// 5. SKELETON LOADER — Placeholders de carregamento animados
// ============================================================
const VEVSkeleton = {
    _stylesInjected: false,

    _injectStyles() {
        if (this._stylesInjected) return
        this._stylesInjected = true

        const style = document.createElement('style')
        style.id = 'vev-skeleton-styles'
        style.textContent = `
            .skeleton-base {
                background: linear-gradient(90deg,
                    rgba(255,255,255,.04) 25%,
                    rgba(255,255,255,.09) 50%,
                    rgba(255,255,255,.04) 75%
                );
                background-size: 200% 100%;
                animation: skeletonShimmer 1.4s ease infinite;
                border-radius: 8px;
            }
            @keyframes skeletonShimmer {
                0%   { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }
            @media (prefers-reduced-motion: reduce) {
                .skeleton-base { animation: none; background: rgba(255,255,255,.06); }
            }
            .skeleton-card {
                background: #1e1e24;
                border: 1px solid rgba(228,228,231,.08);
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 10px;
            }
            .skeleton-line {
                height: 12px;
                margin-bottom: 10px;
            }
            .skeleton-line.wide  { width: 80%; }
            .skeleton-line.medium{ width: 55%; }
            .skeleton-line.short { width: 35%; }
            .skeleton-avatar {
                width: 40px; height: 40px;
                border-radius: 10px;
                flex-shrink: 0;
            }
            .skeleton-row {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 8px;
            }
        `
        document.head.appendChild(style)
    },

    /**
     * Gera HTML de skeleton para lista de histórico
     * @param {number} count - Número de cards skeleton
     * @returns {string} HTML
     */
    gerarListaHistorico(count = 3) {
        this._injectStyles()
        return Array.from(
            { length: count },
            () => `
            <div class="skeleton-card">
                <div class="skeleton-row">
                    <div class="skeleton-base skeleton-avatar"></div>
                    <div style="flex:1;">
                        <div class="skeleton-base skeleton-line wide"></div>
                        <div class="skeleton-base skeleton-line medium"></div>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;">
                        <div class="skeleton-base skeleton-line short" style="width:60px;"></div>
                        <div class="skeleton-base skeleton-line short" style="width:40px;height:18px;border-radius:6px;"></div>
                    </div>
                </div>
            </div>
        `
        ).join('')
    },

    /**
     * Gera HTML de skeleton para cards analytics 2x2
     * @returns {string} HTML
     */
    gerarAnalyticsCards() {
        this._injectStyles()
        return `
            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:16px;">
                ${Array.from(
                    { length: 4 },
                    () => `
                    <div class="skeleton-card" style="text-align:center;">
                        <div class="skeleton-base skeleton-line" style="width:60%;margin:0 auto 10px;height:28px;border-radius:6px;"></div>
                        <div class="skeleton-base skeleton-line short" style="margin:0 auto;width:70%;"></div>
                    </div>
                `
                ).join('')}
            </div>
        `
    },

    /**
     * Mostra skeleton em um container e retorna função de remoção
     * @param {string} containerId - ID do elemento
     * @param {'historico'|'analytics'} tipo - Tipo de skeleton
     * @returns {function} Função para remover skeleton
     */
    mostrar(containerId, tipo = 'historico') {
        this._injectStyles()
        const container = document.getElementById(containerId)
        if (!container) return () => {}

        const html = tipo === 'analytics' ? this.gerarAnalyticsCards() : this.gerarListaHistorico(3)

        container.innerHTML = html

        return () => {
            if (container.innerHTML === html) container.innerHTML = ''
        }
    },
}

// ============================================================
// 6. LAZY IMAGE LOADER — Carregamento lazy de imagens
// ============================================================
const VEVLazyImages = {
    init() {
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach((entry) => {
                        if (entry.isIntersecting) {
                            const img = entry.target
                            if (img.dataset.src) {
                                img.src = img.dataset.src
                                img.removeAttribute('data-src')
                                observer.unobserve(img)
                            }
                        }
                    })
                },
                { rootMargin: '50px' }
            )

            document.querySelectorAll('img[data-src]').forEach((img) => observer.observe(img))
            console.log('[VEVLazyImages] Lazy loading de imagens ativado.')
        }
    },
}

// ============================================================
// 7. LOCKOUT UPGRADE — Migrar lockout para localStorage
//    Persiste entre sessões/reloads
// ============================================================
const VEVLockout = {
    _MAX: 3,
    _TEMPO: 5 * 60 * 1000,

    getTentativas() {
        return parseInt(localStorage.getItem('vev_lock_t') || '0')
    },
    setTentativas(n) {
        localStorage.setItem('vev_lock_t', n)
    },
    getBloqueioAte() {
        return parseInt(localStorage.getItem('vev_lock_b') || '0')
    },
    setBloqueioAte(ts) {
        localStorage.setItem('vev_lock_b', ts)
    },
    estaBloqueado() {
        return Date.now() < this.getBloqueioAte()
    },

    limpar() {
        localStorage.removeItem('vev_lock_t')
        localStorage.removeItem('vev_lock_b')
    },

    registrarFalha() {
        const t = this.getTentativas() + 1
        this.setTentativas(t)

        if (t >= this._MAX) {
            this.setBloqueioAte(Date.now() + this._TEMPO)
            this.setTentativas(0)
            return true // bloqueado
        }
        return false
    },
}

// ============================================================
// 8. TOGGLE TEMA — Light/Dark mode manual
// ============================================================
const VEVTheme = {
    _key: 'vev_theme_preference',

    get current() {
        return localStorage.getItem(this._key) || 'dark'
    },

    init() {
        const saved = this.current
        if (saved === 'light') {
            document.documentElement.setAttribute('data-theme', 'light')
        }
        this._updateIcon()
    },

    toggle() {
        const next = this.current === 'dark' ? 'light' : 'dark'
        localStorage.setItem(this._key, next)
        document.documentElement.setAttribute('data-theme', next)
        this._updateIcon()
    },

    _updateIcon() {
        const btn = document.getElementById('btn-theme-toggle')
        if (btn) {
            const icon = btn.querySelector('.material-icons')
            if (icon) icon.textContent = this.current === 'dark' ? 'light_mode' : 'dark_mode'
        }
    },
}

// ============================================================
// INICIALIZAÇÃO — Executar após DOM carregado
// ============================================================
function initVEVImprovements() {
    // Acessibilidade
    VEVAccessibility.init()

    // Lazy images
    VEVLazyImages.init()

    // Tema
    VEVTheme.init()

    console.log('[VEV Improvements] ✅ Todos os módulos de melhoria inicializados.')
}

// Auto-inicializar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVEVImprovements)
} else {
    initVEVImprovements()
}

// Expor globalmente
window.VEVAlert = VEVAlert
window.VEVSkeleton = VEVSkeleton
window.GPSBatcher = GPSBatcher
window.LeafletLoader = LeafletLoader
window.VEVTheme = VEVTheme
window.VEVLockout = VEVLockout
