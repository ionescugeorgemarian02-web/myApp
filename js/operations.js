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
  const corrective = row.values[colByName(b, "actiune")?.id];
  if (!hasText(corrective) || !hasText(readKey(b, row, "effectiveness")) || !hasText(readKey(b, row, "closureNote")))
    return "Închiderea cere o acțiune corectivă, dovada eficacității și o concluzie.";
  return "";
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
  if (!row || !hasText(row.id) || !hasText(row.zone) || !validDate(row.date) || ![1, 2, 3].includes(row.shift) ||
      !validMoment(row.start) || !validMoment(row.end) || row.end <= row.start ||
      row.start.slice(0, 10) < row.date)
    return "Completează zona, data de lucru și intervalul în ordine cronologică.";
  const workday = Date.parse(row.date);
  const endDay = Date.parse(row.end.slice(0, 10));
  if (endDay - workday > 86400000)
    return "Intervalul trebuie să cadă în ziua de lucru sau în dimineața următoare.";
  if (INTERVAL_NUMBERS.some(([key]) => row[key] !== null &&
    (typeof row[key] !== "number" || nonnegative(row[key], !["plannedTime", "downtime"].includes(key)) === null)))
    return "Cantitățile trebuie să fie întregi, iar cifrele trebuie să fie pozitive sau zero.";
  if (["cause", "action", "equipment", "problemId"].some((key) => typeof row[key] !== "string"))
    return "Notele intervalului sunt nevalide.";
  if (["good", "scrap", "rework", "firstPass"].some((key) => row[key] !== null && row.produced !== null && row[key] > row.produced) ||
      (row.good !== null && row.scrap !== null && row.produced !== null && row.good + row.scrap > row.produced) ||
      (row.firstPass !== null && row.good !== null && row.firstPass > row.good) ||
      (row.rework !== null && row.firstPass !== null && row.produced !== null && row.rework + row.firstPass > row.produced))
    return "Verifică reconcilierea cantităților cu producția totală.";
  const minutes = (Date.parse(row.end + "Z") - Date.parse(row.start + "Z")) / 60000;
  if (row.plannedTime > minutes || row.downtime > minutes ||
    (row.plannedTime !== null && row.downtime > row.plannedTime))
    return "Minutele de oprire nu pot depăși timpul planificat sau durata intervalului.";
  if (intervals.some((other) => other.id !== row.id && norm(other.zone) === norm(row.zone) &&
      row.start < other.end && other.start < row.end))
    return "Intervalul se suprapune cu o înregistrare din aceeași zonă.";
  return "";
}

export function intervalTotals(rows) {
  const sum = (key) => rows.length && rows.every((r) => r[key] !== null)
    ? rows.reduce((total, r) => total + r[key], 0) : null;
  const totals = Object.fromEntries(INTERVAL_NUMBERS.map(([key]) => [key, sum(key)]));
  return { ...totals, ...productionKpis(totals) };
}
