// Fișa de rutină EPT Supervisor, pe telefon: aceleași secțiuni
// colorate ca pe hârtie, DA / NU cu o atingere, verificările la 2 ore și
// activitățile săptămânale. Fișa pornește goală la fiecare schimb; schimburile
// încheiate rămân în istoric.
import { app } from "../state.js";
import { el, btn, icon, details, roDate, toast, now, confirmShare } from "../ui.js";
import {
  SECTIONS, FREQ_NAMES, GLOSSARY, ESCALATION, isWeekly, itemState, weekRead, weekWrite,
  formStatus, slotTimes, lineOfDay, phaseOf, sectionOf,
} from "../ept.js";
import { equipmentList, problemsBlock, linesBlock } from "../metrics.js";
import { colByKey, colByName } from "../records.js";
import { newRow } from "./table.js";
import { checklist } from "./checklist.js";
import { download } from "../store.js";
import { csvCell } from "../production.js";

const short = { weekday: "short", day: "numeric", month: "short" };
const STATE_TEXT = { da: "DA", nu: "NU", "": "–" };

export function openLines() {
  const lb = linesBlock(app.data);
  if (lb) app.openPage(lb.p);
  else location.hash = "Linii";
}

// DA / NU: a doua atingere pe același buton anulează alegerea.
export function setState(b, i, v, c) {
  let next;
  if (isWeekly(i)) {
    const w = weekWrite(b, c.date);
    const cur = w[i.id]?.v || "";
    next = cur === v ? "" : v;
    w[i.id] = { ...(w[i.id] || {}), v: next, date: next ? c.date : "" };
  } else {
    const cur = i.checked ? "da" : i.no ? "nu" : "";
    next = cur === v ? "" : v;
    i.checked = next === "da";
    i.no = next === "nu";
    i.checkedAt = i.checked ? now() : null;
    i.updated = now();
  }
  if (next === "nu")
    toast("Ai marcat NU: informează imediat superiorul direct și scrie motivul la Observații.");
  c.save();
  return next;
}

function createProblem(b, i, c) {
  const pb = problemsBlock(app.data);
  if (!pb) return toast("Nu există pagina „Probleme și acțiuni”.");
  const r = newRow(pb.b, c);
  const text = colByKey(pb.b, "problem") || colByName(pb.b, "problema");
  const obs = (isWeekly(i) ? weekRead(b, c.date)[i.id]?.obs : i.notes) || "";
  if (text) r.values[text.id] = "Rutina EPT · " + i.group + ": nerezolvat" + (obs.trim() ? " – " + obs.trim() : "");
  if (isWeekly(i)) weekWrite(b, c.date)[i.id] = { ...(weekWrite(b, c.date)[i.id] || {}), problem: r.id };
  else i.problem = r.id;
  app.save();
  app.openPage(pb.p, "row-" + r.id);
}

// O activitate din fișă; folosită și pe ecranul Azi.
export function itemCard(b, i, c, changed) {
  const v = itemState(b, i, c.date);
  const week = isWeekly(i) ? weekRead(b, c.date)[i.id] || {} : null;
  const card = el("div", "", "eptItem");
  card.dataset.v = v;
  card.dataset.key = "item-" + i.id;
  card.append(el("p", i.title, "eptText"));
  if (i.tag === "rotation") {
    const line = lineOfDay(equipmentList(app.data), c.workDay || c.date);
    if (line) {
      const hint = el("p", "", "eptLineDay");
      hint.append(el("span", "Linia propusă azi (rotație):"), el("strong", line));
      card.append(hint);
    }
  }
  if (i.details) card.append(el("p", i.details, "eptHint"));
  const row = el("div", "", "eptRow");
  const freq = el("span", FREQ_NAMES[i.freq] || "Zilnic", "eptFreq");
  freq.dataset.f = i.freq || "zi";
  const yn = el("div", "", "eptYN");
  yn.setAttribute("role", "group");
  yn.setAttribute("aria-label", "Rezolvat? " + i.group);
  for (const [value, label] of [["da", "DA"], ["nu", "NU"]]) {
    const b2 = btn(label, () => {
      setState(b, i, value, c);
      changed();
    }, "eptBtn " + value);
    b2.setAttribute("aria-pressed", String(v === value));
    b2.dataset.focus = i.id + value;
    b2.setAttribute("aria-label", label + ": " + i.title);
    yn.append(b2);
  }
  row.append(freq, yn);
  card.append(row);
  if (i.freq === "2h") {
    const times = slotTimes(c.hours || app.data.settings.hours, c.shift);
    const slots = el("div", "", "eptSlots");
    slots.setAttribute("role", "group");
    slots.setAttribute("aria-label", "Verificările la 2 ore");
    times.forEach((time, k) => {
      const on = !!i.slots?.[k];
      const s = btn(time, () => {
        i.slots = times.map((_, n) => !!i.slots?.[n]);
        i.slots[k] = !on;
        if (i.slots.every(Boolean) && !i.no) {
          i.checked = true;
          i.checkedAt ||= now();
        }
        i.updated = now();
        c.save();
        changed();
      }, "eptSlot", on ? "check" : "clock");
      s.setAttribute("aria-pressed", String(on));
      s.dataset.focus = i.id + "s" + k;
      s.setAttribute("aria-label", "Verificarea de la " + time);
      slots.append(s);
    });
    if (i.tag === "lines") slots.append(btn("Liniile", openLines, "eptSlot link", "chevron"));
    card.append(slots);
  }
  if (week?.v && week.date)
    card.append(el("p", "Bifat săptămâna aceasta: " + roDate(week.date, short), "eptWeekDone"));
  const tools = el("div", "", "eptItemTools");
  if (i.how) {
    const how = details([icon("spark"), el("span", "Cum o fac")], "how-" + i.id, "eptObs eptHow");
    how.append(el("p", i.how, "eptHowText"));
    tools.append(how);
  }
  // Observații: se deschid singure la NU.
  const notes = isWeekly(i) ? week.obs || "" : i.notes || "";
  const obs = details([icon("edit"), el("span", notes.trim() ? "Observații · " + notes.trim().slice(0, 40) + (notes.trim().length > 40 ? "…" : "") : "Observații")],
    "obs-" + i.id, "eptObs");
  if (v === "nu" && !obs.open && !notes) obs.open = true;
  const area = el("textarea");
  area.rows = 2;
  area.value = notes;
  area.placeholder = v === "nu" ? "De ce nu s-a putut face și cui ai escaladat" : "Scrie aici…";
  area.setAttribute("aria-label", "Observații: " + i.group);
  area.oninput = () => {
    if (isWeekly(i)) weekWrite(b, c.date)[i.id] = { ...(weekWrite(b, c.date)[i.id] || {}), obs: area.value };
    else i.notes = area.value;
    c.save();
  };
  obs.append(area);
  const problem = isWeekly(i) ? week.problem : i.problem;
  if (v === "nu") {
    const pb = problemsBlock(app.data);
    const exists = problem && pb?.b.rows.some((r) => r.id === problem);
    if (exists) obs.append(btn("Problemă creată – deschide", () => app.openPage(pb.p, "row-" + problem), "small", "chevron"));
    else if (pb) obs.append(btn("Creează problemă cu responsabil și termen", () => createProblem(b, i, c), "small", "alert"));
  }
  tools.append(obs);
  card.append(tools);
  return card;
}

// Activitățile consecutive cu același nume formează un grup (ca pe fișă).
function groups(items) {
  const out = [];
  for (const i of items) {
    const last = out[out.length - 1];
    if (last && last.name === i.group) last.items.push(i);
    else out.push({ name: i.group || "Alte activități", term: i.term, items: [i] });
  }
  for (const g of out) g.term = g.items.find((i) => i.term)?.term || "";
  return out;
}

function glossaryNote(entry) {
  const p = el("p", "", "eptGloss");
  p.append(el("strong", entry.term + ": "), document.createTextNode(entry.text));
  if (entry.intern) p.append(el("span", "Termen intern – confirmă cu șeful.", "eptIntern"));
  return p;
}

function head(b, c) {
  const st = formStatus(b, c);
  const box = el("section", "", "eptHead");
  const top = el("div", "", "eptHeadTop");
  const phase = phaseOf({ ...c, hours: c.hours || app.data.settings.hours });
  top.append(el("strong", "Schimbul " + c.shift + " · " + roDate(c.workDay, short)),
    el("span", phase === "before" ? "Înainte de schimb" : "Acum: " + sectionOf(phase).short, "eptPhase"));
  const bar = el("div", "", "eptBar");
  bar.setAttribute("role", "img");
  bar.setAttribute("aria-label", st.da + " DA, " + st.nu + " NU din " + st.total);
  const da = el("i", "", "da"), nu = el("i", "", "nu");
  da.style.width = (st.total ? (st.da / st.total) * 100 : 0) + "%";
  nu.style.width = (st.total ? (st.nu / st.total) * 100 : 0) + "%";
  bar.append(da, nu);
  const counts = el("div", "", "eptCounts");
  for (const [n, label, cls] of [
    [st.da + "/" + st.total, "DA", "da"],
    [String(st.nu), "NU", st.nu ? "nu" : ""],
    [String(st.open), "rămase", ""],
    [st.weekDone + "/" + st.weekTotal, "pe săpt.", ""],
  ]) {
    const x = el("span", "", cls);
    x.append(el("strong", n), el("small", label));
    counts.append(x);
  }
  box.append(top, bar, counts);
  return box;
}

function jump(b, c) {
  const st = formStatus(b, c);
  const week = weekRead(b, c.date);
  const nav = el("div", "", "eptJump");
  nav.setAttribute("role", "group");
  nav.setAttribute("aria-label", "Secțiunile fișei");
  for (const s of SECTIONS) {
    const all = b.items.filter((i) => (i.sec || "during") === s.id);
    if (!all.length) continue;
    const x = st.bySec[s.id];
    const weekly = all.filter(isWeekly);
    const done = x.da + weekly.filter((i) => week[i.id]?.v === "da").length;
    const chip = btn("", () => {
      const target = document.getElementById("ept-" + s.id);
      target?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    }, "eptChip");
    chip.dataset.tone = s.tone;
    if (x.nu) chip.dataset.alert = "true";
    chip.append(el("span", s.short), el("small", done + "/" + all.length));
    nav.append(chip);
  }
  return nav;
}

function sectionCard(b, s, c, changed) {
  const items = b.items.filter((i) => (i.sec || "during") === s.id);
  if (!items.length) return null;
  const sec = el("section", "", "eptSec");
  sec.id = "ept-" + s.id;
  sec.dataset.tone = s.tone;
  const week = weekRead(b, c.date);
  const done = items.filter((i) => (isWeekly(i) ? week[i.id]?.v : itemState(b, i, c.date)) === "da").length;
  const h = el("header", "", "eptSecHead");
  h.append(el("h2", s.title), el("span", done + "/" + items.length, "eptSecCount"));
  sec.append(h);
  for (const g of groups(items)) {
    const box = el("div", "", "eptGroup");
    const gh = el("div", "", "eptGroupHead");
    gh.append(el("h3", g.name));
    const entry = GLOSSARY[g.term];
    if (entry) {
      const note = glossaryNote(entry);
      note.hidden = true;
      const q = btn("?", () => {
        note.hidden = !note.hidden;
        q.setAttribute("aria-expanded", String(!note.hidden));
      }, "eptQ");
      q.setAttribute("aria-label", "Ce înseamnă " + g.name);
      q.setAttribute("aria-expanded", "false");
      gh.append(q);
      box.append(gh, note);
    } else box.append(gh);
    for (const i of g.items) box.append(itemCard(b, i, c, changed));
    sec.append(box);
  }
  if (s.id === "rules") sec.append(el("p", ESCALATION, "eptEscalate"));
  return sec;
}

// Textul fișei pentru WhatsApp / e-mail.
export function formText(b, c) {
  const st = formStatus(b, c);
  const out = ["Rutina EPT · Schimbul " + c.shift + " · " + roDate(c.workDay, { weekday: "long", day: "numeric", month: "long" }),
    st.da + "/" + st.total + " DA · " + st.nu + " NU · săptămânal " + st.weekDone + "/" + st.weekTotal];
  const week = weekRead(b, c.date);
  for (const s of SECTIONS) {
    const items = b.items.filter((i) => (i.sec || "during") === s.id);
    if (!items.length) continue;
    out.push("", s.title.toUpperCase());
    for (const i of items) {
      const v = itemState(b, i, c.date);
      const obs = (isWeekly(i) ? week[i.id]?.obs : i.notes) || "";
      out.push("[" + STATE_TEXT[v] + "] " + i.group + ": " + i.title + (obs.trim() ? " — " + obs.trim() : ""));
    }
  }
  return out.join("\n");
}
function formCsv(b, c) {
  const week = weekRead(b, c.date);
  const rows = [["Data", c.workDay], ["Schimbul", c.shift], [],
    ["Secțiune", "Activitate", "Descriere", "Frecvență", "Rezolvat (DA/NU)", "Observații"]];
  for (const i of b.items) {
    const obs = (isWeekly(i) ? week[i.id]?.obs : i.notes) || "";
    rows.push([sectionOf(i.sec).title, i.group, i.title, FREQ_NAMES[i.freq] || "", STATE_TEXT[itemState(b, i, c.date)].replace("–", ""), obs]);
  }
  return "\ufeff" + rows.map((r) => r.map(csvCell).join(";")).join("\r\n");
}

function history(b) {
  const d = details([icon("clock"), el("span", "Fișele schimburilor anterioare")], "ept-history", "eptMore");
  const fill = () => {
    if (!d.open || d.childElementCount > 1) return;
    const entries = Object.entries(b.history).filter(([k]) => /^\d{4}-\d{2}-\d{2} · Schimb \d$/.test(k))
      .sort((a, x) => x[0].localeCompare(a[0]));
    if (!entries.length) d.append(el("p", "Încă nu există schimburi încheiate. Fișa de azi apare aici după schimbare.", "empty"));
    for (const [key, items] of entries.slice(0, 40)) {
      const daily = items.filter((i) => !isWeekly(i));
      const da = daily.filter((i) => i.checked).length, nu = daily.filter((i) => i.no);
      const [date, shift] = key.split(" · ");
      const row = details([el("strong", roDate(date, short) + " · " + shift.toLowerCase()),
        el("span", da + "/" + daily.length + " DA" + (nu.length ? " · " + nu.length + " NU" : ""), nu.length ? "chip late" : "chip")],
      null, "eptPast");
      const body = el("div", "", "eptPastBody");
      if (nu.length) for (const i of nu) body.append(el("p", "NU · " + i.group + (i.notes ? " – " + i.notes : ""), "desc"));
      const skipped = daily.filter((i) => !i.checked && !i.no);
      if (skipped.length) body.append(el("p", "Nebifate: " + skipped.map((i) => i.group).filter((x, n, a) => a.indexOf(x) === n).join(", "), "desc"));
      if (!nu.length && !skipped.length) body.append(el("p", "Toate activitățile zilnice au fost DA.", "desc"));
      row.append(body);
      d.append(row);
    }
  };
  d.addEventListener("toggle", fill);
  fill();
  return d;
}

function glossary() {
  const d = details([icon("notes"), el("span", "Glosar: ce înseamnă termenii din fișă")], "ept-glossary", "eptMore");
  const fill = () => {
    if (!d.open || d.childElementCount > 1) return;
    d.append(el("p", "Explicații generale din industria auto. Cele marcate „termen intern” pot avea alt sens în fabrica ta: confirmă-le cu șeful.", "formHelp"));
    for (const entry of Object.values(GLOSSARY)) d.append(glossaryNote(entry));
  };
  d.addEventListener("toggle", fill);
  fill();
  return d;
}

export function eptForm(b, c) {
  if (c.editing) {
    const box = el("div");
    box.append(el("p", "Modul editare: poți schimba textul activităților, le poți muta sau șterge. Activitățile noi apar în „În timpul schimbului”.", "formHelp"),
      checklist(b, c));
    return box;
  }
  c = { ...c, hours: c.hours || app.data.settings.hours };
  const box = el("div", "", "ept");
  const draw = () => {
    const y = scrollY;
    const focus = document.activeElement?.dataset?.focus;
    box.replaceChildren(head(b, c), jump(b, c));
    for (const s of SECTIONS) {
      const sec = sectionCard(b, s, c, draw);
      if (sec) box.append(sec);
    }
    const tools = el("div", "", "eptTools");
    tools.append(
      btn("Trimite fișa", async () => {
        const text = formText(b, c);
        if (await confirmShare(text, "Fișa de rutină")) {
          const { share } = await import("../logic.js");
          await share(text);
        }
      }, "primary small", "send"),
      btn("Descarcă pentru Excel", () => download("rutina-ept-" + c.workDay + "-schimb" + c.shift + ".csv", formCsv(b, c), "text/csv;charset=utf-8"), "small", "download"),
    );
    box.append(tools, history(b), glossary());
    if (box.isConnected) {
      scrollTo(0, y);
      if (focus) box.querySelector('[data-focus="' + focus + '"]')?.focus({ preventScroll: true });
    }
  };
  draw();
  return box;
}
