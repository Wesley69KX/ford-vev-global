/**
 * Classifier - Detecta o tipo de imagem baseado no texto OCR extraído
 * Tipos: 'painel_territory' | 'painel_ranger' | 'nota_combustivel' | 'desconhecido'
 */

const Classifier = {
  
  // Palavras-chave para cada tipo
  KEYWORDS: {
    painel_territory: [
      'ev-later', 'ev later', 'power ready', 'km/kwh', 'kwh',
      'viagem', 'normal', 'aperte ok', 'autonomia', 'e-later'
    ],
    painel_ranger: [
      'prndm', 'pr nd m', 'viagem 1', 'viagem1', 'segure ok',
      'ranger', 'rpm/min'
    ],
    nota_combustivel: [
      'combustivel', 'combustível', 'diesel', 'gasolina', 'etanol',
      'litros', 'litro', 'valor bruto', 'produto', 'placa',
      'condutor', 'wizeo', 'cielo', 'posto', 'cnpj', 'nota fiscal',
      'comprovante', 'td :', 'qtd', 'total :'
    ]
  },

  /**
   * Classifica o texto OCR extraído
   * @param {string} text - Texto bruto do OCR
   * @returns {{ tipo: string, confianca: number, matches: string[] }}
   */
  classify(text) {
    if (!text || text.trim().length === 0) {
      return { tipo: 'desconhecido', confianca: 0, matches: [] };
    }

    const textLower = text.toLowerCase().replace(/\n/g, ' ');
    const scores = {};
    const matchesByType = {};

    for (const [tipo, keywords] of Object.entries(this.KEYWORDS)) {
      let score = 0;
      const matches = [];

      for (const kw of keywords) {
        if (textLower.includes(kw)) {
          score++;
          matches.push(kw);
        }
      }

      scores[tipo] = score;
      matchesByType[tipo] = matches;
    }

    // Encontrar o tipo com maior pontuação
    let bestTipo = 'desconhecido';
    let bestScore = 0;

    for (const [tipo, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        bestTipo = tipo;
      }
    }

    // Confiança: porcentagem de keywords encontradas
    const totalKeywords = bestTipo !== 'desconhecido'
      ? this.KEYWORDS[bestTipo].length
      : 1;
    const confianca = Math.round((bestScore / totalKeywords) * 100);

    return {
      tipo: bestScore > 0 ? bestTipo : 'desconhecido',
      confianca: Math.min(confianca, 100),
      matches: matchesByType[bestTipo] || []
    };
  },

  /**
   * Retorna nome amigável do tipo
   */
  getTipoLabel(tipo) {
    const labels = {
      painel_territory: '🚗 Painel Territory',
      painel_ranger: '🛻 Painel Ranger',
      nota_combustivel: '⛽ Nota de Combustível',
      desconhecido: '❓ Desconhecido'
    };
    return labels[tipo] || labels.desconhecido;
  }
};

window.Classifier = Classifier;
