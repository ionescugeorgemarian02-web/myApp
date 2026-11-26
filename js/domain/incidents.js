// Registrul de incidente: mașină de stare, durate, MTTR/MTBF, recurență, Pareto.
import { uid } from "../core/doc.js";
import { fromIso, MIN } from "../core/time.js";

export const INC_STATUS = {
  open: "Deschis", notified: "Notificat", diagnosis: "Diagnostic", intervention: "În intervenție",
  waiting: "Așteptare", resolved: "Rezolvat", verified: "Verificat", closed: "Închis",
};
const NEXT = {
  open: ["notified", "diagnosis", "intervention", "resolved"],
  notified: ["diagnosis", "intervention", "waiting", "resolved"],
  diagnosis: ["intervention", "waiting", "resolved"],
  intervention: ["waiting", "resolved"],
  waiting: ["intervention", "diagnosis", "resolved"],
  resolved: ["verified", "intervention"],
  verified: ["closed", "intervention"],
  closed: [],
};
export const SEVERITY = { low: "Scăzută", medium: "Medie", high: "Ridicată", safety: "Siguranță" };
export const allowedNext = (status) => NEXT[status] || [];
// Câmpul de timp completat automat la tranziție (dacă nu există deja).
const STAMP = { notified: "notifiedAt", intervention: "interventionAt", resolved: "resolvedAt", verified: "verifiedAt", closed: "closedAt" };

export function createIncident(list, data, now = new Date()) {
  if (!data.lineId) throw Error("Alege linia.");
  const inc = {
    id: uid(), no: list.length + 1, lineId: data.lineId, machineId: data.machineId || null, op: data.op || "", pnId: data.pnId || null,
    category: data.category || "", faultId: data.faultId || null, desc: data.desc || "", severity: data.severity || "medium",
    startAt: (data.startAt || now).toISOString?.() || data.startAt, notifiedAt: null, interventionAt: null, resolvedAt: null,
    resumedAt: null, verifiedAt: null, closedAt: null, ownerId: data.ownerId || null, dept: data.dept || "", status: "open",
    action: data.action || "", notes: data.notes || "", stopsLine: data.stopsLine !== false, problemTaskId: null, eightDId: null,
    createdAt: now.toISOString(), history: [{ at: now.toISOString(), status: "open" }],
  };
  list.push(inc);
  return inc;
}
export function transition(inc, to, now = new Date(), at = null) {
  if (!allowedNext(inc.status).includes(to)) throw Error("Tranziție nepermisă: " + INC_STATUS[inc.status] + " → " + INC_STATUS[to] + ".");
  if (to === "closed" && !String(inc.action || "").trim()) throw Error("Completează acțiunea efectuată înainte de închidere.");
  const f = STAMP[to];
  if (f && !inc[f]) inc[f] = (at || now).toISOString();
  inc.status = to;
  inc.history.push({ at: now.toISOString(), status: to });
  return inc;
}
const T = (s) => (s ? fromIso(s) : null);
export function durations(inc, now = new Date()) {
  const start = T(inc.startAt), notified = T(inc.notifiedAt), interv = T(inc.interventionAt), res = T(inc.resolvedAt), resumed = T(inc.resumedAt);
  const m = (a, b) => (a && b && b >= a ? (b - a) / MIN : null);
  const open = !["resolved", "verified", "closed"].includes(inc.status);
  return {
    open,
    elapsed: open ? m(start, now) : null,
    response: m(notified || start, interv),
    intervention: m(interv, res),
    repair: m(start, res), // pentru MTTR: de la apariție la rezolvare (definiție locală afișată)
    toResume: m(start, resumed),
  };
}
// MTTR pe incidentele rezolvate cu timpi completi. MTBF cere minim 2 defecte și timp de funcționare cunoscut.
export function reliability(incidents, { runMinutes = null } = {}) {
  const repairs = incidents.map((i) => durations(i).repair).filter((x) => x !== null);
  const failures = incidents.length;
  return {
    count: failures,
    mttr: repairs.length ? repairs.reduce((a, b) => a + b, 0) / repairs.length : null,
    mttrN: repairs.length,
    mtbf: failures >= 2 && runMinutes > 0 ? runMinutes / failures : null,
    mtbfWhy: failures < 2 ? "Sunt necesare cel puțin 2 defecte în perioadă." : !(runMinutes > 0) ? "Timpul de funcționare nu este cunoscut." : null,
  };
}
// Recurență: aceeași mașină și același cod de defect, de cel puțin `min` ori în `days` zile.
export function recurring(incidents, now = new Date(), days = 7, min = 3) {
  const since = now.getTime() - days * 1440 * MIN;
  const groups = new Map();
  for (const i of incidents) {
    if (T(i.startAt) < since) continue;
    const k = (i.machineId || i.lineId) + "|" + (i.faultId || i.category || "—");
    groups.set(k, [...(groups.get(k) || []), i]);
  }
  return [...groups.values()].filter((g) => g.length >= min).map((g) => ({ key: g[0], count: g.length, items: g }));
}
export function pareto(items, keyOf, valueOf = () => 1) {
  const m = new Map();
  for (const it of items) {
    const k = keyOf(it) || "Necodificat";
    m.set(k, (m.get(k) || 0) + (valueOf(it) || 0));
  }
  const rows = [...m].map(([key, value]) => ({ key, value })).sort((a, b) => b.value - a.value);
  const total = rows.reduce((a, r) => a + r.value, 0);
  let cum = 0;
  return rows.map((r) => ({ ...r, cum: total ? (cum += r.value) / total : null }));
}
