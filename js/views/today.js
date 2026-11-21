import { app } from "../state.js";
import { el, btn, icon, roDate, confirmShare, details } from "../ui.js";
import { routine } from "../blocks/routine.js";
import { compareNotes, needsReminder } from "../notes.js";
import { noteEditor, noteRow } from "./notes.js";
import { newRow } from "../blocks/table.js";
import {
  active,
  progress,
  deadlines,
  openProblems,
  problemsTable,
  handover,
  report,
  share,
} from "../logic.js";
// Filtrul este local sesiunii, ca să poți reveni oricând la lista completă.
const filteredRoutines = new Set();

function shiftHeader(c, done, total) {
  const hero = el("section", "", "shiftHeader");
  const date = el("p", roDate(c.workDay, {
    weekday: "long", day: "numeric", month: "long",
  }), "shiftDate");
  const heading = el("div", "", "shiftHeading");
  heading.append(el("h1", "Schimbul " + c.shift));
  if (total) {
    const meter = el("div", "", "shiftMeter");
    const bar = el("progress");
    bar.max = total;
    bar.value = done;
    bar.setAttribute("aria-label", "Progresul rutinei");
    meter.append(el("span", done + " din " + total + " bifate"), bar);
    heading.append(meter);
  }

  const hours = app.data.settings.hours;
  const shifts = el("div", "", "shiftPicker");
  shifts.setAttribute("role", "group");
  shifts.setAttribute("aria-label", "Alege schimbul");
  for (let i = 1; i <= 3; i++) {
    const b = btn("", () => {
      if (i === c.shift) return;
      app.data.settings.slot = c.slot;
      app.data.settings.shift = i;
      app.refresh();
      document.querySelector('.shiftPicker [aria-pressed="true"]')?.focus({ preventScroll: true });
    });
    b.append(el("strong", "Schimb " + i), el("small", hours[i - 1] + "–" + hours[i % 3]));
    b.setAttribute("aria-label", "Schimb " + i);
    b.setAttribute("aria-description", hours[i - 1] + " – " + hours[i % 3]);
    b.setAttribute("aria-pressed", String(i === c.shift));
    shifts.append(b);
  }
  const guide = details([icon("pages"), el("span", "Ghid rapid")], "today-guide", "shiftGuide");
  const list = el("ul");
  for (const [lead, text] of [
    ["La început", "Verifică schimbul selectat. Atinge alt interval ca să lucrezi în acel schimb."],
    ["În timpul schimbului", "Bifează punctele terminate. Apasă creionul de lângă un punct pentru a adăuga notițe. Le regăsești în fila Notițe."],
    ["La predare", "Completează predarea, apoi deschide rezumatul ca să-l citești și să-l trimiți."],
  ]) {
    const step = el("li");
    step.append(el("strong", lead), el("span", text));
    list.append(step);
  }
  guide.append(list);
  hero.append(date, heading, shifts, guide);
  return hero;
}

function routineCard(block, c, showCount) {
  const card = el("section", "", "card routineCard");
  const head = el("div", "", "cardHead");
  const pending = block.items.filter((item) => !item.checked).length;
  head.append(el("h2", block.title));
  card.append(head);
  if (!block.items.length) {
    card.append(el("p", "Adaugă puncte din Pagini, în modul de editare.", "empty"));
    return card;
  }

  const filter = btn("Doar nebifate", () => {
    if (filteredRoutines.has(block.id)) filteredRoutines.delete(block.id);
    else filteredRoutines.add(block.id);
    applyFilter();
  }, "routineFilter");
  const controls = el("div", "", "routineControls");
  if (showCount) controls.append(el("span", progress(block.items), "count"));
  controls.append(filter);
  head.append(controls);
  card.append(routine(block, c, true));
  const finished = el("p", "Ai bifat toate punctele din această rutină.", "empty");
  card.append(finished);
  function applyFilter() {
    const filtered = filteredRoutines.has(block.id);
    card.classList.toggle("onlyPending", filtered);
    filter.setAttribute("aria-pressed", String(filtered));
    finished.hidden = !filtered || pending > 0;
  }
  applyFilter();
  return card;
}
function action(ic, title, sub, fn, cls = "") {
  let b = btn("", fn, "action " + cls);
  let i = el("span", "", "actionIcon");
  i.append(icon(ic));
  b.append(i, el("strong", title), el("small", sub));
  return b;
}
export function today(c) {
  const pages = active();
  const routines = pages.flatMap((p) => p.blocks.filter((b) => b.type === "routine").map((block) => ({ pageId: p.id, block })));
  const items = routines.flatMap(({ block }) => block.items);
  const done = items.filter((i) => i.checked).length;
  const main = document.querySelector("main");
  main.append(shiftHeader(c, done, items.length));
  // Acțiuni rapide.
  const ho = handover(),
    pt = problemsTable(),
    grid = el("div", "", "actions");
  if (ho)
    grid.append(
      action(
        "handover",
        "Predare",
        ho.r ? "începută ✓" : "completează jurnalul",
        () => {
          if (!ho.r) {
            ho.r = newRow(ho.b, c);
            app.save();
          }
          app.openPage(ho.p, "row-" + ho.r.id);
        },
        ho.r ? "" : "todo",
      ),
    );
  grid.append(action("send", "Rezumat", "citește și trimite", async () => {
    const text = report();
    if (await confirmShare(text)) await share(text);
  }));
  if (pt)
    grid.append(
      action("alert", "Problemă", "adaugă în registru", () => {
        const r = newRow(pt.b, c);
        app.save();
        app.openPage(pt.p, "row-" + r.id);
      }),
    );

  const layout = el("div", "", "shiftLayout");
  const follow = el("div", "", "follow");
  const routineList = el("div", "", "routineList");
  const side = el("div", "", "shiftTools");
  side.append(grid, reminderCard(c), follow);
  layout.append(side, routineList);
  main.append(layout);
  function updateDeadlines() {
    follow.replaceChildren();
    drawFollowUp(follow, c);
  }
  updateDeadlines();
  for (const { block, pageId } of routines)
    routineList.append(routineCard(block, { ...c, pageId, updateDeadlines }, routines.length > 1));
}

function reminderCard(c) {
  const section = el("section", "", "card noteReminders");
  const reminders = app.data.notes.filter((n) => needsReminder(n, c.date)).sort(compareNotes);
  const head = el("div", "", "cardHead");
  head.append(el("h2", "Notițe de urmărit"), el("span", String(reminders.length), "count"));
  section.append(head);
  if (!reminders.length)
    section.append(el("p", "Aici apar notițele importante, cele scadente azi și restanțele.", "empty"));
  for (const note of reminders.slice(0, 3)) section.append(noteRow(note, c));
  section.append(
    btn("Adaugă notiță", () => noteEditor(), "pill", "plus"),
    btn(reminders.length > 3 ? "Toate notițele · " + reminders.length + " de urmărit" : "Toate notițele",
      () => { location.hash = "Notițe"; }, "ghost", "notes"),
  );
  return section;
}
function drawFollowUp(main, c) {
  // De urmărit: termene restante, de azi și probleme deschise.
  const all = deadlines().filter((d) => d.due <= c.date),
    seen = new Set(all.map((d) => d.p.id + "/" + d.key)),
    probs = openProblems().filter((p) => !seen.has(p.p.id + "/" + p.key));
  if (all.length || probs.length) {
    let s = el("section", "", "card");
    let head = el("div", "", "cardHead");
    head.append(el("h2", "De urmărit"), el("span", String(all.length + probs.length), "count"));
    s.append(head);
    let list = el("div", "", "linkList");
    const entries = [...all, ...probs];
    function appendEntry(parent, d) {
      const late = d.due && d.due < c.date;
      const tag = late ? "Restant · " + roDate(d.due) : d.due ? "Azi" : "Deschisă";
      const cls = late ? "chip late" : d.due ? "chip today" : "chip";
      parent.append(link(d.text, tag, cls, () => app.openPage(d.p, d.key)));
    }
    entries.slice(0, 4).forEach((d) => appendEntry(list, d));
    if (entries.length > 4) {
      const extra = details("Arată încă " + (entries.length - 4), "today-follow-more", "moreLinks");
      const fill = () => {
        if (extra.open && extra.childElementCount === 1)
          entries.slice(4).forEach((d) => appendEntry(extra, d));
      };
      extra.addEventListener("toggle", fill);
      fill();
      list.append(extra);
    }
    s.append(list);
    main.append(s);
  }
}
export function link(text, tag, cls, fn) {
  let b = btn("", fn, "linkRow");
  let t = el("span", "", "linkText");
  t.append(el("span", text));
  if (tag) t.append(el("span", tag, cls));
  b.append(t, icon("chevron"));
  return b;
}
