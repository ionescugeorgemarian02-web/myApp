import { validDate, norm } from "./ui.js";
import { colByKey, colByName, isClosed } from "./records.js";
import { nonnegative, productionKpis } from "./production.js";

export const HANDOVER_FIELDS = [
  ["handoverZone", "Zonă / linie"],
  ["safetySummary", "Siguranță"],
  ["materialShortage", "Materiale lipsă"],
  ["deliveryRisk", "Riscuri pentru livrare"],
  ["handoverActions", "Acțiuni deschise și roluri responsabile"],
  ["handoverEscalation", "De escaladat"],
  ["nextChecks", "Următoarele verificări și raportări"],
  ["prepared", "Predare verificată", "checkbox"],
  ["received", "Preluare verificată", "checkbox"],
];
export const PROBLEM_FIELDS = [
  ["incidentShift", "Schimb", "select", ["1", "2", "3"]],
  ["impact", "Impact principal", "select", ["Siguranță", "Calitate", "Livrare", "Cost / echipament", "Oameni"]],
  ["urgency", "Prioritate", "select", ["Obișnuită", "Urgentă", "Critică"]],
  ["containment", "Măsură imediată / containment"],
  ["escalation", "Escaladare și sprijin necesar"],
  ["effectiveness", "Dovada eficacității"],
  ["closureNote", "Concluzie de închidere"],
];
export const ROUTINE = [
  ["Înainte", "Citește predarea", "Verifică problemele deschise", "Confirmă prioritățile", "Verifică resursele"],
  ["La început", "Ține briefingul", "Confirmă obiectivele și riscurile", "Verifică acoperirea posturilor", "Escaladează blocajele"],
  ["În timpul schimbului", "Fă un tur Gemba", "Compară planul cu realizatul", "Reacționează la abateri", "Urmărește problemele și acțiunile", "Comunică schimbările", "Oferă feedback și sprijin"],
  ["La final", "Confirmă producția", "Actualizează problemele", "Verifică acțiunile critice", "Pregătește predarea", "Notează o lecție"],
];
export const readKey = (b, r, key) => r.values[colByKey(b, key)?.id];
const hasText = (value) => typeof value === "string" && Boolean(value.trim());

export function shiftEnd(c) {
  if (c.automatic !== c.shift) return null;
  const end = c.hours?.[c.shift % 3];
  const start = c.hours?.[c.shift - 1];
  if (!start || !end || !c.time) return null;
  const minutes = (time) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  const now = minutes(c.time) + (c.date > c.workDay ? 1440 : 0);
  const finish = minutes(end) + (c.shift === 3 ? 1440 : 0);
  if (now < minutes(start) || now >= finish) return null;
  return { end, remaining: finish - now };
}

export function handoverSituation(b) {
  return b.cols.find((col) => norm(col.name).startsWith("situatia productiei")) ||
    colByKey(b, "safetySummary") || b.cols.find((col) => col.type === "text");
}

export function handoverStatus(b, r, key) {
  const examined = HANDOVER_FIELDS.filter(([k, , type]) => k !== "handoverZone" && type !== "checkbox")
    .some(([k]) => hasText(readKey(b, r, k))) ||
    b.cols.some((col) => !col.key && col.type === "text" && hasText(r.values[col.id])) ||
    ["plan", "produced", "scrap", "downtime", "planned", "present"]
      .some((field) => nonnegative(readKey(b, r, field)) !== null);
  if (!examined) return "Completează situația verificată înainte de confirmare.";
  if (key === "received" && readKey(b, r, "prepared") !== true)
    return "Confirmă mai întâi verificarea predării.";
  return "";
}

export function closureError(b, row) {
  return closureMissing(b, row).length
    ? "Închiderea cere o acțiune corectivă, dovada eficacității și o concluzie." : "";
}
export function closureMissing(b, row) {
  return [colByName(b, "actiune"), colByKey(b, "effectiveness"), colByKey(b, "closureNote")]
    .filter((col) => !hasText(row.values[col?.id]));
}

export function problemMatches(b, row, query, filter, date) {
  if (!Object.values(row.values).some((value) => norm(value).includes(norm(query))) && query.trim()) return false;
  const closed = isClosed(b, row);
  const due = row.values[b.cols.find((c) => c.type === "date" && norm(c.name).includes("termen"))?.id];
  if (filter === "Deschise") return !closed;
  if (filter === "Închise") return closed;
  if (filter === "Restante") return !closed && validDate(due) && due < date;
  if (filter === "Urgente / critice") return !closed && ["Urgentă", "Critică"].includes(readKey(b, row, "urgency"));
  return true;
}

const validMoment = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/.test(s) && validDate(s.slice(0, 10));
export const INTERVAL_NUMBERS = [
  ["plan", "Plan (buc)"], ["produced", "Realizat total (buc)"], ["good", "Bune la final (buc)"],
  ["scrap", "Rebut (buc)"], ["rework", "Au necesitat reprelucrare (buc)"],
  ["firstPass", "Bune din prima trecere (buc)"],
  ["plannedTime", "Timp planificat (min)"], ["downtime", "Opriri (min)"],
];
export function validInterval(row, intervals = []) {
  return intervalError(row, intervals)?.message || "";
}
export function intervalError(row, intervals = []) {
  const error = (field, message) => ({ field, message });
  if (!row || !hasText(row.id) || !hasText(row.zone)) return error("zone", "Completează zona intervalului.");
  if (!validDate(row.date)) return error("date", "Completează data de lucru.");
  if (![1, 2, 3].includes(row.shift)) return error("shift", "Alege schimbul.");
  if (!validMoment(row.start) || row.start.slice(0, 10) < row.date)
    return error("start", "Alege un început în ziua de lucru sau în dimineața următoare.");
  if (!validMoment(row.end) || row.end <= row.start)
    return error("end", "Alege un sfârșit după începutul intervalului.");
  const workday = Date.parse(row.date);
  const endDay = Date.parse(row.end.slice(0, 10));
  if (endDay - workday > 86400000)
    return error("end", "Intervalul trebuie să cadă în ziua de lucru sau în dimineața următoare.");
  const invalidNumber = INTERVAL_NUMBERS.find(([key]) => row[key] !== null &&
    (typeof row[key] !== "number" || nonnegative(row[key], !["plannedTime", "downtime"].includes(key)) === null));
  if (invalidNumber)
    return error(invalidNumber[0], "Cantitățile trebuie să fie întregi, iar cifrele trebuie să fie pozitive sau zero.");
  const invalidNote = ["cause", "action", "equipment", "problemId"].find((key) => typeof row[key] !== "string");
  if (invalidNote) return error(invalidNote, "Notele intervalului sunt nevalide.");
  const reconcile = (key) => error(key, "Verifică reconcilierea cantităților cu producția totală.");
  const aboveTotal = ["good", "scrap", "rework", "firstPass"].find((key) =>
    row[key] !== null && row.produced !== null && row[key] > row.produced);
  if (aboveTotal) return reconcile(aboveTotal);
  if (row.good !== null && row.scrap !== null && row.produced !== null && row.good + row.scrap > row.produced)
    return reconcile("scrap");
  if ((row.firstPass !== null && row.good !== null && row.firstPass > row.good) ||
      (row.rework !== null && row.firstPass !== null && row.produced !== null && row.rework + row.firstPass > row.produced))
    return reconcile("firstPass");
  const minutes = (Date.parse(row.end + "Z") - Date.parse(row.start + "Z")) / 60000;
  if (row.plannedTime > minutes)
    return error("plannedTime", "Timpul planificat nu poate depăși durata intervalului.");
  if (row.downtime > minutes || (row.plannedTime !== null && row.downtime > row.plannedTime))
    return error("downtime", "Minutele de oprire nu pot depăși timpul planificat sau durata intervalului.");
  if (intervals.some((other) => other.id !== row.id && norm(other.zone) === norm(row.zone) &&
      row.start < other.end && other.start < row.end))
    return error("start", "Intervalul se suprapune cu o înregistrare din aceeași zonă.");
  return null;
}

export function intervalTotals(rows) {
  const sum = (key) => rows.length && rows.every((r) => r[key] !== null)
    ? rows.reduce((total, r) => total + r[key], 0) : null;
  const totals = Object.fromEntries(INTERVAL_NUMBERS.map(([key]) => [key, sum(key)]));
  return { ...totals, ...productionKpis(totals) };
}
