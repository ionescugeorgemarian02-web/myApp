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
    if (before.length) { target = before[0]; ops = after.length ? after.at(-1) : null; }
    else { target = after[0] ?? null; ops = after[1] ?? null; }
    if (!target) { skipped.push(line.name); continue; }
    if (rows.some((r) => r.lineId === line.id)) { errors.push(line.name + " apare de două ori."); continue; }
    rows.push({ lineId: line.id, lineName: line.name, pn, target, ops });
  }
  return { rows, errors, skipped, total: rows.reduce((a, r) => a + r.target, 0) };
}

export function applyPlanImport(doc, rows, workDay, shift, { markOthersNotPlanned = false } = {}) {
  const sk = shiftKey(workDay, shift.id);
  doc.plans[sk] ||= {};
  for (const r of rows) if (doc.plans[sk][r.lineId]?.baseline) throw Error(r.lineName + " are deja un plan confirmat (baseline). Folosește replanificarea, cu motiv.");
  let created = 0;
  for (const r of rows) {
    const line = doc.master.lines.find((l) => l.id === r.lineId);
    let pnId = null;
    if (r.pn) {
      let p = doc.master.pns.find((x) => norm(x.code) === norm(r.pn));
      if (!p) { p = { id: uid(), code: r.pn, name: "", ict: null, cycleSec: null }; doc.master.pns.push(p); created++; }
      pnId = p.id;
      if (!line.pnIds.includes(p.id)) line.pnIds.push(p.id);
    }
    if (r.ops) line.requiredOps = r.ops;
    doc.plans[sk][r.lineId] = { lineId: r.lineId, notPlanned: false, baseline: null, revisions: [],
      runs: [{ id: uid(), pnId, start: shift.start, end: shift.end, target: r.target, method: "productive", ops: r.ops, priority: "B", note: "" }] };
  }
  if (markOthersNotPlanned)
    for (const l of doc.master.lines) if (!rows.some((r) => r.lineId === l.id) && !doc.plans[sk][l.id]?.baseline)
      doc.plans[sk][l.id] = { lineId: l.id, notPlanned: true, runs: [], baseline: null, revisions: [] };
  return { created, lines: rows.length, total: rows.reduce((a, r) => a + r.target, 0) };
}

// Link de plan: datele merg doar în link (fragmentul #, nu ajunge la server și nu e în cod).
// Format: { v: 1, day: "YYYY-MM-DD", shift: "S1", rows: [[linie, pn, plan, operatori]], others: bool }
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
  if (!ok) throw Error("Linkul de plan are un format greșit.");
  return { v: 1, day: p.day, shift: p.shift, rows: p.rows.map((r) => [r[0], r[1], r[2], r[3]]), others: !!p.others };
}
export function rowsFromPayload(p, doc) {
  return parsePlanText(p.rows.map((r) => [r[0], r[1] || "", r[2], r[3] ?? ""].join("; ")).join("\n"), doc);
}
