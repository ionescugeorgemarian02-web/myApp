import { app } from "./state.js";
import { el, btn, id, day, icon, toast } from "./ui.js";
import { load, save, flush, persist } from "./store.js";
import { seed, organize } from "./seed.js";
import { today } from "./views/today.js";
import { pages } from "./views/pages.js";
import { pageView } from "./views/page.js";
import { settings, applyTheme } from "./views/settings.js";
import { notesView } from "./views/notes.js";
import { analysisView, resetAnalysisWeek } from "./views/analysis.js";
import { commitments } from "./metrics.js";
const VERSION = "3.1";
const main = document.querySelector("main"),
  nav = document.querySelector("nav"),
  settingsButton = document.querySelector("#open-settings");
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
    time,
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
        const previous = new Map((b.history[app.current.key] || []).map((i) => [i.id, i]));
        for (let i of b.items) {
          let old = previous.get(i.id);
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
app.clone = (source) => {
  const copy = structuredClone(source);
  if (copy.blocks) copy.id = id();
  for (const block of copy.blocks || [copy]) {
    block.id = id();
    // Un punct păstrează aceeași identitate în toate schimburile copiei.
    const ids = new Map();
    for (const items of [block.items || [], ...Object.values(block.history || {})]) {
      for (const item of items) {
        if (!ids.has(item.id)) ids.set(item.id, id());
        item.id = ids.get(item.id);
      }
    }
    const columns = new Map();
    for (const col of block.cols || []) {
      const newId = id();
      columns.set(col.id, newId);
      col.id = newId;
    }
    for (const row of block.rows || []) {
      row.id = id();
      row.values = Object.fromEntries(Object.entries(row.values).map(
        ([key, value]) => [columns.get(key) || key, value],
      ));
    }
  }
  return copy;
};
let targetDetail = null;
app.openPage = (p, detailKey) => {
  targetDetail = detailKey;
  if (detailKey) app.open.add(detailKey);
  location.hash = "p/" + p.id;
};
// ——— Desenarea ecranului ———
function render() {
  sync();
  applyTheme(app.data.settings.theme);
  let route = "Azi";
  try {
    route = decodeURIComponent(location.hash.slice(1)) || route;
  } catch {
    // Un fragment incomplet dintr-un link deschide ecranul Azi.
  }
  if (route === "Căutare" || route === "Pagini") route = "Caiet";
  const y = scrollY;
  main.replaceChildren();

  const c = {
    ...app.current,
    save: app.save,
    refresh: app.refresh,
    render,
    remove: app.remove,
  };
  if (
    Date.now() - (app.data.settings.backup || app.data.settings.createdAt || 0) > 7 * 86400000 &&
    route === "Caiet"
  )
    main.append(
      btn(
        "Salvează o copie a caietului",
        () => { app.open.add("settings-backup"); location.hash = "Setări"; },
        "banner",
        "download",
      ),
    );
  let p =
    route.startsWith("p/") &&
    app.data.pages.find((x) => x.id === route.slice(2));
  if (p) pageView(p, c);
  else if (route === "Caiet" || route.startsWith("p/")) pages();
  else if (route === "Notițe") notesView(c);
  else if (route === "Analiză") analysisView(c);
  else if (route === "Setări") settings(VERSION);
  else today(c);
  const tab = route.startsWith("p/") ? "Caiet" : ["Caiet", "Notițe", "Analiză", "Setări"].includes(route) ? route : "Azi";
  updateBadge();
  for (const button of [...nav.children, settingsButton]) {
    const on = button.dataset.route === tab;
    button.classList.toggle("on", on);
    if (on) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  }
  scrollTo(0, y);
}
settingsButton.append(icon("settings"));
settingsButton.dataset.route = "Setări";
settingsButton.onclick = () => { location.hash = "Setări"; };
// Insigna pictogramei arată restanțele (unde sistemul o permite).
function updateBadge() {
  if (!navigator.setAppBadge) return;
  const late = commitments(app.data, app.current.date, app.current.date, app.current).late;
  (late ? navigator.setAppBadge(late) : navigator.clearAppBadge()).catch(() => {});
}
for (const [name, symbol] of [["Azi", "today"], ["Analiză", "chart"], ["Notițe", "notes"], ["Caiet", "pages"]]) {
  const button = btn("", () => (location.hash = name));
  button.dataset.route = name;
  button.append(icon(symbol), el("span", name));
  nav.append(button);
}
app.render = render;
window.addEventListener("hashchange", () => {
  if (location.hash !== "#p/" + app.editing) app.editing = null;
  if (decodeURIComponent(location.hash) !== "#Analiză") resetAnalysisWeek();
  render();
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
    main.animate([{ opacity: .8, transform: "translateY(4px)" }, { opacity: 1, transform: "none" }], {
      duration: 180, easing: "ease-out",
    });
  const detail = targetDetail && [...main.querySelectorAll("[data-key]")].find(
    (d) => d.dataset.key === targetDetail,
  );
  targetDetail = null;
  if (detail) {
    if (detail.tagName === "DETAILS") detail.open = true;
    const start = detail.querySelector("summary") || detail;
    start.focus({ preventScroll: true });
    start.scrollIntoView({ block: "start" });
  } else scrollTo(0, 0);
});
render();
// Actualizăm lista doar când se schimbă tura, ziua sau starea unui termen.
// Formularul deschis își păstrează focusul și conținutul până la închidere.
function checkClock() {
  if (document.hidden || document.querySelector("dialog[open]") ||
      document.activeElement?.matches("textarea, select:not(.todayShift), input:not([type=checkbox])")) return;
  const next = clock();
  const previous = app.current;
  const crossedDeadline = next.time !== previous.time && app.data.notes.some((n) =>
    !n.done && n.due === next.date && n.dueTime &&
    (n.dueTime < next.time) !== (n.dueTime < previous.time));
  if (next.key !== previous.key || next.date !== previous.date || crossedDeadline) render();
  else app.current.time = next.time;
}
setInterval(checkClock, 5000);
document.addEventListener("visibilitychange", checkClock);
// ——— Funcționare offline și actualizări ———
if ("serviceWorker" in navigator) {
  let hadController = !!navigator.serviceWorker.controller;
  const reg = await navigator.serviceWorker
    .register("./sw.js")
    .catch(() => null);
  function update() {
    const waiting = reg?.waiting;
    if (waiting && navigator.serviceWorker.controller)
      document.querySelector("#update").replaceChildren(
        btn(
          "Versiune nouă disponibilă – actualizează",
          async () => {
            await flush();
            waiting.postMessage("activate");
          },
          "banner",
          "download",
        ),
      );
  }
  function watchWorker() {
    reg?.installing?.addEventListener("statechange", update);
    update();
  }
  reg?.addEventListener("updatefound", watchWorker);
  watchWorker();
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
