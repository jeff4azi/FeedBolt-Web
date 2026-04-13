// ── Push notifications ────────────────────────────────────────────────────
self.addEventListener("push", (e) => {
  const data = e.data?.json() ?? {};
  const { title = "FeedBolt", body = "", url = "/notifications" } = data;
  e.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/FeedBolt.jpg",
      badge: "/FeedBolt.jpg",
      data: { url },
      vibrate: [100, 50, 100],
    }),
  );
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
