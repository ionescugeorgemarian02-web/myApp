// Planificarea schimbului: rulări (PN pe linie) și ținta orară.
import { slotsOf, breaksOf, atTime, productiveMin, shiftWindow } from "../core/time.js";
import { apportion, nn } from "../core/num.js";

export const METHODS = {
  productive: "După minute productive",
  uniform: "Uniform pe ore",
  cycle: "Din timpul de ciclu",
  manual: "Manual",
};
// Fereastra reală a unei rulări în schimb.
export function runWindow(run, workDay, shift) {
  const w = shiftWindow(workDay, shift);
  const from = run.start ? atTime(workDay, shift, run.start) : w.from;
  let to = run.end ? atTime(workDay, shift, run.end) : w.to;
  if (run.end && to && from && to <= from) to = w.to;
  return from && to && to > from ? { from, to } : null;
}
export function runSlotMinutes(run, workDay, shift) {
  const win = runWindow(run, workDay, shift);
  const br = breaksOf(workDay, shift);
  return slotsOf(workDay, shift).map((s) => {
    if (!win) return 0;
    const a = new Date(Math.max(s.from, win.from)), b = new Date(Math.min(s.to, win.to));
    return productiveMin(a, b, br);
  });
}
// Ținta pe ore pentru o rulare. Suma = target (exceptând metoda din ciclu, care produce targetul).
export function distribute(run, workDay, shift) {
  const n = slotsOf(workDay, shift).length;
  const method = run.method || "productive";
  if (run.kind === "changeover") return new Array(n).fill(0); // changeover planificat: timp planificat, fără target
  if (method === "manual") {
    const h = Array.isArray(run.hourly) ? run.hourly.slice(0, n).map((x) => nn(x, true)) : [];
    while (h.length < n) h.push(0);
    return h.some((x) => x === null) ? null : h; // o celulă invalidă nu devine 0
  }
  const mins = runSlotMinutes(run, workDay, shift);
  if (method === "cycle") {
    const c = nn(run.cycleSec);
    if (!(c > 0)) return null;
    return mins.map((m) => Math.floor((m * 60) / c));
  }
  const target = nn(run.target, true);
  if (target === null) return null;
  if (method === "uniform") return apportion(target, mins.map((m) => (m > 0 ? 1 : 0)));
  return apportion(target, mins);
}
export function runTarget(run, workDay, shift) {
  const h = distribute(run, workDay, shift);
  return h ? h.reduce((a, b) => a + b, 0) : null;
}
// Plan pe ore pentru linie (suma rulărilor). null dacă o rulare nu poate fi calculată.
export function hourlyPlan(plan, workDay, shift) {
  const n = slotsOf(workDay, shift).length;
  const out = new Array(n).fill(0);
  if (!plan || plan.notPlanned) return out;
  for (const run of plan.runs || []) {
    const h = distribute(run, workDay, shift);
    if (!h) return null;
    h.forEach((v, i) => (out[i] += v));
  }
  return out;
}
// Planul pe ore pentru fiecare rulare (pentru trasabilitate pe PN).
export function hourlyByRun(plan, workDay, shift) {
  return (plan?.runs || []).map((run) => ({ run, hourly: distribute(run, workDay, shift) }));
}
export const total = (h) => (h ? h.reduce((a, b) => a + b, 0) : null);
export function plannedWindows(plan, workDay, shift) {
  if (!plan || plan.notPlanned) return [];
  return (plan.runs || []).map((r) => runWindow(r, workDay, shift)).filter(Boolean);
}
export function confirmBaseline(plan, workDay, shift, now) {
  if (plan.baseline) return plan.baseline;
  const h = hourlyPlan(plan, workDay, shift);
  if (!h) throw Error("Completează targetul sau timpul de ciclu pentru toate PN-urile.");
  plan.baseline = { at: now.toISOString(), hourly: h, total: total(h), runs: structuredClone(plan.runs) };
  plan.revisions = plan.revisions || [];
  return plan.baseline;
}
// Replanificare: baseline-ul rămâne neschimbat; revizia păstrează motivul.
export function revisePlan(plan, workDay, shift, reason, now) {
  if (!String(reason || "").trim()) throw Error("Scrie motivul replanificării.");
  const h = hourlyPlan(plan, workDay, shift);
  if (!h) throw Error("Planul are rulări incomplete.");
  plan.revisions = plan.revisions || [];
  plan.revisions.push({ at: now.toISOString(), reason: String(reason).trim(), hourly: h, total: total(h) });
  return plan.revisions.at(-1);
}
// Conflicte: rulări suprapuse pe aceeași linie, rulare în afara schimbului, ciclu mai lung decât takt etc.
export function planIssues(plan, workDay, shift) {
  const out = [];
  const wins = (plan?.runs || []).map((r) => ({ r, w: runWindow(r, workDay, shift) }));
  for (const { r, w } of wins) {
    if (!w) out.push({ run: r.id, text: "Ora de început sau de final nu este în schimb." });
    if (r.kind === "changeover") continue;
    if (r.method !== "cycle" && r.method !== "manual" && nn(r.target, true) === null) out.push({ run: r.id, text: "Lipsește targetul." });
    if (r.method === "cycle" && !(nn(r.cycleSec) > 0)) out.push({ run: r.id, text: "Lipsește timpul de ciclu." });
    if (r.method === "manual" && !distribute(r, workDay, shift)) out.push({ run: r.id, text: "Planul manual are ore fără valoare validă." });
    else if (r.method === "manual" && nn(r.target, true) !== null && total(distribute(r, workDay, shift)) !== nn(r.target, true))
      out.push({ run: r.id, text: "Suma pe ore diferă de targetul total." });
  }
  for (let i = 0; i < wins.length; i++)
    for (let j = i + 1; j < wins.length; j++) {
      const a = wins[i].w, b = wins[j].w;
      if (a && b && a.from < b.to && b.from < a.to) out.push({ run: wins[j].r.id, text: "Se suprapune cu altă rulare pe aceeași linie." });
    }
  return out;
}
