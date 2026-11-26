// Documentul v2: forma, valori implicite, validare și curățarea importurilor.
export const SCHEMA = 2;
const FORBIDDEN = new Set(["__proto__", "constructor", "prototype"]);

export const uid = () =>
  (globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2)).replace(/-/g, "").slice(0, 12);

// Copiază doar date JSON simple și elimină cheile care pot polua prototipul.
export function sanitize(value, depth = 0) {
  if (depth > 40) throw Error("Structură prea adâncă.");
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) return value.map((v) => sanitize(v, depth + 1));
  if (typeof value === "object") {
    const out = {};
    for (const k of Object.keys(value)) {
      if (FORBIDDEN.has(k)) continue;
      const v = sanitize(value[k], depth + 1);
      if (v !== undefined) out[k] = v;
    }
    return out;
  }
  return undefined;
}

export const DEFAULT_SHIFTS = [
  { id: "S1", name: "Schimbul 1", start: "06:00", end: "14:00", breaks: [] },
  { id: "S2", name: "Schimbul 2", start: "14:00", end: "22:00", breaks: [] },
  { id: "S3", name: "Schimbul 3", start: "22:00", end: "06:00", breaks: [] },
];
export const ATTENDANCE = [
  { id: "present", label: "Prezent", present: true },
  { id: "late", label: "Întârziere", present: true },
  { id: "early", label: "Plecat mai devreme", present: true },
  { id: "transfer", label: "Transferat", present: false },
  { id: "absent", label: "Absent", present: false },
  { id: "leave", label: "Concediu", present: false },
];

export function emptyDoc(training = false) {
  return {
    schemaVersion: SCHEMA,
    training,
    createdAt: new Date().toISOString(),
    settings: {
      shifts: structuredClone(DEFAULT_SHIFTS),
      shiftHold: null,
      theme: "auto",
      thresholds: { underTarget: 90, stopAlertMin: 10, escalateStopMin: 30, reportGraceMin: 15, tlLineMaxMin: 240 },
      attendance: structuredClone(ATTENDANCE),
      personCategories: ["Operator", "Team Leader", "Quality Wall", "TESA", "Auxiliar"],
      departments: ["Producție", "Mentenanță", "Calitate", "Logistică", "Inginerie", "HSE"],
      incidentCategories: ["Defect mecanic", "Defect electric", "Sculă / dispozitiv", "Senzor", "Lipsă material", "Calitate", "Altele"],
      zone: "",
      demoMarked: training,
    },
    master: { lines: [], pns: [], people: [], faults: [] },
    plans: {},
    events: [],
    reports: {},
    incidents: [],
    attendance: {},
    assignments: {},
    quals: {},
    trainings: [],
    tasks: [],
    routine: { template: null, log: {} },
    templates: {},
    audits: [],
    lpaPlan: [],
    poka: [],
    eightD: [],
    kaizen: [],
    handovers: [],
    meta: {},
  };
}

const isObj = (x) => !!x && typeof x === "object" && !Array.isArray(x);
// Completează colecțiile lipsă și respinge tipurile greșite.
export function ensureShape(raw) {
  if (!isObj(raw) || raw.schemaVersion !== SCHEMA) throw Error("Fișierul nu este o copie myApp 2.");
  const doc = sanitize(raw);
  const base = emptyDoc(!!doc.training);
  for (const [k, v] of Object.entries(base)) {
    if (doc[k] === undefined) doc[k] = v;
    else if (Array.isArray(v) !== Array.isArray(doc[k]) || (isObj(v) && !isObj(doc[k])))
      throw Error("Câmpul „" + k + "” are un format nevalid.");
  }
  for (const [k, v] of Object.entries(base.settings)) if (doc.settings[k] === undefined) doc.settings[k] = v;
  for (const [k, v] of Object.entries(base.settings.thresholds)) if (doc.settings.thresholds?.[k] === undefined) doc.settings.thresholds = { ...doc.settings.thresholds, [k]: v };
  for (const k of ["lines", "pns", "people", "faults"]) if (!Array.isArray(doc.master[k])) doc.master[k] = [];
  if (!Array.isArray(doc.settings.shifts) || !doc.settings.shifts.length) doc.settings.shifts = structuredClone(DEFAULT_SHIFTS);
  for (const coll of ["events", "incidents", "tasks", "audits", "eightD", "kaizen", "poka", "handovers", "trainings"])
    for (const item of doc[coll]) if (!isObj(item) || typeof item.id !== "string") throw Error("Înregistrare fără identificator în „" + coll + "”.");
  if (!isObj(doc.routine.log)) doc.routine.log = {};
  // Structuri imbricate: un backup corupt nu trebuie să blocheze pornirea.
  const hm = (x) => typeof x === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(x);
  for (const sh of doc.settings.shifts) {
    if (!isObj(sh) || typeof sh.id !== "string" || !hm(sh.start) || !hm(sh.end)) throw Error("Programul schimburilor din copie nu este valid.");
    if (!Array.isArray(sh.breaks)) sh.breaks = [];
    sh.breaks = sh.breaks.filter((b) => isObj(b) && hm(b.start) && hm(b.end));
  }
  for (const k of ["lines", "pns", "people", "faults"]) doc.master[k] = doc.master[k].filter((x) => isObj(x) && typeof x.id === "string");
  for (const l of doc.master.lines) {
    if (!Array.isArray(l.machines)) l.machines = [];
    l.machines = l.machines.filter((m) => isObj(m) && typeof m.id === "string");
    if (!Array.isArray(l.pnIds)) l.pnIds = [];
  }
  for (const [k, q] of Object.entries(doc.quals)) if (!isObj(q) || ![1, 2, 3, 4].includes(q.level)) delete doc.quals[k];
  doc.events = doc.events.filter((e) => typeof e.at === "string" && !Number.isNaN(Date.parse(e.at)) && typeof e.lineId === "string");
  for (const k of ["plans", "reports", "attendance", "assignments"]) for (const [sk, v] of Object.entries(doc[k])) if (!isObj(v) && !Array.isArray(v)) delete doc[k][sk];
  return doc;
}
