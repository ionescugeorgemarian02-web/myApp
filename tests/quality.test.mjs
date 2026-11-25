import test from "node:test";
import assert from "node:assert/strict";
import { seed } from "../js/seed.js";
import { computeKpis, kpiComparison, KPI_DEFINITIONS } from "../js/quality.js";

const ctx = { date: "2026-11-21", shift: 1 };
const filters = { from: "2026-11-20", to: ctx.date, zone: "ZA" };
const rows = (data, key) => data.pages.flatMap((p) => p.blocks).find((b) =>
  b.cols?.some((column) => column.key === key));
function add(block, values) {
  block.rows.push({ id: String(block.rows.length), values: Object.fromEntries(
    Object.entries(values).map(([name, value]) => [
      block.cols.find((column) => column.key === name || column.name === name).id, value,
    ])) });
}

test("catalogul KPI include definiții și separă lipsa raportării de zero", () => {
  const report = computeKpis(seed(), ctx, filters);
  assert.ok(KPI_DEFINITIONS.every(([key, , , unit, formula, source]) =>
    Object.hasOwn(report.values, key) && unit && formula && source));
  assert.equal(report.values.incidents, null);
  assert.equal(report.values.stops, null);
  assert.equal(report.values.plan, null);
  assert.equal(report.values.skills, null);
  assert.equal(report.values.fpy, null);
});

test("opriri pe perioada aleasă: durata medie cere toate duratele", () => {
  const data = seed();
  const block = rows(data, "stopEquipment");
  add(block, { stopEquipment: "M1", stopDate: ctx.date, stopMinutes: 10, stopCause: "Alimentare" });
  add(block, { stopEquipment: "M2", stopDate: ctx.date });
  add(block, { stopEquipment: "M3", stopDate: "2026-11-19", stopMinutes: 500 });
  let report = computeKpis(data, ctx, filters);
  assert.equal(report.values.stops, 2);
  assert.equal(report.values.meanStop, null);
  block.rows[1].values[block.cols.find((c) => c.key === "stopMinutes").id] = 0;
  report = computeKpis(data, ctx, filters);
  assert.equal(report.values.downtime, 10);
  assert.equal(report.values.meanStop, 5);
});

test("pragul nevalidat nu colorează indicatorul, zero este prag valid", () => {
  assert.equal(kpiComparison(0, { target: 0, direction: "max", confirmed: false }), "");
  assert.equal(kpiComparison(0, { target: 0, direction: "max", confirmed: true }), "În pragul configurat");
  assert.equal(kpiComparison(5, { target: 6, direction: "min", confirmed: true }), "În afara pragului configurat");
  assert.equal(kpiComparison(null, { target: 5, direction: "min", confirmed: true }), "");
});
