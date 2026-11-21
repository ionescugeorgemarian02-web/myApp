// Progresul în timp: grafice mari pe 4, 8 sau 13 săptămâni, cu valoarea de
// pornire și ținta din pagina Indicatori. Arată dacă lucrurile se îmbunătățesc.
import { app } from "../state.js";
import { el, btn, roDate } from "../ui.js";
import { weekTrend, weekStart, baselines, ninetyDays, skillsCoverage, oneOnOnes } from "../metrics.js";
import { lineChart, columnChart, ring, fmt } from "../charts.js";

let weeks = 8;
const known = (values) => values.filter((v) => v != null);

// Cardul unui grafic: titlu, valoarea curentă, schimbarea în perioadă și o explicație.
function chartCard({ title, values, unit = "", digits = 1, better = "up", chart, help, empty }) {
  const card = el("section", "", "card anaCard chartCard");
  const head = el("div", "", "chartHead");
  const name = el("div");
  name.append(el("h2", title));
  if (help) name.append(el("p", help, "chartHelp"));
  head.append(name);
  const k = known(values);
  if (k.length) {
    const value = el("div", "", "chartNow");
    value.append(el("strong", fmt(k.at(-1), digits) + (unit === "%" ? "%" : unit ? " " + unit : "")));
    if (k.length >= 2) {
      const d = k.at(-1) - k[0];
      const good = better === "none" || Math.abs(d) < 10 ** -digits / 2 ? null : (d > 0) === (better === "up");
      const span = el("span", (Math.abs(d) < 10 ** -digits / 2 ? "stabil" : (d > 0 ? "▲ " : "▼ ") + fmt(Math.abs(d), digits) + (unit === "%" ? " pp" : unit ? " " + unit : "")) + " în perioadă", "kpiDelta");
      if (good != null) span.dataset.good = String(good);
      value.append(span);
    }
    head.append(value);
  }
  card.append(head);
  if (k.length >= 2) card.append(chart());
  else card.append(el("p", empty || "Graficul apare după cel puțin 2 săptămâni cu date. Completează cifrele schimbului în predare.", "chartEmpty"));
  return card;
}

export function progressView(view, c) {
  const data = app.data;
  const trend = weekTrend(data, c, weeks, weekStart(c.date));
  const labels = trend.map((w) => "S" + w.number);
  const base = baselines(data);
  const series = (fn) => trend.map(fn);

  // Alegerea perioadei.
  const period = el("div", "", "segmented light periodPick");
  period.setAttribute("role", "group");
  period.setAttribute("aria-label", "Perioada graficelor");
  for (const n of [4, 8, 13]) {
    const b = btn(n + " săpt.", () => { weeks = n; app.render(); }, n === weeks ? "on" : "");
    b.setAttribute("aria-label", n + " săptămâni");
    b.setAttribute("aria-pressed", String(n === weeks));
    period.append(b);
  }
  view.append(el("p", "Perioada " + roDate(trend[0].start) + " – " + roDate(trend.at(-1).end) + " · fiecare punct este o săptămână", "formHelp periodText"), period);

  // ——— Inelele de progres ———
  const rings = el("section", "", "card anaCard ringsCard");
  rings.append(el("h2", "Unde ești acum"));
  const grid = el("div", "", "ringGrid");
  const n = ninetyDays(data, c);
  if (n) grid.append(ring((Math.min(n.day, 90) / 90) * 100, {
    label: "Primele 90 de zile", text: n.done ? "✓" : String(n.day), sub: n.done ? "parcurse" : "ziua din 90", cls: "accent",
  }));
  const closed = trend.reduce((s, w) => s + w.commitments.closed, 0), onTime = trend.reduce((s, w) => s + w.commitments.onTime, 0);
  grid.append(ring(closed ? (onTime / closed) * 100 : null, { label: "Închise la termen", sub: closed ? onTime + " din " + closed : "fără date" }));
  const routineTotal = trend.flatMap((w) => w.routine.list);
  const routineRate = routineTotal.length ? (routineTotal.reduce((s, x) => s + x.done, 0) / routineTotal.reduce((s, x) => s + x.total, 0)) * 100 : null;
  grid.append(ring(routineRate, { label: "Rutină bifată", sub: routineTotal.length + " schimburi" }));
  const sk = skillsCoverage(data);
  grid.append(ring(sk.index, { label: "Posturi acoperite", sub: sk.posts.length ? "≥2 autonomi" : "adaugă posturi" }));
  const team = oneOnOnes(data, c).team;
  const met = team.filter((x) => x.days != null && x.days <= 30).length;
  grid.append(ring(team.length ? (met / team.length) * 100 : null, { label: "Discuții 1:1", sub: team.length ? met + " din " + team.length + " în 30 de zile" : "adaugă echipa" }));
  rings.append(grid);
  view.append(rings);

  // ——— Graficele pe săptămâni ———
  const charts = el("div", "", "chartGrid");
  const plan = series((w) => w.kpis.planPct);
  charts.append(chartCard({
    title: "Plan realizat", values: plan, unit: "%", better: "up",
    help: "Realizat față de plan, din cifrele predării. Linia de 100% înseamnă planul îndeplinit.",
    chart: () => lineChart({ labels, series: [{ name: "Plan realizat", values: plan, cls: "s1" }], unit: "%", ref: 100,
      baseline: base.planPct?.start ?? null, target: base.planPct?.target ?? null, label: "Plan realizat pe săptămâni" }),
  }));
  const scrap = series((w) => w.kpis.scrapPct);
  charts.append(chartCard({
    title: "Rebut", values: scrap, unit: "%", better: "down", digits: 1,
    help: "Rebut față de piesele realizate. Mai jos e mai bine.",
    chart: () => lineChart({ labels, series: [{ name: "Rebut", values: scrap, cls: "s3" }], unit: "%", label: "Rebut pe săptămâni" }),
  }));
  const down = series((w) => w.kpis.downtime);
  charts.append(chartCard({
    title: "Minute de oprire", values: down, unit: "min", better: "down", digits: 0,
    help: "Totalul minutelor de oprire raportate în săptămână.",
    chart: () => columnChart({ labels, series: [{ name: "Minute de oprire", values: down, cls: "s3" }], label: "Minute de oprire pe săptămâni" }),
  }));
  const absence = series((w) => w.kpis.absencePct);
  charts.append(chartCard({
    title: "Absențe", values: absence, unit: "%", better: "down",
    help: "Absenți față de efectivul planificat.",
    chart: () => lineChart({ labels, series: [{ name: "Absențe", values: absence, cls: "s4" }], unit: "%", min: 0,
      baseline: base.absencePct?.start ?? null, target: base.absencePct?.target ?? null, label: "Absențe pe săptămâni" }),
  }));
  const ontime = series((w) => w.commitments.rate), routine = series((w) => w.routine.rate);
  charts.append(chartCard({
    title: "Disciplina de execuție", values: ontime.some((v) => v != null) ? ontime : routine, unit: "%", better: "up", digits: 0,
    help: "Angajamente închise la termen și rutina bifată, pe săptămâni.",
    chart: () => lineChart({ labels, series: [
      { name: "Închise la termen", values: ontime, cls: "s1" },
      { name: "Rutină bifată", values: routine, cls: "s2" },
    ], unit: "%", digits: 0, min: 0, max: 100, label: "Disciplina de execuție" }),
  }));
  const opened = series((w) => w.problemsOpened), shut = series((w) => w.problemsClosed), backlog = series((w) => w.backlog);
  const anyProblems = trend.some((w) => w.problemsOpened || w.problemsClosed || w.backlog);
  charts.append(chartCard({
    title: "Probleme", values: anyProblems ? backlog : [], unit: "deschise", digits: 0, better: "down",
    help: "Coloane: probleme noi și închise. Linia: câte rămân deschise la final de săptămână.",
    empty: "Graficul apare după ce notezi probleme în registru.",
    chart: () => columnChart({ labels, series: [
      { name: "Noi", values: opened, cls: "s4" },
      { name: "Închise", values: shut, cls: "s1" },
    ], line: { name: "Deschise", values: backlog, cls: "s3" }, label: "Probleme pe săptămâni" }),
  }));
  const inc = series((w) => w.safety.incidents), near = series((w) => w.safety.nearMiss), obs = series((w) => w.safety.observations);
  const safetyAny = trend.some((w) => w.safety.total);
  charts.append(chartCard({
    title: "Siguranță", values: safetyAny ? series((w) => w.safety.total) : [], unit: "", digits: 0, better: "none",
    help: "Raportările pe săptămâni. Mai multe near-miss raportate arată de obicei o cultură de siguranță mai bună.",
    empty: "Graficul apare după primele raportări din registrul de siguranță.",
    chart: () => columnChart({ labels, stacked: true, series: [
      { name: "Incidente", values: inc, cls: "s3" },
      { name: "Near-miss", values: near, cls: "s4" },
      { name: "Observații", values: obs, cls: "s2" },
    ], label: "Evenimente de siguranță pe săptămâni" }),
  }));
  view.append(charts);
}
