import { app } from "./state.js";
import { el, btn, id, day, icon, toast } from "./ui.js";
import { load, save, flush, persist } from "./store.js";
import { seed, organize } from "./seed.js";
import { today } from "./views/today.js";
import { pages } from "./views/pages.js";
import { pageView } from "./views/page.js";
import { settings } from "./views/settings.js";
const VERSION = "2.0";
const main = document.querySelector("main"),
  nav = document.querySelector("nav");
app.data = await load(seed).catch((e) => {
  main.textContent = "Caietul nu poate fi deschis. " + e.message;
  throw e;
});
if (organize(app.data)) save(app.data);
document.addEventListener("click", persist, { once: true });
// ——— Instalare pe telefon ———
app.standalone = () =>
  matchMedia("(display-mode: standalone)").matches ||
  navigator.standalone === true;
addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  app.installPrompt = e;
  if (!document.activeElement?.matches("input, textarea, select")) render();
});
addEventListener("appinstalled", () => {
  app.installPrompt = null;
  render();
});
app.install = async () => {
  if (!app.installPrompt) return;
  app.installPrompt.prompt();
  await app.installPrompt.userChoice.catch(() => {});
  app.installPrompt = null;
  render();
};
// ——— Schimbul curent ———
// Ziua de lucru începe odată cu schimbul 1 și se termină în dimineața următoare.
function clock() {
  const d = new Date(),
    local = day(d),
    time =
      ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2),
    hours = app.data.settings.hours;
  let automatic = hours.findLastIndex((h) => h <= time) + 1 || 3;
  if (time < hours[0]) d.setDate(d.getDate() - 1);
  let slot = day(d) + "/" + automatic,
    shift =
      app.data.settings.slot === slot ? app.data.settings.shift : automatic;
  return {
    date: local,
    workDay: day(d),
    shift,
    slot,
    key: day(d) + " · Schimb " + shift,
  };
}
// La schimbarea schimbului, rutina pornește cu bife noi; la revenirea într-un
// schimb deja deschis, recuperăm bifările lui din istoric.
function sync() {
  app.current = clock();
  let dirty = false;
  for (let p of app.data.pages)
    for (let b of p.blocks)
      if (b.type === "routine" && b.key !== app.current.key) {
        if (b.key) b.history[b.key] = structuredClone(b.items);
        let previous = b.history[app.current.key] || [];
        for (let i of b.items) {
          let old = previous.find((x) => x.id === i.id);
          Object.assign(i, {
            checked: old?.checked || false,
            checkedAt: old?.checkedAt || null,
            notes: old?.notes || "",
            updated: old?.updated || null,
          });
        }
        delete b.history[app.current.key];
        b.key = app.current.key;
        dirty = true;
      }
  if (dirty) save(app.data);
}
// ——— Operații comune ———
app.save = () => {
  app.data.pages.forEach((p, i) => (p.order = i));
  save(app.data);
};
app.refresh = () => {
  app.save();
  render();
};
app.remove = (a, x) => {
  let pos = a.indexOf(x);
  a.splice(pos, 1);
  app.undo = () => {
    a.splice(pos, 0, x);
    app.undo = null;
    app.refresh();
  };
  app.refresh();
  toast("Șters", () => app.undo?.(), "Anulează");
};
app.clone = (x) => {
  let v = structuredClone(x);
  v.id = id();
  return v;
};
app.openPage = (p) => (location.hash = "p/" + p.id);
// ——— Desenarea ecranului ———
function render() {
  sync();
  document.documentElement.dataset.theme = app.data.settings.theme;
  let route = decodeURIComponent(location.hash.slice(1)) || "Azi";
  if (route === "Căutare") route = "Pagini";
  const y = scrollY;
  main.replaceChildren();
  nav.replaceChildren();
  const c = {
    ...app.current,
    save: app.save,
    refresh: app.refresh,
    render,
    remove: app.remove,
  };
  if (
    Date.now() - (app.data.settings.backup || 0) > 7 * 86400000 &&
    route !== "Setări"
  )
    main.append(
      btn(
        "Au trecut 7 zile de la ultimul backup",
        () => (location.hash = "Setări"),
        "banner",
        "download",
      ),
    );
  let p =
    route.startsWith("p/") &&
    app.data.pages.find((x) => x.id === route.slice(2));
  if (p) pageView(p, c);
  else if (route === "Pagini" || route.startsWith("p/")) pages();
  else if (route === "Setări") settings(VERSION);
  else today(c);
  for (let [n, ic, label] of [
    ["Azi", "today", "Azi"],
    ["Pagini", "pages", "Pagini"],
    ["Setări", "settings", "Setări"],
  ]) {
    let on = route === n || (n === "Pagini" && route.startsWith("p/"));
    let b = btn("", () => (location.hash = n), on ? "on" : "");
    b.append(icon(ic), el("span", label));
    if (on) b.setAttribute("aria-current", "page");
    nav.append(b);
  }
  scrollTo(0, y);
}
app.render = render;
window.addEventListener("hashchange", () => {
  app.editing = null;
  render();
  scrollTo(0, 0);
});
render();
// Verificăm la fiecare 10 secunde dacă s-a schimbat schimbul sau ziua.
setInterval(() => {
  let now = clock();
  if (now.key !== app.current.key || now.date !== app.current.date) {
    if (!document.activeElement?.matches("input, textarea, select")) render();
  }
}, 10000);
// ——— Funcționare offline și actualizări ———
if ("serviceWorker" in navigator) {
  let hadController = !!navigator.serviceWorker.controller;
  const reg = await navigator.serviceWorker
    .register("./sw.js")
    .catch(() => null);
  function update() {
    if (reg?.waiting && navigator.serviceWorker.controller)
      document.querySelector("#update").replaceChildren(
        btn(
          "Versiune nouă disponibilă – actualizează",
          async () => {
            await flush();
            reg.waiting.postMessage("activate");
          },
          "banner",
          "download",
        ),
      );
  }
  update();
  if (reg)
    reg.onupdatefound = () => {
      const worker = reg.installing;
      if (worker) worker.onstatechange = update;
    };
  navigator.serviceWorker.addEventListener("controllerchange", async () => {
    if (hadController) {
      await flush();
      location.reload();
    } else hadController = true;
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) reg?.update().catch(() => {});
  });
}
