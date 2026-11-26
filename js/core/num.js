// Numere: lipsa (null) rămâne distinctă de zero.
export function nn(value, integer = false) {
  if (typeof value === "string") {
    const t = value.trim().replace(",", ".");
    if (!/^\d+(\.\d+)?$/.test(t)) return null;
    value = Number(t);
  }
  return typeof value === "number" && Number.isFinite(value) && value >= 0 &&
    (!integer || Number.isSafeInteger(value)) ? value : null;
}
// Sumă care știe câte valori lipsesc.
export function sumKnown(values) {
  let sum = 0, known = 0, missing = 0;
  for (const v of values) {
    if (v === null || v === undefined) missing++;
    else { sum += v; known++; }
  }
  return { sum: known ? sum : null, known, missing };
}
export const ratio = (a, b) => (a === null || b === null || b === undefined || a === undefined || !(b > 0) ? null : a / b);
export function fmtN(v, digits = 0) {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return v.toLocaleString("ro-RO", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}
export const fmtPct = (r, digits = 1) => (r === null || r === undefined || !Number.isFinite(r) ? "—" : fmtN(r * 100, digits) + " %");
export const fmtSigned = (v) => (v === null || v === undefined ? "—" : (v > 0 ? "+" : v < 0 ? "−" : "") + fmtN(Math.abs(v)));
// Împarte un întreg proporțional cu ponderi, păstrând suma exactă (metoda celui mai mare rest).
export function apportion(total, weights) {
  const w = weights.map((x) => (x > 0 ? x : 0));
  const W = w.reduce((a, b) => a + b, 0);
  if (!(total >= 0) || !Number.isSafeInteger(total) || W <= 0) return w.map(() => 0);
  const raw = w.map((x) => (total * x) / W);
  const base = raw.map(Math.floor);
  let rest = total - base.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => [r - Math.floor(r), i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (let k = 0; rest > 0 && k < order.length; k++) {
    if (w[order[k][1]] > 0) { base[order[k][1]]++; rest--; }
  }
  return base;
}
