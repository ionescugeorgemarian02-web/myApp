import { app } from "../state.js";
import { el, btn, icon, roDate, confirmShare } from "../ui.js";
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
  box.setAttribute("role", "img");
  box.setAttribute("aria-label", done + " din " + total + " puncte bifate");
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
    el("small", roDate(c.workDay, { weekday: "long", day: "numeric", month: "long" }), "eyebrow"),
    el("h1", "Schimbul " + c.shift),
    el(
      "p",
      h[c.shift - 1] +
        " – " +
        h[c.shift % 3],
    ),
  );
  top.append(info, ring(done, items.length));
  const shifts = el("div", "", "segmented");
  shifts.setAttribute("role", "group");
  shifts.setAttribute("aria-label", "Alege schimbul");
  for (let i = 1; i <= 3; i++) {
    let b = btn(
      "Schimb " + i,
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
            ho.r = newRow(ho.b, c);
            app.save();
          }
          app.openPage(ho.p, "row-" + ho.r.id);
        },
        ho.r ? "" : "todo",
      ),
    );
  grid.append(action("send", "Rezumat", "vezi și trimite", async () => {
    const text = report();
    if (await confirmShare(text)) await share(text);
  }));
  if (pt)
    grid.append(
      action("alert", "Problemă", "notează una nouă", () => {
        const r = newRow(pt.b, c);
        app.save();
        app.openPage(pt.p, "row-" + r.id);
      }),
    );

  const layout = el("div", "", "shiftLayout");
  const follow = el("div", "", "follow");
  const routineList = el("div", "", "routineList");
  const side = el("div", "", "shiftTools");
  side.append(grid, follow);
  layout.append(side, routineList);
  main.append(layout);
  function updateDeadlines() {
    follow.replaceChildren();
    drawFollowUp(follow, c);
  }
  updateDeadlines();
  // Rutina.
  for (let b of routines) {
    let s = el("section", "", "card");
    let head = el("div", "", "cardHead");
    head.append(el("h2", b.title), el("span", progress(b.items), "count"));
    s.append(head, routine(b, { ...c, updateDeadlines }, true));
    routineList.append(s);
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
function drawFollowUp(main, c) {
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
          app.openPage(d.p, d.key);
        }),
      );
    for (let x of probs)
      list.append(
        link(x.text, "deschisă", "chip", () => {
          app.openPage(x.p, x.key);
        }),
      );
    if (list.children.length > 4) {
      const extra = el("details", "", "moreLinks");
      const count = list.children.length - 4;
      extra.append(el("summary", "Încă " + count));
      while (list.children.length > 4) extra.append(list.children[4]);
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
