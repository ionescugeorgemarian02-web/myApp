import { el, input, btn, details, toolsFor, now, id, icon, ask, roDate } from "../ui.js";
import { app } from "../state.js";
import { compareNotes } from "../notes.js";
import { noteEditor, noteRow } from "../views/notes.js";

export const item = (title, details = "", ready = "") => ({
  id: id(),
  title,
  details,
  ready,
  notes: "",
  due: "",
  priority: "normal",
  checked: false,
  checkedAt: null,
});
// c.editing = true afișează și câmpurile de structură (titlu, prioritate, mutare).
export function checklist(b, c, compact = false) {
  let box = el("div"),
    list = el("div", "", "lines");
  const shiftKey = b.type === "routine" ? c.key : "";
  const byItem = new Map();
  for (const note of app.data.notes) {
    const src = note.source;
    if (!src || src.pageId !== c.pageId || src.blockId !== b.id || src.shiftKey !== shiftKey) continue;
    if (!byItem.has(src.itemId)) byItem.set(src.itemId, []);
    byItem.get(src.itemId).push(note);
  }
  for (const i of b.items) {
    const notes = byItem.get(i.id) || [];
    let row = el("div", "", "task"),
      label = el("label", "", "check"),
      tick = el("input"),
      text = el("span");
    if (i.priority === "important") row.classList.add("important");
    tick.type = "checkbox";
    tick.checked = i.checked;
    tick.onchange = () => {
      i.checked = tick.checked;
      i.checkedAt = i.checked ? now() : null;
      c.refresh();
    };
    text.append(el("span", i.title, "taskTitle"));
    function updateMeta() {
      text.querySelector(".meta")?.remove();
      let meta = [];
      if (i.priority === "important") meta.push(["★ important", "chip warn"]);
      if (i.due && !i.checked)
        meta.push([
          roDate(i.due),
          i.due < c.date ? "chip late" : i.due === c.date ? "chip today" : "chip",
        ]);
      if (notes.length) meta.push([notes.length === 1 ? "1 notiță" : notes.length + " notițe", "chip"]);
      if (meta.length) {
        let m = el("span", "", "meta");
        for (let [t, cls] of meta) m.append(el("span", t, cls));
        text.append(m);
      }
    }
    updateMeta();
    label.append(tick, text);
    row.append(label);
    const summary = el("span", "", "moreIcon");
    summary.append(icon("edit"));
    const d = details(summary, "item-" + i.id, "more");
    d.querySelector("summary").setAttribute("aria-label", "Detalii pentru " + i.title);
    function populate() {
      if (!d.open || d.children.length > 1) return;
      const body = el("div", "", "moreBody");
      if (!c.editing) {
        if (i.details) body.append(el("p", i.details, "desc"));
        if (i.ready) body.append(el("p", "Gata când " + i.ready, "desc ready"));
      }
      function field(key, name, type) {
        return input(name, i[key], (value) => {
          i[key] = value;
          if (key === "title") {
            text.firstChild.textContent = value;
            d.firstChild.setAttribute("aria-label", "Detalii pentru " + value);
          }
          if (key === "priority") row.classList.toggle("important", value === "important");
          if (key === "due" || key === "priority") updateMeta();
          if (key === "due") c.updateDeadlines?.();
          c.save();
        }, type, ["normal", "important"]);
      }
      if (c.editing) {
        const group = el("fieldset", "", "formGroup");
        group.append(
          el("legend", "Definirea punctului"),
          field("title", "Titlu", "text"),
          field("details", "Instrucțiuni", "area"),
          field("ready", "Când se poate bifa?", "area"),
        );
        body.append(group);
      }
      const group = el("fieldset", "", "formGroup");
      const source = { pageId: c.pageId, blockId: b.id, itemId: i.id, title: i.title, shiftKey };
      group.append(el("legend", "Notițele punctului"));
      for (const note of notes.sort(compareNotes)) group.append(noteRow(note, c));
      group.append(btn("Adaugă notiță", () => noteEditor(source), "pill", "plus"));
      body.append(group);
      const tracking = el("fieldset", "", "formGroup");
      tracking.append(el("legend", "Urmărirea punctului"));
      const dates = el("div", "", "recordFields");
      dates.append(field("due", "Termenul punctului", "date"));
      if (c.editing) dates.append(field("priority", "Prioritate", "select"));
      tracking.append(dates, el("small", "Pe Azi apar punctele nebifate cu termen astăzi sau depășit.", "fieldHelp"));
      body.append(tracking);
      if (i.checkedAt)
        body.append(el("p", "Bifat la " + new Date(i.checkedAt).toLocaleString("ro", {
          dateStyle: "short", timeStyle: "short",
        }), "desc"));
      if (c.editing) body.append(toolsFor(b.items, i, c));
      d.append(body);
    }
    d.addEventListener("toggle", populate);
    populate();
    row.append(d);
    list.append(row);
  }
  if (!b.items.length) list.append(el("p", "Niciun punct încă.", "empty"));
  box.append(list);
  if (!compact && (b.type === "checklist" || c.editing))
    box.append(
      btn(
        "Adaugă punct",
        async () => {
          let t = await ask("Punct nou", "", "Adaugă");
          if (t?.trim()) {
            b.items.push(item(t.trim()));
            c.refresh();
          }
        },
        "add",
        "plus",
      ),
    );
  return box;
}
