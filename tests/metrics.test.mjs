import assert from "node:assert/strict";
import test from "node:test";
import { seed, upgrade } from "../js/seed.js";
import * as m from "../js/metrics.js";
import { advice } from "../js/advice.js";
import { trackLifecycle } from "../js/records.js";

const ctx = (date = "2026-11-21", time = "10:00", shift = 1) =>
  ({ date, time, workDay: date, shift, automatic: shift, key: date + " · Schimb " + shift, hours: ["06:00", "14:00", "22:00"] });
const byName = (b, name) => b.cols.find((c) => c.name === name);
// Adaugă o predare cu cifre în jurnal.
function shift(data, date, n, figures) {
  const { b } = m.handoverBlock(data);
  const values = { [byName(b, "Data").id]: date, [byName(b, "Schimb").id]: String(n) };
  for (const [key, v] of Object.entries(figures)) values[b.cols.find((c) => c.key === key).id] = String(v);
  b.rows.push({ id: date + n, created: date + "T08:00:00.000Z", values });
}
function problem(data, { date, text, eq = "", owner = "", due = "", status = "Deschis" }) {
  const { b } = m.problemsBlock(data);
  const r = { id: text, created: date + "T09:00:00.000Z", values: {
    [byName(b, "Data").id]: date, [byName(b, "Problemă").id]: text, [byName(b, "Post / mașină").id]: eq,
    [byName(b, "Responsabil").id]: owner, [byName(b, "Termen").id]: due, [byName(b, "Stare").id]: status,
  } };
  b.rows.push(r);
  return r;
}

test("săptămâna ISO și datele", () => {
  assert.equal(m.weekKey("2026-11-21"), "2026-S47");
  assert.equal(m.weekStart("2026-11-21"), "2026-11-16");
  assert.equal(m.weekKey("2026-01-01"), "2026-S01");
  assert.equal(m.weekKey("2027-01-03"), "2026-S53");
  assert.equal(m.addDays("2026-02-27", 2), "2026-03-01");
  assert.equal(m.daysBetween("2026-11-01", "2026-11-21"), 20);
});

test("caietul nou are modulele versiunii 3 și migrarea rulează o singură dată", () => {
  const d = seed();
  assert.ok(m.safetyBlock(d) && m.skillsBlock(d) && m.auditBlocks(d).some(({ b }) => b.auditKind === "safety"));
  assert.deepEqual(m.handoverBlock(d).b.cols.filter((c) => m.SHIFT_FIELDS.some(([key]) => key === c.key)).map((c) => c.key),
    ["plan", "produced", "scrap", "downtime", "planned", "present"]);
  assert.ok(m.problemsBlock(d).b.cols.find((c) => c.name === "Stare").options.includes("Verificare"));
  assert.equal(upgrade(d), false);
  const pages = d.pages.length;
  d.pages = d.pages.filter((p) => p.title !== "Siguranță");
  assert.equal(upgrade(d), false, "un modul șters nu revine");
  assert.equal(d.pages.length, pages - 1);
});

test("un caiet vechi (2.4) primește câmpurile noi fără să piardă datele", () => {
  const d = seed();
  // Simulăm caietul vechi: fără chei, fără module noi, cu o predare scrisă.
  const ho = m.handoverBlock(d).b;
  ho.cols = ho.cols.filter((c) => !c.key);
  byName(ho, "Situația producției / probleme").name = "Probleme";
  ho.rows.push({ id: "x", values: { [byName(ho, "Probleme").id]: "Robot oprit" } });
  d.pages = d.pages.filter((p) => !["Siguranță", "Tur pe linie", "Polivalență"].includes(p.title));
  for (const c of m.problemsBlock(d).b.cols) delete c.key;
  d.templates = [];
  delete d.settings.featuresVersion;
  delete d.settings.equipment;
  assert.equal(upgrade(d), true);
  assert.equal(ho.rows[0].values[byName(ho, "Probleme").id], "Robot oprit");
  assert.ok(ho.cols.some((c) => c.key === "plan"));
  assert.ok(m.safetyBlock(d) && m.skillsBlock(d) && m.auditBlocks(d).length);
  assert.ok(d.templates.some((t) => t.title === "Registru de decizii"));
  assert.deepEqual(d.settings.equipment, []);
});

test("cifrele schimbului: procentele se calculează din totaluri", () => {
  const d = seed();
  shift(d, "2026-11-16", 1, { plan: 1000, produced: 950, scrap: 19, downtime: 40, planned: 20, present: 18 });
  shift(d, "2026-11-17", 1, { plan: 1000, produced: 1050, scrap: 21, downtime: 0, planned: 20, present: 20 });
  shift(d, "2026-11-17", 2, { plan: "800", produced: "760,5" });
  const recs = m.shiftRecords(d);
  assert.equal(recs.length, 3);
  assert.equal(recs[2].produced, 760.5, "acceptă virgula zecimală");
  assert.equal(m.recordKpis(recs[0]).planPct, 95);
  assert.equal(m.recordKpis(recs[0]).scrapPct, 2);
  assert.equal(m.recordKpis(recs[0]).absencePct, 10);
  const k = m.aggregate(recs);
  assert.equal(Math.round(k.planPct * 100) / 100, Math.round(((950 + 1050 + 760.5) / 2800) * 10000) / 100);
  assert.equal(k.scrapPct, 2);
  assert.equal(k.downtime, 40);
  assert.equal(k.absencePct, 5);
});

test("ciclul problemei: data închiderii, verificare, vârstă, recurență", () => {
  const d = seed();
  d.settings.equipment = ["Robot 2", "Presa 3"];
  const { b } = m.problemsBlock(d);
  const r = problem(d, { date: "2026-11-10", text: "Sudură slabă", eq: "Robot 2" });
  problem(d, { date: "2026-11-15", text: "Robot oprit", eq: "Robot 2" });
  problem(d, { date: "2026-11-19", text: "Cablu rupt", eq: "Robot 2", owner: "Ion", due: "2026-11-20" });
  const stare = byName(b, "Stare");
  r.values[stare.id] = "Verificare";
  trackLifecycle(b, r, false, "2026-11-12T10:00:00.000Z");
  assert.ok(r.verifyAt && !r.closedAt);
  r.values[stare.id] = "Închis";
  trackLifecycle(b, r, false, "2026-11-20T10:00:00.000Z");
  assert.ok(r.closedAt && !r.verifyAt);
  const list = m.problems(d, ctx());
  const closed = list.find((x) => x.label.startsWith("Sudură"));
  assert.equal(closed.closed, true);
  assert.equal(closed.age, 10);
  const late = list.find((x) => x.label.startsWith("Cablu"));
  assert.equal(late.overdue, true);
  const rec = m.recurrences(d, ctx());
  assert.equal(rec[0].equipment, "Robot 2");
  assert.equal(rec[0].count, 3);
  r.values[stare.id] = "Deschis";
  trackLifecycle(b, r, true, "2026-11-21T10:00:00.000Z");
  assert.equal(r.closedAt, undefined, "redeschiderea șterge data închiderii");
});

test("metrica principală: angajamente închise la termen", () => {
  const d = seed();
  d.notes.push(
    { id: "a", text: "La timp", priority: "normal", due: "2026-11-18", dueTime: "20:00", done: true, doneAt: new Date("2026-11-18T19:00").toISOString(), createdAt: "2026-11-17T08:00:00.000Z", source: null },
    { id: "b", text: "Întârziat", priority: "normal", due: "2026-11-18", dueTime: "12:00", done: true, doneAt: new Date("2026-11-18T13:00").toISOString(), createdAt: "2026-11-17T08:00:00.000Z", source: null },
    { id: "c", text: "Deschis restant", priority: "normal", due: "2026-11-05", dueTime: "", done: false, createdAt: "2026-11-01T08:00:00.000Z", source: null },
  );
  const r = problem(d, { date: "2026-11-16", text: "Închis la termen", due: "2026-11-19", owner: "Ana", status: "Închis" });
  r.closedAt = new Date("2026-11-19T10:00").toISOString();
  const c = m.commitments(d, "2026-11-16", "2026-11-22", ctx());
  assert.equal(c.closed, 3);
  assert.equal(c.onTime, 2);
  assert.equal(Math.round(c.rate), 67);
  assert.equal(c.late, 1);
  assert.equal(c.lateOld, 1);
});

test("rutina: puncte sărite des în schimburile lucrate", () => {
  const d = seed();
  const rb = d.pages.find((p) => p.title === "Rutina schimbului").blocks[0];
  for (let i = 0; i < 6; i++)
    rb.history["2026-11-1" + i + " · Schimb 1"] = rb.items.map((it, j) => ({ ...it, checked: j !== 6 }));
  rb.key = "2026-11-21 · Schimb 1";
  const s = m.skippedItems(d, ctx());
  assert.equal(s.length, 1);
  assert.equal(s[0].title, rb.items[6].title);
  assert.equal(m.routineShifts(d).length, 7);
});

test("echipa: discuții 1:1, promisiuni și polivalență", () => {
  const d = seed();
  d.settings.equipment = ["Post 1", "Post 2"];
  const team = m.teamBlock(d).b;
  const nume = team.cols.find((c) => c.key === "name");
  team.rows.push({ id: "p1", values: { [nume.id]: "Ana Pop" } }, { id: "p2", values: { [nume.id]: "Ion" } });
  const o = m.oneOnOneBlock(d).b;
  o.rows.push({ id: "o1", values: { [byName(o, "Data").id]: "2026-11-01", [byName(o, "Identificator neutru").id]: "ana pop",
    [byName(o, "Ce am promis").id]: "Scaun nou", [byName(o, "Termen promisiune").id]: "2026-11-10", [byName(o, "Rezolvat").id]: false } });
  const one = m.oneOnOnes(d, ctx());
  assert.equal(one.team.find((x) => x.name === "Ana Pop").days, 20);
  assert.equal(one.team.find((x) => x.name === "Ion").days, null);
  assert.equal(one.promisesLate, 1);
  m.skillsBlock(d).b.levels = { p1: { "Post 1": 2, "Post 2": 3 }, p2: { "Post 1": 3 } };
  const shift = team.cols.find((column) => column.key === "teamShift");
  for (const row of team.rows) row.values[shift.id] = "1";
  d.settings.skillConfig = { labels: [...m.SKILL_LEVELS], requirements: d.settings.equipment.map((post) =>
    ({ shift: 1, post, count: 2, level: 2 })) };
  const cov = m.skillsCoverage(d, 1);
  assert.equal(m.skillsCoverage(d, 2).index, null);
  assert.equal(cov.index, 50);
  assert.deepEqual(cov.gaps.map((g) => g.post), ["Post 2"]);
});

test("sfaturile pornesc de la cifre și sunt ordonate după urgență", () => {
  const d = seed();
  d.settings.equipment = ["Robot 2"];
  // Plan ratat în 4 din 5 schimburi, rebut în creștere față de săptămâna trecută.
  shift(d, "2026-11-10", 1, { plan: 1000, produced: 1000, scrap: 5 });
  shift(d, "2026-11-11", 1, { plan: 1000, produced: 1000, scrap: 5 });
  for (const day of ["16", "17", "18", "19"]) shift(d, "2026-11-" + day, 1, { plan: 1000, produced: 900, scrap: 30 });
  const s = m.safetyBlock(d).b;
  s.rows.push({ id: "s1", values: { [byName(s, "Data").id]: "2026-11-20", [byName(s, "Tip").id]: "Incident", [byName(s, "Stare").id]: "Deschis", [byName(s, "Ce s-a întâmplat").id]: "Tăietură" } });
  for (const t of ["A", "B", "C"]) problem(d, { date: "2026-11-18", text: t, eq: "Robot 2" });
  const ids = advice(d, ctx("2026-11-21", "10:00")).map((a) => a.id);
  assert.equal(ids[0], "safety-open", "siguranța e prima");
  for (const id of ["plan-missed", "scrap-up", "recurrence-Robot 2", "problems-not-smart"]) assert.ok(ids.includes(id), id);
  const levels = advice(d, ctx()).map((a) => a.level);
  const order = { critical: 0, warn: 1, info: 2, good: 3 };
  assert.deepEqual(levels, [...levels].sort((a, b) => order[a] - order[b]));
});

test("sfat de final de schimb și raportul de 90 de zile", () => {
  const d = seed();
  const notice = (c) => advice(d, c).find((a) => a.id === "handover-now");
  const near = ctx("2026-11-21", "13:20", 1);
  assert.equal(notice(near), undefined, "ore neconfirmate");
  d.settings.scheduleConfirmed = true;
  assert.match(notice(near).title, /14:00/);
  assert.equal(notice(ctx("2026-11-21", "09:00", 1)), undefined);
  assert.equal(notice({ ...near, shift: 2 }), undefined, "schimb ales manual");
  const night = { ...ctx("2026-11-22", "05:30", 3), workDay: "2026-11-21", key: "2026-11-21 · Schimb 3" };
  assert.match(notice(night).title, /06:00/);
  shift(d, night.workDay, 3, { plan: 20, produced: 0 });
  assert.ok(notice(night), "cifrele nu confirmă predarea");
  const { b } = m.handoverBlock(d);
  b.rows[0].values[b.cols.find((col) => col.key === "prepared").id] = true;
  assert.equal(notice(night), undefined, "predare verificată");
  d.settings.startDate = "2026-11-01";
  const n = m.ninetyDays(d, ctx());
  assert.equal(n.day, 21);
  assert.equal(n.next, 30);
  assert.equal(n.inDays, 9);
  assert.equal(m.weekSummary(d, ctx(), "2026-11-16").number, 47);
});

test("progres: problemele rămase deschise la final de săptămână", () => {
  const d = seed();
  const a = problem(d, { date: "2026-11-03", text: "Veche", owner: "Ion", due: "2026-11-05", status: "Închis" });
  a.closedAt = new Date("2026-11-12T10:00").toISOString();
  problem(d, { date: "2026-11-10", text: "Nouă", owner: "Ana", due: "2026-11-30" });
  const [w45, w46, w47] = m.weekTrend(d, ctx(), 3);
  assert.equal(w45.backlog, 1, "săpt. 45: prima problemă încă deschisă");
  assert.equal(w46.backlog, 1, "săpt. 46: prima închisă, a doua deschisă");
  assert.equal(w46.problemsOpened, 1);
  assert.equal(w46.problemsClosed, 1);
  assert.equal(w47.backlog, 1);
});
