import { app } from "../state.js";
import { el, btn, details, ask, norm, icon, iconBtn } from "../ui.js";
import { page, GROUPS } from "../seed.js";
import { link } from "./today.js";
import { noteEditor } from "./notes.js";
import { takeLegacyPageNotes } from "../notes.js";
let query = "";
function tile(p) {
  let items = p.blocks.filter((b) => b.type === "checklist" || b.type === "routine").flatMap((b) => b.items),
    rows = p.blocks.reduce((n, b) => n + (b.rows?.length || 0), 0),
    b = btn("", () => app.openPage(p), "tile");
  const marker = el("span", p.emoji || "📄", "tileEmoji");
  marker.setAttribute("aria-hidden", "true");
  const name = el("span", "", "directoryName");
  name.append(el("strong", p.title));
  if (items.length) name.append(el("small", items.filter((i) => i.checked).length + " din " + items.length + " bifate"));
  else if (rows) name.append(el("small", rows + (rows === 1 ? " înregistrare" : " înregistrări")));
  b.append(marker, name, icon("chevron"));
  return b;
}
// Indexul se construiește la prima căutare și se reface după revenirea dintr-o pagină.
function searchIndex(pages) {
  const entries = [];
  function add(p, values, key, note) {
    const fields = values.filter((v) => (typeof v === "string" && v.trim()) || typeof v === "number")
      .map((v) => ({ text: String(v), normalized: norm(v) }));
    if (fields.length) entries.push({ p, fields, key, note });
  }
  for (const p of pages) {
    add(p, [p.title]);
    for (const b of p.blocks) {
      add(p, [b.title === p.title ? "" : b.title, b.text], "block-" + b.id);
      for (const i of b.items || []) add(p, [i.title, i.notes, i.ready, i.details], "item-" + i.id);
      for (const r of b.rows || []) add(p, b.cols.map((col) => r.values[col.id]), "row-" + r.id);
    }
  }
  for (const note of app.data.notes) add(null, [note.text], null, note);
  return entries;
}
function results(entries, query) {
  const out = el("div", "", "linkList searchResults");
  const needle = norm(query);
  const matches = [];
  for (const entry of entries) {
    const field = entry.fields.find((f) => f.normalized.includes(needle));
    if (field) matches.push({ ...entry, text: field.text });
  }
  if (!matches.length) out.append(el("p", "Niciun rezultat. Încearcă un alt cuvânt.", "empty"));
  let shown = 0;
  function more() {
    const next = matches.slice(shown, shown + 20);
    for (const { p, key, text, note } of next) {
      if (note) out.append(link(text.slice(0, 140), "Notițe", "chip", () => noteEditor(note.source, note)));
      else out.append(link(text.slice(0, 140), p.title + (p.archived ? " · arhivată" : ""), "chip", () => app.openPage(p, key)));
    }
    shown += next.length;
    if (shown < matches.length) {
      const button = btn("Mai multe rezultate", () => { button.remove(); more(); }, "add");
      out.append(button);
    }
  }
  more();
  return out;
}
function directoryGroup(title, count, key) {
  const section = details([icon("folder"), el("strong", title), el("small", String(count))],
    key, "directoryGroup");
  section.name = "directory-groups";
  return section;
}

export function pages() {
  const main = document.querySelector("main"),
    data = app.data;
  const create = btn("Pagină nouă", async () => {
    const title = await ask("Pagină nouă", "", "Creează");
    if (!title?.trim()) return;
    const p = page(title.trim());
    data.pages.push(p);
    app.editing = p.id;
    app.save();
    app.openPage(p);
  }, "primary small", "plus");
  const heading = el("div", "", "directoryHead");
  heading.append(el("h1", "Caiet", "title"), create);
  main.append(heading, btn("Leadership și comunicare", () => (location.hash = "Leadership"), "todayMore", "chat"));
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
  const groups = new Map(GROUPS.map((g) => [g, []]));
  for (const p of data.pages) {
    if (p.archived) continue;
    const group = p.group || GROUPS[3];
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(p);
  }
  let index;
  function draw() {
    area.replaceChildren();
    if (query.trim()) {
      index ??= searchIndex(data.pages);
      area.append(results(index, query));
      return;
    }
    for (const [g, list] of groups) {
      if (!list.length) continue;
      const section = directoryGroup(g, list.length, "group-" + g);
      let grid = el("div", "", "tiles");
      list.forEach((p) => grid.append(tile(p)));
      section.append(grid);
      area.append(section);
    }
    if (data.templates.length) {
      const section = directoryGroup("Șabloane", data.templates.length, "templates");
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
              data.notes.push(...takeLegacyPageNotes(p));
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
      section.append(list);
      area.append(section);
    }
    let archived = data.pages.filter((p) => p.archived);
    if (archived.length) {
      let d = directoryGroup("Arhivă", archived.length, "archived");
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
