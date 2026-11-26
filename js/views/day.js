// RAPORT ZILNIC — toată ziua de lucru (toate schimburile), pe linii, din datele raportate. Nimic nu se reintroduce.
import { h, btn, kpi, sect, note, field, input, tag, toast, table } from "../ui/kit.js";
import { S, ctx, now } from "../state.js";
import { fmtN, fmtPct, fmtSigned } from "../core/num.js";
import { fmtDay, shiftWindow, addDays } from "../core/time.js";
import { lineState } from "../domain/shift.js";
import { sumOee, ratiosOf, oeeBand } from "../domain/oee.js";
import { download, toCsv } from "../core/store.js";
import { oeeGauge } from "../ui/charts.js";
import { pageHead, prodTabs } from "./common.js";

let dayF = null;
export function dayView() {
  const doc = S.doc, t = now();
  const wd = dayF || ctx().workDay;
  const target = doc.settings.thresholds.oeeTarget ?? 85;
  const shifts = doc.settings.shifts.filter((sh) => shiftWindow(wd, sh).from <= t);
  const lines = doc.master.lines.filter((l) => l.active !== false);
  // Rânduri: linie × schimb, apoi totaluri pe zi. Sumele se fac doar din orele raportate (lipsa ≠ 0).
  const rows = lines.map((l) => {
    const per = shifts.map((sh) => ({ sh, L: lineState(doc, wd, sh, l, t) }));
    const planned = per.filter((x) => x.L.planned);
    const parts = planned.flatMap((x) => x.L.rows.filter((r) => r.oee).map((r) => r.oee));
    return {
      l, per, planned: planned.length > 0,
      plan: planned.reduce((a, x) => a + x.L.sum.repPlan, 0), actual: planned.reduce((a, x) => a + x.L.sum.repActual, 0),
      planShift: planned.every((x) => x.L.planTotal !== null) ? planned.reduce((a, x) => a + x.L.planTotal, 0) : null,
      scrap: planned.reduce((a, x) => a + (x.L.sum.scrap.sum || 0), 0), down: planned.reduce((a, x) => a + x.L.mins.stop + x.L.mins.notrunning, 0),
      missing: planned.reduce((a, x) => a + x.L.sum.missingClosed, 0), oee: parts.length ? ratiosOf(sumOee(parts)) : null, parts,
    };
  });
  const act = rows.filter((r) => r.planned);
  const all = act.flatMap((r) => r.parts);
  const dayOee = all.length ? ratiosOf(sumOee(all)) : null;
  const P = act.reduce((a, r) => a + r.plan, 0), A = act.reduce((a, r) => a + r.actual, 0), SC = act.reduce((a, r) => a + r.scrap, 0);
  const missing = act.reduce((a, r) => a + r.missing, 0);
  const incidents = doc.incidents.filter((i) => shifts.some((sh) => { const w = shiftWindow(wd, sh); const s0 = new Date(i.startAt); return s0 >= w.from && s0 < w.to; }));
  const text = () => {
    const L = ["RAPORT ZILNIC · " + fmtDay(wd, true), "Realizat " + fmtN(A) + " din " + fmtN(P) + " planificat în orele raportate (" + fmtSigned(A - P) + ")" + (missing ? " · " + missing + " ore fără raport" : ""),
      "OEE zi " + fmtPct(dayOee?.oee) + " (țintă " + target + " %) · rebut " + fmtN(SC) + " · incidente " + incidents.length, ""];
    for (const r of act) L.push(r.l.name + ": " + fmtN(r.actual) + "/" + fmtN(r.plan) + " (" + fmtSigned(r.actual - r.plan) + "), OEE " + fmtPct(r.oee?.oee) + ", rebut " + fmtN(r.scrap) + ", oprire " + Math.round(r.down) + " min" +
      " | " + r.per.filter((x) => x.L.planned).map((x) => x.sh.name + " " + fmtN(x.L.sum.repActual) + "/" + fmtN(x.L.sum.repPlan)).join(", "));
    return L.join("\n");
  };
  const csv = () => toCsv([["Linie", "Schimb", "Plan (ore raportate)", "Realizat", "Delta", "Rebut", "Oprire (min)", "OEE %"],
    ...act.flatMap((r) => r.per.filter((x) => x.L.planned).map((x) => [r.l.name, x.sh.name, x.L.sum.repPlan, x.L.sum.repActual, x.L.sum.repActual - x.L.sum.repPlan, x.L.sum.scrap.sum ?? "", Math.round(x.L.mins.stop + x.L.mins.notrunning), x.L.oee?.oee != null ? (x.L.oee.oee * 100).toFixed(1) : ""]))]);
  return h("div", null, prodTabs("day"),
    pageHead("Raport zilnic", fmtDay(wd, true) + " · toate schimburile · din datele raportate",
      [btn("Copiază", async () => { try { await navigator.clipboard.writeText(text()); toast("Raport copiat"); } catch { toast("Copierea nu este permisă de browser. Folosește Descarcă.", { err: true }); } }, "", "copy"),
        btn("CSV", () => download("raport-zilnic-" + wd + ".csv", csv(), "text/csv"), "ghost", "download")]),
    h("div.row.wrap.dayrow", { style: { marginBottom: "12px" } },
      btn("Ziua anterioară", () => { dayF = addDays(wd, -1); S.render(); }, "ghost", "left"),
      field("Ziua", input(wd, (v) => { if (v) { dayF = v; } }, { type: "date", onchange: () => S.render() })),
      dayF ? btn("Azi", () => { dayF = null; S.render(); }, "ghost") : null),
    !act.length ? note("Nicio linie planificată în această zi. Raportul se completează din plan și din rapoartele orare.", "warn") : null,
    h("div.panel", null, oeeGauge(dayOee, target)),
    h("div.kpis.c4", { style: { marginTop: "12px" } },
      kpi("Realizat", fmtN(A), "plan ore raportate " + fmtN(P)), kpi("Abatere", act.length ? fmtSigned(A - P) : "—", P ? fmtPct(A / P, 0) + " din plan" : "", A - P < 0 ? "stop" : act.length ? "run" : ""),
      kpi("Rebut", fmtN(SC), A ? fmtPct(SC / A, 1) + " din realizat" : ""), kpi("Ore fără raport", String(missing), incidents.length + " incidente în zi", missing ? "warn" : "")),
    sect("Pe linii"),
    h("div.grid.daygrid", null, act.map((r) => h("a.dcard.panel", { href: "#/line/" + r.l.id, style: { textDecoration: "none", color: "inherit" } },
      h("div.dcard-h", null, h("b", null, r.l.name), h("span.num", null, fmtN(r.actual) + " / " + fmtN(r.plan) + " "), r.oee?.oee != null ? tag("oee-" + oeeBand(r.oee.oee, target) + ".plain", "OEE " + fmtPct(r.oee.oee, 0)) : tag("idle.plain", "OEE —")),
      h("div.dshifts", null, r.per.map((x) => h("div.dsh", null, x.sh.name.replace("Schimbul ", "S"),
        h("b", null, x.L.planned ? fmtN(x.L.sum.repActual) + "/" + fmtN(x.L.sum.repPlan) : "—"),
        x.L.planned ? (x.L.sum.missingClosed ? x.L.sum.missingClosed + " ore lipsă" : "rebut " + fmtN(x.L.sum.scrap.sum)) : "neplanificat")))))),
    rows.length > act.length ? h("p.small.muted", { style: { marginTop: "12px" } }, "Fără plan în această zi: " + rows.filter((r) => !r.planned).map((r) => r.l.name).join(", ") + ".") : null);
}
