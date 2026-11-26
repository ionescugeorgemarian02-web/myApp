// INCIDENTE — registru industrial: linie → mașină → defect → timp → responsabil. Durata intervenției ≠ downtime.
import { h, put, btn, icon, tag, kpi, sect, chips, empty, note, sheet, field, input, area, select, seg, picker, toast, item } from "../ui/kit.js";
import { S, ctx, commit, now, byId, lineName, personName, machineOf } from "../state.js";
import { fmtHM, fmtDur, fromIso, addDays, shiftKey, shiftWindow, atTime, validHM, MIN } from "../core/time.js";
import { fmtN } from "../core/num.js";
import { INC_STATUS, SEVERITY, allowedNext, transition, createIncident, durations, reliability, recurring, pareto } from "../domain/incidents.js";
import { addEvent, statusAt, statusMinutes } from "../domain/lines.js";
import { create8D } from "../domain/quality.js";
import { paretoBars } from "../ui/charts.js";
import { linesItems, machineItems, peopleItems, timeChoice, taskFromSheet, backLink, pageHead } from "./common.js";

const TONE = { open: "stop", notified: "warn", diagnosis: "warn", intervention: "change", waiting: "warn", resolved: "run", verified: "run", closed: "idle" };
const isActive = (i) => !["resolved", "verified", "closed"].includes(i.status);
let filter = "active";
export function incidentsView() {
  const doc = S.doc, t = now();
  const rec = recurring(doc.incidents, t);
  const recIds = new Set(rec.flatMap((r) => r.items.map((i) => i.id)));
  const F = { active: isActive, all: () => true, recurring: (i) => recIds.has(i.id), mine: (i) => !i.ownerId && !i.dept };
  const list = doc.incidents.filter(F[filter]).sort((a, b) => String(b.startAt).localeCompare(String(a.startAt)));
  const last30 = doc.incidents.filter((i) => fromIso(i.startAt) >= new Date(t.getTime() - 30 * 1440 * MIN));
  const rel = reliability(last30, { runMinutes: runMinutes(30) });
  return h("div", null,
    pageHead("Incidente", "Înregistrare digitală · fără comandă către utilaje", [btn("Incident nou", () => (location.hash = "#/incident/new"), "primary", "plus")]),
    h("div.kpis.c4", null,
      kpi("Active", String(doc.incidents.filter(isActive).length), doc.incidents.filter((i) => isActive(i) && !i.ownerId && !i.dept).length + " fără responsabil", doc.incidents.some(isActive) ? "warn" : ""),
      kpi("MTTR · 30 zile", rel.mttr !== null ? fmtDur(rel.mttr) : "—", rel.mttrN ? "din " + rel.mttrN + " rezolvate (apariție → rezolvare)" : "nicio rezolvare cu timpi"),
      kpi("MTBF · 30 zile", rel.mtbf !== null ? fmtDur(rel.mtbf) : "—", rel.mtbfWhy || "timp de funcționare / defecte"),
      kpi("Recurente", String(rec.length), "aceeași mașină și cod, ≥ 3 în 7 zile", rec.length ? "stop" : "")),
    h("div", { style: { margin: "16px 0 12px" } }, chips([["active", "Active"], ["mine", "Fără responsabil"], ["recurring", "Recurente"], ["all", "Toate"]], filter, (v) => { filter = v; S.render(); })),
    list.length ? h("div.list", null, list.map((i) => {
      const d = durations(i, t);
      return item({ href: "#/incident/" + i.id, title: "#" + i.no + " " + lineName(i.lineId) + (i.machineId ? " · " + (machineOf(i.lineId, i.machineId)?.name || "") : "") + " — " + (i.desc || i.category || "Incident"),
        sub: [fmtHM(fromIso(i.startAt)), personName(i.ownerId) !== "—" ? personName(i.ownerId) : i.dept || "fără responsabil", i.stopsLine ? "oprește linia" : "linia rulează", recIds.has(i.id) ? "recurent" : ""].filter(Boolean).join(" · "),
        end: h("div.stack-end", null, tag(TONE[i.status], INC_STATUS[i.status]), h("span.num.small", null, d.open ? fmtDur(d.elapsed) : fmtDur(d.repair))) });
    })) : empty("Niciun incident", filter === "active" ? "Nu există incidente active." : "Nimic în acest filtru.", null),
    last30.length ? h("div.grid.c2-lg", null,
      h("div", null, sect("Pareto pe defect · 30 zile"), h("div.panel.pad", null, paretoBars(pareto(last30, (i) => byId(doc.master.faults, i.faultId)?.name || i.category), { unit: "×" }))),
      h("div", null, sect("Pareto pe linie · 30 zile"), h("div.panel.pad", null, paretoBars(pareto(last30, (i) => lineName(i.lineId)), { unit: "×" })))) : null);
}
// Minute de funcționare (stare run) în ultimele N zile, din evenimente, pe schimburile planificate.
function runMinutes(days) {
  const doc = S.doc, c = ctx();
  let m = 0;
  for (let i = 0; i < days; i++) for (const sh of doc.settings.shifts) {
    const wd = addDays(c.workDay, -i), sk = shiftKey(wd, sh.id);
    if (!doc.plans[sk]) continue;
    const w = shiftWindow(wd, sh);
    for (const l of doc.master.lines) m += statusMinutes(doc.events, l.id, w.from, new Date(Math.min(now(), w.to))).run;
  }
  return m;
}

export function incidentView([id], q) {
  if (id === "new") return newIncident(q);
  const i = S.doc.incidents.find((x) => x.id === id);
  if (!i) return h("div", null, backLink("#/incidents", "Incidente"), empty("Incidentul nu există", "", null));
  const d = durations(i, now());
  const upd = (patch, msg) => commit(() => Object.assign(i, patch), msg);
  const doc = S.doc;
  const timeRow = (label, key) => h("div.trow", null, h("span", null, label), h("span.num", null, i[key] ? fmtHM(fromIso(i[key])) : "—"),
    h("button.ibtn", { type: "button", "aria-label": "Editează " + label, onclick: () => editTime(i, key, label) }, icon("edit")));
  return h("div", null, backLink("#/incidents", "Incidente"),
    h("div.head", null, h("div", null, h("h1", null, "Incident #" + i.no), h("p.row.wrap", null, tag(TONE[i.status], INC_STATUS[i.status]), tag(i.severity === "safety" ? "stop" : "plain", "Severitate " + SEVERITY[i.severity]),
      h("span", null, lineName(i.lineId) + (i.machineId ? " · " + (machineOf(i.lineId, i.machineId)?.name || "") : ""))))),
    i.severity === "safety" ? note("Implicație de siguranță: securizează zona înainte de orice diagnostic.", "stop") : null,
    h("div.kpis.c4", null,
      kpi(d.open ? "În desfășurare" : "Apariție → rezolvare", fmtDur(d.open ? d.elapsed : d.repair), d.open ? "de la " + fmtHM(fromIso(i.startAt)) : "", d.open ? "warn" : ""),
      kpi("Timp de răspuns", fmtDur(d.response), "notificare → intervenție"),
      kpi("Intervenție", fmtDur(d.intervention), "intervenție → rezolvare"),
      kpi("Downtime linie", i.stopsLine ? "din evenimente" : "nu oprește", i.stopsLine ? "vezi pagina liniei" : "incident fără oprire", "", "#/line/" + i.lineId)),
    sect("Stare"),
    h("div.actions", null, allowedNext(i.status).map((to) => btn(INC_STATUS[to], () => advance(i, to), to === "resolved" || to === "closed" ? "primary" : ""))),
    sect("Detalii"),
    h("div.panel.pad.fields", null,
      field("Descriere", area(i.desc, (v) => (i.desc = v), { rows: 2, onchange: () => upd({}, null) })),
      picker("Responsabil", peopleItems(), i.ownerId, (v) => upd({ ownerId: v }, "Responsabil alocat"), { allowNone: true, noneLabel: "Fără persoană" }),
      h("div.fields.c2", null,
        field("Departament", select([["", "—"], ...doc.settings.departments.map((x) => [x, x])], i.dept, (v) => upd({ dept: v }, "Departament salvat"))),
        field("Severitate", select(Object.entries(SEVERITY), i.severity, (v) => upd({ severity: v }, "Severitate salvată")))),
      field("Acțiune efectuată", area(i.action, (v) => (i.action = v), { rows: 2, onchange: () => upd({}, "Salvat") }), "Obligatorie la închidere"),
      field("Observații", area(i.notes, (v) => (i.notes = v), { rows: 2, onchange: () => upd({}, "Salvat") }))),
    sect("Cronologie"),
    h("div.panel.pad.timesheet", null, timeRow("Început", "startAt"), timeRow("Notificat", "notifiedAt"), timeRow("Intervenție", "interventionAt"), timeRow("Rezolvat", "resolvedAt"), timeRow("Producție reluată", "resumedAt"), timeRow("Verificat", "verifiedAt")),
    sect("Legături"),
    h("div.actions", null,
      i.problemTaskId ? btn("Sarcina asociată", () => (location.hash = "#/tasks?open=" + i.problemTaskId), "", "link")
        : btn("Creează sarcină", () => taskFromSheet({ title: i.desc, lineId: i.lineId, source: { type: "incident", label: "#" + i.no }, onCreated: (t) => upd({ problemTaskId: t.id }, null) }), "", "list"),
      i.eightDId ? btn("8D asociat", () => (location.hash = "#/8d/" + i.eightDId), "", "layers")
        : btn("Deschide 8D", () => { const r = commit((dd) => { const x = create8D(dd, { title: i.desc || "Incident #" + i.no, lineId: i.lineId, source: { type: "incident", id: i.id } }, now()); i.eightDId = x.id; return x; }, "8D creat"); if (r.ok) location.hash = "#/8d/" + r.result.id; }, "", "layers"),
      i.stopsLine && statusAt(doc.events, i.lineId, now()) !== "run" && !isActive(i) ? btn("Linia a repornit", () => (location.hash = "#/line/" + i.lineId), "", "play") : null),
    h("details", { style: { marginTop: "16px" } }, h("summary.small.muted", null, "Istoric stări"), h("ul.small", null, i.history.map((x) => h("li", null, new Date(x.at).toLocaleString("ro-RO") + " · " + INC_STATUS[x.status])))));
}
function advance(i, to) {
  const tc = timeChoice("Ora " + INC_STATUS[to].toLowerCase());
  const sh = sheet({ title: INC_STATUS[to], body: h("div.fields", null, tc.el, to === "closed" && !String(i.action || "").trim() ? note("Completează „Acțiune efectuată” înainte de închidere.", "warn") : null),
    footer: [btn("Renunță", () => sh.close()), btn("Confirmă", () => {
      let at; try { at = tc.get(); } catch (e) { toast(e.message, { err: true }); return; }
      const r = commit(() => transition(i, to, now(), at), "Stare: " + INC_STATUS[to]);
      if (r.ok) sh.close();
    }, "primary")] });
}
function editTime(i, key, label) {
  const c = ctx();
  let hm = i[key] ? fmtHM(fromIso(i[key])) : fmtHM(now());
  const sh = sheet({ title: label, body: field("Ora", input(hm, (v) => (hm = v), { type: "time" })), footer: [
    i[key] ? btn("Șterge", () => { commit(() => (i[key] = key === "startAt" ? i[key] : null), "Ora ștearsă"); sh.close(); }, "ghost") : null,
    btn("Salvează", () => {
      if (!validHM(hm)) return toast("Ora nu este validă.", { err: true });
      const base = fromIso(i.startAt) || now();
      let d = atTime(c.workDay, c.shift, hm) || new Date(new Date(base).setHours(+hm.slice(0, 2), +hm.slice(3, 5), 0, 0));
      if (key !== "startAt" && d < fromIso(i.startAt)) return toast("Ora este înainte de începutul incidentului.", { err: true });
      commit(() => (i[key] = d.toISOString()), label + ": " + hm);
      sh.close();
    }, "primary")] });
}
function newIncident(q) {
  const doc = S.doc;
  const f = { lineId: q.get("line") || null, machineId: null, faultId: null, category: "", desc: "", ownerId: null, dept: "Mentenanță", severity: "medium", stopsLine: true };
  const tc = timeChoice("Început");
  const box = h("div.fields");
  const draw = () => put(box, 
    picker("1 · Linia", linesItems(), f.lineId, (v) => { f.lineId = v; f.machineId = null; draw(); }),
    f.lineId ? picker("2 · Mașina / operația", machineItems(f.lineId), f.machineId, (v) => { f.machineId = v; draw(); }, { allowNone: true, noneLabel: "Toată linia" }) : null,
    picker("3 · Defecțiunea", [...doc.master.faults.map((x) => ({ id: x.id, label: x.code + " · " + x.name })), ...doc.settings.incidentCategories.map((x) => ({ id: "cat:" + x, label: x, sub: "categorie" }))],
      f.faultId || (f.category ? "cat:" + f.category : null), (v) => { if (v?.startsWith("cat:")) { f.category = v.slice(4); f.faultId = null; } else { f.faultId = v; f.category = byId(doc.master.faults, v)?.name || ""; } draw(); }),
    field("Descriere", input(f.desc, (v) => (f.desc = v), { placeholder: "Ce se vede, unde" })),
    tc.el,
    picker("5 · Responsabil", peopleItems(), f.ownerId, (v) => { f.ownerId = v; draw(); }, { allowNone: true, noneLabel: "Doar departament" }),
    h("div.fields.c2", null, field("Departament", select([["", "—"], ...doc.settings.departments.map((x) => [x, x])], f.dept, (v) => (f.dept = v))),
      field("Severitate", select(Object.entries(SEVERITY), f.severity, (v) => (f.severity = v)))),
    h("label.check", null, h("input", { type: "checkbox", checked: f.stopsLine, onchange: (e) => (f.stopsLine = e.target.checked) }), "Linia este oprită (înregistrează și oprirea)"));
  draw();
  return h("div", null, backLink("#/incidents", "Incidente"), pageHead("Incident nou", "Linie → mașină → defecțiune → timp → responsabil"), box,
    h("div.sticky-actions", null, btn("Salvează incidentul", () => {
      let at; try { at = tc.get(); } catch (e) { return toast(e.message, { err: true }); }
      if (!f.lineId) return toast("Alege linia.", { err: true });
      const r = commit((d) => {
        const inc = createIncident(d.incidents, { ...f, startAt: at }, now());
        if (f.stopsLine && statusAt(d.events, f.lineId, at) !== "stop") { const ev = addEvent(d.events, { lineId: f.lineId, type: "stop", at, reason: f.desc || f.category, faultId: f.faultId, incidentId: inc.id }, now()); }
        return inc;
      }, "Incident înregistrat");
      if (r.ok) location.hash = "#/incident/" + r.result.id;
    }, "primary big")));
}
