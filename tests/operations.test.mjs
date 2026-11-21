import test from "node:test";
import assert from "node:assert/strict";
import { seed, organize } from "../js/seed.js";
import { handoverBlock, problemsBlock } from "../js/metrics.js";
import { closureError, handoverStatus, intervalTotals, problemMatches, validInterval } from "../js/operations.js";

function record(block, fields) {
  return { values: Object.fromEntries(Object.entries(fields).map(([key, value]) => [
    block.cols.find((column) => column.key === key || column.name === key).id, value,
  ])) };
}

test("confirmarea predării cere conținut, iar preluarea cere predarea verificată", () => {
  const { b } = handoverBlock(seed());
  assert.notEqual(handoverStatus(b, record(b, { handoverZone: "Z1" }), "prepared"), "");
  const row = record(b, { plan: 0, safetySummary: "Verificat" });
  assert.equal(handoverStatus(b, row, "prepared"), "");
  assert.notEqual(handoverStatus(b, row, "received"), "");
  row.values[b.cols.find((column) => column.key === "prepared").id] = true;
  assert.equal(handoverStatus(b, row, "received"), "");
});

test("închiderea cere dovadă și concluzie, filtrele separă urgențele și restanțele", () => {
  const { b } = problemsBlock(seed());
  const fields = { Acțiune: "Corecție", Stare: "În lucru", Termen: "2026-11-20", urgency: "Critică", problem: "Piesă suspectă" };
  const row = record(b, fields);
  assert.notEqual(closureError(b, row), "");
  assert.equal(closureError(b, record(b, { ...fields, effectiveness: "Trei verificări", closureNote: "Finalizat" })), "");
  assert.equal(problemMatches(b, row, "piesa", "Restante", "2026-11-21"), true);
  assert.equal(problemMatches(b, row, "piesa", "Restante", "2026-11-20"), false);
  assert.equal(problemMatches(b, row, "", "Urgente / critice", "2026-11-21"), true);
  assert.equal(problemMatches(b, row, "altceva", "Toate", "2026-11-21"), false);
});

const interval = {
  id: "test", date: "2026-11-21", zone: "Zonă A", shift: 3,
  start: "2026-11-21T23:30", end: "2026-11-22T00:30",
  plan: 11, produced: 10, good: 8, scrap: 2, rework: 3, firstPass: 6,
  plannedTime: 60, downtime: 5, cause: "", action: "", equipment: "", problemId: "",
};
test("intervalele peste miezul nopții validează duratele, suprapunerile și reconcilierea", () => {
  assert.equal(validInterval(interval), "");
  for (const update of [
    { scrap: 11 }, { firstPass: 9 }, { plannedTime: 61 }, { downtime: 61 },
    { plan: 2.5 }, { produced: "10" }, { end: "2026-11-24T00:30" }, { end: interval.start },
  ]) assert.notEqual(validInterval({ ...interval, ...update }), "");
  assert.notEqual(validInterval(interval, [{ ...interval, zone: "Zona A", id: "other" }]), "");
  assert.equal(validInterval(interval, [{ ...interval, zone: "Zona B", id: "other" }]), "");
});

test("totalurile rămân indisponibile dacă lipsește un termen", () => {
  const total = intervalTotals([interval, { ...interval, plan: null, firstPass: null }]);
  assert.equal(total.planPct, null);
  assert.equal(total.fpy, null);
  assert.equal(total.scrapPct, 20);
  assert.equal(intervalTotals([interval]).variance, -1);
});

test("migrarea operațională păstrează rândurile, coloanele și rutina veche", () => {
  const data = seed();
  delete data.settings.operationsVersion;
  const { b } = handoverBlock(data);
  b.cols = b.cols.filter((c) => c.key !== "prepared");
  const row = { id: "old", values: { [b.cols[0].id]: "2026-11-20" } };
  b.rows.push(row);
  const before = structuredClone(row);
  const routine = structuredClone(data.pages.find((p) => p.title === "Rutina schimbului"));
  data.templates = data.templates.filter((t) => t.title !== "Rutina cronologică de schimb");
  assert.equal(organize(data), true);
  assert.equal(organize(data), false);
  assert.deepEqual(b.rows[0], before);
  assert.deepEqual(data.pages.find((p) => p.title === "Rutina schimbului"), routine);
  assert.ok(b.cols.some((c) => c.key === "prepared"));
});

test("ghidurile de leadership au toate componentele, iar SBAR marchează câmpurile goale", async () => {
  const { TECHNIQUES, SBAR, sbarText } = await import("../js/leadership.js");
  assert.equal(TECHNIQUES.length, 14);
  assert.ok(TECHNIQUES.every((entry) => entry.length === 7 && entry.every((value) => value.trim())));
  assert.equal(SBAR.length, 10);
  assert.equal(sbarText("Predare", [" Oprire ", "", "Impact local", "Sprijin"]),
    "Predare\nSituație · Oprire\nContext · De completat\nEvaluare · Impact local\nSolicitare / acțiune · Sprijin");
  const plan = seed().pages.find((page) => page.professionalPlan);
  assert.equal(plan.blocks.length, 4);
  assert.ok(plan.blocks.every((block) => block.items.every((task) => !task.checked && task.due === "" && task.notes === "")));
});

test("exportul de instruire nu se poate restaura în caietul principal", async () => {
  globalThis.document ||= { addEventListener() {} };
  const { restore } = await import("../js/store.js");
  const data = seed();
  data.intervals = [interval];
  const file = (value) => new Blob([JSON.stringify(value)]);
  assert.deepEqual((await restore(file(data))).intervals, [interval]);
  await assert.rejects(restore(file({ ...data, training: true })), /modul/);
  assert.equal((await restore(file({ ...data, training: true }), true)).training, true);
  await assert.rejects(restore(file({ ...data, intervals: [interval, { ...interval, id: "dup" }] })), /suprapuse/);
  await assert.rejects(restore(file({ ...data, settings: { ...data.settings,
    skillConfig: { labels: ["a", "b"], requirements: [] } } })), /competențelor/);
});

test("service worker include toate modulele aplicației pentru utilizarea offline", async () => {
  const { readdir, readFile } = await import("node:fs/promises");
  const root = new URL("../", import.meta.url);
  const sw = await readFile(new URL("sw.js", root), "utf8");
  for (const file of await readdir(new URL("js/", root), { recursive: true })) {
    if (file.endsWith(".js")) assert.ok(sw.includes(`"./js/${file}"`), file);
  }
  const html = await readFile(new URL("index.html", root), "utf8");
  for (const asset of html.matchAll(/(?:src|href)="(\.\/[^"]+)"/g))
    assert.ok(sw.includes(`"${asset[1]}"`), asset[1]);
});
