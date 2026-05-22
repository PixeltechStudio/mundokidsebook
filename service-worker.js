/* ============================================================
   SERVICE WORKER — Mundo Encantado dos Livros
   Estratégia: Cache-First para assets estáticos,
               Network-First para dados dinâmicos
   ============================================================ */

const CACHE_NAME = 'mundo-livros-v1';
const STATIC_CACHE = 'mundo-livros-static-v1';
const DYNAMIC_CACHE = 'mundo-livros-dynamic-v1';

// Assets que serão cacheados imediatamente na instalação
const STATIC_ASSETS = [
  './index.html',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  // Fontes do Google (serão cacheadas dinamicamente na primeira visita)
];

// Domínios externos sempre buscados da rede
const NETWORK_ONLY_DOMAINS = [
  'backendless.com',
  'api.backendless.com',
];

// ── INSTALL ──────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Cacheando assets estáticos');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Falha ao cachear alguns assets:', err);
      });
    })
  );
  self.skipWaiting();
});

// ── ACTIVATE ─────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativado — limpando caches antigos');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== DYNAMIC_CACHE)
          .map((k) => {
            console.log('[SW] Removendo cache antigo:', k);
            return caches.delete(k);
          })
      )
    )
  );
  self.clients.claim();
});

// ── FETCH ─────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requests não-GET
  if (request.method !== 'GET') return;

  // Ignorar extensões do Chrome e URLs especiais
  if (url.protocol === 'chrome-extension:' || url.protocol === 'moz-extension:') return;

  // NETWORK-ONLY: APIs do Backendless e outros domínios dinâmicos
  if (NETWORK_ONLY_DOMAINS.some((d) => url.hostname.includes(d))) {
    event.respondWith(fetch(request));
    return;
  }

  // CACHE-FIRST: Fontes do Google
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(request, DYNAMIC_CACHE));
    return;
  }

  // CACHE-FIRST: Assets estáticos locais (CSS, JS, imagens, ícones)
  if (
    url.pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf)$/)
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // NETWORK-FIRST com fallback para cache: HTML e demais
  event.respondWith(networkFirst(request));
});

// ── ESTRATÉGIAS ───────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    console.warn('[SW] Cache-first falhou:', request.url, err);
    return new Response('Offline — recurso indisponível', { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;

    // Fallback: retorna a index.html para navegação SPA
    if (request.mode === 'navigate') {
      const fallback = await caches.match('./index.html');
      if (fallback) return fallback;
    }

    return new Response(offlinePage(), {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

// ── PÁGINA OFFLINE ────────────────────────────────────────────
function offlinePage() {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Mundo Encantado — Offline</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{
      font-family:'Nunito',sans-serif;
      background:#0f0520;color:#e9d5ff;
      display:flex;flex-direction:column;
      align-items:center;justify-content:center;
      min-height:100vh;text-align:center;padding:24px;
    }
    .emoji{font-size:4rem;margin-bottom:16px;animation:bounce 2s infinite}
    h1{font-size:1.5rem;color:#fbbf24;margin-bottom:8px}
    p{color:#a78bba;font-size:0.95rem;max-width:320px;line-height:1.6}
    button{
      margin-top:24px;padding:12px 28px;
      background:linear-gradient(135deg,#9333ea,#ec4899);
      color:#fff;border:none;border-radius:50px;
      font-size:1rem;font-weight:700;cursor:pointer;
    }
    @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
  </style>
</head>
<body>
  <div class="emoji">📚</div>
  <h1>Você está offline</h1>
  <p>Parece que não há conexão com a internet agora. Verifique seu Wi-Fi ou dados móveis e tente novamente.</p>
  <button onclick="location.reload()">Tentar novamente</button>
</body>
</html>`;
}

// ── PUSH NOTIFICATIONS (preparado para uso futuro) ────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  self.registration.showNotification(data.title || 'Mundo Encantado', {
    body: data.body || 'Você tem uma novidade!',
    icon: './icons/icon-192x192.png',
    badge: './icons/icon-72x72.png',
    tag: 'mundo-livros-notif',
    renotify: true,
    data: { url: data.url || './' },
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || './';
  event.waitUntil(clients.openWindow(target));
});
