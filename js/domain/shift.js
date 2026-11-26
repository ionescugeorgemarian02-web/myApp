// Situația schimbului calculată din date sursă: o singură funcție folosită de Azi, asistent și predare.
import { shiftKey, shiftWindow, breaksOf, MIN } from "../core/time.js";
import { nn } from "../core/num.js";
import { slotRows, summarize } from "./reports.js";
import { statusAt, statusMinutes, lastEvent } from "./lines.js";
import { sumOee, ratiosOf } from "./oee.js";
import { total, hourlyPlan } from "./plan.js";
import { presentIds, assignmentsOf, coverage } from "./workforce.js";

export const linePlan = (doc, sk, lineId) => doc.plans[sk]?.[lineId] || null;
export const isPlanned = (p) => !!p && !p.notPlanned && (p.runs || []).length > 0;
export function pnIctFn(doc) {
  const m = new Map(doc.master.pns.map((p) => [p.id, nn(p.ict)]));
  return (id) => m.get(id) ?? null;
}
export function lineState(doc, workDay, shift, line, now) {
  const sk = shiftKey(workDay, shift.id);
  const plan = linePlan(doc, sk, line.id);
  const planned = isPlanned(plan);
  const reports = doc.reports[sk]?.[line.id] || {};
  const w = shiftWindow(workDay, shift);
  const rows = slotRows({ plan, reports, events: doc.events, lineId: line.id, workDay, shift, now,
    grace: doc.settings.thresholds.reportGraceMin, pnIct: pnIctFn(doc) });
  const sum = summarize(rows, now);
  const when = now < w.to ? now : new Date(w.to - 1);
  let status = statusAt(doc.events, line.id, when);
  if (status === "unknown" && !planned) status = "notplanned";
  const last = lastEvent(doc.events, line.id, when);
  const oeeParts = rows.filter((r) => r.oee).map((r) => r.oee);
  const oee = oeeParts.length ? ratiosOf(sumOee(oeeParts)) : null;
  const statusSince = last ? (when - new Date(last.at)) / MIN : null;
  const hp = hourlyPlan(plan, workDay, shift);
  const curSlot = rows.find((r) => now >= r.slot.from && now < r.slot.to) || null;
  const mins = statusMinutes(doc.events, line.id, w.from, new Date(Math.min(now, w.to)), breaksOf(workDay, shift));
  const openInc = doc.incidents.filter((i) => i.lineId === line.id && !["resolved", "verified", "closed"].includes(i.status));
  return {
    line, sk, plan, planned, rows, sum, status, last, statusSince, oee, oeeSlots: oeeParts.length,
    planTotal: hp ? total(hp) : null, curSlot, mins, openInc,
    activePn: last?.pnId || plan?.runs?.[0]?.pnId || null,
    attainment: sum.repPlan > 0 ? sum.repActual / sum.repPlan : null,
  };
}
export function shiftState(doc, workDay, shift, now) {
  const sk = shiftKey(workDay, shift.id);
  const w = shiftWindow(workDay, shift);
  const lines = doc.master.lines.filter((l) => l.active !== false).map((l) => lineState(doc, workDay, shift, l, now));
  const planned = lines.filter((l) => l.planned);
  const oeeParts = lines.flatMap((l) => l.rows.filter((r) => r.oee).map((r) => r.oee));
  const present = presentIds(doc, sk);
  const assigned = assignmentsOf(doc, sk);
  const cov = coverage(doc, sk, planned.map((l) => l.line.id));
  const sumOrNull = (arr) => (arr.length && arr.every((x) => x !== null) ? arr.reduce((a, b) => a + b, 0) : null);
  return {
    sk, workDay, shift, from: w.from, to: w.to, now,
    elapsed: Math.max(0, Math.min(1, (now - w.from) / (w.to - w.from))),
    remainingMin: Math.max(0, (w.to - now) / MIN),
    lines, planned,
    planTotal: sumOrNull(planned.map((l) => l.planTotal)),
    planToNow: planned.reduce((a, l) => a + l.sum.planToNow, 0),
    actual: sumOrNull(planned.map((l) => l.sum.actual)),
    actualPartial: planned.reduce((a, l) => a + (l.sum.actual || 0), 0),
    actualMissing: planned.filter((l) => l.sum.actual === null).length,
    repPlan: planned.reduce((a, l) => a + l.sum.repPlan, 0),
    repActual: planned.reduce((a, l) => a + l.sum.repActual, 0),
    delta: planned.some((l) => l.sum.delta !== null) ? planned.reduce((a, l) => a + (l.sum.delta || 0), 0) : null,
    missingClosed: planned.reduce((a, l) => a + l.sum.missingClosed, 0),
    oee: oeeParts.length ? ratiosOf(sumOee(oeeParts)) : null,
    counts: {
      run: lines.filter((l) => l.status === "run").length,
      stop: lines.filter((l) => l.status === "stop" || l.status === "notrunning").length,
      changeover: lines.filter((l) => l.status === "changeover").length,
      notplanned: lines.filter((l) => l.status === "notplanned").length,
      unknown: lines.filter((l) => l.status === "unknown").length,
    },
    people: {
      marked: Object.keys(doc.attendance[sk] || {}).length,
      present: present.size,
      assigned: new Set(assigned.map((a) => a.personId)).size,
      need: cov.reduce((a, c) => a + c.need, 0),
      gap: cov.reduce((a, c) => a + c.gap, 0),
      coverage: cov,
    },
  };
}
