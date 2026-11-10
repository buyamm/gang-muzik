// Service worker tối giản: mở lại bài đã xem khi mạng yếu / mất mạng.
const VERSION = "gm-v1";
const SHELL = `${VERSION}-shell`;
const FILES = `${VERSION}-files`;
const DATA = `${VERSION}-data`;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(["/", "/favicon.svg"])));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    const hit = await cache.match(req);
    if (hit) return hit;
    throw new Error("offline");
  }
}

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (url.pathname.startsWith("/api/files/")) return e.respondWith(cacheFirst(req, FILES));
  if (url.pathname.startsWith("/api/songs")) return e.respondWith(networkFirst(req, DATA));
  if (url.pathname.startsWith("/api/")) return;
  if (url.pathname.startsWith("/assets/")) return e.respondWith(cacheFirst(req, SHELL));
  if (req.mode === "navigate") {
    return e.respondWith(
      fetch(req)
        .then((res) => {
          caches.open(SHELL).then((c) => c.put("/", res.clone()));
          return res;
        })
        .catch(() => caches.match("/")),
    );
  }
});
