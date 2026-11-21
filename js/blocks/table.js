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
      (col.type === "checkbox" && r.values[col.id] === true) ||
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
  for (const col of b.cols) {
    let d = details(col.name, "col-" + col.id, "colCfg");
    d.append(
      input("Nume", col.name, (v) => {
        col.name = v;
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
export function table(b, c) {
  let out = el("div");
  const journal = b.type === "journal";
  const add = btn(
    journal ? "Intrare nouă" : "Adaugă",
    () => {
      newRow(b, c);
      c.refresh();
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
  if (journal) out.append(add);
  const classic = b.classic && !journal;
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
    b.cols.forEach((col) => tr.append(el("th", col.name)));
    tr.append(el("th"));
    grid.append(tr);
    for (const r of rows) {
      let row = el("tr");
      for (const col of b.cols) {
        let td = el("td");
        td.append(
          input(
            "",
            r.values[col.id],
            (v) => {
              r.values[col.id] = v;
              c.save();
            },
            col.type,
            ["", ...col.options],
          ),
        );
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
    for (const r of rows) {
      let d = details(summaryOf(b, r, c), "row-" + r.id, "record");
      if (isClosed(b, r)) d.classList.add("closed");
      let body = el("div", "", "recBody");
      for (const col of b.cols)
        body.append(
          input(
            col.name,
            r.values[col.id],
            (v) => {
              r.values[col.id] = v;
              c.save();
              // Rezumatul rândului se actualizează pe măsură ce scrii.
              d.firstChild.replaceChildren(summaryOf(b, r, c));
            },
            col.type,
            ["", ...col.options],
          ),
        );
      let foot = el("div", "", "recFoot");
      if (journal && r.created)
        foot.append(
          el("small", "Creat " + new Date(r.created).toLocaleString("ro", { dateStyle: "short", timeStyle: "short" })),
        );
      foot.append(btn("Șterge", () => c.remove(b.rows, r), "danger small", "trash"));
      body.append(foot);
      d.append(body);
      list.append(d);
    }
    out.append(list);
  }
  if (!journal) out.append(add);
  return out;
}
