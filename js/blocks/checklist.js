import { el, input, btn, details, toolsFor, now, id, icon, ask, roDate } from "../ui.js";
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
  for (const i of b.items) {
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
      if (i.notes) meta.push(["notițe", "chip"]);
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
    summary.append(icon("more"));
    summary.setAttribute("aria-label", "Detalii");
    const d = details(summary, "item-" + i.id, "more");
    d.querySelector("summary").setAttribute("aria-label", "Detalii pentru " + i.title);
    const body = el("div", "", "moreBody");
    if (!c.editing) {
      if (i.details) body.append(el("p", i.details, "desc"));
      if (i.ready) body.append(el("p", "Gata când: " + i.ready, "desc ready"));
    }
    const fields = c.editing
      ? [
          ["title", "Titlu", "text"],
          ["details", "Detalii", "area"],
          ["ready", "Gata când", "area"],
          ["notes", "Notițe", "area"],
          ["due", "Termen", "date"],
          ["priority", "Prioritate", "select"],
        ]
      : [
          ["notes", "Notițe", "area"],
          ["due", "Termen", "date"],
        ];
    for (const [key, name, type] of fields)
      body.append(
        input(
          name,
          i[key],
          (v) => {
            i[key] = v;
            if (key === "notes") i.updated = now();
            if (key === "title") text.firstChild.textContent = v;
            updateMeta();
            if (key === "due") c.updateDeadlines?.();
            c.save();
          },
          type,
          ["normal", "important"],
        ),
      );
    if (i.checkedAt)
      body.append(
        el(
          "p",
          "Bifat la " +
            new Date(i.checkedAt).toLocaleString("ro", {
              dateStyle: "short",
              timeStyle: "short",
            }),
          "desc",
        ),
      );
    if (c.editing) body.append(toolsFor(b.items, i, c));
    d.append(body);
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
