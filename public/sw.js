const BASE = self.registration.scope;
const PREFIX = `rare-adventures:${BASE}:`;
const CACHE = `${PREFIX}v3`;
const SHELL = ["", "manifest.webmanifest", "rare-friends.svg"].map(path => new URL(path, BASE).href);

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)),
  )).then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || !url.href.startsWith(BASE)) return;

  const response = fetch(event.request);
  event.waitUntil(response.then(async result => {
    if (result.ok) {
      const copy = result.clone();
      const cache = await caches.open(CACHE);
      await cache.put(event.request, copy);
    }
  }).catch(() => {}));
  event.respondWith(response.catch(async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(event.request);
    if (cached) return cached;
    if (event.request.mode === "navigate") {
      const shell = await cache.match(BASE);
      if (shell) return shell;
    }
    return Response.error();
  }));
});
