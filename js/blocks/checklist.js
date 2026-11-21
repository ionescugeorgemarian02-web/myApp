import { el, input, btn, details, toolsFor, now, id } from "../ui.js";
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
export function checklist(b, c, compact = false) {
  let box = el("div"),
    list = el("div", "", "lines");
  for (const i of b.items) {
    let row = el("div", "", "task"),
      label = el("label", "", "check"),
      tick = el("input");
    tick.type = "checkbox";
    tick.checked = i.checked;
    tick.onchange = () => {
      i.checked = tick.checked;
      i.checkedAt = i.checked ? now() : null;
      c.refresh();
    };
    label.append(
      tick,
      el("span", (i.priority === "important" ? "★ " : "") + i.title),
    );
    row.append(label);
    const d = details(compact ? "Detalii" : "Editează punctul", "item-" + i.id);
    for (const [key, name, type] of [
      ["title", "Titlu", "text"],
      ["details", "Detalii", "area"],
      ["ready", "Gata când", "area"],
      ["notes", "Notițe", "area"],
      ["due", "Termen", "date"],
      ["priority", "Prioritate", "select"],
    ])
      d.append(
        input(
          name,
          i[key],
          (v) => {
            i[key] = v;
            if (key === "notes") i.updated = now();
            if (["title", "priority"].includes(key))
              label.lastChild.textContent =
                (i.priority === "important" ? "★ " : "") + i.title;
            c.save();
          },
          type,
          ["normal", "important"],
        ),
      );
    if (i.checkedAt)
      d.append(
        el("p", "Bifat la " + new Date(i.checkedAt).toLocaleString("ro")),
      );
    d.append(toolsFor(b.items, i, c));
    row.append(d);
    list.append(row);
  }
  box.append(list);
  if (!compact)
    box.append(
      btn("+ Adaugă punct", () => {
        let t = prompt("Titlul punctului");
        if (t?.trim()) {
          b.items.push(item(t));
          c.refresh();
        }
      }),
    );
  return box;
}
