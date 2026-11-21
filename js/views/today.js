import { app } from "../state.js";
import { el, btn, icon, roDate, confirmShare, details } from "../ui.js";
import { routine } from "../blocks/routine.js";
import { compareNotes, needsReminder } from "../notes.js";
import { noteEditor, noteRow } from "./notes.js";
import { newRow } from "../blocks/table.js";
import { active, deadlines, openProblems, problemsTable, handover, report, share } from "../logic.js";

const expandedRoutines = new Set();

function shiftSelector(c) {
  const select = el("select", "", "todayShift");
  select.setAttribute("aria-label", "Alege schimbul");
  const hours = app.data.settings.hours;
  for (let i = 1; i <= 3; i++)
    select.add(new Option("Schimbul " + i + " · " + hours[i - 1] + "–" + hours[i % 3], i));
  select.value = String(c.shift);
  select.onchange = () => {
    app.data.settings.slot = c.slot;
    app.data.settings.shift = Number(select.value);
    app.refresh();
    document.querySelector(".todayShift")?.focus({ preventScroll: true });
  };
  return select;
}

function shiftActions(c) {
  const menu = details([el("span", "Acțiuni de schimb"), icon("down")], null, "todayActions");
  const actions = el("div", "", "actionChoices");
  function add(name, symbol, run) {
    actions.append(btn(name, () => {
      menu.open = false;
      menu.querySelector("summary").focus({ preventScroll: true });
      run();
    }, "", symbol));
  }
  const ho = handover();
  if (ho) add("Predare", "handover", () => {
    if (!ho.r) {
      ho.r = newRow(ho.b, c);
      app.save();
    }
    app.openPage(ho.p, "row-" + ho.r.id);
  });
  const pt = problemsTable();
  if (pt) add("Problemă", "alert", () => {
    const row = newRow(pt.b, c);
    app.save();
    app.openPage(pt.p, "row-" + row.id);
  });
  add("Rezumat", "send", async () => {
    const text = report();
    if (await confirmShare(text)) await share(text);
  });
  menu.append(actions);
  menu.addEventListener("focusout", (e) => {
    if (e.relatedTarget && !menu.contains(e.relatedTarget)) menu.open = false;
  });
  menu.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      menu.open = false;
      menu.querySelector("summary").focus();
    }
  });
  return menu;
}

function header(c) {
  const head = el("div", "", "todayHead");
  const title = el("div");
  title.append(el("h1", "Azi"), el("p", roDate(c.date, {
    weekday: "long", day: "numeric", month: "long",
  }), "todayDate"));
  head.append(title, btn("Notiță nouă", () => noteEditor(), "primary", "plus"));
  const tools = el("div", "", "todayTools");
  tools.append(shiftSelector(c), shiftActions(c));
  if (c.workDay !== c.date) {
    const date = el("span", "Schimb început pe " + roDate(c.workDay), "shiftStartDate");
    tools.append(date);
  }
  return [head, tools];
}

function routineSection(block, c) {
  const section = el("section", "", "todayRoutine");
  const head = el("div", "", "todaySectionHead");
  const done = block.items.filter((i) => i.checked).length;
  const count = el("span", done + " / " + block.items.length, "routineProgress");
  count.setAttribute("aria-label", done + " din " + block.items.length + " puncte bifate");
  head.append(el("h2", block.title), count);
  section.append(head);
  const list = routine(block, c, true);
  const rows = list.querySelectorAll(".lines > .task");
  section.append(list);
  const complete = el("p", "Toate punctele sunt bifate.", "routineDone");
  if (done === rows.length) section.append(complete);
  const toggle = btn("", () => {
    if (expandedRoutines.has(block.id)) expandedRoutines.delete(block.id);
    else expandedRoutines.add(block.id);
    apply();
    if (expandedRoutines.has(block.id) && !matchMedia("(prefers-reduced-motion: reduce)").matches)
      list.animate([{ opacity: .7, transform: "translateY(-3px)" }, { opacity: 1, transform: "none" }],
        { duration: 160, easing: "ease-out" });
  }, "todayMore");
  const text = el("span");
  toggle.append(text, icon("down"));
  section.append(toggle);
  function apply() {
    const expanded = expandedRoutines.has(block.id);
    let visible = 0;
    for (const [index, row] of rows.entries()) {
      const preview = !block.items[index].checked && visible < 3;
      if (preview) visible++;
      row.hidden = !expanded && !preview;
    }
    complete.hidden = expanded;
    toggle.hidden = visible === rows.length;
    toggle.setAttribute("aria-expanded", String(expanded));
    text.textContent = expanded ? "Restrânge lista" : "Arată toate punctele (" + rows.length + ")";
  }
  apply();
  return section;
}

// Notițele cu termen sau prioritate și înregistrările nerezolvate se văd în aceeași listă.
function drawAgenda(section, c) {
  const notes = app.data.notes.filter((n) => needsReminder(n, c.date, c.time));
  const due = deadlines().filter((d) => d.due <= c.date);
  const seen = new Set(due.map((d) => d.p.id + "/" + d.key));
  const problems = openProblems().filter((d) => !seen.has(d.p.id + "/" + d.key));
  const records = [...due, ...problems];
  const entries = [
    ...notes.map((note) => ({ note, sortKey: note })),
    ...records.map((entry) => ({ entry, sortKey: {
      due: entry.due || "", done: false, priority: "normal", createdAt: "", id: entry.key,
    } })),
  ].sort((a, b) => compareNotes(a.sortKey, b.sortKey, c.date, c.time));
  section.replaceChildren();
  section.hidden = !entries.length;
  if (!entries.length) return;
  const heading = el("div", "", "todaySectionHead");
  heading.append(el("h2", "De urmărit"), el("span", String(entries.length), "agendaCount"));
  section.append(heading);
  function row({ note, entry }) {
    if (note) return noteRow(note, c);
    const late = entry.due && entry.due < c.date;
    const tag = late ? "Restant · " + roDate(entry.due) : entry.due ? "Azi" : "Problemă deschisă";
    return link(entry.text, tag, late ? "chip late" : "chip", () => app.openPage(entry.p, entry.key));
  }
  section.append(...entries.slice(0, 3).map(row));
  if (entries.length > 3) {
    const more = details([el("span", "Încă " + (entries.length - 3) + " de urmărit"), icon("down")],
      "today-agenda-more", "todayAgendaMore");
    const fill = () => {
      if (more.open && more.childElementCount === 1) more.append(...entries.slice(3).map(row));
    };
    more.addEventListener("toggle", fill);
    fill();
    section.append(more);
  }
}

export function today(c) {
  const main = document.querySelector("main");
  const home = el("div", "", "todayView");
  home.append(...header(c));
  const agenda = el("section", "", "todayAgenda");
  const updateDeadlines = () => drawAgenda(agenda, c);
  updateDeadlines();
  home.append(agenda);
  for (const page of active()) {
    for (const block of page.blocks) {
      if (block.type === "routine" && block.items.length)
        home.append(routineSection(block, { ...c, pageId: page.id, updateDeadlines }));
    }
  }
  main.append(home);
}

export function link(text, tag, cls, fn) {
  let b = btn("", fn, "linkRow");
  let t = el("span", "", "linkText");
  t.append(el("span", text));
  if (tag) t.append(el("span", tag, cls));
  b.append(t, icon("chevron"));
  return b;
}
