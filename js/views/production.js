// PRODUCȚIE — overview linii (identificare imediată a problemelor) și pagina liniei.
import { h, btn, icon, tag, kpi, sect, chips, empty, note, sheet, field, input, toast, item, confirmSheet } from "../ui/kit.js";
import { S, ctx, commit, now, byId, pnCode, personName } from "../state.js";
import { fmtN, fmtPct, fmtSigned } from "../core/num.js";
import { fmtHM, fmtDur, atTime, validHM } from "../core/time.js";
import { ruler, planActual, cumulative, timeSplit } from "../ui/charts.js";
import { LINE_STATUS, correctEvent, lineEvents } from "../domain/lines.js";
import { SLOT_STATE } from "../domain/reports.js";
import { INC_STATUS } from "../domain/incidents.js";
import { isOpen, TASK_STATUS } from "../domain/tasks.js";
import { statusTag, lineEventSheet, taskFromSheet, backLink, pageHead } from "./common.js";

let filter = "all";
const PROBLEM = (L) => L.status === "stop" || L.status === "notrunning" || (L.planned && L.status === "unknown") || L.rows.some((r) => r.state === "overdue") || (L.attainment !== null && L.attainment * 100 < S.doc.settings.thresholds.underTarget);
export function productionView(_p, q, st) {
  if (q.get("f")) { filter = q.get("f"); history.replaceState(null, "", "#/production"); }
  if (!S.doc.master.lines.length) return h("div", null, pageHead("Linii"), empty("Nicio linie în catalog", "Adaugă liniile tale cu mașini, operații și PN-uri. Denumirile rămân doar pe acest dispozitiv.", btn("Deschide catalogul", () => (location.hash = "#/catalog"), "primary")));
  const F = {
    all: () => true, problems: PROBLEM, run: (L) => L.status === "run", stop: (L) => L.status === "stop" || L.status === "notrunning",
    reports: (L) => L.rows.some((r) => r.state === "overdue" || r.state === "incomplete"), notplanned: (L) => !L.planned,
  };
  const lines = st.lines.filter(F[filter] || F.all);
  const count = (k) => st.lines.filter(F[k]).length;
  return h("div", null,
    pageHead("Linii", st.planned.length + " planificate · " + st.counts.run + " în funcțiune · " + st.counts.stop + " oprite",
      [btn("Planificare", () => (location.hash = "#/planning"), "", "calendar"), btn("OEE", () => (location.hash = "#/oee"), "", "chart")]),
    chips([["all", "Toate " + st.lines.length], ["problems", "Probleme " + count("problems")], ["run", "În funcțiune " + count("run")], ["stop", "Oprite " + count("stop")], ["reports", "Rapoarte lipsă " + count("reports")], ["notplanned", "Neplanificate " + count("notplanned")]], filter, (v) => { filter = v; S.render(); }),
    h("div.rail", { style: { marginTop: "12px" } }, lines.length ? lines.map((L) => railRow(L, st)) : note("Nicio linie în acest filtru.")));
}
function railRow(L, st) {
  const th = S.doc.settings.thresholds;
  const d = L.planned ? L.sum.delta : null;
  const miss = L.sum.missingClosed;
  const cov = st.people.coverage.find((c) => c.lineId === L.line.id);
  return h("a.rl.s-" + L.status, { href: "#/line/" + L.line.id },
    h("span.rl-bar", { "aria-hidden": "true" }),
    h("span.rl-main", null,
      h("span.rl-top", null, h("b.rl-n.num", null, L.line.name), statusTag(L.status), L.statusSince !== null && L.status !== "notplanned" ? h("span.small.muted", null, fmtDur(L.statusSince)) : null),
      h("span.rl-sub.small.muted", null, (L.activePn ? pnCode(L.activePn) : "fără PN") + (cov ? " · oameni " + cov.present + "/" + cov.need : "") + (L.openInc.length ? " · " + L.openInc.length + " incident" : "") + (miss ? " · " + (miss === 1 ? "1 raport lipsă" : miss + " rapoarte lipsă") : "")),
      L.planned ? ruler(L.rows, { now: now(), from: st.from, to: st.to, under: th.underTarget, compact: true }) : h("span.small.faint", null, "Fără producție planificată în schimb")),
    h("span.rl-end", null, h("span.rl-d.num" + (d === null ? ".na" : d < 0 ? ".neg" : ".pos"), null, d === null ? "—" : fmtSigned(d)),
      h("span.tiny.muted", null, L.planned ? fmtN(L.sum.repActual) + " / " + fmtN(L.sum.repPlan) : "")));
}

export function lineView([id], _q, st) {
  const L = st.lines.find((x) => x.line.id === id);
  if (!L) return h("div", null, backLink("#/production", "Linii"), empty("Linia nu există", "A fost ștearsă sau nu este activă."));
  const th = S.doc.settings.thresholds, t = now();
  const cur = L.curSlot;
  const s = L.status;
  const actions = h("div.lact", null,
    s === "run" ? null : act(s === "stop" || s === "notrunning" || s === "changeover" ? "Reia" : "Pornește", "play", "run", () => lineEventSheet(id, "run")),
    s === "run" || s === "changeover" ? act("Oprește", "stop", "stop", () => lineEventSheet(id, "stop")) : null,
    s !== "notrunning" ? act("Nu rulează", "pause", "", () => lineEventSheet(id, "notrunning")) : null,
    act("Schimbă PN", "swap", "change", () => lineEventSheet(id, "changeover")),
    act("Raportează producție", "chart", "", () => (location.hash = "#/report/" + id)),
    act("Incident", "wrench", "", () => (location.hash = "#/incident/new?line=" + id)),
    act("Problemă", "alert", "", () => taskFromSheet({ lineId: id, source: { type: "production", label: L.line.name }, heading: "Problemă pe " + L.line.name })));
  const d = L.planned ? L.sum.delta : null;
  const people = (S.doc.assignments[L.sk] || []).filter((a) => a.lineId === id);
  const evs = lineEvents(S.doc.events, id).filter((e) => new Date(e.at) >= new Date(st.from.getTime() - 8 * 3600000) && new Date(e.at) < st.to).reverse();
  const tasks = S.doc.tasks.filter((x) => x.lineId === id && isOpen(x));
  const fo = S.doc.audits.filter((a) => a.type === "firstoff" && a.lineId === id && a.extra?.sk === L.sk);
  return h("div", null,
    backLink("#/production", "Linii"),
    h("div.head", null, h("div", null, h("h1", null, L.line.name), h("p.row.wrap", null, statusTag(s),
      L.statusSince !== null && s !== "notplanned" ? h("span", null, "de " + fmtDur(L.statusSince) + (L.last ? " · " + (L.last.reason || "fără motiv") : "")) : null,
      h("span", null, "PN " + (L.activePn ? pnCode(L.activePn) : "—"))))),
    note("Butoanele creează înregistrări digitale cu ora reală, nu comenzi către utilaje."),
    actions,
    h("div.kpis.c4", { style: { marginTop: "16px" } },
      kpi("Plan schimb", fmtN(L.planTotal), L.planned ? (L.plan?.baseline ? "baseline " + fmtN(L.plan.baseline.total) : "neconfirmat") : "neplanificată", "", "#/planning?line=" + id),
      kpi("Realizat", fmtN(L.sum.repActual), "plan ore raportate " + fmtN(L.sum.repPlan), "", "#/report/" + id),
      kpi("Delta", d === null ? "—" : fmtSigned(d), (L.attainment !== null ? fmtPct(L.attainment, 0) + " din plan" : "fără ore raportate") + (L.sum.missingClosed ? " · " + (L.sum.missingClosed === 1 ? "1 oră lipsă" : L.sum.missingClosed + " ore lipsă") : ""), d === null ? "" : d < 0 ? "stop" : "run"),
      kpi("Ora curentă", cur ? fmtN(cur.actual) + " / " + fmtN(cur.plan) : "—", cur ? cur.slot.label : "în afara schimbului"),
      kpi("OEE", L.oee?.oee != null ? fmtPct(L.oee.oee, 0) : "—", L.oee?.oee != null ? L.oeeSlots + " ore complete" : L.oee?.why?.oee || "Date insuficiente", "", "#/oee?line=" + id),
      kpi("Downtime", Math.round(L.mins.stop + L.mins.notrunning) + " min", Math.round(L.mins.changeover) + " min changeover" + (L.mins.unknown ? " · " + Math.round(L.mins.unknown) + " min fără status" : "")),
      kpi("Rebut", L.sum.scrap.missing ? "—" : fmtN(L.sum.scrap.sum), L.sum.scrap.missing ? "lipsesc valori" : "în orele raportate"),
      kpi("Oameni", String(people.length), "necesar " + (L.line.requiredOps ?? "—"), "", "#/team/allocation")),
    L.planned ? [sect("Pe ore", h("a", { href: "#/report/" + id }, "Raportează")), ruler(L.rows, { now: t, from: st.from, to: st.to, under: th.underTarget, onSlot: (r) => (location.hash = "#/report/" + id + "/" + r.slot.i) })] : null,
    h("div.grid.c2-lg", { style: { marginTop: "16px" } },
      L.planned ? h("div.panel.pad", null, h("h3.ph3", null, "Plan vs. realizat"), planActual(L.rows, { under: th.underTarget })) : null,
      L.planned ? h("div.panel.pad", null, h("h3.ph3", null, "Cumulat"), cumulative(L.rows), h("div.legend", null, h("span", null, h("i.l-plan"), "plan"), h("span", null, h("i.l-act"), "realizat"))) : null,
      h("div.panel.pad", null, h("h3.ph3", null, "Timpul schimbului"), timeSplit(L.mins) || h("p.small.muted", null, "Fără evenimente de stare."))),
    L.planned ? [sect("Rapoarte orare"), slotTable(L, id)] : null,
    sect("Evenimente", h("span.aside", null, "atinge pentru corecție")),
    evs.length ? h("div.list", null, evs.map((e) => item({ title: LINE_STATUS[e.type].label + " · " + fmtHM(new Date(e.at)) + (e.void ? " (anulat)" : ""),
      sub: [e.reason, e.pnId ? "PN " + pnCode(e.pnId) : "", e.history?.length ? "corectat de " + e.history.length + "×" : "", "înregistrat " + fmtHM(new Date(e.recordedAt))].filter(Boolean).join(" · "),
      onClick: () => correctSheet(e) }))) : h("p.small.muted", null, "Niciun eveniment. Înregistrează pornirea liniei."),
    sect("Incidente", h("a", { href: "#/incident/new?line=" + id }, "Adaugă")),
    L.openInc.length ? h("div.list", null, L.openInc.map((i) => item({ title: "#" + i.no + " " + (i.desc || i.category || "Incident"), sub: INC_STATUS[i.status] + " · " + (personName(i.ownerId) !== "—" ? personName(i.ownerId) : i.dept || "fără responsabil"), href: "#/incident/" + i.id }))) : h("p.small.muted", null, "Niciun incident activ."),
    sect("Sarcini"), tasks.length ? h("div.list", null, tasks.map((x) => item({ title: x.title, sub: TASK_STATUS[x.status] + (x.due ? " · " + x.due : ""), href: "#/tasks?open=" + x.id }))) : h("p.small.muted", null, "Nicio sarcină deschisă."),
    sect("Calitate", h("a", { href: "#/audit/new/firstoff?line=" + id }, "First Off")),
    h("p.small", null, fo.some((a) => a.status === "done") ? "First Off confirmat în acest schimb." : "First Off neconfirmat în acest schimb."));
}
const act = (label, ic, tone, onClick) => h("button.la" + (tone ? ".lt-" + tone : ""), { type: "button", onclick: onClick }, icon(ic), h("span", null, label));
function slotTable(L, id) {
  return h("div.tablewrap", null, h("table.t", null,
    h("thead", null, h("tr", null, ["Interval", "Plan", "Realizat", "Δ", "Δ cumulat", "Rebut", "Oprire", "Stare"].map((x) => h("th", null, x)))),
    h("tbody", null, L.rows.map((r) => h("tr", { onclick: () => (location.hash = "#/report/" + id + "/" + r.slot.i), style: { cursor: "pointer" } },
      h("td", null, r.slot.label), h("td.num", null, fmtN(r.plan)), h("td.num", null, r.actual === 0 && r.state === "complete" ? "0 ✓" : fmtN(r.actual)),
      h("td.num", { class: r.delta < 0 ? "neg" : r.delta > 0 ? "pos" : "" }, fmtSigned(r.delta)), h("td.num", { class: r.cumDelta < 0 ? "neg" : "" }, fmtSigned(r.cumDelta)),
      h("td.num", null, fmtN(r.scrap)), h("td.num", null, r.downtime === null ? "—" : Math.round(r.downtime) + "′"),
      h("td", null, tag(r.state === "complete" ? "run" : r.state === "overdue" ? "stop" : r.state === "incomplete" ? "warn" : "idle", SLOT_STATE[r.state])))))));
}
function correctSheet(e) {
  const c = ctx();
  let hm = fmtHM(new Date(e.at)), reason = e.reason || "";
  const sh = sheet({ title: "Corectează evenimentul", body: h("div.fields", null,
    note("Corecția păstrează istoricul. Indicatorii se recalculează."),
    field("Ora reală", input(hm, (v) => (hm = v), { type: "time" })),
    field("Motiv / descriere", input(reason, (v) => (reason = v))),
    e.history?.length ? h("details", null, h("summary.small", null, "Istoric corecții (" + e.history.length + ")"), h("ul.small", null, e.history.map((x) => h("li", null, new Date(x.changedAt).toLocaleString("ro-RO") + ": " + Object.keys(x).filter((k) => k !== "changedAt").join(", "))))) : null),
  footer: [btn("Anulează evenimentul", async () => { if (await confirmSheet("Anulezi evenimentul?", "Evenimentul rămâne în istoric, marcat anulat, și nu mai contează în calcule.", "Anulează evenimentul", true)) { commit((d) => correctEvent(d.events, e.id, { void: true }, now()), "Eveniment anulat"); sh.close(); } }, "danger"),
    btn("Salvează", () => {
      if (!validHM(hm)) { toast("Ora nu este validă.", { err: true }); return; }
      const at = atTime(c.workDay, c.shift, hm) || new Date(new Date(e.at).setHours(+hm.slice(0, 2), +hm.slice(3), 0, 0));
      if (at > now()) { toast("Ora nu poate fi în viitor.", { err: true }); return; }
      const r = commit((d) => correctEvent(d.events, e.id, { at, reason }, now()), "Eveniment corectat");
      if (r.ok) sh.close();
    }, "primary")] });
}
