import { HANDOVER_FIELDS, PROBLEM_FIELDS, closureError, handoverStatus, problemMatches } from "../operations.js";
import { csvCell, nonnegative, productionKpis } from "../production.js";
import { el, input, btn, id, details, now, norm, ask, roDate, iconBtn, toast, confirmShare } from "../ui.js";
import { app } from "../state.js";
import { download } from "../store.js";
import { share } from "../logic.js";
import { isClosed, rowLabel, column, trackLifecycle, colByKey } from "../records.js";
import { equipmentList } from "../metrics.js";
export { isClosed, rowLabel, column };
const types = {
  Text: "text",
  Număr: "number",
  Dată: "date",
  Bifă: "checkbox",
  "Listă de opțiuni": "select",
};
// Rând nou cu data zilei de lucru și schimbul curent completate automat.
// Rândul nou se deschide imediat pentru completare.
export function newRow(b, c) {
  const values = {};
  for (let col of b.cols) {
    if (col.type === "date" && norm(col.name) === "data")
      values[col.id] = c.workDay;
    if (norm(col.name) === "schimb") values[col.id] = String(c.shift);
    if (col.type === "select" && norm(col.name) === "stare") {
      const initial = col.options.find((value) => norm(value) === "deschis");
      if (initial) values[col.id] = initial;
    }
  }
  const r = { id: id(), created: now(), values };
  b.rows.push(r);
  app.open.add("row-" + r.id);
  return r;
}
const fileName = (t) =>
  (norm(t)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "tabel") +
  "-" +
  new Date().toISOString().slice(0, 10) +
  ".csv";
function exportCsv(b) {
  let rows = [
    b.cols.map((x) => x.name),
    ...b.rows.map((r) => b.cols.map((x) => r.values[x.id])),
  ];
  if (app.training) rows.unshift(["INSTRUIRE · DATE FICTIVE"]);
  download(
    fileName((app.training ? "INSTRUIRE-" : "") + b.title),
    "﻿" + rows.map((r) => r.map(csvCell).join(";")).join("\r\n"),
    "text/csv;charset=utf-8",
  );
}
// „Plan 95% · Rebut 1,2% · 40 min oprire” pentru fișa de predare.
export function shiftFigures(b, r) {
  const v = (key) => {
    const col = b.cols.find((c) => c.key === key);
    return col ? nonnegative(r.values[col.id]) : null;
  };
  const fmt = (x) => (Math.round(x * 10) / 10).toLocaleString("ro");
  const out = [];
  const plan = v("plan"), produced = v("produced"), scrap = v("scrap"), down = v("downtime");
  const kpis = productionKpis({ plan, produced, scrap, downtime: down });
  if (kpis.planPct != null) out.push("Plan " + fmt(kpis.planPct) + "%");
  if (kpis.scrapPct != null) out.push("Rebut " + fmt(kpis.scrapPct) + "%");
  if (kpis.downtime != null) out.push(fmt(kpis.downtime) + " min oprire");
  return out.join(" · ");
}
// Rezumatul unui rând închis: titlu + etichete (dată, stare, bifă).
function summaryOf(b, r, c) {
  const journal = b.type === "journal";
  let title = el("span", "", "recTitle"),
    meta = el("span", "", "meta");
  if (journal) {
    let date = b.cols.find((x) => x.type === "date" && r.values[x.id]);
    let shift = b.cols.find((x) => norm(x.name) === "schimb" && r.values[x.id]);
    title.textContent =
      (date
        ? roDate(r.values[date.id], { weekday: "short", day: "numeric", month: "short" })
        : r.created
          ? new Date(r.created).toLocaleDateString("ro")
          : "Intrare") + (shift ? " · Schimb " + r.values[shift.id] : "");
    const figures = shiftFigures(b, r);
    if (figures) meta.append(el("span", figures, "snippet figures"));
    let first = b.cols.find(
      (x) => x.type === "text" && x !== shift && r.values[x.id],
    );
    if (first) meta.append(el("span", r.values[first.id], "snippet"));
  } else {
    let label = rowLabel(b, r);
    title.textContent = label === "Rând fără text" ? "Rând nou – necompletat" : label;
    for (let col of b.cols) {
      let v = r.values[col.id];
      if (v === "" || v == null || v === false) continue;
      if (col.type === "select")
        meta.append(
          el(
            "span",
            v,
            "chip" + (["inchis", "rezolvat"].includes(norm(v)) ? " done" : ""),
          ),
        );
      else if (col.type === "date") {
        let late = norm(col.name).includes("termen") && !isClosed(b, r);
        meta.append(
          el(
            "span",
            roDate(v),
            "chip" + (late && v < c.date ? " late" : late && v === c.date ? " today" : ""),
          ),
        );
      } else if (col.type === "checkbox") meta.append(el("span", "✓ " + col.name, "chip done"));
    }
  }
  let wrap = el("span", "", "recHead");
  wrap.append(title);
  if (meta.childElementCount) wrap.append(meta);
  return wrap;
}
function fieldsConfig(b, c) {
  let settings = details("Configurează câmpurile", "cfg-" + b.id, "config");
  let changed = false;
  settings.addEventListener("toggle", () => {
    if (!settings.open && changed) c.refresh();
  });
  for (const col of b.cols) {
    let d = details(col.name, "col-" + col.id, "colCfg");
    const managedKey = (colByKey(b, "prepared") || colByKey(b, "problem")) &&
      (col.key || ["actiune", "stare", "data", "schimb"].includes(norm(col.name)));
    if (managedKey) {
      d.append(el("p", "Câmp folosit de fluxul operațional.", "formHelp"));
      settings.append(d);
      continue;
    }
    const affectsHandover = colByKey(b, "prepared") && b.rows.some((row) =>
      row.values[colByKey(b, "prepared").id] === true &&
      handoverStatus({ ...b, cols: b.cols.filter((candidate) => candidate !== col) }, row, "prepared"));
    d.append(
      input("Nume", col.name, (v) => {
        col.name = v;
        d.firstElementChild.textContent = v;
        changed = true;
        c.save();
      }),
      ...(!affectsHandover ? [input(
        "Tip",
        Object.keys(types).find((k) => types[k] === col.type),
        (v) => {
          col.type = types[v];
          c.refresh();
        },
        "select",
        Object.keys(types),
      )] : []),
    );
    if (col.type === "select")
      d.append(
        input("Opțiuni separate prin |", col.options.join("|"), (v) => {
          col.options = v.split("|").map((s) => s.trim());
          changed = true;
          c.save();
        }),
      );
    if (!affectsHandover)
      d.append(btn("Șterge câmpul", () => c.remove(b.cols, col), "danger", "trash"));
    settings.append(d);
  }
  settings.append(
    btn(
      "Câmp nou",
      async () => {
        let t = await ask("Nume câmp nou", "", "Adaugă");
        if (t?.trim()) {
          b.cols.push(column(t.trim()));
          c.refresh();
        }
      },
      "add",
      "plus",
    ),
  );
  return settings;
}
// Păstrăm ordinea coloanelor personalizate. În fișele uzuale, separăm
// câmpurile descriptive de cele folosite pentru urmărirea acțiunilor.
function fieldGroups(b) {
  const names = b.cols.map((col) => norm(col.name));
  let sections;
  const keyed = new Map(b.cols.map((col) => [norm(col.name), col.key]));
  if (b.type === "journal" && names.includes("schimb")) {
    sections = [
      ["Data și schimbul", (name) => ["data", "schimb"].includes(name)],
      ["Cifrele schimbului", (name) => SHIFT_KEYS.has(keyed.get(name))],
      ["Verificarea predării", (name) => ["prepared", "received"].includes(keyed.get(name))],
      ["Pentru schimbul următor", (name) => ["handoverActions", "handoverEscalation", "nextChecks"].includes(keyed.get(name)) || name.includes("schimbul urmator") || name === "de urmarit"],
      ["Desfășurarea schimbului", () => true],
    ];
  } else if (b.cols.some((col) => col.key === "safetyType")) {
    sections = [
      ["Evenimentul", (name) => ["data", "schimb", "tip", "ce s-a intamplat", "post / masina", "gravitate"].includes(name)],
      ["Ce faci", () => true],
    ];
  } else if (names.includes("problema") && names.includes("stare")) {
    sections = [
      ["Problema și acțiunea", (name) => ["problema", "post / masina", "cauza (5 de ce)", "actiune"].includes(name)],
      ["Impact și măsură imediată", (name) => ["impact", "urgency", "containment", "escalation"].includes(keyed.get(name))],
      ["Urmărirea și închiderea", () => true],
    ];
  } else if (names.includes("ce am promis")) {
    sections = [
      ["Discuția", (name) => !["ce am promis", "rezolvat"].includes(name) && !name.includes("termen")],
      ["Ce urmează", () => true],
    ];
  } else return [["", b.cols]];
  const groups = sections.map(([title]) => [title, []]);
  for (const col of b.cols) {
    const index = sections.findIndex(([, matches]) => matches(norm(col.name)));
    groups[index][1].push(col);
  }
  if (b.type === "journal" && names.includes("schimb"))
    groups.sort(([a], [b]) => {
      const order = ["Data și schimbul", "Cifrele schimbului", "Desfășurarea schimbului", "Pentru schimbul următor", "Verificarea predării"];
      return order.indexOf(a) - order.indexOf(b);
    });
  return groups.filter(([, cols]) => cols.length);
}
const SHIFT_KEYS = new Set(["plan", "produced", "scrap", "downtime", "planned", "present"]);
const longFields = new Set([
  "ce s-a intamplat", "actiune imediata", "decizia", "context si variante",
  "problema", "probleme", "cauza (5 de ce)", "actiune", "de urmarit",
  "observatii", "ce am promis", "ce il incurca", "ce as schimba / ce n-as schimba",
  "ce il motiveaza", "ce cere de la mine",
]);
function recordField(b, col, r, c, { classic = false, changed } = {}) {
  const name = norm(col.name);
  const value = r.values[col.id];
  let type = col.type;
  if (type === "text" && name === "telefon") type = "tel";
  if (!classic && type === "text" && (longFields.has(name) ||
      [...HANDOVER_FIELDS, ...PROBLEM_FIELDS].some(([key]) => key === col.key && key !== "handoverZone") ||
      /^(situatia productiei|echipamente oprite|lipsuri de personal|prioritati pentru schimbul)/.test(name))) type = "area";
  // „Post / mașină” folosește lista din Setări → Linia mea.
  const source = col.key === "equipment" ? equipmentList(app.data) : col.options;
  const options = type === "select" ? ["", ...source.filter(Boolean)] : [];
  // O opțiune scoasă din configurare rămâne vizibilă în fișele deja completate.
  if (type === "select" && value && !options.includes(value)) options.push(value);
  let control;
  const field = input(classic ? "" : col.name, value, (v) => {
    const wasClosed = isClosed(b, r);
    const candidate = { ...r, values: { ...r.values, [col.id]: v } };
    const closed = isClosed(b, candidate);
    let error = "";
    if (control.validity.badInput || ((SHIFT_KEYS.has(col.key) || col.key === "stopMinutes") && v !== "" && nonnegative(v) === null))
      error = "Introdu o valoare numerică pozitivă sau zero.";
    if (!error && v === true && ["prepared", "received"].includes(col.key))
      error = handoverStatus(b, candidate, col.key);
    if (!error && colByKey(b, "problem") && closed && (!wasClosed || r.closedAt && r.verifiedClosure))
      error = closureError(b, candidate);
    if (error) {
      if (type === "checkbox") control.checked = Boolean(r.values[col.id]);
      else if (type === "select") control.value = r.values[col.id] ?? "";
      else {
        control.setCustomValidity(error);
        control.reportValidity();
      }
      toast(error);
      return;
    }
    control.setCustomValidity("");
    r.values[col.id] = v;
    if (colByKey(b, "prepared") && col.key !== "received") {
      for (const key of (col.key === "prepared" ? ["received"] : ["prepared", "received"])) {
        if (col.key === "prepared" && v === true) break;
        const checkCol = colByKey(b, key);
        if (!checkCol || r.values[checkCol.id] !== true) continue;
        r.values[checkCol.id] = false;
        const form = field.closest(".recBody");
        const check = [...(form?.querySelectorAll("input[data-handover-check]") || [])]
          .find((input) => input.dataset.handoverCheck === key);
        if (check) check.checked = false;
      }
    }
    if (colByKey(b, "problem") && closed && !wasClosed) r.verifiedClosure = true;
    if (wasClosed && !closed) delete r.verifiedClosure;
    trackLifecycle(b, r, wasClosed, now());
    c.save();
    changed?.();
    if (wasClosed !== isClosed(b, r)) c.updateDeadlines?.();
  }, type, options);
  if (col.key === "equipment" && options.length === 1 && !classic) {
    const setup = btn("Adaugă posturile liniei", () => {
      app.open.add("settings-line");
      location.hash = "Setări";
    }, "fieldLink");
    field.append(setup);
  }
  control = field.querySelector("input, textarea, select");
  if (["prepared", "received"].includes(col.key)) control.dataset.handoverCheck = col.key;
  if (type === "number") control.addEventListener("blur", () => {
    if (!control.validationMessage) return;
    control.value = r.values[col.id] ?? "";
    control.setCustomValidity("");
  });
  if (classic) control.setAttribute("aria-label", col.name);
  if (type === "select") control.options[0].text = "Alege…";
  if (type === "area") field.classList.add("wideField");
  if (type === "number") {
    control.step = "any";
    control.min = "0";
    control.inputMode = "decimal";
  }
  return field;
}
function record(b, r, c, groups) {
  const d = details(summaryOf(b, r, c), "row-" + r.id, "record");
  d.classList.toggle("closed", isClosed(b, r));
  const summary = d.firstElementChild;
  function updateSummary() {
    c.onProblemEdit?.();
    summary.replaceChildren(summaryOf(b, r, c));
    d.classList.toggle("closed", isClosed(b, r));
  }
  function populate() {
    if (!d.open || d.children.length > 1) return;
    const body = el("div", "", "recBody");
    for (const [name, cols] of groups) {
      const group = el(name ? "fieldset" : "div", "", "formGroup");
      if (name) group.append(el("legend", name));
      const grid = el("div", "", name === "Data și schimbul" ? "recordFields shiftFields" : "recordFields");
      for (const col of cols) {
        grid.append(recordField(b, col, r, c, { changed: updateSummary }));
      }
      group.append(grid);
      body.append(group);
    }
    if (b.type === "journal" && r.created) {
      const date = new Date(r.created);
      if (Number.isFinite(date.getTime()))
        body.append(el("small", "Creată pe " + date.toLocaleString("ro", {
          dateStyle: "short", timeStyle: "short",
        }), "createdAt"));
    }
    const foot = el("div", "", "recFoot");
    foot.append(
      btn("Închide fișa", () => {
        d.open = false;
        summary.focus();
      }, "small", "check"),
      btn("Șterge", () => c.remove(b.rows, r), "danger small", "trash"),
    );
    if (colByKey(b, "prepared")) {
      body.prepend(el("p", "Fișă personală de sprijin. Revizuiește situația, acțiunile și riscurile înainte să confirmi predarea sau preluarea.", "formHelp"));
      foot.prepend(btn("Rezumatul acestei fișe", async () => {
        const text = [b.title, ...b.cols.map((col) => {
          const value = r.values[col.id];
          return col.name + " · " + (value === true ? "Verificată" : col.type === "checkbox" ? "În așteptare" : value === "" || value == null ? "Date indisponibile" : value);
        })].join("\n");
        if (await confirmShare(text, "Rezumat predare–primire")) await share(text);
      }, "small"));
    }
    if (colByKey(b, "problem")) {
      const guide = details("Ghid 5 Why și 8D");
      guide.append(el("p", "5 Why · Pornește de la abaterea observată. Întreabă de ce, verifică fiecare răspuns la post și oprește-te la o cauză demonstrabilă, asupra căreia poți interveni."),
        el("p", "8D · Formează echipa, definește problema, limitează impactul, verifică de ce a apărut și de ce a trecut de control, alege și validează corecția, aplic-o, previno reapariția și documentează închiderea. Folosește 8D complet când este justificat sau cerut local."));
      body.prepend(guide);
    }
    body.append(foot);
    d.append(body);
  }
  d.addEventListener("toggle", populate);
  populate();
  return d;
}
export function table(b, c) {
  let out = el("div");
  const journal = b.type === "journal";
  const add = btn(
    journal ? "Intrare nouă" : "Adaugă rând",
    () => {
      const r = newRow(b, c);
      c.refresh();
      const target = document.querySelector(`[data-key="row-${CSS.escape(r.id)}"]`);
      (target?.querySelector("summary, input, select") || target)?.focus({ preventScroll: true });
      target?.scrollIntoView({ block: "start" });
    },
    "add",
    "plus",
  );
  if (c.editing) {
    let tools = el("div", "", "toolbar");
    if (!journal && !colByKey(b, "problem"))
      tools.append(
        btn(
          b.classic ? "Vedere listă" : "Vedere tabel",
          () => {
            b.classic = !b.classic;
            c.refresh();
          },
          "small",
          b.classic ? "cards" : "table",
        ),
      );
    tools.append(btn("Export CSV", () => exportCsv(b), "small", "download"));
    out.append(tools, fieldsConfig(b, c));
  }
  const managed = Boolean(colByKey(b, "problem"));
  const classic = b.classic && !journal && !managed;
  const help = classic ? "Glisează tabelul lateral pentru a vedea toate coloanele."
    : journal ? "Atinge o intrare pentru a o completa. Modificările se salvează automat."
      : "Deschide o fișă pentru a completa câmpurile. Modificările se salvează automat.";
  out.append(el("p", help, "formHelp"), add);
  // În jurnal, cele mai noi intrări sunt primele.
  const rows = journal ? [...b.rows].reverse() : b.rows;
  if (!rows.length)
    out.append(
      el("p", journal ? "Nicio intrare încă." : "Niciun rând încă.", "empty"),
    );
  else if (classic) {
    let wrap = el("div", "", "scroll"),
      grid = el("table"),
      tr = el("tr");
    b.cols.forEach((col) => {
      const th = el("th", col.name);
      th.scope = "col";
      tr.append(th);
    });
    tr.append(el("th"));
    grid.append(tr);
    for (const r of rows) {
      let row = el("tr");
      row.dataset.key = "row-" + r.id;
      row.tabIndex = -1;
      for (const col of b.cols) {
        let td = el("td");
        td.append(recordField(b, col, r, c, { classic: true }));
        row.append(td);
      }
      let td = el("td");
      td.append(iconBtn("trash", "Șterge rândul", () => c.remove(b.rows, r), "danger"));
      row.append(td);
      grid.append(row);
    }
    wrap.append(grid);
    out.append(wrap);
  } else {
    let list = el("div", "", "records");
    const groups = fieldGroups(b);
    let update;
    if (managed) {
      let query = "", filter = "Toate";
      const empty = el("p", "Nicio problemă pentru acest filtru.", "empty");
      empty.hidden = true;
      update = () => {
        let visible = 0;
        for (const [index, row] of rows.entries()) {
          const show = problemMatches(b, row, query, filter, c.date);
          list.children[index].hidden = !show;
          if (show) visible++;
        }
        empty.hidden = visible !== 0;
      };
      const filters = el("div", "", "recordFields");
      filters.append(input("Caută probleme și acțiuni", "", (value) => { query = value; update(); }, "search"),
        input("Filtrează", "Toate", (value) => { filter = value; update(); }, "select",
          ["Toate", "Deschise", "Închise", "Restante", "Urgente / critice"]));
      out.append(filters, empty);
    }
    for (const r of rows) list.append(record(b, r, { ...c, onProblemEdit: update }, groups));
    out.append(list);
  }

  return out;
}
