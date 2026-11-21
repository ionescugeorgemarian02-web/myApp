import { app } from "../state.js";
import { btn, details, el, input, validDate, fieldHint } from "../ui.js";
import { computeKpis, KPI_DEFINITIONS, kpiComparison, reportingRange } from "../quality.js";
import { nonnegative } from "../production.js";
import { fmt } from "../charts.js";

export function kpiView(c) {
  const view = el("section", "", "card productionView");
  const main = document.querySelector("main");
  main.append(view);
  const filters = el("div", "", "recordFields");
  const result = el("div", "", "records");
  let { from, to } = reportingRange(c.date, 7);
  let zone = app.data.settings.zone || "";
  filters.append(input("De la", from, (v) => { from = v; draw(); }, "date"),
    input("Până la", to, (v) => { to = v; draw(); }, "date"),
    input("Zonă pentru producție", zone, (v) => { zone = v; draw(); }));
  view.append(el("h1", "Indicatori operaționali"), filters,
    el("p", "Alege perioada și zona, apoi deschide categoria dorită. Verifică formula și sursa înainte de comparație. Registrele generale acoperă întregul caiet.", "formHelp"), result);
  function draw() {
    result.replaceChildren();
    if (!validDate(from) || !validDate(to) || from > to) {
      result.append(el("p", "Alege un interval cronologic valid.", "scheduleMessage invalid"));
      return;
    }
    const report = computeKpis(app.data, c, { from, to, zone });
    result.append(el("p", report.intervals + " intervale de producție raportate · " + (zone.trim() || "Zonă neconfigurată"), "formHelp"));
    const config = (app.data.settings.kpis ||= {});
    const groups = new Map();
    for (const [key, group, name, unit, formula, source] of KPI_DEFINITIONS) {
      if (!groups.has(group)) {
        const section = details(group, "kpi-group-" + group, "record intervalCard");
        groups.set(group, section);
        result.append(section);
      }
      const section = el("section", "", "kpiDefinition");
      const configuration = config[key] || { target: null, direction: "min", confirmed: false, reference: "" };
      const value = report.values[key];
      const status = el("p");
      const heading = el("h3", name + " · " + (value === null ? "Date indisponibile" : fmt(value) + " " + unit));
      const options = details("Prag și referință", "kpi-config-" + key);
      function redrawStatus() {
        status.textContent = configuration.target == null ? "Prag neconfigurat · De confirmat intern"
          : (configuration.confirmed ? "Prag marcat ca validat" : "Prag configurat · De confirmat intern") +
            (kpiComparison(value, configuration) ? " · " + kpiComparison(value, configuration) : "");
      }
      function save(update, reset = true) {
        if (reset) configuration.confirmed = false;
        Object.assign(configuration, update);
        config[key] = configuration;
        checkbox.checked = configuration.confirmed;
        checkbox.disabled = configuration.target == null;
        app.save();
        redrawStatus();
      }
      const target = input("Prag (" + unit + ")", configuration.target, (value) => {
        const candidate = Number(value);
        if (!targetControl.validity.badInput && (value === "" || Number.isFinite(candidate))) save({ target: value === "" ? null : candidate });
      }, "number");
      const targetControl = target.querySelector("input");
      targetControl.step = "any";
      const approval = input("Prag validat intern", configuration.confirmed, (confirmed) => save({ confirmed }, false), "checkbox");
      const checkbox = approval.querySelector("input");
      checkbox.disabled = configuration.target == null;
      options.append(fieldHint(target, "Ia valoarea în unitatea afișată. Exemplu «95» pentru un prag de 95%."), fieldHint(input("Comparație", configuration.direction === "max" ? "Maximum" : "Minimum",
        (direction) => save({ direction: direction === "max" || direction === "Maximum" ? "max" : "min" }),
        "select", ["Minimum", "Maximum"]), "Alege Minimum când urmărești să atingi sau să depășești pragul. Alege Maximum când trebuie să rămâi sub limită."),
        fieldHint(input("Referință locală (opțional)", configuration.reference, (reference) => save({ reference })),
          "Scrie documentul sau rolul care a confirmat regula."),
        fieldHint(approval, "Bifează după ce ai confirmat formula, pragul și direcția cu rolul responsabil."));
      redrawStatus();
      section.append(heading, el("p", formula + " · Sursă: " + source + "."), status, options);
      groups.get(group).append(section);
    }
    const equipment = details("Opriri pe echipament și cauză", "stop-groups", "record intervalCard");
    const grouped = new Map();
    for (const stop of report.stops) {
      const name = stop.equipment + " · " + (stop.cause || "Cauză nespecificată");
      const entry = grouped.get(name) || { count: 0, minutes: 0, missing: 0 };
      entry.count++;
      if (nonnegative(stop.minutes) === null) entry.missing++;
      else entry.minutes += stop.minutes;
      grouped.set(name, entry);
    }
    for (const [label, item] of grouped)
      equipment.append(el("p", label + " · " + item.count + " opriri · " + (item.missing ? "durată incompletă" : fmt(item.minutes) + " min")));
    const patterns = details("Defecte și evenimente repetate", "defect-groups", "record intervalCard");
    for (const [category, count] of report.defects)
      patterns.append(el("p", category + " · " + count + " probleme de calitate"));
    for (const entry of report.recurrence)
      patterns.append(el("p", entry.equipment + " · " + entry.count + " evenimente la același post / echipament"));
    if (!equipment.querySelector("p")) equipment.append(el("p", "Date indisponibile."));
    if (!patterns.querySelector("p")) patterns.append(el("p", "Date indisponibile."));
    result.append(equipment, patterns, el("p", "OEE, MTTR și MTBF sunt indisponibile până la validarea definițiilor și a datelor necesare.", "formHelp"));
  }
  draw();
}
