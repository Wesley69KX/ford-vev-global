// ============================================================
// RELATORIO DE INCONFORMIDADE — FORD VEV
// Ford Motor Company · Campo de Provas Tatuí · TPG Engenharia
// Padrão: IATF 16949 / Ford Q1 / SAE J1739
// Versão: 2.0.0 — Sem emojis, formato profissional
// ============================================================

'use strict'

const RelatórioInconformidade = {
    // --------------------------------------------------------
    // CONSTANTE: Prefixo e versão do relatório
    // --------------------------------------------------------
    PREFIXO: 'INC',
    VERSAO_FORMATO: '2.0',
    EMPRESA: 'FORD MOTOR COMPANY',
    UNIDADE: 'Campo de Provas Tatuí',
    DEPARTAMENTO: 'TPG — Engenharia de Produto e Processo',

    // --------------------------------------------------------
    // MAPA DE AÇÕES CORRETIVAS RECOMENDADAS POR CATEGORIA
    // Baseado em IATF 16949 e Ford Eng. Standards
    // --------------------------------------------------------
    _acoesCorretivas: {
        Freios: [
            'Paralizar imediatamente o teste e acionar equipe de suporte técnico.',
            'Realizar inspeção visual completa do conjunto de freios (discos, pastilhas, pinças e linhas hidráulicas).',
            'Verificar nível e qualidade do fluido de freio (DOT 3/4 conforme especificação do veículo).',
            'Executar medição de espessura de discos e pastilhas com paquímetro calibrado.',
            'Registrar todas as medições em relatório técnico e confrontar com tolerâncias Ford.',
            'Encaminhar veículo para oficina autorizada caso seja detectada falha estrutural.',
        ],
        Suspensão: [
            'Interromper o teste ao perceber ruído ou comportamento anormal na suspensão.',
            'Realizar inspeção visual de amortecedores, molas, bandejas e pivôs.',
            'Verificar torque de todos os parafusos de fixação da suspensão conforme tabela de torques.',
            'Avaliar folgas em rolamentos de roda com veículo suspenso.',
            'Documentar quilometragem e condições da pista no momento da ocorrência.',
            'Abrir ordem de serviço para desmontagem e inspeção detalhada dos componentes afetados.',
        ],
        Motor: [
            'Desligar o veículo imediatamente em caso de superaquecimento ou fumaça.',
            'Aguardar resfriamento total do motor antes de abrir o capô.',
            'Verificar nível de óleo do motor e presença de contaminação (emulsão com água).',
            'Conectar scanner OBD-II e registrar todos os DTCs (Diagnostic Trouble Codes) presentes.',
            'Verificar nível e condição do líquido de arrefecimento no reservatório.',
            'Encaminhar para análise de engenharia com relatório completo de DTCs e sintomas.',
        ],
        Elétrico: [
            'Registrar todos os DTCs com scanner diagnóstico antes de desligar o veículo.',
            'Verificar tensão da bateria (carga e descarga) com multímetro calibrado.',
            'Inspecionar chicotes e conectores visualmente (corrosão, danos mecânicos, desconexões).',
            'Verificar fusíveis e relés no quadro de distribuição elétrica.',
            'Documentar condições ambientais (temperatura, umidade) no momento da falha.',
            'Encaminhar para diagnóstico de engenharia elétrica com log completo de falhas.',
        ],
        Transmissão: [
            'Verificar nível e condição do óleo de câmbio (cor, viscosidade, presença de partículas).',
            'Registrar em qual marcha e em que faixa de RPM o problema ocorre.',
            'Conectar scanner para verificar DTCs relacionados à transmissão.',
            'Verificar temperatura da transmissão durante operação.',
            'Interromper teste se houver patinação severa ou ruído de impacto.',
            'Encaminhar para análise de transmissão com log de dados completo.',
        ],
        Direção: [
            'Verificar nível do fluido de direção hidráulica (se aplicável).',
            'Inspecionar extremidades de barra de direção, cremalheira e homocinéticas.',
            'Verificar alinhamento e convergência com equipamento de geometria.',
            'Registrar velocidade e condição da pista no momento da anomalia.',
            'Avaliar assistência da direção em diferentes velocidades.',
            'Encaminhar para geometria e balanceamento antes de retomar o teste.',
        ],
        Carroceria: [
            'Inspecionar visualmente toda a carroceria em busca de trincas, fissuras ou solda rompida.',
            'Verificar vedações de portas, janelas e teto solar.',
            'Realizar inspeção acústica NVH (Noise, Vibration and Harshness) em condição controlada.',
            'Documentar localização exata do ruído e condições de reprodução.',
            'Verificar fixações de acabamento interno e externo.',
            'Registrar com vídeo a ocorrência para análise posterior.',
        ],
        Pneus: [
            'Verificar pressão de todos os pneus com medidor calibrado (frio).',
            'Inspecionar visualmente desgaste, bolhas, cortes ou danos na carcaça.',
            'Verificar alinhamento e balanceamento do conjunto roda-pneu.',
            'Registrar quilometragem e histórico de rotação dos pneus.',
            'Medir profundidade dos sulcos com calibrador de desgaste.',
            'Substituir o pneu danificado antes de retomar o teste.',
        ],
        Arrefecimento: [
            'Verificar nível e concentração do líquido de arrefecimento.',
            'Inspecionar radiador, mangueiras e conexões em busca de vazamentos.',
            'Verificar funcionamento da ventoinha (temperatura de acionamento).',
            'Testar termostato conforme procedimento Ford.',
            'Verificar tampa do radiador (pressão de abertura).',
            'Encaminhar para teste de estanqueidade do sistema se houver suspeita de vazamento interno.',
        ],
        Geral: [
            'Documentar detalhadamente as condições no momento da ocorrência.',
            'Registrar quilometragem, hora, temperatura ambiente e condição da pista.',
            'Fotografar e/ou filmar a anomalia para apoio à análise técnica.',
            'Acionar suporte técnico de engenharia para avaliação presencial.',
            'Não reiniciar o teste até liberação formal da engenharia.',
            'Registrar ocorrência no sistema Ford de qualidade conforme procedimento Q1.',
        ],
    },

    // --------------------------------------------------------
    // MAPA DE LOCALIZAÇÃO NO VEÍCULO
    // --------------------------------------------------------
    _localizacoes: {
        'sistema-freios': 'Sistema de Frenagem',
        'sistema-suspensao': 'Sistema de Suspensão e Direção',
        'powertrain': 'Powertrain — Motor e Transmissão',
        'sistema-eletrico': 'Sistema Elétrico e Eletrônico',
        'carroceria-estrutura': 'Carroceria e Estrutura',
        'sistema-rodagem': 'Sistema de Rodagem (Pneus e Rodas)',
        'sistema-arrefecimento': 'Sistema de Arrefecimento',
        'interior-acabamento': 'Interior e Acabamento',
        'sistema-combustivel': 'Sistema de Combustível',
        'geral': 'Geral — Não especificado',
    },

    // --------------------------------------------------------
    // MAPA DE TIPOS DE INCONFORMIDADE
    // --------------------------------------------------------
    _tiposInconformidade: {
        'tecnica': 'Inconformidade Técnica de Produto',
        'seguranca': 'Inconformidade de Segurança Operacional',
        'qualidade': 'Inconformidade de Qualidade de Processo',
        'processo': 'Desvio de Processo Operacional',
        'normativa': 'Não Conformidade Normativa',
    },

    // --------------------------------------------------------
    // GERAR NÚMERO DO RELATÓRIO
    // Formato: INC-YYYY-MM-NNNNNN (baseado em timestamp)
    // --------------------------------------------------------
    _gerarNumeroRelatorio() {
        const agora = new Date()
        const ano = agora.getFullYear()
        const mes = String(agora.getMonth() + 1).padStart(2, '0')
        const seq = String(Date.now()).slice(-6)
        return `${this.PREFIXO}-${ano}-${mes}-${seq}`
    },

    // --------------------------------------------------------
    // FORMATAR DATA E HORA NO PADRÃO ABNT/FORD
    // --------------------------------------------------------
    _formatarDataHora(iso) {
        const d = iso ? new Date(iso) : new Date()
        const data = d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
        const hora = d.toLocaleTimeString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        })
        return { data, hora, completo: `${data} - ${hora}` }
    },

    // --------------------------------------------------------
    // OBTER AÇÕES CORRETIVAS PARA UMA CATEGORIA
    // --------------------------------------------------------
    _obterAcoesCorretivas(categoria) {
        return this._acoesCorretivas[categoria] || this._acoesCorretivas['Geral']
    },

    // --------------------------------------------------------
    // GERAR TEXTO FORMAL DO RELATÓRIO (sem emojis)
    // Padrão: Ford Q1 / IATF 16949 / NCR Lifecycle
    // --------------------------------------------------------
    gerarTexto(dados = {}) {
        const numero = dados.numero || this._gerarNumeroRelatorio()
        const dt = this._formatarDataHora(dados.timestamp)
        const acoes = this._obterAcoesCorretivas(dados.categoria || 'Geral')
        const tipoInc = this._tiposInconformidade[dados.tipoInconformidade] || 'Inconformidade Técnica de Produto'
        const localizacao = this._localizacoes[dados.localizacaoVeiculo] || 'Geral — Não especificado'

        const linha = '='.repeat(64)
        const sublinha = '-'.repeat(64)
        const pad = (label, valor, largura = 20) => {
            const espacos = ' '.repeat(Math.max(0, largura - label.length))
            return `${label}${espacos}: ${valor || 'Nao informado'}`
        }

        const linhasAcoes = acoes
            .map((acao, i) => `  ${String(i + 1).padStart(2, '0')}. ${acao}`)
            .join('\n')

        const severidadeMap = {
            Critico: 'CRITICO — PARADA IMEDIATA OBRIGATORIA',
            Moderado: 'MODERADO — INVESTIGACAO PRIORITARIA',
            Leve: 'LEVE — MONITORAMENTO CONTINUO',
        }
        const severidadeTexto = severidadeMap[dados.severidade] || dados.severidade || 'NAO CLASSIFICADO'

        const relatorio = [
            '',
            linha,
            `  ${this.EMPRESA}`,
            `  ${this.UNIDADE}`,
            `  ${this.DEPARTAMENTO}`,
            linha,
            `  RELATORIO DE INCONFORMIDADE`,
            `  Formato: IATF 16949 / Ford Q1 / NCR Lifecycle v${this.VERSAO_FORMATO}`,
            linha,
            '',
            '  SECAO 1 — IDENTIFICACAO DO REGISTRO',
            sublinha,
            pad('  Numero do Relatorio', numero),
            pad('  Tipo de Registro', tipoInc),
            pad('  Data de Emissao', dt.data),
            pad('  Hora de Registro', dt.hora),
            pad('  Status Atual', dados.status === 'aberto' ? 'ABERTO — Aguardando Resolucao' : (dados.status?.toUpperCase() || 'ABERTO')),
            '',
            '  SECAO 2 — DADOS DO TURNO OPERACIONAL',
            sublinha,
            pad('  Projeto', dados.projeto),
            pad('  Tipo de Teste', dados.tipoTeste),
            pad('  Operador / Analista', dados.operador),
            pad('  Veiculo', dados.veiculo),
            pad('  VIN', dados.vin),
            pad('  EJA', dados.eja),
            pad('  Centro de Custo', dados.cc),
            pad('  Data do Turno', dados.turnoData),
            pad('  Hora de Inicio', dados.horaInicio),
            pad('  Km Inicial', dados.kmInicial ? `${dados.kmInicial} km` : 'Nao informado'),
            '',
            '  SECAO 3 — DESCRICAO DA INCONFORMIDADE',
            sublinha,
            pad('  Localizacao no Veiculo', localizacao),
            pad('  Categoria Tecnica', dados.categoria || 'Geral'),
            '',
            '  Relato Original do Operador:',
            '  ' + sublinha.slice(0, 48),
            ...(dados.relatoOriginal || 'Nao informado.')
                .split('\n')
                .map(linha => `  ${linha}`),
            '',
            '  SECAO 4 — ANALISE TECNICA',
            sublinha,
            pad('  Titulo da Analise', dados.titulo),
            pad('  Causa Raiz Provavel', dados.causaRaiz),
            '',
            '  Parecer Tecnico:',
            '  ' + sublinha.slice(0, 48),
            ...(dados.parecerFinal || 'Nao informado.')
                .split('\n')
                .map(linha => `  ${linha}`),
            '',
            '  SECAO 5 — CLASSIFICACAO DE RISCO',
            sublinha,
            pad('  Nivel de Severidade', severidadeTexto),
            pad('  Sistema Afetado', dados.categoria || 'Geral'),
            pad('  Impacto em Teste', dados.severidade === 'Critico' ? 'PARADA TOTAL DO TESTE' : (dados.severidade === 'Moderado' ? 'REDUCAO DE ATIVIDADE' : 'CONTINUIDADE COM MONITORAMENTO')),
            pad('  Notificacao Req.', dados.severidade === 'Critico' ? 'SIM — Supervisor e Engenharia' : 'NAO — Registro interno'),
            '',
            '  SECAO 6 — ACOES CORRETIVAS RECOMENDADAS',
            sublinha,
            '  (Baseado em IATF 16949 / Ford Engineering Standards)',
            '',
            linhasAcoes,
            '',
            '  SECAO 7 — INFORMACOES DE RASTREABILIDADE',
            sublinha,
            pad('  ID do Registro', dados.id || numero),
            pad('  Gerado por', dados.operador || 'Sistema VEV'),
            pad('  Versao do Sistema', 'Ford VEV Global v2.0'),
            pad('  Modelo de IA', dados.ia?.modelo || 'TPG Keyword Engine'),
            pad('  Confianca da Analise', dados.ia?.confianca || 'N/A'),
            pad('  Modo de Analise', dados.ia?.isMock ? 'SIMULADO (Palavras-Chave)' : 'IA REAL (FordLLM)'),
            '',
            '  SECAO 8 — ASSINATURAS E APROVACOES',
            sublinha,
            '',
            `  Responsavel Tecnico   : ${dados.operador || '__________________________'}`,
            '  Data / Assinatura     : _______________  __________________________',
            '',
            '  Revisado por          : __________________________',
            '  Data / Assinatura     : _______________  __________________________',
            '',
            '  Aprovado por          : __________________________',
            '  Data / Assinatura     : _______________  __________________________',
            '',
            linha,
            `  Emitido em: ${dt.completo}`,
            `  Sistema: Ford VEV Global — TPG Engenharia — Campo de Provas Tatu\u00ed`,
            `  Norma de Referencia: IATF 16949:2016 / Ford Q1 / SAE J1739`,
            linha,
            '',
        ].join('\n')

        return relatorio
    },

    // --------------------------------------------------------
    // GERAR PDF PROFISSIONAL (via jsPDF)
    // Layout: Cabeçalho Ford azul, corpo monoespaçado, rodapé
    // --------------------------------------------------------
    async gerarPDF(dados = {}) {
        if (!window.jspdf?.jsPDF) {
            console.error('[RelatórioInconformidade] jsPDF não carregado.')
            if (window.VEVAlert) {
                await VEVAlert.alert(
                    'A biblioteca de PDF ainda nao foi carregada. Aguarde alguns segundos e tente novamente.',
                    { type: 'warning', title: 'PDF nao disponivel' }
                )
            }
            return null
        }

        const { jsPDF } = window.jspdf
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

        const numero = dados.numero || this._gerarNumeroRelatorio()
        const dt = this._formatarDataHora(dados.timestamp)
        const acoes = this._obterAcoesCorretivas(dados.categoria || 'Geral')
        const tipoInc = this._tiposInconformidade[dados.tipoInconformidade] || 'Inconformidade Tecnica de Produto'
        const localizacao = this._localizacoes[dados.localizacaoVeiculo] || 'Geral'

        const COR_FORD_AZUL = [0, 51, 153]       // #003399
        const COR_FORD_AZUL_ESCURO = [0, 20, 80]
        const COR_BRANCO = [255, 255, 255]
        const COR_CINZA_CLARO = [240, 242, 246]
        const COR_TEXTO = [20, 20, 30]
        const COR_LABEL = [80, 90, 120]
        const COR_CRITICO = [180, 30, 30]
        const COR_MODERADO = [160, 100, 10]
        const COR_LEVE = [20, 110, 50]

        const pageW = 210
        const marL = 14
        const marR = pageW - 14
        const largConteudo = marR - marL

        let y = 0

        // ── Cabeçalho Ford ───────────────────────────────────
        doc.setFillColor(...COR_FORD_AZUL_ESCURO)
        doc.rect(0, 0, pageW, 28, 'F')

        doc.setFillColor(...COR_FORD_AZUL)
        doc.rect(0, 20, pageW, 4, 'F')

        // Logo Ford (texto substituto)
        doc.setTextColor(...COR_BRANCO)
        doc.setFontSize(18)
        doc.setFont('helvetica', 'bold')
        doc.text('FORD', marL, 13)

        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        doc.text('MOTOR COMPANY', marL, 18)

        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text('RELATORIO DE INCONFORMIDADE', pageW / 2, 10, { align: 'center' })
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        doc.text(`Campo de Provas Tatu\u00ed — TPG Engenharia`, pageW / 2, 15, { align: 'center' })

        doc.setFontSize(7)
        doc.text(`N. ${numero}`, marR, 10, { align: 'right' })
        doc.text(`Emitido: ${dt.completo}`, marR, 15, { align: 'right' })

        y = 34

        // ── Função auxiliar: seção ────────────────────────────
        const secao = (titulo, cor = COR_FORD_AZUL) => {
            if (y > 265) { doc.addPage(); this._adicionarRodape(doc, numero, dt, pageW); y = 20 }
            doc.setFillColor(...cor)
            doc.roundedRect(marL, y, largConteudo, 7, 1, 1, 'F')
            doc.setTextColor(...COR_BRANCO)
            doc.setFontSize(8)
            doc.setFont('helvetica', 'bold')
            doc.text(titulo.toUpperCase(), marL + 3, y + 4.8)
            y += 10
        }

        // ── Função auxiliar: campo ────────────────────────────
        const campo = (label, valor, destacar = false) => {
            if (y > 270) { doc.addPage(); this._adicionarRodape(doc, numero, dt, pageW); y = 20 }
            doc.setTextColor(...COR_LABEL)
            doc.setFontSize(7)
            doc.setFont('helvetica', 'bold')
            doc.text(label + ':', marL + 2, y)
            doc.setTextColor(...COR_TEXTO)
            doc.setFont('helvetica', 'normal')
            const texto = String(valor || 'Nao informado')
            if (destacar) {
                doc.setTextColor(...COR_FORD_AZUL)
                doc.setFont('helvetica', 'bold')
            }
            doc.text(texto, marL + 50, y)
            y += 5.5
        }

        // ── Seção 1: Identificação ────────────────────────────
        secao('Secao 1 — Identificacao do Registro')
        campo('Numero do Relatorio', numero, true)
        campo('Tipo de Registro', tipoInc)
        campo('Data de Emissao', dt.data)
        campo('Hora de Registro', dt.hora)
        campo('Status', dados.status === 'aberto' ? 'ABERTO — Aguardando Resolucao' : (dados.status?.toUpperCase() || 'ABERTO'))
        y += 3

        // ── Seção 2: Turno ────────────────────────────────────
        secao('Secao 2 — Dados do Turno Operacional')
        campo('Projeto', dados.projeto)
        campo('Tipo de Teste', dados.tipoTeste)
        campo('Operador / Analista', dados.operador)
        campo('Veiculo', dados.veiculo)
        campo('VIN', dados.vin)
        campo('EJA', dados.eja)
        campo('Centro de Custo', dados.cc)
        campo('Data do Turno', dados.turnoData)
        campo('Km Inicial', dados.kmInicial ? `${dados.kmInicial} km` : 'Nao informado')
        y += 3

        // ── Seção 3: Descrição ────────────────────────────────
        secao('Secao 3 — Descricao da Inconformidade')
        campo('Localizacao no Veiculo', localizacao)
        campo('Categoria Tecnica', dados.categoria || 'Geral')
        y += 2
        doc.setFontSize(7)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...COR_LABEL)
        doc.text('Relato Original do Operador:', marL + 2, y)
        y += 4
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...COR_TEXTO)
        const linhasRelato = doc.splitTextToSize(dados.relatoOriginal || 'Nao informado.', largConteudo - 6)
        linhasRelato.forEach(linha => {
            if (y > 270) { doc.addPage(); this._adicionarRodape(doc, numero, dt, pageW); y = 20 }
            doc.text(linha, marL + 4, y)
            y += 4.5
        })
        y += 3

        // ── Seção 4: Análise Técnica ──────────────────────────
        secao('Secao 4 — Analise Tecnica')
        campo('Titulo da Analise', dados.titulo)
        campo('Causa Raiz Provavel', dados.causaRaiz)
        y += 2
        doc.setFontSize(7)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...COR_LABEL)
        doc.text('Parecer Tecnico:', marL + 2, y)
        y += 4
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...COR_TEXTO)
        const linhasParecer = doc.splitTextToSize(dados.parecerFinal || 'Nao informado.', largConteudo - 6)
        linhasParecer.forEach(linha => {
            if (y > 270) { doc.addPage(); this._adicionarRodape(doc, numero, dt, pageW); y = 20 }
            doc.text(linha, marL + 4, y)
            y += 4.5
        })
        y += 3

        // ── Seção 5: Classificação de Risco ───────────────────
        const corSev = dados.severidade === 'Critico' ? COR_CRITICO
            : dados.severidade === 'Moderado' ? COR_MODERADO
            : COR_LEVE
        secao('Secao 5 — Classificacao de Risco', corSev)

        const sevTextos = {
            Critico: 'CRITICO — PARADA IMEDIATA OBRIGATORIA',
            Moderado: 'MODERADO — INVESTIGACAO PRIORITARIA',
            Leve: 'LEVE — MONITORAMENTO CONTINUO',
        }
        campo('Nivel de Severidade', sevTextos[dados.severidade] || 'NAO CLASSIFICADO', true)
        campo('Sistema Afetado', dados.categoria || 'Geral')
        campo('Impacto no Teste',
            dados.severidade === 'Critico' ? 'PARADA TOTAL DO TESTE'
            : dados.severidade === 'Moderado' ? 'REDUCAO DE ATIVIDADE'
            : 'CONTINUIDADE COM MONITORAMENTO'
        )
        campo('Notificacao Necessaria',
            dados.severidade === 'Critico' ? 'SIM — Supervisor e Engenharia' : 'NAO — Registro interno'
        )
        y += 3

        // ── Seção 6: Ações Corretivas ─────────────────────────
        secao('Secao 6 — Acoes Corretivas Recomendadas')
        doc.setFontSize(6.5)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(...COR_LABEL)
        doc.text('Base: IATF 16949 / Ford Engineering Standards', marL + 2, y)
        y += 5
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...COR_TEXTO)
        acoes.forEach((acao, i) => {
            if (y > 265) { doc.addPage(); this._adicionarRodape(doc, numero, dt, pageW); y = 20 }
            const numAcao = `${String(i + 1).padStart(2, '0')}.`
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(7)
            doc.text(numAcao, marL + 2, y)
            doc.setFont('helvetica', 'normal')
            const linhasAcao = doc.splitTextToSize(acao, largConteudo - 12)
            linhasAcao.forEach((linhaAcao, j) => {
                if (y > 270) { doc.addPage(); this._adicionarRodape(doc, numero, dt, pageW); y = 20 }
                doc.text(linhaAcao, marL + 8, y)
                y += 4.5
            })
            y += 1
        })
        y += 3

        // ── Seção 7: Rastreabilidade ──────────────────────────
        secao('Secao 7 — Informacoes de Rastreabilidade')
        campo('ID do Registro', dados.id || numero)
        campo('Sistema de Emissao', 'Ford VEV Global v2.0')
        campo('Modelo de Analise IA', dados.ia?.modelo || 'TPG Keyword Engine')
        campo('Confianca da Analise', dados.ia?.confianca || 'N/A')
        campo('Modo de Analise', dados.ia?.isMock ? 'SIMULADO (Palavras-Chave)' : 'IA REAL (FordLLM)')
        y += 3

        // ── Seção 8: Assinaturas ──────────────────────────────
        if (y > 230) { doc.addPage(); this._adicionarRodape(doc, numero, dt, pageW); y = 20 }
        secao('Secao 8 — Assinaturas e Aprovacoes')
        y += 2

        const assinatura = (cargo, nome, col) => {
            if (y > 270) { doc.addPage(); this._adicionarRodape(doc, numero, dt, pageW); y = 0 }
            const x = col === 0 ? marL : marL + largConteudo / 2 + 2
            const larg = largConteudo / 2 - 4

            doc.setFillColor(...COR_CINZA_CLARO)
            doc.rect(x, y - 3, larg, 22, 'F')

            doc.setTextColor(...COR_LABEL)
            doc.setFontSize(6.5)
            doc.setFont('helvetica', 'bold')
            doc.text(cargo.toUpperCase(), x + 3, y + 1)

            doc.setFont('helvetica', 'normal')
            doc.setTextColor(...COR_TEXTO)
            doc.text(nome || '___________________________', x + 3, y + 7)

            doc.setTextColor(...COR_LABEL)
            doc.text('Data: ___/___/______', x + 3, y + 13)
            doc.text('Assinatura: ________________', x + 3, y + 17)
        }

        assinatura('Responsavel Tecnico', dados.operador, 0)
        assinatura('Revisado por', '', 1)
        y += 24

        assinatura('Aprovado por — Engenharia', '', 0)
        assinatura('Supervisao / Gestor', '', 1)
        y += 24

        // ── Rodapé final ──────────────────────────────────────
        this._adicionarRodape(doc, numero, dt, pageW)

        return doc
    },

    // --------------------------------------------------------
    // ADICIONAR RODAPÉ EM TODAS AS PÁGINAS
    // --------------------------------------------------------
    _adicionarRodape(doc, numero, dt, pageW) {
        const totalPages = doc.internal.getNumberOfPages()
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i)
            doc.setDrawColor(0, 51, 153)
            doc.setLineWidth(0.3)
            doc.line(14, 285, pageW - 14, 285)
            doc.setFontSize(6)
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(100, 110, 140)
            doc.text(`Relatorio ${numero} | Ford VEV — Campo de Provas Tatu\u00ed | IATF 16949 / Ford Q1`, 14, 289)
            doc.text(`Pagina ${i} de ${totalPages}`, pageW - 14, 289, { align: 'right' })
        }
    },

    // --------------------------------------------------------
    // EXPORTAR COMO TXT
    // --------------------------------------------------------
    exportarTXT(dados = {}) {
        const texto = this.gerarTexto(dados)
        const numero = dados.numero || this._gerarNumeroRelatorio()
        const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${numero}.txt`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        console.log(`[RelatórioInconformidade] TXT exportado: ${numero}.txt`)
    },

    // --------------------------------------------------------
    // DOWNLOAD PDF
    // --------------------------------------------------------
    async downloadPDF(dados = {}) {
        const numero = dados.numero || this._gerarNumeroRelatorio()
        dados.numero = numero

        const doc = await this.gerarPDF(dados)
        if (!doc) return

        const veiculo = (dados.veiculo || 'Veiculo').replace(/\s+/g, '_')
        const nomeArq = `${numero}_${veiculo}.pdf`
        doc.save(nomeArq)
        console.log(`[RelatórioInconformidade] PDF exportado: ${nomeArq}`)
        return nomeArq
    },

    // --------------------------------------------------------
    // COMPARTILHAR VIA WEB SHARE API (fallback: clipboard)
    // --------------------------------------------------------
    async compartilhar(dados = {}) {
        const texto = this.gerarTexto(dados)
        const numero = dados.numero || this._gerarNumeroRelatorio()

        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Relatorio de Inconformidade ${numero}`,
                    text: texto,
                })
                return
            } catch (e) {
                console.warn('[RelatórioInconformidade] Share cancelado ou falhou, usando clipboard.')
            }
        }

        // Fallback: clipboard
        try {
            await navigator.clipboard.writeText(texto)
            if (window.VEVAlert) {
                await VEVAlert.alert(
                    `Relatorio ${numero} copiado para a area de transferencia. Cole no e-mail ou sistema de qualidade.`,
                    { type: 'success', title: 'Relatorio Copiado' }
                )
            }
        } catch (e) {
            console.error('[RelatórioInconformidade] Falha ao copiar para clipboard:', e)
        }
    },

    // --------------------------------------------------------
    // ABRIR MODAL DE EMISSAO (integração com o app)
    // --------------------------------------------------------
    async emitirDoResultadoIA(resultadoIA, contexto) {
        if (!resultadoIA) return

        const dados = {
            ...contexto,
            titulo: resultadoIA.titulo,
            categoria: resultadoIA.categoria,
            severidade: resultadoIA.severidade,
            causaRaiz: resultadoIA.causaRaiz,
            parecerFinal: resultadoIA.parecerFinal,
            relatoOriginal: document.getElementById('i-obs')?.value || '',
            ia: resultadoIA.ia,
            status: 'aberto',
            timestamp: new Date().toISOString(),
        }

        // Salvar no Firestore
        let idFirestore = null
        try {
            if (typeof firebase !== 'undefined') {
                const db = firebase.firestore()
                const numero = this._gerarNumeroRelatorio()
                dados.numero = numero
                const ref = await db.collection('vev_relatorios_inconformidade').add({
                    ...dados,
                    criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
                })
                idFirestore = ref.id
                dados.id = idFirestore
                console.log('[RelatórioInconformidade] Salvo no Firestore:', idFirestore)
            }
        } catch (e) {
            console.warn('[RelatórioInconformidade] Falha ao salvar no Firestore:', e)
        }

        // Renderizar modal de opções
        this._exibirModalOpcoes(dados)
    },

    // --------------------------------------------------------
    // MODAL DE OPÇÕES DE EXPORTAÇÃO
    // --------------------------------------------------------
    _exibirModalOpcoes(dados) {
        const numero = dados.numero || '---'
        const existing = document.getElementById('modal-relatorio-inconformidade')
        if (existing) existing.remove()

        const modal = document.createElement('div')
        modal.id = 'modal-relatorio-inconformidade'
        modal.style.cssText = `
            position:fixed;inset:0;z-index:99998;
            display:flex;align-items:center;justify-content:center;
            padding:20px;
            background:rgba(0,0,0,0.75);
            backdrop-filter:blur(8px);
        `

        modal.innerHTML = `
            <div style="
                background:#0f1117;
                border:1px solid rgba(0,51,153,0.4);
                border-radius:20px;
                padding:28px 24px;
                max-width:420px;width:100%;
                box-shadow:0 24px 64px rgba(0,0,0,0.8),0 0 40px rgba(0,51,153,0.2);
            ">
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
                    <div style="
                        width:44px;height:44px;border-radius:12px;
                        background:rgba(0,51,153,0.2);border:1px solid rgba(0,51,153,0.4);
                        display:flex;align-items:center;justify-content:center;flex-shrink:0;
                    ">
                        <span class="material-icons" style="color:#6ea3f7;font-size:1.4rem;">description</span>
                    </div>
                    <div>
                        <div style="font-size:.9rem;font-weight:800;color:#f4f4f5;">Relatorio de Inconformidade</div>
                        <div style="font-size:.72rem;color:#6ea3f7;font-weight:700;">${numero}</div>
                    </div>
                    <button onclick="document.getElementById('modal-relatorio-inconformidade').remove()"
                        style="margin-left:auto;background:none;border:none;color:#888;cursor:pointer;padding:4px;">
                        <span class="material-icons" style="font-size:1.2rem;">close</span>
                    </button>
                </div>

                <div style="background:rgba(0,51,153,0.08);border:1px solid rgba(0,51,153,0.2);
                            border-radius:12px;padding:12px;margin-bottom:18px;font-size:.78rem;color:#a0b4d6;line-height:1.6;">
                    Relatorio gerado conforme <strong style="color:#f4f4f5;">IATF 16949 / Ford Q1</strong>.
                    Selecione o formato de exportacao:
                </div>

                <div style="display:flex;flex-direction:column;gap:10px;">
                    <button id="btn-relatorio-pdf"
                        style="padding:13px;border-radius:12px;border:none;cursor:pointer;
                               background:linear-gradient(135deg,#003399,#1a52cc);color:#fff;
                               font-size:.88rem;font-weight:700;font-family:inherit;
                               display:flex;align-items:center;justify-content:center;gap:8px;
                               box-shadow:0 4px 16px rgba(0,51,153,0.4);">
                        <span class="material-icons" style="font-size:1.1rem;">picture_as_pdf</span>
                        Baixar PDF Profissional
                    </button>
                    <button id="btn-relatorio-txt"
                        style="padding:13px;border-radius:12px;cursor:pointer;
                               background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);
                               color:#d4d4d8;font-size:.88rem;font-weight:700;font-family:inherit;
                               display:flex;align-items:center;justify-content:center;gap:8px;">
                        <span class="material-icons" style="font-size:1.1rem;">text_snippet</span>
                        Exportar como Texto (.txt)
                    </button>
                    <button id="btn-relatorio-compartilhar"
                        style="padding:13px;border-radius:12px;cursor:pointer;
                               background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);
                               color:#9ca3af;font-size:.88rem;font-weight:700;font-family:inherit;
                               display:flex;align-items:center;justify-content:center;gap:8px;">
                        <span class="material-icons" style="font-size:1.1rem;">share</span>
                        Compartilhar / Copiar Texto
                    </button>
                </div>
            </div>
        `

        document.body.appendChild(modal)

        document.getElementById('btn-relatorio-pdf').addEventListener('click', async () => {
            const btn = document.getElementById('btn-relatorio-pdf')
            if (btn) { btn.disabled = true; btn.textContent = 'Gerando PDF...' }
            await this.downloadPDF(dados)
            if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-icons" style="font-size:1.1rem;">picture_as_pdf</span> Baixar PDF Profissional' }
        })

        document.getElementById('btn-relatorio-txt').addEventListener('click', () => {
            this.exportarTXT(dados)
        })

        document.getElementById('btn-relatorio-compartilhar').addEventListener('click', async () => {
            await this.compartilhar(dados)
        })

        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove()
        })
    },
}

// Expor globalmente
window.RelatórioInconformidade = RelatórioInconformidade
window.RelatorioInconformidade = RelatórioInconformidade // alias sem acento
