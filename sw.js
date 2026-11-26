// Service Worker myApp 2: offline complet. Instalarea reușește doar dacă toate resursele există.
// La orice fișier nou: adaugă-l în listă și crește versiunea (testul verifică inventarul).
const prefix = "caiet-" + self.registration.scope + "-",
  cache = prefix + "v32";
const files = [
  "./",
  "./index.html",
  "./manifest.json",
  "./sw.js",
  "./css/app.css",
  "./css/tokens.css",
  "./css/views.css",
  "./fonts/barlow-semi-condensed-600.woff2",
  "./icons/192.png",
  "./icons/512.png",
  "./js/core/doc.js",
  "./js/core/migrate.js",
  "./js/core/num.js",
  "./js/core/restore.js",
  "./js/core/store.js",
  "./js/core/time.js",
  "./js/domain/assistant.js",
  "./js/domain/handover.js",
  "./js/domain/incidents.js",
  "./js/domain/lines.js",
  "./js/domain/oee.js",
  "./js/domain/plan.js",
  "./js/domain/quality.js",
  "./js/domain/reports.js",
  "./js/domain/routine.js",
  "./js/domain/shift.js",
  "./js/domain/tasks.js",
  "./js/domain/workforce.js",
  "./js/main.js",
  "./js/state.js",
  "./js/ui/charts.js",
  "./js/ui/kit.js",
  "./js/views/common.js",
  "./js/views/handover.js",
  "./js/views/incidents.js",
  "./js/views/oee.js",
  "./js/views/planning.js",
  "./js/views/production.js",
  "./js/views/quality.js",
  "./js/views/report.js",
  "./js/views/routine.js",
  "./js/views/settings.js",
  "./js/views/tasks.js",
  "./js/views/team.js",
  "./js/views/today.js",
];
self.addEventListener("install", (e) =>
  e.waitUntil(caches.open(cache).then((c) => c.addAll(files.map((url) => new Request(url, { cache: "reload" }))))),
);
self.addEventListener("message", (e) => {
  if (e.data === "activate") self.skipWaiting();
});
self.addEventListener("activate", (e) =>
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(prefix) && k !== cache).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  ),
);
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || !e.request.url.startsWith(self.registration.scope)) return;
  e.respondWith(
    caches.open(cache).then(async (c) =>
      (await c.match(e.request, { ignoreSearch: e.request.mode === "navigate" })) ||
      (e.request.mode === "navigate" && (await c.match("./index.html"))) ||
      fetch(e.request)),
  );
});
