import { kpiView } from "./views/kpis.js";
import { leadershipView } from "./views/leadership.js";
import { productionView } from "./views/production.js";
import { app } from "./state.js";
import { el, btn, id, day, icon, toast, confirmAsk } from "./ui.js";
import { load, save, flush, persist, validHours } from "./store.js";
import { seed, organize } from "./seed.js";
import { today, updateTodayAttention } from "./views/today.js";
import { pages } from "./views/pages.js";
import { pageView } from "./views/page.js";
import { settings, applyTheme } from "./views/settings.js";
import { notesView } from "./views/notes.js";
import { analysisView, resetAnalysisWeek } from "./views/analysis.js";
import { handover, previousHandover } from "./logic.js";
import { handoverDraft } from "./blocks/table.js";
import { runAction } from "./views/advice.js";
import { problemsBlock, commitments, linesBlock } from "./metrics.js";
import { formBlock } from "./ept.js";
import { lines as linesBoard } from "./blocks/lines.js";
const VERSION = "4.1";
app.training = new URLSearchParams(location.search).get("mod") === "instruire";
const main = document.querySelector("main"),
  nav = document.querySelector("nav"),
  settingsButton = document.querySelector("#open-settings");
app.data = await load(seed, app.training).catch((e) => {
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
    hours = validHours(app.data.settings.hours) ? app.data.settings.hours : ["06:00", "14:00", "22:00"];
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
    automatic,
    hours,
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
          // Câmpurile fișei EPT: NU, verificările la 2 ore, problema creată.
          if (b.form) Object.assign(i, {
            no: old?.no || false,
            slots: old?.slots ? [...old.slots] : [],
            problem: old?.problem || "",
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
app.remove = async (a, x) => {
  if (!(await confirmAsk("Ștergi această înregistrare?", "", "Șterge", true))) return;
  const pos = a.indexOf(x);
  if (pos < 0) return;
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
    if (block.runs) {
      block.runs = Object.fromEntries(Object.entries(block.runs).map(([key, values]) => [
        key, Object.fromEntries(Object.entries(values).map(([itemId, result]) => [ids.get(itemId) || itemId, result])),
      ]));
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
function followTarget() {
  const target = targetDetail;
  targetDetail = null;
  if (!target) return false;
  const detail = main.querySelector(`[data-key="${CSS.escape(target.key)}"]`);
  if (!detail) return false;
  for (let node = detail; node && node !== main; node = node.parentElement)
    if (node instanceof HTMLDetailsElement) node.open = true;
  const field = target.field && detail.querySelector(`[data-field="${CSS.escape(target.field)}"]`);
  if (field) {
    for (let group = field.parentElement; group && group !== detail; group = group.parentElement)
      if (group instanceof HTMLDetailsElement) group.open = true;
  }
  const start = field || detail.querySelector("summary") || detail;
  start.focus({ preventScroll: true });
  start.scrollIntoView({ block: "start" });
  return true;
}
app.navigate = (route, key, field) => {
  targetDetail = key ? { key, field } : null;
  if (key) app.open.add(key);
  if (readRoute() !== route) location.hash = route;
  else if (key) {
    render();
    followTarget();
  } else scrollTo(0, 0);
};
app.openPage = (p, key, field) => app.navigate(
  readRoute() === "Probleme" && problemsBlock(app.data)?.p === p ? "Probleme" : "p/" + p.id, key, field,
);
function readRoute() {
  try {
    return decodeURIComponent(location.hash.slice(1)) || "Azi";
  } catch {
    return "Azi";
  }
}
// ——— Desenarea ecranului ———
let lastRoute, lastShift, handoverEntry;
function render() {
  sync();
  applyTheme(app.data.settings.theme);
  let route = readRoute();
  if (route === "Căutare" || route === "Pagini") route = "Caiet";
  const y = scrollY;
  main.replaceChildren();
  if (app.training) main.append(el("p", "INSTRUIRE · Folosește numai date fictive.", "practiceBanner"));
  if (!app.data.settings.privacyAcknowledged) {
    const warning = el("section", "", "privacyNotice");
    warning.append(el("h1", "Înainte de prima utilizare"),
      el("p", "Introdu date interne ale companiei numai dacă politica angajatorului permite utilizarea acestui caiet și a dispozitivului personal."),
      el("p", "Datele sunt stocate în browser, fără criptare proprie. Politica angajatorului se aplică și copiilor descărcate sau copiate."),
      btn("Am înțeles", () => {
        app.data.settings.privacyAcknowledged = true;
        app.refresh();
      }, "primary"));
    main.append(warning);
    return;
  }

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
  if (route === "Linii") route = "Producție";
  let p =
    route.startsWith("p/") &&
    app.data.pages.find((x) => x.id === route.slice(2));
  const registry = problemsBlock(app.data);
  // Fișa EPT are fila ei; tabloul liniilor stă în fruntea ecranului Producție.
  const form = formBlock(app.data)?.p, board = linesBlock(app.data);
  const transfer = handover(c);
  if (route === "Predare" && transfer) {
    const previous = previousHandover(c);
    if (targetDetail || lastRoute !== route || lastShift !== c.key) {
      if (handoverEntry) app.open.delete(handoverEntry);
      handoverEntry = targetDetail?.key || "row-" + (transfer.r || handoverDraft(transfer.b, c)).id;
      app.open.add(handoverEntry);
    }
    const inspectingPrevious = previous?.r && handoverEntry === "row-" + previous.r.id;
    const handoverToolbar = previous?.r && btn(inspectingPrevious ? "Fișa schimbului curent" : "Fișa schimbului anterior",
      () => runAction({ kind: "handover", previous: !inspectingPrevious }), "todayMore", "handover");
    pageView(transfer.p, { ...c, handoverEntry, handoverToolbar });
  } else if (route === "Predare") {
    main.append(el("h1", "Predare", "title"), el("p", "Jurnalul de predare nu este disponibil în acest caiet.", "empty"),
      btn("Deschide caietul", () => app.navigate("Caiet")));
  } else if (route === "Probleme" && registry) pageView(registry.p, c);
  else if (route === "Probleme") {
    main.append(el("h1", "Probleme", "title"), el("p", "Registrul de probleme nu este disponibil în acest caiet.", "empty"),
      btn("Deschide caietul", () => app.navigate("Caiet")));
  } else if (route === "Rutina" && form) pageView(form, c, true);
  else if (p) pageView(p, c);
  else if (route === "Caiet" || route.startsWith("p/") || route === "Rutina") pages();
  else if (route === "Notițe") notesView(c);
  else if (route === "Analiză") analysisView(c);
  else if (route === "Setări") settings(VERSION);
  else if (route === "Indicatori") kpiView(c);
  else if (route === "Leadership") leadershipView();
  else if (route === "Producție") {
    if (board && !app.data.pages.find((x) => x === board.p)?.archived) {
      const head = el("div", "", "boardHead");
      head.append(el("h1", app.data.settings.zone ? "Zona " + app.data.settings.zone : "Liniile mele", "title"),
        btn("Editează", () => app.openPage(board.p), "pill", "edit"));
      main.append(head, linesBoard(board.b, { ...c, pageId: board.p.id }));
    }
    productionView(c);
  } else today(c);
  const tab = (p && p === registry?.p) || route === "Probleme" ? "Probleme"
    : p && p === transfer?.p ? "Predare"
    : (p && p === form) || (route === "Rutina" && form) ? "Rutina"
    : (p && p === board?.p) ? "Producție"
    : ["Producție", "Predare", "Setări"].includes(route) ? route
    : route === "Azi" ? "Azi" : "Caiet";
  lastRoute = route;
  lastShift = c.key;
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
for (const [name, symbol] of [["Azi", "today"], ["Rutina", "routine"], ["Producție", "lines"], ["Predare", "handover"], ["Probleme", "alert"], ["Caiet", "pages"]]) {
  const button = btn("", () => app.navigate(name));
  button.dataset.route = name;
  button.append(icon(symbol), el("span", name));
  nav.append(button);
}
app.render = render;
window.addEventListener("hashchange", () => {
  if (location.hash !== "#p/" + app.editing) app.editing = null;
  if (location.hash !== "#" + encodeURIComponent("Analiză")) resetAnalysisWeek();
  render();
  if (!followTarget()) scrollTo(0, 0);
});
render();
// Actualizăm atenționările fără să înlocuim formularele deschise.
function checkClock() {
  if (document.hidden) return;
  const next = clock();
  const previous = app.current;
  if (next.key !== previous.key || next.date !== previous.date) {
    if (document.querySelector("dialog[open]") ||
        document.activeElement?.matches("textarea, select:not(.todayShift), input:not([type=checkbox])")) return;
    render();
  } else if (next.time !== previous.time) {
    app.current = next;
    updateTodayAttention(next);
  }
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
            try {
              await flush();
              waiting.postMessage("activate");
            } catch (error) {
              toast(error.message);
            }
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
      try {
        await flush();
        location.reload();
      } catch (error) {
        toast(error.message);
      }
    } else hadController = true;
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) reg?.update().catch(() => {});
  });
}
