// Starea liniilor din evenimente înregistrate (nu comenzi fizice). O singură stare la un moment dat:
// minutele de oprire nu se pot dubla, oricâte incidente se leagă de aceeași oprire.
import { uid } from "../core/doc.js";
import { productiveMin, fromIso } from "../core/time.js";

export const LINE_STATUS = {
  run: { label: "În funcțiune", tone: "run" },
  stop: { label: "Oprită", tone: "stop" },
  changeover: { label: "Changeover", tone: "change" },
  notrunning: { label: "Nu rulează", tone: "warn" },
  notplanned: { label: "Neplanificată", tone: "idle" },
  unknown: { label: "Status necunoscut", tone: "unknown" },
};
const t = (e) => (e.at instanceof Date ? e.at : fromIso(e.at));
export function lineEvents(events, lineId) {
  return events.filter((e) => e.lineId === lineId && !e.void)
    .sort((a, b) => t(a) - t(b) || String(a.recordedAt).localeCompare(String(b.recordedAt)));
}
export function statusAt(events, lineId, when) {
  let s = "unknown";
  for (const e of lineEvents(events, lineId)) {
    if (t(e) <= when) s = e.type; else break;
  }
  return s;
}
export function lastEvent(events, lineId, when) {
  let last = null;
  for (const e of lineEvents(events, lineId)) if (t(e) <= when) last = e; else break;
  return last;
}
// Minute productive (fără pauze) pe stare, în [from, to).
export function statusMinutes(events, lineId, from, to, breaks = []) {
  const out = { run: 0, stop: 0, changeover: 0, notrunning: 0, unknown: 0 };
  if (!(to > from)) return out;
  const evs = lineEvents(events, lineId);
  let cur = "unknown", cursor = from;
  for (const e of evs) {
    const et = t(e);
    if (et <= from) { cur = e.type; continue; }
    if (et >= to) break;
    out[cur in out ? cur : "unknown"] += productiveMin(cursor, et, breaks);
    cur = e.type;
    cursor = et;
  }
  out[cur in out ? cur : "unknown"] += productiveMin(cursor, to, breaks);
  return out;
}
// Segmente pentru timeline (Gantt).
export function segments(events, lineId, from, to) {
  const evs = lineEvents(events, lineId);
  const out = [];
  let cur = "unknown", start = from, ev = null;
  for (const e of evs) {
    const et = t(e);
    if (et <= from) { cur = e.type; ev = e; continue; }
    if (et >= to) break;
    out.push({ status: cur, from: start, to: et, event: ev });
    cur = e.type; start = et; ev = e;
  }
  out.push({ status: cur, from: start, to, event: ev });
  return out.filter((s) => s.to > s.from);
}
export function addEvent(events, ev, now = new Date()) {
  const at = ev.at instanceof Date ? ev.at : fromIso(ev.at);
  if (!at) throw Error("Ora evenimentului nu este validă.");
  if (!LINE_STATUS[ev.type] || ev.type === "notplanned" || ev.type === "unknown") throw Error("Tip de eveniment necunoscut.");
  const e = {
    id: uid(), lineId: ev.lineId, type: ev.type, at: at.toISOString(), recordedAt: now.toISOString(),
    pnId: ev.pnId || null, reason: ev.reason || "", faultId: ev.faultId || null, incidentId: ev.incidentId || null,
    note: ev.note || "", void: false, history: [],
  };
  events.push(e);
  return e;
}
// Corecție cu istoric: ora reală, motiv sau anulare.
export function correctEvent(events, id, patch, now = new Date()) {
  const e = events.find((x) => x.id === id);
  if (!e) throw Error("Evenimentul nu există.");
  const change = { changedAt: now.toISOString() };
  for (const k of ["at", "type", "reason", "pnId", "void", "note"]) {
    if (patch[k] === undefined) continue;
    const v = k === "at" ? (patch.at instanceof Date ? patch.at : fromIso(patch.at)).toISOString() : patch[k];
    if (v !== e[k]) { change[k] = { from: e[k], to: v }; e[k] = v; }
  }
  if (Object.keys(change).length > 1) e.history = [...(e.history || []), change];
  return e;
}
