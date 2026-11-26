import test from "node:test";
import assert from "node:assert/strict";
import { emptyDoc, ensureShape, sanitize } from "../js/core/doc.js";
import { migrateV4 } from "../js/core/migrate.js";
import { demoDoc } from "../js/core/seed.js";
import { createIncident, transition, durations, reliability } from "../js/domain/incidents.js";
import { createTask, setStatus, isOverdue, spawnNext } from "../js/domain/tasks.js";
import { setLevel, levelOf, conflicts, assign, suggestions } from "../js/domain/workforce.js";
import { routineFor, record, nowList, progress } from "../js/domain/routine.js";
import { startAudit, answer, finishAudit, score, updateTemplate, create8D, completeStep, verifyCause } from "../js/domain/quality.js";
import { attention } from "../js/domain/assistant.js";
import { shiftState } from "../js/domain/shift.js";
import { buildHandover, handoverText } from "../js/domain/handover.js";

const S1 = { id: "S1", name: "Schimbul 1", start: "06:00", end: "14:00", breaks: [] };
const D = "2026-11-25";
const at = (hm) => new Date(D + "T" + hm + ":00");

test("sanitize elimină cheile care poluează prototipul; ensureShape respinge tipuri greșite", () => {
  const evil = JSON.parse('{"schemaVersion":2,"__proto__":{"x":1},"settings":{"constructor":{"a":1}}}');
  const d = ensureShape(evil);
  assert.equal(({}).x, undefined);
  assert.equal(Object.hasOwn(d.settings, "constructor"), false);
  assert.throws(() => ensureShape({ schemaVersion: 2, tasks: "nu" }));
  assert.throws(() => ensureShape({ schemaVersion: 1 }));
  assert.deepEqual(sanitize({ a: [1, Infinity] }), { a: [1, null] });
});

test("migrare v4: niveluri 1→2, 2→3, 3→4; fără înregistrare = neevaluat; documentul vechi neatins", () => {
  const old = { schemaVersion: 1, settings: { equipment: ["Linia X", "Linia Y"], hours: ["06:00", "14:00", "22:00"], zone: "Z" }, templates: [], pages: [{ blocks: [
    { type: "table", cols: [{ id: "c1", key: "name", name: "Nume" }], rows: [{ id: "r1", values: { c1: "Operator 01" } }, { id: "r2", values: { c1: "Operator 02" } }] },
    { type: "skills", levels: { r1: { "Linia X": 1, "Linia Y": 3 }, r2: { "Linia X": 2 } } },
    { type: "table", cols: [{ id: "p", key: "problem", name: "Problema" }, { id: "s", name: "Stare" }], rows: [{ id: "x", values: { p: "Scurgere aer", s: "Deschisă" } }, { id: "y", values: { p: "Veche", s: "Închisă" } }] },
  ] }] };
  const before = JSON.stringify(old);
  const d = migrateV4(old);
  assert.equal(JSON.stringify(old), before);
  assert.equal(d.master.lines.length, 2);
  const [p1, p2] = d.master.people;
  const [lx, ly] = d.master.lines;
  assert.equal(levelOf(d, p1.id, lx.id, null).level, 2);
  assert.equal(levelOf(d, p1.id, ly.id, null).level, 4);
  assert.equal(levelOf(d, p2.id, lx.id, null).level, 3);
  assert.equal(levelOf(d, p2.id, ly.id, null), null);
  assert.ok(levelOf(d, p1.id, lx.id, null).migrated);
  assert.equal(d.tasks.length, 1);
  assert.equal(d.tasks[0].title, "Scurgere aer");
});

test("calificare: exact 1–4, nivelul 4 cere nivelul 3, istoric păstrat", () => {
  const d = emptyDoc();
  assert.throws(() => setLevel(d, "p", "L", "m", 0));
  assert.throws(() => setLevel(d, "p", "L", "m", 4));
  setLevel(d, "p", "L", "m", 3, { evaluator: "TL 01" });
  setLevel(d, "p", "L", "m", 4, { evaluator: "TL 01" });
  assert.equal(levelOf(d, "p", "L", "m").level, 4);
  assert.equal(levelOf(d, "p", "L", "m").history.length, 1);
  assert.equal(levelOf(d, "p", "L", null), null);
});

test("alocare: absent alocat, dublă alocare, nivel 2 fără suport, sugestii", () => {
  const d = emptyDoc();
  d.master.lines.push({ id: "L1", name: "Linia A", machines: [{ id: "m1", name: "OP10", requiredLevel: 3 }, { id: "m2", name: "OP20", requiredLevel: 3 }], requiredOps: 2 });
  d.master.people.push({ id: "a", name: "Operator 01" }, { id: "b", name: "Operator 02" }, { id: "c", name: "Operator 03" });
  const sk = D + "|S1";
  d.attendance[sk] = { a: "present", b: "absent", c: "present" };
  setLevel(d, "a", "L1", "m1", 2);
  setLevel(d, "c", "L1", "m2", 3);
  assign(d, sk, { personId: "a", lineId: "L1", machineId: "m1" });
  assign(d, sk, { personId: "b", lineId: "L1", machineId: "m2" });
  assign(d, sk, { personId: "a", lineId: "L1", machineId: "m2" });
  const types = conflicts(d, sk).map((c) => c.type);
  assert.ok(types.includes("absent"));
  assert.ok(types.includes("double"));
  assert.ok(types.includes("nosupport"));
  assert.deepEqual(suggestions(d, sk, "L1", "m2").map((s) => s.person.id), ["c"]);
});

test("incident: tranziții, ore reale, închidere cere acțiune, MTTR/MTBF cu prag", () => {
  const list = [];
  const i = createIncident(list, { lineId: "L1", startAt: at("09:15") }, at("09:16"));
  assert.throws(() => transition(i, "closed", at("09:20")));
  transition(i, "intervention", at("09:30"), at("09:20"));
  transition(i, "resolved", at("09:45"), at("09:42"));
  assert.equal(durations(i).repair, 27);
  assert.equal(durations(i).intervention, 22);
  transition(i, "verified", at("09:50"));
  assert.throws(() => transition(i, "closed", at("09:55")));
  i.action = "Senzor înlocuit";
  transition(i, "closed", at("09:56"));
  const r = reliability(list, { runMinutes: 400 });
  assert.equal(r.mttr, 27);
  assert.equal(r.mtbf, null);
});

test("sarcini: verificare cere dovadă, restanță calculată, recurență fără duplicate", () => {
  const list = [];
  const t = createTask(list, { title: "Curăță OP20", due: "2026-11-24", recurrence: "day" }, at("06:00"));
  assert.equal(isOverdue(t, D), true);
  setStatus(t, "done", at("07:00"));
  assert.throws(() => setStatus(t, "verified", at("07:05")));
  setStatus(t, "verified", at("07:06"), { evidence: "Verificat la post" });
  spawnNext(list, t);
  spawnNext(list, t);
  assert.equal(list.length, 2);
  assert.throws(() => createTask(list, { title: " " }));
});

test("rutina: instanțe stabile la redeschidere, 2h generează puncte, NOK = finalizat cu rezultat NOK", () => {
  const d = emptyDoc();
  const r1 = routineFor(d, D, S1, at("07:00"));
  const r2 = routineFor(d, D, S1, at("12:00"));
  assert.deepEqual(r1.map((r) => r.inst.key), r2.map((r) => r.inst.key));
  assert.equal(new Set(r1.map((r) => r.inst.key)).size, r1.length);
  assert.equal(r1.filter((r) => r.act.id === "d-status").length, 3);
  const k = r1.find((r) => r.act.id === "s-workforce").inst.key;
  record(d, k, { result: "nok", note: "Lipsă 2 operatori" }, at("06:20"));
  const row = routineFor(d, D, S1, at("07:00")).find((r) => r.inst.key === k);
  assert.equal(row.status, "done");
  assert.equal(row.entry.result, "nok");
  assert.equal(routineFor(d, D, S1, at("13:00")).find((r) => r.act.id === "b-hse").status, "overdue");
  assert.ok(nowList(routineFor(d, D, S1, at("07:00"))).length > 0);
  assert.ok(progress(r1).total > 30);
});

test("audit: versiunea veche păstrează întrebările; N/A nu intră în scor; NOK cere acțiune", () => {
  const d = emptyDoc();
  const a = startAudit(d, "firstoff", { lineId: "L1" });
  updateTemplate(d, "firstoff", [{ text: "Întrebare nouă" }]);
  assert.equal(a.questions.length, 4);
  assert.equal(startAudit(d, "firstoff", {}).questions.length, 1);
  a.questions.forEach((q, i) => answer(a, q.id, { r: ["ok", "ok", "na", "nok"][i] }));
  assert.equal(score(a).ratio, 2 / 3);
  assert.throws(() => finishAudit(a));
  answer(a, a.questions[3].id, { action: "Actualizează fișa" });
  finishAudit(a);
  assert.equal(a.status, "done");
});

test("8D: cauza se confirmă doar cu dovadă; D4 și D6 au porți", () => {
  const d = emptyDoc();
  const x = create8D(d, { title: "Cordon incomplet" });
  completeStep(x, "d1");
  x.w5h2.what = "12 piese cu cordon incomplet";
  completeStep(x, "d2");
  x.containment.push({ text: "Sortare 100 %" });
  completeStep(x, "d3");
  x.causes.push({ id: "c", text: "Duză uzată", m6: "Mașină", kind: "occurrence", status: "candidate" });
  assert.throws(() => completeStep(x, "d4"));
  assert.throws(() => verifyCause(x.causes[0], ""));
  verifyCause(x.causes[0], "Reproducere cu duză uzată: defect 5/5");
  completeStep(x, "d4");
  x.actions.push({ text: "Interval de schimbare duză" });
  completeStep(x, "d5");
  assert.throws(() => completeStep(x, "d6"));
});

test("asistent: fără date nu inventează alerte; cu date demo explică fiecare alertă", () => {
  const empty = emptyDoc();
  const now = at("10:30");
  const st = shiftState(empty, D, empty.settings.shifts[0], now);
  const a = attention(empty, st, now).filter((x) => x.kind !== "routine");
  assert.deepEqual(a, []);
  const demo = demoDoc(now);
  const st2 = shiftState(demo, D, demo.settings.shifts[0], now);
  const alerts = attention(demo, st2, now);
  assert.ok(alerts.length > 0);
  for (const x of alerts) { assert.ok(x.evidence); assert.ok(x.route.startsWith("#/")); }
  assert.ok(alerts.some((x) => x.kind === "stop"));
  assert.ok(alerts.some((x) => x.kind === "report"));
});

test("predare generată din date, fără reintroducere", () => {
  const now = at("13:30");
  const demo = demoDoc(now);
  const st = shiftState(demo, D, demo.settings.shifts[0], now);
  const h = buildHandover(demo, st, now);
  assert.equal(h.lines.length, 11, "11 linii planificate; cele 2 neplanificate, fără evenimente, nu apar");
  assert.ok(h.lines.some((l) => l.missing.length > 0), "raportul lipsă al liniei E apare în predare");
  const text = handoverText(h, { priorities: "Linia F prioritară" });
  assert.match(text, /PREDARE SCHIMB/);
  assert.match(text, /Linia F prioritară/);
  assert.match(text, /INCIDENTE DESCHISE/);
});

test("CSV: formulele sunt neutralizate, numerele negative rămân numere", async () => {
  const src = (await import("node:fs")).readFileSync(new URL("../js/core/store.js", import.meta.url), "utf8");
  const csvCell = new Function("return " + src.slice(src.indexOf("function csvCell"), src.indexOf("export const toCsv")))();
  assert.equal(csvCell("=HYPERLINK(1)"), "\"'=HYPERLINK(1)\"");
  assert.equal(csvCell("-5"), '"-5"');
  assert.equal(csvCell(-12), '"-12"');
  assert.equal(csvCell("-cmd"), "\"'-cmd\"");
});

test("rollback în loc: entitățile păstrează identitatea, modificarea eșuată dispare", async () => {
  const { restoreInto } = await import("../js/core/restore.js");
  const doc = { incidents: [{ id: "i", status: "open", action: "" }], tasks: [] };
  const snap = structuredClone(doc);
  const held = doc.incidents[0];
  held.status = "closed"; doc.tasks.push({ id: "t" }); doc.extra = 1;
  restoreInto(doc, snap);
  assert.equal(doc.incidents[0], held, "aceeași referință ca în vedere");
  assert.equal(held.status, "open");
  assert.equal(doc.tasks.length, 0);
  assert.equal(Object.hasOwn(doc, "extra"), false);
});

test("ensureShape repară structuri imbricate corupte fără a bloca pornirea", () => {
  const d = emptyDoc();
  d.master.lines.push({ id: "L", name: "Linia A", machines: "x" });
  d.quals["p|L:*"] = { level: 7 };
  d.events.push({ id: "e", lineId: "L", at: "nu" });
  const r = ensureShape(JSON.parse(JSON.stringify(d)));
  assert.deepEqual(r.master.lines[0].machines, []);
  assert.equal(r.quals["p|L:*"], undefined);
  assert.equal(r.events.length, 0);
  const bad = JSON.parse(JSON.stringify(emptyDoc()));
  bad.settings.shifts[0].start = "";
  assert.throws(() => ensureShape(bad));
});

test("plan manual: o celulă invalidă nu devine 0, ci conflict", async () => {
  const { distribute, planIssues } = await import("../js/domain/plan.js");
  const S1 = { id: "S1", start: "06:00", end: "14:00", breaks: [] };
  const run = { id: "m", start: "06:00", end: "14:00", method: "manual", target: 100, hourly: [50, null, 50, 0, 0, 0, 0, 0] };
  assert.equal(distribute(run, "2026-11-25", S1), null);
  assert.ok(planIssues({ runs: [run] }, "2026-11-25", S1).some((i) => /fără valoare/.test(i.text)));
});

test("OEE pe oră: oprirea din afara ferestrei planificate nu scade din Availability", async () => {
  const { slotRows } = await import("../js/domain/reports.js");
  const { addEvent } = await import("../js/domain/lines.js");
  const S1 = { id: "S1", start: "06:00", end: "14:00", breaks: [] };
  const at = (hm) => new Date("2026-11-25T" + hm + ":00");
  const plan = { runs: [{ id: "a", pnId: "P", start: "10:30", end: "14:00", target: 210, method: "productive" }] };
  const events = [];
  addEvent(events, { lineId: "L", type: "stop", at: at("10:00") });
  addEvent(events, { lineId: "L", type: "run", at: at("10:30") });
  const reports = { 4: { splits: [{ pnId: "P", total: 30, scrap: 0, rework: 0 }] } };
  const rows = slotRows({ plan, reports, events, lineId: "L", workDay: "2026-11-25", shift: S1, now: at("12:00"), pnIct: () => 60 });
  assert.equal(rows[4].ppt, 30);
  assert.equal(rows[4].oee.stop, 0);
  assert.equal(rows[4].oee.unknown, 0);
});

test("Service Worker: inventarul conține exact fișierele aplicației", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const root = new URL("..", import.meta.url).pathname;
  const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const listed = new Set([...sw.matchAll(/"\.\/([^"]*)"/g)].map((m) => m[1]).filter(Boolean));
  const walk = (d) => fs.readdirSync(path.join(root, d), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(d + "/" + e.name) : [d + "/" + e.name]));
  const actual = [...walk("js"), ...walk("css"), ...walk("fonts").filter((f) => f.endsWith(".woff2")), ...walk("icons")];
  for (const f of actual) assert.ok(listed.has(f), "lipsește din sw.js: " + f);
  for (const f of listed) assert.ok(fs.existsSync(path.join(root, f)), "listat dar inexistent: " + f);
});
