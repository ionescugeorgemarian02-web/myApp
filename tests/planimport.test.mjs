import test from "node:test";
import assert from "node:assert/strict";
import { emptyDoc } from "../js/core/doc.js";
import { parsePlanText, applyPlanImport } from "../js/domain/planimport.js";
import { hourlyPlan, total } from "../js/domain/plan.js";

// Date sintetice (nu cele reale): linii și PN-uri de test.
const doc = () => {
  const d = emptyDoc();
  d.master.lines = ["Linia A", "Linia B", "Linia C"].map((name, i) => ({ id: "L" + i, name, machines: [], pnIds: [], requiredOps: null, active: true }));
  return d;
};
const S1 = { id: "S1", name: "Schimbul 1", start: "06:00", end: "14:00", breaks: [] };

test("format simplu: Linie; PN; Plan; Operatori", () => {
  const r = parsePlanText("Linia A; PN-TEST.001A; 348; 11\nlinia b; PN-TEST.002C; 200;", doc());
  assert.deepEqual(r.rows.map((x) => [x.lineName, x.pn, x.target, x.ops]), [["Linia A", "PN-TEST.001A", 348, 11], ["Linia B", "PN-TEST.002C", 200, null]]);
  assert.equal(r.total, 548);
  assert.deepEqual(r.errors, []);
});
test("copiat din Excel: PLAN, ACTUAL, PROGRAM, pn, nr op (tab); rândurile fără plan sunt sărite", () => {
  const txt = "PLAN\tACTUAL\tPROGRAM\tpn\tnr op\n348\t0\tLinia A\t11.00.000.000.001A\t11\n\t0\tLinia B\t\t\n180\t0\tLinia C\t11.00.000.000.002H\t1\n2462";
  const r = parsePlanText(txt, doc());
  assert.deepEqual(r.rows.map((x) => [x.lineName, x.pn, x.target, x.ops]), [["Linia A", "11.00.000.000.001A", 348, 11], ["Linia C", "11.00.000.000.002H", 180, 1]]);
  assert.deepEqual(r.skipped, ["Linia B"]);
});
test("linie necunoscută → eroare explicită, nu se ghicește", () => {
  const r = parsePlanText("Linia Z; PN-X; 10; 1", doc());
  assert.equal(r.rows.length, 0);
  assert.match(r.errors[0], /Linia Z/);
});
test("aplicare: PN-uri salvate în catalog și legate de linie, operatori, plan pe schimb; restul liniilor neplanificate", () => {
  const d = doc();
  const r = parsePlanText("Linia A; PN-T1; 348; 11\nLinia C; PN-T2; 180; 1", d);
  const res = applyPlanImport(d, r.rows, "2026-11-26", S1, { markOthersNotPlanned: true });
  assert.equal(res.created, 2);
  assert.equal(d.master.pns.length, 2);
  const A = d.master.lines[0];
  assert.equal(A.requiredOps, 11);
  assert.equal(A.pnIds.length, 1);
  const sk = "2026-11-26|S1";
  assert.equal(total(hourlyPlan(d.plans[sk].L0, "2026-11-26", S1)), 348);
  assert.equal(d.plans[sk].L1.notPlanned, true);
  // Re-import (a doua zi): PN-ul existent se refolosește, nu se dublează.
  const r2 = parsePlanText("Linia A; PN-T1; 300; 11", d);
  applyPlanImport(d, r2.rows, "2026-11-27", S1);
  assert.equal(d.master.pns.length, 2);
});
test("planul cu baseline nu se suprascrie în tăcere", () => {
  const d = doc();
  applyPlanImport(d, parsePlanText("Linia A; PN-T1; 348; 11", d).rows, "2026-11-26", S1);
  d.plans["2026-11-26|S1"].L0.baseline = { total: 348 };
  assert.throws(() => applyPlanImport(d, parsePlanText("Linia A; PN-T1; 100; 11", d).rows, "2026-11-26", S1), /baseline/);
});

test("link de plan: codare/decodare UTF-8, validare, refuz la conținut stricat", async () => {
  const { encodePlanLink, decodePlanLink, rowsFromPayload } = await import("../js/domain/planimport.js");
  const payload = { v: 1, day: "2026-11-26", shift: "S1", rows: [["Linia A", "PN-T.Ă1", 348, 11], ["Linia B", "PN-T2", 200, null]], others: true };
  const code = encodePlanLink(payload);
  assert.match(code, /^[A-Za-z0-9_-]+$/, "sigur în URL");
  const back = decodePlanLink(code);
  assert.deepEqual(back, payload);
  const r = rowsFromPayload(back, doc());
  assert.equal(r.total, 548);
  assert.deepEqual(r.errors, []);
  assert.throws(() => decodePlanLink("nu-e-valid!!"));
  assert.throws(() => decodePlanLink(encodePlanLink({ v: 1, day: "nu", shift: "S1", rows: [] })));
  assert.throws(() => decodePlanLink(encodePlanLink({ v: 1, day: "2026-11-26", shift: "S1", rows: [["Linia A", "x", -5, 1]] })));
});

test("profil orar: rotunjire care păstrează exact totalurile pe linie și pe oră", async () => {
  const { splitByProfile } = await import("../js/domain/planimport.js");
  // Numere sintetice: 8 linii, total 1000, profil orar cu două ore mai slabe.
  const plans = [137, 211, 95, 163, 58, 119, 142, 75];
  const prof = [134, 134, 134, 95, 101, 134, 134, 134];
  const m = splitByProfile(plans, prof);
  m.forEach((row, i) => assert.equal(row.reduce((a, b) => a + b, 0), plans[i]));
  prof.forEach((p, j) => assert.equal(m.reduce((a, row) => a + row[j], 0), p));
  assert.ok(m.flat().every((x) => Number.isInteger(x) && x >= 0));
  assert.throws(() => splitByProfile([10], [3, 3]), /total/);
});
test("link cu profil orar și normă: plan manual pe ore, normă salvată pe linie, ciclu planificat pe PN", async () => {
  const { encodePlanLink, decodePlanLink, rowsFromPayload, applyPlanImport } = await import("../js/domain/planimport.js");
  const d = doc();
  const p = decodePlanLink(encodePlanLink({ v: 1, day: "2026-11-26", shift: "S1", others: true, hours: [6, 6, 6, 6, 6, 6, 6, 6],
    rows: [["Linia A", "PN-H1", 30, 2, 60], ["Linia B", "PN-H2", 18, 1, 40]], norms: { "Linia C": 112 } }));
  const r = rowsFromPayload(p, d);
  applyPlanImport(d, r.rows, p.day, S1, { markOthersNotPlanned: true, hours: p.hours, norms: p.norms });
  const sk = "2026-11-26|S1";
  const hA = hourlyPlan(d.plans[sk].L0, p.day, S1);
  assert.equal(total(hA), 30);
  assert.equal(d.plans[sk].L0.runs[0].method, "manual");
  assert.equal(d.master.lines[0].hourlyNorm, 60);
  assert.equal(d.master.lines[2].hourlyNorm, 112);
  assert.equal(d.master.pns.find((x) => x.code === "PN-H1").cycleSec, 60);
});
test("link cu realizat pe ore: rapoarte orare completate, rebutul rămâne necunoscut, raportul introdus manual nu se suprascrie", async () => {
  const { encodePlanLink, decodePlanLink, rowsFromPayload, applyPlanImport, applyActuals } = await import("../js/domain/planimport.js");
  const d = doc();
  const p = decodePlanLink(encodePlanLink({ v: 1, day: "2026-11-26", shift: "S1", others: true, hours: [6, 6, 6, 6, 6, 6, 6, 6],
    rows: [["Linia A", "PN-R1", 30, 2, 60], ["Linia B", "PN-R2", 18, 1, 40]], actuals: { "Linia A": [4, 5], "Linia B": [null, 2] } }));
  assert.deepEqual(p.actuals["Linia A"], [4, 5]);
  const r = rowsFromPayload(p, d);
  applyPlanImport(d, r.rows, p.day, S1, { markOthersNotPlanned: true, hours: p.hours });
  const sk = "2026-11-26|S1";
  d.reports[sk] = { L1: { 1: { splits: [{ pnId: null, total: 9, scrap: 0, rework: 0 }], na: false } } };
  const out = applyActuals(d, p.actuals, p.day, S1, "2026-11-26T06:00:00.000Z");
  const a0 = d.reports[sk].L0[0].splits[0];
  assert.equal(a0.total, 4);
  assert.equal(a0.scrap, null);
  assert.equal(a0.pnId, d.master.pns.find((x) => x.code === "PN-R1").id);
  assert.equal(d.reports[sk].L0[1].splits[0].total, 5);
  assert.equal(d.reports[sk].L1[0], undefined, "null = lipsă, nu 0");
  assert.equal(d.reports[sk].L1[1].splits[0].total, 9, "raportul de pe telefon are prioritate");
  assert.deepEqual(out, { saved: 2, kept: 1, unknown: [] });
  // Re-aplicarea actualizează rapoartele venite din link.
  applyActuals(d, { "Linia A": [7] }, p.day, S1, "2026-11-26T07:00:00.000Z");
  assert.equal(d.reports[sk].L0[0].splits[0].total, 7);
  assert.throws(() => decodePlanLink(encodePlanLink({ v: 1, day: "2026-11-26", shift: "S1", rows: [], actuals: { "Linia A": [-1] } })));
});
test("link: operatori lipsă nu mută norma în coloana de operatori", async () => {
  const { encodePlanLink, decodePlanLink, rowsFromPayload } = await import("../js/domain/planimport.js");
  const p = decodePlanLink(encodePlanLink({ v: 1, day: "2026-11-26", shift: "S1", rows: [["Linia A", "PN-X", 200, null, 30]] }));
  const r = rowsFromPayload(p, doc()).rows[0];
  assert.equal(r.ops, null);
  assert.equal(r.norm, 30);
});
test("link: repară operatorii salvați greșit egal cu norma când operatorii lipsesc", async () => {
  const { applyPlanImport } = await import("../js/domain/planimport.js");
  const d = doc();
  d.master.lines[0].requiredOps = 30;
  applyPlanImport(d, [{ lineId: "L0", lineName: "Linia A", pn: "PN-Y", target: 200, ops: null, norm: 30 }], "2026-11-26", S1);
  assert.equal(d.master.lines[0].requiredOps, null);
});
test("link: rebut confirmat, motiv pe linie (CP) și 0 operatori", async () => {
  const { encodePlanLink, decodePlanLink, rowsFromPayload, applyPlanImport, applyActuals } = await import("../js/domain/planimport.js");
  const d = doc();
  const p = decodePlanLink(encodePlanLink({ v: 1, day: "2026-11-26", shift: "S1", rows: [["Linia A", "PN-Z", 30, 0, 60]],
    actuals: { "Linia A": [0, 3] }, scrap: 0, reasons: { "Linia A": "CP – closed plan" } }));
  applyPlanImport(d, rowsFromPayload(p, d).rows, p.day, S1);
  assert.equal(d.master.lines[0].requiredOps, 0);
  applyActuals(d, p.actuals, p.day, S1, undefined, { scrap: p.scrap, reasons: p.reasons });
  const e = d.reports["2026-11-26|S1"].L0[0];
  assert.deepEqual([e.splits[0].total, e.splits[0].scrap, e.splits[0].rework, e.reason], [0, 0, 0, "CP – closed plan"]);
  assert.throws(() => decodePlanLink(encodePlanLink({ v: 1, day: "2026-11-26", shift: "S1", rows: [], scrap: -1 })));
});
