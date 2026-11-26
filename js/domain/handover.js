// Predarea schimbului generată din module. Câmpurile manuale: observații și priorități.
import { fmtHM, fmtDay } from "../core/time.js";
import { fmtN, fmtPct, fmtSigned } from "../core/num.js";
import { isOpen, isOverdue } from "./tasks.js";
import { INC_STATUS, durations } from "./incidents.js";
import { LINE_STATUS } from "./lines.js";
import { routineFor } from "./routine.js";

export function buildHandover(doc, st, now) {
  const names = Object.fromEntries(doc.master.pns.map((p) => [p.id, p.code]));
  const lines = st.lines.filter((l) => l.planned || l.status !== "notplanned").map((l) => ({
    name: l.line.name, status: LINE_STATUS[l.status].label, pn: names[l.activePn] || "—",
    plan: l.planTotal, actual: l.sum.actual, delta: l.sum.actual !== null && l.planTotal !== null ? l.sum.actual - l.planTotal : null,
    scrap: l.sum.scrap.missing ? null : l.sum.scrap.sum, downtime: Math.round(l.mins.stop + l.mins.notrunning), changeover: Math.round(l.mins.changeover),
    missing: l.rows.filter((r) => r.state === "overdue" || r.state === "incomplete").map((r) => r.slot.label),
    oee: l.oee?.oee ?? null,
  }));
  const openInc = doc.incidents.filter((i) => !["closed"].includes(i.status)).map((i) => ({
    no: i.no, line: doc.master.lines.find((l) => l.id === i.lineId)?.name || "—", desc: i.desc || i.category, status: INC_STATUS[i.status],
    elapsed: durations(i, now).elapsed,
  }));
  const tasks = doc.tasks.filter(isOpen);
  const people = Object.fromEntries(doc.master.people.map((p) => [p.id, p.name]));
  const routine = routineFor(doc, st.workDay, st.shift, now).filter((r) => ["overdue", "missed"].includes(r.status) || r.entry?.result === "nok");
  return {
    key: st.sk, generatedAt: now.toISOString(), day: st.workDay, shift: st.shift.name,
    totals: { plan: st.planTotal, actual: st.actual, partial: st.actualMissing > 0, oee: st.oee?.oee ?? null, people: st.people },
    lines, incidents: openInc,
    tasks: tasks.map((t) => ({ title: t.title, owner: people[t.ownerId] || t.dept || "—", due: t.due, overdue: isOverdue(t, st.workDay) })),
    quality: doc.eightD.filter((d) => d.status !== "closed").map((d) => "8D #" + d.no + ": " + d.title),
    routine: routine.map((r) => r.act.title + (r.entry?.result === "nok" ? " (NOK)" : " (" + (r.status === "missed" ? "neîndeplinit" : "depășit") + ")")),
  };
}
export function handoverText(h, notes = {}) {
  const L = [];
  L.push("PREDARE SCHIMB · " + fmtDay(h.day, true) + " · " + h.shift);
  L.push("Plan " + fmtN(h.totals.plan) + " · Realizat " + fmtN(h.totals.actual) + (h.totals.partial ? " (rapoarte lipsă)" : "") + " · OEE " + fmtPct(h.totals.oee));
  L.push("Personal: prezenți " + h.totals.people.present + ", deficit " + h.totals.people.gap);
  L.push("", "LINII");
  for (const l of h.lines) L.push("- " + l.name + ": " + l.status + ", PN " + l.pn + ", " + fmtN(l.actual) + "/" + fmtN(l.plan) + " (" + fmtSigned(l.delta) + "), rebut " + fmtN(l.scrap) + ", oprire " + l.downtime + " min" + (l.missing.length ? ", lipsă raport: " + l.missing.join(", ") : ""));
  if (h.incidents.length) { L.push("", "INCIDENTE DESCHISE"); for (const i of h.incidents) L.push("- #" + i.no + " " + i.line + ": " + i.desc + " (" + i.status + ")"); }
  if (h.tasks.length) { L.push("", "SARCINI DESCHISE"); for (const t of h.tasks) L.push("- " + t.title + " · " + t.owner + (t.due ? " · " + t.due : "") + (t.overdue ? " · DEPĂȘIT" : "")); }
  if (h.quality.length) { L.push("", "CALITATE"); for (const q of h.quality) L.push("- " + q); }
  if (h.routine.length) { L.push("", "RUTINĂ NEFINALIZATĂ"); for (const r of h.routine) L.push("- " + r); }
  if (notes.materials) L.push("", "MATERIALE / WIP", notes.materials);
  if (notes.priorities) L.push("", "PRIORITĂȚI SCHIMBUL URMĂTOR", notes.priorities);
  if (notes.notes) L.push("", "OBSERVAȚII", notes.notes);
  L.push("", "Generat " + fmtHM(new Date(h.generatedAt)) + ". Document personal; completează procesul oficial.");
  return L.join("\n");
}
