const CACHE_NAME = 'ford-vev-cache-v10'
const OFFLINE_URL = './offline.html'

const PRECACHE_ASSETS = [
    './',
    './index.html',
    './offline.html',
    './app.js',
    './auth-security.js',
    './laudo-ia.js',
    './turno-engine.js',
    './dados-mestres.js',
    './forms-engine.js',
    './forms-data.js',
    './analytics.js',
    './notificacoes-engine.js',
    './vev-improvements.js',
    './style.css',
    './ford_logo_icon_145825.png',
    './entrada-ford.jpg',
    './manifest.json',
]

self.addEventListener('install', (event) => {
    self.skipWaiting()
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_ASSETS)
        })
    )
})

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keyList) => {
                return Promise.all(
                    keyList.map((key) => {
                        if (key !== CACHE_NAME) {
                            return caches.delete(key)
                        }
                    })
                )
            })
            .then(() => self.clients.claim())
    )
})

const ALLOWED_CROSS_ORIGIN_DOMAINS = [
    'www.gstatic.com',
    'cdnjs.cloudflare.com',
    'cdn.jsdelivr.net',
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'unpkg.com',
]

self.addEventListener('fetch', (event) => {
    const { request } = event
    const url = new URL(request.url)

    const isSameOrigin = url.origin.startsWith(self.location.origin)
    const isAllowedCrossOrigin = ALLOWED_CROSS_ORIGIN_DOMAINS.some(
        (domain) => url.hostname === domain
    )

    if (!isSameOrigin && !isAllowedCrossOrigin) return

    if (request.mode === 'navigate') {
        event.respondWith(networkFirstWithFallback(request))
        return
    }

    if (url.pathname.startsWith('/assets/')) {
        event.respondWith(cacheFirst(request))
        return
    }

    event.respondWith(networkFirstWithFallback(request))
})

async function cacheFirst(request) {
    const cached = await caches.match(request)
    if (cached) return cached
    try {
        const response = await fetch(request)
        if (response.status === 200 || response.type === 'opaque' || response.ok) {
            const cache = await caches.open(CACHE_NAME)
            cache.put(request, response.clone())
        }
        return response
    } catch {
        return caches.match(OFFLINE_URL)
    }
}

async function networkFirstWithFallback(request) {
    try {
        const response = await fetch(request)
        if (response.status === 200 || response.type === 'opaque' || response.ok) {
            const cache = await caches.open(CACHE_NAME)
            cache.put(request, response.clone())
        }
        return response
    } catch {
        const cached = await caches.match(request)
        if (cached) return cached
        if (request.mode === 'navigate') {
            return caches.match(OFFLINE_URL)
        }
        return new Response('Offline', { status: 503 })
    }
}
