import { addDays, auditBlocks, commitments, problems, recurrences, safetyEvents, shiftRecords, skillsCoverage } from "./metrics.js";
import { isClosed } from "./records.js";
import { intervalTotals, readKey } from "./operations.js";
import { nonnegative } from "./production.js";
import { norm, validDate } from "./ui.js";

export const KPI_DEFINITIONS = [
  ["incidents", "Siguranță", "Incidente raportate", "evenimente", "Număr de înregistrări de tip incident", "Registrul Siguranță"],
  ["nearMiss", "Siguranță", "Near-miss raportate", "evenimente", "Număr de înregistrări de tip near-miss", "Registrul Siguranță"],
  ["safetyOpen", "Siguranță", "Acțiuni de siguranță deschise", "acțiuni", "Probleme încă deschise, raportate în perioadă cu impact Siguranță", "Probleme și acțiuni"],
  ["safetyLate", "Siguranță", "Acțiuni de siguranță restante", "acțiuni", "Probleme raportate în perioadă, cu impact Siguranță și termen depășit azi", "Probleme și acțiuni"],
  ["safetyChecks", "Siguranță", "Verificări de siguranță efectuate", "verificări", "Numărul răspunsurilor OK/NOK din lista Safety walk", "Audituri personale"],
  ["plan", "Livrare", "Atingerea planului", "%", "Σ realizat ÷ Σ plan × 100", "Intervale de producție din zona selectată"],
  ["variance", "Livrare", "Abatere față de plan", "buc", "Σ realizat − Σ plan", "Intervale de producție din zona selectată"],
  ["losses", "Livrare", "Deficit însumat pe intervale", "buc", "Σ max(0, plan − realizat) pe interval", "Intervale de producție din zona selectată"],
  ["deliveryRisk", "Livrare", "Riscuri consemnate în predări", "predări", "Predări cu detalii înscrise în câmpul Riscuri pentru livrare", "Predare schimb"],
  ["scrap", "Calitate", "Rată de rebut", "%", "Σ rebut ÷ Σ realizat total × 100", "Intervale de producție din zona selectată"],
  ["rework", "Calitate", "Rată de reprelucrare", "%", "Σ piese care au necesitat reprelucrare ÷ Σ realizat total × 100", "Intervale de producție din zona selectată"],
  ["fpy", "Calitate", "First Pass Yield", "%", "Σ bune din prima trecere ÷ Σ total comparabil procesat × 100. Confirmă comparabilitatea local.", "Intervale de producție din zona selectată"],
  ["containment", "Calitate", "Probleme deschise cu containment notat", "probleme", "Probleme de calitate deschise cu măsură imediată consemnată", "Probleme și acțiuni"],
  ["stops", "Echipamente", "Opriri raportate", "opriri", "Număr de opriri înscrise cu echipament", "Registrul opririlor"],
  ["downtime", "Echipamente", "Durată totală opriri", "min", "Σ durate ale opririlor finalizate. Cere durată pentru fiecare oprire.", "Registrul opririlor"],
  ["meanStop", "Echipamente", "Durată medie oprire", "min", "Σ durate ÷ număr opriri, când sunt complete", "Registrul opririlor"],
  ["staffing", "Oameni", "Acoperirea efectivului planificat", "%", "Σ min(prezenți, planificați) ÷ Σ planificați × 100", "Predare schimb"],
  ["skills", "Oameni", "Posturi acoperite în schimbul curent", "%", "Posturi care ating necesarul ÷ posturi cu necesar configurat × 100. Fotografie curentă.", "Polivalență și Echipa"],
  ["trainingOpen", "Oameni", "Instruiri deschise", "instruiri", "Instruiri cu dată de deschidere în perioadă și stare deschisă", "Dezvoltarea echipei"],
  ["trainingDone", "Oameni", "Instruiri finalizate", "instruiri", "Instruiri cu data închiderii în perioadă", "Dezvoltarea echipei"],
  ["coaching", "Oameni", "Acțiuni de coaching consemnate", "acțiuni", "Intrări de coaching cu dată în perioadă", "Dezvoltarea echipei"],
  ["ideas", "Îmbunătățire", "Idei înregistrate", "idei", "Intrări de tip Idee cu dată în perioadă", "Dezvoltarea echipei"],
  ["implemented", "Îmbunătățire", "Idei implementate", "idei", "Idei închise în perioadă, cu rezultat consemnat", "Dezvoltarea echipei"],
  ["onTime", "Îmbunătățire", "Angajamente închise la termen", "%", "Închise la termen ÷ închise cu termen × 100", "Notițe, liste și registre"],
  ["late", "Îmbunătățire", "Angajamente restante azi", "angajamente", "Angajamente deschise cu termen depășit la data curentă", "Notițe, liste și registre"],
  ["verified", "Îmbunătățire", "Eficacitate documentată", "probleme", "Probleme închise în perioadă cu dovadă și concluzie", "Probleme și acțiuni"],
];

function keyedRows(data, marker) {
  return data.pages.filter((page) => !page.archived).flatMap((page) => page.blocks)
    .filter((block) => block.cols?.some((column) => column.key === marker))
    .flatMap((block) => block.rows.map((row) => ({ block, row })));
}

function countsBy(rows, getKey) {
  const counts = new Map();
  for (const row of rows) {
    const key = getKey(row);
    if (key) counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1]);
}

export function computeKpis(data, ctx, { from, to, zone }) {
  const inside = (date) => validDate(date) && date >= from && date <= to;
  const records = shiftRecords(data).filter((r) => inside(r.date));
  const intervals = zone.trim() ? (data.intervals || []).filter((r) => inside(r.date) && norm(r.zone) === norm(zone)) : [];
  const totals = intervalTotals(intervals);
  const reports = safetyEvents(data).filter((r) => inside(r.date) && r.type);
  const issues = problems(data, ctx);
  const openSafety = issues.filter((p) => !p.closed && inside(p.opened) && readKey(p.b, p.r, "impact") === "Siguranță");
  const quality = issues.filter((p) => inside(p.opened) && readKey(p.b, p.r, "impact") === "Calitate");
  const execution = commitments(data, from, to, ctx);
  const checks = auditBlocks(data).filter(({ b }) => b.auditKind === "safety")
    .flatMap(({ b }) => Object.entries(b.runs).filter(([key]) => inside(key.slice(0, 10))).flatMap(([, run]) => Object.values(run)));
  const learning = keyedRows(data, "learningKind").map(({ block, row }) => ({
    kind: readKey(block, row, "learningKind"),
    outcome: readKey(block, row, "learningOutcome"),
    date: readKey(block, row, "learningDate"),
    closed: isClosed(block, row),
    closedAt: readKey(block, row, "learningClosedDate"),
  })).filter((r) => r.kind);
  const learningInside = learning.filter((r) => inside(r.date));
  const stops = keyedRows(data, "stopEquipment")
    .map(({ block, row }) => ({
      date: readKey(block, row, "stopDate"), equipment: String(readKey(block, row, "stopEquipment") ?? "").trim(),
      cause: String(readKey(block, row, "stopCause") ?? "").trim(), minutes: nonnegative(readKey(block, row, "stopMinutes")),
    })).filter((r) => r.equipment && inside(r.date));
  const downtime = stops.length && stops.every((r) => r.minutes !== null)
    ? stops.reduce((total, row) => total + row.minutes, 0) : null;
  const staffing = records.filter((r) => r.planned > 0 && r.present !== null);
  const planned = staffing.reduce((sum, r) => sum + r.planned, 0);
  const present = staffing.reduce((sum, r) => sum + Math.min(r.planned, r.present), 0);
  const count = (collection, predicate) => collection.length ? collection.filter(predicate).length : null;
  return {
    values: {
      incidents: count(reports, (r) => r.type === "incident"), nearMiss: count(reports, (r) => r.type === "near-miss"),
      safetyOpen: openSafety.length, safetyLate: openSafety.filter((r) => r.overdue).length, safetyChecks: checks.length || null,
      plan: totals.planPct, variance: totals.variance,
      losses: intervals.length && totals.variance !== null ? intervals.reduce((sum, row) => sum + Math.max(0, row.plan - row.produced), 0) : null,
      deliveryRisk: count(records, (r) => typeof readKey(r.b, r.row, "deliveryRisk") === "string" && readKey(r.b, r.row, "deliveryRisk").trim() !== ""),
      scrap: totals.scrapPct, rework: totals.reworkPct, fpy: totals.fpy,
      containment: count(quality, (p) => !p.closed && Boolean(String(readKey(p.b, p.r, "containment") || "").trim())),
      stops: stops.length || null, downtime, meanStop: downtime === null ? null : downtime / stops.length,
      staffing: planned ? present / planned * 100 : null, skills: skillsCoverage(data, ctx.shift).index,
      trainingOpen: count(learningInside, (r) => r.kind === "Instruire" && !r.closed),
      trainingDone: count(learning, (r) => r.kind === "Instruire" && r.closed && inside(r.closedAt)),
      coaching: count(learningInside, (r) => r.kind === "Coaching"),
      ideas: count(learningInside, (r) => r.kind === "Idee"),
      implemented: count(learning, (r) => r.kind === "Idee" && r.closed && inside(r.closedAt) && String(r.outcome || "").trim()),
      onTime: execution.rate, late: execution.late,
      verified: issues.filter((p) => p.r.verifiedClosure && inside(p.closedOn)).length,
    },
    defects: countsBy(quality, (p) => readKey(p.b, p.r, "defectCategory")),
    recurrence: recurrences(data, { ...ctx, date: to }, Math.max(1, Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1), 2),
    stops,
    intervals: intervals.length,
  };
}

export function kpiComparison(value, configuration) {
  if (value == null || configuration?.target == null || !configuration.confirmed) return "";
  return (configuration.direction === "max" ? value <= configuration.target : value >= configuration.target)
    ? "În pragul configurat" : "În afara pragului configurat";
}

export const reportingRange = (today, days) => ({ from: addDays(today, 1 - days), to: today });

export const AUDIT_TEMPLATES = [
  ["safety", "Safety walk", ["Zona și căile de acces au fost verificate conform cerințelor locale.", "Riscurile observabile și măsurile deschise au fost revizuite."]],
  ["5s", "5S / 6S", ["Obiectele păstrate au locul stabilit și accesibil.", "Situația de la post corespunde reperului vizual aprobat."]],
  ["standard", "Lucru standardizat", ["Instrucțiunea aprobată și versiunea aplicabilă sunt accesibile.", "Pașii observați sunt comparați cu instrucțiunea valabilă."]],
  ["segregation", "Produs suspect", ["Produsul suspect este identificabil și separat în aria aprobată.", "Notificarea și responsabilul urmează procesul local."]],
  ["flow", "Flux vizual", ["Zonele de transfer și stocurile intermediare sunt vizibile.", "Blocajele și schimbările de prioritate sunt comunicate."]],
  ["material", "Materiale", ["Materialele necesare următoarei secvențe sunt disponibile sau lipsurile sunt consemnate.", "Identificarea materialelor urmează cerințele de la post."]],
  ["start", "Început de schimb", ["Predarea și prioritățile au fost revizuite.", "Acoperirea operațiilor și verificările locale de pornire sunt confirmate."]],
  ["followUp", "Urmărirea acțiunilor", ["Acțiunile urgente au rol responsabil și termen.", "Eficacitatea este verificată cu o dovadă pentru acțiunile propuse spre închidere."]],
];
