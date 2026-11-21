// Instalarea reușește numai dacă toate resursele sunt disponibile.
const prefix = "caiet-" + self.registration.scope + "-",
  cache = prefix + "v3";
const files = [
  "./",
  "./manifest.json",
  "./sw.js",
  "./index.html",
  "./js/seed.js",
  "./js/app.js",
  "./js/ui.js",
  "./js/store.js",
  "./js/state.js",
  "./js/logic.js",
  "./js/views/today.js",
  "./js/views/pages.js",
  "./js/views/page.js",
  "./js/views/settings.js",
  "./icons/192.png",
  "./icons/512.png",
  "./css/style.css",
  "./js/blocks/checklist.js",
  "./js/blocks/table.js",
  "./js/blocks/journal.js",
  "./js/blocks/note.js",
  "./js/blocks/routine.js",
  "./js/blocks/section.js",
];
self.addEventListener("install", (e) =>
  e.waitUntil(caches.open(cache).then((c) => c.addAll(files))),
);
self.addEventListener("message", (e) => {
  if (e.data === "activate") self.skipWaiting();
});
self.addEventListener("activate", (e) =>
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith(prefix) && k !== cache)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);
self.addEventListener("fetch", (e) => {
  if (
    e.request.method === "GET" &&
    e.request.url.startsWith(self.registration.scope)
  )
    e.respondWith(
      caches
        .open(cache)
        .then(
          async (c) =>
            (await c.match(e.request)) ||
            (e.request.mode === "navigate" &&
              (await c.match("./index.html"))) ||
            fetch(e.request),
        ),
    );
});
