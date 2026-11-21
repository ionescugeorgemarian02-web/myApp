import { app } from "../state.js";
import { actions, btn, details, el, id, input, norm, openDialog } from "../ui.js";
import { INTERVAL_NUMBERS, intervalTotals, validInterval } from "../operations.js";
import { nonnegative, productionKpis } from "../production.js";
import { problemsBlock } from "../metrics.js";
import { rowLabel } from "../records.js";
import { fmt } from "../charts.js";

export const noData = "Date indisponibile";
const amount = (number, unit = "") => number == null ? noData : fmt(number) + unit;
export const zoneIntervals = (data, date, shift, zone) => (data.intervals || [])
  .filter((r) => r.date === date && r.shift === shift && norm(r.zone) === norm(zone))
  .sort((a, b) => a.start.localeCompare(b.start));

async function editInterval(c, existing, selection) {
  const initial = existing || {
    id: id(), date: selection.date, shift: selection.shift, zone: selection.zone,
    start: "", end: "", cause: "", action: "", equipment: "", problemId: "",
  };
  const draft = { ...initial };
  const fields = el("div", "", "recordFields intervalFields");
  const errors = el("p", "", "scheduleMessage invalid");
  errors.setAttribute("role", "alert");
  function field(key, label, type = "text", options = []) {
    fields.append(input(label, draft[key], (v) => { draft[key] = v; }, type, options));
    return fields.lastElementChild.querySelector("input, select, textarea");
  }
  field("zone", "Zonă / linie").required = true;
  field("date", "Data de lucru", "date").required = true;
  field("shift", "Schimb", "select", ["1", "2", "3"]);
  field("start", "Început", "datetime-local").required = true;
  field("end", "Sfârșit", "datetime-local").required = true;
  for (const [key, label] of INTERVAL_NUMBERS) {
    const control = field(key, label, "number");
    control.min = "0";
    control.step = ["plannedTime", "downtime"].includes(key) ? "any" : "1";
  }
  field("equipment", "Echipament afectat");
  field("cause", "Cauză declarată", "area");
  field("action", "Acțiune corectivă", "area");
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
  fields.append(label);
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
    errors.textContent = validInterval(draft, rows);
    if (errors.textContent) event.preventDefault();
  }
  form.addEventListener("submit", validate);
  try {
    if (await openDialog(() => [el("h2", existing ? "Editează intervalul" : "Interval nou"), fields, errors, footer]) !== "ok") return;
    if (existing) Object.assign(existing, draft);
    else (app.data.intervals ||= []).push(draft);
    selection.date = draft.date;
    selection.shift = draft.shift;
    selection.zone = draft.zone;
    c.refresh();
  } finally {
    form.removeEventListener("submit", validate);
  }
}

let selection;
export function productionView(c) {
  selection ||= { date: c.workDay, shift: c.shift, zone: app.data.settings.zone || "" };
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
  const add = btn("Interval nou", () => editInterval(c, null, selection), "primary", "plus");
  box.append(el("h1", "Plan versus realizat"), filters, add, list);
  main.append(box);
  function draw() {
    const rows = zoneIntervals(app.data, selection.date, selection.shift, selection.zone);
    list.replaceChildren();
    if (!rows.length) {
      list.append(el("p", selection.zone.trim() ? "Date indisponibile pentru această selecție." : "Alege zona pentru a vedea intervalele.", "empty"));
      return;
    }
    const total = intervalTotals(rows);
    list.append(el("h2", "Total pentru " + rows.length + " intervale raportate"),
      el("p", "Plan " + amount(total.plan) + " · realizat " + amount(total.produced) + " · abatere " + amount(total.variance) + " · atingere " + amount(total.planPct, "%")),
      el("p", "Rebut " + amount(total.scrapPct, "%") + " · reprelucrare " + amount(total.reworkPct, "%") + " · FPY " + amount(total.fpy, "%")),
      el("p", "Totalurile cer câmpul completat în fiecare interval afișat. FPY folosește piesele bune din prima trecere și totalul comparabil introdus.", "formHelp"));
    for (const row of rows) {
      const k = productionKpis(row);
      const card = details(row.start.replace("T", " ") + " → " + row.end.slice(-5) + " · " + amount(k.planPct, "%"), "interval-" + row.id, "record intervalCard");
      card.append(el("p", "Plan " + amount(row.plan) + " · realizat " + amount(row.produced) + " · abatere " + amount(k.variance)),
        el("p", "Bune " + amount(row.good) + " · rebut " + amount(row.scrap) + " · oprire " + amount(row.downtime, " min")),
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
