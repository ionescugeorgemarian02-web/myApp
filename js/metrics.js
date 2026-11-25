// Indicatorii caietului, calculați din datele existente. Fără interfață:
// primesc caietul și momentul curent (ctx), deci pot fi testați separat.
import { norm, day, validDate } from "./ui.js";
import { isClosed, rowLabel, colByKey, colByName, statusOf, num } from "./records.js";

// ——— Date calendaristice ———
const DAY = 86400000;
const toDate = (iso) => new Date(iso + "T12:00");
export const addDays = (iso, n) => day(new Date(toDate(iso).getTime() + n * DAY));
export const daysBetween = (a, b) => Math.round((toDate(b) - toDate(a)) / DAY);
export function weekStart(iso) {
  const d = toDate(iso);
  return addDays(iso, -((d.getDay() + 6) % 7));
}
// Săptămâna ISO 8601: începe luni; săptămâna 1 conține prima joi a anului.
function isoWeek(iso) {
  const d = toDate(iso);
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const yearStart = Date.UTC(t.getUTCFullYear(), 0, 1);
  return { year: t.getUTCFullYear(), week: Math.ceil(((t - yearStart) / DAY + 1) / 7) };
}
export const weekNumber = (iso) => isoWeek(iso).week;
export function weekKey(iso) {
  const { year, week } = isoWeek(iso);
  return year + "-S" + String(week).padStart(2, "0");
}
// Data și ora locală a unui moment ISO (ex. momentul bifării).
export function localStamp(isoTime) {
  const d = new Date(isoTime);
  if (!Number.isFinite(d.getTime())) return null;
  return { date: day(d), time: d.toTimeString().slice(0, 5) };
}
const inRange = (date, from, to) => validDate(date) && date >= from && date <= to;

// ——— Găsirea modulelor ———
function* blocks(data, type) {
  for (const p of data.pages)
    if (!p.archived) for (const b of p.blocks) if (!type || b.type === type) yield { p, b };
}
const find = (data, type, test) => {
  for (const x of blocks(data, type)) if (test(x.b, x.p)) return x;
  return null;
};
export const handoverBlock = (data) =>
  find(data, "journal", (b) => colByName(b, "schimb") && b.cols.some((c) => c.type === "date" && norm(c.name) === "data"));
export const problemsBlock = (data) =>
  find(data, "table", (b) => colByKey(b, "problem")) ||
  find(data, "table", (b) => colByName(b, "problema") && colByName(b, "stare"));
export const safetyBlock = (data) => find(data, "table", (b) => colByKey(b, "safetyType"));
export const teamBlock = (data) =>
  find(data, "table", (b) => colByKey(b, "name")) ||
  find(data, "table", (b, p) => norm(p.title) === "echipa" && colByName(b, "nume"));
export const oneOnOneBlock = (data) => find(data, "table", (b) => colByName(b, "ce am promis"));
export const indicatorsBlock = (data) => find(data, "table", (b) => colByName(b, "valoare de pornire"));
export const skillsBlock = (data) => find(data, "skills", () => true);
export const auditBlocks = (data) => [...blocks(data, "audit")];
export const equipmentList = (data) =>
  (Array.isArray(data.settings.equipment) ? data.settings.equipment : []).filter((x) => typeof x === "string" && x.trim());

// ——— Cifrele schimbului (din jurnalul de predare) ———
export const SHIFT_FIELDS = [
  ["plan", "Plan (buc)"],
  ["produced", "Realizat (buc)"],
  ["scrap", "Rebut (buc)"],
  ["downtime", "Minute de oprire"],
  ["planned", "Efectiv planificat"],
  ["present", "Prezenți"],
];
const SHIFT_KEY = /^(\d{4}-\d{2}-\d{2}) · Schimb ([123])$/;
export function shiftRecords(data) {
  const byKey = new Map();
  const ho = handoverBlock(data);
  if (ho) {
    const { b, p } = ho;
    const dateCol = b.cols.find((c) => c.type === "date" && norm(c.name) === "data");
    const shiftCol = colByName(b, "schimb");
    for (const r of b.rows) {
      const date = r.values[dateCol.id], shift = Number(r.values[shiftCol.id]);
      if (!validDate(date) || ![1, 2, 3].includes(shift)) continue;
      const rec = { date, shift, key: date + " · Schimb " + shift, row: r, p, b };
      for (const [key] of SHIFT_FIELDS) {
        const col = colByKey(b, key);
        rec[key] = col ? num(r.values[col.id]) : null;
      }
      byKey.set(rec.key, rec);
    }
  }
  // Cifrele trecute pe linii completează ce lipsește din predare.
  const lb = linesBlock(data);
  for (const [key, shift] of Object.entries(lb?.b.shifts || {})) {
    const m = SHIFT_KEY.exec(key);
    if (!m || !validDate(m[1])) continue;
    const t = lineTotals(Object.values(shift));
    if (t.plan == null && t.real == null && t.reb == null && t.down == null) continue;
    const rec = byKey.get(key) || { date: m[1], shift: Number(m[2]), key, row: null, p: null, b: null,
      ...Object.fromEntries(SHIFT_FIELDS.map(([k]) => [k, null])) };
    rec.fromLines = true;
    rec.plan ??= t.plan;
    rec.produced ??= t.real;
    rec.scrap ??= t.reb;
    rec.downtime ??= t.down;
    byKey.set(key, rec);
  }
  return [...byKey.values()].sort((a, b) => a.key.localeCompare(b.key));
}

// ——— Liniile din subordine: starea pe schimb ———
export const linesBlock = (data) => find(data, "lines", () => true);
export const LINE_STATES = { ok: "OK", warn: "Atenție", stop: "Oprită" };
export const LINE_FIELDS = [
  ["plan", "Plan (buc)"],
  ["real", "Realizat (buc)"],
  ["reb", "Rebut (buc)"],
  ["down", "Oprire (min)"],
  ["op", "Operatori"],
  ["tl", "TL pe linie (ore)"],
];
export function lineEntries(data, key) {
  const shift = linesBlock(data)?.b.shifts?.[key] || {};
  return equipmentList(data).map((name) => {
    const raw = shift[name] || {};
    const e = { name, st: ["ok", "warn", "stop"].includes(raw.st) ? raw.st : "", obs: typeof raw.obs === "string" ? raw.obs : "", at: raw.at || null };
    for (const [k] of LINE_FIELDS) e[k] = num(raw[k]);
    return e;
  });
}
export function lineTotals(entries) {
  const sum = (k) => {
    const v = entries.map((e) => num(e[k])).filter((x) => x != null);
    return v.length ? v.reduce((s, x) => s + x, 0) : null;
  };
  const plan = sum("plan"), real = sum("real");
  return {
    plan, real, reb: sum("reb"), down: sum("down"), op: sum("op"), tl: sum("tl"),
    pct: plan > 0 && real != null ? (real / plan) * 100 : null,
    ok: entries.filter((e) => e.st === "ok").length,
    warn: entries.filter((e) => e.st === "warn").length,
    stop: entries.filter((e) => e.st === "stop").length,
    checked: entries.filter((e) => e.st).length,
    total: entries.length,
  };
}
// Totalurile fiecărei linii într-un interval (pentru analiza săptămânii).
export function lineWeek(data, from, to) {
  const lb = linesBlock(data);
  const names = equipmentList(data);
  const out = new Map(names.map((n) => [n, { name: n, plan: 0, real: 0, reb: 0, down: 0, stops: 0, warns: 0, shifts: 0, withPlan: 0 }]));
  for (const [key, shift] of Object.entries(lb?.b.shifts || {})) {
    const m = SHIFT_KEY.exec(key);
    if (!m || !inRange(m[1], from, to)) continue;
    for (const [name, raw] of Object.entries(shift)) {
      const x = out.get(name);
      if (!x || !raw) continue;
      const plan = num(raw.plan), real = num(raw.real);
      x.shifts++;
      if (plan > 0 && real != null) { x.plan += plan; x.real += real; x.withPlan++; }
      x.reb += num(raw.reb) || 0;
      x.down += num(raw.down) || 0;
      if (raw.st === "stop") x.stops++;
      if (raw.st === "warn") x.warns++;
    }
  }
  return [...out.values()].map((x) => ({ ...x, pct: x.plan > 0 ? (x.real / x.plan) * 100 : null }));
}
export function recordKpis(r) {
  return {
    planPct: r.plan > 0 && r.produced != null ? (r.produced / r.plan) * 100 : null,
    scrapPct: r.produced > 0 && r.scrap != null ? (r.scrap / r.produced) * 100 : null,
    downtime: r.downtime,
    absencePct: r.planned > 0 && r.present != null ? (Math.max(0, r.planned - r.present) / r.planned) * 100 : null,
  };
}
// Totaluri pe o listă de schimburi: procentele se calculează din sume, nu din medii.
export function aggregate(records) {
  const sum = (key, filter) => records.filter(filter).reduce((s, r) => s + r[key], 0);
  const withPlan = (r) => r.plan > 0 && r.produced != null;
  const withScrap = (r) => r.produced > 0 && r.scrap != null;
  const withStaff = (r) => r.planned > 0 && r.present != null;
  const plan = sum("plan", withPlan), producedForPlan = sum("produced", withPlan);
  const produced = sum("produced", withScrap), scrap = sum("scrap", withScrap);
  const planned = sum("planned", withStaff), present = sum("present", withStaff);
  const downRecords = records.filter((r) => r.downtime != null);
  return {
    shifts: records.length,
    withNumbers: records.filter((r) => SHIFT_FIELDS.some(([k]) => r[k] != null)).length,
    plan, produced: producedForPlan,
    planPct: plan > 0 ? (producedForPlan / plan) * 100 : null,
    scrapPct: produced > 0 ? (scrap / produced) * 100 : null,
    scrap,
    downtime: downRecords.length ? downRecords.reduce((s, r) => s + r.downtime, 0) : null,
    absencePct: planned > 0 ? (Math.max(0, planned - present) / planned) * 100 : null,
    planned, present,
  };
}

// ——— Siguranță ———
export function safetyEvents(data) {
  const s = safetyBlock(data);
  if (!s) return [];
  const { b, p } = s;
  const dateCol = b.cols.find((c) => c.type === "date" && norm(c.name) === "data");
  const type = colByKey(b, "safetyType"), eq = colByKey(b, "equipment");
  return b.rows.map((r) => ({
    r, p, b,
    date: dateCol ? r.values[dateCol.id] : "",
    type: norm(r.values[type.id]),
    equipment: eq ? r.values[eq.id] || "" : "",
    label: rowLabel(b, r),
    closed: isClosed(b, r),
  }));
}
export function safetyCounts(events, from, to) {
  const inside = events.filter((e) => inRange(e.date, from, to));
  return {
    incidents: inside.filter((e) => e.type === "incident").length,
    nearMiss: inside.filter((e) => e.type === "near-miss").length,
    observations: inside.filter((e) => e.type === "observatie").length,
    total: inside.length,
  };
}

// ——— Probleme: ciclul de viață ———
export function problems(data, ctx) {
  const pb = problemsBlock(data);
  if (!pb) return [];
  const { b, p } = pb;
  const dateCol = b.cols.find((c) => c.type === "date" && norm(c.name) === "data");
  const dueCol = b.cols.find((c) => c.type === "date" && norm(c.name).includes("termen"));
  const owner = colByName(b, "responsabil"), eq = colByKey(b, "equipment");
  return b.rows.filter((r) => rowLabel(b, r) !== "Rând fără text").map((r) => {
    const created = r.created ? localStamp(r.created)?.date : null;
    const opened = (dateCol && validDate(r.values[dateCol.id]) && r.values[dateCol.id]) || created || null;
    const closed = isClosed(b, r);
    const closedOn = r.closedAt ? localStamp(r.closedAt)?.date : null;
    const due = dueCol && validDate(r.values[dueCol.id]) ? r.values[dueCol.id] : "";
    return {
      r, p, b, label: rowLabel(b, r), status: statusOf(b, r), closed, opened, closedOn,
      verifyOn: r.verifyAt ? localStamp(r.verifyAt)?.date : null,
      due, equipment: eq ? r.values[eq.id] || "" : "",
      hasOwner: !!(owner && String(r.values[owner.id] || "").trim()),
      age: opened ? daysBetween(opened, closedOn || ctx.date) : null,
      overdue: !closed && due && due < ctx.date,
    };
  });
}
// Același post sau aceeași mașină, de mai multe ori într-o perioadă scurtă.
export function recurrences(data, ctx, days = 14, min = 3) {
  const from = addDays(ctx.date, -(days - 1));
  const counts = new Map();
  const add = (eq, date, what) => {
    if (!eq || !inRange(date, from, ctx.date)) return;
    const k = norm(eq);
    if (!counts.has(k)) counts.set(k, { equipment: eq, count: 0, problems: 0, safety: 0 });
    const x = counts.get(k);
    x.count++;
    x[what]++;
  };
  for (const pr of problems(data, ctx)) add(pr.equipment, pr.opened, "problems");
  for (const e of safetyEvents(data)) add(e.equipment, e.date, "safety");
  return [...counts.values()].filter((x) => x.count >= min).sort((a, b) => b.count - a.count);
}
export function pareto(data, ctx, days = 30) {
  return recurrences(data, ctx, days, 1);
}

// ——— Angajamente: închise la termen (metrica principală) ———
function deadlineOf(dueDate, dueTime) {
  return { date: dueDate, time: dueTime || "23:59" };
}
const onTime = (stamp, due) => stamp.date < due.date || (stamp.date === due.date && stamp.time <= due.time);
export function commitments(data, from, to, ctx) {
  const closed = [], open = [];
  for (const n of data.notes || []) {
    if (!validDate(n.due)) continue;
    const due = deadlineOf(n.due, n.dueTime);
    if (n.done) {
      const s = n.doneAt && localStamp(n.doneAt);
      if (s && inRange(s.date, from, to)) closed.push({ kind: "notiță", text: n.text, onTime: onTime(s, due) });
    } else open.push({ kind: "notiță", text: n.text, due: n.due, late: !onTime({ date: ctx.date, time: ctx.time || "00:00" }, due) });
  }
  for (const { p, b } of blocks(data)) {
    if (b.type === "checklist")
      for (const i of b.items) {
        if (!validDate(i.due)) continue;
        if (i.checked) {
          const s = i.checkedAt && localStamp(i.checkedAt);
          if (s && inRange(s.date, from, to)) closed.push({ kind: "punct", text: i.title, onTime: s.date <= i.due });
        } else open.push({ kind: "punct", text: i.title, due: i.due, late: i.due < ctx.date, p, key: "item-" + i.id });
      }
    if (b.type === "table" || b.type === "journal") {
      const dueCol = b.cols.find((c) => c.type === "date" && norm(c.name).includes("termen"));
      if (!dueCol) continue;
      for (const r of b.rows) {
        const due = r.values[dueCol.id];
        if (!validDate(due)) continue;
        if (isClosed(b, r)) {
          const s = r.closedAt && localStamp(r.closedAt);
          if (s && inRange(s.date, from, to)) closed.push({ kind: p.title, text: rowLabel(b, r), onTime: s.date <= due });
        } else open.push({ kind: p.title, text: rowLabel(b, r), due, late: due < ctx.date, p, key: "row-" + r.id });
      }
    }
  }
  const done = closed.filter((x) => x.onTime).length;
  const late = open.filter((x) => x.late);
  return {
    closed: closed.length, onTime: done,
    rate: closed.length ? (done / closed.length) * 100 : null,
    open: open.length, late: late.length,
    lateOld: late.filter((x) => x.due && daysBetween(x.due, ctx.date) > 7).length,
    lateList: late.sort((a, b) => (a.due || "").localeCompare(b.due || "")),
  };
}

// ——— Rutina: conformitate pe schimb și puncte sărite des ———
export function routineShifts(data) {
  const out = [];
  for (const { b } of blocks(data, "routine")) {
    const entries = Object.entries(b.history);
    if (b.key) entries.push([b.key, b.items]);
    for (const [key, items] of entries) {
      const m = SHIFT_KEY.exec(key);
      // Activitățile săptămânale nu intră în conformitatea pe schimb.
      const daily = items.filter((i) => i.freq !== "sapt");
      if (!m || !daily.length) continue;
      out.push({ block: b, key, date: m[1], shift: Number(m[2]), done: daily.filter((i) => i.checked).length,
        no: daily.filter((i) => i.no).length, total: daily.length, items: daily });
    }
  }
  return out.sort((a, b) => a.key.localeCompare(b.key));
}
export function skippedItems(data, ctx, last = 10) {
  // Doar schimburile încheiate în care s-a lucrat (cel puțin o bifă).
  const worked = routineShifts(data).filter((s) => s.key !== ctx.key && s.done > 0).slice(-last);
  if (worked.length < 4) return [];
  const counts = new Map();
  for (const s of worked)
    for (const i of s.items) {
      const c = counts.get(i.id) || { title: i.group ? i.group + ": " + i.title : i.title, skipped: 0, seen: 0 };
      c.seen++;
      if (!i.checked) c.skipped++;
      counts.set(i.id, c);
    }
  return [...counts.values()].filter((c) => c.seen >= 4 && c.skipped / c.seen >= 0.5)
    .sort((a, b) => b.skipped / b.seen - a.skipped / a.seen);
}

// ——— Echipa: discuții 1:1 și polivalență ———
export function people(data) {
  const t = teamBlock(data);
  if (!t) return [];
  const nameCol = colByKey(t.b, "name") || colByName(t.b, "nume");
  return t.b.rows.map((r) => ({ id: r.id, name: String(r.values[nameCol.id] || "").trim(), row: r, p: t.p }))
    .filter((x) => x.name);
}
export function oneOnOnes(data, ctx) {
  const o = oneOnOneBlock(data);
  const team = people(data);
  if (!o) return { team: team.map((x) => ({ ...x, last: null, days: null })), promisesOpen: 0, promisesLate: 0 };
  const { b } = o;
  const dateCol = b.cols.find((c) => c.type === "date" && norm(c.name) === "data");
  const nameCol = colByName(b, "nume");
  const dueCol = b.cols.find((c) => c.type === "date" && norm(c.name).includes("termen"));
  const promise = colByName(b, "ce am promis");
  const last = new Map();
  let promisesOpen = 0, promisesLate = 0;
  for (const r of b.rows) {
    const who = nameCol ? norm(r.values[nameCol.id]) : "";
    const date = dateCol ? r.values[dateCol.id] : "";
    if (who && validDate(date) && (!last.has(who) || last.get(who) < date)) last.set(who, date);
    if (promise && String(r.values[promise.id] || "").trim() && !isClosed(b, r)) {
      promisesOpen++;
      if (dueCol && validDate(r.values[dueCol.id]) && r.values[dueCol.id] < ctx.date) promisesLate++;
    }
  }
  return {
    p: o.p,
    team: team.map((x) => {
      const l = last.get(norm(x.name)) || null;
      return { ...x, last: l, days: l ? daysBetween(l, ctx.date) : null };
    }).sort((a, b) => (b.days ?? 1e9) - (a.days ?? 1e9)),
    promisesOpen, promisesLate,
  };
}
export const SKILL_LEVELS = ["Neinstruit", "Cu supraveghere", "Autonom", "Poate instrui"];
export function skillsCoverage(data) {
  const s = skillsBlock(data);
  const posts = equipmentList(data), team = people(data);
  const levels = s?.b.levels || {};
  const coverage = posts.map((post) => {
    const autonomous = team.filter((x) => (levels[x.id]?.[post] ?? 0) >= 2).length;
    return { post, autonomous };
  });
  return {
    block: s, posts, team,
    gaps: coverage.filter((c) => c.autonomous < 2),
    coverage,
    index: posts.length ? (coverage.filter((c) => c.autonomous >= 2).length / posts.length) * 100 : null,
  };
}

// ——— Turul pe linie ———
export function auditStatus(data, key) {
  return auditBlocks(data).map(({ p, b }) => {
    const run = b.runs[key] || {};
    const results = b.items.map((i) => ({ item: i, result: run[i.id] || null }));
    return {
      p, b,
      total: b.items.length,
      checked: results.filter((x) => x.result).length,
      nok: results.filter((x) => x.result?.s === "nok"),
      unhandled: results.filter((x) => x.result?.s === "nok" && !x.result.problem),
    };
  });
}
export function auditRates(data, from, to) {
  let checked = 0, nok = 0;
  for (const { b } of auditBlocks(data))
    for (const [key, run] of Object.entries(b.runs)) {
      const date = key.slice(0, 10);
      if (!inRange(date, from, to)) continue;
      for (const v of Object.values(run)) {
        checked++;
        if (v.s === "nok") nok++;
      }
    }
  return { checked, nok, rate: checked ? (nok / checked) * 100 : null };
}

// ——— Valorile de pornire din pagina Indicatori ———
export function baselines(data) {
  const ind = indicatorsBlock(data);
  const out = {};
  if (!ind) return out;
  const { b } = ind;
  const name = b.cols[0], start = colByName(b, "valoare de pornire");
  const target = b.cols.find((c) => norm(c.name).startsWith("tinta"));
  const map = [["plan realizat", "planPct"], ["absente", "absencePct"], ["accidente", "incidents"]];
  for (const r of b.rows) {
    const label = norm(r.values[name.id]);
    const hit = map.find(([k]) => label.includes(k));
    if (!hit) continue;
    out[hit[1]] = { start: num(r.values[start.id]), target: target ? num(r.values[target.id]) : null };
  }
  return out;
}

// ——— Primele 90 de zile ———
export function ninetyDays(data, ctx) {
  const start = validDate(data.settings.startDate) ? data.settings.startDate
    : data.settings.createdAt ? day(new Date(data.settings.createdAt)) : null;
  if (!start) return null;
  const n = daysBetween(start, ctx.date) + 1;
  const next = [30, 60, 90].find((m) => m >= n) || null;
  return { start, day: n, next, inDays: next ? next - n : null, done: n > 90 };
}

// ——— Rezumatul unei săptămâni ———
export function weekSummary(data, ctx, start) {
  const end = addDays(start, 6);
  const records = shiftRecords(data).filter((r) => inRange(r.date, start, end));
  const routine = routineShifts(data).filter((s) => inRange(s.date, start, end) && s.done > 0);
  const probs = problems(data, ctx);
  return {
    start, end, key: weekKey(start), number: weekNumber(start),
    records,
    kpis: aggregate(records),
    safety: safetyCounts(safetyEvents(data), start, end),
    commitments: commitments(data, start, end, ctx),
    routine: {
      shifts: routine.length,
      rate: routine.length ? (routine.reduce((s, x) => s + x.done, 0) / routine.reduce((s, x) => s + x.total, 0)) * 100 : null,
      no: routine.reduce((s, x) => s + (x.no || 0), 0),
      list: routine,
    },
    lines: lineWeek(data, start, end),
    problemsOpened: probs.filter((x) => inRange(x.opened, start, end)).length,
    problemsClosed: probs.filter((x) => inRange(x.closedOn, start, end)).length,
    // Probleme încă deschise la sfârșitul săptămânii (restanța de lucru).
    backlog: probs.filter((x) => x.opened && x.opened <= end && !(x.closedOn && x.closedOn <= end)).length,
    audit: auditRates(data, start, end),
  };
}
export function weekTrend(data, ctx, weeks = 8, end = weekStart(ctx.date)) {
  const out = [];
  for (let i = weeks - 1; i >= 0; i--) out.push(weekSummary(data, ctx, addDays(end, -7 * i)));
  return out;
}

// ——— Planul primei săptămâni (Luni–Vineri, din pagina cu zilele) ———
const WEEKDAYS = ["luni", "marti", "miercuri", "joi", "vineri"];
export function firstWeek(data, ctx) {
  const p = data.pages.find((x) => !x.archived &&
    x.blocks.filter((b) => b.type === "section" && WEEKDAYS.includes(norm(b.title))).length >= 3);
  const start = data.settings.startDate;
  if (!p || !validDate(start)) return null;
  // Dacă prima zi a căzut în weekend, planul începe lunea următoare.
  let monday = weekStart(start);
  if ((toDate(start).getDay() + 6) % 7 >= 5) monday = addDays(monday, 7);
  const days = [];
  p.blocks.forEach((b, i) => {
    const k = WEEKDAYS.indexOf(norm(b.title));
    const list = p.blocks[i + 1];
    if (b.type !== "section" || k < 0 || list?.type !== "checklist") return;
    days.push({ name: b.title, date: addDays(monday, k), section: b, list });
  });
  if (!days.length) return null;
  const end = addDays(monday, 4);
  const left = days.flatMap((d) => d.list.items.filter((i) => !i.checked));
  return {
    p, monday, end, days,
    today: days.find((d) => d.date === ctx.date) || null,
    behind: days.filter((d) => d.date < ctx.date).flatMap((d) => d.list.items.filter((i) => !i.checked)),
    left,
    running: ctx.date >= monday && ctx.date <= end,
    after: ctx.date > end && ctx.date <= addDays(end, 14) && left.length > 0,
  };
}
