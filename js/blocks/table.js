import { el, input, btn, id, details, now, norm, ask, roDate, iconBtn } from "../ui.js";
import { app } from "../state.js";
import { download } from "../store.js";
import { isClosed, rowLabel, column, trackLifecycle, num } from "../records.js";
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
  let cells = (v) => '"' + String(v ?? "").replaceAll('"', '""') + '"';
  let rows = [
    b.cols.map((x) => x.name),
    ...b.rows.map((r) => b.cols.map((x) => r.values[x.id])),
  ];
  download(
    fileName(b.title),
    "﻿" + rows.map((r) => r.map(cells).join(";")).join("\r\n"),
    "text/csv;charset=utf-8",
  );
}
// „Plan 95% · Rebut 1,2% · 40 min oprire” pentru fișa de predare.
export function shiftFigures(b, r) {
  const v = (key) => {
    const col = b.cols.find((c) => c.key === key);
    return col ? num(r.values[col.id]) : null;
  };
  const fmt = (x) => (Math.round(x * 10) / 10).toLocaleString("ro");
  const out = [];
  const plan = v("plan"), produced = v("produced"), scrap = v("scrap"), down = v("downtime");
  if (plan > 0 && produced != null) out.push("Plan " + fmt((produced / plan) * 100) + "%");
  if (produced > 0 && scrap != null) out.push("Rebut " + fmt((scrap / produced) * 100) + "%");
  if (down != null) out.push(fmt(down) + " min oprire");
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
    d.append(
      input("Nume", col.name, (v) => {
        col.name = v;
        d.firstElementChild.textContent = v;
        changed = true;
        c.save();
      }),
      input(
        "Tip",
        Object.keys(types).find((k) => types[k] === col.type),
        (v) => {
          col.type = types[v];
          c.refresh();
        },
        "select",
        Object.keys(types),
      ),
    );
    if (col.type === "select")
      d.append(
        input("Opțiuni separate prin |", col.options.join("|"), (v) => {
          col.options = v.split("|").map((s) => s.trim());
          changed = true;
          c.save();
        }),
      );
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
      ["Desfășurarea schimbului", (name) => name !== "de urmarit"],
      ["Pentru schimbul următor", () => true],
    ];
  } else if (b.cols.some((col) => col.key === "safetyType")) {
    sections = [
      ["Evenimentul", (name) => ["data", "schimb", "tip", "ce s-a intamplat", "post / masina", "gravitate"].includes(name)],
      ["Ce faci", () => true],
    ];
  } else if (names.includes("problema") && names.includes("stare")) {
    sections = [
      ["Problema și acțiunea", (name) => ["problema", "post / masina", "cauza (5 de ce)", "actiune"].includes(name)],
      ["Urmărirea problemei", () => true],
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
  if (!classic && type === "text" && longFields.has(name)) type = "area";
  // „Post / mașină” folosește lista din Setări → Linia mea.
  const source = col.key === "equipment" ? equipmentList(app.data) : col.options;
  const options = type === "select" ? ["", ...source.filter(Boolean)] : [];
  // O opțiune scoasă din configurare rămâne vizibilă în fișele deja completate.
  if (type === "select" && value && !options.includes(value)) options.push(value);
  const field = input(classic ? "" : col.name, value, (v) => {
    const wasClosed = isClosed(b, r);
    r.values[col.id] = v;
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
  const control = field.lastElementChild;
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
      const target = document.querySelector(`[data-key="row-${r.id}"]`);
      (target?.querySelector("summary, input, select") || target)?.focus({ preventScroll: true });
      target?.scrollIntoView({ block: "start" });
    },
    "add",
    "plus",
  );
  if (c.editing) {
    let tools = el("div", "", "toolbar");
    if (!journal)
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
  const classic = b.classic && !journal;
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
    for (const r of rows) list.append(record(b, r, c, groups));
    out.append(list);
  }

  return out;
}
