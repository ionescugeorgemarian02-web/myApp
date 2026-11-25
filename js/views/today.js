import { app } from "../state.js";
import { el, btn, icon, roDate, confirmShare, details } from "../ui.js";
import { routine } from "../blocks/routine.js";
import { checklist } from "../blocks/checklist.js";
import { compareNotes, needsReminder } from "../notes.js";
import { noteEditor, noteRow } from "./notes.js";
import { newRow } from "../blocks/table.js";
import { active, deadlines, openProblems, problemsTable, report, share } from "../logic.js";
import { shiftRecords, recordKpis, safetyEvents, auditStatus, firstWeek, LINE_STATES } from "../metrics.js";
import { formBlock, nextUp, shiftClock, slotState, sectionOf, linesNow } from "../ept.js";
import { itemCard } from "../blocks/eptform.js";
import { advice } from "../advice.js";
import { adviceSection, newSafetyEvent, runAction } from "./advice.js";
import { fmt } from "../charts.js";

const expandedRoutines = new Set();
const longDate = { weekday: "long", day: "numeric", month: "long" };
const duration = (m) => (m >= 60 ? Math.floor(m / 60) + " h" + (m % 60 ? " " + (m % 60) + " min" : "") : m + " min");
const go = (route) => () => (location.hash = route);

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

// Antetul: ziua, schimbul, cât a mai rămas și unde ești cu rutina și liniile.
function hero(c) {
  const box = el("section", "", "todayHero");
  const top = el("div", "", "heroTop");
  const date = el("p", "", "todayDate");
  date.append(icon("today"), el("span", roDate(c.date, longDate)));
  top.append(date, shiftSelector(c));
  const k = shiftClock(c);
  const time = el("p", "", "heroTime");
  time.append(el("span", k.from + " – " + k.to),
    el("span", k.before ? "începe peste " + duration(k.startsIn) : "mai sunt " + duration(k.left), "heroLeft"));
  const bar = el("div", "", "heroBar");
  bar.setAttribute("role", "progressbar");
  bar.setAttribute("aria-label", "Cât a trecut din schimb");
  bar.setAttribute("aria-valuemin", "0");
  bar.setAttribute("aria-valuemax", "100");
  const pct = k.before ? 0 : Math.round((k.elapsed / k.len) * 100);
  bar.setAttribute("aria-valuenow", String(pct));
  const fill = el("i");
  fill.style.width = pct + "%";
  bar.append(fill);
  box.append(top, el("h1", "Schimbul " + c.shift), time, bar);
  if (c.workDay !== c.date) box.append(el("p", "Schimb început pe " + roDate(c.workDay, longDate), "heroNote"));
  const stats = el("div", "", "heroStats");
  const fb = formBlock(app.data);
  if (fb) {
    const st = nextUp(fb.b, c).status;
    const s = btn("", go("Rutina"), "heroStat");
    s.append(el("small", "Rutina EPT"), el("strong", st.da + "/" + st.total), el("span", st.nu ? st.nu + " NU" : "DA", st.nu ? "bad" : ""));
    s.setAttribute("aria-label", "Rutina EPT: " + st.da + " din " + st.total + " DA" + (st.nu ? ", " + st.nu + " NU" : ""));
    stats.append(s);
  }
  const ln = linesNow(app.data, c);
  if (ln?.entries.length) {
    const t = ln.totals;
    const s = btn("", go("Linii"), "heroStat");
    s.append(el("small", "Linii verificate"), el("strong", t.checked + "/" + t.total),
      el("span", t.stop ? t.stop + (t.stop === 1 ? " oprită" : " oprite") : t.warn ? t.warn + " atenție" : t.pct != null ? fmt(t.pct, 0) + "% plan" : t.checked ? "fără probleme" : "de verificat", t.stop ? "bad" : t.warn ? "warn" : ""));
    s.setAttribute("aria-label", "Linii verificate: " + t.checked + " din " + t.total);
    stats.append(s);
  }
  if (stats.childElementCount) box.append(stats);
  return box;
}

// Acțiunile de schimb, la vedere (o atingere).
function quickActions(c) {
  const row = el("div", "", "quickActions");
  row.setAttribute("role", "group");
  row.setAttribute("aria-label", "Acțiuni rapide");
  const add = (label, symbol, run, cls = "") => {
    const b = btn("", run, "quick " + cls);
    const circle = el("span", "", "quickIcon");
    circle.append(icon(symbol));
    b.append(circle, el("span", label));
    row.append(b);
  };
  add("Notiță", "plus", () => noteEditor(), "main");
  const pt = problemsTable();
  if (pt) add("Problemă", "alert", () => {
    const r = newRow(pt.b, c);
    app.save();
    app.openPage(pt.p, "row-" + r.id);
  });
  if (app.data.pages.some((p) => !p.archived && p.blocks.some((b) => b.cols?.some((col) => col.key === "safetyType"))))
    add("Siguranță", "shield", () => newSafetyEvent());
  add("Predare", "handover", () => runAction({ kind: "handover" }));
  add("Rezumat", "send", async () => {
    const text = report();
    if (await confirmShare(text)) await share(text);
  });
  return row;
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
  box.append(cardHead(up.phase === "before" ? "Înainte de schimb" : "Acum în rutină", sec.title, st.da + "/" + st.total));
  const slots = slotState(b, c);
  if (slots.due) {
    const due = btn("", go("Linii"), "dueCheck");
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
  const ctx = { ...c, pageId: p.id };
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
    box.append(btn("Rămase din „" + sectionOf(first.sec).short + "”: " + up.behind.length, () => {
      location.hash = "Rutina";
      setTimeout(() => document.getElementById("ept-" + first.sec)?.scrollIntoView({ block: "start" }), 60);
    }, "todayMore warnText", "chevron"));
  }
  if (st.weekPending.length && new Date(c.date + "T12:00").getDay() >= 4)
    box.append(el("p", "Săptămânal: " + st.weekPending.length + " activități încă nefăcute.", "formHelp"));
  box.append(btn("Deschide fișa completă", go("Rutina"), "todayMore", "chevron"));
  return box;
}

// Liniile din subordine, dintr-o privire.
function linesCard(c) {
  const ln = linesNow(app.data, c);
  if (!ln) return null;
  const box = el("section", "", "todayCard linesCard");
  const t = ln.totals;
  box.append(cardHead("Liniile mele", t.checked === t.total && t.total ? "Toate verificate" : t.checked + " din " + t.total + " verificate",
    t.pct != null ? fmt(t.pct, 0) + "% plan" : null, t.pct != null && t.pct < 90 && ln.fraction >= 1 ? "bad" : ""));
  if (!ln.entries.length) {
    box.append(el("p", "Adaugă liniile în Setări.", "empty"));
    return box;
  }
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

function routineSection(block, c) {
  const section = el("section", "", "todayRoutine todayCard");
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
  section.append(cardHead("", "De urmărit", String(entries.length)));
  function row({ note, entry }) {
    if (note) return noteRow(note, c);
    const late = entry.due && entry.due < c.date;
    const tag = late ? "Restant · " + roDate(entry.due) : entry.due ? "Azi" : entry.kind || "Problemă deschisă";
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

// Cifrele schimbului curent, pe structura SQDCP (Siguranță, Calitate,
// Livrare, Cost, Oameni). Atingerea unei plăcuțe deschide locul de completare.
function shiftStrip(c) {
  const section = el("section", "", "shiftStrip todayCard");
  section.append(cardHead("Cifrele schimbului", "Tura mea", null));
  const rec = shiftRecords(app.data).find((r) => r.key === c.key);
  const k = rec ? recordKpis(rec) : {};
  const events = safetyEvents(app.data).filter((e) => e.date === c.workDay);
  const incidents = events.filter((e) => e.type === "incident").length;
  const tour = auditStatus(app.data, c.key)[0];
  const ln = linesNow(app.data, c);
  const openHandover = () => runAction({ kind: "handover" });
  const openNumbers = ln?.entries.length ? go("Linii") : openHandover;
  const tiles = [
    ["S", "Siguranță", incidents ? incidents + (incidents === 1 ? " incident" : " incidente") : events.length ? events.length + (events.length === 1 ? " raportare" : " raportări") : "0 incidente",
      tour ? "Tur " + tour.checked + "/" + tour.total + (tour.nok.length ? " · " + tour.nok.length + " NOK" : "") : "", incidents ? "bad" : "",
      () => (tour ? app.openPage(tour.p) : newSafetyEvent())],
    ["Q", "Rebut", k.scrapPct != null ? fmt(k.scrapPct) + "%" : "–", rec?.scrap != null ? fmt(rec.scrap, 0) + " buc" : "", "", openNumbers],
    ["D", "Plan", k.planPct != null ? fmt(k.planPct, 0) + "%" : "–", rec?.plan != null ? fmt(rec.produced ?? 0, 0) + "/" + fmt(rec.plan, 0) : "",
      k.planPct != null && k.planPct < 100 && shiftClock(c).left <= 60 ? "warn" : "", openNumbers],
    ["C", "Oprire", rec?.downtime != null ? fmt(rec.downtime, 0) + " min" : "–", ln?.totals.stop ? ln.totals.stop + (ln.totals.stop === 1 ? " linie oprită" : " linii oprite") : "", ln?.totals.stop ? "bad" : "", openNumbers],
    ["P", "Prezenți", rec?.planned != null && rec?.present != null ? fmt(rec.present, 0) + "/" + fmt(rec.planned, 0) : "–",
      k.absencePct ? fmt(k.absencePct, 0) + "% absențe" : "", "", openHandover],
  ];
  const grid = el("div", "", "stripGrid");
  for (const [area, name, value, sub, state, run] of tiles) {
    const tile = btn("", run, "stripTile");
    tile.dataset.area = area;
    if (state) tile.dataset.state = state;
    tile.setAttribute("aria-label", name + ": " + value + (sub ? ", " + sub : ""));
    tile.append(el("span", name, "stripName"), el("strong", value), el("small", sub || " "));
    grid.append(tile);
  }
  section.append(grid);
  if (!rec || (rec.plan == null && rec.produced == null))
    section.append(btn(ln?.entries.length ? "Trece cifrele pe linii" : "Completează cifrele schimbului", openNumbers, "todayMore", "chevron"));
  else if (rec.fromLines) section.append(el("p", "Plan, realizat, rebut și oprire vin din Liniile mele. Prezenții îi treci la Predare.", "formHelp"));
  return section;
}

export function today(c) {
  const main = document.querySelector("main");
  const home = el("div", "", "todayView");
  home.append(hero(c), quickActions(c));
  const grid = el("div", "", "todayGrid");
  const work = el("div", "", "todayWork");
  const side = el("div", "", "todaySide");
  const agenda = el("section", "", "todayAgenda todayCard");
  const updateDeadlines = () => drawAgenda(agenda, c);
  updateDeadlines();
  const now = nowCard(c);
  if (now) work.append(now);
  work.append(shiftStrip(c));
  const all = advice(app.data, c);
  const tips = all.filter((a) => a.level !== "good");
  const shown = tips.length ? tips : all.slice(0, 1);
  if (shown.length) {
    const tipsCard = adviceSection(shown, {
      limit: 2, title: "Sfaturi pentru tura ta",
      more: { label: "Toate sfaturile", run: go("Analiză") },
    });
    tipsCard.classList.add("todayCard");
    work.append(tipsCard);
  }
  work.append(agenda);
  for (const page of active())
    for (const block of page.blocks)
      if (block.type === "routine" && !block.form && block.items.length)
        work.append(routineSection(block, { ...c, pageId: page.id, updateDeadlines }));
  const lines = linesCard(c);
  if (lines) side.append(lines);
  const plan = planCard(c);
  if (plan) side.append(plan);
  grid.append(work, side);
  home.append(grid);
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
