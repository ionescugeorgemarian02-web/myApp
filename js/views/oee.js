// PERFORMANȚĂ — OEE (A, P, Q separat), plan attainment, FPY, Pareto, heatmap, trend. Fiecare cifră are drilldown.
import { h, btn, kpi, sect, seg, picker, note, empty, table, field, input, plural, tag } from "../ui/kit.js";
import { S, ctx, now, byId } from "../state.js";
import { fmtN, fmtPct } from "../core/num.js";
import { addDays, shiftKey, shiftWindow, fmtDay, fmtHM, MIN } from "../core/time.js";
import { lineState } from "../domain/shift.js";
import { sumOee, ratiosOf, oeeBand, performanceSuspect } from "../domain/oee.js";
import { segments } from "../domain/lines.js";
import { pareto } from "../domain/incidents.js";
import { apq, planActual, cumulative, paretoBars, heatmap, trend, timeSplit, oeeGauge } from "../ui/charts.js";
import { aggregateRows } from "./today.js";
import { linesItems, pageHead, prodTabs } from "./common.js";

let period = "shift", lineF = null, pnF = null, from = null, to = null;
export function oeeView(_p, q) {
  if (q.get("line")) { lineF = q.get("line"); history.replaceState(null, "", "#/oee"); }
  const doc = S.doc, c = ctx(), t = now();
  const target = doc.settings.thresholds.oeeTarget ?? 85;
  if (!doc.master.lines.length) return h("div", null, pageHead("Performanță"), empty("Fără date", "Configurează liniile și PN-urile.", null));
  from ||= addDays(c.workDay, -6); to ||= c.workDay;
  const days = { shift: 0, day: 1, week: 7, month: 30 }[period];
  const keys = [];
  const addKey = (wd) => { for (const sh of doc.settings.shifts) if (shiftWindow(wd, sh).from <= t && doc.plans[shiftKey(wd, sh.id)]) keys.push({ workDay: wd, shift: sh }); };
  if (period === "shift") keys.push({ workDay: c.workDay, shift: c.shift });
  else if (period === "custom") { for (let wd = from, n = 0; wd <= to && n < 400; wd = addDays(wd, 1), n++) addKey(wd); }
  else for (let i = days - 1; i >= 0; i--) addKey(addDays(c.workDay, -i));
  const lines = doc.master.lines.filter((l) => l.active !== false && (!lineF || l.id === lineF));
  const states = keys.flatMap((k) => lines.map((l) => ({ k, L: lineState(doc, k.workDay, k.shift, l, t) }))).filter((x) => x.L.planned);
  // Filtru PN: doar orele în care s-a produs exclusiv PN-ul ales (orele mixte se exclud, timpul nu se împarte arbitrar).
  const pnOk = (r) => !pnF || (r.entry?.splits?.length && r.entry.splits.every((sp) => sp.pnId === pnF));
  const mixedExcluded = pnF ? states.flatMap((x) => x.L.rows).filter((r) => r.entry?.splits?.some((sp) => sp.pnId === pnF) && !pnOk(r)).length : 0;
  if (pnF) for (const x of states) x.L = { ...x.L, rows: x.L.rows.filter(pnOk) };
  const slots = states.flatMap((x) => x.L.rows);
  const oeeParts = slots.filter((r) => r.oee).map((r) => r.oee);
  const agg = oeeParts.length ? sumOee(oeeParts) : null;
  const r = agg ? ratiosOf(agg) : null;
  const closed = slots.filter((s) => s.slot.to <= t && s.state !== "na");
  const planDone = closed.reduce((a, s) => a + (s.plan || 0), 0);
  const actDone = closed.filter((s) => s.actual !== null).reduce((a, s) => a + s.actual, 0);
  const missing = closed.filter((s) => s.actual === null).length;
  const tot = slots.filter((s) => s.actual !== null && s.good !== null);
  const sumT = tot.reduce((a, s) => a + s.actual, 0), sumG = tot.reduce((a, s) => a + s.good, 0), sumScrap = tot.reduce((a, s) => a + s.scrap, 0);
  // Pareto opriri pe motiv (minute), din segmentele de stare.
  const stops = [];
  for (const { k, L } of states) {
    const w = shiftWindow(k.workDay, k.shift);
    for (const g of segments(doc.events, L.line.id, w.from, new Date(Math.min(t, w.to)))) if (g.status === "stop" || g.status === "notrunning")
      stops.push({ key: g.event?.reason || byId(doc.master.faults, g.event?.faultId)?.name || "Necodificat", min: (g.to - g.from) / MIN, line: L.line.name });
  }
  const scrapByLine = pareto(states.flatMap((x) => x.L.rows.filter((r2) => r2.scrap).map((r2) => ({ k: x.L.line.name, v: r2.scrap }))), (x) => x.k, (x) => x.v);
  const mins = states.reduce((a, x) => { for (const k2 of Object.keys(a)) a[k2] += x.L.mins[k2] || 0; return a; }, { run: 0, stop: 0, changeover: 0, notrunning: 0, unknown: 0 });
  // Eficiența personalului: bucăți pe operator-oră (alocări × ore raportate).
  const opHours = states.reduce((a, x) => a + (doc.assignments[x.L.sk] || []).filter((as) => as.lineId === x.L.line.id && as.role === "operator").length * x.L.rows.filter((r2) => r2.actual !== null).length, 0);
  const trendPts = period === "shift" ? [] : [...new Set(keys.map((k) => k.workDay))].map((wd) => {
    const parts = states.filter((x) => x.k.workDay === wd).flatMap((x) => x.L.rows.filter((r2) => r2.oee).map((r2) => r2.oee));
    return { label: wd.slice(8) + "." + wd.slice(5, 7), v: parts.length ? ratiosOf(sumOee(parts)).oee : null };
  });
  const shiftLines = period === "shift" ? states.map((x) => x.L) : [];
  return h("div", null,
    prodTabs("oee"),
    pageHead("Performanță OEE", "A, P și Q separat, după oee.com · „—” înseamnă date insuficiente, nu zero"),
    h("div.filters", null, seg([["shift", "Schimb"], ["day", "24 h"], ["week", "7 zile"], ["month", "30 zile"], ["custom", "Perioadă"]], period, (v) => { period = v; S.render(); }),
      h("div.fields.c2", null, picker("Linie", linesItems(), lineF, (v) => { lineF = v; S.render(); }, { allowNone: true, noneLabel: "Toate liniile" }),
        picker("PN", doc.master.pns.map((x) => ({ id: x.id, label: x.code, sub: x.name })), pnF, (v) => { pnF = v; S.render(); }, { allowNone: true, noneLabel: "Toate PN-urile" }))),
    period === "custom" ? h("div.fields.c2", null, field("De la", input(from, (v) => (from = v), { type: "date", onchange: () => S.render() })), field("Până la", input(to, (v) => (to = v), { type: "date", onchange: () => S.render() }))) : null,
    pnF ? note("Filtru PN: " + (mixedExcluded ? mixedExcluded + " ore cu mai multe PN-uri sunt excluse (timpul planificat nu se împarte arbitrar)." : "doar orele dedicate acestui PN.")) : null,
    !states.length ? note("Nu există planuri în perioada aleasă.", "warn") : null,
    h("div.panel", { style: { marginTop: "16px" } }, oeeGauge(r, target, "Ținta " + target + " % este referința „world class” de pe oee.com (nu un standard); o schimbi în Setări → Praguri.")),
    performanceSuspect(r) ? note("Performance peste 100 % (" + fmtPct(r.p) + "): verifică timpul ideal de ciclu (ICT) al PN-urilor sau cantitățile raportate.", "warn") : null,
    h("div.split", { style: { marginTop: "16px" } },
      h("div.panel.pad", null, h("h3.ph3", null, "Availability · Performance · Quality"), apq(r), h("p.tiny.faint", { style: { marginTop: "8px" } },
        (agg ? oeeParts.length + " ore complete · " + Math.round(agg.ppt) + " min planificate" : "Nicio oră completă") + ". Quality este ponderat cu timpul ideal (corect pentru PN-uri diferite). Good = bune la prima trecere.")),
      h("div.kpis", null,
        kpi("Realizare plan", fmtPct(planDone ? actDone / planDone : null, 0), missing ? plural(missing, "oră fără raport (exclusă)", "ore fără raport (excluse)") : "ore încheiate", "", "#/production?f=reports"),
        kpi("FPY", fmtPct(sumT ? sumG / sumT : null, 1), "bune la prima trecere / total"),
        kpi("Rebut", fmtPct(sumT ? sumScrap / sumT : null, 1), fmtN(sumScrap) + " buc"),
        kpi("Buc / operator-oră", opHours ? fmtN(actDone / opHours, 1) : "—", opHours ? "din alocări și ore raportate" : "fără alocări"))),
    period === "shift" && shiftLines.length ? [
      sect("Plan vs. realizat pe ore"), h("div.panel.pad", null, planActual(aggregateRows(shiftLines))),
      sect("Producție cumulată și abatere"), h("div.panel.pad", null, cumulative(cumRows(aggregateRows(shiftLines))), h("div.legend", null, h("span", null, h("i.l-plan"), "plan"), h("span", null, h("i.l-act"), "realizat"))),
      sect("Heatmap linii × ore", h("span.aside", null, "atinge pentru raport")),
      h("div.panel.pad.scrollx", null, heatmap(shiftLines, { under: doc.settings.thresholds.underTarget, onCell: (L, row) => (location.hash = "#/report/" + L.line.id + "/" + row.slot.i) }))] : null,
    trendPts.length ? [sect("Trend OEE zilnic"), h("div.panel.pad", null, trend(trendPts, { label: "OEE pe zi", target: target / 100 }) || note("Nicio zi cu ore complete."))] : null,
    sect("Distribuția timpului"), h("div.panel.pad", null, timeSplit(mins) || note("Fără evenimente de stare.")),
    h("div.grid.c2-lg", null,
      h("div", null, sect("Pareto opriri (minute)"), h("div.panel.pad", null, paretoBars(pareto(stops, (x) => x.key, (x) => x.min).map((x) => ({ ...x, value: Math.round(x.value) }))) || note("Nicio oprire."))),
      h("div", null, sect("Pareto rebut pe linie"), h("div.panel.pad", null, paretoBars(scrapByLine, { unit: "buc" }) || note("Fără rebut raportat.")))),
    sect("Pe linii"),
    table(["Linie", "A", "P", "Q", "OEE", "Realizare", "Downtime"], lines.map((l) => {
      const st2 = states.filter((x) => x.L.line.id === l.id);
      const parts = st2.flatMap((x) => x.L.rows.filter((r2) => r2.oee).map((r2) => r2.oee));
      const rr = parts.length ? ratiosOf(sumOee(parts)) : null;
      const rep = st2.flatMap((x) => x.L.rows.filter((r2) => r2.actual !== null && r2.plan !== null)), rp = rep.reduce((a, r2) => a + r2.plan, 0), ra = rep.reduce((a, r2) => a + r2.actual, 0);
      return { id: l.id, cells: [l.name, ...[rr?.a, rr?.p, rr?.q].map((v) => ({ v: fmtPct(v, 0), cls: "num" })), { v: rr?.oee != null ? tag("oee-" + oeeBand(rr.oee, target) + ".plain", fmtPct(rr.oee, 0)) : "—", cls: "num" }, { v: fmtPct(rp ? ra / rp : null, 0), cls: "num" },
        { v: Math.round(st2.reduce((a, x) => a + x.L.mins.stop + x.L.mins.notrunning, 0)) + " min", cls: "num" }] };
    }), { onRow: (r) => (location.hash = "#/line/" + r.id) }));
}
function cumRows(rows) {
  let cp = 0, ca = 0, ok = true;
  return rows.map((r) => { cp += r.plan || 0; if (r.actual === null) ok = false; else ca += r.actual; return { ...r, cumPlan: cp, cumActual: ok ? ca : null }; });
}
