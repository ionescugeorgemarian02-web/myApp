import test from "node:test";
import assert from "node:assert/strict";
import { slotsOf, shiftWindow, currentShift, atTime, isoWeek } from "../js/core/time.js";
import { nn, apportion, sumKnown } from "../js/core/num.js";
import { distribute, hourlyPlan, confirmBaseline, revisePlan } from "../js/domain/plan.js";
import { statusAt, statusMinutes, addEvent, correctEvent } from "../js/domain/lines.js";
import { slotRows, splitGood } from "../js/domain/reports.js";
import { slotOee, sumOee, ratiosOf } from "../js/domain/oee.js";

const S1 = { id: "S1", start: "06:00", end: "14:00", breaks: [] };
const S3 = { id: "S3", start: "22:00", end: "06:00", breaks: [] };
const D = "2026-11-25";
const at = (hm, d = D) => new Date(d + "T" + hm + ":00");

test("schimbul de noapte: fereastra trece peste miezul nopții, data de lucru rămâne cea de început", () => {
  const w = shiftWindow(D, S3);
  assert.equal(w.from.getHours(), 22);
  assert.equal(w.to.getDate(), 26);
  const cur = currentShift(new Date("2026-11-26T02:30:00"), [S1, S3]);
  assert.equal(cur.workDay, D);
  assert.equal(cur.shift.id, "S3");
  assert.equal(slotsOf(D, S3).length, 8);
  assert.equal(slotsOf(D, S3)[2].label, "00:00–01:00");
  assert.equal(atTime(D, S3, "01:30").getDate(), 26);
});

test("lipsa rămâne distinctă de zero", () => {
  assert.equal(nn(""), null);
  assert.equal(nn("0"), 0);
  assert.equal(nn("-3"), null);
  assert.equal(nn("12,5"), 12.5);
  assert.deepEqual(sumKnown([1, null, 2]), { sum: 3, known: 2, missing: 1 });
  assert.deepEqual(sumKnown([null]), { sum: null, known: 0, missing: 1 });
});

test("apportion păstrează suma exactă", () => {
  assert.deepEqual(apportion(10, [1, 1, 1]), [4, 3, 3]);
  assert.equal(apportion(761, [50, 60, 60, 60, 60, 60, 60, 60]).reduce((a, b) => a + b), 761);
});

test("plan orar: exemplul 760, metoda manuală, suma = target", () => {
  const run = { id: "r1", pnId: "p1", start: "06:00", end: "14:00", target: 760, method: "manual", hourly: [80, 100, 100, 80, 100, 100, 100, 100] };
  const h = distribute(run, D, S1);
  assert.deepEqual(h, [80, 100, 100, 80, 100, 100, 100, 100]);
  assert.equal(h.reduce((a, b) => a + b), 760);
});

test("plan orar: minute productive scad pauzele, suma rămâne targetul", () => {
  const shift = { ...S1, breaks: [{ start: "09:00", end: "09:30" }] };
  const run = { id: "r1", start: "06:00", end: "14:00", target: 750, method: "productive" };
  const h = distribute(run, D, shift);
  assert.equal(h.reduce((a, b) => a + b), 750);
  assert.ok(h[3] < h[2], "ora cu pauză are mai puțin");
  const u = distribute({ ...run, method: "uniform" }, D, shift);
  assert.equal(u.reduce((a, b) => a + b), 750);
});

test("plan orar: din timp de ciclu (floor), ciclu lipsă → null", () => {
  const run = { id: "r1", start: "06:00", end: "08:00", method: "cycle", cycleSec: 45 };
  assert.deepEqual(distribute(run, D, S1).slice(0, 3), [80, 80, 0]);
  assert.equal(distribute({ ...run, cycleSec: null }, D, S1), null);
});

test("mai multe PN-uri pe aceeași linie se adună pe ore", () => {
  const plan = { runs: [
    { id: "a", start: "06:00", end: "10:00", target: 400, method: "uniform" },
    { id: "b", start: "10:00", end: "14:00", target: 360, method: "uniform" },
  ] };
  const h = hourlyPlan(plan, D, S1);
  assert.deepEqual(h, [100, 100, 100, 100, 90, 90, 90, 90]);
});

test("baseline imuabil, revizia cere motiv", () => {
  const plan = { runs: [{ id: "a", start: "06:00", end: "14:00", target: 800, method: "uniform" }], revisions: [] };
  confirmBaseline(plan, D, S1, new Date());
  plan.runs[0].target = 700;
  assert.throws(() => revisePlan(plan, D, S1, "", new Date()));
  revisePlan(plan, D, S1, "Lipsă material", new Date());
  assert.equal(plan.baseline.total, 800);
  assert.equal(plan.revisions.at(-1).total, 700);
});

test("oprire peste două ore: minute pe intervale fără dublare; corecția orei recalculează", () => {
  const events = [];
  addEvent(events, { lineId: "L", type: "run", at: at("06:00") });
  const stop = addEvent(events, { lineId: "L", type: "stop", at: at("07:40"), reason: "Senzor" });
  addEvent(events, { lineId: "L", type: "run", at: at("08:20") });
  const m1 = statusMinutes(events, "L", at("07:00"), at("08:00"), []);
  const m2 = statusMinutes(events, "L", at("08:00"), at("09:00"), []);
  assert.equal(m1.stop, 20);
  assert.equal(m2.stop, 20);
  correctEvent(events, stop.id, { at: at("07:30") }, new Date());
  assert.equal(statusMinutes(events, "L", at("07:00"), at("08:00"), []).stop, 30);
  assert.equal(events.find((e) => e.id === stop.id).history.length, 1);
  assert.equal(statusAt(events, "L", at("05:59")), "unknown");
});

test("eveniment anulat nu mai contează", () => {
  const events = [];
  addEvent(events, { lineId: "L", type: "run", at: at("06:00") });
  const s = addEvent(events, { lineId: "L", type: "stop", at: at("06:30") });
  correctEvent(events, s.id, { void: true }, new Date());
  assert.equal(statusAt(events, "L", at("07:00")), "run");
});

test("raport: PN schimbat în oră, zero confirmat vs lipsă", () => {
  assert.equal(splitGood({ total: 50, scrap: 2, rework: 1 }), 47);
  assert.equal(splitGood({ total: 50, scrap: null, rework: 0 }), null);
  assert.equal(splitGood({ total: 0, scrap: 0, rework: 0 }), 0);
});

test("OEE: PN-uri eterogene, A×P×Q egal cu forma simplă; ICT lipsă → P null", () => {
  // slot 60 min, 10 min oprire, PN A: ICT 30 s, 60 buc (58 bune); PN B: ICT 60 s, 20 buc (19 bune)
  const s = slotOee({ ppt: 60, stop: 10, changeover: 0, notrunning: 0, unknown: 0,
    counts: [{ ict: 30, total: 60, good: 58 }, { ict: 60, total: 20, good: 19 }] });
  const r = ratiosOf(s);
  assert.ok(Math.abs(r.a * r.p * r.q - r.oee) < 1e-9);
  assert.ok(Math.abs(r.oee - (58 * 30 + 19 * 60) / (60 * 60)) < 1e-9);
  const miss = ratiosOf(slotOee({ ppt: 60, stop: 0, changeover: 0, notrunning: 0, unknown: 0, counts: [{ ict: null, total: 10, good: 10 }] }));
  assert.equal(miss.p, null);
  assert.equal(miss.oee, null);
  const unk = ratiosOf(slotOee({ ppt: 60, stop: 0, changeover: 0, notrunning: 0, unknown: 15, counts: [{ ict: 30, total: 60, good: 60 }] }));
  assert.equal(unk.a, null);
  assert.ok(unk.oee > 0);
  const agg = ratiosOf(sumOee([s, s]));
  assert.ok(Math.abs(agg.oee - r.oee) < 1e-9);
});

test("rânduri de raport: cumulat, stări (restant, zero confirmat)", () => {
  const plan = { runs: [{ id: "a", pnId: "P", start: "06:00", end: "14:00", target: 800, method: "uniform" }] };
  const reports = { 0: { splits: [{ pnId: "P", total: 95, scrap: 1, rework: 0 }] }, 1: { splits: [{ pnId: "P", total: 0, scrap: 0, rework: 0 }] } };
  const rows = slotRows({ plan, reports, events: [], lineId: "L", workDay: D, shift: S1, now: at("10:30"), grace: 15 });
  assert.equal(rows[0].state, "complete");
  assert.equal(rows[1].actual, 0);
  assert.equal(rows[1].state, "complete");
  assert.equal(rows[2].state, "overdue");
  assert.equal(rows[1].cumActual, 95);
  assert.equal(rows[1].cumDelta, 95 - 200);
  assert.equal(rows[5].state, "pending");
});

test("săptămâna ISO", () => {
  assert.equal(isoWeek("2026-11-25"), "2026-W48");
});

test("changeover planificat: zero target, intră în timpul planificat, nu cere target", async () => {
  const { planIssues, plannedWindows } = await import("../js/domain/plan.js");
  const plan = { runs: [
    { id: "a", start: "06:00", end: "10:00", target: 400, method: "uniform" },
    { id: "c", kind: "changeover", start: "10:00", end: "10:30" },
    { id: "b", start: "10:30", end: "14:00", target: 350, method: "productive" },
  ] };
  const h = hourlyPlan(plan, D, S1);
  assert.equal(h.reduce((x, y) => x + y), 750);
  assert.equal(planIssues(plan, D, S1).length, 0);
  assert.equal(plannedWindows(plan, D, S1).length, 3);
});

test("fusul orar: un instant salvat cu toISOString se citește înapoi la aceeași oră locală (orice TZ)", async () => {
  const { fromIso } = await import("../js/core/time.js");
  const local = new Date(2026, 10, 25, 10, 0);
  assert.equal(fromIso(local.toISOString()).getTime(), local.getTime());
  assert.equal(fromIso("2026-11-25T10:00").getHours(), 10);
});

test("OEE față de ținta 85 % (world class, configurabilă) și semnalarea P > 100 %", async () => {
  const { oeeBand, performanceSuspect } = await import("../js/domain/oee.js");
  assert.equal(oeeBand(0.86), "run");
  assert.equal(oeeBand(0.85), "run");
  assert.equal(oeeBand(0.70), "warn");
  assert.equal(oeeBand(0.60), "stop");
  assert.equal(oeeBand(null), "none");
  assert.equal(oeeBand(0.8, 75), "run");
  assert.equal(performanceSuspect({ p: 1.12 }), true);
  assert.equal(performanceSuspect({ p: 0.95 }), false);
  assert.equal(performanceSuspect({ p: null }), false);
});
