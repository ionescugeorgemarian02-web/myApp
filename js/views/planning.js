// PLANIFICARE — Production Planning Center pentru un schimb: rulări PN pe linii, plan orar, baseline și revizii.
import { h, put, btn, icon, tag, kpi, sect, empty, note, sheet, field, input, numInput, seg, select, picker, toast, promptSheet } from "../ui/kit.js";
import { S, ctx, commit, now, byId, pnCode } from "../state.js";
import { uid } from "../core/doc.js";
import { fmtN, nn } from "../core/num.js";
import { slotsOf, fmtHM, fmtDay, nextShift, shiftKey } from "../core/time.js";
import { distribute, hourlyPlan, total, METHODS, planIssues, runSlotMinutes, confirmBaseline, revisePlan, runWindow } from "../domain/plan.js";
import { gantt } from "../ui/charts.js";
import { pnItems, pageHead } from "./common.js";
import { presentIds } from "../domain/workforce.js";

export function planningView(_p, q, st) {
  const c = ctx();
  const doc = S.doc;
  if (!doc.master.lines.length) return h("div", null, pageHead("Planificare"), empty("Catalogul este gol", "Planul are nevoie de linii și PN-uri.", btn("Deschide catalogul", () => (location.hash = "#/catalog"), "primary")));
  const open = q.get("line");
  if (open) { history.replaceState(null, "", "#/planning"); setTimeout(() => editPlan(open), 0); }
  const plans = doc.plans[c.sk] || {};
  const lines = doc.master.lines.filter((l) => l.active !== false);
  const rows = lines.map((l) => {
    const p = plans[l.id] || null;
    const hp = p ? hourlyPlan(p, c.workDay, c.shift) : null;
    return { l, p, hp, tot: hp ? total(hp) : null, issues: p ? planIssues(p, c.workDay, c.shift) : [] };
  });
  const planned = rows.filter((r) => r.p && !r.p.notPlanned && r.p.runs.length);
  const need = planned.reduce((a, r) => a + Math.max(0, ...r.p.runs.map((x) => nn(x.ops) || 0), Number(r.l.requiredOps) || 0), 0);
  const avail = presentIds(doc, c.sk).size;
  const nx = nextShift(c.workDay, c.shift, doc.settings.shifts);
  const issues = rows.flatMap((r) => r.issues.map((i) => ({ ...i, line: r.l })));
  return h("div", null,
    pageHead("Planificare", fmtDay(c.workDay, true) + " · " + c.shift.name + " " + c.shift.start + "–" + c.shift.end,
      [btn("Schimbul următor", () => { S.view = shiftKey(nx.workDay, nx.shift.id); S.render(); }, "", "right"), S.view ? btn("Schimbul curent", () => { S.view = null; S.render(); }, "ghost") : null]),
    h("div.kpis.c4", null,
      kpi("Linii planificate", planned.length + "/" + lines.length, rows.filter((r) => r.p?.notPlanned).length + " marcate neplanificate"),
      kpi("Target total", fmtN(planned.every((r) => r.tot !== null) ? planned.reduce((a, r) => a + r.tot, 0) : null), planned.filter((r) => r.p.baseline).length + " cu baseline confirmat"),
      kpi("Operatori necesari", String(need), avail ? avail + " prezenți marcați" : "pontaj nemarcat", avail && avail < need ? "warn" : ""),
      kpi("Conflicte", String(issues.length), issues.length ? "de rezolvat" : "niciunul", issues.length ? "stop" : "")),
    issues.length ? h("div.stack", { style: { marginTop: "12px" } }, issues.map((i) => note(i.line.name + ": " + i.text, "warn"))) : null,
    sect("Timeline"),
    h("div.panel.pad.scrollx", null, gantt(rows.filter((r) => r.p && !r.p.notPlanned).map((r) => ({ label: r.l.name, segments: [],
      blocks: r.p.runs.map((x) => { const w = runWindow(x, c.workDay, c.shift); return w ? { ...w, label: x.kind === "changeover" ? "Changeover" : pnCode(x.pnId), co: x.kind === "changeover" } : null; }).filter(Boolean) })), c.from, c.to, { now: now() })),
    sect("Liniile schimbului", h("span.aside", null, "atinge o linie pentru plan")),
    h("div.list", null, rows.map((r) => h("button.item", { type: "button", onclick: () => editPlan(r.l.id) },
      h("div.main", null, h("div.t", null, r.l.name),
        h("div.s", null, !r.p ? "Neplanificat încă" : r.p.notPlanned ? "Fără producție planificată" : r.p.runs.map((x) => (x.kind === "changeover" ? "Changeover" : pnCode(x.pnId)) + " " + (x.start || "") + "–" + (x.end || "")).join(" · "))),
      h("div.end", null, h("div.num", null, r.tot !== null && r.p && !r.p.notPlanned ? fmtN(r.tot) : ""),
        r.p?.baseline ? tag("run", r.p.revisions?.length ? "revizia " + r.p.revisions.length : "baseline") : r.p && !r.p.notPlanned ? tag("warn", "neconfirmat") : null,
        r.issues.length ? tag("stop", r.issues.length + " conflict") : null), icon("right", "chev")))));
}

function editPlan(lineId) {
  const c = ctx();
  const L = byId(S.doc.master.lines, lineId);
  const existing = S.doc.plans[c.sk]?.[lineId];
  const p = existing ? structuredClone(existing) : { lineId, notPlanned: false, runs: [], baseline: null, revisions: [] };
  const slots = slotsOf(c.workDay, c.shift);
  const body = h("div");
  const addRun = () => {
    const last = p.runs.at(-1);
    const pn = byId(S.doc.master.pns, L.pnIds?.[0]) || S.doc.master.pns[0];
    p.runs.push({ id: uid(), pnId: pn?.id || null, start: last?.end || c.shift.start, end: c.shift.end, target: null, cycleSec: pn?.cycleSec ?? null, method: "productive", ops: L.requiredOps ?? null, priority: "B", note: "" });
  };
  if (!p.runs.length && !p.notPlanned) addRun();
  const draw = () => {
    const hp = hourlyPlan(p, c.workDay, c.shift);
    put(body, 
      p.baseline ? note("Baseline confirmat la " + fmtHM(new Date(p.baseline.at)) + " (" + fmtN(p.baseline.total) + " buc). Orice modificare devine revizie cu motiv; baseline-ul nu se schimbă.", "run") : null,
      h("label.check", null, h("input", { type: "checkbox", checked: p.notPlanned, onchange: (e) => { p.notPlanned = e.target.checked; draw(); } }), "Linia nu are producție planificată în acest schimb"),
      p.notPlanned ? null : [
        ...p.runs.map((r, i) => (r.kind === "changeover" ? coEditor(r, i, p, draw) : runEditor(r, i, p, draw, c, L))),
        h("div.row.wrap", null, btn("Adaugă PN în schimb", () => { addRun(); draw(); }, "ghost", "plus"),
          btn("Adaugă changeover", () => { const last = p.runs.at(-1); p.runs.push({ id: uid(), kind: "changeover", start: last?.end || c.shift.start, end: last?.end || c.shift.start, note: "" }); draw(); }, "ghost", "swap")),
        h("h3.ph3", { style: { marginTop: "16px" } }, "Plan orar"),
        hp ? h("div.tablewrap", null, h("table.t", null,
          h("thead", null, h("tr", null, h("th", null, "Interval"), ...p.runs.map((r) => h("th", null, r.kind === "changeover" ? "C/O" : pnCode(r.pnId))), h("th", null, "Total"), p.baseline ? h("th", null, "Baseline") : null)),
          h("tbody", null, slots.map((s) => h("tr", null, h("td", null, s.label),
            ...p.runs.map((r) => {
              const hv = distribute(r, c.workDay, c.shift);
              return h("td.num", null, r.method === "manual"
                ? h("input.cell", { value: String(r.hourly?.[s.i] ?? ""), inputmode: "numeric", "aria-label": pnCode(r.pnId) + " " + s.label, "aria-invalid": nn(r.hourly?.[s.i], true) === null ? "true" : null, onchange: (e) => { r.hourly = slots.map((_, k) => (k === s.i ? nn(e.target.value, true) : r.hourly?.[k] ?? 0)); draw(); } })
                : fmtN(hv?.[s.i]));
            }),
            h("td.num", null, fmtN(hp[s.i])), p.baseline ? h("td.num.faint", null, fmtN(p.baseline.hourly[s.i])) : null))),
          h("tfoot", null, h("tr", null, h("td", null, "Total"), ...p.runs.map((r) => h("td.num", null, fmtN(total(distribute(r, c.workDay, c.shift))))), h("td.num", null, fmtN(total(hp))), p.baseline ? h("td.num", null, fmtN(p.baseline.total)) : null))))
          : note("Completează targetul sau timpul de ciclu pentru fiecare PN.", "warn"),
        ...planIssues(p, c.workDay, c.shift).map((i) => note(i.text, "warn")),
        p.revisions?.length ? h("details", null, h("summary.small", null, "Revizii (" + p.revisions.length + ")"), h("ul.small", null, p.revisions.map((r) => h("li", null, fmtHM(new Date(r.at)) + " · " + fmtN(r.total) + " buc · " + r.reason)))) : null]);
  };
  draw();
  const save = async (confirm) => {
    if (!p.notPlanned && planIssues(p, c.workDay, c.shift).length) { toast("Rezolvă conflictele planului înainte de salvare.", { err: true }); return; }
    let reason = null;
    if (p.baseline && JSON.stringify(p.runs) !== JSON.stringify(existing?.runs)) {
      reason = await promptSheet("Motivul replanificării", "De ce se schimbă planul?", { okLabel: "Salvează revizia" });
      if (!reason) return;
    }
    const r = commit((d) => {
      d.plans[c.sk] ||= {};
      const target = { ...p };
      if (reason) revisePlan(target, c.workDay, c.shift, reason, now());
      if (confirm) confirmBaseline(target, c.workDay, c.shift, now());
      d.plans[c.sk][lineId] = target;
    }, confirm ? "Plan confirmat ca baseline" : reason ? "Revizie salvată" : "Plan salvat");
    if (r.ok) sh.close();
  };
  const sh = sheet({ title: "Plan · " + L.name, body, wide: true, footer: [btn("Salvează", () => save(false)), !p.baseline ? btn("Confirmă baseline", () => save(true), "primary") : null] });
}
function coEditor(r, i, p, draw) {
  return h("div.runbox.panel.pad.co", null,
    h("div.row.between", null, h("b", null, "Changeover planificat"), btn("Elimină", () => { p.runs.splice(i, 1); draw(); }, "ghost", "trash")),
    h("div.fields.c2", null, field("Început", input(r.start, (v) => (r.start = v), { type: "time", onchange: draw })), field("Final", input(r.end, (v) => (r.end = v), { type: "time", onchange: draw }))),
    h("p.small.muted", null, "Timp planificat fără target (pierdere de Availability). Candidat pentru SMED."));
}
function runEditor(r, i, p, draw, c, L) {
  const pn = byId(S.doc.master.pns, r.pnId);
  const mins = runSlotMinutes(r, c.workDay, c.shift).reduce((a, b) => a + b, 0);
  const cyc = nn(r.cycleSec);
  const cap = cyc > 0 ? Math.floor((mins * 60) / cyc) : null;
  const tgt = r.method === "cycle" ? total(distribute(r, c.workDay, c.shift)) : nn(r.target, true);
  return h("div.runbox.panel.pad", null,
    h("div.row.between", null, h("b", null, "PN " + (i + 1)), p.runs.length > 1 ? btn("Elimină", () => { p.runs.splice(i, 1); draw(); }, "ghost", "trash") : null),
    h("div.fields", null,
      picker("PN", pnItems(L.id), r.pnId, (v) => { r.pnId = v; const x = byId(S.doc.master.pns, v); if (x?.cycleSec && !r.cycleSec) r.cycleSec = x.cycleSec; draw(); }),
      h("div.fields.c2", null, field("Început", input(r.start, (v) => (r.start = v), { type: "time", onchange: draw })), field("Final", input(r.end, (v) => (r.end = v), { type: "time", onchange: draw }))),
      field("Metodă de distribuire", select(Object.entries(METHODS), r.method, (v) => { r.method = v; if (v === "manual") r.hourly = distribute({ ...r, method: "productive" }, c.workDay, c.shift) || []; draw(); })),
      h("div.fields.c3", null,
        field("Target total", numInput(r.method === "cycle" ? tgt ?? "" : r.target ?? "", (v) => (r.target = nn(v, true)), { onchange: draw, disabled: r.method === "cycle" })),
        field("Ciclu (s)", numInput(r.cycleSec ?? "", (v) => (r.cycleSec = nn(v)), { onchange: draw, inputmode: "decimal" })),
        field("Operatori", numInput(r.ops ?? "", (v) => (r.ops = nn(v, true)), { onchange: draw }))),
      h("div.fields.c2", null, field("Ordin de producție", input(r.order || "", (v) => (r.order = v), { placeholder: "opțional" })), field("Prioritate", seg([["A", "A"], ["B", "B"], ["C", "C"]], r.priority, (v) => { r.priority = v; draw(); }))),
      h("p.small.muted", null, Math.round(mins) + " min productive" + (cap !== null ? " · capacitate la ciclul confirmat: " + fmtN(cap) + " buc" : " · fără ciclu confirmat, capacitatea nu se calculează") + (pn?.ict ? " · ICT " + pn.ict + " s" : " · ICT lipsă (OEE incomplet)")),
      cap !== null && tgt !== null && tgt > cap ? note("Targetul (" + fmtN(tgt) + ") depășește capacitatea la ciclul confirmat (" + fmtN(cap) + ").", "stop") : null));
}
