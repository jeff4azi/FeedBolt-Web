const CACHE = "feedbolt-v1";

// Assets to pre-cache on install
const PRECACHE = ["/", "/feed", "/manifest.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  // Only handle GET requests
  if (e.request.method !== "GET") return;

  const url = new URL(e.request.url);

  // For navigation requests (HTML), use network-first so fresh content loads,
  // fall back to cached index.html for offline SPA routing
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).catch(() => caches.match("/")));
    return;
  }

  // For Supabase / Cloudinary API calls — network only, no caching
  if (
    url.hostname.includes("supabase") ||
    url.hostname.includes("cloudinary")
  ) {
    return;
  }

  // For static assets — cache first, then network
  e.respondWith(
    caches.match(e.request).then(
      (cached) =>
        cached ??
        fetch(e.request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
          }
          return res;
        }),
    ),
  );
});
