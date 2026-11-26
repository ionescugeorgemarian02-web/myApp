// Import din caietul v4.4 (cheia „caiet”). Documentul vechi NU se modifică și NU se șterge.
// Niveluri v4 (indici): 1 „Cu supraveghere” → 2, 2 „Autonom” → 3, 3 „Poate instrui” → 4.
// Lipsa înregistrării (0 / „Neinstruit”) nu se convertește: rămâne „neevaluat”.
import { emptyDoc, uid, sanitize, defaultLines } from "./doc.js";
import { validHM } from "./time.js";

const norm = (s) => String(s ?? "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const blocksOf = (d) => (Array.isArray(d.pages) ? d.pages : []).filter((p) => p && !p.archived).flatMap((p) => (Array.isArray(p.blocks) ? p.blocks : []));
const col = (b, key, name) => (b.cols || []).find((c) => c.key === key) || (name ? (b.cols || []).find((c) => norm(c.name).includes(name)) : null);
export const V4_LEVEL_MAP = { 1: 2, 2: 3, 3: 4 };

export function migrateV4(old, now = new Date()) {
  const src = sanitize(old);
  if (!src || src.schemaVersion !== 1 || !Array.isArray(src.pages)) throw Error("Caietul v4 nu are formatul așteptat.");
  const doc = emptyDoc(false);
  doc.master.lines = []; // liniile vin din caietul v4; implicitele doar dacă v4 nu are niciuna
  const report = { lines: 0, people: 0, quals: 0, tasks: 0, skipped: [] };
  const s = src.settings || {};
  if (Array.isArray(s.hours) && s.hours.length === 3 && s.hours.every(validHM))
    doc.settings.shifts.forEach((sh, i) => { sh.start = s.hours[i]; sh.end = s.hours[(i + 1) % 3]; });
  if (typeof s.zone === "string") doc.settings.zone = s.zone;
  const byName = new Map();
  for (const name of Array.isArray(s.equipment) ? s.equipment : []) {
    if (typeof name !== "string" || !name.trim()) continue;
    const line = { id: uid(), code: name.trim(), name: name.trim(), zone: s.zone || "", machines: [], pnIds: [], tlId: null, requiredOps: null, active: true };
    doc.master.lines.push(line);
    byName.set(norm(name), line);
    report.lines++;
  }
  if (!doc.master.lines.length) for (const l of defaultLines()) { doc.master.lines.push(l); byName.set(norm(l.name), l); }
  const blocks = blocksOf(src);
  const team = blocks.find((b) => b.type === "table" && col(b, "name"));
  const personIds = new Map();
  if (team) {
    const nameCol = col(team, "name"), shiftCol = col(team, "teamShift");
    for (const r of team.rows || []) {
      const name = String(r.values?.[nameCol.id] ?? "").trim();
      if (!name) continue;
      const p = { id: uid(), name, role: "operator", category: "Operator", shiftId: shiftCol && r.values[shiftCol.id] ? "S" + r.values[shiftCol.id] : null, active: true };
      doc.master.people.push(p);
      personIds.set(r.id, p.id);
      report.people++;
    }
  }
  const skills = blocks.find((b) => b.type === "skills");
  for (const [rowId, posts] of Object.entries(skills?.levels || {})) {
    const pid = personIds.get(rowId);
    if (!pid || !posts || typeof posts !== "object") continue;
    for (const [post, lv] of Object.entries(posts)) {
      const line = byName.get(norm(post));
      const level = V4_LEVEL_MAP[lv];
      if (!line || !level) { report.skipped.push(post + ": nivel " + lv); continue; }
      doc.quals[pid + "|" + line.id + ":*"] = { level, date: now.toISOString().slice(0, 10), evaluator: "", note: "Migrat din v4.4 (nivel vechi " + lv + "). De reconfirmat.", migrated: true, history: [] };
      report.quals++;
    }
  }
  const problems = blocks.find((b) => b.type === "table" && (col(b, "problem") || col(b, null, "problema")) && col(b, null, "stare"));
  if (problems) {
    const pc = col(problems, "problem") || col(problems, null, "problema"), st = col(problems, null, "stare");
    const owner = col(problems, null, "responsabil"), due = (problems.cols || []).find((c) => c.type === "date" && norm(c.name).includes("termen"));
    const eq = col(problems, "equipment");
    for (const r of problems.rows || []) {
      const title = String(r.values?.[pc.id] ?? "").trim();
      const state = norm(r.values?.[st.id]);
      if (!title || /inchis|rezolvat|anulat/.test(state)) continue;
      const line = eq ? byName.get(norm(r.values[eq.id])) : null;
      doc.tasks.push({ id: uid(), title, desc: "", category: "Problemă", source: { type: "manual", label: "Import v4.4" }, lineId: line?.id || null, machineId: null,
        ownerId: null, dept: "", verifierId: null, priority: "normal", due: /^\d{4}-\d{2}-\d{2}$/.test(r.values?.[due?.id]) ? r.values[due.id] : "",
        shiftKey: null, status: "open", notes: owner && r.values[owner.id] ? "Responsabil (v4.4): " + r.values[owner.id] : "", evidence: "",
        recurrence: null, seriesId: null, createdAt: now.toISOString(), history: [{ at: now.toISOString(), status: "open" }] });
      report.tasks++;
    }
  }
  doc.meta.importedFromV4 = { at: now.toISOString(), ...report };
  return doc;
}
