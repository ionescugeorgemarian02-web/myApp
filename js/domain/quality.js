// Calitate și Lean: checklisturi versionate (LPA, Gemba, 5S/6S, First Off), Poka-Yoke, 8D, Kaizen.
import { uid } from "../core/doc.js";

export const TIMWOOD = {
  T: "Transport", I: "Inventar", M: "Mișcare", W: "Așteptare", O: "Supraproducție", P: "Supraprocesare", D: "Defecte",
};
export const POKA_METHOD = {
  contact: { label: "Contact", text: "Verifică o caracteristică fizică sau o condiție (formă, poziție, prezență)." },
  fixed: { label: "Valoare fixă", text: "Verifică numărul, cantitatea sau gruparea corectă." },
  motion: { label: "Pași de mișcare", text: "Verifică respectarea secvenței corecte a operațiilor." },
};
export const POKA_FUNCTION = { warning: "Avertizare", control: "Control / prevenire" };
export const SIX_M = ["Om", "Mașină", "Metodă", "Material", "Măsurare", "Mediu"];

// Șabloane implicite. Categoriile LPA sunt inspirate din checklistul utilizatorului, nu un standard universal.
const LPA_Q = [
  "Operatorii sunt repartizați conform matricei de calificare",
  "Fișele de mentenanță autonomă sunt completate",
  "Instrucțiunile de lucru și aspectele de calitate sunt disponibile și respectate",
  "Catalogul de defecte și de reprelucrare este disponibil și cunoscut",
  "Containerele roșii pentru produse neconforme sunt identificate și folosite corect",
  "Culoarele de acces sunt libere",
  "Defectele sunt marcate corect",
  "Dispozitivele Poka-Yoke sunt verificate",
  "5S este respectat la post",
  "Etichetarea are PN-ul corect",
  "Operatorii cunosc caracteristicile critice",
  "Staționările sunt înregistrate în Line QPS",
  "Rebuturile sunt înregistrate orar",
  "Planul de escaladare și reacție este cunoscut",
  "Checklistul First Off este completat",
  "Prima piesă este în zona dedicată",
  "Mentenanța autonomă a lerei / instrumentului de verificare este făcută",
];
const GEMBA_Q = [
  "First Off completat și confirmat",
  "EPT Board completat",
  "PN corect pe linie",
  "Număr corect de operatori",
  "Documente la ultima revizie",
  "6S efectuat și susținut",
  "Reject sheet concordă cu Red Box",
  "Acțiunile QPS sunt urmărite",
];
const FIRSTOFF_Q = [
  "Prima piesă realizată și verificată",
  "Piesa este amplasată în zona dedicată",
  "Formularul First Off este completat corect",
  "Fișele de parametri sunt actualizate",
];
const S6_Q = [
  ["Sortare", "Doar materialele și sculele necesare sunt la post"],
  ["Ordine", "Fiecare obiect are loc marcat și este la locul lui"],
  ["Curățenie", "Postul și echipamentele sunt curate; sursele de murdărie sunt cunoscute"],
  ["Standardizare", "Standardele vizuale sunt afișate și respectate"],
  ["Disciplină", "Auditurile anterioare au acțiuni închise"],
  ["Siguranță", "Riscurile sunt marcate; EIP disponibil și purtat"],
];
const Q8_Q = ["Baza 1", "Baza 2", "Baza 3", "Baza 4", "Baza 5", "Baza 6", "Baza 7", "Baza 8"].map((x) => x + " (conținut de configurat local)");

export function defaultTemplates() {
  const mk = (type, name, qs) => ({ id: type, type, name, version: 1, updatedAt: null,
    questions: qs.map((q, i) => (Array.isArray(q) ? { id: type + i, cat: q[0], text: q[1] } : { id: type + i, text: q })) });
  return { lpa: mk("lpa", "LPA", LPA_Q), gemba: mk("gemba", "Gemba walk", GEMBA_Q), firstoff: mk("firstoff", "First Off", FIRSTOFF_Q),
    s6: mk("s6", "Audit 6S", S6_Q), q8: mk("q8", "8 baze ale calității", Q8_Q) };
}
export const templatesOf = (doc) => ({ ...defaultTemplates(), ...doc.templates });
// Modificarea unui șablon creează versiune nouă; auditurile vechi păstrează întrebările lor.
export function updateTemplate(doc, type, questions, now = new Date()) {
  const cur = templatesOf(doc)[type];
  doc.templates[type] = { ...cur, version: cur.version + 1, updatedAt: now.toISOString(),
    questions: questions.filter((q) => String(q.text || "").trim()).map((q, i) => ({ id: q.id || type + "v" + (cur.version + 1) + "-" + i, cat: q.cat, text: q.text.trim() })) };
  return doc.templates[type];
}
export function startAudit(doc, type, data, now = new Date()) {
  const tpl = templatesOf(doc)[type];
  if (!tpl) throw Error("Șablon necunoscut.");
  const a = { id: uid(), type, templateVersion: tpl.version, questions: structuredClone(tpl.questions), answers: {},
    lineId: data.lineId || null, zone: data.zone || "", layer: data.layer || null, auditor: data.auditor || "", pnId: data.pnId || null,
    date: data.date || now.toISOString().slice(0, 10), createdAt: now.toISOString(), status: "draft", extra: data.extra || {} };
  doc.audits.push(a);
  return a;
}
export function answer(audit, qid, patch) {
  audit.answers[qid] = { ...(audit.answers[qid] || {}), ...patch };
}
// Scor: OK / (OK + NOK). N/A nu intră în numitor. Lipsa răspunsurilor → incomplet.
export function score(audit) {
  let ok = 0, nok = 0, na = 0, missing = 0;
  for (const q of audit.questions) {
    const r = audit.answers[q.id]?.r;
    if (r === "ok") ok++; else if (r === "nok") nok++; else if (r === "na") na++; else missing++;
  }
  return { ok, nok, na, missing, ratio: ok + nok ? ok / (ok + nok) : null, complete: missing === 0 };
}
export function finishAudit(audit) {
  const s = score(audit);
  if (!s.complete) throw Error("Răspunde la toate întrebările (" + s.missing + " rămase).");
  const nokNoAction = audit.questions.filter((q) => audit.answers[q.id]?.r === "nok" && !audit.answers[q.id]?.taskId && !String(audit.answers[q.id]?.action || "").trim());
  if (nokNoAction.length) throw Error("Fiecare NOK cere o acțiune (" + nokNoAction.length + " fără acțiune).");
  audit.status = "done";
  return s;
}
// NOK-uri recurente pe întrebare în ultimele N audituri de același tip (și aceeași zonă/linie).
export function recurringNok(audits, type, where, last = 5) {
  const list = audits.filter((a) => a.type === type && a.status === "done" && (a.lineId || a.zone) === where).slice(-last);
  const m = new Map();
  for (const a of list) for (const q of a.questions) if (a.answers[q.id]?.r === "nok") m.set(q.text, (m.get(q.text) || 0) + 1);
  return [...m].filter(([, n]) => n >= 2).map(([text, n]) => ({ text, n, of: list.length }));
}

// ——— 8D ———
export const D_STEPS = [
  ["d0", "D0", "Pregătire și evaluare inițială"],
  ["d1", "D1", "Echipa"],
  ["d2", "D2", "Descrierea problemei (5W2H)"],
  ["d3", "D3", "Containment"],
  ["d4", "D4", "Cauza fundamentală și punctul de scăpare"],
  ["d5", "D5", "Acțiuni corective permanente"],
  ["d6", "D6", "Implementare și validarea eficacității"],
  ["d7", "D7", "Prevenirea recurenței"],
  ["d8", "D8", "Închidere și recunoașterea echipei"],
];
export function create8D(doc, data, now = new Date()) {
  if (!String(data.title || "").trim()) throw Error("Scrie titlul problemei.");
  const d = { id: uid(), no: doc.eightD.length + 1, title: data.title.trim(), lineId: data.lineId || null, pnId: data.pnId || null,
    source: data.source || null, createdAt: now.toISOString(), status: "open",
    steps: Object.fromEntries(D_STEPS.map(([k]) => [k, { owner: "", due: "", text: "", done: false, doneAt: null }])),
    w5h2: { what: "", where: "", when: "", who: "", why: "", how: "", howMany: "" },
    containment: [], causes: [], whys: [], actions: [], effectiveness: { measure: "", result: "", verified: false, at: null }, team: "" };
  doc.eightD.push(d);
  return d;
}
// Reguli: o cauză se confirmă doar cu dovadă; D4 cere o cauză de apariție verificată; D6 cere rezultat măsurat.
export function verifyCause(cause, evidence) {
  if (!String(evidence || "").trim()) throw Error("Confirmarea cauzei cere dovada verificării.");
  cause.status = "verified";
  cause.evidence = evidence.trim();
}
export function canComplete(d, step) {
  const prev = D_STEPS.findIndex(([k]) => k === step);
  for (let i = 0; i < prev; i++) if (!d.steps[D_STEPS[i][0]].done && D_STEPS[i][0] !== "d0") return "Finalizează întâi " + D_STEPS[i][1] + ".";
  if (step === "d2" && !d.w5h2.what.trim()) return "Completează măcar „Ce” în 5W2H.";
  if (step === "d3" && !d.containment.length) return "Adaugă cel puțin o acțiune de containment.";
  if (step === "d4" && !d.causes.some((c) => c.status === "verified" && c.kind !== "escape")) return "D4 cere o cauză de apariție verificată cu dovadă.";
  if (step === "d5" && !d.actions.length) return "Adaugă acțiunile corective.";
  if (step === "d6" && !(d.effectiveness.verified && String(d.effectiveness.result).trim())) return "D6 cere rezultatul măsurat al eficacității.";
  return null;
}
export function completeStep(d, step, now = new Date()) {
  const err = canComplete(d, step);
  if (err) throw Error(err);
  d.steps[step].done = true;
  d.steps[step].doneAt = now.toISOString();
  if (step === "d8") d.status = "closed";
}
export const d8Progress = (d) => D_STEPS.filter(([k]) => d.steps[k].done).length;

// ——— Kaizen ———
export const PDCA = { plan: "Plan", do: "Do", check: "Check", act: "Act", closed: "Închis", rejected: "Respins" };
export const kaizenScore = (k) => (k.impact > 0 && k.effort > 0 ? Math.round((k.impact / k.effort) * 10) / 10 : null);
