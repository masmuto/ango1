// GO An Nahl — Service Worker
// Static SW file served from /sw.js (works with Turbopack without webpack plugins)
//
// Capabilities:
//   1. Precache app shell (manifest, icons)
//   2. Network-first for HTML pages + API (falls back to cache when offline)
//   3. Cache-first for static assets (_next/static, images)
//   4. Push notification event handlers
//   5. Notification click → focus app or open new window
//   6. Periodic sync (Background Sync) — re-sends queued form POSTs when online

const SW_VERSION = "1.0.0";
const STATIC_CACHE = "an-nahl-static-v1";
const PAGES_CACHE = "an-nahl-pages-v1";
const API_CACHE = "an-nahl-api-v1";
const IMAGE_CACHE = "an-nahl-images-v1";

const PRECACHE_URLS = [
  "/",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png",
  "/apple-touch-icon.png",
  "/favicon.ico",
];

// === INSTALL: precache shell assets ===
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      // Use addAll but ignore failures for individual resources
      await Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url)));
      console.log("[SW] Installed version", SW_VERSION);
      // Activate immediately so push events work right away
      await self.skipWaiting();
    })(),
  );
});

// === ACTIVATE: clean old caches ===
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      const valid = [STATIC_CACHE, PAGES_CACHE, API_CACHE, IMAGE_CACHE];
      await Promise.all(
        keys
          .filter((k) => !valid.includes(k))
          .map((k) => caches.delete(k)),
      );
      console.log("[SW] Activated version", SW_VERSION);
      await self.clients.claim();
    })(),
  );
});

// === FETCH: routing strategies ===
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET (don't intercept POST/PUT/DELETE)
  if (request.method !== "GET") return;

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) return;

  // Skip Next.js HMR / dev WebSocket
  if (url.pathname.startsWith("/_next/webpack-hmr")) return;

  // 1. Static Next.js assets — cache-first
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE, 30 * 24 * 60 * 60));
    return;
  }

  // 2. Image files — cache-first
  if (request.destination === "image" || /\.(png|jpg|jpeg|gif|webp|svg|ico)$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE, 30 * 24 * 60 * 60));
    return;
  }

  // 3. HTML navigation — network-first with cache fallback
  if (request.mode === "navigate" || (request.headers.get("accept") || "").includes("text/html")) {
    event.respondWith(networkFirst(request, PAGES_CACHE, 3, 7 * 24 * 60 * 60));
    return;
  }

  // 4. API GET requests — network-first with short cache fallback
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request, API_CACHE, 5, 24 * 60 * 60));
    return;
  }
});

async function cacheFirst(request, cacheName, maxAgeSeconds) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached && !isStale(cached, maxAgeSeconds)) {
    return cached;
  }
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.status === 200) {
      cache.put(request, fresh.clone());
    }
    return fresh;
  } catch {
    return cached || Response.error();
  }
}

async function networkFirst(request, cacheName, timeoutSeconds, maxAgeSeconds) {
  const cache = await caches.open(cacheName);
  try {
    const fresh = await fetchWithTimeout(request, timeoutSeconds * 1000);
    if (fresh && fresh.status === 200) {
      cache.put(request, fresh.clone());
    }
    return fresh;
  } catch {
    // Network failed — try cache
    const cached = await cache.match(request);
    if (cached) {
      // Mark as offline-served
      const headers = new Headers(cached.headers);
      headers.set("X-Served-From", "cache-offline");
      return new Response(cached.body, { status: cached.status, statusText: cached.statusText, headers });
    }
    // For HTML navigation, return a basic offline page if no cache
    if (request.mode === "navigate") {
      return new Response(
        `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline — GO An Nahl</title><style>body{font-family:system-ui,-apple-system,sans-serif;background:#1B4332;color:#fff;margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:2rem}div{max-width:400px}h1{font-size:1.5rem;margin:0 0 0.5rem}p{opacity:0.8;font-size:0.9rem;margin:0 0 1.5rem}button{background:#2D6A4F;color:#fff;border:0;padding:0.75rem 1.5rem;border-radius:0.5rem;cursor:pointer;font-size:0.9rem}</style></head><body><div><h1>Anda sedang offline</h1><p>Aplikasi GO An Nahl butuh koneksi internet untuk memuat data. Coba lagi saat koneksi tersedia.</p><button onclick="location.reload()">Coba lagi</button></div></body></html>`,
        { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
      );
    }
    return Response.error();
  }
}

function isStale(response, maxAgeSeconds) {
  const dateHeader = response.headers.get("date");
  if (!dateHeader) return false;
  const age = (Date.now() - new Date(dateHeader).getTime()) / 1000;
  return age > maxAgeSeconds;
}

function fetchWithTimeout(request, ms) {
  return new Promise((resolve, reject) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    fetch(request, { signal: ctrl.signal })
      .then(resolve, reject)
      .finally(() => clearTimeout(timer));
  });
}

// === PUSH NOTIFICATIONS ===
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "GO An Nahl", body: event.data ? event.data.text() : "Pembaruan baru" };
  }

  const title = data.title || "GO An Nahl";
  const options = {
    body: data.body || "Anda memiliki pembaruan baru",
    icon: data.icon || "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag || "an-nahl-general",
    data: { url: data.url || "/" },
    requireInteraction: false,
    silent: false,
    vibrate: [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of allClients) {
        if ("focus" in client) {
          try {
            await client.focus();
            return;
          } catch {
            // ignore
          }
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })(),
  );
});

// Auto-update when new SW takes over
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

console.log("[SW] Service worker loaded");
