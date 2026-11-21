import { app } from "../state.js";
import { el, btn, details, ask, norm, icon, iconBtn } from "../ui.js";
import { page, GROUPS } from "../seed.js";
import { link } from "./today.js";
let query = "";
function tile(p) {
  let items = p.blocks.flatMap((b) => b.items || []),
    rows = p.blocks.reduce((n, b) => n + (b.rows?.length || 0), 0),
    b = btn("", () => app.openPage(p), "tile");
  b.append(
    el("span", p.emoji || "📄", "tileEmoji"),
    el("strong", p.title),
    el(
      "small",
      items.length
        ? items.filter((i) => i.checked).length + " din " + items.length + " bifate"
        : rows
          ? rows + (rows === 1 ? " înregistrare" : " înregistrări")
          : p.blocks.some((x) => x.type === "note" && x.text)
            ? "notiță"
            : "goală",
    ),
  );
  return b;
}
function results(q) {
  let out = el("div", "", "linkList");
  for (const p of app.data.pages) {
    let texts = [
      p.title,
      ...p.blocks.flatMap((b) => [
        b.title,
        b.text,
        ...(b.items || []).flatMap((i) => [i.title, i.notes, i.ready, i.details]),
        ...(b.rows || []).flatMap((r) => Object.values(r.values)),
      ]),
    ];
    let match = texts.find(
      (t) => t && typeof t !== "boolean" && norm(t).includes(norm(q)),
    );
    if (match)
      out.append(
        link(
          String(match).slice(0, 120),
          (p.emoji ? p.emoji + " " : "") + p.title + (p.archived ? " · arhivată" : ""),
          "chip",
          () => app.openPage(p),
        ),
      );
  }
  if (!out.childElementCount) out.append(el("p", "Niciun rezultat.", "empty"));
  return out;
}
export function pages() {
  const main = document.querySelector("main"),
    data = app.data;
  main.append(el("h1", "Pagini", "title"));
  // Căutare.
  let box = el("label", "", "searchBox"),
    q = el("input"),
    area = el("div");
  q.type = "search";
  q.placeholder = "Caută în tot caietul";
  q.setAttribute("aria-label", "Caută în tot caietul");
  q.value = query;
  box.append(icon("search"), q);
  main.append(box, area);
  const groups = [...GROUPS, ...new Set(data.pages.map((p) => p.group))].filter(
    (g, i, a) => a.indexOf(g) === i,
  );
  function draw() {
    area.replaceChildren();
    if (query.trim()) return area.append(results(query));
    for (let g of groups) {
      let list = data.pages.filter((p) => !p.archived && (p.group || GROUPS[3]) === g);
      if (!list.length) continue;
      area.append(el("h2", g, "groupTitle"));
      let grid = el("div", "", "tiles");
      list.forEach((p) => grid.append(tile(p)));
      area.append(grid);
    }
    area.append(
      btn(
        "Pagină nouă",
        async () => {
          let t = await ask("Pagină nouă", "", "Creează");
          if (t?.trim()) {
            let p = page(t.trim());
            data.pages.push(p);
            app.editing = p.id;
            app.refresh();
            app.openPage(p);
          }
        },
        "add wide",
        "plus",
      ),
    );
    if (data.templates.length) {
      area.append(el("h2", "Șabloane", "groupTitle"));
      let list = el("div", "", "linkList");
      for (let t of data.templates) {
        let row = el("div", "", "templateRow");
        row.append(
          btn(
            "Pagină nouă din „" + t.title + "”",
            () => {
              let p = app.clone(t);
              p.archived = false;
              data.pages.push(p);
              app.refresh();
              app.openPage(p);
            },
            "linkRow",
            "template",
          ),
          iconBtn("trash", "Șterge șablonul", () => app.remove(data.templates, t), "danger"),
        );
        list.append(row);
      }
      area.append(list);
    }
    let archived = data.pages.filter((p) => p.archived);
    if (archived.length) {
      let d = details("Pagini arhivate (" + archived.length + ")", "archived", "archivedBox");
      let grid = el("div", "", "tiles");
      archived.forEach((p) => grid.append(tile(p)));
      d.append(grid);
      area.append(d);
    }
  }
  q.oninput = () => {
    query = q.value;
    draw();
  };
  draw();
}
