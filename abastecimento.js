/**
 * MÓDULO DE ABASTECIMENTO E CONSUMO OFFLINE (OCR LOCAL)
 * Desenvolvido para operação no Campo de Provas Ford Tatuí.
 * Executa OCR 100% offline via WebAssembly (Tesseract.js).
 */

// Fallback seguro caso VEVAlert.toast não esteja definido no sistema global
if (typeof window !== 'undefined') {
    if (typeof window.VEVAlert === 'undefined') {
        window.VEVAlert = {};
    }
    if (typeof window.VEVAlert.toast !== 'function') {
        window.VEVAlert.toast = function (msg, type = 'info') {
            console.log(`[Toast] [${type}] ${msg}`);
            const el = document.createElement('div');
            el.className = 'vev-toast-notification';
            el.style.cssText = `
                position: fixed;
                bottom: 30px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(22, 22, 30, 0.96);
                border: 1.5px solid ${type === 'success' ? '#4ade80' : type === 'error' ? '#f87171' : '#ffb74d'};
                color: #fff;
                padding: 12px 24px;
                border-radius: 50px;
                font-size: 0.8rem;
                font-weight: 700;
                z-index: 999999;
                box-shadow: 0 8px 24px rgba(0,0,0,0.6);
                backdrop-filter: blur(10px);
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 8px;
            `;
            const icon = type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info';
            el.innerHTML = `<span class="material-icons" style="font-size:1.1rem;color:${type === 'success' ? '#4ade80' : type === 'error' ? '#f87171' : '#ffb74d'};">${icon}</span> ${msg}`;
            document.body.appendChild(el);
            setTimeout(() => {
                el.style.opacity = '0';
                el.style.transform = 'translateX(-50%) translateY(10px)';
                setTimeout(() => el.remove(), 300);
            }, 3000);
        };
    }
}

let imgCupomBase64 = null;
let imgPainelBase64 = null;
let ocrTextoCupom = '';
let ocrTextoPainel = '';

// Prefill o veículo com base no operador ou veículo ativo do turno se disponível
function preencherVeiculoAtivo() {
    try {
        let veiculo = '';
        if (typeof TurnoEngine !== 'undefined' && TurnoEngine.dados) {
            const d = TurnoEngine.dados;
            if (d.veiculo) {
                veiculo = d.veiculo;
                if (d.placa) veiculo += ` — Placa: ${d.placa}`;
                else if (d.vin) veiculo += ` (VIN: ${d.vin})`;
            }
        }
        
        if (!veiculo) {
            const turnoAtivo = localStorage.getItem('vev_turno_ativo');
            if (turnoAtivo) {
                const turnoObj = JSON.parse(turnoAtivo);
                if (turnoObj && turnoObj.veiculo) {
                    veiculo = turnoObj.veiculo + (turnoObj.placa ? ` - Placa: ${turnoObj.placa}` : '');
                }
            }
        }
        
        if (veiculo) {
            const el = document.getElementById('val-veiculo-nome');
            if (el && !el.value) {
                el.value = veiculo;
            }
        }
    } catch (e) {
        console.warn('Erro ao obter veículo ativo:', e);
    }
}

// Inicializar campos ao carregar a tela
window.initAbastecimentoScreen = function() {
    preencherVeiculoAtivo();
    
    // Set a data e hora padrão atual
    const elData = document.getElementById('val-abast-data');
    if (elData && !elData.value) {
        const agora = new Date();
        const dia = String(agora.getDate()).padStart(2, '0');
        const mes = String(agora.getMonth() + 1).padStart(2, '0');
        const ano = agora.getFullYear();
        const hora = String(agora.getHours()).padStart(2, '0');
        const min = String(agora.getMinutes()).padStart(2, '0');
        elData.value = `${dia}/${mes}/${ano} ${hora}:${min}`;
    }
}

// Manipulação de imagem e visualização
window.previewImagem = function(input, previewId, placeholderId) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const containerId = previewId + '-container';
            const previewEl = document.getElementById(previewId);
            const containerEl = document.getElementById(containerId);
            const placeholderEl = document.getElementById(placeholderId);
            
            if (previewEl && containerEl && placeholderEl) {
                previewEl.src = e.target.result;
                containerEl.style.display = 'block';
                placeholderEl.style.display = 'none';
                
                // Salva a imagem em base64
                if (previewId === 'preview-cupom') {
                    imgCupomBase64 = e.target.result;
                } else if (previewId === 'preview-painel') {
                    imgPainelBase64 = e.target.result;
                }
                
                verificarBotoes();
            }
        };
        reader.readAsDataURL(input.files[0]);
    }
}

window.removerImagem = function(inputId, previewId, placeholderId) {
    const input = document.getElementById(inputId);
    const containerId = previewId + '-container';
    const previewEl = document.getElementById(previewId);
    const containerEl = document.getElementById(containerId);
    const placeholderEl = document.getElementById(placeholderId);
    
    if (input) input.value = '';
    if (previewEl) previewEl.src = '';
    if (containerEl) containerEl.style.display = 'none';
    if (placeholderEl) placeholderEl.style.display = 'block';
    
    if (previewId === 'preview-cupom') {
        imgCupomBase64 = null;
        ocrTextoCupom = '';
    } else if (previewId === 'preview-painel') {
        imgPainelBase64 = null;
        ocrTextoPainel = '';
    }
    
    verificarBotoes();
}

function verificarBotoes() {
    const btn = document.getElementById('btn-processar-ocr');
    if (btn) {
        // Habilita se tiver pelo menos uma foto selecionada
        btn.disabled = !(imgCupomBase64 || imgPainelBase64);
    }
}

// ─── Redimensionar mantendo proporção ──────────────────────────────
function _calcularDimensoes(w, h, maxDim) {
    if (w <= maxDim && h <= maxDim) return { w, h };
    if (w > h) return { w: maxDim, h: Math.round(h * maxDim / w) };
    return { w: Math.round(w * maxDim / h), h: maxDim };
}

// ─── Nitidez leve (sharpening kernel 3×3) ─────────────────────────
function _sharpening(data, width, height) {
    const copy = new Uint8ClampedArray(data);
    const k = [0, -1, 0, -1, 5, -1, 0, -1, 0];
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let v = 0, ki = 0;
            for (let dy = -1; dy <= 1; dy++)
                for (let dx = -1; dx <= 1; dx++)
                    v += copy[((y+dy)*width+(x+dx))*4] * k[ki++];
            const i = (y*width+x)*4;
            const c = Math.max(0, Math.min(255, v));
            data[i] = data[i+1] = data[i+2] = c;
        }
    }
}

// ─── Equalização de histograma ─────────────────────────────────────
function _equalizar(data, width, height) {
    const pixels = data.length / 4;
    const hist = new Array(256).fill(0);
    for (let i = 0; i < pixels; i++)
        hist[Math.round(0.299*data[i*4] + 0.587*data[i*4+1] + 0.114*data[i*4+2])]++;
    const cdf = new Array(256);
    let acc = 0;
    for (let i = 0; i < 256; i++) { acc += hist[i]; cdf[i] = (acc/pixels)*255; }
    for (let i = 0; i < pixels; i++) {
        const g = Math.round(0.299*data[i*4] + 0.587*data[i*4+1] + 0.114*data[i*4+2]);
        const eq = Math.round(cdf[Math.max(0,Math.min(255,g))]);
        data[i*4] = data[i*4+1] = data[i*4+2] = Math.max(0,Math.min(255,eq));
    }
}

// ─── Aumenta contraste (stretch) ───────────────────────────────────
function _stretchContraste(data, width, height) {
    const pixels = data.length / 4;
    let minV = 255, maxV = 0;
    for (let i = 0; i < pixels; i++) {
        const g = 0.299*data[i*4] + 0.587*data[i*4+1] + 0.114*data[i*4+2];
        if (g < minV) minV = g;
        if (g > maxV) maxV = g;
    }
    const range = maxV - minV || 1;
    for (let i = 0; i < pixels; i++) {
        const g = 0.299*data[i*4] + 0.587*data[i*4+1] + 0.114*data[i*4+2];
        const stretched = ((g - minV) / range) * 255;
        data[i*4] = data[i*4+1] = data[i*4+2] = Math.max(0,Math.min(255,stretched));
    }
}

// ─── Converte para escala de cinza ─────────────────────────────────
function _cinza(data) {
    for (let i = 0; i < data.length; i += 4) {
        const g = 0.299*data[i] + 0.587*data[i+1] + 0.114*data[i+2];
        data[i] = data[i+1] = data[i+2] = g;
    }
}

// ─── Binarização com threshold adaptativo (Otsu) ───────────────────
function _otsu(grayPixels) {
    const h = new Array(256).fill(0);
    for (const v of grayPixels) h[Math.round(v)]++;
    const total = grayPixels.length;
    let sum = 0;
    for (let i = 0; i < 256; i++) sum += i * h[i];
    let sumB = 0, wB = 0, best = 128, maxV = 0;
    for (let t = 0; t < 256; t++) {
        wB += h[t];
        if (wB === 0) continue;
        const wF = total - wB;
        if (wF === 0) break;
        sumB += t * h[t];
        const diff = (sumB/wB) - ((sum-sumB)/wF);
        const varB = wB * wF * diff * diff;
        if (varB > maxV) { maxV = varB; best = t; }
    }
    return best;
}

function _binarizar(data, invertir) {
    const pixels = data.length / 4;
    const grays = [];
    for (let i = 0; i < pixels; i++)
        grays.push(0.299*data[i*4] + 0.587*data[i*4+1] + 0.114*data[i*4+2]);
    const t = _otsu(grays);
    for (let i = 0; i < pixels; i++) {
        const b = grays[i] > t ? 255 : 0;
        const v = invertir ? 255 - b : b;
        data[i*4] = data[i*4+1] = data[i*4+2] = v;
    }
}

// ─── CLAHE simplificado ──────────────────────────────────────────
function _clahe(data, width, height, tileSize, clipLimit) {
    tileSize = tileSize || 64;
    clipLimit = clipLimit || 3;
    const tilesX = Math.ceil(width / tileSize);
    const tilesY = Math.ceil(height / tileSize);
    const gray = new Float64Array(width * height);
    for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++)
            gray[y * width + x] = 0.299 * data[(y*width+x)*4] + 0.587 * data[(y*width+x)*4+1] + 0.114 * data[(y*width+x)*4+2];

    function _equalizarTile(tilePixels, tileLen) {
        const hist = new Array(256).fill(0);
        for (let i = 0; i < tileLen; i++) {
            const v = Math.round(tilePixels[i]);
            if (v >= 0 && v <= 255) hist[v]++;
        }
        const clip = clipLimit * tileLen / 256;
        let excesso = 0;
        for (let i = 0; i < 256; i++) {
            if (hist[i] > clip) { excesso += hist[i] - clip; hist[i] = clip; }
        }
        const redistribuir = excesso / 256;
        for (let i = 0; i < 256; i++) hist[i] += redistribuir;
        const cdf = new Uint16Array(256);
        let acc = 0;
        for (let i = 0; i < 256; i++) { acc += hist[i]; cdf[i] = acc; }
        const cdfMin = cdf[0];
        const cdfMax = cdf[255];
        const denom = cdfMax - cdfMin || 1;
        for (let i = 0; i < tileLen; i++) {
            const v = Math.round(tilePixels[i]);
            if (v >= 0 && v <= 255)
                tilePixels[i] = ((cdf[v] - cdfMin) / denom) * 255;
        }
    }

    // Processa cada tile independentemente
    const tileResults = [];
    for (let ty = 0; ty < tilesY; ty++) {
        for (let tx = 0; tx < tilesX; tx++) {
            const startX = tx * tileSize;
            const startY = ty * tileSize;
            const tw = Math.min(tileSize, width - startX);
            const th = Math.min(tileSize, height - startY);
            const tileData = new Float64Array(tw * th);
            for (let y = 0; y < th; y++)
                for (let x = 0; x < tw; x++)
                    tileData[y * tw + x] = gray[(startY + y) * width + (startX + x)];
            _equalizarTile(tileData, tw * th);
            // Interpolação bilinear simples nas bordas dos tiles
            for (let y = 0; y < th; y++)
                for (let x = 0; x < tw; x++)
                    gray[(startY + y) * width + (startX + x)] = tileData[y * tw + x];
        }
    }

    for (let i = 0; i < width * height; i++) {
        const v = Math.max(0, Math.min(255, Math.round(gray[i])));
        data[i*4] = data[i*4+1] = data[i*4+2] = v;
    }
}

// ─── Filtro mediano para redução de ruído ────────────────────────
function _mediana(data, width, height, raio) {
    raio = raio || 1;
    const copy = new Uint8ClampedArray(data);
    for (let y = raio; y < height - raio; y++) {
        for (let x = raio; x < width - raio; x++) {
            const vals = [];
            for (let dy = -raio; dy <= raio; dy++)
                for (let dx = -raio; dx <= raio; dx++)
                    vals.push(copy[((y+dy)*width+(x+dx))*4]);
            vals.sort((a,b) => a-b);
            const med = vals[Math.floor(vals.length/2)];
            const i = (y*width+x)*4;
            data[i] = data[i+1] = data[i+2] = med;
        }
    }
}

// ─── Threshold adaptativo (Sauvola simplificado) ─────────────────
function _thresholdAdaptativo(data, width, height, janela) {
    janela = janela || Math.floor(Math.min(width, height) / 20);
    const raio = Math.floor(janela / 2);
    const integral = new Float64Array((width+1)*(height+1));
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const g = 0.299*data[(y*width+x)*4] + 0.587*data[(y*width+x)*4+1] + 0.114*data[(y*width+x)*4+2];
            integral[(y+1)*(width+1)+(x+1)] = g + integral[y*(width+1)+(x+1)] + integral[(y+1)*(width+1)+x] - integral[y*(width+1)+x];
        }
    }
    function _somaRegiao(x1, y1, x2, y2) {
        return integral[(y2+1)*(width+1)+(x2+1)] - integral[(y1)*(width+1)+(x2+1)] - integral[(y2+1)*(width+1)+(x1)] + integral[(y1)*(width+1)+(x1)];
    }
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const x1 = Math.max(0, x - raio);
            const x2 = Math.min(width - 1, x + raio);
            const y1 = Math.max(0, y - raio);
            const y2 = Math.min(height - 1, y + raio);
            const n = (x2 - x1 + 1) * (y2 - y1 + 1);
            const soma = _somaRegiao(x1, y1, x2, y2);
            const media = soma / n;
            const g = 0.299*data[(y*width+x)*4] + 0.587*data[(y*width+x)*4+1] + 0.114*data[(y*width+x)*4+2];
            // Sauvola: threshold = media * (1 + k * (std/r - 1))
            // Simplificado: threshold = media * 0.95 se media < 128, senao media * 1.05
            const ajuste = media < 80 ? 0.85 : (media > 180 ? 1.15 : 1.0);
            const threshold = media * ajuste;
            const b = g > threshold ? 255 : 0;
            data[(y*width+x)*4] = data[(y*width+x)*4+1] = data[(y*width+x)*4+2] = b;
        }
    }
}

// ─── Pré-processamento para OCR com múltiplas estratégias ──────────
function preprocessarImagemCanvas(imgSrc, callback) {
    const maxDim = 1200;
    const tentativas = [
        // 1. Pipeline completa: cinza + equaliza + stretch + sharpening + binariza
        function(img, canvas, ctx) {
            const dims = _calcularDimensoes(img.naturalWidth, img.naturalHeight, maxDim);
            canvas.width = dims.w; canvas.height = dims.h;
            ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, dims.w, dims.h);
            const d = ctx.getImageData(0, 0, dims.w, dims.h);
            const px = d.data.length / 4;
            let lum = 0;
            for (let i = 0; i < px; i++) lum += 0.299*d.data[i*4] + 0.587*d.data[i*4+1] + 0.114*d.data[i*4+2];
            const media = lum / px;
            _cinza(d.data);
            _equalizar(d.data, dims.w, dims.h);
            _stretchContraste(d.data, dims.w, dims.h);
            _sharpening(d.data, dims.w, dims.h);
            if (media >= 110) _binarizar(d.data, false);
            ctx.putImageData(d, 0, 0);
            return canvas.toDataURL('image/jpeg', 0.92);
        },
        // 2. Só cinza + equaliza + sharpening (bom para painéis escuros)
        function(img, canvas, ctx) {
            const dims = _calcularDimensoes(img.naturalWidth, img.naturalHeight, maxDim);
            canvas.width = dims.w; canvas.height = dims.h;
            ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, dims.w, dims.h);
            const d = ctx.getImageData(0, 0, dims.w, dims.h);
            _cinza(d.data);
            _equalizar(d.data, dims.w, dims.h);
            _sharpening(d.data, dims.w, dims.h);
            ctx.putImageData(d, 0, 0);
            return canvas.toDataURL('image/jpeg', 0.92);
        },
        // 3. Threshold (bom para notas)
        function(img, canvas, ctx) {
            const dims = _calcularDimensoes(img.naturalWidth, img.naturalHeight, maxDim);
            canvas.width = dims.w; canvas.height = dims.h;
            ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, dims.w, dims.h);
            const d = ctx.getImageData(0, 0, dims.w, dims.h);
            _cinza(d.data);
            _equalizar(d.data, dims.w, dims.h);
            _binarizar(d.data, false);
            ctx.putImageData(d, 0, 0);
            return canvas.toDataURL('image/jpeg', 0.92);
        },
        // 4. Só stretch + cinza (fallback leve)
        function(img, canvas, ctx) {
            const dims = _calcularDimensoes(img.naturalWidth, img.naturalHeight, maxDim);
            canvas.width = dims.w; canvas.height = dims.h;
            ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, dims.w, dims.h);
            const d = ctx.getImageData(0, 0, dims.w, dims.h);
            _cinza(d.data);
            _stretchContraste(d.data, dims.w, dims.h);
            ctx.putImageData(d, 0, 0);
            return canvas.toDataURL('image/jpeg', 0.92);
        }
    ];
    const img = new Image();
    img.onload = function() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        for (const fn of tentativas) {
            try {
                const result = fn(img, canvas, ctx);
                callback(result);
                return;
            } catch(e) {
                console.warn('[Preprocess] Tentativa falhou:', e);
            }
        }
        try {
            const dims = _calcularDimensoes(img.naturalWidth, img.naturalHeight, 1200);
            canvas.width = dims.w; canvas.height = dims.h;
            ctx.drawImage(img, 0, 0, dims.w, dims.h);
            callback(canvas.toDataURL('image/jpeg', 0.92));
        } catch(e) {
            callback(imgSrc);
        }
    };
    img.onerror = function() { callback(imgSrc); };
    img.src = imgSrc;
}

// Retorna whitelist apropriada para o tipo de imagem
function _whitelistParaTipo(ehPainel) {
    if (ehPainel) {
        // Painel: apenas dígitos, letras comuns (km, trip, prndm, etc.) e símbolos
        return '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz°°°°°°kmhprndlKMPHRNDL/.:- ';
    }
    // Nota fiscal: caracteres comuns + acentos PT-BR
    return '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzàáâãçéêíóôõúÀÁÂÃÇÉÊÍÓÔÕÚ/:.,;°%()[]{}@#&*+-=$€R$ \'"\n';
}

// Tenta carregar Tesseract (CDN → local)
async function _criarWorkerOCR(progressCallback) {
    if (typeof Tesseract === 'undefined') {
        throw new Error('Tesseract.js não foi carregado.');
    }
    const logger = m => {
        if (m.status === 'recognizing text' && typeof progressCallback === 'function') {
            progressCallback(m.progress);
        }
    };
    // Tenta CDN primeiro
    try {
        return await Tesseract.createWorker('por+eng', 1, { logger });
    } catch (e) {
        console.warn('[OCR] CDN falhou, tentando local:', e.message);
    }
    // Fallback local (offline)
    return await Tesseract.createWorker('por+eng', 1, {
        workerPath: './tesseract/worker.min.js',
        corePath: './tesseract/',
        langPath: './tesseract/lang',
        logger,
    });
}

// Executa OCR com múltiplas tentativas (PSM + whitelist)
async function executarOCR(imgSrc, progressCallback, ehPainel) {
    const worker = await _criarWorkerOCR(progressCallback);
    const whitelist = _whitelistParaTipo(ehPainel);
    const modosPSM = ['6', '3', '4'];
    let melhorTexto = '';
    let melhorConf = 0;
    let ultimoResultado = '';

    for (const psm of modosPSM) {
        try {
            await worker.setParameters({
                tessedit_pageseg_mode: psm,
                tessedit_char_whitelist: whitelist,
            });
            const r = await worker.recognize(imgSrc);
            const txt = (r.data.text || '').trim();
            const conf = r.data.confidence || 0;
            ultimoResultado = txt;

            if (txt.length > melhorTexto.length && conf >= melhorConf) {
                melhorTexto = txt;
                melhorConf = conf;
            }
            if (txt.length > 15 && conf > 50) break;
        } catch (e) {
            console.warn(`[OCR] PSM ${psm} falhou:`, e.message);
        }
    }

    try { await worker.terminate(); } catch (_) {}
    return melhorTexto || ultimoResultado;
}

// Fluxo principal para processar as duas fotos offline
window.processarImagensOffline = async function() {
    const overlay = document.getElementById('ocr-loading-overlay');
    const titleEl = document.getElementById('ocr-status-title');
    const progressEl = document.getElementById('ocr-progress-bar');
    const textEl = document.getElementById('ocr-status-text');
    const resultsContainer = document.getElementById('ocr-results-container');
    const previewContainer = document.getElementById('whatsapp-preview-container');
    
    if (!overlay) return;
    
    // Ocultar resultados antigos
    if (resultsContainer) resultsContainer.style.display = 'none';
    if (previewContainer) previewContainer.style.display = 'none';
    
    overlay.style.display = 'flex';
    if (progressEl) progressEl.style.width = '0%';
    if (titleEl) titleEl.innerText = 'Preparando processamento...';
    if (textEl) textEl.innerText = 'Verificando imagens selecionadas...';
    
    // Garantir feedback mesmo sem console
    const log = (msg) => { console.log('[OCR]', msg); if (textEl) textEl.innerText = msg; };
    
    try {
        preencherVeiculoAtivo();
        
        let cupomFinalizado = false;
        let painelFinalizado = false;
        let erros = [];
        
        // 1. Processar Cupom Fiscal se existir
        if (imgCupomBase64) {
            log('Otimizando imagem do cupom fiscal...');
            if (titleEl) titleEl.innerText = 'Processando Cupom de Abastecimento (1/2)';
            if (progressEl) progressEl.style.width = '5%';
            
            const imgProcessada = await new Promise(resolve => {
                preprocessarImagemCanvas(imgCupomBase64, resolve);
            });
            
            if (progressEl) progressEl.style.width = '15%';
            log('Executando reconhecimento de caracteres offline...');
            
            try {
                ocrTextoCupom = await executarOCR(imgProcessada, (progresso) => {
                    const perc = Math.round(15 + progresso * 35);
                    if (progressEl) progressEl.style.width = perc + '%';
                    log(`Reconhecendo cupom: ${Math.round(progresso * 100)}%`);
                }, false);
                
                log('Texto extraído do cupom! Interpretando dados...');
                console.log('--- OCR CUPOM EXTRACTED ---', ocrTextoCupom);
                
                if (ocrTextoCupom && ocrTextoCupom.trim().length > 5) {
                    parsearDadosCupom(ocrTextoCupom);
                    cupomFinalizado = true;
                } else {
                    erros.push('Cupom: texto muito curto ou vazio');
                }
            } catch (e) {
                erros.push('Cupom: ' + e.message);
                console.error('[OCR Cupom]', e);
            }
            
            if (progressEl) progressEl.style.width = '50%';
        } else {
            if (progressEl) progressEl.style.width = '50%';
        }
        
        // 2. Processar Painel se existir
        if (imgPainelBase64) {
            log('Otimizando imagem do painel do veículo...');
            if (titleEl) titleEl.innerText = imgCupomBase64 ? 'Processando Painel do Carro (2/2)' : 'Processando Painel do Carro (1/1)';
            
            const imgProcessada = await new Promise(resolve => {
                preprocessarImagemCanvas(imgPainelBase64, resolve);
            });
            
            if (progressEl) progressEl.style.width = '55%';
            log('Executando reconhecimento de caracteres offline...');
            
            try {
                ocrTextoPainel = await executarOCR(imgProcessada, (progresso) => {
                    const perc = Math.round(55 + progresso * 40);
                    if (progressEl) progressEl.style.width = perc + '%';
                    log(`Reconhecendo painel: ${Math.round(progresso * 100)}%`);
                }, true);
                
                log('Texto extraído do painel! Interpretando dados...');
                console.log('--- OCR PAINEL EXTRACTED ---', ocrTextoPainel);
                
                if (ocrTextoPainel && ocrTextoPainel.trim().length > 3) {
                    parsearDadosPainel(ocrTextoPainel);
                    painelFinalizado = true;
                } else {
                    erros.push('Painel: texto muito curto ou vazio');
                }
            } catch (e) {
                erros.push('Painel: ' + e.message);
                console.error('[OCR Painel]', e);
            }
            
            if (progressEl) progressEl.style.width = '100%';
        }
        
        // Fechar overlay de loading
        overlay.style.display = 'none';
        
        // Exibir container de resultados preenchido
        if (resultsContainer) {
            resultsContainer.style.display = 'block';
            resultsContainer.scrollIntoView({ behavior: 'smooth' });
        }
        
        calcularAutonomiaReal();
        
        // Feedback com resumo
        let msg = '';
        if (cupomFinalizado && painelFinalizado) {
            msg = 'Ambas as fotos processadas com sucesso!';
        } else if (cupomFinalizado) {
            msg = 'Cupom processado! Painel: ' + (erros.find(e => e.includes('Painel')) || 'não selecionado');
        } else if (painelFinalizado) {
            msg = 'Painel processado! Cupom: ' + (erros.find(e => e.includes('Cupom')) || 'não selecionado');
        } else {
            msg = 'Não foi possível ler os dados. ' + (erros.length ? erros.join('; ') : 'Preencha manualmente abaixo.');
            // Mostra container manual de qualquer forma
            if (resultsContainer) resultsContainer.style.display = 'block';
        }
        
        if (typeof VEVAlert !== 'undefined') {
            VEVAlert.toast(msg, erros.length && !cupomFinalizado && !painelFinalizado ? 'error' : 'success');
        } else {
            alert(msg);
        }
        
    } catch (error) {
        console.error('Erro no OCR:', error);
        overlay.style.display = 'none';
        
        if (typeof VEVAlert !== 'undefined') {
            VEVAlert.alert(`Erro ao processar imagem offline: ${error.message}. Tente preencher manualmente.`, { type: 'error', title: 'Erro de Leitura' });
        } else {
            alert(`Erro ao processar imagem offline: ${error.message}. Você pode preencher os dados manualmente.`);
        }
        
        // Abre o container para preenchimento manual de qualquer forma
        if (resultsContainer) {
            resultsContainer.style.display = 'block';
            resultsContainer.scrollIntoView({ behavior: 'smooth' });
        }
    }
}

// Algoritmos Heurísticos de Parsing (Regex)
// Algoritmos Heurísticos de Parsing (Regex robusto de linha-por-linha)
function _mostrarDebugOcr(texto) {
    if (!texto) return;
    const rawEl = document.getElementById('ocr-debug-raw');
    const textEl = document.getElementById('ocr-debug-text');
    if (rawEl && textEl && texto.trim().length > 0) {
        textEl.textContent = texto.trim().substring(0, 2000);
        rawEl.style.display = 'block';
    }
}

function parsearDadosCupom(texto) {
    _mostrarDebugOcr(texto);
    const data = ReceiptExtractor.extract(texto);

    if (data && data.campos) {
        if (data.campos.litros) document.getElementById('val-abast-litros').value = data.campos.litros;
        if (data.campos.preco_por_litro) document.getElementById('val-abast-preco-litro').value = data.campos.preco_por_litro;
        if (data.campos.total) document.getElementById('val-abast-total').value = data.campos.total;
        if (data.campos.data && data.campos.hora) document.getElementById('val-abast-data').value = `${data.campos.data} ${data.campos.hora}`;
        if (data.campos.posto) document.getElementById('val-abast-posto').value = data.campos.posto;
        if (data.campos.produto) document.getElementById('val-abast-combustivel').value = data.campos.produto;
        if (data.campos.disponivel) document.getElementById('val-abast-saldo').value = data.campos.disponivel;

        let veicFormatado = data.campos.veiculo || '';
        if (veicFormatado) {
            if (veicFormatado.toUpperCase().includes('RANGER')) veicFormatado = 'Ranger XLT';
            else if (veicFormatado.toUpperCase().includes('TERRITORY')) veicFormatado = 'Territory';
            if (data.campos.placa) veicFormatado += ` - Placa: ${data.campos.placa}`;
            document.getElementById('val-veiculo-nome').value = veicFormatado;
        } else if (data.campos.placa) {
            document.getElementById('val-veiculo-nome').value = `Veículo - Placa: ${data.campos.placa}`;
        }
    }
}

function parsearDadosPainel(texto) {
    _mostrarDebugOcr(texto);
    const classResult = Classifier.classify(texto);
    let data;
    if (classResult.tipo === 'painel_territory') {
        data = DashExtractor.extractTerritory(texto);
    } else {
        data = DashExtractor.extractRanger(texto);
    }

    if (data && data.campos) {
        if (data.campos.odometro_km) document.getElementById('val-veiculo-km').value = data.campos.odometro_km;
        if (data.campos.distancia_viagem_km) document.getElementById('val-veiculo-trip').value = data.campos.distancia_viagem_km;
        if (data.campos.consumo_combustivel_kml) document.getElementById('val-veiculo-consumo').value = data.campos.consumo_combustivel_kml;
    }
    calcularAutonomiaReal();
}

// Calcula autonomia baseada em Trip inserido e Litros inseridos
window.calcularAutonomiaReal = function() {
    const tripEl = document.getElementById('val-veiculo-trip');
    const litrosEl = document.getElementById('val-abast-litros');
    const resultEl = document.getElementById('val-autonomia-real-label');
    
    if (!tripEl || !litrosEl || !resultEl) return;
    
    const trip = parseFloat(tripEl.value);
    const litros = parseFloat(litrosEl.value);
    
    if (trip > 0 && litros > 0) {
        const real = (trip / litros).toFixed(2);
        resultEl.innerText = `${real} km/L`;
        
        // Estilizar dependendo da eficiência
        if (real >= 12.5) {
            resultEl.style.color = '#38b2ac'; // Cyan (Muito Eficiente)
        } else if (real >= 9.0) {
            resultEl.style.color = '#a8c4f0'; // Azul Claro
        } else {
            resultEl.style.color = '#fbbf24'; // Amber (Alto consumo)
        }
    } else {
        resultEl.innerText = '-- km/L';
        resultEl.style.color = '#fff';
    }
}

// Geração de mensagem formatada
window.gerarTextoWhatsApp = function() {
    const dataRaw = document.getElementById('val-abast-data').value || '';
    const veiculo = document.getElementById('val-veiculo-nome').value || 'Ranger XLT';
    const km = document.getElementById('val-veiculo-km').value || '--';
    const trip = document.getElementById('val-veiculo-trip').value || '--';
    const litros = document.getElementById('val-abast-litros').value || '--';
    const valorTotal = document.getElementById('val-abast-total').value || '--';
    const posto = document.getElementById('val-abast-posto').value || 'Rei da Castelo';
    const combustivel = document.getElementById('val-abast-combustivel').value || 'Diesel';
    const saldo = document.getElementById('val-abast-saldo').value || '0,00';

    // Formatar data como "DD/MM/YY"
    let dataF = dataRaw;
    if (!dataF) {
        const agora = new Date();
        const dia = String(agora.getDate()).padStart(2, '0');
        const mes = String(agora.getMonth() + 1).padStart(2, '0');
        const ano = String(agora.getFullYear()).slice(-2);
        dataF = `${dia}/${mes}/${ano}`;
    } else {
        const match = dataRaw.match(/(\d{2})\/(\d{2})\/(\d{2,4})/);
        if (match) {
            const dia = match[1];
            const mes = match[2];
            const ano = match[3].slice(-2);
            dataF = `${dia}/${mes}/${ano}`;
        }
    }

    // Obter dados do turno ativo (VIN e Turno número)
    let vin = '—';
    let numTurno = '1';
    try {
        if (typeof TurnoEngine !== 'undefined' && TurnoEngine.dados) {
            vin = TurnoEngine.dados.vin || vin;
            numTurno = TurnoEngine.dados.turno || numTurno;
        }
    } catch (e) {}

    // Remover caracteres não numéricos do KM para ficar limpo
    const kmStr = km.toString().replace(/[^\d]/g, '');

    // km/L
    const litN = parseFloat(litros.toString().replace(',', '.'));
    const trpN = parseFloat(trip.toString().replace(',', '.'));
    const kml = (litN > 0 && trpN > 0) ? (trpN / litN).toFixed(2) : '0.00';

    const linhas = [
        'Final de Turno',
        veiculo || 'Ranger XLT',
        `vin ${vin}`,
        `${numTurno}°Turno ${dataF}`,
        `Km: ${kmStr || '--'}`,
        `Trp: ${trip || '--'}`,
        `Abastecimento no ${posto}`,
        `Litros ${combustivel}: ${litros || '--'}`,
        `Valor pago: ${valorTotal || '--'}`,
        `Saldo disponível carro LTD+ ${saldo || '0,00'}`,
        `km/l: ${kml}`
    ];
    const txt = linhas.join('\n');

    const previewContainer = document.getElementById('whatsapp-preview-container');
    const textContent = document.getElementById('whatsapp-text-content');
    
    if (previewContainer && textContent) {
        textContent.innerText = txt;
        previewContainer.style.display = 'block';
        previewContainer.scrollIntoView({ behavior: 'smooth' });
    }
}

// Compartilhar via WhatsApp link api
window.enviarWhatsApp = function() {
    const textEl = document.getElementById('whatsapp-text-content');
    if (!textEl) return;
    
    const textoFormatado = textEl.innerText;
    const urlEncoded = encodeURIComponent(textoFormatado);
    
    // Tenta wa.me primeiro (mais universal), fallback api.web
    const waUrl = `https://wa.me/?text=${urlEncoded}`;
    const webUrl = `https://api.whatsapp.com/send?text=${urlEncoded}`;
    
    const win = window.open(waUrl, '_blank');
    if (!win || win.closed) {
        window.open(webUrl, '_blank');
    }
}

// Copiar para o clipboard
window.copiarMensagemWhatsApp = function() {
    const textEl = document.getElementById('whatsapp-text-content');
    if (!textEl) return;
    
    const text = textEl.innerText;
    
    navigator.clipboard.writeText(text).then(() => {
        const btnText = document.getElementById('copy-btn-text');
        const btnIcon = document.getElementById('copy-btn-icon');
        
        if (btnText && btnIcon) {
            btnText.innerText = 'Copiado!';
            btnIcon.innerText = 'done';
            
            setTimeout(() => {
                btnText.innerText = 'Copiar Texto';
                btnIcon.innerText = 'content_copy';
            }, 2500);
        }
        
        if (typeof VEVAlert !== 'undefined') {
            VEVAlert.toast('Mensagem copiada para a área de transferência!', 'success');
        } else {
            alert('Mensagem copiada!');
        }
    }).catch(err => {
        console.error('Erro ao copiar:', err);
        if (typeof VEVAlert !== 'undefined') {
            VEVAlert.toast('Falha ao copiar mensagem. Copie manualmente.', 'error');
        }
    });
}

// Limpar telas e resetar variáveis
window.limparTelasAbastecimento = function() {
    removerImagem('input-foto-cupom', 'preview-cupom', 'placeholder-cupom');
    removerImagem('input-foto-painel', 'preview-painel', 'placeholder-painel');
    
    const inputs = [
        'val-abast-litros', 'val-abast-preco-litro', 'val-abast-total',
        'val-veiculo-km', 'val-veiculo-trip', 'val-veiculo-consumo',
        'val-veiculo-nome', 'val-abast-data'
    ];
    
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    
    const resultEl = document.getElementById('val-autonomia-real-label');
    if (resultEl) {
        resultEl.innerText = '-- km/L';
        resultEl.style.color = '#fff';
    }
    
    const resultsContainer = document.getElementById('ocr-results-container');
    const previewContainer = document.getElementById('whatsapp-preview-container');
    if (resultsContainer) resultsContainer.style.display = 'none';
    if (previewContainer) previewContainer.style.display = 'none';
    
    // Recarrega defaults
    initAbastecimentoScreen();
}

// ════════════════════════════════════════════════════════════════════════════════
// WHATSAPP + KM/L — MODAL ABASTECIMENTO
// ════════════════════════════════════════════════════════════════════════════════

let _abWappTexto = ''; // guarda o último texto gerado

/**
 * Calcula km/L automaticamente quando Trip ou Litros mudam
 */
window.abCalcKml = function () {
    const trip   = parseFloat((document.getElementById('ab-trip')?.value   || '0').replace(',', '.'));
    const litros = parseFloat((document.getElementById('ab-litros')?.value || '0').replace(',', '.'));
    const card   = document.getElementById('ab-kml-card');
    const valor  = document.getElementById('ab-kml-valor');
    if (!card || !valor) return;
    if (trip > 0 && litros > 0) {
        const kml = (trip / litros).toFixed(2);
        valor.textContent = kml + ' km/L';
        valor.style.color = kml >= 10 ? '#69f0ae' : kml >= 7 ? '#4dd0e1' : '#ffb74d';
        card.style.display = 'flex';
    } else {
        card.style.display = 'none';
    }
};

/**
 * Monta o texto formatado para WhatsApp
 */
window.abGerarWhatsApp = function () {
    // Ler dados do turno ativo
    const turno    = (typeof TurnoEngine !== 'undefined' && TurnoEngine.dados) ? TurnoEngine.dados : null;
    const veiculo  = turno?.veiculo  || localStorage.getItem('vev_ultimo_veiculo') || 'Ranger XLT';
    const vin      = turno?.vin      || '—';
    const operador = turno?.operador || localStorage.getItem('app_vev_operador') || '—';
    const numTurno = turno?.turno    || '1';

    // Ler campos do modal
    const posto    = document.getElementById('ab-posto')?.value    || '—';
    const comb     = document.getElementById('ab-combustivel')?.value || 'Diesel';
    const litros   = document.getElementById('ab-litros')?.value   || '0.00';
    const km       = document.getElementById('ab-km')?.value       || '0';
    const trip     = document.getElementById('ab-trip')?.value     || '0';
    const valor    = document.getElementById('ab-valor')?.value    || '';
    const saldo    = document.getElementById('ab-saldo')?.value    || '';

    // Nota fiscal (campos manuais)
    const notaNum  = document.getElementById('ab-nota-numero')?.value || '';
    const notaData = document.getElementById('ab-nota-data')?.value   || '';
    const notaObs  = document.getElementById('ab-nota-obs')?.value    || '';

    // Formatar data da nota (YYYY-MM-DD → DD/MM/YYYY)
    let notaDataF = '';
    if (notaData) {
        const [y, m, d] = notaData.split('-');
        notaDataF = `${d}/${m}/${y}`;
    }

    // km/L
    const litN = parseFloat(litros.replace(',', '.'));
    const trpN = parseFloat(trip.replace(',', '.'));
    const kml  = (litN > 0 && trpN > 0) ? (trpN / litN).toFixed(2) : '0.00';

    // Data atual formatada como "DD/MM/YY"
    const agora = new Date();
    const dia = String(agora.getDate()).padStart(2, '0');
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const ano = String(agora.getFullYear()).slice(-2);
    const dataF = `${dia}/${mes}/${ano}`;

    // Montar texto no formato exato solicitado
    const linhas = [
        'Final de Turno',
        veiculo,
        `vin ${vin}`,
        `${numTurno}°Turno ${dataF}`,
        `Km: ${km}`,
        `Trp: ${trip}`,
        `Abastecimento no ${posto}`,
        `Litros ${comb}: ${litros}`,
        `Valor pago: ${valor}`,
        `Saldo disponível carro LTD+ ${saldo}`,
        `km/l: ${kml}`,
        ...(notaNum ? [`Nota Fiscal: ${notaNum}${notaDataF ? ` (${notaDataF})` : ''}`] : []),
        ...(notaObs  ? [`Obs: ${notaObs}`] : [])
    ].join('\n');

    _abWappTexto = linhas;

    // Exibir preview
    const preview = document.getElementById('ab-wapp-preview');
    const textoEl = document.getElementById('ab-wapp-texto');
    if (preview) preview.style.display = 'block';
    if (textoEl) textoEl.textContent = linhas;

    // Scroll para o preview
    preview?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

/**
 * Copia o texto para o clipboard
 */
window.abCopiarWapp = function (el) {
    const texto = el?.textContent || _abWappTexto;
    if (!texto) return;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(texto).then(() => {
            const orig = el?.style?.background;
            if (el) { el.style.background = 'rgba(105,240,174,0.15)'; }
            setTimeout(() => { if (el) el.style.background = orig; }, 800);
            if (typeof VEVAlert !== 'undefined') VEVAlert.toast('Copiado!', 'success');
            else alert('Texto copiado!');
        }).catch(() => _abCopiarFallback(texto));
    } else {
        _abCopiarFallback(texto);
    }
};

function _abCopiarFallback(texto) {
    const ta = document.createElement('textarea');
    ta.value = texto;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch(_) {}
    document.body.removeChild(ta);
}

/**
 * Abre o WhatsApp com o texto no campo
 */
window.abAbrirWapp = function () {
    const texto = _abWappTexto || document.getElementById('ab-wapp-texto')?.textContent || '';
    if (!texto) { alert('Gere o texto primeiro.'); return; }
    const encoded = encodeURIComponent(texto);
    const waUrl = `https://wa.me/?text=${encoded}`;
    const webUrl = `https://api.whatsapp.com/send?text=${encoded}`;
    const win = window.open(waUrl, '_blank');
    if (!win || win.closed) {
        window.open(webUrl, '_blank');
    }
};


// Ranger · Territory · Nota Wizeo/Cielo — 100% offline (Tesseract.js local)
// ════════════════════════════════════════════════════════════════════════════════

let _abOcrImgNota = null;    // base64 da foto da nota (já cortada)
let _abOcrImgPainel = null;  // base64 da foto do painel (já cortada)
let _abOcrImgNotaOriginal = null;  // original sem corte
let _abOcrImgPainelOriginal = null; // original sem corte
let _cropperInstance = null;
let _cropTarget = null; // 'nota' | 'painel'

/**
 * Abre overlay de corte para nota ou painel
 */
window.abOcrCortar = function(e, tipo) {
    if (e && e.preventDefault) e.preventDefault();
    _cropTarget = tipo;
    const src = tipo === 'nota' ? _abOcrImgNotaOriginal : _abOcrImgPainelOriginal;
    if (!src) { alert('Selecione uma foto primeiro.'); return; }
    if (typeof Cropper === 'undefined') { alert('Biblioteca de corte ainda carregando. Tente novamente.'); return; }
    const overlay = document.getElementById('ab-crop-overlay');
    const img = document.getElementById('ab-crop-image');
    if (!overlay || !img) return;
    img.src = src;
    overlay.style.display = 'flex';
    if (_cropperInstance) { _cropperInstance.destroy(); _cropperInstance = null; }
    img.onload = function() {
        _cropperInstance = new Cropper(img, {
            aspectRatio: NaN,
            viewMode: 1,
            dragMode: 'crop',
            autoCropArea: 0.6,
            restore: false,
            guides: true,
            center: true,
            background: false,
            movable: true,
            rotatable: true,
            scalable: true,
            zoomable: true,
            responsive: true,
        });
    };
};

/**
 * Fecha overlay de corte
 */
window.abOcrFecharCorte = function() {
    const overlay = document.getElementById('ab-crop-overlay');
    if (overlay) overlay.style.display = 'none';
    if (_cropperInstance) { _cropperInstance.destroy(); _cropperInstance = null; }
};

/**
 * Rotaciona a imagem no cropper
 */
window.abOcrRotacionar = function(graus) {
    if (_cropperInstance) {
        _cropperInstance.rotate(graus);
    }
};

/**
 * Confirma o corte e atualiza a preview
 */
window.abOcrConfirmarCorte = function() {
    if (!_cropperInstance || !_cropTarget) return;
    const canvas = _cropperInstance.getCroppedCanvas({
        maxWidth: 2048,
        maxHeight: 2048,
        fillColor: '#fff',
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
    });
    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
    if (_cropTarget === 'nota') {
        _abOcrImgNota = croppedDataUrl;
        const preview = document.getElementById('ab-ocr-preview-nota');
        if (preview) preview.src = croppedDataUrl;
    } else {
        _abOcrImgPainel = croppedDataUrl;
        const preview = document.getElementById('ab-ocr-preview-painel');
        if (preview) preview.src = croppedDataUrl;
    }
    abOcrFecharCorte();
};

/**
 * Preview da nota de combustível
 */
window.abOcrPreviewNota = function(input) {
    if (!input.files || !input.files[0]) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        _abOcrImgNotaOriginal = e.target.result;
        _abOcrImgNota = e.target.result;
        const preview = document.getElementById('ab-ocr-preview-nota');
        const container = document.getElementById('ab-ocr-preview-nota-container');
        const placeholder = document.getElementById('ab-ocr-placeholder-nota');
        if (preview) preview.src = e.target.result;
        if (container) container.style.display = 'block';
        if (placeholder) placeholder.style.display = 'none';
        _abOcrAtualizarBotao();
    };
    reader.readAsDataURL(input.files[0]);
};

/**
 * Preview do painel (Ranger / Territory)
 */
window.abOcrPreviewPainel = function(input) {
    if (!input.files || !input.files[0]) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        _abOcrImgPainelOriginal = e.target.result;
        _abOcrImgPainel = e.target.result;
        const preview = document.getElementById('ab-ocr-preview-painel');
        const container = document.getElementById('ab-ocr-preview-painel-container');
        const placeholder = document.getElementById('ab-ocr-placeholder-painel');
        if (preview) preview.src = e.target.result;
        if (container) container.style.display = 'block';
        if (placeholder) placeholder.style.display = 'none';
        _abOcrAtualizarBotao();
    };
    reader.readAsDataURL(input.files[0]);
};

/**
 * Remove foto da nota
 */
window.abOcrRemoverNota = function(e) {
    if (e) e.preventDefault();
    _abOcrImgNota = null;
    _abOcrImgNotaOriginal = null;
    const input = document.getElementById('ab-ocr-input-nota');
    const container = document.getElementById('ab-ocr-preview-nota-container');
    const placeholder = document.getElementById('ab-ocr-placeholder-nota');
    if (input) input.value = '';
    if (container) container.style.display = 'none';
    if (placeholder) placeholder.style.display = 'block';
    _abOcrAtualizarBotao();
};

/**
 * Remove foto do painel
 */
window.abOcrRemoverPainel = function(e) {
    if (e) e.preventDefault();
    _abOcrImgPainel = null;
    _abOcrImgPainelOriginal = null;
    const input = document.getElementById('ab-ocr-input-painel');
    const container = document.getElementById('ab-ocr-preview-painel-container');
    const placeholder = document.getElementById('ab-ocr-placeholder-painel');
    if (input) input.value = '';
    if (container) container.style.display = 'none';
    if (placeholder) placeholder.style.display = 'block';
    _abOcrAtualizarBotao();
};

/**
 * Habilita/desabilita o botão de OCR
 */
function _abOcrAtualizarBotao() {
    const btn = document.getElementById('ab-btn-ocr');
    if (!btn) return;
    const temFoto = !!(_abOcrImgNota || _abOcrImgPainel);
    btn.disabled = !temFoto;
}

/**
 * Pré-processa imagem com múltiplas estratégias e retorna array de imagens
 */
function _abOcrPreprocessarMulti(imgSrc) {
    return new Promise((resolve) => {
        const maxDim = 1400;
        const estrategias = [
            // 1. CLAHE + sharpening + binarizar (Otsu)
            function(img, canvas, ctx) {
                const dims = _calcularDimensoes(img.naturalWidth, img.naturalHeight, maxDim);
                canvas.width = dims.w; canvas.height = dims.h;
                ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, dims.w, dims.h);
                const d = ctx.getImageData(0, 0, dims.w, dims.h);
                _cinza(d.data); _clahe(d.data, dims.w, dims.h, 48, 2.5); _sharpening(d.data, dims.w, dims.h); _binarizar(d.data, false);
                ctx.putImageData(d, 0, 0);
                return canvas.toDataURL('image/jpeg', 0.92);
            },
            // 2. Mediana + CLAHE + sharpening (sem binarizar — para dígitos escuros)
            function(img, canvas, ctx) {
                const dims = _calcularDimensoes(img.naturalWidth, img.naturalHeight, maxDim);
                canvas.width = dims.w; canvas.height = dims.h;
                ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, dims.w, dims.h);
                const d = ctx.getImageData(0, 0, dims.w, dims.h);
                _cinza(d.data); _mediana(d.data, dims.w, dims.h, 1); _clahe(d.data, dims.w, dims.h, 64, 3); _sharpening(d.data, dims.w, dims.h);
                ctx.putImageData(d, 0, 0);
                return canvas.toDataURL('image/jpeg', 0.92);
            },
            // 3. Threshold adaptativo (Sauvola-like)
            function(img, canvas, ctx) {
                const dims = _calcularDimensoes(img.naturalWidth, img.naturalHeight, maxDim);
                canvas.width = dims.w; canvas.height = dims.h;
                ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, dims.w, dims.h);
                const d = ctx.getImageData(0, 0, dims.w, dims.h);
                _cinza(d.data); _mediana(d.data, dims.w, dims.h, 1); _thresholdAdaptativo(d.data, dims.w, dims.h);
                ctx.putImageData(d, 0, 0);
                return canvas.toDataURL('image/jpeg', 0.92);
            },
            // 4. Pipeline clássica: equalizar + stretch + sharpening + binarizar
            function(img, canvas, ctx) {
                const dims = _calcularDimensoes(img.naturalWidth, img.naturalHeight, maxDim);
                canvas.width = dims.w; canvas.height = dims.h;
                ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, dims.w, dims.h);
                const d = ctx.getImageData(0, 0, dims.w, dims.h);
                _cinza(d.data); _equalizar(d.data, dims.w, dims.h); _stretchContraste(d.data, dims.w, dims.h); _sharpening(d.data, dims.w, dims.h); _binarizar(d.data, false);
                ctx.putImageData(d, 0, 0);
                return canvas.toDataURL('image/jpeg', 0.92);
            },
        ];
        const img = new Image();
        const resultados = [];
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            for (const fn of estrategias) {
                try {
                    resultados.push(fn(img, canvas, ctx));
                } catch(e) { /* ignora */ }
            }
            // Fallback: original redimensionada
            try {
                const dims = _calcularDimensoes(img.naturalWidth, img.naturalHeight, 1200);
                canvas.width = dims.w; canvas.height = dims.h;
                ctx.drawImage(img, 0, 0, dims.w, dims.h);
                resultados.push(canvas.toDataURL('image/jpeg', 0.92));
            } catch(_) {}
            resolve(resultados);
        };
        img.onerror = function() { resolve([imgSrc]); };
        img.src = imgSrc;
    });
}

/**
 * Pré-processa imagem no canvas (estratégia única, legado)
 */
function _abOcrPreprocessar(imgSrc) {
    return new Promise((resolve) => {
        preprocessarImagemCanvas(imgSrc, resolve);
    });
}

/**
 * Executa Tesseract.js v5 offline com caminhos locais e suporte a múltiplos idiomas
 */
async function _abOcrExecutar(imgSrc, onProgress, ehPainel) {
    const worker = await _criarWorkerOCR(onProgress);
    const whitelist = _whitelistParaTipo(ehPainel);
    const modosPSM = ['6', '3', '4'];
    let melhorTexto = '';
    let melhorConf = 0;
    let ultimoResultado = '';

    for (const psm of modosPSM) {
        try {
            await worker.setParameters({
                tessedit_pageseg_mode: psm,
                tessedit_char_whitelist: whitelist,
            });
            const r = await worker.recognize(imgSrc);
            const txt = (r.data.text || '').trim();
            const conf = r.data.confidence || 0;
            ultimoResultado = txt;

            if (txt.length > melhorTexto.length && conf >= melhorConf) {
                melhorTexto = txt;
                melhorConf = conf;
            }
            if (txt.length > 15 && conf > 50) break;
        } catch (e) {
            console.warn(`[OCR-Modal] PSM ${psm} falhou:`, e.message);
        }
    }

    try { await worker.terminate(); } catch (_) {}
    return melhorTexto || ultimoResultado;
}

/**
 * Classifica o texto OCR e retorna o tipo de imagem
 */
function _abOcrClassificar(texto) {
    const t = texto.toLowerCase();
    const kwTerritory = ['ev-later', 'ev later', 'power ready', 'km/kwh', 'kwh', 'ev-later', 'e-later'];
    const kwRanger    = ['prndm', 'viagem 1', 'viagem1', 'segure ok', 'rpm/min'];
    const kwNota      = ['combustivel', 'combustível', 'diesel', 'gasolina', 'etanol',
                         'valor bruto', 'wizeo', 'cielo', 'posto', 'cnpj', 'condutor',
                         'placa', 'produto', 'litros', 'qtd', 'total :'];

    const scoreTerritory = kwTerritory.filter(k => t.includes(k)).length;
    const scoreRanger    = kwRanger.filter(k => t.includes(k)).length;
    const scoreNota      = kwNota.filter(k => t.includes(k)).length;

    const max = Math.max(scoreTerritory, scoreRanger, scoreNota);
    if (max === 0) return 'desconhecido';
    if (scoreTerritory >= scoreRanger && scoreTerritory === max) return 'painel_territory';
    if (scoreRanger === max) return 'painel_ranger';
    return 'nota_combustivel';
}

/**
 * Parser específico da NOTA DE COMBUSTÍVEL (Wizeo / Cielo / Linx)
 */
function _abOcrParsearNota(texto) {
    const t = texto.replace(/\n/g, ' ').replace(/\s+/g, ' ');

    // Data e hora: "13/07/2026 14:33:56"
    let data = null, hora = null;
    const mData = texto.match(/(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2}(?::\d{2})?)/);
    if (mData) { data = mData[1]; hora = mData[2]; }

    // Litros: vários formatos
    let litros = null;
    // 1. "35,970" ou "35.970" (2 dígitos + vírgula + 3 dígitos)
    const m35 = t.match(/\b(3[0-9])[.,](\d{3})\b/);
    if (m35) { const v = parseFloat(m35[1]+'.'+m35[2]); if (v > 10 && v < 200) litros = v; }
    // 2. "TD : 35,970" / "QTD : 35.97" / "EQTD : 35,970"
    if (!litros) {
        const mLit = t.match(/(?:td|qtd|eqtd|quantidade)\s*:?\s*(\d+[.,]\d{2,3})/i)
                  || t.match(/(\d+[.,]\d{3})\s*(?:litros?|l\b)/i);
        if (mLit) litros = parseFloat(mLit[1].replace(',', '.'));
    }
    // 3. Número perto de "DIESEL" ou "S10"
    if (!litros) {
        const mNear = t.match(/(?:diesel|s10|produto)[^]*?(\d+[.,]\d{2,3})/i);
        if (mNear) { const v = parseFloat(mNear[1].replace(',', '.')); if (v > 10 && v < 200) litros = v; }
    }
    // 4. "3557970" → 35.58 (conectado)
    if (!litros) {
        const mCon = t.match(/\b(3[0-9])\s*(\d{4,5})\b/);
        if (mCon) { const v = parseFloat(mCon[1]+'.'+mCon[2].slice(0,2)); if (v > 10 && v < 200) litros = v; }
    }

    // Valor total: "TOTAL : 280,20" / "VALOR BRUTO : 280,20"
    let total = null;
    const mTotal = t.match(/(?:total|valor\s*bruto)\s*:?\s*R?\$?\s*(\d+[.,]\d{2})/i);
    if (mTotal) total = parseFloat(mTotal[1].replace(',', '.'));

    // Preço/litro (calculado)
    let precoLitro = (litros && total && litros > 0)
        ? parseFloat((total / litros).toFixed(3)) : null;

    // Placa: "TIS0H31"
    let placa = null;
    const mPlaca = t.match(/placa\s*:?\s*([A-Z]{3}[\s-]?\d[A-Z0-9]\d{2})/i)
                || t.match(/\b([A-Z]{3}[\s-]?\d[A-Z0-9]\d{2})\b/);
    if (mPlaca) placa = mPlaca[1].replace(/\s/g, '').toUpperCase();

    // Veículo
    let veiculo = null;
    const mVeic = t.match(/veiculo\s*:?\s*([A-Z0-9\s\-]+?)(?:\s+-\s+[A-Z]{4}|\s+placa|\s+condutor|$)/i);
    if (mVeic) veiculo = mVeic[1].trim();

    // Condutor
    let condutor = null;
    const mCond = t.match(/condutor\s*:?\s*([A-Z]+)/i);
    if (mCond) condutor = mCond[1].trim();

    // Produto
    let produto = null;
    const mProd = t.match(/produto\s*:?\s*\d*\s*(diesel[^\r\n,]{0,20}|gasolina[^\r\n,]{0,20}|etanol[^\r\n,]{0,10})/i);
    if (mProd) produto = mProd[1].trim().toUpperCase();
    else if (/diesel/i.test(t)) produto = 'DIESEL S10';
    else if (/gasolina/i.test(t)) produto = 'GASOLINA';
    else if (/etanol/i.test(t)) produto = 'ETANOL';

    // Posto
    let posto = null;
    const mPosto = t.match(/(?:auto\s*)?posto\s+([A-Z\s]+?)(?:\s+km|\s+cnpj|\.)/i);
    if (mPosto) posto = mPosto[0].trim();

    // Saldo / LTD+
    let saldo = null;
    const mSaldo = t.match(/(?:saldo|ltd\+)\s*(?:dispon[ií]vel)?\s*(?:carro\s*ltd\+)?\s*R?\$?\s*([0-9\.,\s]+)/i);
    if (mSaldo) {
        saldo = mSaldo[1].trim().replace(/\s/g, '');
    }

    return { tipo: 'nota_combustivel', data, hora, litros, total, precoLitro, placa, veiculo, condutor, produto, posto, saldo };
}

/**
 * Parser específico do PAINEL TERRITORY (híbrido PHEV)
 */
function _abOcrParsearTerritory(texto) {
    const t = texto.replace(/\n/g, ' ').replace(/\s+/g, ' ');

    // Odômetro: "43935 km" ou "43.935 km" — pega o maior número de 5-6 dígitos
    let odometro = null;
    const todosOdo = [];
    const mOdo1 = [...t.matchAll(/(\d{4,6})\s*km\b/gi)];
    for (const m of mOdo1) {
        const v = parseInt(m[1]);
        if (v >= 10000 && v <= 999999) todosOdo.push(v);
    }
    if (todosOdo.length > 0) odometro = Math.max(...todosOdo);
    if (!odometro) {
        const mOdo2 = t.match(/(\d{3,3}[.,]\d{3})\s*km/i);
        if (mOdo2) {
            let v = mOdo2[1].replace(',', '.');
            if ((v.match(/\./g)||[]).length > 1) v = v.replace(/\./g,'');
            odometro = parseFloat(v);
        }
    }

    // Consumo km/l: "8.5 km/l" ou "8,5 km/l"
    let consumo = null;
    const mCons = t.match(/(\d{1,2}[.,]\d)\s*km\/l/i);
    if (mCons) consumo = parseFloat(mCons[1].replace(',', '.'));

    // Consumo elétrico: "3.4 km/kWh" ou "34 km/kWh" (OCR sem ponto)
    let consumoEV = null;
    const mEV = t.match(/(\d{1,2})\s*km\/?\s*kwh/i);
    if (mEV) {
        let v = parseInt(mEV[1]);
        if (v > 10) v = v / 10; // "34 km/kWh" → 3.4
        if (v > 0.5 && v < 20) consumoEV = v;
    }

    // Temperatura: "14°C"
    let temp = null;
    const mTemp = t.match(/(\d{1,2})\s*°?\s*c\b/i);
    if (mTemp) temp = parseInt(mTemp[1]);

    // Distância viagem (Trip): "294.5 km" — ignora "ER 247 km" (autonomia)
    let distancia = null;
    // Remove trechos de autonomia
    const tSemAut = t.replace(/(?:er|autonomia|range)\s*:?\s*\d+\s*km/gi, '');
    const mDist = tSemAut.match(/(\d{1,4}[.,]\d)\s*km(?!\s*\/)/i)
               || tSemAut.match(/(?:^|\s)(\d{2,3})\s*k\s*m?/i);
    if (mDist) {
        const v = parseFloat(mDist[1].replace(',', '.'));
        if (v > 10 && v < 5000 && v !== odometro) distancia = v;
    }

    // Autonomia EV: "247 km" após "ER" ou "autonomia"
    let autonomiaEV = null;
    const mAutEV = t.match(/(?:er|autonomia)\s*:?\s*(\d{2,3})\s*km/i);
    if (mAutEV) autonomiaEV = parseInt(mAutEV[1]);

    // Câmbio
    let cambio = /\bP\b/.test(t) ? 'P' : /\bD\b/.test(t) ? 'D' : /\bR\b/.test(t) ? 'R' : null;

    // Modo
    let modo = /NORMAL/i.test(t) ? 'NORMAL' : /ECO/i.test(t) ? 'ECO' : /SPORT/i.test(t) ? 'SPORT' : null;

    return { tipo: 'painel_territory', odometro, consumo, consumoEV, temp, distancia, autonomiaEV, cambio, modo };
}

/**
 * Parser específico do PAINEL RANGER
 */
function _abOcrParsearRanger(texto) {
    const t = texto.replace(/\n/g, ' ').replace(/\s+/g, ' ');

    // Odômetro: "2835.7" ou "2835,7"
    let odometro = null;
    const mOdo = t.match(/(\d{3,6}[.,]\d{1,2})\s*(?:km|$)/i) || t.match(/(\d{4,6})\s*km\b/i);
    if (mOdo) odometro = parseFloat(mOdo[1].replace(',', '.'));

    // Temperatura: "32°" ou "32 C"
    let temp = null;
    const mTemp = t.match(/(\d{1,2})\s*°?\s*c?\b/i);
    if (mTemp) temp = parseInt(mTemp[1]);

    // Consumo: "8.4" (km/l)
    let consumo = null;
    const mCons = t.match(/(\d{1,2}[.,]\d)\s*km\/l/i) || t.match(/(\d[.,]\d)\s*(?:km\/l|km\/1)/i);
    if (mCons) consumo = parseFloat(mCons[1].replace(',', '.'));

    // Autonomia: "166 km"
    let autonomia = null;
    const mAut = t.match(/(\d{2,3})\s*km(?:\s|$)/i);
    if (mAut) autonomia = parseInt(mAut[1]);

    // Distância viagem (Trip): "444.2 km"
    let distancia = null;
    const mDist = t.match(/(\d{1,4}[.,]\d)\s*km(?!\s*\/)/i);
    if (mDist) distancia = parseFloat(mDist[1].replace(',', '.'));

    // Câmbio
    let cambio = /\bP\b/.test(t) ? 'P' : /\bD\b/.test(t) ? 'D' : /\bR\b/.test(t) ? 'R' : null;

    return { tipo: 'painel_ranger', odometro, temp, consumo, autonomia, distancia, cambio };
}

/**
 * Preenche os campos do modal de abastecimento com os dados extraídos
 */
function _abOcrPreencherCampos(dados) {
    if (!dados) return;

    const setVal = (id, val) => {
        if (val == null || val === '') return;
        const el = document.getElementById(id);
        if (el) el.value = val;
    };

    if (dados.tipo === 'nota_combustivel') {
        if (dados.litros) setVal('ab-litros', dados.litros);
        if (dados.total) setVal('ab-valor', dados.total);
        if (dados.saldo) setVal('ab-saldo', dados.saldo);
        
        // Preencher posto via select ou criar nova opção dinâmica
        if (dados.posto) {
            const postoSel = document.getElementById('ab-posto');
            if (postoSel) {
                let matched = false;
                for (const opt of postoSel.options) {
                    if (opt.value && dados.posto.toLowerCase().includes(opt.value.toLowerCase())) {
                        postoSel.value = opt.value;
                        matched = true;
                        break;
                    }
                }
                if (!matched) {
                    const opt = document.createElement('option');
                    opt.value = dados.posto;
                    opt.textContent = dados.posto;
                    postoSel.appendChild(opt);
                    postoSel.value = dados.posto;
                }
            }
        }
        
        // Detectar combustível
        if (dados.produto) {
            const combSel = document.getElementById('ab-combustivel');
            if (combSel) {
                const prod = dados.produto.toUpperCase();
                if (prod.includes('DIESEL')) combSel.value = 'Diesel';
                else if (prod.includes('GASOLINA')) combSel.value = 'Gasolina';
                else if (prod.includes('ETANOL') || prod.includes('E100')) combSel.value = 'E100';
            }
        }
    }

    if (dados.tipo === 'painel_ranger' || dados.tipo === 'painel_territory') {
        if (dados.odometro) setVal('ab-km', dados.odometro);
        if (dados.distancia) setVal('ab-trip', dados.distancia);
    }

    // Calcula km/L se aplicável
    if (typeof abCalcKml === 'function') {
        abCalcKml();
    }
}

/**
 * Formata os campos extraídos para exibição no resultado
 */
function _abOcrFormatarResultado(dados) {
    if (!dados) return '';
    const linhas = [];

    const add = (label, val, unidade) => {
        if (val != null && val !== '') linhas.push(`<b>${label}:</b> ${val}${unidade||''}`);
    };

    if (dados.tipo === 'nota_combustivel') {
        add('📅 Data', dados.data);
        add('⏰ Hora', dados.hora);
        add('🚛 Veículo', dados.veiculo);
        add('🔢 Placa', dados.placa);
        add('👤 Condutor', dados.condutor);
        add('⛽ Produto', dados.produto);
        add('🪣 Litros', dados.litros ? dados.litros.toFixed(3) : null, ' L');
        add('💰 Total', dados.total ? 'R$ ' + dados.total.toFixed(2) : null);
        add('💵 Preço/L', dados.precoLitro ? 'R$ ' + dados.precoLitro.toFixed(3) : null);
        add('🏪 Posto', dados.posto);
    } else if (dados.tipo === 'painel_territory') {
        add('🔢 Odômetro', dados.odometro ? dados.odometro.toLocaleString('pt-BR') : null, ' km');
        add('⛽ Consumo', dados.consumo, ' km/L');
        add('⚡ Consumo EV', dados.consumoEV, ' km/kWh');
        add('🔋 Autonomia EV', dados.autonomiaEV, ' km');
        add('🌡️ Temperatura', dados.temp, '°C');
        add('📏 Distância Viagem', dados.distancia, ' km');
        add('⚙️ Câmbio', dados.cambio);
        add('🚗 Modo', dados.modo);
    } else if (dados.tipo === 'painel_ranger') {
        add('🔢 Odômetro', dados.odometro ? dados.odometro.toLocaleString('pt-BR') : null, ' km');
        add('⛽ Consumo', dados.consumo, ' km/L');
        add('⛽ Autonomia', dados.autonomia, ' km');
        add('📏 Distância Viagem', dados.distancia, ' km');
        add('🌡️ Temperatura', dados.temp, '°C');
        add('⚙️ Câmbio', dados.cambio);
    }

    return linhas.join('<br>');
}

/**
 * Salva dados OCR no localStorage para dataset de ML
 */
function _abOcrSalvarDataset(dados, textoRaw, tipo) {
    try {
        const dataset = JSON.parse(localStorage.getItem('vev_ocr_dataset') || '[]');
        dataset.push({
            id: Date.now().toString(36),
            timestamp: new Date().toISOString(),
            tipo,
            dados,
            ocr_raw: textoRaw.substring(0, 1000) // limita para não estourar localStorage
        });
        localStorage.setItem('vev_ocr_dataset', JSON.stringify(dataset));
        console.log(`[OCR Dataset] Registro salvo. Total: ${dataset.length}`);
    } catch (e) {
        console.warn('[OCR Dataset] Falha ao salvar:', e);
    }
}

/**
 * FUNÇÃO PRINCIPAL: processa as fotos com Tesseract.js offline
 * e preenche os campos do modal de abastecimento
 */
window.abOcrProcessar = async function() {
    if (!_abOcrImgNota && !_abOcrImgPainel) return;

    const btnOcr       = document.getElementById('ab-btn-ocr');
    const loadingDiv   = document.getElementById('ab-ocr-loading');
    const loadingText  = document.getElementById('ab-ocr-loading-text');
    const progressBar  = document.getElementById('ab-ocr-progress');
    const resultadoDiv = document.getElementById('ab-ocr-resultado');
    const tipoLabel    = document.getElementById('ab-ocr-tipo-label');
    const camposDiv    = document.getElementById('ab-ocr-campos');

    // Esconde resultado anterior
    if (resultadoDiv) resultadoDiv.style.display = 'none';
    if (btnOcr) btnOcr.disabled = true;
    if (loadingDiv) loadingDiv.style.display = 'block';
    if (progressBar) progressBar.style.width = '0%';

    const tiposProcessados = [];
    const camposExtraidos  = [];

    try {
        // ── 1. Processar NOTA ──────────────────────────────────────────────
        if (_abOcrImgNota) {
            if (loadingText) loadingText.textContent = 'Otimizando foto da nota (3 estratégias)...';
            if (progressBar) progressBar.style.width = '5%';

            const imagensProcessadas = await _abOcrPreprocessarMulti(_abOcrImgNota);
            const textosNota = [];

            for (let i = 0; i < imagensProcessadas.length; i++) {
                if (loadingText) loadingText.textContent = `Lendo nota (OCR #${i+1})...`;
                const txt = await _abOcrExecutar(imagensProcessadas[i], (prog) => {
                    if (progressBar) progressBar.style.width = Math.round(5 + (i + prog) * 15) + '%';
                }, false);
                if (txt.trim().length > 5) textosNota.push(txt.trim());
            }

            // Mescla linhas únicas de todos os OCRs
            const linhasVistas = new Set();
            const partes = [];
            textosNota.sort((a,b) => b.length - a.length);
            for (const txt of textosNota) {
                for (const linha of txt.split('\n')) {
                    const chave = linha.trim().replace(/\s+/g,' ').toLowerCase();
                    if (chave && !linhasVistas.has(chave)) {
                        linhasVistas.add(chave);
                        partes.push(linha);
                    }
                }
            }
            const textoNota = partes.join('\n');

            console.log('[OCR] Texto nota mesclado:', textoNota);
            const tipoNota = _abOcrClassificar(textoNota);
            const dadosNota = _abOcrParsearNota(textoNota);
            _abOcrPreencherCampos(dadosNota);
            _abOcrSalvarDataset(dadosNota, textoNota, tipoNota);

            tiposProcessados.push('⛽ Nota Wizeo');
            camposExtraidos.push(_abOcrFormatarResultado(dadosNota));
        }

        // ── 2. Processar PAINEL ────────────────────────────────────────────
        if (_abOcrImgPainel) {
            const startProgress = _abOcrImgNota ? 50 : 5;
            if (loadingText) loadingText.textContent = 'Otimizando foto do painel (3 estratégias)...';
            if (progressBar) progressBar.style.width = startProgress + '%';

            const imagensProcessadas = await _abOcrPreprocessarMulti(_abOcrImgPainel);
            const textosPainel = [];

            for (let i = 0; i < imagensProcessadas.length; i++) {
                if (loadingText) loadingText.textContent = `Lendo painel (OCR #${i+1})...`;
                const txt = await _abOcrExecutar(imagensProcessadas[i], (prog) => {
                    const perc = Math.round(startProgress + (i + prog) * (95 - startProgress) / imagensProcessadas.length);
                    if (progressBar) progressBar.style.width = perc + '%';
                }, true);
                if (txt.trim().length > 3) textosPainel.push(txt.trim());
            }

            // Mescla linhas únicas
            const linhasVistas = new Set();
            const partes = [];
            textosPainel.sort((a,b) => b.length - a.length);
            for (const txt of textosPainel) {
                for (const linha of txt.split('\n')) {
                    const chave = linha.trim().replace(/\s+/g,' ').toLowerCase();
                    if (chave && !linhasVistas.has(chave)) {
                        linhasVistas.add(chave);
                        partes.push(linha);
                    }
                }
            }
            const textoPainel = partes.join('\n');

            console.log('[OCR] Texto painel mesclado:', textoPainel);
            const tipoPainel = _abOcrClassificar(textoPainel);
            let dadosPainel;
            if (tipoPainel === 'painel_territory') {
                dadosPainel = _abOcrParsearTerritory(textoPainel);
            } else {
                dadosPainel = _abOcrParsearRanger(textoPainel);
            }
            _abOcrPreencherCampos(dadosPainel);
            _abOcrSalvarDataset(dadosPainel, textoPainel, tipoPainel);

            const tipoLabel_ = tipoPainel === 'painel_territory' ? '🚗 Territory' : '🛻 Ranger';
            tiposProcessados.push(tipoLabel_);
            camposExtraidos.push(_abOcrFormatarResultado(dadosPainel));
        }

        // ── Exibir resultado ───────────────────────────────────────────────
        if (progressBar) progressBar.style.width = '100%';
        if (loadingDiv) loadingDiv.style.display = 'none';

        if (tipoLabel)    tipoLabel.textContent = tiposProcessados.join(' + ') + ' · dados preenchidos';
        if (camposDiv)    camposDiv.innerHTML = camposExtraidos.join('<hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:8px 0;">');
        if (resultadoDiv) resultadoDiv.style.display = 'block';

        // Reabilita botão
        if (btnOcr) btnOcr.disabled = false;

        if (typeof VEVAlert !== 'undefined') {
            VEVAlert.toast('Dados extraídos com sucesso!', 'success');
        }

    } catch (err) {
        console.error('[OCR] Erro:', err);
        if (loadingDiv) loadingDiv.style.display = 'none';
        if (btnOcr) btnOcr.disabled = false;

        if (resultadoDiv) {
            resultadoDiv.style.display = 'block';
            resultadoDiv.style.borderColor = 'rgba(255,82,82,0.4)';
            resultadoDiv.style.background = 'rgba(255,82,82,0.06)';
        }
        if (tipoLabel) { tipoLabel.style.color = '#ff8a80'; tipoLabel.textContent = '❌ Erro ao ler imagem'; }
        if (camposDiv) camposDiv.innerHTML = `<span style="color:rgba(255,200,200,0.7)">${err.message || 'Tente uma foto com mais iluminação.'}</span>`;
    }
};

/**
 * Exporta o dataset OCR salvo no localStorage como JSON
 */
window.abOcrExportarDataset = function() {
    try {
        const dataset = JSON.parse(localStorage.getItem('vev_ocr_dataset') || '[]');
        if (dataset.length === 0) {
            alert('Nenhum dado OCR salvo ainda.');
            return;
        }
        const blob = new Blob([JSON.stringify(dataset, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vev_ocr_dataset_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch(e) {
        alert('Erro ao exportar dataset: ' + e.message);
    }
};
