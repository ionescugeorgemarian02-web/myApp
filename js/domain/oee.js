// OEE conform oee.com: A = Run/PPT, P = ICT×Total/Run, Q = Good/Total, OEE = A×P×Q.
// Agregare pe PN-uri diferite: timp ideal ponderat, deci A×P×Q = Σ(Good×ICT)/ΣPPT exact.
// Timp în minute, ICT în secunde/bucată. Lipsa → null, niciodată 0 sau 100 %.
import { nn } from "../core/num.js";

export function slotOee({ ppt, stop = 0, changeover = 0, notrunning = 0, unknown = 0, counts = [] }) {
  const run = ppt - stop - changeover - notrunning - unknown;
  let idealTotal = 0, idealGood = 0, total = 0, good = 0, missingIct = false, missingGood = false, missingTotal = false;
  for (const c of counts) {
    const ict = nn(c.ict), tot = nn(c.total), g = nn(c.good);
    if (tot === null) { missingTotal = true; continue; }
    total += tot;
    if (g === null) missingGood = true; else good += g;
    if (tot > 0 && !(ict > 0)) { missingIct = true; continue; }
    idealTotal += ((ict || 0) * tot) / 60;
    if (g !== null) idealGood += ((ict || 0) * g) / 60;
  }
  return { ppt, run, stop, changeover, notrunning, unknown, idealTotal, idealGood, total, good, missingIct, missingGood, missingTotal, n: 1 };
}
export function sumOee(list) {
  const z = { ppt: 0, run: 0, stop: 0, changeover: 0, notrunning: 0, unknown: 0, idealTotal: 0, idealGood: 0, total: 0, good: 0, missingIct: false, missingGood: false, missingTotal: false, n: 0 };
  for (const s of list) {
    for (const k of ["ppt", "run", "stop", "changeover", "notrunning", "unknown", "idealTotal", "idealGood", "total", "good", "n"]) z[k] += s[k];
    z.missingIct ||= s.missingIct; z.missingGood ||= s.missingGood; z.missingTotal ||= s.missingTotal;
  }
  return z;
}
// Raporturile cu motivul pentru fiecare valoare lipsă.
export function ratiosOf(s) {
  const why = {};
  const out = { a: null, p: null, q: null, oee: null, qCount: null, why };
  if (!s || !(s.ppt > 0)) { why.all = "Fără timp de producție planificat raportat."; return out; }
  if (s.unknown > 0) why.a = Math.round(s.unknown) + " min fără status al liniei.";
  else out.a = Math.max(0, s.run) / s.ppt;
  if (s.missingTotal) why.p = why.q = "Lipsesc cantități raportate.";
  else if (s.missingIct) why.p = "Lipsește timpul ideal de ciclu (ICT) pentru un PN.";
  else if (s.unknown > 0) why.p = "Run time necunoscut.";
  else if (s.run > 0) out.p = s.idealTotal / s.run;
  else why.p = "Linia nu a rulat.";
  if (!s.missingTotal && !s.missingGood && s.total > 0) {
    out.qCount = s.good / s.total;
    if (!s.missingIct && s.idealTotal > 0) out.q = s.idealGood / s.idealTotal;
    else if (!s.missingIct) why.q = "Fără producție.";
    else why.q = "Lipsește ICT pentru ponderare.";
  } else if (!why.q) why.q = s.missingGood ? "Lipsesc rebutul sau rework-ul." : "Fără producție.";
  if (!s.missingTotal && !s.missingGood && !s.missingIct) out.oee = s.idealGood / s.ppt;
  else why.oee = why.p || why.q;
  return out;
}
