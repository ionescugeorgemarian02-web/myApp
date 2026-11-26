// Raportarea orară: plan vs. realizat, cumulat, stări, OEE pe interval.
import { slotsOf, breaksOf, MIN } from "../core/time.js";
import { nn, sumKnown } from "../core/num.js";
import { hourlyPlan, plannedWindows, hourlyByRun } from "./plan.js";
import { statusMinutes } from "./lines.js";
import { slotOee } from "./oee.js";

export const SLOT_STATE = { complete: "Completat", incomplete: "Incomplet", overdue: "Restant", na: "Neaplicabil", pending: "Urmează" };
export function splitGood(s) {
  const t = nn(s.total, true), sc = nn(s.scrap, true), rw = nn(s.rework, true);
  if (t === null || sc === null || rw === null || sc + rw > t) return null;
  return t - sc - rw;
}
export function entryTotals(entry) {
  const splits = entry?.splits || [];
  const tot = sumKnown(splits.map((s) => nn(s.total, true)));
  const scrap = sumKnown(splits.map((s) => nn(s.scrap, true)));
  const rework = sumKnown(splits.map((s) => nn(s.rework, true)));
  const good = sumKnown(splits.map(splitGood));
  return { total: splits.length && !tot.missing ? tot.sum : null, scrap: splits.length && !scrap.missing ? scrap.sum : null,
    rework: splits.length && !rework.missing ? rework.sum : null, good: splits.length && !good.missing ? good.sum : null,
    complete: splits.length > 0 && !tot.missing && !scrap.missing && !rework.missing && !good.missing };
}
// Minutele planificate dintr-un interval (intersecția cu rulările, fără pauze).
function plannedMinutes(wins, a, b, br) {
  let m = 0;
  for (const w of wins) {
    const s = new Date(Math.max(a, w.from)), e = new Date(Math.min(b, w.to));
    if (e > s) m += (e - s) / MIN - br.reduce((x, k) => x + Math.max(0, (Math.min(e, k.to) - Math.max(s, k.from)) / MIN), 0);
  }
  return Math.max(0, m);
}
export function slotRows({ plan, reports = {}, events = [], lineId, workDay, shift, now, grace = 15, pnIct = () => null }) {
  const slots = slotsOf(workDay, shift);
  const hp = hourlyPlan(plan, workDay, shift);
  const wins = plannedWindows(plan, workDay, shift);
  const br = breaksOf(workDay, shift);
  let cumPlan = 0, cumActual = 0, cumKnown = true;
  return slots.map((slot) => {
    const entry = Object.hasOwn(reports, slot.i) ? reports[slot.i] : null;
    const p = hp ? hp[slot.i] : null;
    const tt = entryTotals(entry);
    const ppt = plannedMinutes(wins, slot.from, slot.to, br);
    const end = new Date(Math.min(slot.to, now));
    const mins = end > slot.from ? statusMinutes(events, lineId, slot.from, end, br) : null;
    let state;
    if (entry?.na) state = "na";
    else if (tt.complete) state = "complete";
    else if (entry?.splits?.length) state = "incomplete";
    else if (!ppt && !p) state = "na";
    else if (now > new Date(slot.to.getTime() + grace * MIN)) state = "overdue";
    else state = "pending";
    if (p !== null) cumPlan += p;
    const closedOrReported = slot.to <= now || tt.total !== null;
    if (tt.total !== null) cumActual += tt.total;
    else if (closedOrReported && state !== "na") cumKnown = false;
    const counts = (entry?.splits || []).map((s) => ({ ict: pnIct(s.pnId), total: nn(s.total, true), good: splitGood(s) }));
    // Pentru OEE contează doar stările din ferestrele planificate (nu și din restul orei).
    let oee = null;
    if (tt.complete && ppt > 0) {
      const m = { run: 0, stop: 0, changeover: 0, notrunning: 0, unknown: 0 };
      for (const w of wins) {
        const a = new Date(Math.max(slot.from, w.from)), b = new Date(Math.min(slot.to, w.to));
        if (b > a) { const x = statusMinutes(events, lineId, a, b, br); for (const k in m) m[k] += x[k]; }
      }
      oee = slotOee({ ppt, ...m, counts });
    }
    return {
      slot, entry, state, plan: p, actual: tt.total, good: tt.good, scrap: tt.scrap, rework: tt.rework,
      delta: p !== null && tt.total !== null ? tt.total - p : null,
      cumPlan: hp ? cumPlan : null, cumActual: cumKnown ? cumActual : null,
      cumDelta: hp && cumKnown ? cumActual - cumPlan : null,
      ppt, downtime: mins ? mins.stop + mins.notrunning : null, changeover: mins ? mins.changeover : null, unknownMin: mins ? mins.unknown : null, oee,
    };
  });
}
// PN-ul activ planificat la ora dată (pentru precompletare).
export function plannedPnAt(plan, workDay, shift, when) {
  for (const { run } of hourlyByRun(plan, workDay, shift)) {
    const w = plannedWindows({ runs: [run] }, workDay, shift)[0];
    if (w && when >= w.from && when < w.to) return run.pnId || null;
  }
  return plan?.runs?.[0]?.pnId || null;
}
export function summarize(rows, now) {
  const elapsed = rows.filter((r) => r.slot.from <= now);
  const planToNow = elapsed.reduce((a, r) => a + (r.plan || 0), 0);
  const known = elapsed.filter((r) => r.actual !== null);
  // Comparația plan–realizat se face doar pe orele raportate; orele închise fără raport se numără separat.
  const rep = rows.filter((r) => r.actual !== null && r.plan !== null);
  return {
    repPlan: rep.reduce((a, r) => a + r.plan, 0),
    repActual: rep.reduce((a, r) => a + r.actual, 0),
    delta: rep.length ? rep.reduce((a, r) => a + r.actual - r.plan, 0) : null,
    missingClosed: rows.filter((r) => r.state === "overdue" || (r.state === "incomplete" && r.actual === null && r.slot.to <= now)).length, // fără bucăți raportate; lipsa rebutului se vede la „incomplete”
    planTotal: rows.every((r) => r.plan !== null) ? rows.reduce((a, r) => a + r.plan, 0) : null,
    planToNow,
    actual: known.length ? known.reduce((a, r) => a + r.actual, 0) : null,
    overdue: rows.filter((r) => r.state === "overdue").length,
    incomplete: rows.filter((r) => r.state === "incomplete").length,
    complete: rows.filter((r) => r.state === "complete").length,
    scrap: sumKnown(rows.filter((r) => r.actual !== null).map((r) => r.scrap)),
    downtime: rows.reduce((a, r) => a + (r.downtime || 0), 0),
  };
}
