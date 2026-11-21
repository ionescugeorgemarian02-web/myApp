import { app } from "../state.js";
import { el, btn, input, toolsFor, ask, toast, iconBtn } from "../ui.js";
import { block, GROUPS } from "../seed.js";
import { progress } from "../logic.js";
import { note } from "../blocks/note.js";
import { section } from "../blocks/section.js";
import { checklist } from "../blocks/checklist.js";
import { table } from "../blocks/table.js";
import { routine } from "../blocks/routine.js";
import { journal } from "../blocks/journal.js";
const renderers = { section, note, checklist, table, routine, journal };
const names = {
  checklist: ["Listă de bifat", "☑️"],
  table: ["Tabel", "▦"],
  journal: ["Jurnal", "🗒️"],
  note: ["Notiță", "📝"],
  section: ["Titlu de secțiune", "🔤"],
  routine: ["Rutină pe schimb", "🔁"],
};
export function pageView(p, c) {
  const main = document.querySelector("main"),
    data = app.data,
    editing = app.editing === p.id;
  c = { ...c, editing };
  // Bara de sus: înapoi, titlu, editare.
  const bar = el("div", "", "pageBar");
  bar.append(
    iconBtn("back", "Înapoi la pagini", () => (location.hash = "Pagini")),
    btn(
      editing ? "Gata" : "Editează",
      () => {
        app.editing = editing ? null : p.id;
        app.render();
      },
      editing ? "pill on" : "pill",
      editing ? "check" : "edit",
    ),
  );
  main.append(bar);
  const h = el("h1", "", "title");
  h.append(el("span", p.emoji || "📄", "titleEmoji"), el("span", p.title));
  main.append(h);
  if (p.archived) main.append(el("p", "Pagină arhivată – nu apare pe Azi.", "hint"));
  if (editing) {
    main.append(el("p", "Mod editare: poți redenumi, muta, adăuga sau șterge.", "hint"));
    let s = el("section", "", "card editCard");
    s.append(
      input("Titlu", p.title, (v) => {
        if (!v.trim()) return;
        p.title = v.trim();
        h.lastChild.textContent = p.title;
        c.save();
      }),
    );
    let row = el("div", "", "twoCols");
    row.append(
      input("Pictogramă (emoji)", p.emoji, (v) => {
        p.emoji = v.trim();
        h.firstChild.textContent = p.emoji || "📄";
        c.save();
      }),
      input(
        "Grup",
        p.group || GROUPS[3],
        (v) => {
          p.group = v;
          c.save();
        },
        "select",
        [...new Set([...GROUPS, ...data.pages.map((x) => x.group).filter(Boolean)])],
      ),
    );
    s.append(row);
    let tools = toolsFor(data.pages, p, c, { copy: app.clone });
    tools.append(
      btn(
        p.archived ? "Reactivează" : "Arhivează",
        () => {
          p.archived = !p.archived;
          app.refresh();
        },
        "small",
        "archive",
      ),
      btn(
        "Salvează ca șablon",
        () => {
          data.templates.push(app.clone(p));
          app.refresh();
          toast("Șablon salvat");
        },
        "small",
        "template",
      ),
    );
    s.append(tools);
    main.append(s);
  }
  for (let b of p.blocks) {
    if (b.type === "section") {
      let head = el("div", "", "sectionHead"),
        next = p.blocks[p.blocks.indexOf(b) + 1];
      head.append(el("h2", b.title));
      // Contorul listei de sub secțiune stă lângă titlul secțiunii.
      if (next?.items && !editing) head.append(el("span", progress(next.items), "count"));
      main.append(head);
      if (editing) main.append(toolsFor(p.blocks, b, c, { rename: true, copy: app.clone }));
      continue;
    }
    let s = el("section", "", "card");
    let head = el("div", "", "cardHead");
    // Titlul blocului e ascuns dacă repetă titlul paginii sau al secțiunii.
    let prev = p.blocks[p.blocks.indexOf(b) - 1],
      showTitle = editing || (b.title !== p.title && prev?.type !== "section");
    head.append(el("h2", b.title));
    if (b.items) head.append(el("span", progress(b.items), "count"));
    if (showTitle) s.append(head);
    else if (b.items && prev?.type !== "section") {
      head.firstChild.textContent = "";
      s.append(head);
    }
    s.append(renderers[b.type](b, c));
    if (editing) {
      let t = toolsFor(p.blocks, b, c, { rename: true, copy: app.clone });
      t.classList.add("blockTools");
      s.append(t);
    }
    main.append(s);
  }
  if (!p.blocks.length)
    main.append(el("p", "Pagina e goală. Apasă „Editează” și adaugă un bloc.", "empty"));
  if (editing) {
    let s = el("section", "", "card");
    s.append(el("h2", "Adaugă bloc"));
    let grid = el("div", "", "blockGrid");
    for (let [k, [t, e]] of Object.entries(names)) {
      let b = btn(
        "",
        async () => {
          let name = await ask(t + " – denumire", t, "Adaugă");
          if (name?.trim()) {
            p.blocks.push(block(k, name.trim()));
            app.refresh();
          }
        },
        "blockType",
      );
      b.append(el("span", e), el("strong", t));
      grid.append(b);
    }
    s.append(grid);
    main.append(s);
  }
}
