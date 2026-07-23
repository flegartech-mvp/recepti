const CACHE_NAME = "nanas-recipes-static-v2";
const STATIC_ASSETS = ["/offline", "/images/nanas-recipes-hero.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline")));
    return;
  }

  const url = new URL(request.url);
  const isVersionedFrameworkAsset =
    url.origin === self.location.origin &&
    url.pathname.startsWith("/_next/static/");
  const isExplicitPublicAsset =
    url.origin === self.location.origin &&
    ["/images/nanas-recipes-hero.png", "/icon", "/apple-icon"].includes(
      url.pathname,
    );

  // Never cache /_next/image or arbitrary same-origin images: those responses
  // may contain private signed recipe media on a shared device.
  if (!isVersionedFrameworkAsset && !isExplicitPublicAsset) return;
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ??
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
