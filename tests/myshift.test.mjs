import test from "node:test";
import assert from "node:assert/strict";
import { myShiftOccurrence } from "../js/core/time.js";
import { emptyDoc, ensureShape, looksLikeDemo } from "../js/core/doc.js";
import { demoDoc } from "./fixtures/demo.mjs";

const shifts = emptyDoc().settings.shifts;
const at = (s) => new Date(s);

test("schimbul meu: ieri schimbul 1, azi (03:43) tot schimbul 1 al zilei curente, nu schimbul 3 care rulează", () => {
  const o = myShiftOccurrence(at("2026-11-26T03:43:00"), shifts, "S1");
  assert.equal(o.workDay, "2026-11-26");
  assert.equal(o.shift.id, "S1");
});
test("schimbul meu: în timpul schimbului rămâne ziua curentă; după final trece la ziua următoare", () => {
  assert.equal(myShiftOccurrence(at("2026-11-26T10:00:00"), shifts, "S1").workDay, "2026-11-26");
  assert.equal(myShiftOccurrence(at("2026-11-26T14:00:00"), shifts, "S1").workDay, "2026-11-27");
  assert.equal(myShiftOccurrence(at("2026-11-26T15:30:00"), shifts, "S1").workDay, "2026-11-27");
});
test("schimbul meu de noapte: la 02:00 este schimbul început ieri la 22:00", () => {
  const o = myShiftOccurrence(at("2026-11-26T02:00:00"), shifts, "S3");
  assert.equal(o.workDay, "2026-11-25");
  assert.equal(o.shift.id, "S3");
});
test("documentul nou: fără date fictive și fără denumiri în cod; schimbul meu implicit = S1", () => {
  const d = emptyDoc();
  assert.equal(d.master.lines.length, 0);
  assert.equal(d.settings.myShiftId, "S1");
  assert.equal(d.plans && Object.keys(d.plans).length, 0);
  assert.equal(d.master.people.length, 0);
});
test("documentele cu date fictive (demo) sunt recunoscute; cele reale nu", () => {
  assert.equal(looksLikeDemo(demoDoc(at("2026-11-25T10:40:00"))), true);
  assert.equal(looksLikeDemo(emptyDoc()), false);
  const old = JSON.parse(JSON.stringify(emptyDoc())); delete old.settings.myShiftId;
  assert.equal(ensureShape(old).settings.myShiftId, "S1");
});
