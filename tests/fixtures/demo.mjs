// Date SINTETICE doar pentru teste (nu sunt încărcate de aplicație). Nu reprezintă nicio fabrică reală.
import { emptyDoc, uid } from "../../js/core/doc.js";
import { shiftKey, currentShift, shiftWindow, MIN } from "../../js/core/time.js";
import { addEvent } from "../../js/domain/lines.js";
import { createIncident, transition } from "../../js/domain/incidents.js";
import { createTask } from "../../js/domain/tasks.js";
import { defaultTemplate, instancesFor, record } from "../../js/domain/routine.js";

export function demoDoc(now = new Date()) {
  const doc = emptyDoc(true);
  doc.master.lines = [];
  doc.settings.myShiftId = null;
  doc.settings.zone = "Zona demo";
  doc.settings.shifts.forEach((s) => (s.breaks = s.id === "S1" ? [{ start: "10:00", end: "10:20" }] : s.id === "S2" ? [{ start: "18:00", end: "18:20" }] : [{ start: "02:00", end: "02:20" }]));
  const L = (n) => "Linia " + String.fromCharCode(64 + n);
  const pns = Array.from({ length: 8 }, (_, i) => ({ id: uid(), code: "PN-TEST-00" + (i + 1), name: "Reper sintetic " + (i + 1), ict: 30 + i * 5, cycleSec: 36 + i * 5 }));
  doc.master.pns = pns;
  doc.master.faults = [
    ["AV-01", "Defect mecanic", "availability"], ["AV-02", "Defect electric", "availability"], ["AV-03", "Senzor", "availability"],
    ["SU-01", "Schimbare reper", "availability"], ["MS-01", "Blocaj alimentare", "performance"], ["QA-01", "Blocare calitate", "availability"],
  ].map(([code, name, loss]) => ({ id: uid(), code, name, loss }));
  for (let n = 1; n <= 13; n++) {
    doc.master.lines.push({
      id: uid(), code: "L" + String(n).padStart(2, "0"), name: L(n), zone: "Zona demo", active: true, requiredOps: 3 + (n % 3), tlId: null,
      pnIds: [pns[n % 8].id, pns[(n + 3) % 8].id],
      machines: [10, 20, 30].map((op) => ({ id: uid(), name: "OP" + op, op: "OP" + op, requiredLevel: 3 })),
    });
  }
  const roles = ["tl", "tl", "tl", "tl", "tl", "tl"];
  for (let i = 1; i <= 52; i++)
    doc.master.people.push({ id: uid(), name: (i <= 6 ? "TL " : "Operator ") + String(i).padStart(2, "0"), role: roles[i - 1] || "operator", category: i <= 6 ? "Team Leader" : i > 48 ? "Quality Wall" : "Operator", shiftId: null, active: true });
  doc.master.lines.forEach((l, i) => (l.tlId = doc.master.people[Math.floor(i / 2.2)].id));
  // Calificări sintetice: variate, cu câteva goluri intenționate.
  const ops = doc.master.people.filter((p) => p.role === "operator");
  ops.forEach((p, i) => doc.master.lines.forEach((l, j) => l.machines.forEach((m, k) => {
    const v = (i * 7 + j * 3 + k * 5) % 11;
    if (v < 7) doc.quals[p.id + "|" + l.id + ":" + m.id] = { level: [1, 2, 3, 3, 3, 4, 2][v], date: "2026-10-0" + ((v % 9) + 1), evaluator: "TL 01", note: "", migrated: false, history: [] };
  })));
  const cur = currentShift(now, doc.settings.shifts);
  if (!cur) return doc;
  const { workDay, shift } = cur;
  const sk = shiftKey(workDay, shift.id);
  const w = shiftWindow(workDay, shift);
  const hm = (m) => { const d = new Date(w.from.getTime() + m * MIN); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };
  doc.plans[sk] = {};
  doc.attendance[sk] = {};
  doc.assignments[sk] = [];
  const elapsedMin = Math.max(0, (now - w.from) / MIN);
  let pi = 6;
  const used = new Set();
  // Target = 92 % din capacitatea la ciclul planificat (minute productive estimate).
  const cap = (pnId, minutes) => Math.floor((minutes * 60) / pns.find((p) => p.id === pnId).cycleSec * 0.92);
  doc.master.lines.forEach((l, i) => {
    if (i === 11 || i === 12) { doc.plans[sk][l.id] = { lineId: l.id, notPlanned: true, runs: [], baseline: null, revisions: [] }; return; }
    const runs = i % 4 === 0
      ? [{ id: uid(), pnId: l.pnIds[0], start: hm(0), end: hm(240), target: cap(l.pnIds[0], 220), method: "productive", ops: l.requiredOps, priority: "A", note: "" },
        { id: uid(), pnId: l.pnIds[1], start: hm(255), end: hm(480), target: cap(l.pnIds[1], 205), method: "productive", ops: l.requiredOps, priority: "B", note: "" }]
      : [{ id: uid(), pnId: l.pnIds[0], start: hm(0), end: hm(480), target: cap(l.pnIds[0], 440), method: "productive", ops: l.requiredOps, priority: i < 4 ? "A" : "B", note: "" }];
    doc.plans[sk][l.id] = { lineId: l.id, notPlanned: false, runs, baseline: null, revisions: [] };
    // Evenimente și rapoarte sintetice până la ora curentă.
    if (i !== 9) addEvent(doc.events, { lineId: l.id, type: "run", at: new Date(w.from.getTime() + (i % 3) * 4 * MIN), pnId: l.pnIds[0] }, now);
    if (i === 2 && elapsedMin > 95) addEvent(doc.events, { lineId: l.id, type: "stop", at: new Date(w.from.getTime() + 70 * MIN), reason: "Senzor prezență piesă", faultId: doc.master.faults[2].id }, now);
    if (i === 2 && elapsedMin > 95) addEvent(doc.events, { lineId: l.id, type: "run", at: new Date(w.from.getTime() + 97 * MIN) }, now);
    if (i === 5 && elapsedMin > 50) addEvent(doc.events, { lineId: l.id, type: "stop", at: new Date(now.getTime() - 34 * MIN), reason: "Defect mecanic dispozitiv", faultId: doc.master.faults[0].id }, now);
    if (i === 7 && elapsedMin > 30) addEvent(doc.events, { lineId: l.id, type: "changeover", at: new Date(now.getTime() - 12 * MIN), pnId: l.pnIds[1] }, now);
    doc.reports[sk] ||= {};
    doc.reports[sk][l.id] = {};
    const pn = doc.master.pns.find((p) => p.id === l.pnIds[0]);
    const perHour = Math.floor(3600 / pn.cycleSec);
    for (let h = 0; (h + 1) * 60 <= elapsedMin - 10 && h < 8; h++) {
      if (i === 4 && h === Math.floor(elapsedMin / 60) - 1) continue; // un raport lipsă
      const loss = i === 2 && h === 1 ? 0.55 : i === 6 ? 0.8 : 0.9 + ((i * 3 + h) % 5) * 0.03;
      const total = Math.round(perHour * loss);
      doc.reports[sk][l.id][h] = { splits: [{ pnId: pn.id, total, scrap: (i + h) % 5 === 0 ? 3 : (i + h) % 3, rework: h % 4 === 0 ? 1 : 0 }], note: "", reason: loss < 0.8 ? "Micro-opriri alimentare" : "", at: now.toISOString() };
    }
    // Oameni: TL + operatori.
    // Alocare sintetică: cel mai calificat operator liber pe fiecare post (decizie demonstrativă).
    for (let k = 0; k < l.requiredOps - (i === 6 ? 1 : 0); k++) {
      const m = l.machines[k % 3];
      const lv = (p) => doc.quals[p.id + "|" + l.id + ":" + m.id]?.level || 0;
      const p = ops.filter((o) => !used.has(o.id)).sort((a, b) => lv(b) - lv(a))[0];
      if (!p) break;
      used.add(p.id);
      pi++;
      doc.attendance[sk][p.id] = "present";
      doc.assignments[sk].push({ id: uid(), personId: p.id, lineId: l.id, machineId: m.id, role: "operator", from: "", to: "" });
    }
  });
  ops.filter((o) => !used.has(o.id)).slice(0, 4).forEach((p, k) => (doc.attendance[sk][p.id] = k === 0 ? "absent" : "present"));
  doc.master.people.filter((p) => p.role === "tl").forEach((p) => (doc.attendance[sk][p.id] = "present"));
  // Rutina: activitățile de dinainte și de la începutul schimbului sunt deja bifate (sintetic).
  for (const act of defaultTemplate().filter((a) => a.phase === "before" || a.phase === "start"))
    for (const inst of instancesFor(act, workDay, shift))
      if (inst.from < now && !inst.weekly && act.id !== "b-blocked") record(doc, inst.key, { result: act.id === "s-scrap" ? "nok" : "ok" }, new Date(Math.min(now, inst.to)));
  const inc = createIncident(doc.incidents, { lineId: doc.master.lines[5].id, machineId: doc.master.lines[5].machines[1].id, category: "Defect mecanic",
    faultId: doc.master.faults[0].id, desc: "Dispozitiv de prindere blocat", severity: "high", startAt: new Date(now.getTime() - 34 * MIN), dept: "Mentenanță" }, now);
  transition(inc, "notified", now, new Date(now.getTime() - 30 * MIN));
  transition(inc, "intervention", now, new Date(now.getTime() - 22 * MIN));
  createIncident(doc.incidents, { lineId: doc.master.lines[9].id, category: "Senzor", desc: "Senzor intermitent la OP20", severity: "medium", startAt: new Date(now.getTime() - 15 * MIN), stopsLine: false }, now);
  const t = (title, extra) => createTask(doc.tasks, { title, ...extra }, now);
  t("Verifică stocul de garnituri pentru schimbul următor", { priority: "high", due: workDay, dept: "Logistică", ownerId: doc.master.people[1].id, source: { type: "routine" } });
  t("Actualizează fișa de parametri la Linia C", { priority: "normal", due: "2026-01-01", ownerId: doc.master.people[2].id, lineId: doc.master.lines[2].id, source: { type: "production" } });
  t("Instruire Operator 14 pe OP20, Linia B", { priority: "normal", due: workDay, ownerId: doc.master.people[0].id, lineId: doc.master.lines[1].id, source: { type: "manual" } });
  doc.kaizen.push({ id: uid(), problem: "Căutarea sculei de reglaj la schimbarea reperului", current: "Scula este depozitată la altă linie", proposal: "Panou de scule la post, cu contur", category: "Productivitate",
    impact: 3, effort: 1, safety: false, quality: false, ownerId: doc.master.people[1].id, status: "do", estimate: "Reducere estimată a changeover-ului (de măsurat)", result: "", verification: "", createdAt: now.toISOString() });
  doc.poka.push({ id: uid(), lineId: doc.master.lines[0].id, machineId: doc.master.lines[0].machines[0].id, pnId: pns[1].id, error: "Piesă montată invers", method: "contact", fn: "control", freq: "shift", checks: [], ownerId: doc.master.people[0].id });
  return doc;
}
