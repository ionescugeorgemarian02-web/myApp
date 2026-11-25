// Instrucțiunile de lucru: se afișează numai textul scris de utilizator
// (detaliile punctului). Caietul nu mai propune instrucțiuni generice.
export function taskGuidance(item) {
  return (typeof item?.details === "string" && item.details.trim()) || "";
}
export function auditGuidance(item) {
  return (typeof item?.details === "string" && item.details.trim()) || "";
}
export const intervalGuidance = {};
export function recordGuidance() {
  return {};
}
