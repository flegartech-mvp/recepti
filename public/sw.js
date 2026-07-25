const CACHE_NAME = "nanas-recipes-static-v5";
const STATIC_ASSETS = ["/offline"];

async function reportFailure(event, error) {
  console.error("[nanas-recipes:service-worker-error]", {
    event,
    errorName: error instanceof Error ? error.name : typeof error,
  });
  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  for (const client of clients) {
    client.postMessage({ type: "nanas-recipes:sw-error", event });
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .catch(async (error) => {
        await reportFailure("install", error);
        throw error;
      }),
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

  const url = new URL(request.url);
  if (url.origin === self.location.origin && url.pathname.startsWith("/auth/"))
    return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async (error) => {
        await reportFailure("navigation", error);
        return caches.match("/offline");
      }),
    );
    return;
  }

  const isVersionedFrameworkAsset =
    url.origin === self.location.origin &&
    url.pathname.startsWith("/_next/static/");
  const isExplicitPublicAsset =
    url.origin === self.location.origin &&
    ["/images/nanas-recipes-hero.webp", "/icon", "/apple-icon"].includes(
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
