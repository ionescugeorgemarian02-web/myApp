// Timpul schimbului. Data de lucru = data la care începe schimbul (și pentru schimbul de noapte).
// Fără DOM: folosit de domeniu și de teste.
const pad = (n) => String(n).padStart(2, "0");
export const MIN = 60000;

export function validHM(s) {
  return typeof s === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}
export const hmToMin = (s) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
export const fmtHM = (d) => pad(d.getHours()) + ":" + pad(d.getMinutes());
export const day = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
export const isoLocal = (d) => day(d) + "T" + fmtHM(d);
// Șirurile locale („YYYY-MM-DD”, „YYYY-MM-DDTHH:MM”) se citesc în ora locală; cele cu Z/offset (toISOString) ca instant absolut.
export function fromIso(s) {
  if (typeof s !== "string") return null;
  if (/T.*(Z|[+-]\d\d:?\d\d)$/.test(s)) { const d = new Date(s); return Number.isNaN(d.getTime()) ? null : d; }
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(s);
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0));
  return Number.isNaN(d.getTime()) ? null : d;
}
export const validDay = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !!fromIso(s);
export function addDays(iso, n) {
  const d = fromIso(iso);
  d.setDate(d.getDate() + n);
  return day(d);
}
export const minutesBetween = (a, b) => Math.round((b - a) / MIN);

export function shiftWindow(workDay, shift) {
  const base = fromIso(workDay);
  const from = new Date(base.getTime());
  from.setHours(0, hmToMin(shift.start), 0, 0);
  const to = new Date(base.getTime());
  to.setHours(0, hmToMin(shift.end), 0, 0);
  if (to <= from) to.setDate(to.getDate() + 1);
  return { from, to };
}
// Ora „HH:MM” plasată în fereastra schimbului (după miezul nopții → ziua următoare).
export function atTime(workDay, shift, hm) {
  const { from, to } = shiftWindow(workDay, shift);
  const d = new Date(from.getTime());
  d.setHours(0, hmToMin(hm), 0, 0);
  if (d < from) d.setDate(d.getDate() + 1);
  return d <= to ? d : null;
}
export const shiftKey = (workDay, shiftId) => workDay + "|" + shiftId;
export function parseShiftKey(key) {
  const [workDay, shiftId] = String(key).split("|");
  return { workDay, shiftId };
}
export function currentShift(now, shifts) {
  for (const delta of [0, -1]) {
    const d = new Date(now.getTime());
    d.setDate(d.getDate() + delta);
    const workDay = day(d);
    for (const shift of shifts) {
      const w = shiftWindow(workDay, shift);
      if (now >= w.from && now < w.to) return { workDay, shift, ...w };
    }
  }
  return null;
}
export function nextShift(workDay, shift, shifts) {
  const i = shifts.findIndex((s) => s.id === shift.id);
  const n = shifts[(i + 1) % shifts.length];
  const w = shiftWindow(workDay, shift);
  let nd = workDay;
  if (shiftWindow(nd, n).from < w.to) nd = addDays(workDay, 1);
  return { workDay: nd, shift: n };
}
export function previousShift(workDay, shift, shifts) {
  const i = shifts.findIndex((s) => s.id === shift.id);
  const p = shifts[(i - 1 + shifts.length) % shifts.length];
  const w = shiftWindow(workDay, shift);
  let pd = workDay;
  if (shiftWindow(pd, p).from >= w.from) pd = addDays(workDay, -1);
  return { workDay: pd, shift: p };
}
// Intervale orare de la începutul schimbului; ultimul poate fi parțial.
export function slotsOf(workDay, shift) {
  const { from, to } = shiftWindow(workDay, shift);
  const out = [];
  for (let t = from.getTime(), i = 0; t < to.getTime(); t += 60 * MIN, i++) {
    const a = new Date(t), b = new Date(Math.min(t + 60 * MIN, to.getTime()));
    out.push({ i, from: a, to: b, label: fmtHM(a) + "–" + fmtHM(b) });
  }
  return out;
}
export function breaksOf(workDay, shift) {
  return (shift.breaks || []).filter((b) => validHM(b.start) && validHM(b.end)).map((b) => {
    const from = atTime(workDay, shift, b.start);
    let to = from && new Date(from.getTime() + ((hmToMin(b.end) - hmToMin(b.start) + 1440) % 1440) * MIN);
    return from && to ? { from, to } : null;
  }).filter(Boolean);
}
export function overlapMin(a1, a2, b1, b2) {
  const s = Math.max(a1.getTime(), b1.getTime()), e = Math.min(a2.getTime(), b2.getTime());
  return e > s ? (e - s) / MIN : 0;
}
export function productiveMin(from, to, breaks) {
  if (!(to > from)) return 0;
  let m = (to - from) / MIN;
  for (const b of breaks) m -= overlapMin(from, to, b.from, b.to);
  return Math.max(0, m);
}
export function isoWeek(iso) {
  const d = fromIso(iso);
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dow = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dow);
  const y = t.getUTCFullYear();
  const w = Math.ceil(((t - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
  return y + "-W" + pad(w);
}
export function fmtDur(min) {
  if (min === null || min === undefined || !Number.isFinite(min)) return "—";
  const m = Math.round(min);
  return m < 60 ? m + " min" : Math.floor(m / 60) + " h " + pad(m % 60) + " min";
}
const DAYS = ["duminică", "luni", "marți", "miercuri", "joi", "vineri", "sâmbătă"];
const MONTHS = ["ian.", "feb.", "mar.", "apr.", "mai", "iun.", "iul.", "aug.", "sept.", "oct.", "nov.", "dec."];
export function fmtDay(iso, long = false) {
  const d = fromIso(iso);
  if (!d) return "—";
  return (long ? DAYS[d.getDay()] + ", " : "") + d.getDate() + " " + MONTHS[d.getMonth()];
}
