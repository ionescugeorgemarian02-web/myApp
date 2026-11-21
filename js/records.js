// Funcții fără interfață pentru rândurile din tabele și jurnale.
// Le folosesc și calculele de indicatori, care rulează și în teste.
import { norm, id } from "./ui.js";

export const column = (name, type = "text", options = [], key) => ({
  id: id(),
  name,
  type,
  options,
  ...(key ? { key } : {}),
});

// Rândul este închis dacă are bifa „Rezolvat” sau starea „Închis”.
export function isClosed(b, r) {
  return b.cols.some(
    (col) =>
      (col.type === "checkbox" && ["rezolvat", "inchis", "finalizat"].includes(norm(col.name)) && r.values[col.id] === true) ||
      (col.type === "select" &&
        norm(col.name) === "stare" &&
        ["inchis", "rezolvat"].includes(norm(r.values[col.id]))),
  );
}
// Textul scurt care descrie un rând (primele două câmpuri de text completate).
export function rowLabel(b, r) {
  return (
    b.cols
      .filter((col) => col.type === "text" && r.values[col.id])
      .slice(0, 2)
      .map((col) => r.values[col.id])
      .join(" · ") || "Rând fără text"
  );
}
// Coloană după cheia ei stabilă (rămâne valabilă și după redenumire).
export const colByKey = (b, key) => b.cols?.find((c) => c.key === key);
export const colByName = (b, name) => b.cols?.find((c) => norm(c.name) === name);
export function statusOf(b, r) {
  const col = colByName(b, "stare");
  return col ? norm(r.values[col.id]) : "";
}
// Numerele scrise cu virgulă sau punct; „” înseamnă necompletat.
export function num(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || !value.trim()) return null;
  const n = Number(value.trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
// Marchează momentul închiderii și al trecerii în verificare.
export function trackLifecycle(b, r, wasClosed, now) {
  const closed = isClosed(b, r);
  if (closed && !wasClosed) r.closedAt = now;
  if (!closed && wasClosed) delete r.closedAt;
  const verifying = statusOf(b, r) === "verificare";
  if (verifying && !r.verifyAt) r.verifyAt = now;
  if (!verifying) delete r.verifyAt;
}
