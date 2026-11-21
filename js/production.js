// Datele cantitative lipsă rămân distincte de zero.
export function nonnegative(value, integer = false) {
  if (typeof value === "string" && /^\d+(?:[.,]\d+)?$/.test(value.trim()))
    value = Number(value.trim().replace(",", "."));
  return typeof value === "number" && Number.isFinite(value) && value >= 0 &&
    (!integer || Number.isSafeInteger(value)) ? value : null;
}

export function productionKpis(row) {
  const plan = nonnegative(row.plan);
  const produced = nonnegative(row.produced);
  const planned = nonnegative(row.planned);
  const present = nonnegative(row.present);
  function rate(key) {
    const count = nonnegative(row[key]);
    return produced > 0 && count !== null && count <= produced ? count / produced * 100 : null;
  }
  return {
    variance: plan !== null && produced !== null ? produced - plan : null,
    planPct: plan > 0 && produced !== null ? produced / plan * 100 : null,
    scrapPct: rate("scrap"),
    reworkPct: rate("rework"),
    fpy: rate("firstPass"),
    downtime: nonnegative(row.downtime),
    absencePct: planned > 0 && present !== null ? Math.max(0, planned - present) / planned * 100 : null,
  };
}

export function csvCell(value) {
  const text = String(value ?? "");
  const escaped = typeof value === "string" &&
    (/^[\s\uFEFF]*[=+\-@＝＋－＠]/u.test(text) || /^[\t\r\n]/.test(text)) ? "'" + text : text;
  return '"' + escaped.replaceAll('"', '""') + '"';
}
