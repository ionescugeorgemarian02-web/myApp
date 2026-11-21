import { app } from "../state.js";
import { el, btn, icon, roDate } from "../ui.js";
import { routine } from "../blocks/routine.js";
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
const NS = "http://www.w3.org/2000/svg";
// Inel de progres pentru rutina schimbului.
function ring(done, total) {
  const s = document.createElementNS(NS, "svg"),
    r = 26,
    len = 2 * Math.PI * r,
    part = total ? done / total : 0;
  s.setAttribute("viewBox", "0 0 64 64");
  s.setAttribute("class", "ring");
  s.setAttribute("aria-hidden", "true");
  s.innerHTML = `<circle cx="32" cy="32" r="${r}" class="ringBg"/><circle cx="32" cy="32" r="${r}" class="ringFg" stroke-dasharray="${len}" stroke-dashoffset="${len * (1 - part)}"/>`;
  const box = el("div", "", "ringBox");
  box.append(s, el("strong", done + "/" + total));
  return box;
}
function action(ic, title, sub, fn, cls = "") {
  let b = btn("", fn, "action " + cls);
  let i = el("span", "", "actionIcon");
  i.append(icon(ic));
  b.append(i, el("strong", title), el("small", sub));
  return b;
}
export function today(c) {
  const data = app.data,
    h = data.settings.hours,
    routines = active().flatMap((p) => p.blocks.filter((b) => b.type === "routine")),
    items = routines.flatMap((b) => b.items),
    done = items.filter((i) => i.checked).length;
  const main = document.querySelector("main");
  // Antetul: schimbul curent și progresul rutinei.
  const hero = el("section", "", "hero");
  const top = el("div", "", "heroTop"),
    info = el("div");
  info.append(
    el("small", "Schimbul curent", "eyebrow"),
    el("h1", "Schimbul " + c.shift),
    el(
      "p",
      h[c.shift - 1] +
        " – " +
        h[c.shift % 3] +
        " · " +
        roDate(c.date, { weekday: "long", day: "numeric", month: "short" }),
    ),
  );
  top.append(info, ring(done, items.length));
  const shifts = el("div", "", "segmented");
  shifts.setAttribute("role", "group");
  shifts.setAttribute("aria-label", "Alege schimbul");
  for (let i = 1; i <= 3; i++) {
    let b = btn(
      String(i),
      () => {
        data.settings.slot = c.slot;
        data.settings.shift = i;
        app.refresh();
      },
      i === c.shift ? "on" : "",
    );
    b.setAttribute("aria-label", "Schimb " + i);
    b.setAttribute("aria-pressed", i === c.shift);
    shifts.append(b);
  }
  hero.append(top, shifts);
  main.append(hero);
  if (app.installPrompt && !app.standalone())
    main.append(
      btn("Instalează caietul pe telefon", app.install, "banner", "phone"),
    );
  // Acțiuni rapide.
  const ho = handover(),
    pt = problemsTable(),
    grid = el("div", "", "actions");
  if (ho)
    grid.append(
      action(
        "handover",
        "Predare",
        ho.r ? "începută ✓" : "de completat",
        () => {
          if (!ho.r) {
            newRow(ho.b, c);
            app.save();
          } else app.open.add("row-" + ho.r.id);
          app.openPage(ho.p);
        },
        ho.r ? "" : "todo",
      ),
    );
  grid.append(action("send", "Rezumat", "trimite șefului", () => share(report())));
  if (pt)
    grid.append(
      action("alert", "Problemă", "notează una nouă", () => {
        newRow(pt.b, c);
        app.save();
        app.openPage(pt.p);
      }),
    );
  main.append(grid);
  // Rutina.
  for (let b of routines) {
    let s = el("section", "", "card");
    let head = el("div", "", "cardHead");
    head.append(el("h2", b.title), el("span", progress(b.items), "count"));
    s.append(head, routine(b, c, true));
    main.append(s);
  }
  // De urmărit: termene restante, de azi și probleme deschise.
  const all = deadlines().filter((d) => d.due <= c.date),
    seen = new Set(all.map((d) => d.key)),
    probs = openProblems().filter((p) => !seen.has(p.key));
  if (all.length || probs.length) {
    let s = el("section", "", "card");
    let head = el("div", "", "cardHead");
    head.append(el("h2", "De urmărit"), el("span", String(all.length + probs.length), "count"));
    s.append(head);
    let list = el("div", "", "linkList");
    for (let d of all)
      list.append(
        link(d.text, d.due < c.date ? "restant · " + roDate(d.due) : "azi", d.due < c.date ? "chip late" : "chip today", () => {
          app.open.add("row-" + d.key);
          app.openPage(d.p);
        }),
      );
    for (let x of probs.slice(0, 6))
      list.append(
        link(x.text, "deschisă", "chip", () => {
          app.open.add("row-" + x.key);
          app.openPage(x.p);
        }),
      );
    s.append(list);
    main.append(s);
  }
  // Ultimele notițe.
  let recent = [];
  for (let p of active())
    for (let b of p.blocks) {
      if (b.type === "note" && b.text) recent.push([b.updated, b.text, p]);
      for (let i of b.items || []) if (i.notes) recent.push([i.updated, i.notes, p]);
    }
  if (recent.length) {
    let s = el("section", "", "card");
    s.append(el("h2", "Ultimele notițe"));
    let list = el("div", "", "linkList");
    recent
      .sort((a, b) => String(b[0]).localeCompare(String(a[0])))
      .slice(0, 4)
      .forEach(([, v, p]) => list.append(link(v, p.title, "chip", () => app.openPage(p))));
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
