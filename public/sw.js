const CACHE = "coachcore-v1";

const PRECACHE = [
  "/",
  "/offline",
  "/phosphor/regular/style.css",
  "/phosphor/fill/style.css",
  "/phosphor/bold/style.css",
  "/phosphor/regular/Phosphor.woff2",
  "/phosphor/fill/Phosphor-Fill.woff2",
  "/phosphor/bold/Phosphor-Bold.woff2",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Ignorar peticiones no-GET y requests a otros orígenes (auth, API externa)
  if (request.method !== "GET" || url.origin !== location.origin) return;

  // API routes: siempre red, sin cache
  if (url.pathname.startsWith("/api/")) return;

  // Assets estáticos (_next/static, fonts, iconos): cache-first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/phosphor/") ||
    url.pathname.match(/\.(png|svg|ico|woff2|woff|ttf)$/)
  ) {
    e.respondWith(
      caches.match(request).then(
        (cached) => cached ?? fetch(request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(request, clone));
          }
          return res;
        })
      )
    );
    return;
  }

  // Navegación: network-first, fallback a cache, luego /offline
  if (request.mode === "navigate") {
    e.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(request, clone));
          }
          return res;
        })
        .catch(() =>
          caches.match(request).then(
            (cached) => cached ?? caches.match("/offline") ?? Response.error()
          )
        )
    );
    return;
  }
});
