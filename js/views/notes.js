import { app } from "../state.js";
import { actions, btn, details, el, icon, openDialog, roDate, toast } from "../ui.js";
import { compareNotes, createNote } from "../notes.js";

function sourceLabel(source) {
  if (!source) return "";
  return [source.title, source.shiftKey].filter(Boolean).join(" · ");
}

function field(name, control) {
  const label = el("label", "", "field");
  label.append(el("span", name), control);
  return label;
}

export async function noteEditor(source = null, existing = null) {
  const text = el("textarea");
  text.value = existing?.text || "";
  text.rows = 4;
  text.required = true;
  text.placeholder = "Ce vrei să reții sau să urmărești?";
  text.oninput = () => {
    text.setCustomValidity(text.value.trim() ? "" : "Scrie o notiță înainte de salvare.");
  };
  const priority = el("select");
  priority.add(new Option("Normală", "normal"));
  priority.add(new Option("Importantă", "important"));
  priority.value = existing?.priority || "normal";
  const due = el("input");
  due.type = "date";
  due.min = "1000-01-01";
  due.max = "9999-12-31";
  due.value = existing?.due || "";
  const fields = el("div", "", "noteEditorOptions");
  fields.append(field("Prioritate", priority), field("Termen (opțional)", due));
  const footer = actions("Salvează");
  if (existing) {
    const remove = el("button", "Șterge", "ghost danger");
    remove.value = "delete";
    remove.formNoValidate = true;
    footer.append(remove);
  }
  const origin = sourceLabel(existing?.source || source);
  const answer = await openDialog(() => [
    el("h2", existing ? "Editează notița" : "Notiță nouă"),
    ...(origin ? [el("p", origin, "noteOrigin")] : []),
    field("Notiță", text), fields, footer,
  ]);
  if (answer === "delete" && existing) {
    app.remove(app.data.notes, existing);
    return;
  }
  if (answer !== "ok" || !text.value.trim()) return;

  if (existing) {
    Object.assign(existing, { text: text.value.trim(), priority: priority.value, due: due.value });
  } else {
    app.data.notes.push(createNote(text.value.trim(), source, priority.value, due.value));
  }
  app.refresh();
  const message = existing ? "Notiță actualizată" : "Notiță adăugată";
  if (document.querySelector(".noteList")) toast(message);
  else toast(message, () => { location.hash = "Notițe"; }, "Vezi notițele");
}

function dueBadge(note, today) {
  const date = roDate(note.due, {
    day: "numeric", month: "short",
    ...(note.due.slice(0, 4) !== today.slice(0, 4) ? { year: "numeric" } : {}),
  });
  if (!note.done && note.due < today) return el("span", "Restantă · " + date, "chip late");
  if (!note.done && note.due === today) return el("span", "Scadentă azi", "chip today");
  return el("span", "Termen · " + date, "chip");
}

export function noteRow(note, c) {
  const row = el("div", "", "noteRow");
  row.dataset.noteId = note.id;
  row.classList.toggle("isDone", note.done);
  const checkLabel = el("label", "", "noteCheck");
  const check = el("input");
  check.type = "checkbox";
  check.checked = note.done;
  check.setAttribute("aria-label", (note.done ? "Redeschide" : "Finalizează") + " notița „" + note.text + "”");
  check.onchange = () => {
    note.done = check.checked;
    app.refresh();
    toast(note.done ? "Notiță finalizată" : "Notiță redeschisă");
  };
  checkLabel.append(check);

  const edit = btn("", () => noteEditor(note.source, note), "noteEdit");
  edit.setAttribute("aria-label", "Editează notița „" + note.text + "”");
  const body = el("span", "", "noteBody");
  body.append(el("span", note.text, "noteText"));
  const meta = el("span", "", "noteMeta");
  if (note.priority === "important") meta.append(el("span", "Importantă", "chip warn"));
  if (note.due) meta.append(dueBadge(note, c.date));
  if (meta.childElementCount) body.append(meta);
  const origin = sourceLabel(note.source);
  if (origin) body.append(el("small", origin, "noteOrigin"));
  edit.append(body, icon("edit"));
  row.append(checkLabel, edit);
  return row;
}

function listHeading(title, count) {
  const heading = el("div", "", "cardHead");
  heading.append(el("h2", title), el("span", String(count), "count"));
  return heading;
}

function pageNotes() {
  const list = el("div", "", "linkList");
  for (const page of app.data.pages) {
    for (const block of page.blocks) {
      if (block.type !== "note" || !block.text.trim()) continue;
      const open = btn("", () => app.openPage(page, "block-" + block.id), "linkRow pageNote");
      const body = el("span", "", "linkText");
      const origin = [page.title];
      if (page.title !== block.title && block.title) origin.push(block.title);
      if (page.archived) origin.push("Arhivată");
      body.append(el("strong", origin.join(" · ")), el("span", block.text, "snippet"));
      open.append(body, icon("chevron"));
      list.append(open);
    }
  }
  if (!list.childElementCount) return null;
  const section = el("section", "", "card");
  section.append(listHeading("Notițe din pagini", list.childElementCount), list);
  return section;
}

export function notesView(c) {
  const main = document.querySelector("main");
  const head = el("div", "", "directoryHead");
  const create = btn("Notiță nouă", () => noteEditor(), "primary small", "plus");
  head.append(el("h1", "Notițe", "title"), create);
  const active = app.data.notes.filter((note) => !note.done).sort(compareNotes);
  const current = el("section", "", "card noteList");
  current.append(listHeading("De făcut", active.length));
  if (active.length) {
    for (const note of active) current.append(noteRow(note, c));
  } else {
    current.append(el("p", "Nu ai notițe de bifat. Poți adăuga una aici sau din rutina schimbului.", "empty"));
  }
  main.append(head, current);
  const completed = app.data.notes.filter((note) => note.done)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (completed.length) {
    const history = details("Finalizate (" + completed.length + ")", "notes-completed", "card noteHistory");
    for (const note of completed) history.append(noteRow(note, c));
    main.append(history);
  }
  const fromPages = pageNotes();
  if (fromPages) main.append(fromPages);
}
