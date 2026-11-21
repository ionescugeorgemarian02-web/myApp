import { el, input, btn, id, details, now, norm } from "../ui.js";
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
export function newRow(b, c) {
  const values = {};
  for (let col of b.cols) {
    if (col.type === "date" && norm(col.name) === "data")
      values[col.id] = c.workDay;
    if (norm(col.name) === "schimb") values[col.id] = String(c.shift);
  }
  const r = { id: id(), created: now(), values };
  b.rows.push(r);
  return r;
}
const fileName = (t) =>
  (norm(t)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "tabel") +
  "-" +
  new Date().toISOString().slice(0, 10) +
  ".csv";
export function table(b, c) {
  let out = el("div"),
    settings = details("Configurează câmpurile", "cfg-" + b.id);
  for (const col of b.cols) {
    let d = details(col.name, "col-" + col.id);
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
    d.append(btn("Șterge câmpul", () => c.remove(b.cols, col)));
    settings.append(d);
  }
  settings.append(
    btn("+ Câmp", () => {
      let t = prompt("Numele câmpului");
      if (t?.trim()) {
        b.cols.push(column(t.trim()));
        c.refresh();
      }
    }),
  );
  settings.ontoggle = () => {
    if (!settings.open && settings.isConnected) c.render();
  };
  out.append(settings);
  const journal = b.type === "journal";
  const add = btn(journal ? "+ Intrare nouă" : "+ Adaugă rând", () => {
    newRow(b, c);
    c.refresh();
  });
  let tools = el("div", "", "tools");
  if (journal) tools.append(add);
  else
    tools.append(
      btn(b.classic ? "Vedere cartele" : "Vedere tabel", () => {
        b.classic = !b.classic;
        c.refresh();
      }),
    );
  tools.append(
    btn("Export CSV", () => {
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
    }),
  );
  out.append(tools);
  const classic = b.classic && !journal;
  let wrap = el("div", "", classic ? "scroll" : "");
  let grid = el(classic ? "table" : "div");
  if (classic) {
    let tr = el("tr");
    b.cols.forEach((col) => tr.append(el("th", col.name)));
    tr.append(el("th"));
    grid.append(tr);
  }
  // În jurnal, cele mai noi intrări sunt primele.
  const rows = journal ? [...b.rows].reverse() : b.rows;
  for (const r of rows) {
    let row = el(classic ? "tr" : "article", "", "record");
    if (!classic && isClosed(b, r)) row.classList.add("closed");
    if (journal && r.created)
      row.append(el("h3", new Date(r.created).toLocaleString("ro")));
    for (const col of b.cols) {
      let field = input(
        col.name,
        r.values[col.id],
        (v) => {
          r.values[col.id] = v;
          c.save();
        },
        col.type,
        ["", ...col.options],
      );
      if (classic) {
        let td = el("td");
        td.append(field);
        row.append(td);
      } else row.append(field);
    }
    let cell = el(classic ? "td" : "div");
    cell.append(
      btn("Șterge înregistrarea", () => c.remove(b.rows, r), "danger"),
    );
    row.append(cell);
    grid.append(row);
  }
  wrap.append(grid);
  if (!rows.length)
    wrap.replaceChildren(
      el("p", journal ? "Nicio intrare încă." : "Niciun rând încă.", "empty"),
    );
  out.append(wrap);
  if (!journal) out.append(add);
  return out;
}
