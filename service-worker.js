const CACHE_NAME = 'frota-offline-page-v6'; // Incrementado para v6 para forçar a atualização geral
const OFFLINE_URL = './offline.html';

// Lista de ativos essenciais para o funcionamento COMPLETO do app sem internet na pista
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './auth-security.js',
  './laudo-ia.js',
  './turno-engine.js',
  './manifest.json',
  './ford_logo_icon_145825.png',
  OFFLINE_URL
];

// 1. Instalação: Cria o cache e guarda TODOS os arquivos necessários para rodar offline
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Ativa o Service Worker imediatamente
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Cacheando infraestrutura e motores lógicos para operação offline');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. Ativação: Varre e deleta caches antigos, evitando conflito de versões
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Removendo cache antigo:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Interceptação Dinâmica: Tenta buscar pela rede -> Se falhar (Pista sem sinal), entrega o Cache offline
self.addEventListener('fetch', (event) => {
  // Ignora requisições de APIs externas (como Firebase ou endpoints de IA) para não quebrar o fluxo de rede
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Se a rede estiver funcionando, entrega a resposta em tempo real
        return response;
      })
      .catch(() => {
        // Se o analista ficar sem internet, o SW busca o arquivo correspondente direto no cache local
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Se o usuário tentar recarregar a página principal e falhar por completo, entrega o offline de segurança
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
        });
      })
  );
});