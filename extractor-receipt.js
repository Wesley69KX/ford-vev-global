/**
 * Extrator de dados de notas de combustível (Wizeo/Cielo/Linx Fiscal)
 * Parseia campos: posto, placa, condutor, produto, litros, valor, data
 */

const ReceiptExtractor = {

  /**
   * Extrai todos os dados da nota de combustível
   * @param {string} text - Texto bruto do OCR
   * @returns {Object} - Dados estruturados da nota
   */
  extract(text) {
    const data = {
      tipo: 'nota_combustivel',
      timestamp: new Date().toISOString(),
      raw_ocr: text,
      campos: {}
    };

    const t = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    // Nome do posto
    data.campos.posto = this._extractPosto(t, lines);

    // CNPJ
    data.campos.cnpj = this._extractCNPJ(t);

    // Data e hora
    const dt = this._extractDateTime(t);
    data.campos.data = dt.data;
    data.campos.hora = dt.hora;
    data.campos.datetime_iso = dt.iso;

    // Número do comprovante
    data.campos.comprovante = this._extractField(t, 'comprov', /comprov\.?:?\s*(\d+)/i);

    // Autorização
    data.campos.autorizacao = this._extractField(t, 'autoriz', /autoriz\.?:?\s*(\d+)/i);

    // Cartão (mascarado)
    data.campos.cartao = this._extractCartao(t);

    // Veículo
    data.campos.veiculo = this._extractVeiculo(t);

    // Placa
    data.campos.placa = this._extractPlaca(t);

    // Condutor
    data.campos.condutor = this._extractCondutor(t);

    // Produto (tipo de combustível)
    data.campos.produto = this._extractProduto(t);

    // Quantidade em litros
    data.campos.litros = this._extractLitros(t);

    // Valor bruto / total
    data.campos.valor_bruto = this._extractValor(t, 'valor bruto');
    data.campos.total = this._extractValor(t, 'total');

    // Disponível (saldo no cartão)
    data.campos.disponivel = this._extractValor(t, 'disponivel|disponível');

    // Limite do cartão
    data.campos.limite = this._extractValor(t, 'limite');

    // Código estabelecimento
    data.campos.cod_estab = this._extractField(t, 'cod.estab', /(?:cod\.?\s*estab|estab)\.?\s*:?\s*(\d+)/i);

    // Preço por litro (calculado)
    if (data.campos.litros && data.campos.total) {
      data.campos.preco_por_litro = parseFloat(
        (data.campos.total / data.campos.litros).toFixed(3)
      );
    }

    return data;
  },

  // ─── Helpers ────────────────────────────────────────────────────────────────

  _extractPosto(text, lines) {
    // Procura por "AUTO POSTO" ou "POSTO" no texto
    const m = text.match(/(?:auto\s+)?posto\s+([A-Z\s]+?)(?:\s+km|\s+cnpj|,)/i);
    if (m) return m[0].trim();

    // Alternativa: linha que contém "POSTO" ou "REI"
    for (const line of lines) {
      if (/posto|rei\s+da|castelo/i.test(line) && line.length < 60) {
        return line.trim();
      }
    }
    return null;
  },

  _extractCNPJ(text) {
    const m = text.match(/cnpj\s*:?\s*(\d{2}[.\s]?\d{3}[.\s]?\d{3}[/\s]?\d{4}[-\s]?\d{2})/i);
    if (m) return m[1].replace(/\s/g, '');
    return null;
  },

  _extractDateTime(text) {
    // Padrão: "13/07/2026 14:33:56" ou "13/07/2026 14:33"
    const m = text.match(/(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2}(?::\d{2})?)/);
    if (m) {
      const [d, mo, y] = m[1].split('/');
      const iso = `${y}-${mo}-${d}T${m[2]}`;
      return { data: m[1], hora: m[2], iso };
    }

    // Padrão alternativo: só data
    const m2 = text.match(/(\d{2}\/\d{2}\/\d{4})/);
    if (m2) {
      const [d, mo, y] = m2[1].split('/');
      return { data: m2[1], hora: null, iso: `${y}-${mo}-${d}` };
    }

    return { data: null, hora: null, iso: null };
  },

  _extractField(text, label, pattern) {
    const m = text.match(pattern);
    if (m) return m[1].trim();
    return null;
  },

  _extractCartao(text) {
    // "6060XXXXXXXX6573"
    const m = text.match(/cartao\s*:?\s*(\d{4}X+\d{4}|\d{16}|\d{4}\s*\d{4}\s*\d{4}\s*\d{4})/i);
    if (m) return m[1].trim();
    return null;
  },

  _extractVeiculo(text) {
    // "VEICULO : RANGER XLCD2D4M - BRAN CA"
    const m = text.match(/veiculo\s*:?\s*([A-Z0-9\s\-]+?)(?:\s*-\s*BRAN|placa|condutor|$)/i);
    if (m) return m[1].trim().replace(/\s+/g, ' ');
    return null;
  },

  _extractPlaca(text) {
    // Placa brasileira: "TIS0H31" ou "ABC-1234" ou "ABC1D23"
    const m = text.match(/placa\s*:?\s*([A-Z]{3}[\s-]?\d[A-Z0-9]\d{2})/i);
    if (m) return m[1].trim().replace(/\s/g, '').toUpperCase();

    // Fallback: busca padrão de placa no texto
    const m2 = text.match(/\b([A-Z]{3}[\s-]?\d[A-Z0-9]\d{2})\b/);
    if (m2) return m2[1].replace(/\s/g, '').toUpperCase();

    return null;
  },

  _extractCondutor(text) {
    const m = text.match(/condutor\s*:?\s*([A-Z\s]+?)(?:\s+combustivel|\s+produto|\.|$)/i);
    if (m) return m[1].trim();
    return null;
  },

  _extractProduto(text) {
    // "7 DIESEL S10 C" ou "GASOLINA COMUM" ou "ETANOL"
    const patterns = [
      /produto\s*:?\s*(\d+\s+)?([A-Z\s0-9]+?(?:diesel|gasolina|etanol|gnv)[A-Z\s0-9]*)/i,
      /\b(diesel\s*s10|diesel\s*s500|gasolina\s*comum|gasolina\s*aditivada|etanol|gnv)\b/i
    ];
    for (const p of patterns) {
      const m = text.match(p);
      if (m) return (m[2] || m[1]).trim().toUpperCase();
    }
    return null;
  },

  _extractLitros(text) {
    // "TD : 35,970" ou "QTD : 35.97" ou "35.970 litros"
    const patterns = [
      /(?:td|qtd|quantidade)\s*:?\s*(\d+[.,]\d{2,3})/i,
      /(\d+[.,]\d{3})\s*(?:litros?|l\b)/i,
      /(\d+[.,]\d{2,3})\s*l(?:\s|$)/i
    ];
    for (const p of patterns) {
      const m = text.match(p);
      if (m) return parseFloat(m[1].replace(',', '.'));
    }
    return null;
  },

  _extractValor(text, label) {
    // "VALOR BRUTO : 280,20" ou "TOTAL : 280,20"
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`${escaped}\\s*:?\\s*R?\\$?\\s*(\\d+[.,]\\d{2})`, 'i');
    const m = text.match(pattern);
    if (m) {
      return parseFloat(m[1].replace(',', '.'));
    }
    return null;
  }
};

window.ReceiptExtractor = ReceiptExtractor;
