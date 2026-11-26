// Starea aplicației: documentul, contextul schimbului și comiterea modificărilor (cu Undo).
import { saveDoc } from "./core/store.js";
import { currentShift, shiftKey, parseShiftKey, shiftWindow, day, myShiftOccurrence } from "./core/time.js";
import { toast } from "./ui/kit.js";
import { restoreInto } from "./core/restore.js";

export const S = { doc: null, training: false, view: null, render: () => {}, clockOffset: 0 };
export const now = () => new Date(Date.now() + S.clockOffset);

// Schimbul afișat: cel curent, sau unul ales explicit (istoric / planificare).
export function ctx() {
  const shifts = S.doc.settings.shifts;
  let workDay, shift;
  if (S.view) {
    const p = parseShiftKey(S.view);
    shift = shifts.find((x) => x.id === p.shiftId);
    workDay = p.workDay;
  }
  // Schimbul meu (setare): apariția în desfășurare sau următoarea; altfel, schimbul după ceas.
  if (!shift && S.doc.settings.myShiftId) {
    const o = myShiftOccurrence(now(), shifts, S.doc.settings.myShiftId);
    if (o) ({ workDay, shift } = o);
  }
  if (!shift) {
    const c = currentShift(now(), shifts);
    if (c) ({ workDay, shift } = c);
    else { shift = shifts[0]; workDay = day(now()); }
  }
  const w = shiftWindow(workDay, shift);
  return { workDay, shift, sk: shiftKey(workDay, shift.id), live: now() >= w.from && now() < w.to, upcoming: now() < w.from, ...w };
}
let version = 0;
// Aplică o modificare, salvează, randează. La eroare: revenire în loc. Undo doar dacă nu au urmat alte modificări.
export function commit(fn, msg, { undo = true } = {}) {
  const snapshot = structuredClone(S.doc);
  let result;
  try {
    result = fn(S.doc);
  } catch (e) {
    restoreInto(S.doc, snapshot);
    S.render();
    toast(e.message || "Operația nu a reușit.", { err: true });
    return { ok: false, error: e };
  }
  const mine = ++version;
  saveDoc(S.doc).catch((e) => toast(e.message, { err: true, ms: 8000 }));
  S.render();
  if (msg) toast(msg, undo ? { undo: () => {
    if (version !== mine) { toast("Anularea nu mai este posibilă: au urmat alte modificări.", { err: true }); return; }
    restoreInto(S.doc, snapshot); version++; saveDoc(S.doc); S.render(); toast("Modificare anulată.");
  } } : {});
  return { ok: true, result };
}
export const byId = (list, id) => list.find((x) => x.id === id) || null;
export const lineName = (id) => byId(S.doc.master.lines, id)?.name || "—";
export const personName = (id) => byId(S.doc.master.people, id)?.name || "—";
export const pnCode = (id) => byId(S.doc.master.pns, id)?.code || "—";
export function machineOf(lineId, machineId) {
  return byId(S.doc.master.lines, lineId)?.machines.find((m) => m.id === machineId) || null;
}
export const VERSION = "5.0";
export function applyTheme() {
  const t = S.doc.settings.theme;
  if (t === "light" || t === "dark") document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
}
