import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { NetworkFirst, CacheFirst } from "workbox-strategies";

// Injected by vite-plugin-pwa at build time
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Navigation: network-first, fall back to cached index for offline SPA routing
registerRoute(
  new NavigationRoute(new NetworkFirst({ cacheName: "feedbolt-navigation" })),
);

// Static assets: cache-first
registerRoute(
  ({ request }) =>
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "image",
  new CacheFirst({ cacheName: "feedbolt-assets" }),
);

self.skipWaiting();
self.clients.claim();

// ── Push notifications ────────────────────────────────────────────────────
self.addEventListener("message", (e) => {
  if (e.data?.type !== "SHOW_NOTIFICATION") return;
  const { title, body, url } = e.data;
  self.registration.showNotification(title, {
    body,
    icon: "/FeedBolt.jpg",
    badge: "/FeedBolt.jpg",
    data: { url },
    vibrate: [100, 50, 100],
  });
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = e.notification.data?.url ?? "/notifications";
  e.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        const existing = list.find((c) => c.url.includes(self.location.origin));
        if (existing) {
          existing.focus();
          existing.navigate(url);
        } else {
          clients.openWindow(url);
        }
      }),
  );
});
