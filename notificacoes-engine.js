// ─────────────────────────────────────────────────────────
// NOTIFICAÇÕES ENGINE — Ford VEV
// ─────────────────────────────────────────────────────────
const NotificacoesEngine = {
    // Salva notificação no Firestore
    async _salvar(tipo, mensagem, dados = {}) {
        try {
            await firebase.firestore().collection('vev_notificacoes').add({
                tipo,
                mensagem,
                dados,
                lida: false,
                criadaEm: firebase.firestore.FieldValue.serverTimestamp(),
            })
        } catch (e) {
            console.warn('[Notificações] Erro ao salvar:', e)
        }
    },

    // Chama quando analista encerra turno
    async turnoEncerrado(dadosTurno, dadosEnc) {
        await this._salvar(
            'turno_encerrado',
            `${dadosTurno.operador} encerrou o turno — ${dadosTurno.veiculo}`,
            {
                operador: dadosTurno.operador,
                veiculo: dadosTurno.veiculo,
                projeto: dadosTurno.projeto,
                kmInicial: dadosTurno.kmInicial,
                kmFinal: dadosEnc.kmFinal,
                litros: dadosEnc.litros,
            }
        )
    },

    // Chama quando issue crítico é registrado
    async issueCritico(dadosIssue) {
        await this._salvar(
            'issue_critico',
            `Issue crítico registrado — ${dadosIssue.veiculo}`,
            dadosIssue
        )
    },

    // Chama quando veículo ultrapassa km limite
    async kmExcedido(veiculo, kmAtual, kmLimite) {
        await this._salvar(
            'km_excedido',
            `${veiculo} ultrapassou o limite de KM (${kmAtual}/${kmLimite} km)`,
            { veiculo, kmAtual, kmLimite }
        )
    },

    // Escuta notificações em tempo real (usar no painel do coordenador)
    escutar(callback) {
        return firebase
            .firestore()
            .collection('vev_notificacoes')
            .where('lida', '==', false)
            .orderBy('criadaEm', 'desc')
            .onSnapshot((snap) => {
                const notifs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
                callback(notifs)
            })
    },

    // Marca notificação como lida
    async marcarLida(id) {
        await firebase.firestore().collection('vev_notificacoes').doc(id).update({ lida: true })
    },
}
