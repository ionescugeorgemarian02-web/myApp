import { el, input, btn, id, details, now, norm, ask, roDate, iconBtn } from "../ui.js";
import { app } from "../state.js";
import { download } from "../store.js";
export const column = (name, type = "text", options = []) => ({
  id: id(),
  name,
  type,
  options,
});
const types = {
  Text: "text",
  Număr: "number",
  Dată: "date",
  Bifă: "checkbox",
  "Listă de opțiuni": "select",
};
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
  if (b.type === "journal" && names.includes("schimb")) {
    sections = [
      ["Data și schimbul", (name) => ["data", "schimb"].includes(name)],
      ["Desfășurarea schimbului", (name) => name !== "de urmarit"],
      ["Pentru schimbul următor", () => true],
    ];
  } else if (names.includes("problema") && names.includes("stare")) {
    sections = [
      ["Problema și acțiunea", (name) => ["problema", "cauza (5 de ce)", "actiune"].includes(name)],
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
const longFields = new Set([
  "problema", "probleme", "cauza (5 de ce)", "actiune", "de urmarit",
  "observatii", "ce am promis", "ce il incurca", "ce as schimba / ce n-as schimba",
  "ce il motiveaza", "ce cere de la mine",
]);
function recordField(col, r, c, { classic = false, changed } = {}) {
  const name = norm(col.name);
  const value = r.values[col.id];
  let type = col.type;
  if (type === "text" && name === "telefon") type = "tel";
  if (!classic && type === "text" && longFields.has(name)) type = "area";
  const options = type === "select" ? ["", ...col.options.filter(Boolean)] : [];
  // O opțiune scoasă din configurare rămâne vizibilă în fișele deja completate.
  if (type === "select" && value && !options.includes(value)) options.push(value);
  const field = input(classic ? "" : col.name, value, (v) => {
    r.values[col.id] = v;
    c.save();
    changed?.();
  }, type, options);
  const control = field.lastElementChild;
  if (classic) control.setAttribute("aria-label", col.name);
  if (type === "select") control.options[0].text = "Alege…";
  if (type === "area") field.classList.add("wideField");
  if (type === "number") control.step = "any";
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
        grid.append(recordField(col, r, c, { changed: updateSummary }));
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
        td.append(recordField(col, r, c, { classic: true }));
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
