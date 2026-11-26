// Elemente comune: stare linie, alegerea orei reale, acțiuni rapide, flux NOK → sarcină, schimb afișat.
import { h, put, btn, tag, field, input, area, select, seg, sheet, pick, picker, toast, icon, item } from "../ui/kit.js";
import { S, ctx, commit, now, lineName, byId } from "../state.js";
import { LINE_STATUS, addEvent } from "../domain/lines.js";
import { createTask, PRIORITY, SOURCES } from "../domain/tasks.js";
import { createIncident } from "../domain/incidents.js";
import { atTime, fmtHM, day, shiftKey, addDays, fmtDay, previousShift, nextShift, validHM } from "../core/time.js";

export const statusTag = (st) => tag(LINE_STATUS[st]?.tone || "unknown", LINE_STATUS[st]?.label || st);
export const linesItems = () => S.doc.master.lines.filter((l) => l.active !== false).map((l) => ({ id: l.id, label: l.name, sub: l.zone || "" }));
export const peopleItems = (filter = () => true) => S.doc.master.people.filter((p) => p.active !== false && filter(p)).map((p) => ({ id: p.id, label: p.name, sub: p.category || "" }));
export const pnItems = (lineId) => {
  const line = byId(S.doc.master.lines, lineId);
  const all = S.doc.master.pns;
  const own = line?.pnIds?.length ? all.filter((p) => line.pnIds.includes(p.id)) : all;
  return own.map((p) => ({ id: p.id, label: p.code, sub: p.name }));
};
export const machineItems = (lineId) => (byId(S.doc.master.lines, lineId)?.machines || []).map((m) => ({ id: m.id, label: m.name, sub: m.op && m.op !== m.name ? m.op : "" }));

// „Acum” sau „Ora reală” (în fereastra schimbului). Returnează un getter care dă Date sau aruncă.
export function timeChoice(label = "Când") {
  let mode = "now", hm = fmtHM(now());
  const box = h("div.field");
  const draw = () => put(box, h("span", null, label),
    seg([["now", "Acum"], ["real", "Ora reală"]], mode, (v) => { mode = v; draw(); }),
    mode === "real" ? input(hm, (v) => (hm = v), { type: "time", "aria-label": "Ora reală", step: 60 }) : null,
    mode === "real" ? h("small", null, "Ora la care s-a întâmplat. Indicatorii se recalculează.") : null);
  draw();
  const get = () => {
    if (mode === "now") return now();
    const c = ctx();
    if (!validHM(hm)) throw Error("Ora nu este validă.");
    const d = atTime(c.workDay, c.shift, hm);
    if (!d) throw Error("Ora nu este în schimbul afișat.");
    if (d > now()) throw Error("Ora reală nu poate fi în viitor.");
    return d;
  };
  return { el: box, get };
}

// Înregistrare de stare: pornește / oprește / nu rulează / changeover / reia. Înregistrare digitală, nu comandă.
export function lineEventSheet(lineId, type) {
  const L = byId(S.doc.master.lines, lineId);
  const tc = timeChoice();
  let reason = "", faultId = null, pnId = null, withIncident = type === "stop";
  const titles = { run: "Pornește linia", stop: "Oprește linia", notrunning: "Linia nu rulează", changeover: "Changeover" };
  const body = h("div.fields");
  const draw = () => put(body, 
    h("p.muted.small", null, L.name + " · înregistrare digitală, nu comandă către utilaj."),
    tc.el,
    type === "changeover" || type === "run" ? picker("PN", pnItems(lineId), pnId, (v) => { pnId = v; draw(); }, { allowNone: true, noneLabel: "Fără schimbare PN" }) : null,
    type === "stop" ? picker("Cod de defect", S.doc.master.faults.map((f) => ({ id: f.id, label: f.code + " · " + f.name })), faultId, (v) => { faultId = v; draw(); }, { allowNone: true, noneLabel: "Necodificat" }) : null,
    type !== "run" ? field("Motiv", input(reason, (v) => (reason = v), { placeholder: type === "notrunning" ? "Ex. lipsă material" : "Ce s-a întâmplat" })) : null,
    type === "stop" ? h("label.check", null, h("input", { type: "checkbox", checked: withIncident, onchange: (e) => (withIncident = e.target.checked) }), "Deschide și un incident") : null);
  draw();
  const sh = sheet({ title: titles[type], body, footer: [btn("Renunță", () => sh.close()), btn("Înregistrează", () => {
    let at;
    try { at = tc.get(); } catch (e) { toast(e.message, { err: true }); return; }
    const fault = byId(S.doc.master.faults, faultId);
    const r = commit((d) => {
      const ev = addEvent(d.events, { lineId, type, at, reason: reason || fault?.name || "", faultId, pnId }, now());
      if (withIncident) {
        const inc = createIncident(d.incidents, { lineId, faultId, category: fault?.name || "", desc: reason || fault?.name || "", startAt: at, pnId }, now());
        ev.incidentId = inc.id;
        return inc;
      }
      return ev;
    }, L.name + ": " + LINE_STATUS[type].label.toLowerCase() + " de la " + fmtHM(at));
    if (r.ok) { sh.close(); if (withIncident) location.hash = "#/incident/" + r.result.id; }
  }, "primary")] });
}

// NOK / problemă → sarcină cu responsabil și termen. Returnează id-ul sarcinii prin callback.
export function taskFromSheet({ title = "", source = { type: "manual" }, lineId = null, desc = "", onCreated, heading = "Acțiune nouă" } = {}) {
  const c = ctx();
  const f = { title, desc, ownerId: null, dept: "", priority: "high", due: c.workDay, lineId, verifierId: null };
  const body = h("div.fields");
  const draw = () => put(body, 
    field("Ce trebuie făcut", input(f.title, (v) => (f.title = v), { placeholder: "Verb + obiect" })),
    field("Detalii", area(f.desc, (v) => (f.desc = v), { rows: 2 })),
    picker("Responsabil", peopleItems(), f.ownerId, (v) => { f.ownerId = v; draw(); }, { allowNone: true, noneLabel: "Doar departament" }),
    h("div.fields.c2", null,
      field("Departament", select([["", "—"], ...S.doc.settings.departments.map((d) => [d, d])], f.dept, (v) => (f.dept = v))),
      field("Termen", input(f.due, (v) => (f.due = v), { type: "date" }))),
    field("Prioritate", seg(Object.entries(PRIORITY), f.priority, (v) => { f.priority = v; draw(); })),
    picker("Linie", linesItems(), f.lineId, (v) => { f.lineId = v; draw(); }, { allowNone: true, noneLabel: "Fără linie" }),
    h("p.faint.tiny", null, "Sursa: " + (SOURCES[source.type] || source.type) + (source.label ? " · " + source.label : "") + ". Aplicația este locală: alocarea nu trimite notificări."));
  draw();
  const sh = sheet({ title: heading, body, footer: [btn("Renunță", () => sh.close()), btn("Creează acțiunea", () => {
    const r = commit((d) => createTask(d.tasks, { ...f, source, shiftKey: c.sk }, now()), "Acțiune creată");
    if (r.ok) { sh.close(); onCreated?.(r.result); }
  }, "primary")] });
}

// Selector de schimb (istoric / următorul) — vizualizare, nu modificare.
export function shiftSheet() {
  const c = ctx();
  const shifts = S.doc.settings.shifts;
  const items = [];
  let cur = { workDay: c.workDay, shift: c.shift };
  for (let i = 0; i < 3; i++) cur = previousShift(cur.workDay, cur.shift, shifts);
  for (let i = 0; i < 6; i++) {
    items.push({ id: shiftKey(cur.workDay, cur.shift.id), label: fmtDay(cur.workDay, true) + " · " + cur.shift.name, sub: cur.shift.start + "–" + cur.shift.end });
    cur = nextShift(cur.workDay, cur.shift, shifts);
  }
  pick({ title: "Schimbul afișat", items, value: c.sk, allowNone: true, noneLabel: "Schimbul curent (automat)", onPick: (v) => { S.view = v; S.render(); } });
}

// Acțiuni rapide (FAB): raportare, stare linie, incident, sarcină, NOK.
export function quickActions() {
  const go = (href) => { sh.close(); location.hash = href; };
  const lineThen = (title, fn) => { sh.close(); pick({ title, items: linesItems(), onPick: fn }); };
  const sh = sheet({ title: "Acțiune rapidă", body: h("div.qa", null,
    qa("chart", "Raport orar", "Producția pe ora curentă", () => lineThen("Raport orar · linia", (id) => (location.hash = "#/report/" + id))),
    qa("stop", "Oprire linie", "Cu ora reală și cod de defect", () => lineThen("Oprire · linia", (id) => lineEventSheet(id, "stop"))),
    qa("play", "Pornire / reluare", "Linia rulează din nou", () => lineThen("Pornire · linia", (id) => lineEventSheet(id, "run"))),
    qa("wrench", "Incident", "Linie, mașină, defect, responsabil", () => go("#/incident/new")),
    qa("list", "Sarcină", "Cine, ce, până când", () => { sh.close(); taskFromSheet({ heading: "Sarcină nouă" }); }),
    qa("alert", "Observație NOK", "Problemă → responsabil → termen", () => { sh.close(); taskFromSheet({ heading: "Observație NOK", source: { type: "gemba", label: "Observație rapidă" } }); }),
    qa("check", "First Off", "Confirmă prima piesă", () => lineThen("First Off · linia", (id) => (location.hash = "#/audit/new/firstoff?line=" + id))),
    qa("route", "Gemba walk", "Observații TIMWOOD", () => go("#/audit/new/gemba"))) });
}
function qa(ic, title, sub, onClick) {
  return h("button.qa-i", { type: "button", onclick: onClick }, h("span.qa-ic", null, icon(ic)), h("span", null, h("b", null, title), h("small", null, sub)));
}
export function backLink(href, label) {
  return h("a.crumb", { href }, icon("left"), label);
}
export function pageHead(title, sub, actions) {
  return h("div.head", null, h("div", null, h("h1", null, title), sub ? h("p", null, sub) : null), actions ? h("div.actions", null, actions) : null);
}
export const today = () => day(now());
export { addDays };
