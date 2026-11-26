// AZI — Shift Command Center. Ordine după urgență: situația schimbului, ce cere atenție, ce fac acum, liniile.
import { h, btn, icon, tag, kpi, sect, empty, item } from "../ui/kit.js";
import { S, ctx, commit, now } from "../state.js";
import { fmtN, fmtPct, fmtSigned } from "../core/num.js";
import { fmtHM, fmtDay, fmtDur } from "../core/time.js";
import { ruler } from "../ui/charts.js";
import { attention, SEVERITY_LABEL } from "../domain/assistant.js";
import { routineFor, nowList, progress, record, STATUS } from "../domain/routine.js";
import { isOverdue, isOpen } from "../domain/tasks.js";
import { statusTag, taskFromSheet } from "./common.js";

export function aggregateRows(lines) {
  if (!lines.length) return [];
  return lines[0].rows.map((r0, i) => {
    let plan = 0, actual = 0, missing = false, anyPlan = false;
    for (const L of lines) {
      const r = L.rows[i];
      if (r.plan === null) { missing = true; continue; }
      plan += r.plan;
      if (r.plan > 0 || r.ppt > 0) { anyPlan = true; if (r.actual === null) missing = true; else actual += r.actual; }
    }
    return { slot: r0.slot, plan, actual: missing ? null : actual, state: anyPlan ? "x" : "na" };
  });
}
export function todayView(_p, _q, st) {
  const doc = S.doc, c = ctx(), t = now();
  if (!doc.master.lines.length) return onboarding();
  const th = doc.settings.thresholds;
  const alerts = attention(doc, st, t);
  const rows = routineFor(doc, c.workDay, c.shift, t);
  const prog = progress(rows);
  const next = nowList(rows, 3);
  const agg = aggregateRows(st.planned);
  const delta = st.delta;
  const tasksOver = doc.tasks.filter((x) => isOverdue(x, c.workDay)).length;
  const incActive = doc.incidents.filter((i) => !["resolved", "verified", "closed"].includes(i.status)).length;

  const hero = h("section.hero.panel", null,
    h("div.hero-top", null,
      h("div", null, h("div.hero-day", null, fmtDay(c.workDay, true) + " · " + c.shift.name + (S.view ? " · istoric" : c.upcoming ? " · urmează" : "")),
        h("div.hero-shift.num", null, c.shift.start + " – " + c.shift.end), h("div.small.muted", null, fmtPct(st.elapsed, 0) + " din schimb scurs")),
      h("div.hero-clock", null, h("span.num", null, fmtHM(t)), h("small", null, c.live ? fmtDur(st.remainingMin) + " rămase" : c.upcoming ? "începe în " + fmtDur((c.from - t) / 60000) : "schimb încheiat"))),
    h("div.hero-figs", null,
      fig("Realizat", st.planned.length ? fmtN(st.repActual) : "—", "plan schimb " + fmtN(st.planTotal)),
      fig("Plan ore raportate", st.planned.length ? fmtN(st.repPlan) : "—", !st.planned.length ? "niciun plan pentru schimb" : st.missingClosed ? (st.missingClosed === 1 ? "1 oră încheiată fără raport" : st.missingClosed + " ore încheiate fără raport") : "toate orele încheiate raportate", st.missingClosed ? "warn" : ""),
      fig("Abatere", delta === null ? "—" : fmtSigned(delta), st.repPlan ? fmtPct(st.repActual / st.repPlan, 0) + " din plan" : "fără ore raportate", delta === null ? "" : delta < 0 ? "stop" : "run")),
    agg.length ? ruler(agg, { now: t, from: st.from, to: st.to, under: th.underTarget, onSlot: () => (location.hash = "#/oee") }) : null,
    h("div.legend", null, leg("run", "≥ 100 %"), leg("ok", "≥ " + th.underTarget + " %"), leg("warn", "sub prag"), leg("stop", "critic"), leg("missing", "raport lipsă")));

  const attn = h("section", null, sect("Necesită atenția ta", h("span.aside", null, alerts.length ? alerts.length + " semnale" : "")),
    alerts.length ? h("div.alerts", null, alerts.slice(0, 6).map(alertRow), alerts.length > 6 ? h("details.more-alerts", null, h("summary", null, "Încă " + (alerts.length - 6)), alerts.slice(6).map(alertRow)) : null)
      : h("div.allclear", null, icon("check"), h("div", null, h("b", null, "Nimic de semnalat acum"), h("p.small.muted", null, "Regulile verifică opriri, rapoarte lipsă, ținte, incidente, sarcini, oameni, First Off, audituri și rutina."))));

  const routine = h("section", null, sect("Acum în rutina EPT", h("a", { href: "#/routine" }, prog.done + "/" + prog.total + " · deschide")),
    h("div.rprog", null, h("i", { style: { width: (prog.ratio || 0) * 100 + "%" } })),
    next.length ? h("div.list", null, next.map((r) => routineQuick(r))) : h("p.muted.small", null, "Nicio activitate deschisă în acest moment."));

  const people = st.people;
  const kp = h("section", null, sect("Situația schimbului"),
    h("div.kpis", null,
      kpi("OEE", st.oee?.oee != null ? fmtPct(st.oee.oee, 0) : "—", st.oee?.oee != null ? "A " + fmtPct(st.oee.a, 0) + " · P " + fmtPct(st.oee.p, 0) + " · Q " + fmtPct(st.oee.q, 0) : "Date insuficiente", "", "#/oee"),
      kpi("Linii", h("span", null, st.counts.run, h("small", null, "/" + st.planned.length)), st.counts.stop + " oprite · " + st.counts.unknown + " fără status · " + st.counts.notplanned + " neplanificate", st.counts.stop ? "stop" : "", "#/production"),
      kpi("Oameni", h("span", null, people.present, h("small", null, people.need ? "/" + people.need : "")), people.marked ? (people.gap ? "deficit " + people.gap + " · alocați " + people.assigned : "alocați " + people.assigned) : "pontajul nu este marcat", people.gap ? "warn" : "", "#/team"),
      kpi("Incidente active", String(incActive), doc.incidents.filter((i) => !i.ownerId && !i.dept && isOpenInc(i)).length + " fără responsabil", incActive ? "warn" : "", "#/incidents"),
      kpi("Sarcini", String(doc.tasks.filter(isOpen).length), tasksOver ? tasksOver + " depășite" : "niciuna depășită", tasksOver ? "stop" : "", "#/tasks"),
      kpi("Rutina", fmtPct(prog.ratio, 0), prog.overdue ? prog.overdue + " depășite" : prog.nok ? prog.nok + " NOK" : "la zi", prog.overdue ? "warn" : "", "#/routine")));

  const lines = h("section", null, sect("Linii", h("a", { href: "#/production" }, "Toate liniile")),
    h("div.minirail", null, [...st.lines].sort(severity).map((L) => h("a.mr", { href: "#/line/" + L.line.id, class: "s-" + L.status },
      h("span.mr-n.clip", null, L.line.name), h("span.mr-d.num" + (L.sum.delta < 0 ? ".neg" : ""), null, L.planned ? fmtSigned(L.sum.delta) : ""),
      statusTag(L.status)))));

  return h("div.today", null, hero, h("div.split", null, h("div", null, attn, lines), h("div", null, routine, kp)));
}
const isOpenInc = (i) => !["resolved", "verified", "closed"].includes(i.status);
const fig = (l, v, d, tone = "") => h("div.fig" + (tone ? "." + tone : ""), null, h("span.fl", null, l), h("span.fv.num", null, v), h("span.fd", null, d));
const leg = (b, t) => h("span", null, h("i.b-" + b), t);
const ORDER = { stop: 0, notrunning: 0, unknown: 1, changeover: 2, run: 3, notplanned: 4 };
const severity = (a, b) => ORDER[a.status] - ORDER[b.status] || (a.attainment ?? 9) - (b.attainment ?? 9);
function alertRow(a) {
  return h("a.alert.sev-" + a.severity, { href: a.route },
    h("span.al-sev", null, SEVERITY_LABEL[a.severity]),
    h("span.al-main", null, h("b", null, a.title), h("span.al-ev", null, a.evidence), h("span.al-act", null, a.action)),
    icon("right", "chev"));
}
function routineQuick(r) {
  const k = r.inst.key;
  const set = (patch, msg) => commit((d) => record(d, k, patch, now()), msg);
  return h("div.rq.st-" + r.status, null,
    h("a.rq-main", { href: "#/routine?focus=" + encodeURIComponent(k) }, h("b", null, r.act.title), h("span.small.muted", null, r.act.group + (r.inst.label ? " · " + r.inst.label : "") + " · " + STATUS[r.status])),
    r.act.result === "check"
      ? h("div.rq-btns", null,
        h("button.okb", { type: "button", onclick: () => set({ result: "ok" }, "OK înregistrat") }, "OK"),
        h("button.nokb", { type: "button", onclick: () => { set({ result: "nok" }, "NOK înregistrat"); taskFromSheet({ title: r.act.title, source: { type: "routine", label: r.act.group }, heading: "NOK → acțiune", onCreated: (t) => commit((d) => record(d, k, { taskId: t.id }, now())) }); } }, "NOK"))
      : h("div.rq-btns", null, h("button.okb", { type: "button", onclick: () => set({ result: "ok" }, "Finalizat") }, "Gata")));
}
function onboarding() {
  return h("div", null, h("div.head", null, h("div", null, h("h1", null, "Bun venit"), h("p", null, "Configurează catalogul ca centrul de comandă să aibă date reale. Nimic nu este inventat."))),
    h("div.steps", null,
      step("1", "Liniile tale", "Cataloage → „Adaugă mai multe”: lipește cele 13 denumiri, câte una pe rând. Rămân doar pe acest telefon, nu ajung pe internet.", "#/catalog"),
      step("2", "PN-uri și timpi de ciclu", "Timpul ideal (ICT) permite OEE corect. Fără el, OEE apare „Date insuficiente”.", "#/catalog?tab=pns"),
      step("3", "Echipa", "Oamenii, rolurile și matricea de calificare 1–4.", "#/catalog?tab=people"),
      step("4", "Programul schimburilor", "Orele și pauzele. Pauzele scad minutele productive din plan.", "#/settings")),
    null);
}
const step = (n, t, d, href) => h("a.stepcard", { href }, h("span.num.stepn", null, n), h("span", null, h("b", null, t), h("small", null, d)), icon("right", "chev"));
