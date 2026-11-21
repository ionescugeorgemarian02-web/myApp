import { app } from "../state.js";
import { actions, btn, details, el, icon, id, input, norm, openDialog, fieldError } from "../ui.js";
import { INTERVAL_NUMBERS, intervalTotals, intervalError } from "../operations.js";
import { nonnegative, productionKpis } from "../production.js";
import { problemsBlock } from "../metrics.js";
import { rowLabel } from "../records.js";
import { bars, fmt } from "../charts.js";

export const noData = "Date indisponibile";
const amount = (number, unit = "") => number == null ? noData : fmt(number) + unit;
export const zoneIntervals = (data, date, shift, zone) => (data.intervals || [])
  .filter((r) => r.date === date && r.shift === shift && norm(r.zone) === norm(zone))
  .sort((a, b) => a.start.localeCompare(b.start));

export function productionFigures(rows, source = "Intervale de producție") {
  const box = el("div", "", "productionFigures");
  const totals = intervalTotals(rows);
  const grid = el("dl", "", "figureGrid");
  for (const [label, key, fields] of [
    ["Plan", "plan", ["plan"]], ["Realizat", "produced", ["produced"]], ["Abatere", "variance", ["plan", "produced"]],
  ]) {
    const count = rows.filter((row) => fields.every((field) => row[field] != null)).length;
    const item = el("div", "", "figure");
    item.append(el("dt", label), el("dd", totals[key] == null ? "—" : fmt(totals[key])),
      el("dd", !count ? "Date indisponibile" : count < rows.length ? "Date parțiale · " + count + "/" + rows.length : "buc", "figureCoverage"));
    grid.append(item);
  }
  box.append(grid, el("p", "Sursă · " + source + " · " + rows.length + (rows.length === 1 ? " fișă" : " fișe"), "formHelp"));
  return box;
}

async function editInterval(c, existing, selection) {
  const initial = existing || {
    id: id(), date: selection.date, shift: selection.shift, zone: selection.zone,
    start: "", end: "", cause: "", action: "", equipment: "", problemId: "",
  };
  const draft = { ...initial };
  const fields = el("div", "", "recordFields intervalFields");
  const extra = details([el("span", "Calitate, timp și cauze"), icon("down")], null, "formStage");
  const extraFields = el("div", "", "recordFields intervalFields");
  extra.append(extraFields);
  const controls = new Map();
  function field(key, label, type = "text", options = [], parent = fields) {
    const group = input(label, draft[key], (v) => {
      draft[key] = v;
      const control = controls.get(key);
      if (control.getAttribute("aria-invalid") === "true") fieldError(control, "");
    }, type, options);
    parent.append(group);
    const control = group.querySelector("input, select, textarea");
    controls.set(key, control);
    return control;
  }
  field("zone", "Zonă / linie").required = true;
  field("shift", "Schimb", "select", ["1", "2", "3"]);
  field("date", "Data de lucru", "date").required = true;
  field("start", "Început", "datetime-local").required = true;
  field("end", "Sfârșit", "datetime-local").required = true;
  for (const [key, label] of INTERVAL_NUMBERS) {
    const control = field(key, label, "number", [], ["plan", "produced"].includes(key) ? fields : extraFields);
    control.min = "0";
    control.step = ["plannedTime", "downtime"].includes(key) ? "any" : "1";
  }
  field("equipment", "Echipament afectat", "text", [], extraFields);
  field("cause", "Cauză declarată", "area", [], extraFields);
  field("action", "Acțiune corectivă", "area", [], extraFields);
  const registry = problemsBlock(app.data);
  const linked = new Map((registry?.b.rows || []).map((r) => [r.id, rowLabel(registry.b, r)]));
  const problem = el("select");
  problem.add(new Option("Fără legătură", ""));
  for (const [value, label] of linked) problem.add(new Option(label, value));
  if (draft.problemId && !linked.has(draft.problemId)) problem.add(new Option("Legătură arhivată sau ștearsă", draft.problemId));
  problem.value = draft.problemId;
  problem.onchange = () => { draft.problemId = problem.value; };
  const label = el("label", "", "field");
  label.append(el("span", "Problemă asociată"), problem);
  extraFields.append(label);
  controls.set("problemId", problem);
  const footer = actions("Salvează");
  const dialog = document.querySelector("dialog");
  const form = dialog.querySelector("form");
  const rows = app.data.intervals || [];
  function validate(event) {
    if (event.submitter?.value !== "ok") return;
    draft.zone = draft.zone.trim();
    draft.shift = Number(draft.shift);
    for (const [key] of INTERVAL_NUMBERS) {
      const value = draft[key];
      draft[key] = value == null || value === "" ? null : nonnegative(value) ?? NaN;
    }
    for (const control of controls.values())
      if (control.getAttribute("aria-invalid") === "true") fieldError(control, "");
    const badInput = [...controls].find(([, control]) => control.validity.badInput);
    const error = badInput ? { field: badInput[0], message: "Completează o valoare validă." } : intervalError(draft, rows);
    if (!error) return;
    event.preventDefault();
    const control = controls.get(error.field);
    if (extra.contains(control)) extra.open = true;
    fieldError(control, error.message);
    control.focus({ preventScroll: true });
    control.scrollIntoView({ block: "nearest" });
  }
  form.noValidate = true;
  form.addEventListener("submit", validate);
  try {
    if (await openDialog(() => [
      el("h2", existing ? "Editează intervalul" : "Interval nou"),
      el("p", existing ? "Modificările se aplică la salvare." : "Ciornă locală · Fișa se înregistrează la salvare.", "formHelp"),
      fields, el("p", "0 indică zero bucăți. Lasă câmpul gol dacă cifra nu este disponibilă.", "formHelp"), extra, footer,
    ]) !== "ok") return;
    if (existing) Object.assign(existing, draft);
    else (app.data.intervals ||= []).push(draft);
    selection.date = draft.date;
    selection.shift = draft.shift;
    selection.zone = draft.zone;
    c.refresh();
  } finally {
    form.removeEventListener("submit", validate);
    form.noValidate = false;
  }
}

let selection, selectionNotebook;
export function productionView(c) {
  const context = c.key + "/" + (app.data.settings.zone || "");
  if (!selection || selectionNotebook !== app.data || selection.context !== context) {
    selectionNotebook = app.data;
    selection = { context, date: c.workDay, shift: c.shift, zone: app.data.settings.zone || "" };
  }
  const main = document.querySelector("main");
  const box = el("section", "", "card productionView");
  const list = el("div", "", "records");
  const filters = el("div", "", "recordFields");
  function filter(label, key, type, options) {
    filters.append(input(label, selection[key], (v) => {
      selection[key] = key === "shift" ? Number(v) : v;
      draw();
    }, type, options));
  }
  filter("Data de lucru", "date", "date");
  filter("Schimb", "shift", "select", ["1", "2", "3"]);
  filter("Zonă / linie", "zone", "text");
  const toolbar = el("div", "", "productionTools");
  const configuredZone = app.data.settings.zone;
  toolbar.append(configuredZone
    ? btn("Interval nou", () => editInterval(c, null, selection), "primary", "plus")
    : btn("Configurează zona", () => app.navigate("Setări", "settings-line", "zone"), "primary", "settings"),
    btn("Analiză", () => app.navigate("Analiză"), "", "chart"));
  if (!app.data.settings.scheduleConfirmed)
    toolbar.append(btn("Confirmă programul", () => app.navigate("Setări", "settings-schedule", "hours")));
  const header = el("div", "", "productionHead");
  header.append(el("h1", "Producție"), el("p", "Plan versus realizat", "formHelp"));
  box.append(header, filters, toolbar, list);
  main.append(box);
  function draw() {
    const rows = zoneIntervals(app.data, selection.date, selection.shift, selection.zone);
    list.replaceChildren();
    list.append(productionFigures(rows));
    if (!rows.length) {
      list.append(el("p", selection.zone.trim() ? "Date indisponibile pentru această selecție." : "Alege zona pentru a vedea intervalele.", "empty"));
      return;
    }
    const total = intervalTotals(rows);
    list.append(el("p", "Atingerea planului " + amount(total.planPct, "%") + " · rebut " + amount(total.scrapPct, "%") +
      " · reprelucrare " + amount(total.reworkPct, "%") + " · FPY " + amount(total.fpy, "%"), "formHelp"));
    list.append(el("h2", "Intervale înregistrate"));
    const recent = rows.slice(-6);
    if (recent.length > 1 && recent.some((row) => productionKpis(row).planPct !== null))
      list.append(bars(recent.map((row) => ({ label: row.start.slice(-5), value: productionKpis(row).planPct })),
        { ref: 100, unit: "%", label: "Atingerea planului în ultimele intervale raportate" }));
    for (const row of rows) {
      const k = productionKpis(row);
      const card = details(row.start.replace("T", " ") + " → " + row.end.slice(-5) + " · " + amount(k.planPct, "%"), "interval-" + row.id, "record intervalCard");
      card.append(el("p", "Plan " + amount(row.plan) + " · realizat " + amount(row.produced) + " · abatere " + amount(k.variance)),
        el("p", "Bune " + amount(row.good) + " · rebut " + amount(row.scrap) + " · reprelucrare " + amount(row.rework)),
        el("p", "Timp planificat " + amount(row.plannedTime, " min") + " · oprire " + amount(row.downtime, " min") + " · FPY " + amount(k.fpy, "%")),
        el("p", "Echipament: " + (row.equipment || noData) + " · cauză: " + (row.cause || noData)),
        el("p", "Acțiune: " + (row.action || noData)));
      const registry = problemsBlock(app.data);
      if (row.problemId && registry?.b.rows.some((r) => r.id === row.problemId))
        card.append(btn("Deschide problema", () => app.openPage(registry.p, "row-" + row.problemId)));
      card.append(btn("Editează", () => editInterval(c, row, selection)), btn("Șterge", () => c.remove(app.data.intervals, row), "danger"));
      list.append(card);
    }
  }
  draw();
}
