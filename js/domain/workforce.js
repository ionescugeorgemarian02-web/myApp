// Echipa: pontaj, alocare, calificare 1–4, conflicte și sugestii de redistribuire (decizia rămâne la supervizor).
import { uid } from "../core/doc.js";

export const LEVELS = {
  1: { short: "1", label: "Operator nou" },
  2: { short: "2", label: "Are nevoie de ajutor" },
  3: { short: "3", label: "Lucrează independent, îndeplinește cerințele de calitate și cantitate" },
  4: { short: "4", label: "Îndeplinește nivelul 3 și poate instrui alți operatori" },
};
export const postKey = (lineId, machineId) => lineId + ":" + (machineId || "*");
export const qualKey = (personId, lineId, machineId) => personId + "|" + postKey(lineId, machineId);
// Nivelul pe post; dacă nu există evaluare pe operație, se folosește cea pe linie (marcată ca atare).
export function levelOf(doc, personId, lineId, machineId) {
  const q = doc.quals;
  const exact = machineId ? q[qualKey(personId, lineId, machineId)] : null;
  if (exact) return { ...exact, scope: "post" };
  const line = q[qualKey(personId, lineId, null)];
  return line ? { ...line, scope: "linie" } : null;
}
export function setLevel(doc, personId, lineId, machineId, level, { evaluator = "", date, note = "" } = {}, now = new Date()) {
  if (![1, 2, 3, 4].includes(level)) throw Error("Nivelul trebuie să fie 1, 2, 3 sau 4.");
  if (level === 4) {
    const prev = levelOf(doc, personId, lineId, machineId);
    if (!prev || prev.level < 3) throw Error("Nivelul 4 cere confirmarea nivelului 3 pe același post.");
  }
  const k = qualKey(personId, lineId, machineId);
  const prev = doc.quals[k];
  const entry = { level, date: date || now.toISOString().slice(0, 10), evaluator, note, migrated: false,
    history: [...(prev?.history || []), ...(prev ? [{ level: prev.level, date: prev.date, evaluator: prev.evaluator, note: prev.note }] : [])].slice(-20) };
  doc.quals[k] = entry;
  return entry;
}
export function presentIds(doc, sk) {
  const att = doc.attendance[sk] || {};
  const st = Object.fromEntries(doc.settings.attendance.map((a) => [a.id, a]));
  return new Set(Object.entries(att).filter(([, s]) => st[s]?.present).map(([id]) => id));
}
export function assignmentsOf(doc, sk) {
  return doc.assignments[sk] || [];
}
export function assign(doc, sk, a) {
  if (!a.personId || !a.lineId) throw Error("Alege persoana și linia.");
  const list = (doc.assignments[sk] ||= []);
  const x = { id: uid(), personId: a.personId, lineId: a.lineId, machineId: a.machineId || null, role: a.role || "operator", from: a.from || "", to: a.to || "" };
  list.push(x);
  return x;
}
const overlaps = (a, b) => !a.from || !a.to || !b.from || !b.to || (a.from < b.to && b.from < a.to);
// Conflicte explicabile pentru alocarea schimbului.
export function conflicts(doc, sk) {
  const out = [];
  const present = presentIds(doc, sk);
  const marked = doc.attendance[sk] || {};
  const list = assignmentsOf(doc, sk);
  const people = Object.fromEntries(doc.master.people.map((p) => [p.id, p]));
  for (const a of list) {
    const p = people[a.personId];
    if (!p) continue;
    if (marked[a.personId] && !present.has(a.personId)) out.push({ type: "absent", a, text: p.name + " este alocat, dar nu este prezent." });
    if (!marked[a.personId]) out.push({ type: "unmarked", a, text: p.name + " este alocat, dar prezența nu este marcată." });
    if (a.role === "operator") {
      const line = doc.master.lines.find((l) => l.id === a.lineId);
      const m = line?.machines.find((x) => x.id === a.machineId);
      const need = m?.requiredLevel || 3;
      const lv = levelOf(doc, a.personId, a.lineId, a.machineId);
      if (!lv) out.push({ type: "unqualified", a, text: p.name + ": neevaluat pe " + (m?.name || line?.name || "post") + "." });
      else if (lv.level < need) {
        const support = list.some((b) => b !== a && b.lineId === a.lineId && present.has(b.personId) &&
          (levelOf(doc, b.personId, b.lineId, b.machineId)?.level || 0) >= 3);
        out.push({ type: lv.level <= 2 && !support ? "nosupport" : "level", a,
          text: p.name + ": nivel " + lv.level + " < necesar " + need + (lv.level <= 2 && !support ? ", fără suport de nivel 3–4 pe linie." : ".") });
      }
    }
  }
  for (let i = 0; i < list.length; i++)
    for (let j = i + 1; j < list.length; j++)
      if (list[i].personId === list[j].personId && list[i].lineId + list[i].machineId !== list[j].lineId + list[j].machineId && overlaps(list[i], list[j]))
        out.push({ type: "double", a: list[j], text: (people[list[i].personId]?.name || "Persoana") + " este alocată simultan pe două posturi." });
  return out;
}
// Necesar vs. alocat pe linie (doar liniile planificate).
export function coverage(doc, sk, lineIds) {
  const present = presentIds(doc, sk);
  const list = assignmentsOf(doc, sk);
  return lineIds.map((lineId) => {
    const line = doc.master.lines.find((l) => l.id === lineId);
    const need = Number(line?.requiredOps) || 0;
    const assigned = list.filter((a) => a.lineId === lineId && a.role === "operator");
    const ok = assigned.filter((a) => present.has(a.personId)).length;
    return { lineId, line, need, assigned: assigned.length, present: ok, gap: Math.max(0, need - ok) };
  });
}
// Sugestii: oameni prezenți nealocați, cu nivelul cel mai mare pe linia cu deficit.
export function suggestions(doc, sk, lineId, machineId = null) {
  const present = presentIds(doc, sk);
  const busy = new Set(assignmentsOf(doc, sk).map((a) => a.personId));
  return doc.master.people.filter((p) => p.active !== false && present.has(p.id) && !busy.has(p.id))
    .map((p) => ({ person: p, level: levelOf(doc, p.id, lineId, machineId) }))
    .filter((x) => x.level)
    .sort((a, b) => b.level.level - a.level.level);
}
// Posturi cu risc: mai puțin de 2 oameni de nivel ≥ 3 în toată echipa.
export function riskPosts(doc) {
  const out = [];
  for (const line of doc.master.lines)
    for (const m of line.machines.length ? line.machines : [{ id: null, name: "Linie" }]) {
      const n = doc.master.people.filter((p) => p.active !== false && (levelOf(doc, p.id, line.id, m.id)?.level || 0) >= 3).length;
      if (n < 2) out.push({ line, machine: m, qualified: n });
    }
  return out;
}
