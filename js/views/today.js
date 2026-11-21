import { intervalTotals, readKey, ROUTINE, shiftEnd } from "../operations.js";
import { zoneIntervals, noData, productionFigures } from "./production.js";
import { app } from "../state.js";
import { el, btn, icon, roDate, confirmShare, details, norm } from "../ui.js";
import { routine } from "../blocks/routine.js";
import { compareNotes, needsReminder } from "../notes.js";
import { noteEditor } from "./notes.js";
import { draftRow } from "../blocks/table.js";
import { active, deadlines, openProblems, problemsTable, handover, previousHandover, report, share } from "../logic.js";
import { shiftRecords, recordKpis, safetyEvents, auditStatus, problems, skillsCoverage } from "../metrics.js";
import { handoverNotice } from "../advice.js";
import { newSafetyEvent, runAction, escalationDraft } from "./advice.js";
import { colByName } from "../records.js";
import { fmt } from "../charts.js";

function shiftSelector(c) {
  const select = el("select", "", "todayShift");
  select.setAttribute("aria-label", "Alege schimbul");
  const hours = c.hours;
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
  const menu = details([icon("plus"), el("span", "Raportează"), icon("down")], null, "todayActions");
  const actions = el("div", "", "actionChoices");
  function add(name, symbol, run) {
    actions.append(btn(name, () => {
      menu.open = false;
      menu.querySelector("summary").focus({ preventScroll: true });
      run();
    }, "", symbol));
  }
  if (handover()) add("Predare", "handover", () => runAction({ kind: "handover" }));
  const pt = problemsTable();
  if (pt) add("Problemă", "alert", () => {
    const row = draftRow(pt.b, c);
    app.navigate("Probleme", "row-" + row.id);
  });
  if (app.data.pages.some((p) => !p.archived && p.blocks.some((b) => b.cols?.some((col) => col.key === "safetyType"))))
    add("Siguranță", "shield", () => newSafetyEvent());
  const tour = auditStatus(app.data, c.key)[0];
  if (tour) add("Tur pe linie", "audit", () => app.openPage(tour.p));
  const stops = app.data.pages.find((page) => !page.archived && page.blocks.some((block) =>
    block.cols?.some((column) => column.key === "stopEquipment")));
  if (stops) add("Registrul opririlor", "clock", () => app.openPage(stops));
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
  const head = el("section", "", "todayContext");
  const date = el("p", "", "todayDate");
  date.append(icon("today"), el("span", roDate(c.workDay, {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  })));
  const context = el("div", "", "contextLine");
  const zone = el("div");
  zone.append(el("span", "Zonă de lucru", "formHelp"), el("strong", app.data.settings.zone || "Zonă neconfigurată"));
  context.append(zone, shiftSelector(c));
  head.append(date, el("h1", "Panou de schimb"), context);
  if (!app.data.settings.scheduleConfirmed || c.automatic !== c.shift)
    head.append(el("p", !app.data.settings.scheduleConfirmed ? "Program neconfirmat" : "Schimb selectat manual", "contextStatus"));
  return head;
}

function routineSection(block, c) {
  const section = el("section", "", "todayRoutine");
  const head = el("div", "", "todaySectionHead");
  const count = el("span", "", "routineProgress");
  head.append(el("h2", block.title), count);
  const progress = el("progress", "", "routineBar");
  progress.max = block.items.length;
  progress.setAttribute("aria-label", block.title);
  section.append(head, progress);
  const list = routine(block, c, true);
  const lines = list.querySelector(".lines");
  const phases = new Map();
  const phaseNames = new Set(ROUTINE.map(([name]) => name));
  for (const [index, row] of [...lines.children].entries()) {
    const item = block.items[index];
    const [prefix, ...title] = item.title.split(" · ");
    const phase = phaseNames.has(prefix) ? prefix : "Puncte suplimentare";
    if (phaseNames.has(prefix) && title.length) row.querySelector(".taskTitle").textContent = title.join(" · ");
    if (!phases.has(phase)) {
      const label = el("span", phase);
      const tally = el("span", "", "formHelp");
      const panel = details([label, tally, icon("down")], "phase-" + block.id + "-" + phase, "routinePhase");
      const content = el("div", "", "lines");
      panel.append(content);
      phases.set(phase, { panel, content, tally, items: [] });
      list.append(panel);
    }
    const group = phases.get(phase);
    group.items.push(item);
    group.content.append(row);
  }
  lines.remove();
  function update() {
    const done = block.items.filter((item) => item.checked).length;
    progress.value = done;
    count.textContent = done + " / " + block.items.length;
    for (const { items, tally } of phases.values())
      tally.textContent = items.filter((item) => item.checked).length + " / " + items.length;
  }
  update();
  section.append(list);
  return section;
}

const toRecord = (entry, field, label) => ({
  kind: "page", pageId: entry.p.id, key: "row-" + entry.r.id, field, label,
});
function attention(c) {
  const list = new Map();
  const add = (id, item) => { if (!list.has(id)) list.set(id, { ...item, id }); };
  const excerpt = (value) => value.length > 96 ? value.slice(0, 93).trimEnd() + "…" : value;
  const urgent = (entry, title, text, field, label, level) => add("row-" + entry.r.id, {
    title, text, level, action: toRecord(entry, field, label), escalation: entry,
  });
  for (const incident of safetyEvents(app.data).filter((e) => e.type === "incident" && !e.closed)) {
    const field = colByName(incident.b, "actiune imediata");
    urgent(incident, "Incident de siguranță deschis", excerpt(incident.label) + ". Verifică măsura imediată în registrul de siguranță.",
      norm(field?.name), "Deschide incidentul", "critical");
  }
  const registry = problems(app.data, c).filter((entry) => !entry.closed);
  const priority = (entry) => readKey(entry.b, entry.r, "urgency");
  for (const entry of registry.filter((e) => priority(e) === "Critică"))
    urgent(entry, "Problemă critică deschisă", excerpt(entry.label) + ". Verifică măsura imediată în fișa problemei.",
      "containment", "Deschide problema", "critical");
  const settings = app.data.settings;
  if (!settings.zone)
    add("zone", { title: "Zonă neconfigurată", text: "Completează zona sau linia în Setări pentru a filtra producția.",
      action: { kind: "settings", key: "settings-line", field: "zone", label: "Configurează zona" } });
  if (!settings.scheduleConfirmed)
    add("schedule", { title: "Program neconfirmat", text: "Confirmă orele în Setări pentru atenționarea de final de schimb.",
      action: { kind: "settings", key: "settings-schedule", field: "hours", label: "Confirmă programul" } });
  const handover = handoverNotice(app.data, c);
  if (handover) add(handover.id, handover);
  for (const entry of registry) {
    const late = entry.due && entry.due <= c.date;
    if (priority(entry) === "Urgentă")
      urgent(entry, "Problemă urgentă deschisă", excerpt(entry.label) + ". Revizuiește măsura imediată și escaladarea în fișă.",
        "containment", "Deschide problema", "warn");
    else if (late || !entry.hasOwner || !entry.due)
      add("row-" + entry.r.id, {
        title: late ? (entry.overdue ? "Termen depășit" : "Termen azi") : "Problemă fără responsabil sau termen",
        text: entry.label + ". " + (!entry.hasOwner ? "Completează responsabilul în fișa problemei."
          : late ? "Verifică stadiul în fișa problemei." : "Completează termenul în fișa problemei."),
        action: toRecord(entry, !entry.hasOwner ? "responsabil" : late ? "stare" : "termen", "Deschide problema"),
      });
  }
  for (const audit of auditStatus(app.data, c.key))
    for (const { item } of audit.unhandled)
      add("audit-" + item.id, { title: "Constatare NOK fără acțiune", text: item.title + ". Consemnează acțiunea din turul pe linie.",
        action: { kind: "page", pageId: audit.p.id, key: "audit-" + item.id, label: "Deschide constatarea" } });
  for (const entry of deadlines().filter((item) => item.due <= c.date))
    add(entry.key, { title: entry.due < c.date ? "Termen depășit" : "Termen azi",
      text: entry.text + " · " + roDate(entry.due) + ". Verifică stadiul în „" + entry.p.title + "”.",
      action: { kind: "page", pageId: entry.p.id, key: entry.key, field: entry.field, label: "Deschide înregistrarea" } });
  for (const entry of openProblems())
    add(entry.key, { title: entry.kind, text: entry.text + ". Revizuiește stadiul în „" + entry.p.title + "”.",
      action: { kind: "page", pageId: entry.p.id, key: entry.key, label: "Deschide fișa" } });
  for (const note of app.data.notes.filter((n) => needsReminder(n, c.date, c.time))
    .sort((a, b) => compareNotes(a, b, c.date, c.time))) {
    add("note-" + note.id, { title: note.due ? "Notiță de urmărit" : "Notiță importantă",
      text: note.text, run: () => noteEditor(note.source, note), action: { label: "Deschide notița" } });
  }
  return [...list.values()];
}

function nextAction(c) {
  const previous = previousHandover(c);
  if (previous?.r && readKey(previous.b, previous.r, "prepared") && !readKey(previous.b, previous.r, "received"))
    return { title: "Preluarea schimbului anterior", text: "Revizuiește fișa predată și confirmă preluarea.",
      action: toRecord(previous, "received", "Preia schimbul anterior") };
  const current = handover(c);
  if (app.data.settings.scheduleConfirmed && shiftEnd(c)?.remaining <= 60 && current?.r &&
      readKey(current.b, current.r, "prepared"))
    return { title: "Predarea este verificată", text: "Verifică fișa înainte să pregătești rezumatul.",
      action: { kind: "handover", label: "Deschide predarea" } };
  return { title: "Actualizează producția", text: "Verifică planul și înregistrează realizatul pe intervale.",
    action: { kind: "route", route: "Producție", label: "Deschide producția" } };
}

export function updateTodayAttention(c) {
  const region = document.querySelector(".attentionRegion");
  if (!region) return;
  const [first, ...rest] = attention(c);
  const entry = first || nextAction(c);
  const signature = JSON.stringify([entry, ...rest].map((item) => [item.id, item.title, item.text, item.action]));
  if (region.dataset.signature === signature) return;
  region.dataset.signature = signature;
  const panel = el("section", "", "attentionPanel");
  panel.dataset.level = entry.level || (first ? "warn" : "normal");
  const lead = el("p", "", "attentionLabel");
  lead.append(icon(first ? "alert" : "check"), el("span", first ? "Necesită atenție" : "Următoarea acțiune"));
  if (entry.level === "critical") lead.append(el("strong", "Critică", "attentionSeverity"));
  const run = (item) => item.run || (() => runAction(item.action));
  const actions = el("div", "", "attentionActions");
  actions.append(btn(entry.action.label, run(entry), "primary nextAction", "chevron"));
  if (entry.escalation) actions.append(btn("Ciornă SBAR", () => escalationDraft(entry.escalation), "sbarAction", "chat"));
  panel.append(lead, el("h2", entry.title), el("p", entry.text, "attentionText"), actions);
  region.replaceChildren(panel);
  if (rest.length) {
    const other = details([el("span", "Alte atenționări (" + rest.length + ")"), icon("down")], "attention-more", "otherAttention");
    for (const item of rest) {
      const row = el("article", "", "attentionRow");
      const title = el("h3", (item.level === "critical" ? "Critică · " : "") + item.title);
      row.append(title, el("p", item.text, "formHelp"), btn(item.action.label, run(item), "todayMore", "chevron"));
      if (item.escalation) row.append(btn("Ciornă SBAR", () => escalationDraft(item.escalation), "sbarAction", "chat"));
      other.append(row);
    }
    region.append(other);
  }
}

// Cifrele schimbului curent, pe structura SQDCP (Siguranță, Calitate,
// Livrare, Cost, Oameni). Atingerea unei plăcuțe deschide locul de completare.
function shiftStrip(c) {
  const section = el("section", "", "shiftStrip");
  const head = el("div", "", "todaySectionHead");
  head.append(el("h2", "Indicatorii schimbului"));
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
  const openNumbers = intervalData ? () => { location.hash = "Producție"; } : openHandover;
  const tiles = [
    ["S", "Siguranță", incidents ? incidents + (incidents === 1 ? " incident" : " incidente") : events.length ? events.length + (events.length === 1 ? " raportare" : " raportări") : noData,
      tour ? "Tur " + tour.checked + "/" + tour.total + (tour.nok.length ? " · " + tour.nok.length + " NOK" : "") : "", incidents ? "bad" : "",
      () => (tour ? app.openPage(tour.p) : newSafetyEvent())],
    ["Q", "Rebut", k.scrapPct != null ? fmt(k.scrapPct) + "%" : noData, rec?.scrap != null ? fmt(rec.scrap, 0) + " buc" : "", "", openNumbers],
    ["D", "Plan", k.planPct != null ? fmt(k.planPct, 0) + "%" : noData, rec?.plan != null && rec.produced != null ? fmt(rec.produced) + "/" + fmt(rec.plan) + " · Δ " + fmt(k.variance) : "",
      k.planPct != null && k.planPct < 100 ? "warn" : "", openNumbers],
    ["C", "Oprire", rec?.downtime != null ? fmt(rec.downtime, 0) + " min" : noData, "", "", openNumbers],
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
  if (intervalData) section.append(productionFigures(intervals));
  else if (legacy) section.append(productionFigures([legacy], "Fișa de predare · aria consemnată în fișă"));
  else section.append(productionFigures([]));
  section.append(grid);
  if (intervalData) section.append(el("p", "Calitate, livrare și opriri din " + intervals.length + " intervale raportate pentru zona curentă. Efectivul vine din predare.", "formHelp"));
  else if (legacy) section.append(el("p", "Cifre din predare. Verifică aria la care se referă.", "formHelp"));
  return section;
}

export function today(c) {
  const main = document.querySelector("main");
  const home = el("div", "", "todayView");
  const top = el("div", "", "todayOverview");
  const tools = el("div", "", "todayQuickActions");
  tools.append(shiftActions(c), btn("Adaugă notiță", () => noteEditor(), "", "notes"));
  const context = el("div", "", "contextStack");
  context.append(header(c), tools);
  const region = el("div", "", "attentionRegion");
  region.setAttribute("aria-live", "polite");
  top.append(context, region);

  const work = el("div", "", "todayWork");
  for (const page of active()) {
    for (const block of page.blocks) {
      if (block.type === "routine" && block.items.length)
        work.append(routineSection(block, { ...c, pageId: page.id, updateDeadlines: () => updateTodayAttention(app.current) }));
    }
  }
  const skills = skillsCoverage(app.data, c.shift);
  if (skills.gaps.length) work.append(btn("Competențe sub necesar · " + skills.gaps.map((entry) => entry.post).join(", "),
    () => app.openPage(skills.block.p), "todayMore"));
  const lower = el("div", "", "todayLower");
  lower.append(work, shiftStrip(c));
  home.append(top, lower);
  main.append(home);
  updateTodayAttention(c);
}

export function link(text, tag, cls, fn) {
  let b = btn("", fn, "linkRow");
  let t = el("span", "", "linkText");
  t.append(el("span", text));
  if (tag) t.append(el("span", tag, cls));
  b.append(t, icon("chevron"));
  return b;
}
