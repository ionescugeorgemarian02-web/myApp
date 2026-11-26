// PREDAREA SCHIMBULUI — generată din module; manual doar observații, materiale/WIP și priorități.
import { h, btn, icon, tag, kpi, sect, note, field, area, toast, item, table } from "../ui/kit.js";
import { S, ctx, commit, now } from "../state.js";
import { uid } from "../core/doc.js";
import { fmtN, fmtPct, fmtSigned } from "../core/num.js";
import { fmtDay, fmtHM, fmtDur } from "../core/time.js";
import { buildHandover, handoverText } from "../domain/handover.js";
import { download } from "../core/store.js";
import { pageHead } from "./common.js";

const drafts = {};
export function handoverView(_p, _q, st) {
  const c = ctx(), t = now();
  const h0 = buildHandover(S.doc, st, t);
  const saved = S.doc.handovers.filter((x) => x.key === c.sk).at(-1);
  const d = (drafts[c.sk] ||= { notes: saved?.notes?.notes || "", materials: saved?.notes?.materials || "", priorities: saved?.notes?.priorities || "" });
  const text = () => handoverText(h0, d);
  const copy = async () => { try { await navigator.clipboard.writeText(text()); toast("Raport copiat"); } catch { toast("Copierea nu este permisă de browser. Folosește Descarcă.", { err: true }); } };
  const save = () => commit((doc) => doc.handovers.push({ id: uid(), key: c.sk, at: t.toISOString(), snapshot: h0, notes: { ...d } }), "Predare salvată în istoric");
  return h("div", null,
    pageHead("Predarea schimbului", fmtDay(c.workDay, true) + " · " + c.shift.name + " · generată din datele raportate", [btn("Copiază", copy, "", "copy"), btn("Descarcă", () => download("predare-" + c.workDay + "-" + c.shift.id + ".txt", text(), "text/plain"), "", "download")]),
    h("div.kpis.c4", null, kpi("Plan", fmtN(h0.totals.plan)), kpi("Realizat", fmtN(h0.totals.actual), h0.totals.partial ? "rapoarte lipsă" : "", h0.totals.partial ? "warn" : ""),
      kpi("OEE", fmtPct(h0.totals.oee, 0), h0.totals.oee === null ? "date insuficiente" : ""), kpi("Personal", String(h0.totals.people.present), "deficit " + h0.totals.people.gap)),
    sect("Linii"),
    table(["Linie", "Stare", "PN", "Plan", "Realizat", "Δ", "Rebut", "Oprire", "Lipsă raport"], h0.lines.map((l) => ({ cells: [l.name, l.status, l.pn, fmtN(l.plan), fmtN(l.actual),
      { v: fmtSigned(l.delta), cls: l.delta < 0 ? "neg num" : "num" }, fmtN(l.scrap), l.downtime + " min", l.missing.join(", ") || "—"] }))),
    h("div.grid.c2-lg", null,
      h("div", null, sect("Incidente deschise"), h0.incidents.length ? h("div.list", null, h0.incidents.map((i) => h("div.item", null, h("div.main", null, h("div.t", null, "#" + i.no + " " + i.line + " · " + i.desc), h("div.s", null, i.status + (i.elapsed ? " · " + fmtDur(i.elapsed) : "")))))) : note("Niciunul.")),
      h("div", null, sect("Sarcini deschise"), h0.tasks.length ? h("div.list", null, h0.tasks.slice(0, 12).map((x) => h("div.item", null, h("div.main", null, h("div.t", null, x.title), h("div.s", null, x.owner + (x.due ? " · " + x.due : ""))), x.overdue ? tag("stop", "depășit") : null))) : note("Niciuna."))),
    h0.quality.length ? [sect("Calitate"), h("div.stack", null, h0.quality.map((q) => note(q)))] : null,
    h0.routine.length ? [sect("Rutină nefinalizată"), h("div.stack", null, h0.routine.map((r) => note(r, "warn")))] : null,
    sect("Completează doar ce nu există în aplicație"),
    h("div.panel.pad.fields", null,
      field("Materiale / WIP pentru schimbul următor", area(d.materials, (v) => (d.materials = v), { rows: 2 })),
      field("Priorități pentru schimbul următor", area(d.priorities, (v) => (d.priorities = v), { rows: 2 })),
      field("Observații", area(d.notes, (v) => (d.notes = v), { rows: 2 }))),
    h("div.actions", { style: { marginTop: "16px" } }, btn("Salvează în istoric", save, "primary big")),
    sect("Istoric predări"),
    S.doc.handovers.length ? h("div.list", null, [...S.doc.handovers].reverse().slice(0, 20).map((x) => item({ title: fmtDay(x.snapshot.day, true) + " · " + x.snapshot.shift, sub: "salvată " + fmtHM(new Date(x.at)) + " · realizat " + fmtN(x.snapshot.totals.actual),
      onClick: () => download("predare-" + x.snapshot.day + ".txt", handoverText(x.snapshot, x.notes), "text/plain") }))) : note("Nicio predare salvată."),
    h("p.tiny.faint", { style: { marginTop: "12px" } }, "Document personal; completează procesul oficial de predare."));
}
