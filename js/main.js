// Pornire: încărcare document, migrare v4.4 (o singură dată), router, shell.
import { h, icon, toast, sheetOpen, btn, put } from "./ui/kit.js";
import { S, ctx, now, applyTheme } from "./state.js";
import { loadDoc, saveDoc, loadLegacy, onStatus, persistStorage, flush, exportDoc } from "./core/store.js";
import { emptyDoc, looksLikeDemo } from "./core/doc.js";
import { migrateV4 } from "./core/migrate.js";
import { fmtDur, fmtDay, day } from "./core/time.js";
import { shiftState } from "./domain/shift.js";
import { attention } from "./domain/assistant.js";
import { quickActions, shiftSheet } from "./views/common.js";
import { todayView } from "./views/today.js";
import { routineView } from "./views/routine.js";
import { productionView, lineView } from "./views/production.js";
import { planningView } from "./views/planning.js";
import { reportView } from "./views/report.js";
import { oeeView } from "./views/oee.js";
import { incidentsView, incidentView } from "./views/incidents.js";
import { teamView, personView } from "./views/team.js";
import { tasksView } from "./views/tasks.js";
import { qualityView, auditView, auditNew, auditsList, eightDList, eightDView, pokaView, kaizenView, leanView } from "./views/quality.js";
import { handoverView } from "./views/handover.js";
import { moreView, settingsView, catalogView } from "./views/settings.js";

const params = new URLSearchParams(location.search);
S.training = params.get("mod") === "instruire";
if (S.training && params.get("t")) S.clockOffset = new Date(params.get("t")).getTime() - Date.now() || 0;

const ROUTES = {
  "": [todayView, "today"], routine: [routineView, "today"], handover: [handoverView, "today"],
  production: [productionView, "production"], line: [lineView, "production"], planning: [planningView, "production"], report: [reportView, "production"],
  oee: [oeeView, "production"], incidents: [incidentsView, "production"], incident: [incidentView, "production"],
  team: [teamView, "team"], person: [personView, "team"],
  quality: [qualityView, "quality"], audit: [auditView, "quality"], audits: [auditsList, "quality"], eightd: [eightDList, "quality"], "8d": [eightDView, "quality"],
  poka: [pokaView, "quality"], kaizen: [kaizenView, "quality"], lean: [leanView, "quality"],
  more: [moreView, "more"], tasks: [tasksView, "more"], settings: [settingsView, "more"], catalog: [catalogView, "more"],
};
const TABS = [["today", "#/", "Azi", "today"], ["production", "#/production", "Producție", "production"], ["team", "#/team", "Echipă", "team"], ["quality", "#/quality", "Calitate", "quality"], ["more", "#/more", "Mai mult", "more"]];
const SIDE = [
  ["Schimb", [["#/", "Centru de comandă", "today"], ["#/routine", "Rutina mea EPT", "check"], ["#/handover", "Predarea schimbului", "handover"]]],
  ["Producție", [["#/production", "Linii", "production"], ["#/planning", "Planificare", "calendar"], ["#/oee", "Performanță OEE", "chart"], ["#/incidents", "Incidente", "wrench"]]],
  ["Echipă", [["#/team", "Pontaj și alocare", "team"], ["#/team/matrix", "Matrice de calificare", "grid"]]],
  ["Calitate și Lean", [["#/quality", "Calitate", "quality"], ["#/eightd", "8D", "layers"], ["#/lean", "Lean 4", "target"], ["#/kaizen", "Kaizen", "bulb"]]],
  ["Administrare", [["#/tasks", "Sarcini", "list"], ["#/catalog", "Cataloage", "box"], ["#/settings", "Setări și backup", "settings"]]],
];

function parse() {
  const raw = location.hash.replace(/^#\/?/, "");
  const [path, qs] = raw.split("?");
  const parts = path.split("/").filter(Boolean).map(decodeURIComponent);
  let name = parts[0] || "";
  if (name === "audit" && parts[1] === "new") return { name: "auditNew", parts: parts.slice(2), q: new URLSearchParams(qs || ""), tab: "quality" };
  if (name === "8d") name = "8d";
  return { name, parts: parts.slice(1), q: new URLSearchParams(qs || "") };
}

const bar = h("header.bar");
const side = h("nav.side", { "aria-label": "Navigare" });
const main = h("main", { id: "main", tabindex: "-1" });
const nav = h("nav.nav", { "aria-label": "Navigare principală" });
const fab = h("button.fab", { type: "button", "aria-label": "Acțiune rapidă", onclick: () => quickActions() }, icon("plus"));
const saveEl = h("span.savedot", { "data-s": "saved", role: "status" }, "Salvat");
onStatus((st, e) => {
  saveEl.dataset.s = st;
  saveEl.textContent = st === "saved" ? "Salvat" : st === "pending" ? "Se salvează" : "Nesalvat";
  if (st === "error") toast(e?.message || "Salvarea a eșuat.", { err: true, ms: 9000 });
});

let lastRoute = "", alertsCount = 0;
function render() {
  const r = parse();
  const [view, tab] = r.name === "auditNew" ? [auditNew, "quality"] : ROUTES[r.name] || [todayView, "today"];
  let c, st;
  try { c = ctx(); st = shiftState(S.doc, c.workDay, c.shift, now()); } catch (e) { console.error(e); return recovery(e); }
  try { alertsCount = attention(S.doc, st, now()).filter((a) => a.severity === "critical" || a.severity === "high").length; } catch { alertsCount = 0; }
  drawBar(c, st);
  drawNav(tab, r);
  // Pe ecranele cu bară fixă de salvare, butonul rapid ar acoperi acțiunea principală.
  fab.hidden = ["report", "audit", "auditNew"].includes(r.name) || (r.name === "incident" && r.parts[0] === "new");
  const key = location.hash;
  const y = key === lastRoute ? scrollY : 0;
  let content;
  try { content = view(r.parts, r.q, st); } catch (e) { console.error(e); content = h("div.empty", null, h("h3", null, "Ecranul nu a putut fi afișat"), h("p", null, e.message)); }
  put(main, content);
  if (key !== lastRoute) { scrollTo(0, 0); lastRoute = key; } else scrollTo(0, y);
  document.title = (S.training ? "[Instruire] " : "") + "myApp · " + c.shift.name;
}
S.render = render;
// Ecran de recuperare: datele se pot exporta chiar dacă nu pot fi afișate.
function recovery(e) {
  put(main, h("div.empty", null, h("h3", null, "Datele nu pot fi afișate"), h("p", null, e.message + " Exportă datele și restaurează o copie validă din Setări."),
    h("div.actions", { style: { justifyContent: "center" } }, btn("Descarcă datele", () => exportDoc(S.doc), "primary", "download"), btn("Setări", () => (location.hash = "#/settings")))));
}
function drawBar(c, st) {
  const tone = st.counts.stop ? "stop" : st.counts.unknown ? "warn" : st.counts.run ? "run" : "";
  put(bar, 
    h("span.mark", { "aria-hidden": "true" }, h("i", { class: tone === "stop" ? "stop" : "" }), h("i", { class: tone === "warn" ? "warn" : "" }), h("i", { class: tone === "run" ? "run" : "" })),
    h("button.shiftbtn", { type: "button", onclick: shiftSheet, "aria-label": "Schimbă schimbul afișat" },
      h("b", null, c.shift.name + (c.workDay !== day(now()) || S.view ? " · " + fmtDay(c.workDay) : "")),
      h("span", null, c.live ? "mai sunt " + fmtDur(st.remainingMin) : c.upcoming ? "începe în " + fmtDur((c.from - now()) / 60000) : "încheiat")),
    h("span.grow"),
    S.training ? h("span.demo-flag", { title: "Date sintetice" }, "INSTRUIRE") : null,
    saveEl);
}
function drawNav(tab, r) {
  put(nav, ...TABS.map(([id, href, label, ic]) => h("a", { href, "aria-current": id === tab ? "page" : null }, icon(ic), label,
    id === "today" && alertsCount ? h("span.badge", { "aria-label": alertsCount + " alerte importante" }, String(alertsCount)) : null)));
  const cur = "#/" + [r.name, ...r.parts].filter(Boolean).join("/");
  put(side, ...SIDE.map(([title, links]) => [h("h3", null, title), ...links.map(([href, label, ic]) =>
    h("a", { href, "aria-current": href === cur || (href === "#/" && cur === "#/") ? "page" : null }, icon(ic), label))]).flat());
}

async function boot() {
  const root = document.getElementById("app");
  put(root, bar, side, main);
  document.body.append(nav, fab);
  try {
    let doc = await loadDoc(S.training);
    let imported = null, cleaned = false;
    // Datele fictive ale vechiului mod demo se elimină; catalogul pornește cu liniile reale.
    if (doc && looksLikeDemo(doc)) { doc = null; cleaned = true; }
    if (!doc) {
      if (S.training) doc = emptyDoc(true);
      else {
        const legacy = await loadLegacy().catch(() => undefined);
        if (legacy) { try { doc = migrateV4(legacy, now()); imported = doc.meta.importedFromV4; } catch (e) { doc = emptyDoc(false); toast("Caietul v4.4 nu a putut fi importat: " + e.message, { err: true, ms: 9000 }); } }
        else doc = emptyDoc(false);
      }
      S.doc = doc;
      await saveDoc(doc);
    } else S.doc = doc;
    applyTheme();
    render();
    if (cleaned) toast("Datele fictive au fost șterse." + (S.doc.master.lines.length ? " Liniile tale au fost preluate din caietul v4.4." : " Adaugă liniile tale în Cataloage."), { ms: 9000 });
    if (imported) toast("Importat din v4.4: " + imported.lines + " linii, " + imported.people + " oameni, " + imported.quals + " calificări (de reconfirmat), " + imported.tasks + " sarcini. Caietul vechi rămâne neatins.", { ms: 12000 });
  } catch (e) {
    put(main, h("div.empty", null, h("h3", null, "Datele locale nu pot fi deschise"), h("p", null, e.message), btn("Reîncarcă", () => location.reload(), "primary")));
    throw e;
  }
  addEventListener("hashchange", render);
  addEventListener("click", () => persistStorage(), { once: true });
  setInterval(() => {
    const a = document.activeElement;
    if (!sheetOpen() && !(a && a.matches("input, textarea, select"))) render();
  }, 60000);
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("./sw.js").then((reg) => {
      const offer = (w) => toast("Versiune nouă disponibilă. Salvează lucrul, apoi actualizează.", { undo: () => { w.postMessage("activate"); }, label: "Actualizează", ms: 15000 });
      if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
      reg.addEventListener("updatefound", () => { const w = reg.installing; w?.addEventListener("statechange", () => { if (w.state === "installed" && navigator.serviceWorker.controller) offer(w); }); });
    }).catch(() => {});
    // Reîncărcare doar la actualizare (exista deja un controller), nu la prima instalare.
    const hadController = !!navigator.serviceWorker.controller;
    let reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => { if (hadController && !reloading) { reloading = true; flush().finally(() => location.reload()); } });
  }
  addEventListener("pagehide", () => flush());
}
boot();
