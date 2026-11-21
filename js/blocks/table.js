import { el, input, btn, id, details, now } from "../ui.js";
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
export function table(b, c) {
  let out = el("div"),
    settings = details("Configurează câmpurile");
  for (const col of b.cols) {
    let d = details(col.name);
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
      if (t) {
        b.cols.push(column(t));
        c.refresh();
      }
    }),
  );
  settings.ontoggle = () => {
    if (!settings.open && settings.isConnected) c.render();
  };
  out.append(settings);
  if (b.type === "table")
    out.append(
      btn(b.classic ? "Vedere cartele" : "Vedere tabel", () => {
        b.classic = !b.classic;
        c.refresh();
      }),
      btn("Export CSV", () => {
        let cells = (v) => '"' + String(v ?? "").replaceAll('"', '""') + '"';
        let rows = [
          b.cols.map((x) => x.name),
          ...b.rows.map((r) => b.cols.map((x) => r.values[x.id])),
        ];
        download(
          "tabel.csv",
          "\ufeff" + rows.map((r) => r.map(cells).join(";")).join("\r\n"),
          "text/csv;charset=utf-8",
        );
      }),
    );
  let wrap = el("div", "", b.classic ? "scroll" : "");
  let grid = el(b.classic ? "table" : "div");
  if (b.classic) {
    let tr = el("tr");
    b.cols.forEach((col) => tr.append(el("th", col.name)));
    grid.append(tr);
  }
  for (const r of b.rows) {
    let row = el(b.classic ? "tr" : "article", "", "record");
    if (b.type === "journal")
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
      if (b.classic) {
        let td = el("td");
        td.append(field);
        row.append(td);
      } else row.append(field);
    }
    let cell = el(b.classic ? "td" : "div");
    cell.append(btn("Șterge înregistrarea", () => c.remove(b.rows, r)));
    row.append(cell);
    grid.append(row);
  }
  wrap.append(grid);
  out.append(
    wrap,
    btn(b.type === "journal" ? "+ Intrare nouă" : "+ Adaugă rând", () => {
      const values = {};
      for (let col of b.cols) {
        if (col.name === "Data" && col.type === "date") values[col.id] = c.date;
        if (col.name === "Schimb") values[col.id] = String(c.shift);
      }
      b.rows.push({ id: id(), created: now(), values });
      c.refresh();
    }),
  );
  return out;
}
