import { AUDIT_TEMPLATES } from "./quality.js";
import { DEVELOPMENT } from "./leadership.js";
import { HANDOVER_FIELDS, PROBLEM_FIELDS } from "./operations.js";
import { id, day, norm } from "./ui.js";
import { item } from "./blocks/checklist.js";
import { column } from "./records.js";
import { SHIFT_FIELDS } from "./metrics.js";
import { formItems, isForm, LINES } from "./ept.js";
export function block(type, title) {
  return {
    id: id(),
    type,
    title,
    ...({
      note: { text: "" },
      checklist: { items: [] },
      routine: { items: [], history: {}, key: "" },
      table: { cols: [], rows: [] },
      journal: { cols: [], rows: [] },
      audit: { items: [], runs: {} },
      skills: { levels: {} },
      lines: { shifts: {} },
    }[type] || {}),
  };
}
export const GROUPS = [
  "În schimb",
  "Echipa",
  "Primele 90 de zile",
  "Paginile mele",
];
const KNOWN = {
  "Rutina EPT": ["📋", 0],
  "Liniile mele": ["🏭", 0],
  "Rutina schimbului": ["✅", 0],
  "Predare schimb": ["🔁", 0],
  "Probleme și acțiuni": ["⚠️", 0],
  Siguranță: ["🦺", 0],
  "Tur pe linie": ["🔍", 0],
  "Notițe libere": ["📝", 0],
  Echipa: ["👥", 1],
  Polivalență: ["🧩", 1],
  "Unu la unu": ["💬", 1],
  Contacte: ["📞", 1],
  "Săptămâna 1": ["🗓️", 2],
  "Plan 30-60-90": ["🎯", 2],
  Indicatori: ["📊", 2],
};
// Paginile fără grup primesc grupul și pictograma potrivite (și în caietele vechi).
export function organize(data) {
  let changed = false;
  // „Automat” era valoarea inițială a caietelor anterioare.
  if (!data.settings.appearanceVersion) {
    if (!data.settings.theme || data.settings.theme === "Automat")
      data.settings.theme = "Întunecată";
    data.settings.appearanceVersion = 1;
    changed = true;
  }
  if (upgrade(data)) changed = true;
  if (addOperations(data)) changed = true;
  if (addDevelopment(data)) changed = true;
  if (addQuality(data)) changed = true;
  for (const p of [...data.pages, ...data.templates])
    if (typeof p.group !== "string") {
      const k = KNOWN[p.title];
      p.group = GROUPS[k ? k[1] : 3];
      if (k && !p.emoji) p.emoji = k[0];
      changed = true;
    }
  return changed;
}
export const page = (title, blocks = [], group = GROUPS[3]) => ({
  id: id(),
  title,
  emoji: "",
  group,
  order: 0,
  archived: false,
  blocks,
});

const FEATURES = 7;
const AUDIT_ITEMS = [
  "Echipamentul de protecție e purtat corect la toate posturile",
  "Apărătorile și senzorii de siguranță funcționează",
  "Instrucțiunile de lucru sunt afișate și respectate",
  "Piesele suspecte sunt separate și etichetate",
  "Producția pe oră e în linie cu planul",
  "Opririle sunt anunțate la mentenanță",
  "Ordine și curățenie (5S) la posturi",
  "Toate posturile sunt ocupate conform planului",
];
function grid(title, type, cols, group) {
  const b = block(type, title);
  b.cols = cols.map((s) => column(...(Array.isArray(s) ? s : [s])));
  const p = page(title, [b], group);
  p.emoji = KNOWN[title]?.[0] || "";
  return p;
}
function insertAfter(data, title, newPage) {
  const at = data.pages.findIndex((p) => p.title === title);
  data.pages.splice(at < 0 ? data.pages.length : at + 1, 0, newPage);
}
const findTable = (data, test) => {
  for (const p of data.pages) for (const b of p.blocks) if ((b.type === "table" || b.type === "journal") && test(b, p)) return b;
  return null;
};
const named = (b, name) => b.cols.find((c) => norm(c.name) === name);
// Funcțiile versiunii 3.0: cifrele schimbului, ciclul problemelor, siguranță,
// tur pe linie, polivalență și registrul de decizii. Rulează o singură dată.
export function upgrade(data) {
  if (data.settings.featuresVersion >= FEATURES) return false;
  if (!(data.settings.featuresVersion >= 3)) upgrade3(data);
  if (!(data.settings.featuresVersion >= 4)) upgrade4(data);
  // Versiunea 4.1: zona de lucru este Sudură, cu toate liniile ei.
  if (!data.settings.zone) data.settings.zone = ZONE;
  if (!(data.settings.featuresVersion >= 6)) removeGenericRoutine(data);
  // Versiunea 4.3: fără instrucțiunile generice „Cum o fac”.
  for (const p of data.pages) for (const b of p.blocks) if (b.form) for (const i of b.items) delete i.how;
  data.settings.featuresVersion = FEATURES;
  return true;
}
function upgrade3(data) {
  const s = data.settings;
  if (!Array.isArray(s.equipment)) s.equipment = [];
  if (!s.startDate) s.startDate = day(s.createdAt ? new Date(s.createdAt) : new Date());
  if (!data.reviews || typeof data.reviews !== "object") data.reviews = {};
  // Predarea primește câmpuri numerice, după „Schimb”.
  const ho = findTable(data, (b) => b.type === "journal" && named(b, "schimb") && named(b, "data"));
  if (ho && !ho.cols.some((c) => c.key === "plan")) {
    const at = ho.cols.indexOf(named(ho, "schimb")) + 1;
    ho.cols.splice(at, 0, ...SHIFT_FIELDS.map(([key, name]) => column(name, "number", [], key)));
  }
  // Problemele: cheie stabilă, locul (post/mașină) și etapa de verificare.
  const pr = findTable(data, (b) => b.type === "table" && named(b, "problema") && named(b, "stare"));
  if (pr) {
    named(pr, "problema").key ||= "problem";
    if (!pr.cols.some((c) => c.key === "equipment"))
      pr.cols.splice(pr.cols.indexOf(named(pr, "problema")) + 1, 0, column("Post / mașină", "select", [], "equipment"));
    const st = named(pr, "stare");
    if (st.type === "select" && !st.options.some((o) => norm(o) === "verificare")) {
      const closed = st.options.findIndex((o) => norm(o) === "inchis");
      st.options.splice(closed < 0 ? st.options.length : closed, 0, "Verificare");
    }
  }
  const team = findTable(data, (b, p) => norm(p.title) === "echipa" && named(b, "nume"));
  if (team) named(team, "nume").key ||= "name";
  // Module noi, adăugate o singură dată (dacă le ștergi, nu mai revin).
  const has = (type, key) => data.pages.some((p) => p.blocks.some((b) =>
    b.type === type && (!key || b.cols?.some((c) => c.key === key))));
  if (!has("table", "safetyType"))
    insertAfter(data, "Probleme și acțiuni", grid("Siguranță", "table", [
      ["Data", "date"],
      ["Schimb", "select", ["1", "2", "3"]],
      ["Tip", "select", ["Incident", "Near-miss", "Observație"], "safetyType"],
      "Ce s-a întâmplat",
      ["Post / mașină", "select", [], "equipment"],
      ["Gravitate", "select", ["Mică", "Medie", "Mare"]],
      "Acțiune imediată",
      ["Stare", "select", ["Deschis", "În lucru", "Închis"]],
    ], GROUPS[0]));
  if (!has("audit")) {
    const b = block("audit", "Tur pe linie");
    b.items = AUDIT_ITEMS.map((title) => ({ id: id(), title }));
    const p = page("Tur pe linie", [b], GROUPS[0]);
    p.emoji = KNOWN["Tur pe linie"][0];
    insertAfter(data, "Siguranță", p);
  }
  if (!has("skills")) {
    const p = page("Polivalență", [block("skills", "Polivalență")], GROUPS[1]);
    p.emoji = KNOWN.Polivalență[0];
    insertAfter(data, "Echipa", p);
  }
  if (![...data.pages, ...data.templates].some((p) => p.title === "Registru de decizii")) {
    const t = grid("Registru de decizii", "table", [
      ["Data", "date"],
      "Decizia",
      "Context și variante",
      "Cine decide",
      "Cine a fost consultat",
      ["Termen revizuire", "date"],
      ["Rezolvat", "checkbox"],
    ], GROUPS[3]);
    t.emoji = "⚖️";
    data.templates.push(t);
  }
}
const ZONE = "Sudură";
// Versiunea 4.2: rămâne doar rutina EPT; rutina generică și modelul ei se scot.
function removeGenericRoutine(data) {
  const generic = (p) => p.blocks.some((b) => b.type === "routine" && !b.form) &&
    p.blocks.every((b) => b.type === "routine" && !b.form);
  data.pages = data.pages.filter((p) => !generic(p));
  data.templates = data.templates.filter((t) => !generic(t));
}
// Versiunea 4.0: rutina EPT Supervisor și liniile din subordine.
function upgrade4(data) {
  const s = data.settings;
  // Liniile devin lista locurilor (probleme, siguranță, polivalență, tablou).
  const seen = new Set();
  s.equipment = [...LINES, ...(Array.isArray(s.equipment) ? s.equipment : [])].filter((x) => {
    const k = norm(x);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  for (const p of data.pages)
    for (const b of p.blocks)
      for (const c of b.cols || [])
        if (c.key === "equipment" && c.name === "Post / mașină") c.name = "Linie / post";
  if (!data.pages.some((p) => p.blocks.some(isForm))) {
    const b = block("routine", "Rutina EPT");
    Object.assign(b, { form: "ept", items: formItems(), weekly: {} });
    const p = page("Rutina EPT", [b], GROUPS[0]);
    p.emoji = KNOWN["Rutina EPT"][0];
    data.pages.unshift(p);
    // Rutina generică e înlocuită de fișa EPT (rămâne în Arhivă, cu istoricul).
    const old = data.pages.find((x) => x.title === "Rutina schimbului" && !x.archived &&
      x.blocks.length === 1 && x.blocks[0].type === "routine" && !x.blocks[0].form);
    if (old) old.archived = true;
  }
  if (!data.pages.some((p) => p.blocks.some((b) => b.type === "lines"))) {
    const p = page("Liniile mele", [block("lines", "Liniile mele")], GROUPS[0]);
    p.emoji = KNOWN["Liniile mele"][0];
    const at = data.pages.findIndex((x) => x.blocks.some(isForm));
    data.pages.splice(at + 1, 0, p);
  }
}

function addOperations(data) {
  if (data.settings.operationsVersion >= 1) return false;
  const handover = findTable(data, (b) => b.type === "journal" && named(b, "schimb") && named(b, "data"));
  const problems = findTable(data, (b) => b.type === "table" && named(b, "stare") && (named(b, "problema") || b.cols.some((col) => col.key === "problem")));
  for (const [table, fields] of [[handover, HANDOVER_FIELDS], [problems, PROBLEM_FIELDS]]) {
    if (!table) continue;
    for (const [key, label, type, options] of fields) {
      if (!table.cols.some((c) => c.key === key)) table.cols.push(column(label, type, options, key));
    }
  }
  data.settings.operationsVersion = 1;
  return true;
}

function addDevelopment(data) {
  if (data.settings.leadershipVersion >= 1) return false;
  const plan = page("Planul meu · primele 90 de zile", [], GROUPS[2]);
  plan.professionalPlan = true;
  plan.emoji = "🎯";
  plan.blocks = DEVELOPMENT.map(([phase, ...tasks]) => {
    const checklist = block("checklist", phase);
    checklist.items = tasks.map((task) => item(task));
    return checklist;
  });
  data.pages.push(plan);
  data.settings.leadershipVersion = 1;
  return true;
}

function addQuality(data) {
  if (data.settings.qualityVersion >= 1) return false;
  const registry = findTable(data, (b) => b.type === "table" && b.cols.some((c) => c.key === "problem"));
  if (registry && !registry.cols.some((c) => c.key === "defectCategory"))
    registry.cols.push(column("Categorie defect", "text", [], "defectCategory"));
  const people = findTable(data, (b) => b.type === "table" && b.cols.some((c) => c.key === "name"));
  if (people && !people.cols.some((c) => c.key === "teamShift"))
    people.cols.push(column("Schimb alocat", "select", ["1", "2", "3"], "teamShift"));
  const audits = page("Audituri și verificări personale", AUDIT_TEMPLATES.map(([kind, title, items]) => {
    const checklist = block("audit", title);
    checklist.auditKind = kind;
    checklist.items = items.map((title) => ({ id: id(), title }));
    return checklist;
  }), GROUPS[0]);
  audits.emoji = "🔍";
  data.pages.push(audits,
    grid("Registrul opririlor", "table", [
      ["Data", "date", [], "stopDate"],
      ["Schimb", "select", ["1", "2", "3"]],
      ["Echipament", "text", [], "stopEquipment"],
      ["Cauză declarată", "text", [], "stopCause"],
      ["Minute de oprire", "number", [], "stopMinutes"],
      "Măsură luată",
    ], GROUPS[0]),
    grid("Dezvoltarea echipei", "table", [
      ["Data", "date", [], "learningDate"],
      ["Tip", "select", ["Instruire", "Coaching", "Idee"], "learningKind"],
      "Identificator neutru sau rol", "Post / operație", "Acțiune sau propunere",
      "Rol responsabil", ["Termen", "date"],
      ["Rezultat verificat", "text", [], "learningOutcome"],
      ["Data finalizării", "date", [], "learningClosedDate"],
      ["Stare", "select", ["Deschis", "În lucru", "Închis"]],
    ], GROUPS[1]),
    grid("Dicționar KPI local", "table", [
      "Indicator", "Definiție operațională", "Formulă validată", "Unitate",
      "Sursa autorizată", "Perioadă", "Prag propus", ["Validat intern", "checkbox"],
    ], GROUPS[2]));
  data.settings.qualityVersion = 1;
  return true;
}

export function seed() {
  function list(title, type, rows) {
    let b = block(type, title);
    b.items = rows.map((t) => item(t));
    return page(title, [b]);
  }
  function grid(title, type, cols, rows = []) {
    let b = block(type, title);
    b.cols = cols.map((s) => column(...(Array.isArray(s) ? s : [s])));
    b.rows = rows.map((t) => ({ id: id(), values: { [b.cols[0].id]: t } }));
    return page(title, [b]);
  }
  let pages = [
    grid("Predare schimb", "journal", [
      ["Data", "date"],
      ["Schimb", "select", ["1", "2", "3"]],
      "Situația producției / probleme",
      "Echipamente oprite sau instabile",
      "Calitate / rebut",
      "Lipsuri de personal sau competențe",
      "Priorități pentru schimbul următor",
    ]),
    grid("Echipa", "table", [
      ["Identificator neutru", "text", [], "name"],
      "Post",
      "Instruit pe posturile",
      "Observații",
    ]),
    grid("Unu la unu", "table", [
      ["Data", "date"],
      "Identificator neutru",
      "Blocaj operațional",
      "Schimbare convenită",
      "Sprijin necesar",
      "Ce am promis",
      ["Termen promisiune", "date"],
      ["Rezolvat", "checkbox"],
    ]),
    grid(
      "Indicatori",
      "table",
      [
        "Indicator",
        ["Valoare de pornire", "number"],
        "Sursa",
        ...["Săpt. 2", "Săpt. 4", "Săpt. 8", "Ținta la ziua 90"].map((x) => [
          x,
          "number",
        ]),
      ],
      [
        "Accidente și incidente evitate la limită",
        "Rată de rebut (%)",
        "FPY (%)",
        "OEE (%)",
        "Plan realizat (%)",
        "Absențe (%)",
      ],
    ),
    grid("Contacte", "table", [
      "Departament",
      "Rol de contact",
      "Canal aprobat",
      "Ce cere de la mine",
    ]),
    grid("Probleme și acțiuni", "table", [
      ["Data", "date"],
      "Problemă",
      "Cauza (5 De ce)",
      "Acțiune",
      "Responsabil",
      ["Termen", "date"],
      ["Stare", "select", ["Deschis", "În lucru", "Închis"]],
    ]),
    page("Notițe libere", [block("note", "Notițe libere")]),
  ];
  // Ordinea: întâi ce folosești zilnic, apoi echipa, apoi planul de început.
  const order = Object.keys(KNOWN);
  pages.sort((a, b) => order.indexOf(a.title) - order.indexOf(b.title));
  pages.forEach((p, i) => {
    p.order = i;
    delete p.group;
  });
  const out = {
    schemaVersion: 1,
    notes: [],
    pages,
    templates: [],
    settings: {
      theme: "Întunecată",
      hours: ["06:00", "14:00", "22:00"],
      createdAt: Date.now(),
      startDate: "2026-11-23",
      backup: null,
    },
  };
  organize(out);
  return out;
}
