// Tabloul liniilor din subordine: starea fiecărei linii în schimbul curent
// (OK / Atenție / Oprită), cifrele ei și verificările la 2 ore din fișa EPT.
// Totalurile intră automat în „Tura mea”, în rezumat și în Analiză.
import { app } from "../state.js";
import { el, btn, icon, details, roDate, toast, now } from "../ui.js";
import { LINE_STATES, LINE_FIELDS, lineEntries, lineTotals, problemsBlock, equipmentList } from "../metrics.js";
import { formBlock, slotState, setSlot, slotTimes, linesNow } from "../ept.js";
import { colByKey, colByName } from "../records.js";
import { fmt } from "../charts.js";
import { newRow } from "./table.js";

let filter = "all";
// Schimbul afișat: cel curent sau unul salvat, ales după zi.
let viewKey = null;
const SHIFT_RE = /^(\d{4}-\d{2}-\d{2}) · Schimb ([123])$/;
const clock = () => app.current?.time || new Date().toTimeString().slice(0, 5);
const short = { weekday: "short", day: "numeric", month: "short" };

function entryFor(b, c, name) {
  if (!b.shifts || typeof b.shifts !== "object") b.shifts = {};
  const shift = (b.shifts[c.key] ||= {});
  return (shift[name] ||= {});
}

export function lineProblem(name, c) {
  const pb = problemsBlock(app.data);
  if (!pb) return toast("Nu există pagina „Probleme și acțiuni”.");
  const r = newRow(pb.b, c);
  const text = colByKey(pb.b, "problem") || colByName(pb.b, "problema");
  const eq = colByKey(pb.b, "equipment");
  const obs = linesNow(app.data, { ...app.current, hours: app.data.settings.hours }, c.key)?.entries.find((e) => e.name === name)?.obs || "";
  if (text) r.values[text.id] = name + ": " + (obs.trim() || "linie oprită");
  if (eq) r.values[eq.id] = name;
  app.save();
  app.openPage(pb.p, "row-" + r.id);
}

function totalsCard(c) {
  const now2 = linesNow(app.data, { ...app.current, hours: app.data.settings.hours }, c.key);
  const t = now2.totals;
  const box = el("div", "", "linesTotals");
  const tile = (label, value, sub, state) => {
    const x = el("div", "", "lineTotal");
    if (state) x.dataset.state = state;
    x.append(el("span", label), el("strong", value), el("small", sub || " "));
    return x;
  };
  const paceAll = t.plan > 0 && t.real != null && now2.fraction > 0 ? (t.real / (t.plan * Math.min(1, now2.fraction))) * 100 : null;
  box.append(
    tile("Realizat", t.real == null ? "–" : fmt(t.real, 0), t.plan ? "din " + fmt(t.plan, 0) + " plan" + (t.pct != null ? " · " + fmt(t.pct, 0) + "%" : "") : "plan necompletat",
      t.pct != null && now2.fraction >= 1 && t.pct < 100 ? "warn" : ""),
    tile("Ritm", paceAll == null ? "–" : fmt(paceAll, 0) + "%", "față de cât trebuia până acum", paceAll != null && paceAll < 90 ? "warn" : ""),
    tile("Rebut", t.reb == null ? "–" : fmt(t.reb, 0) + " buc", t.reb != null && t.real > 0 ? fmt((t.reb / t.real) * 100) + "%" : ""),
    tile("Oprire", t.down == null ? "–" : fmt(t.down, 0) + " min", t.stop ? t.stop + (t.stop === 1 ? " linie oprită" : " linii oprite") : "", t.stop ? "bad" : ""),
  );
  return box;
}

function statusSummary(c) {
  const t = lineTotals(lineEntries(app.data, c.key));
  const p = el("p", "", "linesStatus");
  for (const [n, label, st] of [[t.ok, "OK", "ok"], [t.warn, "Atenție", "warn"], [t.stop, "Oprite", "stop"], [t.off, "Nu rulează", "off"], [t.total - t.checked, "Neverificate", ""]]) {
    const x = el("span", "", "lineDot");
    x.dataset.st = st;
    x.append(el("strong", String(n)), el("span", label));
    p.append(x);
  }
  return p;
}

function slotsRow(c, redraw) {
  const fb = formBlock(app.data);
  if (!fb) return null;
  const ctx = { ...c, hours: app.data.settings.hours };
  const st = slotState(fb.b, ctx);
  const total = slotTimes(ctx.hours, c.shift).length;
  const box = el("div", "", "linesSlots");
  const head = el("div", "", "linesSlotsHead");
  head.append(el("h3", "Verificările la 2 ore"),
    el("span", st.due ? (st.due.late ? "Întârziată: " : "Acum: ") + st.due.time : st.next ? "Următoarea: " + st.next.time : "Toate făcute",
      st.due?.late ? "chip late" : st.due ? "chip today" : "chip"));
  const row = el("div", "", "eptSlots");
  for (const s of st.slots) {
    const b2 = btn(s.time, () => {
      setSlot(fb.b, s.i, !s.done, total);
      app.save();
      if (!s.done) toast("Verificarea de la " + s.time + " e bifată în fișa EPT (cerințele clientului și panourile EPT).");
      redraw();
    }, "eptSlot", s.done ? "check" : "clock");
    b2.setAttribute("aria-pressed", String(s.done));
    b2.setAttribute("aria-label", "Verificarea de la " + s.time);
    if (s.late) b2.dataset.late = "true";
    row.append(b2);
  }
  box.append(head, row, el("p", "Treci pe la fiecare linie, notează realizatul și starea, apoi bifează ora. Se bifează automat și în fișa EPT.", "formHelp"));
  return box;
}

function lineCard(b, e, c, pace, redraw, paint) {
  const card = el("article", "", "lineCard");
  card.dataset.st = e.st || "none";
  card.dataset.key = "line-" + e.name;
  const top = el("div", "", "lineTop");
  const title = el("h3", e.name);
  const meta = el("span", "", "lineMeta");
  top.append(title, meta);
  const figures = el("div", "", "lineFigures");
  card.append(top, figures);
  // Cifrele liniei se actualizează pe loc, fără să piardă câmpul în care scrii.
  function updateMeta() {
    const x = linesNow(app.data, { ...app.current, hours: app.data.settings.hours }, c.key)?.entries.find((y) => y.name === e.name) || e;
    if (x.plan > 0 && x.real != null) meta.textContent = fmt(x.real, 0) + "/" + fmt(x.plan, 0) + " · " + fmt((x.real / x.plan) * 100, 0) + "%";
    else if (x.real != null) meta.textContent = fmt(x.real, 0) + " buc";
    else meta.textContent = x.st ? LINE_STATES[x.st] : "neverificată";
    if (x.st !== "off" && x.onAt) meta.textContent += " · pornită " + x.onAt;
    figures.replaceChildren();
    if (!(x.plan > 0 && x.real != null)) return;
    const bar = el("div", "", "lineBar");
    const fill = el("i");
    fill.style.width = Math.min(100, (x.real / x.plan) * 100) + "%";
    bar.append(fill);
    if (x.pace?.expected != null && x.pace.expected < x.plan) {
      const mark = el("b");
      mark.style.left = (x.pace.expected / x.plan) * 100 + "%";
      bar.append(mark);
      bar.title = "Linia verticală: cât trebuia produs până acum";
    }
    figures.append(bar);
    if (x.pace?.pace != null && x.pace.pace < 90 && x.pace.expected > 0)
      figures.append(el("p", "Ritm " + fmt(x.pace.pace, 0) + "% față de cât trebuia până acum – escaladează dacă nu recuperezi.", "lineWarn"));
  }
  updateMeta();
  const states = el("div", "", "lineStates");
  states.setAttribute("role", "group");
  states.setAttribute("aria-label", "Starea liniei " + e.name);
  // Linia care nu rulează (ex. UFC în primele 4 ore) se pornește când vrei.
  // Ora exactă se poate corecta oricând (ex. linia a pornit de fapt la 10:15).
  const timeRow = (label, key) => {
    const l = el("label", "", "lineTime");
    const t = el("input");
    t.type = "time";
    t.value = e[key] || "";
    t.dataset.focus = e.name + key;
    t.onchange = () => {
      if (!t.value) return;
      const x = entryFor(b, c, e.name);
      x[key] = t.value;
      x.at = now();
      app.save();
      toast(e.name + ": " + label.toLowerCase() + " " + t.value);
      redraw();
    };
    l.append(el("span", label), t);
    return l;
  };
  if (e.st === "off") {
    card.append(el("p", "Nu rulează. Planul și ritmul nu se socotesc până o pornești.", "lineOffNote"), timeRow("Nu rulează de la", "offAt"));
    const start = btn("Pornește linia", () => {
      const x = entryFor(b, c, e.name);
      x.st = "ok";
      x.onAt = clock();
      x.at = now();
      app.save();
      toast(e.name + " pornită la " + x.onAt);
      redraw();
    }, "primary lineStart", "chevron");
    start.dataset.focus = e.name + "start";
    card.append(start);
  }
  for (const [st, label] of Object.entries(LINE_STATES).filter(([k]) => k !== "off")) {
    if (e.st === "off") break;
    const s = btn(label, () => {
      const x = entryFor(b, c, e.name);
      x.st = x.st === st ? "" : st;
      x.at = now();
      app.save();
      if (x.st === "stop")
        toast(e.name + " oprită: notează cauza și anunță superiorul direct.", () => lineProblem(e.name, c), "Creează problemă");
      redraw();
    }, "lineState");
    s.dataset.st = st;
    s.dataset.focus = e.name + st;
    s.setAttribute("aria-pressed", String(e.st === st));
    states.append(s);
  }
  if (e.st !== "off") {
    if (e.onAt) card.append(timeRow("Pornită la", "onAt"));
    card.append(states);
    const off = btn("Nu rulează", () => {
      const x = entryFor(b, c, e.name);
      x.st = "off";
      x.offAt = clock();
      x.at = now();
      app.save();
      redraw();
    }, "lineOff", "clock");
    off.dataset.focus = e.name + "off";
    off.setAttribute("aria-label", e.name + " nu rulează");
    states.append(off);
  }
  const more = details([icon("edit"), el("span", e.obs.trim() ? "Cifre · " + e.obs.trim().slice(0, 36) + (e.obs.trim().length > 36 ? "…" : "") : "Cifre și observații")],
    "line-" + e.name, "lineMore");
  const fill = () => {
    if (!more.open || more.childElementCount > 1) return;
    const grid = el("div", "", "lineFields");
    for (const [k, label] of LINE_FIELDS) {
      const l = el("label", "", "field");
      const n = el("input");
      n.type = "number";
      n.inputMode = k === "tl" ? "decimal" : "numeric";
      n.min = "0";
      n.step = k === "tl" ? "0.5" : "1";
      n.value = e[k] ?? "";
      n.oninput = () => {
        const x = entryFor(b, c, e.name);
        x[k] = n.value;
        x.at = now();
        app.save();
        updateMeta();
        paint();
      };
      l.append(el("span", label), n);
      grid.append(l);
    }
    const ol = el("label", "", "field wide");
    const area = el("textarea");
    area.rows = 2;
    area.value = e.obs;
    area.placeholder = "Opriri, calitate, material, oameni…";
    area.oninput = () => {
      const x = entryFor(b, c, e.name);
      x.obs = area.value;
      x.at = now();
      app.save();
    };
    ol.append(el("span", "Observații"), area);
    grid.append(ol);
    more.append(grid, btn("Creează problemă pentru " + e.name, () => lineProblem(e.name, c), "small", "alert"));
  };
  more.addEventListener("toggle", fill);
  fill();
  card.append(more);
  return card;
}

// Alegerea schimbului: ziua și schimbul, cu întoarcere la schimbul curent.
function picker(b, c, current) {
  const box = el("div", "", "linesPicker");
  box.append(el("p", (c.past ? "Schimb salvat · " : c.ended ? "Schimb încheiat · " : "Acum · ") + "schimbul " + c.shift + " · " + roDate(c.workDay, short), "linesWhen"));
  const row = el("div", "", "linesPickerRow");
  const date = el("input");
  date.type = "date";
  date.value = c.workDay;
  date.setAttribute("aria-label", "Ziua afișată");
  const shift = el("select");
  for (const n of [1, 2, 3]) shift.add(new Option("Schimbul " + n, n));
  shift.value = String(c.shift);
  shift.setAttribute("aria-label", "Schimbul afișat");
  const go = () => {
    if (!date.value) return;
    const key = date.value + " · Schimb " + shift.value;
    viewKey = key === current.key ? null : key;
    app.render();
  };
  date.onchange = go;
  shift.onchange = go;
  row.append(date, shift);
  if (c.past) row.append(btn("Acum", () => { viewKey = null; app.render(); }, "small", "back"));
  box.append(row);
  return box;
}

function past(b, current) {
  const d = details([icon("clock"), el("span", "Schimburile salvate")], "lines-history", "eptMore");
  const fill = () => {
    if (!d.open || d.childElementCount > 1) return;
    const keys = Object.keys(b.shifts || {}).filter((k) => k !== current.key && SHIFT_RE.test(k)).sort().reverse();
    if (!keys.length) d.append(el("p", "Încă nu există schimburi încheiate.", "empty"));
    for (const key of keys.slice(0, 60)) {
      const t = lineTotals(lineEntries(app.data, key));
      const [date, shift] = key.split(" · ");
      const row = btn("", () => { viewKey = key; app.render(); scrollTo(0, 0); }, "eptArchiveRow");
      row.append(el("strong", roDate(date, short) + " · " + shift.toLowerCase()),
        el("span", (t.pct != null ? fmt(t.pct, 0) + "% plan · " : "") + (t.stop ? t.stop + " oprite" : t.checked + "/" + t.total + " verificate"), t.stop ? "chip late" : "chip"),
        icon("chevron"));
      d.append(row);
    }
  };
  d.addEventListener("toggle", fill);
  fill();
  return d;
}

export function lines(b, c) {
  const box = el("div", "", "linesBoard");
  if (c.editing) {
    box.append(el("p", "Lista liniilor se schimbă din Setări → Liniile mele.", "formHelp"),
      btn("Deschide setările", () => { app.open.add("settings-line"); location.hash = "Setări"; }, "small", "settings"));
    return box;
  }
  if (!equipmentList(app.data).length) {
    box.append(el("p", "Nu ai nicio linie în listă.", "empty"),
      btn("Adaugă liniile în Setări", () => { app.open.add("settings-line"); location.hash = "Setări"; }, "primary small", "plus"));
    return box;
  }
  const current = c;
  if (viewKey === current.key) viewKey = null;
  const m = viewKey && SHIFT_RE.exec(viewKey);
  c = m ? { ...current, key: viewKey, date: m[1], workDay: m[1], shift: Number(m[2]), past: true } : current;
  const head = el("section", "", "linesHead");
  const paint = () => head.replaceChildren(picker(b, c, current), totalsCard(c), statusSummary(c));
  const draw = () => {
    const y = scrollY;
    const focus = document.activeElement?.dataset?.focus;
    const now2 = linesNow(app.data, { ...app.current, hours: app.data.settings.hours }, c.key);
    paint();
    box.replaceChildren(head);
    const slots = c.past ? null : slotsRow(c, draw);
    if (slots) box.append(slots);
    const tabs = el("div", "", "segmented linesFilter");
    tabs.setAttribute("role", "group");
    tabs.setAttribute("aria-label", "Ce linii arăt");
    const attention = now2.entries.filter((e) => e.st === "warn" || e.st === "stop" || (e.st !== "off" && e.pace?.pace != null && e.pace.pace < 90));
    const unchecked = now2.entries.filter((e) => !e.st);
    for (const [k, label] of [["all", "Toate " + now2.entries.length], ["attention", "De urmărit " + attention.length], ["unchecked", "Neverificate " + unchecked.length]]) {
      const t = btn(label, () => { filter = k; draw(); }, "");
      t.setAttribute("aria-pressed", String(filter === k));
      t.dataset.focus = "filter-" + k;
      tabs.append(t);
    }
    box.append(tabs);
    const list = filter === "attention" ? attention : filter === "unchecked" ? unchecked : now2.entries;
    const grid = el("div", "", "lineGrid");
    for (const e of list) grid.append(lineCard(b, e, c, e.pace, draw, paint));
    if (!list.length) grid.append(el("p", filter === "attention" ? "Nicio linie de urmărit. Bine!" : "Toate liniile au o stare în acest schimb.", "empty"));
    box.append(grid, past(b, current));
    if (box.isConnected) {
      scrollTo(0, y);
      if (focus) box.querySelector('[data-focus="' + CSS.escape(focus) + '"]')?.focus({ preventScroll: true });
    }
  };
  draw();
  return box;
}
