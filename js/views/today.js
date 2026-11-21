import { intervalTotals, readKey } from "../operations.js";
import { zoneIntervals, noData } from "./production.js";
import { app } from "../state.js";
import { el, btn, icon, roDate, confirmShare, details, norm } from "../ui.js";
import { routine } from "../blocks/routine.js";
import { compareNotes, needsReminder } from "../notes.js";
import { noteEditor, noteRow } from "./notes.js";
import { newRow } from "../blocks/table.js";
import { active, deadlines, openProblems, problemsTable, handover, previousHandover, report, share } from "../logic.js";
import { shiftRecords, recordKpis, safetyEvents, auditStatus, problems, addDays } from "../metrics.js";
import { advice } from "../advice.js";
import { adviceSection, newSafetyEvent, runAction } from "./advice.js";
import { fmt } from "../charts.js";

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
      const zone = ho.b.cols.find((col) => col.key === "handoverZone");
      if (zone && app.data.settings.zone) ho.r.values[zone.id] = app.data.settings.zone;
      app.save();
    }
    app.openPage(ho.p, "row-" + ho.r.id);
  });
  const pt = problemsTable();
  add("Plan versus realizat", "chart", () => (location.hash = "Producție"));
  if (pt) add("Problemă", "alert", () => {
    const row = newRow(pt.b, c);
    app.save();
    app.openPage(pt.p, "row-" + row.id);
  });
  if (app.data.pages.some((p) => !p.archived && p.blocks.some((b) => b.cols?.some((col) => col.key === "safetyType"))))
    add("Siguranță", "shield", () => newSafetyEvent());
  const tour = auditStatus(app.data, c.key)[0];
  if (tour) add("Tur pe linie", "audit", () => app.openPage(tour.p));
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
  const date = el("p", "", "todayDate");
  date.append(icon("today"), el("span", roDate(c.date, {
    weekday: "long", day: "numeric", month: "long",
  })));
  title.append(date, el("h1", "Panou de schimb"), btn("Notiță nouă", () => noteEditor(), "primary", "plus"));
  title.append(el("p", "Zonă / linie · " + (app.data.settings.zone || "Neconfigurat"), "formHelp"));
  head.append(title);
  return head;
}

function shiftPanel(c) {
  const tools = el("section", "", "todayTools");
  const heading = el("div", "", "todaySectionHead");
  heading.append(icon("clock"), el("h2", "Programul turelor"));
  tools.append(heading, shiftSelector(c));
  const schedule = el("ol", "", "shiftSchedule");
  const hours = app.data.settings.hours;
  hours.forEach((hour, index) => {
    const row = el("li");
    if (c.shift === index + 1) row.setAttribute("aria-current", "true");
    row.append(el("span", "Schimbul " + (index + 1)), el("time", hour));
    schedule.append(row);
  });
  tools.append(schedule, shiftActions(c));
  if (!app.data.settings.scheduleConfirmed)
    tools.append(el("p", "Program orientativ · De confirmat intern", "formHelp"));
  const previous = previousHandover(c);
  if (previous?.r)
    tools.append(btn("Preia schimbul anterior", () => app.openPage(previous.p, "row-" + previous.r.id), "todayMore", "handover"));
  if (c.workDay !== c.date) {
    const date = el("span", "Schimb început pe " + roDate(c.workDay), "shiftStartDate");
    tools.append(date);
  }
  return tools;
}

function routineSection(block, c) {
  const section = el("section", "", "todayRoutine");
  const head = el("div", "", "todaySectionHead");
  const done = block.items.filter((i) => i.checked).length;
  const count = el("span", done + " / " + block.items.length, "routineProgress");
  count.setAttribute("aria-label", done + " din " + block.items.length + " puncte bifate");
  head.append(el("h2", block.title), count);
  const progress = el("progress", "", "routineBar");
  progress.max = block.items.length;
  progress.value = done;
  progress.setAttribute("aria-label", block.title);
  section.append(head, progress);
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
  const open = openProblems().filter((d) => !seen.has(d.p.id + "/" + d.key));
  const registry = new Map(problems(app.data, c).map((p) => ["row-" + p.r.id, p]));
  const priorShift = c.shift === 1 ? 3 : c.shift - 1;
  const priorDay = c.shift === 1 ? addDays(c.workDay, -1) : c.workDay;
  const records = [...due, ...open].map((entry) => {
    const problem = registry.get(entry.key);
    if (!problem) return entry;
    return {
      ...entry,
      urgency: readKey(problem.b, problem.r, "urgency"),
      inherited: !problem.closed && problem.opened === priorDay &&
        Number(readKey(problem.b, problem.r, "incidentShift")) === priorShift,
    };
  });
  const entries = [
    ...notes.map((note) => ({ note, sortKey: note })),
    ...records.map((entry) => ({ entry, sortKey: {
      due: entry.due || "", done: false, priority: entry.urgency === "Urgentă" || entry.urgency === "Critică" ? "important" : "normal", createdAt: "", id: entry.key,
    } })),
  ].sort((a, b) => Number(b.entry?.urgency === "Critică") - Number(a.entry?.urgency === "Critică") ||
    compareNotes(a.sortKey, b.sortKey, c.date, c.time));
  section.replaceChildren();
  section.hidden = !entries.length;
  if (!entries.length) return;
  const heading = el("div", "", "todaySectionHead");
  heading.append(el("h2", "De urmărit"), el("span", String(entries.length), "agendaCount"));
  section.append(heading);
  function row({ note, entry }) {
    if (note) return noteRow(note, c);
    const late = entry.due && entry.due < c.date;
    const tag = late ? "Restant · " + roDate(entry.due) : entry.due ? "Azi" : entry.kind || "Problemă deschisă";
    return link(entry.text, [entry.urgency !== "Obișnuită" && entry.urgency, entry.inherited && "Schimb anterior", tag].filter(Boolean).join(" · "), late || entry.urgency === "Critică" ? "chip late" : "chip", () => app.openPage(entry.p, entry.key));
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

// Cifrele schimbului curent, pe structura SQDCP (Siguranță, Calitate,
// Livrare, Cost, Oameni). Atingerea unei plăcuțe deschide locul de completare.
function shiftStrip(c) {
  const section = el("section", "", "shiftStrip");
  const head = el("div", "", "todaySectionHead");
  head.append(el("h2", "Tura mea"), el("span", "Schimbul " + c.shift, "agendaCount"));
  section.append(head);
  const legacy = shiftRecords(app.data).find((r) => r.key === c.key);
  const intervals = zoneIntervals(app.data, c.workDay, c.shift, app.data.settings.zone || "");
  const intervalData = intervals.length ? intervalTotals(intervals) : null;
  const rec = intervalData || legacy;
  const staffing = legacy ? recordKpis(legacy) : {};
  const k = rec ? recordKpis(rec) : {};
  const events = safetyEvents(app.data).filter((e) => e.date === c.workDay && e.shift === c.shift);
  const incidents = events.filter((e) => e.type === "incident").length;
  const tour = auditStatus(app.data, c.key)[0];
  const openHandover = () => runAction({ kind: "handover" });
  const tiles = [
    ["S", "Siguranță", incidents ? incidents + (incidents === 1 ? " incident" : " incidente") : events.length ? events.length + (events.length === 1 ? " raportare" : " raportări") : noData,
      tour ? "Tur " + tour.checked + "/" + tour.total + (tour.nok.length ? " · " + tour.nok.length + " NOK" : "") : "", incidents ? "bad" : "",
      () => (tour ? app.openPage(tour.p) : newSafetyEvent())],
    ["Q", "Rebut", k.scrapPct != null ? fmt(k.scrapPct) + "%" : noData, rec?.scrap != null ? fmt(rec.scrap, 0) + " buc" : "", "", openHandover],
    ["D", "Plan", k.planPct != null ? fmt(k.planPct, 0) + "%" : noData, rec?.plan != null && rec.produced != null ? fmt(rec.produced) + "/" + fmt(rec.plan) + " · Δ " + fmt(k.variance) : "",
      k.planPct != null && k.planPct < 100 ? "warn" : "", openHandover],
    ["C", "Oprire", rec?.downtime != null ? fmt(rec.downtime, 0) + " min" : noData, "", "", openHandover],
    ["P", "Prezenți", legacy?.planned != null && legacy?.present != null ? fmt(legacy.present, 0) + "/" + fmt(legacy.planned, 0) : noData,
      staffing.absencePct ? fmt(staffing.absencePct, 0) + "% absențe" : "", "", openHandover],
  ];
  const grid = el("div", "", "stripGrid");
  for (const [area, name, value, sub, state, run] of tiles) {
    const tile = btn("", run, "stripTile");
    tile.dataset.area = area;
    if (state) tile.dataset.state = state;
    tile.setAttribute("aria-label", name + ": " + value + (sub ? ", " + sub : ""));
    const label = el("span", "", "stripName");
    const marker = el("span", area, "kpiArea");
    marker.setAttribute("aria-hidden", "true");
    label.append(marker, el("span", name));
    tile.append(label, el("strong", value));
    if (sub) tile.append(el("small", sub));
    grid.append(tile);
  }
  section.append(grid);
  if (intervalData) section.append(el("p", "Calitate, livrare și opriri din " + intervals.length + " intervale raportate pentru zona curentă. Efectivul vine din predare.", "formHelp"));
  else if (legacy) section.append(el("p", "Cifre din predare. Verifică aria la care se referă.", "formHelp"));
  if (!rec || (rec.plan == null && rec.produced == null))
    section.append(btn("Completează cifrele schimbului", () => runAction({ kind: "handover" }), "todayMore", "chevron"));
  return section;
}

export function today(c) {
  const main = document.querySelector("main");
  const home = el("div", "", "todayView");
  const grid = el("div", "", "todayGrid");
  grid.append(header(c), shiftPanel(c));
  const work = el("div", "", "todayWork");
  const agenda = el("section", "", "todayAgenda");
  const updateDeadlines = () => drawAgenda(agenda, c);
  updateDeadlines();
  home.append(grid, shiftStrip(c),
    btn("Plan versus realizat", () => (location.hash = "Producție"), "todayMore", "chart"));
  const ho = handover();
  if (ho?.r) {
    const detailsFromShift = [
      ["Echipamente oprite / instabile", ho.b.cols.find((col) => /^(masini oprite|echipamente oprite)/.test(norm(col.name)))],
      ["Lipsuri de personal / competențe", ho.b.cols.find((col) => /^(absen|lipsuri de personal)/i.test(col.name))],
      ["Verificări și raportări", ho.b.cols.find((col) => col.key === "nextChecks")],
    ];
    const followUp = el("section", "", "shiftStrip");
    followUp.append(el("h2", "De verificat în schimb"));
    for (const [label, col] of detailsFromShift)
      followUp.append(el("p", label + " · " + (ho.r.values[col?.id] || noData)));
    home.append(followUp);
  }
  const all = advice(app.data, c);
  const tips = all.filter((a) => a.level !== "good");
  const shown = tips.length ? tips : all.slice(0, 1);
  if (shown.length)
    work.append(adviceSection(shown, {
      limit: 2, title: "Sfaturi pentru tura ta",
      more: { label: "Toate sfaturile", run: () => (location.hash = "Analiză") },
    }));
  work.append(agenda);
  for (const page of active()) {
    for (const block of page.blocks) {
      if (block.type === "routine" && block.items.length)
        work.append(routineSection(block, { ...c, pageId: page.id, updateDeadlines }));
    }
  }
  home.append(work);
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
