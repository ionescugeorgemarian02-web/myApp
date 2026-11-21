import { app } from "../state.js";
import { btn, el, input, now } from "../ui.js";
import { compareNotes } from "../notes.js";
import { noteEditor, noteRow } from "../views/notes.js";

export function note(b, c) {
  const body = el("div");
  const field = input(
    "Text liber",
    b.text,
    (value) => {
      b.text = value;
      b.updated = now();
      c.save();
    },
    "area",
  );
  field.classList.add("noteField");
  field.querySelector("textarea").placeholder = "Scrie aici…";
  const source = { pageId: c.pageId, blockId: b.id, itemId: "", title: b.title, shiftKey: "" };
  body.append(field);
  const notes = app.data.notes.filter((n) => n.source?.blockId === b.id && n.source.pageId === c.pageId);
  for (const note of notes.sort(compareNotes)) body.append(noteRow(note, c));
  body.append(btn("Adaugă notiță", () => noteEditor(source), "pill", "plus"));
  return body;
}
