#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const Tesseract = require('tesseract.js');
const readline = require('readline');

function rl() {
    return readline.createInterface({ input: process.stdin, output: process.stdout });
}
function pergunta(query) {
    return new Promise(resolve => {
        const i = rl();
        i.question(query, ans => { i.close(); resolve(ans.trim()); });
    });
}

// ─── PARSERS ─────────────────────────────────────────────────────────

function parsearNota(texto) {
    const lines = texto.split('\n').map(l => l.trim().replace(/\s+/g, ' '));
    let litros = null, total = null, saldo = null, posto = null;
    let produto = 'Diesel', placa = null, veiculo = null, dataHora = null;
    const t = texto;

    let m = t.match(/\b(3[0-9]),(\d{3})\b/) || t.match(/\b(3[0-9])\.(\d{3})\b/);
    if (m) { const v = parseFloat(m[1] + '.' + m[2]); if (v > 10 && v < 200) litros = v; }
    if (!litros) {
        for (const line of lines) {
            if (/TD|QTD|QUANTIDADE|LITROS?/i.test(line) && !/DISPO|SALDO|LIMITE/i.test(line)) {
                const m2 = line.match(/(\d+)[.,](\d{2,3})/);
                if (m2) { const v = parseFloat(m2[1] + '.' + m2[2].slice(0,2)); if (v > 10 && v < 200) litros = v; }
            }
        }
    }
    if (!litros) {
        for (const line of lines) {
            if (/DIESEL|S10|PRODUTO/i.test(line)) {
                const m2 = line.match(/(\d+)[.,](\d{2,3})/);
                if (m2) { const v = parseFloat(m2[1] + '.' + m2[2].slice(0,2)); if (v > 10 && v < 200) litros = v; }
            }
        }
    }
    if (!litros) {
        const m2 = t.match(/:?\s*(3[0-9])[.,](\d{3,4})\b/);
        if (m2) { const v = parseFloat(m2[1] + '.' + m2[2].slice(0,2)); if (v > 10 && v < 200) litros = v; }
    }
    if (!litros) {
        const m2 = t.match(/\b(3[0-9])\s*(\d{4,5})\b/);
        if (m2) { const v = parseFloat(m2[1] + '.' + m2[2].slice(0,2)); if (v > 10 && v < 200) litros = v; }
    }

    for (const line of lines) {
        const lUpper = line.toUpperCase();
        if (/(?:saldo|ltd\+|dispon[ií]vel)/i.test(lUpper) && !lUpper.includes('LIMITE')) {
            const m3 = line.match(/\b(\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\d+(?:[.,]\d{2})?)\b/);
            if (m3) saldo = m3[1];
        }
        if (/(?:total|valor\s*bruto|bruto|pago)/i.test(lUpper)) {
            const m3 = line.match(/\b(\d+[.,]\d{2})\b/);
            if (m3) total = parseFloat(m3[1].replace(',', '.'));
        }
        if (/(?:placa|laca)/i.test(lUpper)) {
            const m3 = line.match(/\b([A-Z0-9]{7})\b/i) || line.match(/([A-Z]{3}[\s-]?\d[A-Z0-9]\d{2})/i);
            if (m3) placa = m3[1].replace(/[\s-]/g, '').toUpperCase();
        }
        if (/(?:veiculo|veículo)/i.test(lUpper)) {
            const m3 = line.match(/(?:veiculo|veículo)\s*:?\s*([A-Z0-9\s\-]+?)(?:\s+-\s+[A-Z]{4}|\s+placa|\s+condutor|$)/i);
            if (m3) veiculo = m3[1].trim();
        }
        if (/(?:auto\s*)?posto/i.test(lUpper)) {
            const m3 = line.match(/(?:auto\s*)?posto\s+([A-Z0-9\s\-]+)/i);
            if (m3) posto = m3[0].trim();
        }
    }
    if (!posto && /REI DA CASTELO/i.test(t)) posto = 'Auto Posto Rei da Castelo';
    if (/diesel|óleo diesel/i.test(t)) produto = 'Diesel';
    else if (/gasolina/i.test(t)) produto = 'Gasolina';
    else if (/etanol|e100/i.test(t)) produto = 'E100';
    const mData = t.match(/(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2}(?::\d{2})?)/);
    if (mData) dataHora = `${mData[1]} ${mData[2]}`;
    const precoLitro = (litros && total && litros > 0) ? parseFloat((total / litros).toFixed(3)) : null;
    return { litros, precoLitro, total, dataHora, posto, produto, saldo, placa, veiculo };
}

function parsearPainel(texto) {
    const lines = texto.split('\n').map(l => l.trim().replace(/\s+/g, ' '));
    let km = null, trip = null, consumo = null, temp = null;
    const t = texto.toLowerCase();

    const mConsE = t.match(/(\d{1,2})\s*km\/?\s*kwh/i);
    if (mConsE) { let v = parseInt(mConsE[1]); if (v > 10) v /= 10; if (v > 0.5 && v < 20) consumo = v; }
    if (!consumo) {
        const mCons = t.match(/(?:^|\s)(\d+(?:[.,]\d)?)\s*(?:km\/l|km\/litro|l\/100)/i);
        if (mCons) { let v = parseFloat(mCons[1].replace(',', '.')); if (t.includes('L/100') && v > 0) v = parseFloat((100 / v).toFixed(1)); if (v > 0.5 && v < 50) consumo = v; }
    }
    if (!consumo) {
        const mCons = t.match(/(?:media|médias|average|avg|cons|consumo)[^\d]*(\d+(?:[.,]\d)?)/i);
        if (mCons) { const v = parseFloat(mCons[1].replace(',', '.')); if (v > 0.5 && v < 50) consumo = v; }
    }

    for (const line of lines) {
        const matchesKm = [...line.matchAll(/(\d{4,6})\s*(?:km|k|kn)/gi)];
        for (const mk of matchesKm) { const v = parseInt(mk[1]); if (v >= 10000 && v <= 999999) km = v; }
    }
    if (!km) {
        let maior = 0;
        for (const line of lines) {
            for (const mk of line.matchAll(/\b(\d{5,6})\b/g)) {
                const v = parseInt(mk[1]); if (v >= 10000 && v <= 999999 && v > maior) maior = v;
            }
        }
        if (maior) km = maior;
    }

    const linhasSemER = lines.filter(l => !/ER\s+\d/i.test(l));
    const numsProxKm = [];
    for (const line of linhasSemER) {
        const m = line.match(/(?:^|\s)(\d{2,3})\s*k\s*m?/i);
        if (m) { const v = parseInt(m[1]); if (v >= 10 && v < 1000) numsProxKm.push(v); }
        const m2 = line.match(/(?:trip|viagem|parcial|dist)[^\d]*(\d{1,4}(?:[.,]\d)?)/i);
        if (m2) { const v = parseFloat(m2[1].replace(',', '.')); if (v > 10 && v < 5000) numsProxKm.push(v); }
    }
    for (const v of numsProxKm) {
        if (consumo && Math.abs(v - consumo * 10) < 1) continue;
        if (Math.abs(v - (km || 0)) < 10) continue;
        trip = v; break;
    }
    for (const line of lines) {
        const mTemp = line.match(/\b(\d{1,2})\s*°?\s*C\b/i) || line.match(/\b(\d{1,2})\s*°\b/);
        if (mTemp) { temp = parseInt(mTemp[1]); break; }
    }
    return { km, trip, consumo, temp };
}

// ─── PRÉ-PROCESSAMENTO ──────────────────────────────────────────────

function whitelist(ehPainel) {
    return ehPainel
        ? '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz°kmhprndlKMPHRNDL/.:- '
        : '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzàáâãçéêíóôõúÀÁÂÃÇÉÊÍÓÔÕÚ/:.,;°%()[]{}@#&*+-=$€R$ \'"\n';
}

async function executarOCR(buffer, ehPainel, onProgress) {
    const worker = await Tesseract.createWorker('por+eng', 1, {
        logger: m => { if (m.status === 'recognizing text' && onProgress) onProgress(m.progress); }
    });
    const wl = whitelist(ehPainel);
    let melhor = '', melhorConf = 0, ultimo = '';
    for (const psm of ['6', '3', '4']) {
        try {
            await worker.setParameters({ tessedit_pageseg_mode: psm, tessedit_char_whitelist: wl });
            const r = await worker.recognize(buffer);
            const txt = (r.data.text || '').trim();
            const conf = r.data.confidence || 0;
            ultimo = txt;
            if (txt.length > melhor.length && conf >= melhorConf) { melhor = txt; melhorConf = conf; }
            if (txt.length > 15 && conf > 50) break;
        } catch (e) { /* tenta próximo */ }
    }
    await worker.terminate();
    return melhor || ultimo;
}

async function executarOCRMulti(imgPath, ehPainel, onProgress) {
    const estrategias = [
        { name: '1-normal', grayscale: true, normalize: true, modulate: { brightness: 1.0, contrast: 1.3 }, sharpen: { sigma: 0.8, flat: 1.5, jagged: 1 } },
        { name: '2-contraste', grayscale: true, normalize: true, linear: [1.5, -40], sharpen: { sigma: 0.8, flat: 1.5, jagged: 0.5 } },
        { name: '3-threshold', grayscale: true, normalize: true, threshold: 150, sharpen: { sigma: 0.5 } },
        { name: '4-suave', grayscale: true, normalize: true, gamma: 1.3 },
        { name: '5-bright', grayscale: true, normalize: true, linear: [1.1, -10], sharpen: { sigma: 0.7, flat: 1.5, jagged: 1 } },
    ];
    const todosTextos = [];
    for (const est of estrategias) {
        if (onProgress) onProgress(0, `  ${est.name}...`);
        let img = sharp(imgPath);
        const meta = await img.metadata();
        let w = meta.width, h = meta.height;
        const maxDim = 1600;
        if (w > maxDim || h > maxDim) {
            if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
            else { w = Math.round(w * maxDim / h); h = maxDim; }
            img = img.resize(w, h, { fit: 'inside', withoutEnlargement: true });
        }
        if (est.grayscale) img = img.grayscale();
        if (est.normalize) img = img.normalize();
        if (est.linear) img = img.linear(est.linear[0], est.linear[1]);
        if (est.sharpen) img = img.sharpen(est.sharpen);
        if (est.modulate) img = img.modulate(est.modulate);
        if (est.gamma) img = img.gamma(est.gamma);
        if (est.threshold) img = img.threshold(est.threshold);
        const buf = await img.jpeg({ quality: 92 }).toBuffer();
        const txt = await executarOCR(buf, ehPainel);
        todosTextos.push({ nome: est.name, texto: txt, chars: txt.length });
    }
    const linhasVistas = new Set();
    const partes = [];
    todosTextos.sort((a, b) => b.chars - a.chars);
    for (const t of todosTextos) {
        for (const linha of t.texto.split('\n')) {
            const chave = linha.trim().replace(/\s+/g, ' ').toLowerCase();
            if (chave && !linhasVistas.has(chave)) {
                linhasVistas.add(chave);
                partes.push(linha);
            }
        }
    }
    const mesclado = partes.join('\n');
    if (onProgress) onProgress(0, `  mesclado: ${mesclado.length} chars`);
    return mesclado;
}

// ─── INTERAÇÃO COM USUÁRIO ─────────────────────────────────────────

async function revisarValor(nome, valorAtual, defaultVal) {
    const exibir = valorAtual !== null && valorAtual !== undefined && valorAtual !== ''
        ? valorAtual : '(não detectado)';
    const resp = await pergunta(`  ${nome} [${exibir}]: `);
    if (resp === '') return valorAtual ?? defaultVal;
    if (resp === 's' || resp === 'S') return valorAtual;
    const num = parseFloat(resp.replace(',', '.'));
    return isNaN(num) ? resp : num;
}

async function revisarTexto(mensagem, valorAtual, defaultVal) {
    const exibir = valorAtual || '(vazio)';
    const resp = await pergunta(`  ${mensagem} [${exibir}]: `);
    if (resp === '') return valorAtual || defaultVal || '';
    return resp;
}

// ─── FORMATAR WHATSAPP ──────────────────────────────────────────────

function formatarWhatsApp(dados) {
    const agora = new Date();
    const dia = String(agora.getDate()).padStart(2, '0');
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const ano = String(agora.getFullYear()).slice(-2);
    const dataF = `${dia}/${mes}/${ano}`;

    const v = dados.veiculo || 'Veículo';
    const km = dados.km ?? '--';
    const trip = dados.trip ?? '--';
    const litros = dados.litros ?? '--';
    const valor = dados.total ?? '--';
    const posto = dados.posto || 'Rei da Castelo';
    const comb = dados.produto || 'Diesel';
    const saldo = dados.saldo || '0,00';
    const kml = dados.kml ?? '0.00';

    const linhas = [
        'Final de Turno',
        String(v),
        'vin ---',
        `1°Turno ${dataF}`,
        `Km: ${String(km).replace(/[^\d]/g, '')}`,
        `Trp: ${trip}`,
        `Abastecimento no ${posto}`,
        `Litros ${comb}: ${litros}`,
        `Valor pago: ${valor}`,
        `Saldo disponível carro LTD+ ${saldo}`,
        `km/l: ${kml}`
    ];
    return linhas.join('\n');
}

// ─── MAIN ────────────────────────────────────────────────────────────

async function main() {
    console.log(`
╔════════════════════════════════════════════╗
║   OCR VEICULAR - FORD VEV                  ║
║   Leitura de Nota Fiscal + Painel          ║
╚════════════════════════════════════════════╝
    `);

    const args = process.argv.slice(2);
    let caminhoNota = null, caminhoPainel = null;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--nota' && args[i+1]) caminhoNota = args[++i];
        else if (args[i] === '--painel' && args[i+1]) caminhoPainel = args[++i];
        else if (!args[i].startsWith('-')) {
            if (!caminhoNota) caminhoNota = args[i];
            else if (!caminhoPainel) caminhoPainel = args[i];
        }
    }

    // Modo interativo se não passar argumentos
    if (!caminhoNota && !caminhoPainel) {
        console.log('Modo interativo: informe os caminhos das fotos.');
        const r1 = rl();
        caminhoNota = await new Promise(resolve => {
            r1.question('📷 Caminho da foto da NOTA FISCAL (Enter p/ pular): ', ans => { r1.close(); resolve(ans.trim() || null); });
        });
        if (caminhoNota && !fs.existsSync(caminhoNota)) {
            console.log('  Arquivo não encontrado. Ignorando nota.');
            caminhoNota = null;
        }
        const r2 = rl();
        caminhoPainel = await new Promise(resolve => {
            r2.question('📷 Caminho da foto do PAINEL (Enter p/ pular): ', ans => { r2.close(); resolve(ans.trim() || null); });
        });
        if (caminhoPainel && !fs.existsSync(caminhoPainel)) {
            console.log('  Arquivo não encontrado. Ignorando painel.');
            caminhoPainel = null;
        }
        if (!caminhoNota && !caminhoPainel) {
            console.log('Nenhuma foto fornecida. Entrando em modo manual.');
        }
    }

    const dados = { veiculo: null, km: null, trip: null, litros: null, total: null, posto: null, produto: 'Diesel', saldo: null, kml: null };

    // ── OCR ──
    if (caminhoNota) {
        console.log(`\n📄 Lendo NOTA: ${path.basename(caminhoNota)}`);
        const texto = await executarOCRMulti(caminhoNota, false, (p, msg) => {
            if (msg) process.stdout.write(`  ${msg}\r`);
        });
        console.log('\n  --- Texto bruto ---');
        texto.split('\n').filter(l => l.trim()).forEach(l => console.log('  ' + l));
        const nota = parsearNota(texto);
        if (nota.litros) dados.litros = nota.litros;
        if (nota.total) dados.total = nota.total;
        if (nota.posto) dados.posto = nota.posto;
        if (nota.produto) dados.produto = nota.produto;
        if (nota.veiculo) dados.veiculo = nota.veiculo;
        if (nota.saldo) dados.saldo = nota.saldo;
    }

    if (caminhoPainel) {
        console.log(`\n🚗 Lendo PAINEL: ${path.basename(caminhoPainel)}`);
        const texto = await executarOCRMulti(caminhoPainel, true, (p, msg) => {
            if (msg) process.stdout.write(`  ${msg}\r`);
        });
        console.log('\n  --- Texto bruto ---');
        texto.split('\n').filter(l => l.trim()).forEach(l => console.log('  ' + l));
        const painel = parsearPainel(texto);
        if (painel.km) dados.km = painel.km;
        if (painel.trip) dados.trip = painel.trip;
        if (painel.consumo) dados.kml = painel.consumo;
    }

    // ── REVISÃO MANUAL ──
    console.log('\n' + '='.repeat(50));
    console.log('📝 REVISÃO DOS DADOS EXTRAÍDOS');
    console.log('(Enter = manter, digite o valor correto para alterar)');
    console.log('='.repeat(50));

    dados.veiculo = await revisarTexto('Veículo', dados.veiculo, 'Ranger XLT');
    dados.km = await revisarValor('Km (odômetro)', dados.km, 0);
    dados.trip = await revisarValor('Trip (km rodados)', dados.trip, 0);
    dados.litros = await revisarValor('Litros abastecidos', dados.litros, 0);
    dados.total = await revisarValor('Valor total R$', dados.total, 0);
    dados.posto = await revisarTexto('Posto', dados.posto, 'Rei da Castelo');
    dados.produto = await revisarTexto('Combustível', dados.produto, 'Diesel');
    dados.saldo = await revisarTexto('Saldo LTD+', dados.saldo, '0,00');

    // Calcula km/l
    if (dados.trip > 0 && dados.litros > 0) {
        dados.kml = parseFloat((dados.trip / dados.litros).toFixed(2));
    } else if (dados.kml === null) {
        dados.kml = '0.00';
    }

    // ── GERAR WHATSAPP ──
    console.log('\n' + '='.repeat(50));
    console.log('💬 TEXTO WHATSAPP GERADO:');
    console.log('='.repeat(50));
    const wapp = formatarWhatsApp(dados);
    console.log('\n' + wapp);
    console.log('\n' + '='.repeat(50));

    const outPath = path.join(process.cwd(), 'whatsapp_texto.txt');
    fs.writeFileSync(outPath, wapp, 'utf8');
    console.log(`📁 Salvo em: ${outPath}`);

    // Pergunta se quer copiar pro clipboard
    const copiar = await pergunta('\n📋 Copiar para área de transferência? (s/N): ');
    if (copiar.toLowerCase() === 's') {
        try {
            const { execSync } = require('child_process');
            execSync(`echo ${wapp.replace(/"/g, '\\"')} | clip`, { shell: 'powershell' });
            console.log('✅ Copiado!');
        } catch (e) {
            console.log('  Não foi possível copiar automaticamente.');
        }
    }

    console.log('\n✅ Concluído!');
}

main().catch(err => {
    console.error('\n❌ Erro:', err.message);
    process.exit(1);
});
