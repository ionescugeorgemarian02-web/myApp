// RAPORTARE ORARĂ — linia știe schimbul, intervalul, PN-ul și targetul. Utilizatorul introduce doar ce lipsește.
import { h, put, btn, icon, tag, kpi, note, field, input, numInput, picker, toast, seg, sheet, area } from "../ui/kit.js";
import { S, ctx, commit, now, byId, pnCode } from "../state.js";
import { fmtN, fmtSigned, nn } from "../core/num.js";
import { fmtDur } from "../core/time.js";
import { plannedPnAt } from "../domain/reports.js";
import { splitGood, SLOT_STATE } from "../domain/reports.js";
import { backLink, pnItems, pnField, taskFromSheet } from "./common.js";

export function reportView([lineId, slotArg], _q, st) {
  const L = st.lines.find((x) => x.line.id === lineId);
  if (!L) return h("div", null, backLink("#/production", "Linii"), note("Linia nu există."));
  const c = ctx(), t = now();
  // Implicit: ultima oră încheiată fără raport, altfel ora curentă.
  let slotI = slotArg !== undefined ? Number(slotArg) : (L.rows.find((r) => r.state === "overdue") || L.rows.filter((r) => r.slot.to <= t).at(-1) || L.curSlot || L.rows[0]).slot.i;
  const row = L.rows[slotI];
  if (!row) return note("Interval inexistent.");
  const stored = S.doc.reports[c.sk]?.[lineId]?.[slotI];
  const pn0 = plannedPnAt(L.plan, c.workDay, c.shift, row.slot.from) || L.activePn || L.line.pnIds?.[0] || null;
  const f = stored ? structuredClone(stored) : { splits: [{ pnId: pn0, total: null, scrap: null, rework: null }], note: "", reason: "", issueId: null, na: false };
  const box = h("div");
  const draw = () => {
    const totals = f.splits.map((s) => nn(s.total, true));
    const sum = totals.every((x) => x !== null) ? totals.reduce((a, b) => a + b, 0) : null;
    const delta = sum !== null && row.plan !== null ? sum - row.plan : null;
    const cumActBefore = L.rows.slice(0, slotI).reduce((a, r) => (a === null || r.actual === null ? null : a + r.actual), 0);
    put(box, 
      h("div.kpis.c4", null,
        kpi("Plan oră", fmtN(row.plan), row.slot.label),
        kpi("Realizat", fmtN(sum), sum === 0 ? "zero confirmat" : "", delta === null ? "" : delta < 0 ? "stop" : "run"),
        kpi("Delta", fmtSigned(delta), "Δ cumulat " + fmtSigned(cumActBefore !== null && sum !== null && row.cumPlan !== null ? cumActBefore + sum - row.cumPlan : null), delta === null ? "" : delta < 0 ? "stop" : "run"),
        kpi("Downtime", row.downtime === null ? "—" : Math.round(row.downtime) + " min", "calculat din evenimente" + (row.unknownMin ? " · " + Math.round(row.unknownMin) + " min fără status" : ""))),
      f.na ? note("Interval marcat neaplicabil (fără producție de raportat).", "warn") : [
        ...f.splits.map((s, i) => splitBox(s, i, f, draw, lineId, row)),
        btn("PN schimbat în această oră", () => { f.splits.push({ pnId: null, total: null, scrap: null, rework: null, from: "" }); draw(); }, "ghost", "swap"),
        field("Motiv abatere", input(f.reason, (v) => (f.reason = v), { placeholder: delta !== null && delta < 0 ? "Ex. micro-opriri, lipsă operator" : "opțional", list: "reasons" })),
        h("datalist", { id: "reasons" }, ["Micro-opriri", "Lipsă material", "Lipsă operator", "Changeover prelungit", "Defect mașină", "Problemă calitate", "Reglaj"].map((x) => h("option", { value: x }))),
        field("Observații", area(f.note, (v) => (f.note = v), { rows: 2 })),
        f.issueId ? h("a.crumb", { href: "#/tasks?open=" + f.issueId }, icon("link"), "Problemă asociată") : btn("Asociază o problemă", () => taskFromSheet({ lineId, title: f.reason || "", source: { type: "production", label: L.line.name + " " + row.slot.label }, onCreated: (tk) => { f.issueId = tk.id; draw(); } }), "ghost", "alert")]);
  };
  draw();
  const save = (na = false) => {
    if (!na) for (const s of f.splits) {
      if (nn(s.total, true) === null) { toast("Completează producția totală (0 dacă nu s-a produs nimic).", { err: true }); return; }
      if (splitGood(s) === null && nn(s.scrap, true) !== null && nn(s.rework, true) !== null) { toast("Rebutul + rework depășește producția totală.", { err: true }); return; }
    }
    const missingQ = !na && f.splits.some((s) => nn(s.scrap, true) === null || nn(s.rework, true) === null);
    const r = commit((d) => {
      d.reports[c.sk] ||= {};
      d.reports[c.sk][lineId] ||= {};
      d.reports[c.sk][lineId][slotI] = { ...f, na, at: now().toISOString() };
    }, na ? "Interval marcat neaplicabil" : missingQ ? "Salvat. Rebutul sau rework-ul lipsesc: raportul rămâne incomplet." : "Raport salvat");
    if (r.ok && !na) {
      const next = L.rows.find((x, k) => k > slotI && (x.state === "overdue"));
      location.hash = next ? "#/report/" + lineId + "/" + next.slot.i : "#/line/" + lineId;
    }
  };
  return h("div.report", null,
    backLink("#/line/" + lineId, L.line.name),
    h("div.head", null, h("div", null, h("h1", null, "Raport orar"), h("p", null, L.line.name + " · " + c.shift.name + " · " + row.slot.label))),
    h("div.slotpick", null, L.rows.map((r) => h("a.sp", { href: "#/report/" + lineId + "/" + r.slot.i, "aria-current": r.slot.i === slotI ? "true" : null, class: "st-" + r.state }, r.slot.label.slice(0, 5), h("small", null, SLOT_STATE[r.state])))),
    box,
    h("div.sticky-actions", null, btn("Neaplicabil", () => save(true), "ghost"), btn("Salvează raportul", () => save(false), "primary big")));
}
function splitBox(s, i, f, draw, lineId, row) {
  const good = splitGood(s);
  const zeroBtn = (k) => h("button.zero", { type: "button", onclick: () => { s[k] = 0; draw(); }, "aria-label": "Zero confirmat" }, "0");
  return h("div.splitbox.panel.pad", null,
    h("div.row.between", null, pnField("PN" + (f.splits.length > 1 ? " " + (i + 1) : ""), lineId, s.pnId, (v) => { s.pnId = v; draw(); }),
      f.splits.length > 1 ? btn("Elimină", () => { f.splits.splice(i, 1); draw(); }, "ghost", "trash") : null),
    f.splits.length > 1 ? field("Din ora", input(s.from || "", (v) => (s.from = v), { type: "time" }), "Pentru trasabilitatea PN-ului în interval") : null,
    h("div.fields", { style: { marginTop: "12px" } },
      field("Producție totală", numInput(s.total ?? "", (v) => (s.total = nn(v, true)), { class: "input big", onchange: draw, "aria-describedby": "zt" }))),
    h("div.fields.c2", { style: { marginTop: "12px" } },
      h("div.field", null, h("span", null, "Rebut"), h("div.withzero", null, numInput(s.scrap ?? "", (v) => (s.scrap = nn(v, true)), { class: "input big", onchange: draw }), zeroBtn("scrap"))),
      h("div.field", null, h("span", null, "Rework"), h("div.withzero", null, numInput(s.rework ?? "", (v) => (s.rework = nn(v, true)), { class: "input big", onchange: draw }), zeroBtn("rework")))),
    h("p.small.muted", { id: "zt" }, "Piese bune (prima trecere): " + (good === null ? "se calculează după completare" : fmtN(good)) + ". Câmp gol = lipsă, „0” = zero confirmat."));
}
