/**
 * Extrator de dados dos painéis digitais - Ranger e Territory
 * Parseia o texto OCR e retorna campos estruturados
 */

const DashExtractor = {

  /**
   * Extrai dados do painel Territory (híbrido PHEV)
   * Campos: velocidade, odômetro, viagem, consumo, temperatura, modo, câmbio, EV
   */
  extractTerritory(text) {
    const data = {
      tipo: 'painel_territory',
      timestamp: new Date().toISOString(),
      raw_ocr: text,
      campos: {}
    };

    const t = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');

    // Velocidade atual (número grande próximo de "km/h")
    data.campos.velocidade_kmh = this._extractSpeed(t);

    // Odômetro - "43935 km" ou "43.935 km"
    data.campos.odometro_km = this._extractOdometer(t);

    // Temperatura - "14°C" ou "14 C" ou "14°"
    data.campos.temperatura_c = this._extractTemperature(t);

    // Câmbio - P, R, N, D
    data.campos.cambio = this._extractGear(t);

    // Dados da viagem
    const viagem = this._extractTripData(t);
    data.campos.distancia_viagem_km = viagem.distancia;
    data.campos.velocidade_media_kmh = viagem.velocidade_media;
    data.campos.consumo_combustivel_kml = viagem.consumo_combustivel;
    data.campos.consumo_eletrico_kmkwh = viagem.consumo_eletrico;

    // Autonomia EV - "247 km" após "EV" ou próximo de "NORMAL"
    data.campos.autonomia_ev_km = this._extractEvRange(t);

    // Modo de condução (NORMAL, ECO, SPORT)
    data.campos.modo_conducao = this._extractDriveMode(t);

    // Nível bateria %
    data.campos.bateria_pct = this._extractBatteryLevel(t);

    // Horário
    data.campos.horario = this._extractTime(t);

    return data;
  },

  /**
   * Extrai dados do painel Ranger
   * Campos: velocidade, odômetro, temperatura, câmbio, autonomia, viagem
   */
  extractRanger(text) {
    const data = {
      tipo: 'painel_ranger',
      timestamp: new Date().toISOString(),
      raw_ocr: text,
      campos: {}
    };

    const t = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');

    // Velocidade
    data.campos.velocidade_kmh = this._extractSpeed(t);

    // Odômetro (pode aparecer como "2835.7" ou "2835,7")
    data.campos.odometro_km = this._extractOdometer(t);

    // Temperatura - Ranger mostra "32°" ou "32 C"
    data.campos.temperatura_c = this._extractTemperature(t);

    // Câmbio - PRNDM
    data.campos.cambio = this._extractGear(t);

    // Autonomia restante - "166 km"
    data.campos.autonomia_km = this._extractRange(t);

    // Dados de viagem
    const viagem = this._extractTripData(t);
    data.campos.distancia_viagem_km = viagem.distancia;
    data.campos.velocidade_media_kmh = viagem.velocidade_media;
    data.campos.consumo_combustivel_kml = viagem.consumo_combustivel;

    // Tempo de viagem "06:30"
    data.campos.tempo_viagem = this._extractTripTime(t);

    // Turno
    data.campos.horario = this._extractTime(t);

    return data;
  },

  // ─── Helpers Internos ───────────────────────────────────────────────────────

  _extractSpeed(text) {
    // Procura padrão: número de 1-3 dígitos antes de "km/h" ou sozinho
    const patterns = [
      /\b(\d{1,3})\s*km\/h/i,
      /\b0\s*km\/h/i,
    ];
    for (const p of patterns) {
      const m = text.match(p);
      if (m) return parseFloat(m[1] || '0');
    }
    // Tenta achar o "0" sozinho como velocímetro
    const zeroMatch = text.match(/\b(0)\b\s*(?:km|$)/i);
    return zeroMatch ? 0 : null;
  },

  _extractOdometer(text) {
    // Padrões: "43935 km", "43.935 km", "2835.7 km", "2835,7 km"
    const patterns = [
      /(\d{1,3}[.,]\d{3}[.,]?\d*)\s*km/i,
      /(\d{4,6}[.,]\d{1,2})\s*km/i,
      /(\d{4,6})\s*km/i,
    ];
    for (const p of patterns) {
      const m = text.match(p);
      if (m) {
        let val = m[1].replace(',', '.');
        // Remove separador de milhar se necessário
        if ((val.match(/\./g) || []).length > 1) {
          val = val.replace(/\./g, '').replace(/,$/, '');
        }
        return parseFloat(val);
      }
    }
    return null;
  },

  _extractTemperature(text) {
    const m = text.match(/(\d{1,2})\s*°?\s*[Cc]/);
    if (m) return parseInt(m[1]);

    // Alternativa: "14°C" sem espaço
    const m2 = text.match(/(\d{1,2})°C/i);
    if (m2) return parseInt(m2[1]);

    return null;
  },

  _extractGear(text) {
    // Territory: P, R, N, D
    // Ranger: PRNDM (mostra letra selecionada em destaque)
    if (/\bP\b/.test(text)) return 'P';
    if (/\bR\b/.test(text)) return 'R';
    if (/\bN\b/.test(text)) return 'N';
    if (/\bD\b/.test(text)) return 'D';
    if (/PRNDM/i.test(text)) {
      // Tentar identificar letra destacada - difícil sem cor, retorna 'P' como padrão
      return 'P';
    }
    return null;
  },

  _extractTripData(text) {
    const result = {
      distancia: null,
      velocidade_media: null,
      consumo_combustivel: null,
      consumo_eletrico: null
    };

    // Distância da viagem: "294.5 km" ou "444.2 km" no contexto de viagem
    const distMatch = text.match(/(\d{1,4}[.,]\d)\s*km(?!\s*\/)/i);
    if (distMatch) {
      result.distancia = parseFloat(distMatch[1].replace(',', '.'));
    }

    // Velocidade média: "75 km/h" ou "68 km/h"  
    const speedMatch = text.match(/(\d{2,3})\s*km\/h/i);
    if (speedMatch) {
      result.velocidade_media = parseInt(speedMatch[1]);
    }

    // Consumo combustível: "8.5 km/l" ou "8,5 km/l" ou "8.4 km/l"
    const fuelMatch = text.match(/(\d{1,2}[.,]\d)\s*km\/l/i);
    if (fuelMatch) {
      result.consumo_combustivel = parseFloat(fuelMatch[1].replace(',', '.'));
    }

    // Consumo elétrico: "3.4 km/kWh"
    const evMatch = text.match(/(\d{1,2}[.,]\d)\s*km\/kwh/i);
    if (evMatch) {
      result.consumo_eletrico = parseFloat(evMatch[1].replace(',', '.'));
    }

    return result;
  },

  _extractEvRange(text) {
    // "247 km" próximo de "EV" ou "NORMAL"
    const m = text.match(/(\d{2,3})\s*km(?=\s|$)/i);
    if (m) return parseInt(m[1]);
    return null;
  },

  _extractRange(text) {
    // "166 km" como autonomia restante
    const m = text.match(/(\d{2,3})\s*km/i);
    if (m) return parseInt(m[1]);
    return null;
  },

  _extractDriveMode(text) {
    if (/\bNORMAL\b/i.test(text)) return 'NORMAL';
    if (/\bECO\b/i.test(text)) return 'ECO';
    if (/\bSPORT\b/i.test(text)) return 'SPORT';
    if (/\bOFF\b/i.test(text)) return 'OFF';
    return null;
  },

  _extractBatteryLevel(text) {
    // "100 %" ou "100%"
    const m = text.match(/(\d{1,3})\s*%/);
    if (m) return parseInt(m[1]);
    return null;
  },

  _extractTime(text) {
    // "19 30" ou "19:30"
    const m = text.match(/\b(\d{2})[:\s](\d{2})\b/);
    if (m) return `${m[1]}:${m[2]}`;
    return null;
  },

  _extractTripTime(text) {
    // "06:30" tempo de viagem
    const matches = text.match(/(\d{2}):(\d{2})/g);
    if (matches && matches.length > 0) {
      // Retorna o último match (geralmente é o tempo de viagem)
      return matches[matches.length - 1];
    }
    return null;
  }
};

window.DashExtractor = DashExtractor;
