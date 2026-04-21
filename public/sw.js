// Golf With Friends — Service Worker
const CACHE_NAME = "golf-v1";
const STATIC_ASSETS = ["/", "/index.html", "/manifest.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

self.addEventListener("push", (e) => {
  const data = e.data?.json() ?? {};
  const title = data.title ?? "Golf With Friends";
  const options = {
    body: data.body ?? "Someone wants to play!",
    icon: "/icon-192.png",
    badge: "/badge-72.png",
    tag: data.tag ?? "golf-invite",
    renotify: true,
    vibrate: [200, 100, 200],
    data: { url: data.url ?? "/" },
    actions: [
      { action: "view", title: "View Request" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  if (e.action === "dismiss") return;
  const target = e.notification.data?.url ?? "/";
  e.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin)) {
            client.focus();
            client.navigate(target);
            return;
          }
        }
        return clients.openWindow(target);
      })
  );
});
