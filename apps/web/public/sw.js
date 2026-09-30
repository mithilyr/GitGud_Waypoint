// Waypoint driver service worker: keeps the app shell available with no signal.
// Static files and pages use stale-while-revalidate; /api/* is never cached here (the app keeps its own
// offline copy of the run in IndexedDB).
const CACHE = "waypoint-shell-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req);
      // Pages: network first so a fresh deploy shows up, cache when there is no signal.
      if (req.mode === "navigate") {
        try {
          const fresh = await fetch(req);
          if (fresh.ok) cache.put(req, fresh.clone());
          return fresh;
        } catch {
          return cached || (await cache.match("/driver")) || Response.error();
        }
      }
      // Assets: serve the cached copy at once, refresh it in the background.
      const refresh = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || refresh;
    })(),
  );
});
