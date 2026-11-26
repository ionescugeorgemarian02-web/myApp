// Import rapid al planului de schimb din text: format „Linie; PN; Plan; Operatori” sau rânduri copiate din Excel
// (PLAN, ACTUAL, PROGRAM, pn, nr op). Creează PN-urile lipsă (rămân în catalog), le leagă de linii,
// setează operatorii și planul schimbului. Liniile necunoscute sunt erori, nu se ghicesc.
import { uid } from "../core/doc.js";
import { shiftKey } from "../core/time.js";

const norm = (s) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
const isInt = (t) => /^\d+$/.test(t);
const isPn = (t) => /\d/.test(t) && /[.\-/]/.test(t) && !isInt(t);

export function parsePlanText(text, doc) {
  const byName = new Map(doc.master.lines.map((l) => [norm(l.name), l]));
  const rows = [], errors = [], skipped = [];
  for (const raw of String(text || "").split(/\r?\n/)) {
    if (!raw.trim()) continue;
    const tokens = (/[\t;]/.test(raw) ? raw.split(/[\t;]/) : raw.split(/\s{2,}/)).map((t) => t.trim());
    const li = tokens.findIndex((t) => byName.has(norm(t)));
    if (li < 0) {
      const name = tokens.find((t) => t && /[a-zăâîșț]/i.test(t) && !isPn(t));
      if (name && tokens.some((t) => /\d/.test(t)) && !/^(plan|actual|program|pn|nr op)$/i.test(name)) errors.push("Linia „" + name + "” nu există în catalog.");
      continue; // antet, total sau rând gol
    }
    const line = byName.get(norm(tokens[li]));
    const before = tokens.slice(0, li).filter(isInt).map(Number);
    const afterTokens = tokens.slice(li + 1);
    const pn = afterTokens.find(isPn) || null;
    const after = afterTokens.filter(isInt).map(Number);
    let target, ops;
    let rate = null;
    if (before.length) { target = before[0]; ops = after.length ? after.at(-1) : null; }
    else { target = after[0] ?? null; ops = after[1] ?? null; rate = after[2] ?? null; }
    if (!target) { skipped.push(line.name); continue; }
    if (rows.some((r) => r.lineId === line.id)) { errors.push(line.name + " apare de două ori."); continue; }
    rows.push({ lineId: line.id, lineName: line.name, pn, target, ops, norm: rate });
  }
  return { rows, errors, skipped, total: rows.reduce((a, r) => a + r.target, 0) };
}

export function applyPlanImport(doc, rows, workDay, shift, { markOthersNotPlanned = false, hours = null, norms = null } = {}) {
  const sk = shiftKey(workDay, shift.id);
  doc.plans[sk] ||= {};
  for (const r of rows) if (doc.plans[sk][r.lineId]?.baseline) throw Error(r.lineName + " are deja un plan confirmat (baseline). Folosește replanificarea, cu motiv.");
  let created = 0;
  // Profil orar (total pe ore): planul fiecărei linii se împarte pe ore păstrând totalurile pe linie și pe oră.
  const split = hours ? splitByProfile(rows.map((r) => r.target), hours) : null;
  rows.forEach((r, i) => (r._hourly = split ? split[i] : null));
  for (const r of rows) {
    const line = doc.master.lines.find((l) => l.id === r.lineId);
    let pnId = null;
    if (r.pn) {
      let p = doc.master.pns.find((x) => norm(x.code) === norm(r.pn));
      if (!p) { p = { id: uid(), code: r.pn, name: "", ict: null, cycleSec: null }; doc.master.pns.push(p); created++; }
      pnId = p.id;
      if (!line.pnIds.includes(p.id)) line.pnIds.push(p.id);
      if (r.norm > 0) p.cycleSec = Math.round((3600 / r.norm) * 100) / 100; // ciclu planificat din norma orară (nu ICT)
    }
    if (r.ops) line.requiredOps = r.ops;
    // Reparație: un link anterior cu operatori lipsă salva norma ca operatori (ex. 30 operatori = 30 buc/oră).
    else if (r.ops == null && r.norm > 0 && line.requiredOps === r.norm) line.requiredOps = null;
    if (r.norm > 0) line.hourlyNorm = r.norm;
    doc.plans[sk][r.lineId] = { lineId: r.lineId, notPlanned: false, baseline: null, revisions: [],
      runs: [{ id: uid(), pnId, start: shift.start, end: shift.end, target: r.target, method: r._hourly ? "manual" : "productive", hourly: r._hourly || undefined, ops: r.ops, priority: "B", note: "" }] };
    delete r._hourly;
  }
  for (const [name, n] of Object.entries(norms || {})) {
    const l = doc.master.lines.find((x) => norm(x.name) === norm(name));
    if (l && Number.isInteger(n) && n >= 0) l.hourlyNorm = n;
  }
  if (markOthersNotPlanned)
    for (const l of doc.master.lines) if (!rows.some((r) => r.lineId === l.id) && !doc.plans[sk][l.id]?.baseline)
      doc.plans[sk][l.id] = { lineId: l.id, notPlanned: true, runs: [], baseline: null, revisions: [] };
  return { created, lines: rows.length, total: rows.reduce((a, r) => a + r.target, 0) };
}

// Link de plan: datele merg doar în link (fragmentul #, nu ajunge la server și nu e în cod).
// Format: { v: 1, day: "YYYY-MM-DD", shift: "S1", rows: [[linie, pn, plan, operatori]], others: bool }
const BAD_KEYS = ["__proto__", "constructor", "prototype"];
const b64url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
export function encodePlanLink(payload) {
  return b64url(new TextEncoder().encode(JSON.stringify(payload)));
}
export function decodePlanLink(code) {
  if (typeof code !== "string" || !/^[A-Za-z0-9_-]+$/.test(code) || code.length > 20000) throw Error("Linkul de plan nu este valid.");
  let p;
  try {
    const bin = atob(code.replace(/-/g, "+").replace(/_/g, "/"));
    p = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
  } catch { throw Error("Linkul de plan este deteriorat."); }
  const ok = p && p.v === 1 && /^\d{4}-\d{2}-\d{2}$/.test(p.day) && typeof p.shift === "string" && Array.isArray(p.rows) && p.rows.length <= 100 &&
    p.rows.every((r) => Array.isArray(r) && typeof r[0] === "string" && (r[1] === null || typeof r[1] === "string") && Number.isInteger(r[2]) && r[2] >= 0 && (r[3] === null || (Number.isInteger(r[3]) && r[3] >= 0)));
  const intOk = (x) => Number.isInteger(x) && x >= 0;
  const extraOk = p.rows.every((r) => r[4] === undefined || r[4] === null || intOk(r[4])) &&
    (p.hours === undefined || (Array.isArray(p.hours) && p.hours.length <= 24 && p.hours.every(intOk))) &&
    (p.norms === undefined || (p.norms && typeof p.norms === "object" && !Array.isArray(p.norms) && Object.values(p.norms).every(intOk))) &&
    (p.actuals === undefined || (p.actuals && typeof p.actuals === "object" && !Array.isArray(p.actuals) &&
      Object.values(p.actuals).every((a) => Array.isArray(a) && a.length <= 24 && a.every((x) => x === null || intOk(x)))));
  if (!ok || !extraOk) throw Error("Linkul de plan are un format greșit.");
  const out = { v: 1, day: p.day, shift: p.shift, rows: p.rows.map((r) => (r[4] === undefined ? [r[0], r[1], r[2], r[3]] : [r[0], r[1], r[2], r[3], r[4]])), others: !!p.others };
  if (p.hours) out.hours = p.hours.slice();
  if (p.norms) out.norms = Object.fromEntries(Object.entries(p.norms).filter(([k]) => !BAD_KEYS.includes(k)));
  if (p.actuals) out.actuals = Object.fromEntries(Object.entries(p.actuals).filter(([k]) => !BAD_KEYS.includes(k)).map(([k, a]) => [k, a.slice()]));
  return out;
}
export function rowsFromPayload(p, doc) {
  // Pozițional (nu prin text): o coloană goală (ex. operatori necunoscuți) nu mută valorile următoare.
  const byName = new Map(doc.master.lines.map((l) => [norm(l.name), l]));
  const rows = [], errors = [], skipped = [];
  for (const [name, pn, target, ops, rate] of p.rows) {
    const line = byName.get(norm(name));
    if (!line) { errors.push("Linia „" + name + "” nu există în catalog."); continue; }
    if (!target) { skipped.push(line.name); continue; }
    if (rows.some((r) => r.lineId === line.id)) { errors.push(line.name + " apare de două ori."); continue; }
    rows.push({ lineId: line.id, lineName: line.name, pn: pn || null, target, ops: ops ?? null, norm: rate ?? null });
  }
  return { rows, errors, skipped, total: rows.reduce((a, r) => a + r.target, 0) };
}

// Împarte planurile pe ore după un profil cu același total: rotunjire controlată care păstrează
// exact atât totalul fiecărei linii, cât și totalul fiecărei ore.
export function splitByProfile(plans, profile) {
  const T = plans.reduce((a, b) => a + b, 0);
  if (profile.reduce((a, b) => a + b, 0) !== T) throw Error("Profilul orar nu are același total ca planul.");
  const exact = plans.map((p) => profile.map((w) => (T ? (p * w) / T : 0)));
  const m = exact.map((row) => row.map(Math.floor));
  const rowNeed = plans.map((p, i) => p - m[i].reduce((a, b) => a + b, 0));
  const colNeed = profile.map((w, j) => w - m.reduce((a, row) => a + row[j], 0));
  const cells = [];
  exact.forEach((row, i) => row.forEach((x, j) => cells.push([x - Math.floor(x), i, j])));
  cells.sort((a, b) => b[0] - a[0]);
  for (const [, i, j] of cells) if (rowNeed[i] > 0 && colNeed[j] > 0) { m[i][j]++; rowNeed[i]--; colNeed[j]--; }
  // Reparare (rar): dacă au rămas unități, se mută între celule fără a strica totalurile.
  for (let i = 0; i < plans.length; i++) while (rowNeed[i] > 0) {
    const j = colNeed.findIndex((c) => c > 0);
    if (j < 0) break;
    m[i][j]++; rowNeed[i]--; colNeed[j]--;
  }
  return m;
}

// Realizatul pe ore venit din link (ex. raportul orar din Excel): { linie: [ora1, ora2, …] }, null = lipsă.
// Se salvează ca raport orar cu rebut/rework necunoscute (raport incomplet, nu 0). Un raport introdus
// pe telefon are prioritate; rapoartele venite anterior din link se actualizează.
export function applyActuals(doc, actuals, workDay, shift, at = new Date().toISOString()) {
  const sk = shiftKey(workDay, shift.id);
  let saved = 0, kept = 0;
  const unknown = [];
  for (const [name, list] of Object.entries(actuals || {})) {
    const line = doc.master.lines.find((l) => norm(l.name) === norm(name));
    if (!line) { unknown.push(name); continue; }
    const pnId = doc.plans[sk]?.[line.id]?.runs?.[0]?.pnId ?? null;
    list.forEach((total, i) => {
      if (!Number.isInteger(total)) return;
      doc.reports[sk] ||= {};
      doc.reports[sk][line.id] ||= {};
      const cur = doc.reports[sk][line.id][i];
      if (cur && cur.source !== "link") { kept++; return; }
      doc.reports[sk][line.id][i] = { splits: [{ pnId, total, scrap: null, rework: null }], note: "", reason: "", issueId: null, na: false, at, source: "link" };
      saved++;
    });
  }
  return { saved, kept, unknown };
}
