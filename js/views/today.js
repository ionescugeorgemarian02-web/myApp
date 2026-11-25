import { intervalTotals, readKey, ROUTINE, shiftEnd } from "../operations.js";
import { zoneIntervals, productionFigures, addInterval, coverageLabel } from "./production.js";
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
import { checklist } from "../blocks/checklist.js";
import { firstWeek, LINE_STATES } from "../metrics.js";
import { formBlock, nextUp, shiftClock, slotState, sectionOf, linesNow, formStatus } from "../ept.js";
import { itemCard } from "../blocks/eptform.js";

const longDate = { weekday: "long", day: "numeric", month: "long" };
const duration = (m) => (m >= 60 ? Math.floor(m / 60) + " h" + (m % 60 ? " " + (m % 60) + " min" : "") : m + " min");
const go = (route) => () => app.navigate(route);

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
  const lineCount = linesNow(app.data, c)?.entries.length || 0;
  zone.append(el("span", "Zonă de lucru", "formHelp"), el("strong", (app.data.settings.zone || "Zonă neconfigurată") +
    (app.data.settings.zone && lineCount ? " · " + lineCount + " linii" : "")));
  context.append(zone, shiftSelector(c));
  head.append(date, el("h1", "Panou de schimb"), context, shiftPulse(c));
  if (!app.data.settings.scheduleConfirmed || c.automatic !== c.shift)
    head.append(el("p", !app.data.settings.scheduleConfirmed ? "Program neconfirmat" : "Schimb selectat manual", "contextStatus"));
  return head;
}

// Timpul rămas din schimb, rutina EPT și liniile verificate, dintr-o privire.
function shiftPulse(c) {
  const box = el("div", "", "shiftPulse");
  const k = shiftClock(c);
  const time = el("p", "", "heroTime");
  time.append(el("span", k.before ? "Schimbul începe peste " + duration(k.startsIn) : "Mai sunt " + duration(k.left), "heroLeft"),
    el("span", k.before ? k.from + "–" + k.to : Math.round((k.elapsed / k.len) * 100) + "% din schimb"));
  const bar = el("div", "", "heroBar");
  bar.setAttribute("role", "progressbar");
  bar.setAttribute("aria-label", "Cât a trecut din schimb");
  const pct = k.before ? 0 : Math.round((k.elapsed / k.len) * 100);
  bar.setAttribute("aria-valuemin", "0");
  bar.setAttribute("aria-valuemax", "100");
  bar.setAttribute("aria-valuenow", String(pct));
  const fill = el("i");
  fill.style.width = pct + "%";
  bar.append(fill);
  box.append(time, bar);
  const stats = el("div", "", "heroStats");
  const fb = formBlock(app.data);
  if (fb) {
    const st = formStatus(fb.b, c);
    const s = btn("", go("Rutina"), "heroStat");
    s.append(el("small", "Rutina EPT"), el("strong", st.da + "/" + st.total), el("span", st.nu ? st.nu + " NU" : "DA bifate", st.nu ? "bad" : ""));
    s.setAttribute("aria-label", "Rutina EPT: " + st.da + " din " + st.total + " DA" + (st.nu ? ", " + st.nu + " NU" : ""));
    stats.append(s);
  }
  const ln = linesNow(app.data, c);
  if (ln?.entries.length) {
    const t = ln.totals;
    const s = btn("", go("Producție"), "heroStat");
    s.append(el("small", "Linii verificate"), el("strong", t.checked + "/" + t.total),
      el("span", t.stop ? t.stop + (t.stop === 1 ? " oprită" : " oprite") : t.warn ? t.warn + " atenție" : t.pct != null ? fmt(t.pct, 0) + "% plan" : t.checked ? "fără probleme" : "de verificat",
        t.stop ? "bad" : t.warn ? "warn" : ""));
    s.setAttribute("aria-label", "Linii verificate: " + t.checked + " din " + t.total);
    stats.append(s);
  }
  if (stats.childElementCount) box.append(stats);
  return box;
}

function cardHead(eyebrow, title, count, countCls = "") {
  const head = el("div", "", "cardTop");
  const t = el("div");
  if (eyebrow) t.append(el("span", eyebrow, "eyebrow"));
  t.append(el("h2", title));
  head.append(t);
  if (count != null) head.append(el("span", count, "agendaCount " + countCls));
  return head;
}

// Ce urmează din fișa EPT, după ora din schimb.
function nowCard(c) {
  const fb = formBlock(app.data);
  if (!fb) return null;
  const { b, p } = fb;
  const up = nextUp(b, c);
  const st = up.status;
  const sec = sectionOf(up.phase === "before" ? "before" : up.phase);
  const box = el("section", "", "todayCard nowCard");
  box.dataset.tone = sec.tone;
  box.append(cardHead(up.phase === "before" ? "Înainte de schimb" : "Acum în rutina EPT", sec.title, st.da + "/" + st.total));
  const slots = slotState(b, c);
  box.dataset.sig = [up.phase, slots.due?.time, slots.due?.late, slots.late.length].join("/");
  if (slots.due) {
    const due = btn("", go("Producție"), "dueCheck");
    due.dataset.late = String(!!slots.due.late);
    const older = slots.late.filter((x) => x !== slots.due).length;
    const text = el("span", "", "dueText");
    text.append(el("strong", (slots.due.late ? "Întârziată: verificarea de la " : "Verificarea de la ") + slots.due.time),
      el("small", "Cerințele clientului și panourile EPT pe linii" + (older ? " · încă " + older + " nebifată" + (older > 1 ? "e" : "") : "")));
    const ic = el("span", "", "dueIcon");
    ic.append(icon("clock"));
    due.append(ic, text, icon("chevron"));
    box.append(due);
  }
  const ctx = { ...c, save: app.save, refresh: app.refresh, pageId: p.id };
  const list = el("div", "", "nowList");
  for (const i of up.list) {
    const tag = el("p", i.group, "nowGroup");
    tag.dataset.tone = sectionOf(i.sec).tone;
    list.append(tag, itemCard(b, i, ctx, () => app.refresh()));
  }
  if (!up.list.length)
    list.append(el("p", st.nu ? "Fișa zilnică e completă, cu " + st.nu + " NU. Verifică dacă ai escaladat." : "Toate activitățile zilnice sunt bifate. Bravo!", "routineDone"));
  box.append(list);
  if (up.behind.length) {
    const first = up.behind[0];
    box.append(btn("Rămase din „" + sectionOf(first.sec).short + "”: " + up.behind.length,
      () => app.navigate("Rutina", "item-" + first.id), "todayMore warnText", "chevron"));
  }
  if (st.weekPending.length && new Date(c.date + "T12:00").getDay() >= 4)
    box.append(el("p", "Săptămânal: " + st.weekPending.length + " activități încă nefăcute.", "formHelp"));
  box.append(btn("Deschide fișa completă", go("Rutina"), "todayMore", "chevron"));
  return box;
}

// Liniile din subordine, dintr-o privire.
function linesCard(c) {
  const ln = linesNow(app.data, c);
  if (!ln || !ln.entries.length) return null;
  const box = el("section", "", "todayCard linesCard");
  const t = ln.totals;
  box.append(cardHead(app.data.settings.zone ? "Zona " + app.data.settings.zone + " · liniile" : "Liniile mele", t.checked === t.total ? "Toate verificate" : t.checked + " din " + t.total + " verificate",
    t.pct != null ? fmt(t.pct, 0) + "% plan" : null, t.pct != null && t.pct < 90 && ln.fraction >= 1 ? "bad" : ""));
  const grid = el("div", "", "lineChips");
  const behind = new Set(ln.behind.map((e) => e.name));
  for (const e of ln.entries) {
    const chip = btn("", () => app.openPage(ln.p, "line-" + e.name), "lineChip");
    chip.dataset.st = e.st || "none";
    if (behind.has(e.name)) chip.dataset.behind = "true";
    const sub = e.plan > 0 && e.real != null ? fmt((e.real / e.plan) * 100, 0) + "%" : e.st ? LINE_STATES[e.st] : "–";
    chip.append(el("strong", e.name), el("small", sub));
    chip.setAttribute("aria-label", e.name + ": " + (e.st ? LINE_STATES[e.st] : "neverificată") + (e.real != null ? ", realizat " + e.real : ""));
    grid.append(chip);
  }
  box.append(grid);
  const legend = el("p", "", "lineLegend");
  for (const [st, label] of [["ok", "OK"], ["warn", "Atenție"], ["stop", "Oprită"], ["none", "Neverificată"]]) {
    const x = el("span", label);
    x.dataset.st = st;
    legend.append(x);
  }
  box.append(legend);
  return box;
}

// Planul primei săptămâni: punctele zilei de azi, cu bifă directă.
function planCard(c) {
  const plan = firstWeek(app.data, c);
  if (!plan || (!plan.running && !plan.after)) return null;
  const box = el("section", "", "todayCard planCard");
  if (plan.today) {
    const items = plan.today.list.items;
    const done = items.filter((i) => i.checked).length;
    box.append(cardHead("Planul primei săptămâni", plan.today.name + " · " + roDate(plan.today.date, { day: "numeric", month: "long" }), done + "/" + items.length));
    box.append(checklist(plan.today.list, { ...c, pageId: plan.p.id }, true));
  } else if (plan.running) {
    box.append(cardHead("Planul primei săptămâni", "Azi nu ai puncte în plan", null));
  } else {
    box.append(cardHead("Planul primei săptămâni", "Au rămas puncte nebifate", String(plan.left.length), "bad"));
  }
  if (plan.behind.length)
    box.append(btn((plan.today ? "Rămase din zilele trecute: " : "Vezi punctele rămase: ") + plan.behind.length, () => app.openPage(plan.p), "todayMore warnText", "chevron"));
  else box.append(btn("Deschide planul săptămânii", () => app.openPage(plan.p), "todayMore", "chevron"));
  return box;
}

const routinePhases = new WeakMap();

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
      const panel = details([label, tally, icon("down")], "phase-" + block.id + "-" + c.key + "-" + phase, "routinePhase");
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
  function updatePhase(context) {
    const window = app.data.settings.scheduleConfirmed && shiftEnd(context);
    const start = context.hours[context.shift - 1];
    const elapsed = (Date.parse(context.date + "T" + context.time + "Z") -
      Date.parse(context.workDay + "T" + start + "Z")) / 60000;
    const scheduled = window
      ? (window.remaining <= 60 ? ROUTINE[3][0] : elapsed < 60 ? ROUTINE[1][0] : ROUTINE[2][0])
      : app.data.settings.scheduleConfirmed && context.shift > context.automatic ? ROUTINE[0][0] : null;
    const phase = phases.has(scheduled) ? scheduled
      : [...phases].find(([, group]) => group.items.some((item) => !item.checked))?.[0];
    const state = routinePhases.get(block);
    if (state?.key === context.key && state.phase === phase) return;
    const previous = state?.key === context.key && phases.get(state.phase);
    if (previous && !previous.panel.contains(document.activeElement)) previous.panel.open = false;
    if (phase) {
      const panel = phases.get(phase).panel;
      panel.open = true;
      app.open.add(panel.dataset.key);
    }
    routinePhases.set(block, { key: context.key, phase });
  }
  update();
  section.updatePhase = updatePhase;
  updatePhase(c);
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
    title, text, shortText: excerpt(entry.label), level, action: toRecord(entry, field, label), escalation: entry,
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
  // Liniile și rutina EPT din schimbul curent.
  const ln = linesNow(app.data, c);
  for (const e of ln?.stopped || [])
    add("line-stop-" + e.name, { title: e.name + " este oprită", shortText: e.name + " oprită" + (e.obs.trim() ? " · " + excerpt(e.obs.trim()) : ""), level: "critical",
      text: "Notează cauza, anunță mentenanța și superiorul direct dacă afectează planul.",
      action: { kind: "page", pageId: ln.p.id, key: "line-" + e.name, label: "Deschide linia" } });
  const fb = formBlock(app.data);
  if (fb) {
    const late = slotState(fb.b, c).late;
    if (late.length)
      add("two-hour", { title: "Verificarea de la " + late.at(-1).time + " nu e bifată",
        text: "Cerințele clientului și panourile EPT se verifică la fiecare 2 ore, pe fiecare linie.",
        action: { kind: "route", route: "Producție", label: "Fă verificarea" } });
    const st = formStatus(fb.b, c);
    if (st.nu)
      add("routine-nu", { title: st.nu + (st.nu === 1 ? " activitate NU" : " activități NU") + " în rutina EPT",
        text: "Informează imediat superiorul direct și scrie motivul la Observații: " + [...new Set(st.nuItems.map((i) => i.group))].slice(0, 3).join(", ") + ".",
        action: { kind: "page", pageId: fb.p.id, key: "item-" + st.nuItems[0].id, label: "Deschide fișa" } });
  }
  for (const e of ln?.behind || [])
    add("line-behind-" + e.name, { title: e.name + " în urma planului · " + Math.round(e.pace.pace) + "%",
      text: "Ritmul e sub cât trebuia produs până acum. O deviație negativă se escaladează.",
      action: { kind: "page", pageId: ln.p.id, key: "line-" + e.name, label: "Deschide linia" } });
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

function nextAction(c, reminder) {
  if (reminder) return reminder;
  if (handover(c) && app.data.settings.scheduleConfirmed && shiftEnd(c)?.remaining <= 60)
    return { title: "Predarea este verificată", text: "Revizuiește cu colegul riscul rămas și prima acțiune pe care o va verifica.", action: { kind: "handover", label: "Deschide predarea" } };
  const previous = previousHandover(c);
  if (previous?.r && readKey(previous.b, previous.r, "prepared") && !readKey(previous.b, previous.r, "received"))
    return { text: "Întreabă colegul ce risc rămâne și ce verifici prima dată. Confirmă după ce sunt clare.",
      action: { kind: "handover", previous: true, label: "Preia schimbul" } };
  return { text: "Ia planul și totalul realizat din aceeași perioadă. Verifică linia și schimbul înainte să salvezi.",
    action: { kind: "interval", label: "Adaugă interval" } };
}

export function updateTodayAttention(c) {
  document.querySelectorAll(".todayRoutine").forEach((section) => section.updatePhase(c));
  // Faza rutinei EPT, verificarea la 2 ore și timpul rămas urmează ceasul.
  const pulse = document.querySelector(".shiftPulse");
  if (pulse) pulse.replaceWith(shiftPulse(c));
  const now = document.querySelector(".nowCard");
  if (now && !(now.contains(document.activeElement) && document.activeElement.matches("textarea, input"))) {
    const fresh = nowCard(c);
    if (fresh && fresh.dataset.sig !== now.dataset.sig) now.replaceWith(fresh);
  }
  const region = document.querySelector(".attentionRegion");
  if (!region) return;
  const alerts = attention(c);
  const reminder = alerts.find((item) => item.id === "handover-now");
  const next = nextAction(c, reminder);
  const [first, ...rest] = alerts.filter((item) => next !== item);
  const signature = JSON.stringify([first, ...rest, next].map((item) => item && [item.id, item.title, item.text, item.action]));
  if (region.dataset.signature === signature) return;
  region.dataset.signature = signature;
  const run = (item) => item.run || (() => runAction(item.action));
  const alertRow = (item) => {
    const row = el("article", "", "attentionRow");
    row.dataset.level = item.level || "warn";
    const critical = item.level === "critical";
    row.append(el("h3", critical ? item.shortText : item.title),
      el("p", critical ? (item.title.startsWith("Incident") ? "Incident de siguranță · Critic" : "Problemă critică") : item.shortText || item.text, "formHelp"),
      btn(item.action.label, run(item), "todayMore", "chevron"));
    if (item.escalation) row.append(btn("Ciornă SBAR", () => escalationDraft(item.escalation), "sbarAction", "chat"));
    return row;
  };
  const nodes = [];
  if (first) {
    const panel = el("section", "", "attentionPanel");
    panel.dataset.level = first.level || "warn";
    const lead = el("p", "", "attentionLabel");
    lead.append(icon("alert"), el("span", "Necesită atenție"));
    if (first.level === "critical") lead.append(el("strong", "Critică", "attentionSeverity"));
    const actions = el("div", "", "attentionActions");
    actions.append(btn(first.action.label, run(first), "primary", "chevron"));
    if (first.escalation) actions.append(btn("Ciornă SBAR", () => escalationDraft(first.escalation), "sbarAction", "chat"));
    panel.append(lead, el("h2", first.title), el("p", first.text, "attentionText"), actions);
    nodes.push(panel);
  }
  const critical = rest.filter((item) => item.level === "critical");
  if (critical.length) {
    const rows = el("div", "", "criticalAttention");
    rows.append(...critical.map(alertRow));
    nodes.push(rows);
  }

  const nextPanel = el("section", "", "attentionPanel shiftNext");
  const lead = el("p", "", "attentionLabel");
  lead.append(icon("check"), el("span", "Următoarea acțiune"));
  nextPanel.append(lead);
  if (next.title) nextPanel.append(el("h2", next.title));
  if (next.text) nextPanel.append(el("p", next.text, "attentionText"));
  const actions = el("div", "", "attentionActions");
  const open = next.action.kind === "interval" ? () => addInterval(app.current) : run(next);
  actions.append(btn(next.action.label, open, "primary nextAction", next.action.kind === "interval" ? "plus" : "chevron"));
  nextPanel.append(actions);
  if (next.action.kind !== "interval")
    actions.append(btn("Adaugă interval", () => addInterval(app.current), "", "plus"));
  nodes.splice(first ? 1 : 0, 0, nextPanel);

  const otherItems = rest.filter((item) => item.level !== "critical");
  if (otherItems.length) {
    const other = details([el("span", "Alte atenționări (" + otherItems.length + ")"), icon("down")], "attention-more", "otherAttention");
    other.append(...otherItems.map(alertRow));
    nodes.push(other);
  }
  region.replaceChildren(...nodes);
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
  const source = (fields) => {
    const rows = intervalData ? intervals : legacy ? [legacy] : [];
    const label = intervalData || !legacy ? "Intervale de producție" : legacy.fromLines ? "Liniile mele" : "Fișa de predare";
    const complete = rows.filter((row) => fields.every((field) => row[field] != null)).length;
    const status = coverageLabel(rows.length, complete, rows.some((row) => fields.some((field) => row[field] != null)));
    if (status) return label + " · " + status;
    return intervalData ? fmt(rows.length, 0) + (rows.length === 1 ? " interval raportat" : " intervale raportate") : label;
  };
  const openNumbers = intervalData || legacy?.fromLines || linesNow(app.data, c)?.entries.length ? () => { location.hash = "Producție"; } : openHandover;
  const tiles = [
    ["S", "Siguranță", events.length ? incidents + (incidents === 1 ? " incident" : " incidente") : "—",
      "Registrul de siguranță · " + (events.length ? events.length + (events.length === 1 ? " raportare" : " raportări") : "Fără raportări"),
      tour ? "Tur " + tour.checked + "/" + tour.total + (tour.nok.length ? " · " + tour.nok.length + " NOK" : "") : "",
      incidents ? "warn" : "", () => (tour ? app.openPage(tour.p) : newSafetyEvent())],
    ["Q", "Rebut", k.scrapPct != null ? fmt(k.scrapPct) + "%" : "—", source(["produced", "scrap"]),
      rec?.scrap != null ? fmt(rec.scrap, 0) + " buc rebut" : "", "", openNumbers],
    ["D", "Plan", k.planPct != null ? fmt(k.planPct, 0) + "% din plan" : "—", source(["plan", "produced"]),
      rec?.plan != null && rec?.produced != null ? fmt(rec.produced) + " din " + fmt(rec.plan) + " buc" : "",
      k.planPct != null && k.planPct < 100 ? "warn" : "", openNumbers],
    ["C", "Oprire", rec?.downtime != null ? fmt(rec.downtime, 0) + " min" : "—", source(["downtime"]), "", "", openNumbers],
    ["P", "Prezenți", legacy?.planned != null && legacy?.present != null ? fmt(legacy.present, 0) + "/" + fmt(legacy.planned, 0) : "—",
      "Fișa de predare" + (legacy?.planned == null || legacy?.present == null ? " · " +
        (!legacy ? "Fără raportări" : legacy.planned == null && legacy.present == null ? "Fără cifre raportate" : "Date parțiale") : ""),
      staffing.absencePct != null ? fmt(staffing.absencePct, 0) + "% absențe" : "", "", openHandover],
  ];
  const grid = el("div", "", "stripGrid");
  for (const [area, name, value, source, sub, state, run] of tiles) {
    const tile = btn("", run, "stripTile");
    tile.dataset.area = area;
    if (state) tile.dataset.state = state;
    const label = el("span", "", "stripName");
    const marker = el("span", area, "kpiArea");
    marker.setAttribute("aria-hidden", "true");
    label.append(marker, el("span", name));
    tile.append(label, el("strong", value));
    tile.append(el("small", [sub, source].filter(Boolean).join(" · ")));
    grid.append(tile);
  }
  if (intervalData) section.append(productionFigures(intervals));
  else if (legacy) section.append(productionFigures([legacy], "Fișa de predare · aria consemnată în fișă"));
  else section.append(productionFigures([]));
  section.append(grid);
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
  for (const card of [nowCard(c), linesCard(c), planCard(c)]) if (card) work.append(card);
  for (const page of active()) {
    for (const block of page.blocks) {
      if (block.type === "routine" && !block.form && block.items.length)
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
