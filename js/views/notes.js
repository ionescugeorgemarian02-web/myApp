import { app } from "../state.js";
import { actions, btn, day, details, el, icon, openDialog, roDate, toast } from "../ui.js";
import { compareNotes, createNote, deadlineState } from "../notes.js";

let showCompleted = false;

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
  text.rows = 3;
  text.required = true;
  text.setAttribute("aria-label", "Notiță");
  text.placeholder = "Ce vrei să reții sau să urmărești?";
  text.oninput = () => {
    text.setCustomValidity(text.value.trim() ? "" : "Scrie o notiță înainte de salvare.");
  };
  const important = el("input");
  important.type = "checkbox";
  important.checked = existing?.priority === "important";
  const priority = el("label", "", "notePriority");
  priority.append(important, el("span", "Importantă"));
  const due = el("input");
  due.type = "date";
  due.min = "1000-01-01";
  due.max = "9999-12-31";
  due.value = existing?.due || "";
  const time = el("input");
  time.type = "time";
  time.value = existing?.dueTime || "";
  time.oninput = () => {
    if (time.value && !due.value) due.value = day();
  };
  due.onchange = () => {
    if (!due.value) time.value = "";
  };
  const fields = el("div", "", "noteDeadline");
  fields.setAttribute("role", "group");
  fields.setAttribute("aria-label", "Termen opțional");
  const pair = el("div", "", "noteEditorOptions");
  pair.append(field("Dată", due), field("Oră", time));
  const today = btn("Azi", () => { due.value = day(); time.focus(); }, "noteQuickDate");
  today.setAttribute("aria-label", "Setează termenul pentru azi");
  const deadlineHead = el("div", "", "noteDeadlineHead");
  deadlineHead.append(el("span", "Termen (opțional)"), today);
  fields.append(deadlineHead, pair);
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
    text, priority, fields, footer,
  ]);
  if (answer === "delete" && existing) {
    app.remove(app.data.notes, existing);
    return;
  }
  if (answer !== "ok" || !text.value.trim()) return;

  const notePriority = important.checked ? "important" : "normal";
  if (existing) {
    Object.assign(existing, { text: text.value.trim(), priority: notePriority, due: due.value, dueTime: time.value });
  } else {
    app.data.notes.push(createNote(text.value.trim(), source, notePriority, due.value, time.value));
    showCompleted = false;
  }
  app.refresh();
  const message = existing ? "Notiță actualizată" : "Notiță adăugată";
  if (document.querySelector(".noteList")) toast(message);
  else toast(message, () => {
    showCompleted = existing?.done === true;
    location.hash = "Notițe";
  }, "Vezi notițele");
}

function dueLabel(note, c) {
  const state = deadlineState(note, c.date, c.time);
  const date = note.due === c.date ? "Azi" : roDate(note.due, {
    day: "numeric", month: "short",
    ...(note.due.slice(0, 4) !== c.date.slice(0, 4) ? { year: "numeric" } : {}),
  });
  const stamp = note.dueTime ? date + ", " + note.dueTime : date;
  const late = !note.done && state === "late";
  const label = el("span", late ? "Restantă · " + stamp : stamp, "noteDue");
  label.dataset.state = note.done ? "done" : state;
  return label;
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
  if (note.due) meta.append(dueLabel(note, c));
  if (note.priority === "important") meta.append(el("span", "Importantă", "noteFlag"));
  if (note.source?.title) meta.append(el("span", note.source.title, "noteOrigin"));
  if (meta.childElementCount) body.append(meta);
  edit.append(body, icon("edit"));
  row.append(checkLabel, edit);
  return row;
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
  const section = details("Notițe din pagini (" + list.childElementCount + ")", "notes-from-pages", "pageNoteIndex");
  section.append(list);
  return section;
}

export function notesView(c) {
  const main = document.querySelector("main");
  const head = el("div", "", "directoryHead");
  const create = btn("Notiță nouă", () => noteEditor(), "primary small", "plus");
  head.append(el("h1", "Notițe", "title"), create);
  const active = app.data.notes.filter((note) => !note.done).sort((a, b) => compareNotes(a, b, c.date, c.time));
  const completed = app.data.notes.filter((note) => note.done).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const filters = el("div", "", "noteFilters");
  filters.setAttribute("role", "group");
  filters.setAttribute("aria-label", "Starea notițelor");
  const current = el("section", "", "noteList");
  function showList() {
    const list = showCompleted ? completed : active;
    current.setAttribute("aria-label", showCompleted ? "Notițe finalizate" : "Notițe active");
    for (const button of filters.children) {
      button.setAttribute("aria-pressed", String((button.dataset.done === "true") === showCompleted));
    }
    current.replaceChildren();
    for (const note of list) current.append(noteRow(note, c));
    if (!list.length) current.append(el("p", showCompleted ? "Încă nu ai bifat nicio notiță." :
      "Nu ai notițe active. Adaugă una aici sau din rutina schimbului.", "empty"));
  }
  for (const [name, done, count] of [["Active", false, active.length], ["Finalizate", true, completed.length]]) {
    const button = btn(name, () => { showCompleted = done; showList(); });
    button.append(el("span", String(count), "noteFilterCount"));
    button.dataset.done = String(done);
    filters.append(button);
  }
  showList();
  main.append(head, filters, current);
  const fromPages = pageNotes();
  if (fromPages) main.append(fromPages);
}
