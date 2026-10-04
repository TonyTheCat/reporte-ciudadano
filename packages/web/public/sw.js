// Service worker: assets con cache-first, páginas con network-first y fallback offline.
const VERSION = "rc-v2";
const OFFLINE_URLS = ["/reportar", "/mis-reportes", "/icon.svg", "/manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(OFFLINE_URLS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/") || url.pathname.startsWith("/admin")) return;

  if (url.pathname.startsWith("/_astro/") || url.pathname.startsWith("/media/") || /\.(png|svg|webmanifest)$/.test(url.pathname)) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) caches.open(VERSION).then((c) => c.put(req, res.clone()));
      return res;
    })));
    return;
  }

  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then((res) => {
      if (res.ok && OFFLINE_URLS.includes(url.pathname)) caches.open(VERSION).then((c) => c.put(req, res.clone()));
      return res;
    }).catch(() => caches.match(req).then((hit) => hit || caches.match("/reportar"))));
  }
});
