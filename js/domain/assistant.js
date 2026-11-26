// Asistent operațional: reguli explicabile, fără AI. Fiecare alertă arată datele care au declanșat-o.
// Fără date → fără alerte. Nicio decizie nu se ia automat.
import { MIN, fmtHM, day } from "../core/time.js";
import { fmtN } from "../core/num.js";
import { isOverdue, isOpen } from "./tasks.js";
import { conflicts } from "./workforce.js";
import { recurring, INC_STATUS } from "./incidents.js";
import { routineFor } from "./routine.js";

const SEV = { critical: 0, high: 1, medium: 2, low: 3 };
export function attention(doc, st, now) {
  const out = [];
  const th = doc.settings.thresholds;
  const people = Object.fromEntries(doc.master.people.map((p) => [p.id, p]));
  const push = (a) => out.push({ id: a.kind + ":" + (a.ref || ""), ...a });
  for (const L of st.lines) {
    const name = L.line.name;
    // Plan închis (CP): linia nu rulează intenționat — informare, fără escaladare.
    const closedPlan = L.status === "notrunning" && /\bCP\b|closed plan|plan închis/i.test(L.last?.reason || "");
    if (L.planned && closedPlan)
      push({ kind: "closedplan", ref: L.line.id, severity: "low", title: name + ": plan închis (CP)",
        evidence: "„" + L.last.reason + "”, de la " + fmtHM(new Date(L.last.at)) + ".", impact: "Planul liniei nu se realizează în acest schimb.",
        action: "Fără acțiune; redeschide linia când planul se reia.", route: "#/line/" + L.line.id });
    else if (L.planned && (L.status === "stop" || L.status === "notrunning")) {
      const m = Math.round(L.statusSince || 0);
      push({ kind: "stop", ref: L.line.id, severity: m >= th.escalateStopMin ? "critical" : "high",
        title: name + ": " + (L.status === "stop" ? "oprită" : "nu rulează") + " de " + m + " min",
        evidence: "Ultimul eveniment: " + (L.last?.reason || "fără motiv") + ", la " + fmtHM(new Date(L.last.at)) + ".",
        impact: m >= th.escalateStopMin ? "Pragul de escaladare (" + th.escalateStopMin + " min) este depășit." : "Producția planificată nu se realizează.",
        action: m >= th.escalateStopMin ? "Escaladează conform procedurii și leagă un incident." : "Verifică linia și înregistrează incidentul.",
        route: "#/line/" + L.line.id });
    }
    if (L.planned && L.status === "unknown" && st.lines.filter((x) => x.planned && x.status === "unknown").length <= 2)
      push({ kind: "unknown", ref: L.line.id, severity: "medium", title: name + ": status necunoscut",
        evidence: "Linia este planificată, dar nu există niciun eveniment de pornire în schimb.",
        impact: "Availability și downtime-ul nu pot fi calculate.", action: "Înregistrează pornirea, cu ora reală.", route: "#/line/" + L.line.id });
    const overdue = L.rows.filter((r) => r.state === "overdue");
    if (overdue.length)
      push({ kind: "report", ref: L.line.id, severity: overdue.length >= 2 ? "high" : "medium",
        title: name + ": " + overdue.length + (overdue.length === 1 ? " raport orar lipsă" : " rapoarte orare lipsă"),
        evidence: "Intervale fără raport: " + overdue.map((r) => r.slot.label).join(", ") + ".",
        impact: "Totalurile schimbului și OEE rămân incomplete.", action: "Completează raportul orar.", route: "#/report/" + L.line.id + "/" + overdue[0].slot.i });
    const closed = L.rows.filter((r) => r.slot.to <= now && r.plan > 0 && r.actual !== null);
    if (closed.length && !closedPlan) {
      const pl = closed.reduce((a, r) => a + r.plan, 0), ac = closed.reduce((a, r) => a + r.actual, 0);
      if (pl > 0 && (ac / pl) * 100 < th.underTarget)
        push({ kind: "under", ref: L.line.id, severity: (ac / pl) * 100 < th.underTarget - 15 ? "high" : "medium",
          title: name + ": sub target (" + fmtN((ac / pl) * 100) + " %)",
          evidence: "Realizat " + fmtN(ac) + " din " + fmtN(pl) + " planificat în " + closed.length + " ore raportate. Prag: " + th.underTarget + " %.",
          impact: "Deviație negativă față de cerințele clientului.", action: "Analizează cauza și escaladează deviația dacă nu poate fi recuperată.", route: "#/line/" + L.line.id });
    }
  }
  const unknown = st.lines.filter((x) => x.planned && x.status === "unknown");
  if (unknown.length > 2)
    push({ kind: "unknown", ref: "many", severity: "medium", title: unknown.length + " linii planificate fără pornire înregistrată",
      evidence: unknown.map((x) => x.line.name).join(", ") + ".", impact: "Availability, downtime și OEE nu pot fi calculate pentru ele.",
      action: "Pe fiecare linie: Pornește, cu ora reală.", route: "#/production?f=problems" });
  for (const inc of doc.incidents.filter((i) => !["resolved", "verified", "closed"].includes(i.status)))
    if (!inc.ownerId && !inc.dept) {
      const line = doc.master.lines.find((l) => l.id === inc.lineId);
      push({ kind: "incowner", ref: inc.id, severity: "high", title: "Incident fără responsabil: " + (line?.name || "") + (inc.desc ? " · " + inc.desc : ""),
        evidence: "Incidentul #" + inc.no + " („" + INC_STATUS[inc.status] + "”) nu are persoană sau departament.", impact: "Nimeni nu răspunde de rezolvare.",
        action: "Alocă un responsabil.", route: "#/incident/" + inc.id });
    }
  const today = day(now);
  const overdueTasks = doc.tasks.filter((t) => isOverdue(t, today));
  if (overdueTasks.length)
    push({ kind: "tasks", ref: "", severity: overdueTasks.some((t) => t.priority === "critical" || t.priority === "high") ? "high" : "medium",
      title: overdueTasks.length + (overdueTasks.length === 1 ? " sarcină depășită" : " sarcini depășite"),
      evidence: overdueTasks.slice(0, 3).map((t) => t.title + " (termen " + t.due + ")").join("; ") + ".",
      impact: "Acțiuni neînchise la termen.", action: "Revizuiește responsabilii și termenele.", route: "#/tasks?f=overdue" });
  // Conflictele de personal se grupează pe tip: o alertă per tip, cu persoanele în evidență.
  const PEOPLE = {
    absent: ["high", "alocați, dar neprezenți"], double: ["high", "alocați simultan pe două posturi"],
    nosupport: ["high", "de nivel 1–2 fără suport de nivel 3–4 pe linie"], unqualified: ["medium", "neevaluați pe postul alocat"],
  };
  const groups = new Map();
  for (const c of conflicts(doc, st.sk)) if (PEOPLE[c.type]) groups.set(c.type, [...(groups.get(c.type) || []), c]);
  for (const [type, list] of groups)
    push({ kind: "people-" + type, ref: "", severity: PEOPLE[type][0], title: list.length + (list.length === 1 ? " persoană " : " persoane ") + PEOPLE[type][1],
      evidence: list.slice(0, 3).map((c) => c.text).join(" ") + (list.length > 3 ? " …" : ""), impact: "Risc de calitate sau post neacoperit.", action: "Corectează alocarea.", route: "#/team/allocation" });
  // Fără pontaj marcat: o singură alertă, nu câte una pe linie.
  if (!st.people.marked && st.people.need > 0)
    push({ kind: "attendance", ref: "", severity: "medium", title: "Pontajul nu este marcat",
      evidence: "Necesar pe liniile planificate: " + st.people.need + " operatori.", impact: "Acoperirea liniilor nu poate fi verificată.",
      action: "Marchează prezența și alocă operatorii.", route: "#/team" });
  else for (const cv of st.people.coverage.filter((c) => c.gap > 0))
    push({ kind: "gap", ref: cv.lineId, severity: "high", title: cv.line?.name + ": " + (cv.gap === 1 ? "lipsește 1 operator" : "lipsesc " + cv.gap + " operatori"),
      evidence: "Necesar " + cv.need + ", alocați și prezenți " + cv.present + ".", impact: "Linia nu poate rula la capacitate.",
      action: "Vezi operatorii disponibili pentru redistribuire.", route: "#/team/allocation" });
  // First Off: linie în funcțiune fără First Off confirmat în schimb.
  for (const L of st.lines.filter((l) => l.status === "run")) {
    const fo = doc.audits.find((a) => a.type === "firstoff" && a.lineId === L.line.id && a.extra?.sk === st.sk);
    if (!fo || fo.status !== "done")
      push({ kind: "firstoff", ref: L.line.id, severity: "medium", title: L.line.name + ": First Off neconfirmat",
        evidence: "Linia este în funcțiune în acest schimb fără un First Off finalizat.", impact: "Risc de producție neconformă.",
        action: "Confirmă First Off.", route: "#/audit/new/firstoff?line=" + L.line.id });
  }
  const noks = doc.audits.filter((a) => a.status === "done" && a.questions.some((q) => a.answers[q.id]?.r === "nok" && !a.answers[q.id]?.taskId && (a.extra?.sk === st.sk || a.date === st.workDay)));
  for (const a of noks)
    push({ kind: "auditnok", ref: a.id, severity: "medium", title: "Audit " + a.type.toUpperCase() + " cu NOK fără sarcină",
      evidence: a.questions.filter((q) => a.answers[q.id]?.r === "nok").map((q) => q.text).slice(0, 2).join("; "), impact: "Neconformitatea poate rămâne neurmărită.",
      action: "Creează sarcina pentru NOK.", route: "#/audit/" + a.id });
  const rows = routineFor(doc, st.workDay, st.shift, now).filter((r) => r.status === "overdue");
  if (rows.length)
    push({ kind: "routine", ref: "", severity: "medium", title: rows.length + (rows.length === 1 ? " punct de rutină depășit" : " puncte de rutină depășite"),
      evidence: rows.slice(0, 2).map((r) => r.act.title).join("; ") + ".", impact: "Standard work neaplicat.", action: "Deschide rutina.", route: "#/routine" });
  for (const r of recurring(doc.incidents, now))
    push({ kind: "recurring", ref: r.key.id, severity: "medium", title: "Defect recurent: " + r.count + "× în 7 zile",
      evidence: "Aceeași mașină și același cod: " + (r.key.desc || r.key.category || "—") + ".", impact: "Cauza nu a fost eliminată.",
      action: "Analizează cu 8D / cauză rădăcină.", route: "#/incident/" + r.key.id });
  return out.sort((a, b) => SEV[a.severity] - SEV[b.severity]);
}
export const SEVERITY_LABEL = { critical: "Critic", high: "Ridicat", medium: "Mediu", low: "Scăzut" };
export const openTasksCount = (doc) => doc.tasks.filter(isOpen).length;
