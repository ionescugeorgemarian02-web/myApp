// Rutina EPT a supervizorului: șablon configurabil + instanțe pe perioadă, fără duplicate.
import { shiftWindow, breaksOf, isoWeek, MIN } from "../core/time.js";

export const PHASES = [
  { id: "before", title: "Înainte de începutul schimbului", short: "Înainte" },
  { id: "start", title: "La începutul schimbului", short: "Început" },
  { id: "during", title: "În timpul schimbului", short: "În timpul" },
  { id: "end", title: "La sfârșitul schimbului", short: "Sfârșit" },
  { id: "rules", title: "Reguli", short: "Reguli" },
];
export const FREQ = {
  shift: "O dată pe schimb",
  "2h": "La fiecare 2 ore",
  afterBreak: "După fiecare pauză",
  weekly: "Săptămânal",
  twiceWeekly: "De două ori pe săptămână",
  rule: "Permanent",
};
export const STATUS = {
  upcoming: "Urmează", available: "Disponibil", progress: "În lucru", done: "Finalizat",
  missed: "Neîndeplinit", overdue: "Depășit", na: "Neaplicabil",
};
export const ESCALATION_RULE =
  "Proces de escaladare: dacă o anumită sarcină nu poate fi îndeplinită, indiferent de motiv, superiorul direct trebuie informat imediat.";

// Fișa „EPT Supervisor Routine” (ORA-F-7900/03), transcrisă rând cu rând: [id, fază, activitate, descriere, frecvență, legătură, notă din fișă]
// Frecvențe: shift = Zilnic, 2h = La fiecare 2 ore, weekly = Săptămânal. Fiecare rând se bifează DA (rezolvat) / NU (nerezolvat).
export const TEMPLATE_VERSION = 2;
const T = [
  ["b1", "before", "Întâlnire cu supervizorul de pe schimbul anterior", "Informare cu privire la subiectele actualizate în conformitate cu planul de producție (calitate, materiale etc.)", "shift", "handover"],
  ["b2", "before", "Întâlnire cu supervizorul de pe schimbul anterior", "Informare despre proiecte și priorități în toate zonele de lucru", "shift", "handover"],
  ["b3", "before", "Întâlnire cu supervizorul de pe schimbul anterior", "Probleme și riscuri de defecțiuni", "shift", "incidents"],
  ["b4", "before", "Pregătirea informațiilor pentru schimb și TOP 5", "Revizuiește emailurile pentru reclamații de la clienți și distribuirea alertelor de calitate, cât și instruirea personalului", "shift", "quality"],
  ["b5", "before", "Pregătirea informațiilor pentru schimb și TOP 5", "Confirmarea Build Schedule / comenzilor (notarea priorităților pentru Top 5 produse/linii/celule)", "shift", "planning"],
  ["b6", "before", "Pregătirea informațiilor pentru schimb și TOP 5", "Confirmarea disponibilității mașinilor", "shift", "production"],
  ["b7", "before", "Pregătirea informațiilor pentru schimb și TOP 5", "Confirmarea inventarului pentru a realiza planul de producție", "shift", "planning"],
  ["b8", "before", "Stoc blocat", "Verificarea stocului de materiale blocate din ultimele 24 de ore", "shift", "tasks"],
  ["b9", "before", "TOP 5", "Asistarea Team Leaderului în pregătirea TOP 5, prin împărtășirea informațiilor deja colectate", "shift", "team"],
  ["b10", "before", "HSE", "Verificarea purtării EIP (mănuși, mânecuțe/jachete, dopuri de urechi, ochelari, bocanci) de către personalul din subordine", "shift", null],
  ["b11", "before", "TOP 5", "Asistarea la TOP 5 în una dintre echipe (verificarea informațiilor primite / folosirea documentului de coaching)", "shift", null],
  ["s1", "start", "Distribuirea forței de muncă", "Revizuirea forței de muncă", "shift", "team"],
  ["s2", "start", "Distribuirea forței de muncă", "Distribuirea operatorilor pe celule/linii după necesitate, în conformitate cu prioritățile", "shift", "allocation"],
  ["s3", "start", "Evaluarea rebuturilor", "Participă/conduce ședința de revizuire a rebuturilor/materialelor și reacționează în consecință", "shift", "scrap"],
  ["s4", "start", "Indicatori de performanță și reacție", "Efectuarea auditului LPA pe liniile de producție conform planificării", "weekly", "lpa"],
  ["d1", "during", "Prima piesă", "Verifică dacă prima piesă a fost realizată, este în locul special dedicat și dacă formularul de First Off este completat corect. Verifică dacă fișele de parametri sunt actualizate.", "shift", "firstoff"],
  ["d2", "during", "Cerințele clientului", "Status pentru îndeplinirea cerințelor / comenzilor de producție (în cazul în care există deviații negative, problema trebuie escaladată)", "2h", "production"],
  ["d3", "during", "Team Leader Routine", "Verifică cel puțin 2 formulare de TL Routine pe schimb", "shift", "tasks"],
  ["d4", "during", "Status producție", "Revizuiește panourile EPT, inclusiv norma orară (dacă informația este corectă și acurată), acționează în consecință", "2h", "report"],
  ["d5", "during", "Line QPS", "Participă/conduce întâlnirea 8D QPS în funcție de necesitate", "shift", "eightd"],
  ["d6", "during", "Line QPS", "Revizuiește Line QPS la fiecare celulă, oferă suport sau escaladează dacă este necesar", "shift", "eightd"],
  ["d7", "during", "EPU TOP 5", "Întâlnire cu EPU Managerul (EPU Top 5 / revizuire scrap / 1 la 1)", "shift", "tasks"],
  ["d8", "during", "Standardizarea muncii", "Auditarea muncii standardizate cu Team Leaderul (cu fiecare de 2 ori pe săptămână) — identificarea variabilităților; găsește îmbunătățiri (notează numele Team Leaderului și ideile identificate)", "shift", "kaizen"],
  ["d9", "during", "HSE", "Verifică echipamentul de protecție", "shift", null],
  ["d10", "during", "HSE", "Verificarea zilnică a regulilor de siguranță", "shift", null],
  ["d11", "during", "TPM & 5S", "Verifică efectuarea mentenanței autonome pe liniile de producție", "shift", "s5"],
  ["d12", "during", "Calitate", "Măsoară un component (produs) — o linie/celulă pe zi", "shift", "quality"],
  ["d13", "during", "Calitate", "Audit 8 Baze ale Calității", "weekly", "quality"],
  ["d14", "during", "Evaluarea performanței cu TL", "Audit SW făcut în timpul săptămânii. Verificarea auditurilor făcute de către TL și identificarea ideilor de îmbunătățire", "weekly", "kaizen"],
  ["d15", "during", "Evaluarea performanței cu TL", "Verificarea matricelor de calificare pentru liniile de producție, cât și a planului de training", "weekly", "matrix"],
  ["d16", "during", "Evaluarea performanței cu TL", "Indicatori de performanță: revizuire și reacție", "weekly", "oee"],
  ["d17", "during", "Evaluarea performanței cu TL", "Rutinele și dificultățile întâlnite. Verifică reacția și escaladarea corectă. Este nevoie de actualizare, având în vedere problema?", "weekly", "tasks"],
  ["d18", "during", "Utilizarea Team Leaderului", "Reacție în caz de absenteism — evită să pui TL mai mult de 1/2 zi pe linie (se notează numărul de TL pe linie și timpul petrecut pe linie)", "shift", "allocation", "TL sunt folosiți în linii atunci când este necesar (1 TL are în subordine aproximativ 2 linii)."],
  ["d19", "during", "Idei de îmbunătățire", "Idei de îmbunătățire: câte pentru HSE? Este nevoie de o reacție imediată? (da/nu)", "weekly", "kaizen"],
  ["d20", "during", "HSE", "Verificarea purtării EIP (mănuși, mânecuțe/jachete, dopuri de urechi, ochelari, bocanci) de către personalul din subordine, după reîntoarcerea din pauze", "shift", null],
  ["e1", "end", "Raport de schimb", "Completează și actualizează cartea schimbului pentru schimbul următor", "shift", "handover"],
  ["e2", "end", "Evaluarea schimbului", "Verifică și semnează formularul de rutină al Team Leaderilor", "shift", "tasks"],
  ["e3", "end", "Evaluarea rebutului", "Evaluarea rebuturilor realizate pe parcursul schimbului", "shift", "scrap"],
  ["e4", "end", "Verificare WIP pentru schimbul următor", "Verifică dacă sunt suficiente materiale la stațiile de lucru (în cazul în care nu sunt suficiente materiale, oferă suport pentru furnizarea de materiale pentru schimbul următor)", "shift", "tasks"],
  ["e5", "end", "5S", "Verifică rutina de curățenie a liniilor", "shift", "s5"],
  ["e6", "end", "5S", "Verificarea cutiilor roșii, dacă sunt goale și curate", "shift", "s5"],
  ["e7", "end", "5S", "Turul de final de schimb, cu EPU Managerul", "shift", "gemba"],
  ["e8", "end", "Status producție", "Verificarea tuturor datelor, dacă sunt complete și actualizate", "shift", "report"],
  ["e9", "end", "Predarea schimbului", "Pregătește documentul de predare a schimbului", "shift", "handover"],
  ["e10", "end", "Predarea schimbului", "Întâlnire cu supervizorul schimbului următor pentru predare", "shift", "handover"],
  ["r1", "rules", "Gestionarea posturilor de lucru", "Identificarea locurilor de muncă cu prioritate A și asigurarea numărului de operatori necesari", "shift", "allocation"],
  ["r2", "rules", "Disciplina", "Se asigură că operatorii pot să muncească pe liniile de producție, prin asigurarea materiei prime și funcționarea mașinilor", "shift", "tasks"],
];
export function defaultTemplate() {
  return T.map(([id, phase, group, title, freq, link, hint = ""]) => ({
    id, phase, group, title, freq, link, result: "check", active: true, naAllowed: true, desc: hint,
  }));
}
export const templateOf = (doc) => (Array.isArray(doc.routine.template) && doc.routine.template.length ? doc.routine.template : defaultTemplate());

// Ferestrele de timp ale fazelor, relativ la schimb.
function phaseWindow(phase, w) {
  const len = (w.to - w.from) / MIN;
  const at = (m) => new Date(w.from.getTime() + m * MIN);
  switch (phase) {
    case "before": return { from: at(-60), to: at(15) };
    case "start": return { from: at(0), to: at(Math.min(60, len)) };
    case "during": return { from: at(Math.min(60, len / 4)), to: at(Math.max(len - 60, len / 2)) };
    case "end": return { from: at(Math.max(0, len - 60)), to: at(len) };
    default: return { from: w.from, to: w.to };
  }
}
// Instanțele unei activități pentru schimbul dat. Cheia nu depinde de momentul deschiderii.
export function instancesFor(act, workDay, shift) {
  const w = shiftWindow(workDay, shift);
  const sk = workDay + "|" + shift.id;
  const pw = phaseWindow(act.phase, w);
  if (act.freq === "2h") {
    const out = [];
    for (let h = 2; h * 60 < (w.to - w.from) / MIN; h += 2) {
      const cp = new Date(w.from.getTime() + h * 60 * MIN);
      out.push({ key: act.id + "@" + sk + "#" + h, label: "ora " + String(cp.getHours()).padStart(2, "0") + ":00", from: new Date(cp - 15 * MIN), to: new Date(cp.getTime() + 45 * MIN) });
    }
    return out;
  }
  if (act.freq === "afterBreak") {
    return breaksOf(workDay, shift).map((b, i) => ({
      key: act.id + "@" + sk + "#b" + i, label: "după pauza " + (i + 1), from: b.to, to: new Date(b.to.getTime() + 30 * MIN),
    }));
  }
  if (act.freq === "weekly") {
    const wk = isoWeek(workDay);
    return [{ key: act.id + "@" + wk, label: "săptămâna " + wk.slice(6), weekly: true, from: w.from, to: w.to }];
  }
  if (act.freq === "twiceWeekly") {
    const wk = isoWeek(workDay);
    return [1, 2].map((n) => ({ key: act.id + "@" + wk + "#" + n, label: n + "/2 în săptămâna " + wk.slice(6), weekly: true, from: w.from, to: w.to }));
  }
  if (act.freq === "rule") return [{ key: act.id + "@" + sk, label: "permanent", rule: true, from: w.from, to: w.to }];
  return [{ key: act.id + "@" + sk, label: "", from: pw.from, to: pw.to }];
}
export function statusOf(entry, inst, now) {
  if (entry?.state === "na") return "na";
  if (entry?.state === "missed") return "missed";
  if (entry?.done) return "done";
  if (entry?.state === "progress") return "progress";
  if (inst.rule) return "available";
  if (inst.weekly) return "available";
  if (now < inst.from) return "upcoming";
  if (now <= inst.to) return "available";
  return "overdue";
}
// Lista completă pentru schimb: activitate + instanță + intrare + status.
export function routineFor(doc, workDay, shift, now) {
  const log = doc.routine.log;
  const rows = [];
  for (const act of templateOf(doc).filter((a) => a.active !== false))
    for (const inst of instancesFor(act, workDay, shift)) {
      const entry = Object.hasOwn(log, inst.key) ? log[inst.key] : null;
      rows.push({ act, inst, entry, status: statusOf(entry, inst, now) });
    }
  return rows;
}
export function progress(rows) {
  const counted = rows.filter((r) => !r.inst.rule && r.status !== "na");
  const done = counted.filter((r) => r.status === "done").length;
  return {
    done, total: counted.length,
    overdue: rows.filter((r) => r.status === "overdue").length,
    nok: rows.filter((r) => r.entry?.result === "nok").length,
    ratio: counted.length ? done / counted.length : null,
  };
}
const RANK = { overdue: 0, available: 1, progress: 1, upcoming: 2 };
// „Ce trebuie să fac acum”: restante, apoi disponibile, apoi următoarele, după fereastră.
export function nowList(rows, limit = 5) {
  return rows.filter((r) => RANK[r.status] !== undefined && !r.inst.rule && !r.inst.weekly)
    .sort((a, b) => RANK[a.status] - RANK[b.status] || a.inst.to - b.inst.to).slice(0, limit);
}
// Înregistrează un rezultat. „done” se stabilește doar prin confirmarea utilizatorului.
export function record(doc, key, patch, at = new Date()) {
  const prev = Object.hasOwn(doc.routine.log, key) ? doc.routine.log[key] : {};
  const next = { ...prev, ...patch, at: at.toISOString() };
  if (patch.result === "ok" || patch.result === "nok") { next.done = true; next.state = "done"; }
  if (patch.state === "na" || patch.state === "missed") next.done = false;
  if (patch.reset) { delete doc.routine.log[key]; return null; }
  next.history = [...(prev.history || []), { at: next.at, result: next.result || null, state: next.state || null }].slice(-10);
  doc.routine.log[key] = next;
  return next;
}
