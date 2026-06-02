// ─────────────────────────────────────────
// 0. CONFIGURAÇÃO — preencha com seus dados
// ─────────────────────────────────────────
const EMAILJS_CONFIG = {
    publicKey:      'eKsDgVzhqI1iwKtxM',
    serviceId:      'service_eklaw93',
    tplCadastro:    'template_1qyihsc',
    tplAprovado:    'template_0rjtr17',

    // Opcional: caso exista template de confirmação.
    // Se não existir, pode deixar vazio/null.
    tplConfirmacao: null,
};

// Homologação: identifica se o app está rodando localmente (Vite / Dev)
const isLocal = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' || 
    window.location.hostname.startsWith('192.168.')
);

const EMAILS_APROVADORES = {
    coordenadores: ['rtorr105@ford.com'],
    gerentes:      ['rtorr105@ford.com'],
};

// ─────────────────────────────────────────
// 0.1 HELPERS — OPERADORES AUTOMÁTICOS
// ─────────────────────────────────────────

function normalizarNomeOperador(nome, email) {
    if (nome && nome.trim().length > 0) return nome.trim();
    return (email || '').split('@')[0].toUpperCase();
}

/**
 * Cadastra automaticamente usuário como Operador/Analista.
 *
 * Salva em:
 * 1. localStorage: compatível com PreCadastroEngine atual.
 * 2. Firestore: prepara backend estruturado futuro.
 */
async function cadastrarOperadorAutomatico({ uid, nome, email, cargo, matricula }) {
    try {
        const nomeFinal = normalizarNomeOperador(nome, email);
        const cargoFinal = cargo || 'Analista';

        // 1. Salva no localStorage usado pelo PreCadastroEngine atual
        const key = 'vev_pc_operadores';
        const lista = JSON.parse(localStorage.getItem(key) || '[]');

        const idx = lista.findIndex(op =>
            op.uid === uid ||
            op.email === email ||
            String(op.nome || '').toLowerCase() === String(nomeFinal || '').toLowerCase()
        );

        const operadorLocal = {
            id: idx >= 0 ? lista[idx].id : `operadores_${Date.now()}`,
            uid: uid || '',
            nome: nomeFinal,
            email: email || '',
            cargo: cargoFinal,
            matricula: matricula || '',
            origem: 'auth',
            atualizadoEmLocal: new Date().toISOString(),
        };

        if (idx >= 0) {
            lista[idx] = { ...lista[idx], ...operadorLocal };
        } else {
            lista.push(operadorLocal);
        }

        localStorage.setItem(key, JSON.stringify(lista));

        // 2. Salva no Firestore para backend futuro
        if (uid && typeof firebase !== 'undefined' && firebase.firestore) {
            await firebase.firestore().collection('vev_operadores').doc(uid).set({
                uid,
                nome: nomeFinal,
                email: email || '',
                cargo: cargoFinal,
                matricula: matricula || '',
                origem: 'auth',
                ativo: true,
                atualizadoEm: firebase.firestore.FieldValue.serverTimestamp(),
                criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
        }

        console.log('[OperadorAuto] Operador sincronizado:', nomeFinal);
    } catch (e) {
        console.warn('[OperadorAuto] Falha ao cadastrar operador automaticamente:', e);
    }
}

// ─────────────────────────────────────────
// 1. ROLE ENGINE — RBAC
// ─────────────────────────────────────────
const RoleEngine = {
    _perfil: null,

    set perfil(p) {
        this._perfil = p;

        document.body.dataset.cargo = p?.cargo || '';

        const badge = document.getElementById('ui-cargo-badge');
        if (badge) {
            badge.innerText = p?.cargo || '';
            badge.dataset.cargo = p?.cargo || '';
        }

        // Inicializar painel do coordenador ao logar
        const cargosGestao = ['Coordenador', 'Gerente', 'Administrador'];
        if (cargosGestao.includes(p?.cargo)) {
            setTimeout(() => {
                // Tabela RBAC
                if (typeof carregarTabelaEquipe === 'function') carregarTabelaEquipe();

                // Carregar e-mail master salvo
                const emailSalvo = localStorage.getItem('vev_emailMaster');
                const inputEmail = document.getElementById('ops-email-master');
                if (inputEmail && emailSalvo) {
                    inputEmail.value = emailSalvo;
                    const saveBtn = document.getElementById('ops-email-save-btn');
                    if (saveBtn) saveBtn.disabled = false;
                }

                // Sync stats rota
                if (typeof atualizarStatsAdminRota === 'function') atualizarStatsAdminRota();
            }, 800);
        }
    },

    get perfil() {
        return this._perfil;
    },

    async carregar(uid) {
        try {
            const snap = await firebase.firestore().collection('vev_usuarios').doc(uid).get();

            if (snap.exists) {
                this.perfil = snap.data();
                return snap.data();
            }
        } catch (e) {
            console.error('[RoleEngine]', e);
        }

        return null;
    },

    isAprovado() {
        return this._perfil?.status === 'aprovado';
    },

    isGestao() {
        const email = this._perfil?.email || '';
        return this._perfil?.hasFullAccess === true || email.toLowerCase().endsWith('@ford.com') || isLocal || ['Coordenador', 'Gerente', 'Administrador'].includes(this._perfil?.cargo);
    },

    isGerente() {
        const email = this._perfil?.email || '';
        return this._perfil?.hasFullAccess === true || email.toLowerCase().endsWith('@ford.com') || isLocal || ['Gerente', 'Administrador'].includes(this._perfil?.cargo);
    },

    isAdministrador() {
        const email = this._perfil?.email || '';
        return this._perfil?.hasFullAccess === true || email.toLowerCase().endsWith('@ford.com') || isLocal || this._perfil?.cargo === 'Administrador';
    },
};

// ─────────────────────────────────────────
// 2. EMAIL ENGINE
// ─────────────────────────────────────────
const EmailEngine = {
    _ok: false,

    init() {
        if (typeof emailjs === 'undefined') return;

        emailjs.init({ publicKey: EMAILJS_CONFIG.publicKey });
        this._ok = true;
    },

    async send(tpl, params) {
        if (!this._ok) {
            console.warn('[EmailEngine] Não iniciado');
            return;
        }

        if (!tpl) {
            console.warn('[EmailEngine] Template não configurado. Envio ignorado.');
            return;
        }

        try {
            await emailjs.send(EMAILJS_CONFIG.serviceId, tpl, params);
        } catch (e) {
            console.error('[EmailEngine]', e);
        }
    },

    async novoUsuario(p) {
        // Auto-aprovacao: @ford.com nao requer aprovacao manual de gestores.
        // Email de confirmacao enviado apenas ao proprio usuario (opcional).
        await this.send(EMAILJS_CONFIG.tplConfirmacao, {
            email_usuario:          p.email,
            nome_usuario:           p.nome,
            cargo_usuario:          p.cargo,
            responsavel_aprovacao:  'Sistema Ford VEV (Automatico)',
        });
    },

    async aprovado(p, aprovador) {
        await this.send(EMAILJS_CONFIG.tplAprovado, {
            email_usuario:  p.email,
            nome_usuario:  p.nome,
            cargo_usuario:  p.cargo,
            aprovador_nome: aprovador,
        });
    },
};

// ─────────────────────────────────────────
// 3. APPROVAL ENGINE
// ─────────────────────────────────────────
const ApprovalEngine = {
    async pendentes() {
        const snap = await firebase.firestore()
            .collection('vev_usuarios')
            .where('status', '==', 'pendente')
            .get();

        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    async aprovar(uid) {
        const gestor = RoleEngine.perfil?.nome || 'Gestor';

        await firebase.firestore().collection('vev_usuarios').doc(uid).update({
            status: 'aprovado',
            aprovadoPor: gestor,
            aprovadoEm: firebase.firestore.FieldValue.serverTimestamp(),
        });

        const snap = await firebase.firestore().collection('vev_usuarios').doc(uid).get();

        if (snap.exists) {
            const perfil = snap.data();

            // NOVO: garante cadastro do aprovado como operador no backend/local
            await cadastrarOperadorAutomatico({
                uid,
                nome: perfil.nome,
                email: perfil.email,
                cargo: perfil.cargo,
                matricula: perfil.matricula || '',
            });

            await EmailEngine.aprovado(perfil, gestor);
        }
    },

    async rejeitar(uid) {
        await firebase.firestore().collection('vev_usuarios').doc(uid).update({
            status: 'rejeitado'
        });
    },
};

// ─────────────────────────────────────────
// 4. APPROVAL PANEL UI
// ─────────────────────────────────────────
const ApprovalPanelUI = {
    async verificarPendentes() {
        if (!RoleEngine.isGestao()) return;

        const btn = document.getElementById('btn-approval-panel');
        if (!btn) return;

        const lista = await ApprovalEngine.pendentes();

        if (lista.length > 0) {
            btn.style.display = 'flex';

            const b = document.getElementById('aprov-count');
            if (b) b.innerText = lista.length;
        } else {
            btn.style.display = 'none';
        }
    },

    async abrirPanel() {
        const modal = document.getElementById('modal-aprovacoes');
        if (!modal) return;

        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        await this._render();
    },

    async _render() {
        const c = document.getElementById('lista-aprovacoes');
        if (!c) return;

        c.innerHTML = '<div style="text-align:center;padding:1rem;color:var(--text-secondary);">Carregando...</div>';

        const lista = await ApprovalEngine.pendentes();

        if (!lista.length) {
            c.innerHTML = `
                <div style="text-align:center;padding:2.5rem;color:var(--text-secondary);">
                    <span class="material-icons" style="font-size:2.5rem;opacity:0.25;display:block;margin-bottom:10px;">verified_user</span>
                    Nenhuma aprovação pendente
                </div>`;
            return;
        }

        c.innerHTML = lista.map(u => `
            <div class="aprov-item" id="apr-${u.id}">
                <div class="aprov-info">
                    <span class="aprov-nome">${u.nome || u.email}</span>
                    <span class="aprov-sub">${u.cargo} · ${u.email}</span>
                </div>
                <div class="aprov-btns">
                    <button class="btn-aprov" title="Aprovar acesso"
                            onclick="ApprovalPanelUI._aprovar('${u.id}',this)">
                        <span class="material-icons">check</span>
                    </button>
                    <button class="btn-rejeit" title="Rejeitar acesso"
                            onclick="ApprovalPanelUI._rejeitar('${u.id}',this)">
                        <span class="material-icons">close</span>
                    </button>
                </div>
            </div>
        `).join('');
    },

    async _aprovar(uid, btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="material-icons" style="font-size:0.9rem;animation:spin 1s linear infinite;">hourglass_empty</span>';

        try {
            await ApprovalEngine.aprovar(uid);

            const item = document.getElementById(`apr-${uid}`);
            if (item) {
                item.innerHTML = `<div style="color:var(--neon-green);font-size:0.85rem;padding:10px;width:100%;">Aprovado e notificado por e-mail</div>`;
            }

            this.verificarPendentes();
        } catch (e) {
            alert('Erro ao aprovar: ' + e.message);
            btn.disabled = false;
        }
    },

    async _rejeitar(uid, btn) {
        if (!confirm('Rejeitar o acesso deste usuário?')) return;

        btn.disabled = true;

        try {
            await ApprovalEngine.rejeitar(uid);

            const item = document.getElementById(`apr-${uid}`);
            if (item) {
                item.innerHTML = `<div style="color:var(--neon-red);font-size:0.85rem;padding:10px;width:100%;">Acesso rejeitado</div>`;
            }

            this.verificarPendentes();
        } catch (e) {
            alert('Erro ao rejeitar: ' + e.message);
        }
    },
};

// ─────────────────────────────────────────
// 5. BLOQUEIO E TENTATIVAS
// ─────────────────────────────────────────
const MAX_TENTATIVAS = 3;
const TEMPO_BLOQUEIO = 5 * 60 * 1000;

const getTentativas  = () => parseInt(sessionStorage.getItem('vev_t') || '0');
const setTentativas  = (n) => sessionStorage.setItem('vev_t', n);
const getBloqueioAte = () => parseInt(sessionStorage.getItem('vev_b') || '0');
const setBloqueioAte = (ts) => sessionStorage.setItem('vev_b', ts);
const estaBloqueado  = () => Date.now() < getBloqueioAte();

function limparTentativas() {
    sessionStorage.removeItem('vev_t');
    sessionStorage.removeItem('vev_b');
}

function registrarFalha() {
    const t = getTentativas() + 1;
    setTentativas(t);

    if (t >= MAX_TENTATIVAS) {
        setBloqueioAte(Date.now() + TEMPO_BLOQUEIO);
        setTentativas(0);
        iniciarContagem();
    } else {
        atualizarTentativas(t);
    }
}

let _iContagem = null;

function iniciarContagem() {
    const banner   = document.getElementById('lockout-banner');
    const contador = document.getElementById('lockout-contador');

    if (banner) banner.style.display = 'block';

    resetBtn();

    const btn = document.getElementById('btn-auth-principal');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = 'Aguarde...';
    }

    if (_iContagem) clearInterval(_iContagem);

    _iContagem = setInterval(() => {
        const r = getBloqueioAte() - Date.now();

        if (r <= 0) {
            clearInterval(_iContagem);

            if (banner) banner.style.display = 'none';

            resetBtn();

            const i = document.getElementById('tentativas-info');
            if (i) {
                i.className = '';
                i.innerText = '';
            }
        } else {
            const m = Math.floor(r / 60000);
            const s = Math.floor((r % 60000) / 1000);

            if (contador) contador.innerText = `${m}:${s.toString().padStart(2, '0')}`;
        }
    }, 1000);
}

function atualizarTentativas(t) {
    const i = document.getElementById('tentativas-info');
    const r = MAX_TENTATIVAS - t;

    if (!i) return;

    i.className = r === 1 ? 'perigo' : 'alerta';
    i.innerText = r === 1
        ? 'Última tentativa antes do bloqueio'
        : `${r} tentativas restantes`;
}

// ─────────────────────────────────────────
// 6. VALIDAÇÃO EMAIL + FORÇA SENHA
// ─────────────────────────────────────────
function validarEmailTempoReal(input) {
    const e = input.value.trim().toLowerCase();
    const f = document.getElementById('email-feedback');

    if (!f) return;

    if (!e) {
        input.className = 'ford-input';
        f.className = 'input-feedback neutro';
        f.innerHTML = 'Apenas e-mails @ford.com são permitidos';
        return;
    }

    if ((e.endsWith('@ford.com') || isLocal) && e.length > 5) {
        input.className = 'ford-input input-valido';
        f.className = 'input-feedback valido';
        f.innerHTML = '<span class="material-icons">check_circle</span> E-mail corporativo válido';
    } else if (e.includes('@') && !e.endsWith('@ford.com') && !isLocal) {
        input.className = 'ford-input input-invalido';
        f.className = 'input-feedback invalido';
        f.innerHTML = '<span class="material-icons">cancel</span> Apenas @ford.com é permitido';
    } else {
        input.className = 'ford-input';
        f.className = 'input-feedback neutro';
        f.innerHTML = 'Apenas e-mails @ford.com são permitidos';
    }
}

function avaliarForcaSenha(input) {
    const c = document.getElementById('strength-container');

    if (modoAtual !== 'signup') {
        if (c) c.style.display = 'none';
        return;
    }

    if (c) c.style.display = 'block';

    const v = input.value;

    ['seg1', 'seg2', 'seg3'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.className = 'strength-segment';
    });

    const lb = document.getElementById('strength-label-text');

    if (!v.length) {
        if (lb) lb.innerText = '';
        return;
    }

    const ok8 = v.length >= 8;
    const hasU = /[A-Z]/.test(v);
    const hasN = /[0-9]/.test(v);
    const hasS = /[^A-Za-z0-9]/.test(v);

    let sc = 0;

    if (ok8) sc = 1;
    if (ok8 && (hasN || hasS)) sc = 2;
    if (ok8 && hasU && hasN && hasS) sc = 3;

    const cls = ['', 'fraca', 'media', 'forte'][sc] || 'fraca';

    if (sc >= 1) document.getElementById('seg1')?.classList.add(cls);
    if (sc >= 2) document.getElementById('seg2')?.classList.add(sc === 2 ? 'media' : 'forte');
    if (sc >= 3) document.getElementById('seg3')?.classList.add('forte');

    if (lb) {
        lb.innerText = ['', 'Fraca', 'Média', 'Forte ✓'][sc] || 'Muito fraca';
        lb.style.color = ['', '#ef4444', '#f97316', '#10b981'][sc];
    }
}

// ─────────────────────────────────────────
// 7. BOAS-VINDAS
// ─────────────────────────────────────────
function exibirBoasVindas(nome) {
    const t = document.getElementById('tela-boas-vindas');
    if (!t) return;

    const n = document.getElementById('welcome-nome-texto');
    if (n) n.innerText = nome;

    t.style.display = 'flex';

    const b = t.querySelector('.welcome-bar');
    if (b) {
        b.style.animation = 'none';
        b.offsetHeight;
        b.style.animation = 'fillBar 2s linear 0.6s forwards';
    }

    setTimeout(() => {
        t.style.display = 'none';
    }, 2300);
}

// ─────────────────────────────────────────
// 8. MODO AUTH
// ─────────────────────────────────────────
let modoAtual = 'login';

function mudarModoAuth(modo) {
    modoAtual = modo;

    // ── Troca classe ativa nas abas ────────────────
    document.getElementById('tab-login')?.classList.toggle('active', modo === 'login');
    document.getElementById('tab-signup')?.classList.toggle('active', modo === 'signup');

    // ── Esqueci senha — só aparece no login ────────
    const esqueciDiv = document.getElementById('container-esqueci-senha');
    if (esqueciDiv) {
        esqueciDiv.style.display = modo === 'login' ? 'block' : 'none';
    }

    // ── Campos extras — animação ao abrir/fechar ───
    const extras = document.getElementById('signup-extra-fields');
    if (extras) {
        if (modo === 'signup') {
            extras.style.display    = 'block';
            extras.style.overflow   = 'hidden';
            extras.style.maxHeight  = '0';
            extras.style.opacity    = '0';
            extras.style.transition = 'max-height 0.4s ease, opacity 0.3s ease';
            requestAnimationFrame(() => {
                extras.style.maxHeight = '400px';
                extras.style.opacity   = '1';
            });
        } else {
            extras.style.transition = 'max-height 0.3s ease, opacity 0.3s ease';
            extras.style.maxHeight  = '0';
            extras.style.opacity    = '0';
            setTimeout(() => {
                extras.style.display = 'none';
            }, 300);
        }
    }

    // ── Barra de força da senha ────────────────────
    const strengthC = document.getElementById('strength-container');
    if (strengthC) {
        strengthC.style.display = modo === 'signup' ? 'block' : 'none';
    }

    // ── Texto do botão principal ───────────────────
    const btnTexto = document.getElementById('btn-auth-texto');
    if (btnTexto) {
        btnTexto.innerHTML = modo === 'login'
            ? '🔐 Acessar Sistema'
            : '🚀 Criar Conta';
    }

    // ── Limpa aviso de tentativas ──────────────────
    const tentativas = document.getElementById('tentativas-info');
    if (tentativas) tentativas.innerText = '';

    // ── Reseta botão se existir ────────────────────
    if (typeof resetBtn === 'function') resetBtn();
}


function resetBtn() {
    const btn = document.getElementById('btn-auth-principal');
    if (!btn) return;

    btn.disabled = false;
    btn.innerHTML = modoAtual === 'login' ? 'Acessar Sistema' : 'Criar Conta';
}

// ─────────────────────────────────────────
// 9. AUTENTICAÇÃO PRINCIPAL
// ─────────────────────────────────────────
async function processarAutenticacao() {
    if (estaBloqueado()) {
        iniciarContagem();
        return;
    }

    const email = (document.getElementById('login-nome')?.value || '').trim().toLowerCase();
    const senha = document.getElementById('login-senha')?.value || '';
    const btn   = document.getElementById('btn-auth-principal');

    if (!isLocal && !email.endsWith('@ford.com')) {
        alert('Acesso restrito a e-mails @ford.com');
        return;
    }

    if (modoAtual === 'signup') {
        const nome  = (document.getElementById('signup-nome')?.value || '').trim();
        const cargo = document.getElementById('signup-cargo')?.value || '';

        if (nome.length < 3) {
            alert('Informe seu nome completo.');
            return;
        }

        if (!cargo) {
            alert('Selecione seu cargo.');
            return;
        }

        if (senha.length < 8) {
            alert('A senha deve ter mínimo 8 caracteres.');
            return;
        }
    }

    if (btn) {
        btn.innerHTML = '<span class="btn-spinner"></span> Verificando...';
        btn.disabled = true;
    }

    if (modoAtual === 'login') {
        firebase.auth().signInWithEmailAndPassword(email, senha)
            .then(cred => {
                console.log('Autenticado no Firebase:', cred.user.email);
                resetBtn();
            })
            .catch(err => {
                registrarFalha();
                erroFirebase(err);
                resetBtn();
            });

    } else {
        const nome  = (document.getElementById('signup-nome')?.value || '').trim();
        const cargo = document.getElementById('signup-cargo')?.value;

        try {
            const cred = await firebase.auth().createUserWithEmailAndPassword(email, senha);

            // Auto-aprovacao: qualquer @ford.com recebe acesso imediato apos verificacao de email.
            // O cargo e armazenado no Firestore para uso analitico — nao define permissoes na UI.
            const status = 'aprovado';

            await firebase.firestore().collection('vev_usuarios').doc(cred.user.uid).set({
                nome,
                cargo,
                email,
                status,
                hasFullAccess: true,
                criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
            });

            // NOVO: cadastro automático como operador/analista
            await cadastrarOperadorAutomatico({
                uid: cred.user.uid,
                nome,
                email,
                cargo,
            });

            await cred.user.sendEmailVerification();
            await EmailEngine.novoUsuario({ nome, cargo, email });
            await firebase.auth().signOut();

            // Confirmacao de e-mail obrigatoria para primeiro acesso.
            const instrucao = 'Confirme seu e-mail para acessar o sistema. Apos a confirmacao, o acesso sera liberado automaticamente.';

            alert(`Conta criada com sucesso!\n\n${instrucao}`);

            mudarModoAuth('login');

            ['signup-nome', 'signup-cargo', 'login-senha'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });

        } catch (err) {
            erroFirebase(err);
            resetBtn();
        }
    }
}

// ─────────────────────────────────────────
// 10. RECUPERAÇÃO DE SENHA
// ─────────────────────────────────────────
function abrirModalRecuperacao() {
    const el = document.getElementById('email-recuperacao');
    if (el) el.value = document.getElementById('login-nome')?.value || '';

    document.getElementById('modal-recuperacao').style.display = 'flex';
}

function enviarLinkRecuperacao() {
    const email = (document.getElementById('email-recuperacao')?.value || '').trim().toLowerCase();

    if (!isLocal && !email.endsWith('@ford.com')) {
        alert('Apenas e-mails @ford.com');
        return;
    }

    firebase.auth().sendPasswordResetEmail(email)
        .then(() => {
            alert('Link enviado! Verifique seu e-mail.');
            document.getElementById('modal-recuperacao').style.display = 'none';
        })
        .catch(() => alert('Erro ao enviar. Verifique se a conta existe.'));
}

// ─────────────────────────────────────────
// 11. ERROS AMIGÁVEIS
// ─────────────────────────────────────────
function erroFirebase(err) {
    console.error('[Auth]', err.code);

    const msgs = {
        'auth/user-not-found':       'E-mail ou senha incorretos.',
        'auth/wrong-password':       'E-mail ou senha incorretos.',
        'auth/invalid-credential':   'E-mail ou senha incorretos.',
        'auth/email-already-in-use': 'Este e-mail já possui conta cadastrada.',
        'auth/weak-password':        'Senha fraca. Use letras, números e símbolos.',
        'auth/too-many-requests':    'Muitas tentativas. Tente mais tarde.',
    };

    alert(msgs[err.code] || `Falha: ${err.code}`);
}

// ─────────────────────────────────────────
// 12. TELA PENDENTE
// ─────────────────────────────────────────
function mostrarPendente(perfil) {
    const t = document.getElementById('tela-pendente');
    if (!t) return;

    const n = document.getElementById('pend-nome');
    const c = document.getElementById('pend-cargo');

    if (n) n.innerText = perfil.nome || 'Usuário';
    if (c) c.innerText = perfil.cargo || '';

    document.getElementById('modal-login').style.display = 'none';
    // ── Inicia Dashboard e Cronômetro após login ──
setTimeout(() => {
    if (typeof DashboardGestao !== 'undefined') {
        DashboardGestao.iniciar();
    }
    if (typeof BannerCronometro !== 'undefined') {
        BannerCronometro.iniciar();
    }
}, 2000); // aguarda perfil + cargo carregar

    t.style.display = 'flex';
}

// ─────────────────────────────────────────
// 13. AUTH STATE OBSERVER
// ─────────────────────────────────────────
let _authProc = false;

firebase.auth().onAuthStateChanged(async user => {
    if (_authProc) return;
    _authProc = true;

    try {
        if (user) {
            limparTentativas();

            // Validação automática de domínio corporativo @ford.com apenas após confirmação do e-mail
            if (!isLocal && user.email && user.email.toLowerCase().endsWith('@ford.com')) {
                if (!user.emailVerified) {
                    alert('Por favor, confirme seu e-mail corporativo (@ford.com) no seu inbox antes de acessar o sistema.\nO acesso foi bloqueado até a confirmação.');
                    await firebase.auth().signOut();
                    _authProc = false;
                    return;
                }
            }

            let perfil = null;
            try {
                perfil = await RoleEngine.carregar(user.uid);
            } catch (err) {
                console.warn('[AuthObserver] Falha ao carregar perfil via Firestore:', err);
            }

            const eEmailFord = (user.email && user.email.toLowerCase().endsWith('@ford.com')) || isLocal;

            if (!perfil) {
                const nome = user.email ? user.email.split('@')[0].toUpperCase() : 'USUARIO';

                // Garante bypass local se for e-mail Ford, senão cria como pendente
                perfil = {
                    nome,
                    cargo: 'Analista',
                    status: eEmailFord ? 'aprovado' : 'pendente',
                    hasFullAccess: eEmailFord,
                    email: user.email || '',
                };

                try {
                    await firebase.firestore().collection('vev_usuarios').doc(user.uid).set({
                        nome,
                        cargo: 'Analista',
                        email: user.email,
                        status: perfil.status,
                        hasFullAccess: perfil.hasFullAccess,
                        criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
                    }, { merge: true });
                    console.log('[AuthObserver] Perfil criado no Firestore.');
                } catch (err) {
                    console.warn('[AuthObserver] Escrita de perfil no Firestore rejeitada (offline/regras de seguranca):', err.message);
                }

                RoleEngine.perfil = perfil;
            } else {
                // Se o perfil existe mas o e-mail é Ford e não está aprovado/full, força aprovação (bypass)
                const precisaAprovar = (perfil.status !== 'aprovado' || perfil.hasFullAccess !== true) && eEmailFord;
                
                if (precisaAprovar) {
                    perfil.status = 'aprovado';
                    perfil.hasFullAccess = true;
                    RoleEngine.perfil = perfil;

                    try {
                        await firebase.firestore().collection('vev_usuarios').doc(user.uid).update({
                            status: 'aprovado',
                            hasFullAccess: true,
                            aprovadoPor: 'Sistema Ford VEV (Automatico)',
                            aprovadoEm: firebase.firestore.FieldValue.serverTimestamp(),
                        });
                        console.log('[AuthObserver] Perfil atualizado (auto-aprovado) no Firestore.');
                    } catch (err) {
                        console.warn('[AuthObserver] Atualização de perfil no Firestore rejeitada (offline/regras de seguranca):', err.message);
                    }
                } else {
                    RoleEngine.perfil = perfil;
                }
            }

            // NOVO: sempre sincroniza operador do usuário logado
            await cadastrarOperadorAutomatico({
                uid: user.uid,
                nome: perfil.nome,
                email: perfil.email || user.email,
                cargo: perfil.cargo,
                matricula: perfil.matricula || '',
            });

            if (perfil.status !== 'aprovado') {
                mostrarPendente(perfil);
                _authProc = false;
                return;
            }

            const nome = perfil.nome || user.email.split('@')[0].toUpperCase();

            localStorage.setItem('app_vev_operador', nome);
            localStorage.setItem('app_vev_cargo', perfil.cargo);

            document.body.dataset.cargo = perfil.cargo;

            exibirBoasVindas(nome);

            setTimeout(() => {
                // ── Exibe o App Shell (novo layout) ──────────────
                if (typeof mostrarAppShell === 'function') {
                    mostrarAppShell(nome);
                } else {
                    // fallback
                    document.getElementById('modal-login').style.display = 'none';
                    const shell = document.getElementById('app-shell');
                    if (shell) shell.classList.add('visible');
                }

                document.getElementById('tela-pendente').style.display = 'none';
                document.body.style.overflow = 'auto';

                // Compatibilidade: atualiza ID legado de forma segura
                const uiNomeEl = document.getElementById('ui-nome-usuario');
                if (uiNomeEl) uiNomeEl.innerText = nome;

                if (typeof app !== 'undefined') {
                    app.operadorAtual = nome;
                    app.carregarEstadoHibrido?.();
                }

                // ── Dashboard e Cronômetro ──────────────────────
                setTimeout(() => {
                    if (typeof DashboardGestao !== 'undefined') {
                        DashboardGestao.iniciar();
                    }
                    if (typeof BannerCronometro !== 'undefined') {
                        BannerCronometro.iniciar();
                    }
                }, 1500);

                setTimeout(() => {
                    ApprovalPanelUI.verificarPendentes();

                    if (typeof PreCadastroEngine !== 'undefined') {
                        PreCadastroEngine.seedDefaults();
                    }

                    if (typeof TurnoEngine !== 'undefined' && TurnoEngine.dados) {
                        TurnoEngine.sincronizarComApp?.();
                        TurnoUI?.atualizarBanner();
                    }
                }, 2200);

            }, 300);

        } else {
            // Importante:
            // Não remover turno ativo por usuário aqui.
            // O TurnoEngine v2 usa chave vev_turno_ativo_UID.
            // Assim, se o mesmo analista sair e voltar, o turno dele permanece.
            localStorage.removeItem('app_vev_operador');
            localStorage.removeItem('app_vev_cargo');

            // Remove apenas chave antiga genérica, se sobrou de versão anterior.
            localStorage.removeItem('vev_turno_ativo');

            if (typeof TurnoEngine !== 'undefined') {
                TurnoEngine._cache = null;
            }

            const tp = document.getElementById('tela-pendente');
            if (tp) tp.style.display = 'none';

            document.body.dataset.cargo = '';
            RoleEngine._perfil = null;

            resetBtn();

            document.getElementById('modal-login').style.display = 'flex';
            document.body.style.overflow = 'hidden';

            if (estaBloqueado()) iniciarContagem();
        }
    } catch (e) {
        console.error('[AuthObserver]', e);
    } finally {
        _authProc = false;
    }
});

// ─────────────────────────────────────────
// 14. LOGOUT SEGURO
// ─────────────────────────────────────────
setTimeout(() => {
    if (typeof app !== 'undefined') {
        app.efetuarLogout = () => {
    const cargo = RoleEngine.perfil?.cargo || '';
    const isGestao = ['Coordenador', 'Gerente', 'Administrador'].includes(cargo);

    const mensagem = isGestao
        ? 'Deseja sair do sistema?'
        : 'Deseja encerrar o sistema?\nOs dados do turno ativo serão preservados até o encerramento do turno.';

    if (confirm(mensagem)) {
        localStorage.removeItem('app_vev_operador');
        localStorage.removeItem('app_vev_cargo');

        // Remove apenas chave antiga global
        localStorage.removeItem('vev_turno_ativo');

        if (typeof TurnoEngine !== 'undefined') {
            TurnoEngine._cache = null;
        }

        firebase.auth().signOut().then(() => {
            const emailEl = document.getElementById('login-nome');
            const senhaEl = document.getElementById('login-senha');
            if (emailEl) emailEl.value = '';
            if (senhaEl) senhaEl.value = '';
        });
    }
};
    }
}, 800);

// ─────────────────────────────────────────
// 15. INICIALIZAÇÃO
// ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    EmailEngine.init();

    if (estaBloqueado()) {
        iniciarContagem();
    }
});