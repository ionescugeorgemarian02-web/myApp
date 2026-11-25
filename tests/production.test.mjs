import test from "node:test";
import assert from "node:assert/strict";
import { csvCell, nonnegative, productionKpis } from "../js/production.js";
import { aggregate } from "../js/metrics.js";

test("abaterea separă lipsa datelor de zero", () => {
  assert.equal(productionKpis({ plan: 8, produced: 0 }).variance, -8);
  assert.equal(productionKpis({ plan: 0, produced: 3 }).variance, 3);
  assert.equal(productionKpis({ plan: 0, produced: 3 }).planPct, null);
  assert.equal(productionKpis({ plan: 8 }).variance, null);
});

test("rate din cantități valide și comparabile", () => {
  const r = productionKpis({ produced: 100, scrap: 5, rework: 8, firstPass: 91 });
  assert.deepEqual([r.scrapPct, r.reworkPct, r.fpy], [5, 8, 91]);
  assert.equal(productionKpis({ produced: 0, scrap: 0 }).scrapPct, null);
  assert.equal(productionKpis({ produced: 5, scrap: 6, rework: -1 }).scrapPct, null);
  assert.equal(productionKpis({ produced: 5, rework: -1 }).reworkPct, null);
  for (const value of ["", " ", "NaN", Infinity, -1, false, "0x10", "1.5"])
    assert.equal(nonnegative(value, true), null);
  assert.equal(nonnegative("5,5"), 5.5);
});

test("total ponderat și lipsuri de personal fără compensare între schimburi", () => {
  const r = aggregate([
    { plan: 10, produced: 8, scrap: 1, planned: 4, present: 3 },
    { plan: 20, produced: 20, scrap: 50, planned: 4, present: 5, downtime: -2 },
  ]);
  assert.equal(r.planPct, 28 / 30 * 100);
  assert.equal(r.scrapPct, 12.5);
  assert.equal(r.absencePct, 12.5);
  assert.equal(r.downtime, null);
});

test("CSV cota delimitatori și neutralizează formule", () => {
  assert.equal(csvCell('=1+"2"'), `"'=1+""2"""`);
  assert.equal(csvCell("  @HYPERLINK"), "\"'  @HYPERLINK\"");
  assert.equal(csvCell("A;B"), '"A;B"');
  assert.equal(csvCell(4), '"4"');
});
