// Щоб випустити оновлення: зміни номер версії нижче і завантаж файли заново.
const VERSION = "2.0";
const CACHE = "korovai-" + VERSION;
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
});
self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith("korovai-") && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener("message", e => { if (e.data === "skipWaiting") self.skipWaiting(); });

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Шрифти Google: беремо з кешу, а якщо немає — з мережі і кешуємо на майбутнє.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.open(CACHE).then(async c => {
      const hit = await c.match(req); if (hit) return hit;
      try { const res = await fetch(req); c.put(req, res.clone()); return res; } catch (_) { return new Response("", {status: 504}); }
    }));
    return;
  }
  if (url.origin !== location.origin) return;
  // Сторінки та файли застосунку: спершу кеш (працює офлайн).
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(req, {ignoreSearch: true}) || (req.mode === "navigate" ? await c.match("./index.html") : null);
    if (hit) return hit;
    try { const res = await fetch(req); if (res.ok) c.put(req, res.clone()); return res; }
    catch (_) { return (await c.match("./index.html")) || new Response("Офлайн", {status: 503}); }
  })());
});
