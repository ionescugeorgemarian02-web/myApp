import { app } from "../state.js";
import { el, btn, input, toolsFor, ask, toast, iconBtn } from "../ui.js";
import { block, GROUPS } from "../seed.js";
import { progress } from "../logic.js";
import { note } from "../blocks/note.js";
import { section } from "../blocks/section.js";
import { checklist } from "../blocks/checklist.js";
import { table } from "../blocks/table.js";
import { routine } from "../blocks/routine.js";
import { journal } from "../blocks/journal.js";
import { audit } from "../blocks/audit.js";
import { skills } from "../blocks/skills.js";
import { weekStart, addDays, aggregate, shiftRecords, safetyCounts, safetyEvents, baselines, ninetyDays, weekSummary } from "../metrics.js";
import { fmt } from "../charts.js";
import { share } from "../logic.js";
import { confirmShare } from "../ui.js";
const renderers = { section, note, checklist, table, routine, journal, audit, skills };
const names = {
  checklist: ["Listă de bifat", "☑️"],
  table: ["Tabel", "▦"],
  journal: ["Jurnal", "🗒️"],
  note: ["Notiță", "📝"],
  section: ["Titlu de secțiune", "🔤"],
  routine: ["Rutină pe schimb", "🔁"],
  audit: ["Tur pe linie (OK/NOK)", "🔍"],
  skills: ["Matrice de polivalență", "🧩"],
};
// Indicatorii calculați automat din predări și din registrul de siguranță.
function autoIndicators(c) {
  const data = app.data, from = addDays(c.date, -27);
  const records = shiftRecords(data).filter((r) => r.date >= from && r.date <= c.date);
  const k = aggregate(records);
  const s = safetyCounts(safetyEvents(data), from, c.date);
  const base = baselines(data);
  const box = el("section", "", "card autoIndicators");
  const head = el("div", "", "cardHead");
  head.append(el("h2", "Calculat automat · ultimele 4 săptămâni"), el("span", records.length + " schimburi", "count"));
  box.append(head);
  const grid = el("div", "", "statusRow");
  for (const [label, value, b] of [
    ["Plan realizat", k.planPct == null ? "–" : fmt(k.planPct) + "%", base.planPct?.start],
    ["Rebut", k.scrapPct == null ? "–" : fmt(k.scrapPct) + "%"],
    ["Minute de oprire", k.downtime == null ? "–" : fmt(k.downtime, 0)],
    ["Absențe", k.absencePct == null ? "–" : fmt(k.absencePct) + "%", base.absencePct?.start],
    ["Incidente", String(s.incidents), base.incidents?.start],
    ["Near-miss raportate", String(s.nearMiss)],
  ]) {
    const chip = el("span", "", "statusCount");
    chip.append(el("strong", value), el("span", label + (b != null ? " · pornire " + fmt(b) : "")));
    grid.append(chip);
  }
  box.append(grid, el("p", "Sursa: cifrele din predarea schimbului și registrul de siguranță. Completează în tabel valoarea de pornire și ținta; tabelul rămâne pentru cifrele oficiale.", "formHelp"));
  return box;
}
// Parcursul primelor 90 de zile și raportul de progres.
function ninetyBanner(c) {
  const n = ninetyDays(app.data, c);
  if (!n) return null;
  const box = el("section", "", "card ninety");
  const head = el("div", "", "cardHead");
  head.append(el("h2", n.done ? "Ai trecut de ziua 90" : n.day < 1 ? "Înainte de prima zi" : "Ziua " + n.day + " din 90"),
    el("span", n.next ? "reper: ziua " + n.next : "complet", "count"));
  const bar = el("progress", "", "routineBar");
  bar.max = 90;
  bar.value = Math.min(90, Math.max(0, n.day));
  bar.setAttribute("aria-label", "Progresul primelor 90 de zile");
  const marks = el("div", "", "ninetyMarks");
  for (const m of [30, 60, 90]) marks.append(el("span", "Ziua " + m, n.day >= m ? "passed" : ""));
  box.append(head, bar, marks);
  if (n.next) box.append(el("p", "Reperul zilei " + n.next + " vine în " + n.inDays + (n.inDays === 1 ? " zi." : " zile."), "formHelp"));
  box.append(btn("Raport de progres față de pornire", async () => {
    const text = progressReport(c, n);
    if (await confirmShare(text, "Raport de progres")) await share(text);
  }, "small", "send"));
  return box;
}
function progressReport(c, n) {
  const data = app.data;
  const first = weekSummary(data, c, weekStart(n.start)), last = weekSummary(data, c, weekStart(c.date));
  const firstTwo = aggregate(shiftRecords(data).filter((r) => r.date >= n.start && r.date <= addDays(n.start, 13)));
  const lastTwo = aggregate(shiftRecords(data).filter((r) => r.date >= addDays(c.date, -13) && r.date <= c.date));
  const pct = (v) => (v == null ? "–" : fmt(v) + "%");
  const base = baselines(data);
  return [
    "Raport de progres · ziua " + n.day + " din 90",
    "",
    "Plan realizat: primele 2 săptămâni " + pct(firstTwo.planPct) + " → ultimele 2 săptămâni " + pct(lastTwo.planPct) +
      (base.planPct?.start != null ? " (valoare de pornire " + pct(base.planPct.start) + ")" : ""),
    "Rebut: " + pct(firstTwo.scrapPct) + " → " + pct(lastTwo.scrapPct),
    "Minute de oprire: " + (firstTwo.downtime ?? "–") + " → " + (lastTwo.downtime ?? "–"),
    "Absențe: " + pct(firstTwo.absencePct) + " → " + pct(lastTwo.absencePct),
    "Angajamente închise la termen (săptămâna curentă): " + pct(last.commitments.rate),
    "Prima săptămână: " + first.records.length + " schimburi raportate · săptămâna curentă: " + last.records.length,
  ].join("\n");
}
export function pageView(p, c) {
  const main = document.querySelector("main"),
    data = app.data,
    editing = app.editing === p.id;
  c = { ...c, editing, pageId: p.id };
  // Bara de sus: înapoi, titlu, editare.
  const bar = el("div", "", "pageBar");
  bar.append(
    iconBtn("back", "Înapoi la caiet", () => (location.hash = "Caiet")),
    btn(
      editing ? "Gata" : "Editează",
      () => {
        app.editing = editing ? null : p.id;
        app.render();
      },
      editing ? "pill on" : "pill",
      editing ? "check" : "edit",
    ),
  );
  main.append(bar);
  const h = el("h1", "", "title");
  h.append(el("span", p.emoji || "📄", "titleEmoji"), el("span", p.title));
  main.append(h);
  if (c.handoverToolbar) main.append(c.handoverToolbar);
  if (p.archived) main.append(el("p", "Pagină arhivată – nu apare pe Azi.", "hint"));
  if (editing) {
    main.append(el("p", "Mod editare: poți redenumi, muta, adăuga sau șterge.", "hint"));
    let s = el("section", "", "card editCard");
    s.append(
      input("Titlu", p.title, (v) => {
        if (!v.trim()) return;
        p.title = v.trim();
        h.lastChild.textContent = p.title;
        c.save();
      }),
    );
    let row = el("div", "", "twoCols");
    row.append(
      input("Pictogramă (emoji)", p.emoji, (v) => {
        p.emoji = v.trim();
        h.firstChild.textContent = p.emoji || "📄";
        c.save();
      }),
      input(
        "Grup",
        p.group || GROUPS[3],
        (v) => {
          p.group = v;
          c.save();
        },
        "select",
        [...new Set([...GROUPS, ...data.pages.map((x) => x.group).filter(Boolean)])],
      ),
    );
    s.append(row);
    let tools = toolsFor(data.pages, p, c, { copy: app.clone });
    tools.append(
      btn(
        p.archived ? "Reactivează" : "Arhivează",
        () => {
          p.archived = !p.archived;
          app.refresh();
        },
        "small",
        "archive",
      ),
      btn(
        "Salvează ca șablon",
        () => {
          data.templates.push(app.clone(p));
          app.refresh();
          toast("Șablon salvat");
        },
        "small",
        "template",
      ),
    );
    s.append(tools);
    main.append(s);
  }
  if (p.group === GROUPS[2] && !editing) {
    const banner = ninetyBanner(c);
    if (banner) main.append(banner);
  }
  if (!editing && p.blocks.some((b) => b.cols?.some((col) => col.name === "Valoare de pornire")))
    main.append(autoIndicators(c));
  for (let b of p.blocks) {
    if (b.type === "section") {
      let head = el("div", "", "sectionHead"),
        next = p.blocks[p.blocks.indexOf(b) + 1];
      head.append(el("h2", b.title));
      // Contorul listei de sub secțiune stă lângă titlul secțiunii.
      if ((next?.type === "checklist" || next?.type === "routine") && !editing) head.append(el("span", progress(next.items), "count"));
      main.append(head);
      if (editing) main.append(toolsFor(p.blocks, b, c, { rename: true, copy: app.clone }));
      continue;
    }
    let s = el("section", "", "card");
    let head = el("div", "", "cardHead");
    // Titlul blocului e ascuns dacă repetă titlul paginii sau al secțiunii.
    let prev = p.blocks[p.blocks.indexOf(b) - 1],
      showTitle = editing || (b.title !== p.title && prev?.type !== "section");
    head.append(el("h2", b.title));
    const ticks = b.type === "checklist" || b.type === "routine";
    if (ticks) head.append(el("span", progress(b.items), "count"));
    if (showTitle) s.append(head);
    else if (ticks && prev?.type !== "section") {
      head.firstChild.textContent = "";
      s.append(head);
    }
    s.dataset.key = "block-" + b.id;
    s.tabIndex = -1;
    s.append(renderers[b.type](b, c));
    if (editing) {
      let t = toolsFor(p.blocks, b, c, { rename: true, copy: app.clone });
      t.classList.add("blockTools");
      s.append(t);
    }
    main.append(s);
  }
  if (!p.blocks.length)
    main.append(el("p", "Pagina e goală. Apasă „Editează” și adaugă un bloc.", "empty"));
  if (editing) {
    let s = el("section", "", "card");
    s.append(el("h2", "Adaugă bloc"));
    let grid = el("div", "", "blockGrid");
    for (let [k, [t, e]] of Object.entries(names)) {
      let b = btn(
        "",
        async () => {
          let name = await ask(t + " – denumire", t, "Adaugă");
          if (name?.trim()) {
            p.blocks.push(block(k, name.trim()));
            app.refresh();
          }
        },
        "blockType",
      );
      b.append(el("span", e), el("strong", t));
      grid.append(b);
    }
    s.append(grid);
    main.append(s);
  }
}
