// Analiza săptămânii: metrica principală, SQDCP, tendințe, probleme, echipă,
// sfaturi și revizuirea de vineri. Totul calculat din caiet, pe telefon.
import { app } from "../state.js";
import { el, btn, icon, iconBtn, input, roDate, confirmShare, fieldHint } from "../ui.js";
import {
  weekStart, addDays, weekSummary, weekTrend, recordKpis, problems, pareto, oneOnOnes,
  skillsCoverage, baselines, safetyEvents, problemsBlock, ninetyDays,
} from "../metrics.js";
import { advice } from "../advice.js";
import { adviceSection } from "./advice.js";
import { bars, sparkline, ranking, fmt } from "../charts.js";
import { weekReport, share } from "../logic.js";
import { coverageLabel } from "./production.js";
import { progressView } from "./progress.js";

let offset = 0, allAdvice = false, tab = "week";

function card(title, cls = "") {
  const s = el("section", "", "card anaCard " + cls);
  const head = el("div", "", "cardHead");
  head.append(el("h2", title));
  s.append(head);
  return s;
}
// Diferența față de săptămâna trecută; culoarea arată dacă e bine sau rău.
function delta(cur, prev, { better = "up", unit = "", digits = 1 } = {}) {
  if (cur == null || prev == null) return el("span", "fără comparație", "kpiDelta");
  const d = cur - prev;
  if (Math.abs(d) < 10 ** -digits / 2) return el("span", "la fel ca săpt. trecută", "kpiDelta");
  const good = better === "none" ? null : (d > 0) === (better === "up");
  const span = el("span", (d > 0 ? "▲ " : "▼ ") + fmt(Math.abs(d), digits) + unit + " față de săpt. trecută", "kpiDelta");
  if (good != null) span.dataset.good = String(good);
  return span;
}
function kpi({ area, title, value, unit = "", source, note, cur, prev, better, series, baseline, digits = 1 }) {
  const box = el("article", "", "kpi");
  box.dataset.area = area;
  const head = el("div", "", "kpiHead");
  head.append(el("span", area, "kpiArea"), el("span", title, "kpiTitle"));
  const val = el("p", "", "kpiValue");
  val.append(el("strong", fmt(value, digits)), el("span", value == null ? "" : unit));
  box.append(head, val, el("small", source, "kpiNote"));
  if (note) box.append(el("small", note, "kpiNote"));
  box.append(delta(cur, prev, { better, unit: unit === "%" ? " pp" : unit ? " " + unit : "", digits }));
  // Tendința are sens de la două săptămâni cu date.
  if (series && series.filter((v) => v != null).length >= 2) box.append(sparkline(series, { baseline, better }));
  return box;
}

export function analysisView(c) {
  const main = document.querySelector("main");
  main.append(btn("Indicatori operaționali și praguri", () => (location.hash = "Indicatori"), "todayMore", "chart"));
  const data = app.data;
  const start = addDays(weekStart(c.date), 7 * offset);
  const cur = weekSummary(data, c, start);
  const prev = weekSummary(data, c, addDays(start, -7));
  const trend = weekTrend(data, c, 8, start);
  const base = baselines(data);
  const view = el("div", "", "analysis");

  // ——— Antet cu săptămâna ———
  const head = el("div", "", "anaHead");
  const titles = el("div");
  titles.append(el("p", "Săptămâna " + cur.number + " · " + roDate(cur.start) + " – " + roDate(cur.end), "todayDate"), el("h1", "Analiză", "title"));
  const nav = el("div", "", "weekNav");
  const back = iconBtn("back", "Săptămâna anterioară", () => { offset--; app.render(); });
  const fwd = iconBtn("chevron", "Săptămâna următoare", () => { offset++; app.render(); });
  fwd.disabled = offset >= 0;
  const current = btn(offset ? "Înapoi la săptămâna curentă" : "Săptămâna curentă", () => { offset = 0; app.render(); }, offset ? "small" : "small on");
  current.setAttribute("aria-pressed", String(!offset));
  nav.append(back, current, fwd);
  const send = btn("Raport pentru șef", async () => {
    const text = weekReport(cur, prev);
    if (await confirmShare(text, "Raportul săptămânii")) await share(text);
  }, "primary", "send");
  // Două vederi: săptămâna aleasă sau progresul în timp.
  const tabs = el("div", "", "segmented light anaTabs");
  tabs.setAttribute("role", "tablist");
  for (const [key, label] of [["week", "Săptămâna"], ["progress", "Progres"]]) {
    const b = btn(label, () => { tab = key; app.render(); }, tab === key ? "on" : "", key === "week" ? "today" : "chart");
    b.setAttribute("role", "tab");
    b.setAttribute("aria-selected", String(tab === key));
    tabs.append(b);
  }
  if (tab === "progress") {
    titles.firstChild.textContent = "Evoluția în timp";
    head.append(titles, tabs);
    view.append(head);
    progressView(view, c);
    main.append(view);
    return;
  }
  head.append(titles, tabs, nav, send);
  view.append(head);

  // ——— Sfaturi (doar pentru săptămâna curentă) ———
  if (offset === 0)
    view.append(adviceSection(advice(data, c), {
      limit: allAdvice ? Infinity : 6,
      more: { label: "Toate sfaturile", run: () => { allAdvice = true; app.render(); } },
    }));

  // ——— Metrica principală ———
  const nsm = card("Angajamente închise la termen", "nsm");
  const cm = cur.commitments;
  const value = el("p", "", "nsmValue");
  if (cm.rate != null) value.append(el("strong", fmt(cm.rate, 0) + "%"));
  value.append(el("span", cm.closed ? cm.onTime + " din " + cm.closed + " închise la termen" : "Încă niciun angajament cu termen închis în această săptămână."));
  nsm.append(value, delta(cm.rate, prev.commitments.rate, { unit: " pp", digits: 0 }));
  const rates = trend.map((w) => w.commitments.rate);
  if (rates.filter((v) => v != null).length >= 2) nsm.append(sparkline(rates, { better: "up" }));
  const now = el("div", "", "nsmFacts");
  now.append(el("span", "Deschise acum: " + cm.open), el("span", "Restante: " + cm.late, cm.late ? "late" : ""),
    el("span", "Restante > 7 zile: " + cm.lateOld, cm.lateOld ? "late" : ""));
  nsm.append(now, el("small", "Include notițele, punctele din liste și rândurile cu „Termen” (probleme, promisiuni 1:1, decizii).", "kpiNote"));
  view.append(nsm);

  // ——— SQDCP ———
  const sq = card("Indicatorii săptămânii (SQDCP)", "sqdcp");
  const grid = el("div", "", "kpiGrid");
  const k = cur.kpis, pk = prev.kpis;
  const transferSource = (key) => {
    const { complete, hasData } = k.coverage[key];
    const coverage = coverageLabel(k.shifts, complete, hasData);
    return "Fișe de predare · " + (coverage || complete + (complete === 1 ? " fișă cu date" : " fișe cu date"));
  };
  const safetySource = "Registrul de siguranță · " + (cur.safety.total
    ? cur.safety.total + (cur.safety.total === 1 ? " raportare" : " raportări") : "Fără raportări");
  const weeklyIncidents = (week) => week.safety.total ? week.safety.incidents : null;
  grid.append(
    kpi({ area: "S", title: "Incidente", value: weeklyIncidents(cur), cur: weeklyIncidents(cur), prev: weeklyIncidents(prev), source: safetySource, better: "down", digits: 0,
      series: trend.map(weeklyIncidents), note: cur.safety.total ? cur.safety.nearMiss + " near-miss · " + cur.safety.observations + " observații" : "" }),
    kpi({ area: "Q", title: "Rebut", source: transferSource("scrap"), value: k.scrapPct, unit: "%", cur: k.scrapPct, prev: pk.scrapPct, better: "down",
      series: trend.map((w) => w.kpis.scrapPct), note: k.scrapPct != null ? fmt(k.scrap, 0) + " buc rebut" : null }),
    kpi({ area: "D", title: "Plan realizat", source: transferSource("plan"), value: k.planPct, unit: "%", cur: k.planPct, prev: pk.planPct, better: "up",
      series: trend.map((w) => w.kpis.planPct), baseline: base.planPct?.start ?? null,
      note: k.coverage.plan.complete ? fmt(k.produced, 0) + " din " + fmt(k.plan, 0) + " buc" + (k.plan === 0 ? " · procent nedefinit" : "") + (base.planPct?.start != null ? " · pornire " + fmt(base.planPct.start) + "%" : "") : null }),
    kpi({ area: "C", title: "Minute de oprire", source: transferSource("downtime"), value: k.downtime, unit: "min", cur: k.downtime, prev: pk.downtime, better: "down", digits: 0,
      series: trend.map((w) => w.kpis.downtime) }),
    kpi({ area: "P", title: "Absențe", source: transferSource("staffing"), value: k.absencePct, unit: "%", cur: k.absencePct, prev: pk.absencePct, better: "down",
      series: trend.map((w) => w.kpis.absencePct), baseline: base.absencePct?.start ?? null,
      note: k.planned ? fmt(k.present, 0) + " prezenți din " + fmt(k.planned, 0) + " planificați" : null }),
  );
  sq.append(grid);
  sq.append(el("p", "Începe cu indicatorul care s-a abătut cel mai mult. Verifică sursa și câte fișe au date, apoi identifică schimbul sau postul de urmărit.", "formHelp"));
  sq.append(el("p", "Procentele se calculează din totalurile săptămânii. Linia punctată din grafic e valoarea de pornire din pagina Indicatori.", "kpiNote"));
  view.append(sq);

  // ——— Pe schimburi ———
  if (cur.records.length) {
    const sh = card("Pe schimburi", "shifts");
    sh.append(el("p", "Sursă · Fișe de predare", "kpiNote"));
    const items = cur.records.map((r) => ({ label: roDate(r.date, { weekday: "short" }) + " " + r.shift, ...recordKpis(r) }));
    sh.append(el("h3", "Plan realizat (%)"),
      bars(items.map((i) => ({ label: i.label, value: i.planPct })), { ref: 100, unit: "%", label: "Plan realizat pe schimb", warnBelow: 100 }),
      el("h3", "Rebut (%)"),
      bars(items.map((i) => ({ label: i.label, value: i.scrapPct })), { unit: "%", label: "Rebut pe schimb", digits: 1 }),
      el("h3", "Minute de oprire"),
      bars(items.map((i) => ({ label: i.label, value: i.downtime })), { unit: "", label: "Minute de oprire pe schimb" }));
    view.append(sh);
  }

  // ——— Probleme ———
  const pr = card("Probleme", "problems");
  const list = problems(data, c);
  const open = list.filter((x) => !x.closed);
  const counts = el("div", "", "statusRow");
  for (const [label, test] of [
    ["Deschise", (x) => x.status === "deschis" || !x.status],
    ["În lucru", (x) => x.status === "in lucru"],
    ["Verificare", (x) => x.status === "verificare"],
  ]) {
    const n = open.filter(test).length;
    const chip = el("span", "", "statusCount");
    chip.append(el("strong", String(n)), el("span", label));
    counts.append(chip);
  }
  const done = el("span", "", "statusCount");
  done.append(el("strong", String(cur.problemsClosed)), el("span", "Închise în săpt."));
  counts.append(done);
  pr.append(counts);
  const oldest = open.filter((x) => x.age != null).sort((a, b) => b.age - a.age).slice(0, 5);
  if (oldest.length) {
    pr.append(el("h3", "Cele mai vechi deschise"));
    const ol = el("div", "", "linkList");
    for (const x of oldest) {
      const row = btn("", () => app.openPage(x.p, "row-" + x.r.id), "linkRow");
      const t = el("span", "", "linkText");
      t.append(el("span", x.label));
      const meta = el("span", "", "meta");
      meta.append(el("span", x.age + (x.age === 1 ? " zi" : " zile"), x.age > 7 ? "chip late" : "chip"));
      if (x.equipment) meta.append(el("span", x.equipment, "chip"));
      if (!x.hasOwner) meta.append(el("span", "fără responsabil", "chip warn"));
      if (!x.due) meta.append(el("span", "fără termen", "chip warn"));
      t.append(meta);
      row.append(t, icon("chevron"));
      ol.append(row);
    }
    pr.append(ol);
  } else pr.append(el("p", list.length ? "Nicio problemă deschisă." : "Nicio problemă înregistrată.", "empty"));
  const top = pareto(data, c, 30);
  pr.append(el("h3", "Unde apar cel mai des (30 de zile)"));
  if (top.length) pr.append(ranking(top.slice(0, 6).map((x) => ({ label: x.equipment, value: x.count })), { label: "Evenimente pe post sau mașină" }));
  else pr.append(el("p", "Alege „Post / mașină” la probleme și la evenimentele de siguranță ca să vezi clasamentul.", "empty"));
  const pb = problemsBlock(data);
  if (pb) pr.append(btn("Deschide registrul", () => app.openPage(pb.p), "small", "chevron"));
  view.append(pr);

  // ——— Pe linii (din tabloul liniilor) ———
  const withPlan = cur.lines.filter((x) => x.pct != null);
  const stops = cur.lines.filter((x) => x.stops || x.down).sort((a, b) => b.stops - a.stops || b.down - a.down);
  if (withPlan.length || stops.length) {
    const lc = card("Pe linii", "linesWeek");
    if (withPlan.length) {
      lc.append(el("h3", "Plan realizat pe linie (%)"),
        ranking(withPlan.sort((a, b) => a.pct - b.pct).map((x) => ({ label: x.name, value: x.pct })),
          { unit: "%", label: "Plan realizat pe linie", warnBelow: 95, max: 100 }));
    }
    if (stops.length) {
      lc.append(el("h3", "Opriri pe linie"),
        ranking(stops.slice(0, 6).map((x) => ({ label: x.name + (x.stops ? " · " + x.stops + "× oprită" : ""), value: x.down })),
          { unit: " min", label: "Minute de oprire pe linie" }));
    }
    view.append(lc);
  }

  // ——— Rutina și turul ———
  const rt = card("Rutina EPT și turul pe linie", "routineCard");
  const facts = el("div", "", "statusRow");
  for (const [n, label] of [
    [cur.routine.rate == null ? "–" : fmt(cur.routine.rate, 0) + "%", "Rutină bifată"],
    [String(cur.routine.shifts), "Schimburi lucrate"],
    [String(cur.routine.no), "Activități NU"],
    [String(cur.audit.checked), "Verificări în tur"],
    [cur.audit.rate == null ? "–" : fmt(cur.audit.rate, 0) + "%", "NOK la tur"],
  ]) {
    const chip = el("span", "", "statusCount");
    chip.append(el("strong", n), el("span", label));
    facts.append(chip);
  }
  rt.append(facts);
  if (cur.routine.list.length)
    rt.append(bars(cur.routine.list.map((s) => ({ label: roDate(s.date, { weekday: "short" }) + " " + s.shift, value: (s.done / s.total) * 100 })),
      { ref: 100, unit: "%", label: "Rutina bifată pe schimb", warnBelow: 70 }));
  view.append(rt);

  // ——— Echipa ———
  const tm = card("Echipa", "teamCard");
  const one = oneOnOnes(data, c);
  const skills = skillsCoverage(data, c.shift);
  const team = el("div", "", "statusRow");
  const met = one.team.filter((x) => x.days != null && x.days <= 30).length;
  for (const [n, label, bad] of [
    [one.team.length ? met + "/" + one.team.length : "–", "1:1 în ultimele 30 de zile", one.team.length && met < one.team.length],
    [String(one.promisesOpen), "Promisiuni deschise", false],
    [String(one.promisesLate), "Promisiuni restante", one.promisesLate > 0],
    [skills.index == null ? "–" : fmt(skills.index, 0) + "%", "Posturi configurate și acoperite", skills.gaps.length > 0],
  ]) {
    const chip = el("span", "", "statusCount" + (bad ? " bad" : ""));
    chip.append(el("strong", n), el("span", label));
    team.append(chip);
  }
  tm.append(team);
  const due = one.team.filter((x) => x.days == null || x.days > 30).slice(0, 6);
  if (due.length) {
    tm.append(el("h3", "Următoarele discuții 1:1"));
    const ul = el("div", "", "linkList");
    for (const x of due) {
      const row = btn("", () => one.p && app.openPage(one.p), "linkRow");
      const t = el("span", "", "linkText");
      t.append(el("span", x.name), el("span", x.days == null ? "nicio discuție notată" : "acum " + x.days + " zile", x.days == null ? "chip warn" : "chip late"));
      row.append(t, icon("chevron"));
      ul.append(row);
    }
    tm.append(ul);
  } else if (!one.team.length) tm.append(el("p", "Adaugă oamenii schimbului în pagina Echipa.", "empty"));
  view.append(tm);

  // ——— Siguranța în ultimele 30 de zile ———
  const events = safetyEvents(data).filter((e) => e.date >= addDays(c.date, -29) && e.date <= c.date);
  if (events.length) {
    const sf = card("Siguranță · 30 de zile", "safetyCard");
    sf.append(ranking([
      { label: "Incidente", value: events.filter((e) => e.type === "incident").length },
      { label: "Near-miss", value: events.filter((e) => e.type === "near-miss").length },
      { label: "Observații", value: events.filter((e) => e.type === "observatie").length },
    ], { label: "Evenimente de siguranță" }));
    sf.append(el("p", "Mai multe raportări de near-miss înseamnă de obicei o cultură de siguranță mai bună, nu un risc mai mare.", "kpiNote"));
    view.append(sf);
  }

  // ——— Revizuirea săptămânii ———
  const rv = card("Revizuirea săptămânii", "review");
  rv.append(el("p", "Vineri, compară rezultatul cu planul și verifică acțiunile restante. Alege trei priorități pentru săptămâna următoare.", "formHelp"));
  const stored = data.reviews?.[cur.key];
  const draft = stored || { priorities: ["", "", ""], note: "" };
  const keep = () => {
    data.reviews ||= {};
    if (draft.priorities.some((p) => p.trim()) || draft.note.trim()) data.reviews[cur.key] = draft;
    else delete data.reviews[cur.key];
    app.save();
  };
  const list3 = el("div", "", "priorities");
  [0, 1, 2].forEach((i) =>
    list3.append(input("Prioritatea " + (i + 1), draft.priorities[i] || "", (v) => { draft.priorities[i] = v; keep(); })));
  rv.append(el("p", "Pentru fiecare prioritate, scrie rezultatul dorit, rolul responsabil și ziua verificării.", "formHelp"),
    list3, fieldHint(input("Ce am învățat săptămâna aceasta", draft.note || "", (v) => { draft.note = v; keep(); }, "area"),
      "Alege un fapt care a avut efect. Scrie ce vei repeta sau ce vei încerca diferit."));
  const previous = data.reviews?.[prev.key];
  if (previous?.priorities.some((p) => p.trim())) {
    rv.append(el("h3", "Prioritățile alese săptămâna trecută"));
    const ul = el("ul", "", "pastPriorities");
    for (const p of previous.priorities.filter((x) => x.trim())) ul.append(el("li", p));
    rv.append(ul);
  }
  view.append(rv);

  const ninety = ninetyDays(data, c);
  if (ninety && !ninety.done)
    view.append(el("p", "Ziua " + ninety.day + " din 90 în funcție" + (ninety.next ? " · reperul zilei " + ninety.next + " în " + ninety.inDays + " zile" : ""), "footer"));
  main.append(view);
}
export function resetAnalysisWeek() {
  offset = 0;
  tab = "week";
  allAdvice = false;
}
