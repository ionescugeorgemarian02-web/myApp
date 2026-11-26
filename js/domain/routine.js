// Rutina EPT a supervizorului: șablon configurabil + instanțe pe perioadă, fără duplicate.
import { shiftWindow, breaksOf, isoWeek, MIN } from "../core/time.js";

export const PHASES = [
  { id: "before", title: "Înainte de începutul schimbului", short: "Înainte" },
  { id: "start", title: "La începutul schimbului", short: "Început" },
  { id: "during", title: "În timpul schimbului", short: "În timpul" },
  { id: "end", title: "La sfârșitul schimbului", short: "Sfârșit" },
  { id: "rules", title: "Reguli permanente", short: "Reguli" },
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
  "Dacă o sarcină nu poate fi îndeplinită, indiferent de motiv, superiorul direct trebuie informat imediat, conform procedurii locale.";

// [id, fază, grup, activitate, frecvență, legătură, rezultat: "check" (OK/NOK) | "done"]
const T = [
  ["b-prev-plan", "before", "Întâlnire cu supervizorul schimbului anterior", "Informații actualizate conform planului: calitate, materiale", "shift", "handover", "done"],
  ["b-prev-proj", "before", "Întâlnire cu supervizorul schimbului anterior", "Proiecte și priorități în toate zonele", "shift", "handover", "done"],
  ["b-prev-risk", "before", "Întâlnire cu supervizorul schimbului anterior", "Probleme existente și riscuri de defecțiuni", "shift", "incidents", "check"],
  ["b-top5-claims", "before", "Pregătirea informațiilor și TOP 5", "Reclamații și alerte de calitate verificate; instruirea personalului pe ele", "shift", "quality", "check"],
  ["b-top5-build", "before", "Pregătirea informațiilor și TOP 5", "Build Schedule și comenzi confirmate; prioritățile notate pentru TOP 5", "shift", "planning", "check"],
  ["b-top5-mach", "before", "Pregătirea informațiilor și TOP 5", "Disponibilitatea mașinilor confirmată", "shift", "production", "check"],
  ["b-top5-inv", "before", "Pregătirea informațiilor și TOP 5", "Inventarul necesar planului confirmat", "shift", "planning", "check"],
  ["b-blocked", "before", "Stoc blocat", "Materiale blocate în ultimele 24 h verificate; impactul asupra producției identificat", "shift", "tasks", "check"],
  ["b-tl-top5", "before", "Pregătirea Team Leaderilor", "TL asistați în pregătirea TOP 5; informațiile distribuite", "shift", "team", "done"],
  ["b-hse", "before", "HSE", "EIP verificat: mănuși, mânecuțe/jachete, protecție auditivă, ochelari, încălțăminte", "shift", null, "check"],
  ["s-top5", "start", "TOP 5", "Participare la TOP 5 în echipe; informații verificate; coaching TL", "shift", null, "check"],
  ["s-workforce", "start", "Distribuirea forței de muncă", "Personal revizuit, operatori repartizați după priorități și matrice de calificare", "shift", "allocation", "check"],
  ["s-scrap", "start", "Evaluarea rebuturilor", "Rebuturi și materiale neconforme revizuite; reacții stabilite", "shift", "scrap", "check"],
  ["s-lpa", "start", "Indicatori de performanță și reacție", "Audit LPA conform planificării", "weekly", "lpa", "check"],
  ["s-kpi", "start", "Indicatori de performanță și reacție", "Indicatori verificați; reacție la abateri", "shift", "oee", "check"],
  ["d-firstoff", "during", "Prima piesă (First Off)", "Prima piesă realizată, în zona dedicată, formular corect, fișe de parametri actualizate", "shift", "firstoff", "check"],
  ["d-customer", "during", "Cerințele clientului", "Situația comenzilor; deviațiile negative escaladate", "2h", "production", "check"],
  ["d-tlr", "during", "Team Leader Routine", "Cel puțin 2 formulare TL Routine verificate; puncte neîndeplinite urmărite", "shift", "tasks", "check"],
  ["d-status", "during", "Status producție", "Panouri EPT și norma orară revizuite; informații corecte; reacție la abateri", "2h", "report", "check"],
  ["d-qps", "during", "Line QPS", "QPS revizuit la fiecare celulă; suport, escaladare, urmărirea acțiunilor", "shift", "eightd", "check"],
  ["d-qps-8d", "during", "Line QPS", "Participare la întâlnirile 8D/QPS când este necesar", "shift", "eightd", "done"],
  ["d-epu", "during", "EPU TOP 5", "Întâlnire cu EPU Manager: rebuturi, probleme, priorități, acțiuni", "shift", "tasks", "done"],
  ["d-sw-daily", "during", "Standardizarea muncii", "Verificarea zilnică a muncii standardizate; variabilitate și idei notate", "shift", "kaizen", "check"],
  ["d-sw-audit", "during", "Standardizarea muncii", "Audit de muncă standardizată cu TL (cu fiecare TL, conform planului)", "twiceWeekly", "kaizen", "check"],
  ["d-hse-ppe", "during", "HSE", "Echipament de protecție verificat", "shift", null, "check"],
  ["d-hse-rules", "during", "HSE", "Respectarea regulilor de siguranță verificată", "shift", null, "check"],
  ["d-tpm", "during", "TPM & 5S", "Mentenanța autonomă și activitățile planificate verificate", "shift", "s5", "check"],
  ["d-q-measure", "during", "Calitate", "Un component măsurat conform planificării; rezultat urmărit", "shift", "quality", "check"],
  ["d-q-8bases", "during", "Calitate", "Auditul celor 8 baze ale calității (conținut configurabil)", "weekly", "quality", "check"],
  ["d-perf-sw", "during", "Evaluarea performanței cu TL", "Auditurile de muncă standardizată ale TL revizuite", "weekly", "kaizen", "check"],
  ["d-perf-matrix", "during", "Evaluarea performanței cu TL", "Matricea de calificare și planul de training verificate", "weekly", "matrix", "check"],
  ["d-perf-kpi", "during", "Evaluarea performanței cu TL", "Indicatori de performanță: revizuire, reacție și escaladare", "weekly", "oee", "check"],
  ["d-perf-diff", "during", "Evaluarea performanței cu TL", "Dificultăți întâlnite; escaladare corectă", "weekly", "tasks", "done"],
  ["d-tl-use", "during", "Utilizarea Team Leaderilor", "Timpul TL pe linii urmărit; absenteism și supraîncărcare identificate", "shift", "allocation", "check"],
  ["d-ideas", "during", "Idei de îmbunătățire", "Idei Kaizen și observații HSE revizuite; reacție imediată dacă e nevoie", "weekly", "kaizen", "done"],
  ["d-afterbreak", "during", "Verificare după pauză", "EIP, revenirea personalului și situația liniilor după pauză", "afterBreak", "production", "check"],
  ["e-book", "end", "Raport de schimb", "Cartea schimbului completată din datele raportate", "shift", "handover", "done"],
  ["e-tlr", "end", "Evaluarea schimbului", "Rutina TL verificată, formular confirmat, rezultate evaluate", "shift", "tasks", "check"],
  ["e-scrap", "end", "Evaluarea rebutului", "Rebut total, categorii, cauze, impact, acțiuni", "shift", "scrap", "check"],
  ["e-wip", "end", "WIP pentru schimbul următor", "Materiale la posturi verificate; lipsuri escaladate", "shift", "tasks", "check"],
  ["e-5s-clean", "end", "5S", "Curățenia liniilor și organizarea posturilor", "shift", "s5", "check"],
  ["e-5s-red", "end", "5S", "Containerele roșii goale și curate", "shift", "s5", "check"],
  ["e-5s-tour", "end", "5S", "Turul final de schimb", "shift", "gemba", "done"],
  ["e-data", "end", "Status producție", "Date complete; plan vs. realizat reconciliat; rapoarte lipsă identificate", "shift", "report", "check"],
  ["e-handover-doc", "end", "Predarea schimbului", "Documentul de predare pregătit", "shift", "handover", "done"],
  ["e-handover-meet", "end", "Predarea schimbului", "Întâlnire cu supervizorul următor: probleme, responsabilități, priorități", "shift", "handover", "done"],
  ["r-posts", "rules", "Gestionarea posturilor de lucru", "Posturile prioritare au personalul necesar și calificat; redistribuire la nevoie", "rule", "allocation", "check"],
  ["r-discipline", "rules", "Disciplină operațională", "Materiale, mașini și condiții de lucru asigurate; problemele escaladate", "rule", "tasks", "check"],
];
export function defaultTemplate() {
  return T.map(([id, phase, group, title, freq, link, result]) => ({
    id, phase, group, title, freq, link, result, active: true, naAllowed: true, desc: "",
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
