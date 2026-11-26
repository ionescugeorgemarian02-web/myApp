// Test end-to-end în Chromium (opțional): fluxuri reale, persistență, migrare v4.4, backup, offline.
// Rulează cu serverul local pornit: python3 -m http.server 8124 --bind 127.0.0.1
// PLAYWRIGHT_MODULE=<cale către playwright sau playwright-core> node tests/browser.cjs
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright-core");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const BASE = process.env.MYAPP_TEST_URL || "http://127.0.0.1:8124/";
const T0 = new Date(2026, 10, 25, 8, 30, 0);

async function fresh(browser, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, acceptDownloads: true, ...opts });
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.clock.install({ time: T0 });
  return { ctx, page, errors };
}
const ready = (page) => page.waitForFunction(async () => !!(await import("./js/state.js")).S.doc);
const sheetBtn = (page, name) => page.locator("dialog[open]").getByRole("button", { name, exact: true });
async function pickIn(page, label, option) {
  await page.locator("dialog[open], main").last().locator(".field", { hasText: label }).locator("button.picker").first().click();
  await page.locator("dialog[open]").last().getByRole("button", { name: new RegExp("^" + option) }).first().click();
}

async function realFlow(browser) {
  const { ctx, page, errors } = await fresh(browser);
  await page.goto(BASE);
  await page.getByRole("heading", { name: "Bun venit" }).waitFor();
  assert.equal(await page.evaluate(async () => (await import("./js/state.js")).S.doc.master.lines.length), 0, "fără linii fictive");
  assert.equal(await page.evaluate(async () => (await import("./js/state.js")).S.doc.master.people.length), 0, "fără oameni fictivi");
  // Catalog: linii, PN cu ICT, oameni.
  await page.goto(BASE + "#/catalog");
  await page.getByRole("button", { name: "Adaugă mai multe (câte una pe rând)" }).click();
  await page.locator("dialog[open] textarea").fill("Linia Test 1\nLinia Test 2");
  await sheetBtn(page, "Adaugă").click();
  await page.getByText("Linia Test 2").waitFor();
  await page.getByText("Linia Test 1").click();
  await page.locator("dialog[open]").getByLabel("Operatori necesari").fill("2");
  await sheetBtn(page, "Adaugă operație").click();
  await sheetBtn(page, "Salvează").click();
  await page.getByRole("button", { name: /^PN-uri/ }).click();
  await page.getByRole("button", { name: "PN nou" }).click();
  await page.locator("dialog[open]").getByLabel("Cod").fill("PN-TEST-001");
  await page.locator("dialog[open]").getByLabel(/ICT ideal/).fill("30");
  await page.locator("dialog[open]").getByLabel(/Ciclu planificat/).fill("36");
  await sheetBtn(page, "Salvează").click();
  await page.getByRole("button", { name: /^Oameni/ }).click();
  await page.getByRole("button", { name: "Adaugă mai multe" }).click();
  await page.locator("dialog[open] textarea").fill("Operator 01\nOperator 02\nOperator 03");
  await sheetBtn(page, "Adaugă").click();
  await page.getByText("Operator 03").waitFor();

  // Plan: Linia Test 1, 06:00–14:00, target 760, baseline.
  await page.goto(BASE + "#/planning");
  await page.getByRole("button", { name: /^Linia Test 1/ }).click();
  await pickIn(page, "PN", "PN-TEST-001");
  await page.locator("dialog[open]").getByLabel("Target total").fill("760");
  await page.locator("dialog[open]").getByLabel("Target total").blur();
  await page.locator("dialog[open] tfoot").getByText("760").first().waitFor();
  await sheetBtn(page, "Confirmă baseline").click();
  await page.getByText("baseline", { exact: true }).waitFor();

  // Linie: pornire cu ora reală 06:10.
  await page.goto(BASE + "#/production");
  await page.getByRole("link", { name: /^Linia Test 1/ }).click();
  await page.getByRole("button", { name: /Pornește/ }).click();
  await sheetBtn(page, "Ora reală").click();
  await page.locator("dialog[open] input[type=time]").fill("06:10");
  await sheetBtn(page, "Înregistrează").click();
  await page.locator(".head .tag", { hasText: "În funcțiune" }).waitFor();

  // Raport orar 06:00–07:00: 0 rebut confirmat cu butonul „0”.
  await page.getByRole("button", { name: "Raportează producție" }).click();
  await page.getByRole("link", { name: /06:00/ }).click();
  await page.waitForFunction(() => location.hash.endsWith("/0"));
  await page.waitForTimeout(100);
  await page.getByLabel("Producție totală").fill("80");
  await page.getByLabel("Producție totală").blur();
  await page.getByRole("button", { name: "Zero confirmat" }).first().click();
  await page.getByRole("button", { name: "Zero confirmat" }).nth(1).click();
  await page.getByRole("button", { name: "Salvează raportul" }).click();
  await page.waitForTimeout(300);

  // Persistență după reîncărcare.
  await page.reload();
  await ready(page);
  const reported = await page.evaluate(async () => {
    const { S } = await import("./js/state.js");
    const sk = Object.keys(S.doc.reports)[0];
    const id = S.doc.master.lines.find((l) => l.name === "Linia Test 1").id;
    return S.doc.reports[sk][id][0].splits[0];
  });
  assert.equal(reported.total, 80);
  assert.equal(reported.scrap, 0);
  const ev = await page.evaluate(async () => (await import("./js/state.js")).S.doc.events[0]);
  assert.equal(new Date(ev.at).getHours(), 6);
  assert.equal(new Date(ev.at).getMinutes(), 10);

  // Rutina: OK pe o activitate, persistă.
  await page.goto(BASE + "#/routine");
  await page.locator(".routine").waitFor();
  await page.getByRole("button", { name: /Timeline/ }).click();
  await page.locator(".phase").first().waitFor();
  await page.locator(".ritem", { hasText: "Inventarul necesar planului confirmat" }).first().click();
  await page.locator("dialog[open]").waitFor();
  await sheetBtn(page, "DA / OK").click();
  await page.reload();
  await ready(page);
  const log = await page.evaluate(async () => Object.values((await import("./js/state.js")).S.doc.routine.log));
  assert.equal(log.length, 1);
  assert.equal(log[0].result, "ok");

  // Incident: linie → defect → responsabil; tranziție în intervenție.
  await page.goto(BASE + "#/incident/new");
  await pickIn(page, "Linia", "Linia Test 1");
  await page.getByLabel("Descriere").fill("Senzor prezență piesă");
  await page.getByRole("button", { name: "Salvează incidentul" }).click();
  await page.getByRole("heading", { name: /Incident #1/ }).waitFor();
  await page.getByRole("button", { name: "În intervenție" }).click();
  await sheetBtn(page, "Confirmă").click();
  await page.locator(".head .tag", { hasText: "În intervenție" }).waitFor();
  const lineStatus = await page.evaluate(async () => { const { S } = await import("./js/state.js"); return S.doc.events.filter((e) => !e.void).map((e) => e.type); });
  assert.deepEqual(lineStatus, ["run", "stop"]);

  // Sarcină: verificarea cere dovadă.
  await page.goto(BASE + "#/tasks");
  await page.getByRole("button", { name: "Sarcină nouă" }).click();
  await page.locator("dialog[open]").getByLabel("Ce trebuie făcut").fill("Curăță senzorul OP10");
  await sheetBtn(page, "Creează acțiunea").click();
  await page.getByRole("button", { name: /Curăță senzorul OP10/ }).click();
  await sheetBtn(page, "Finalizat").click();
  await page.getByRole("button", { name: /Curăță senzorul OP10/ }).click().catch(() => {});
  await page.goto(BASE + "#/tasks?f=verify");
  await page.getByRole("button", { name: /Curăță senzorul OP10/ }).click();
  await sheetBtn(page, "Verificat").click();
  await page.locator(".toast.err", { hasText: "dovadă" }).waitFor();

  // Matrice: nivelul 4 cere nivelul 3 înainte.
  await page.keyboard.press("Escape");
  await page.goto(BASE + "#/team/matrix");
  await pickIn(page, "Linie", "Linia Test 1");
  await page.getByRole("button", { name: /Operator 01, OP10: neevaluat/ }).click();
  await page.locator("dialog[open] .lp.l4").click();
  await sheetBtn(page, "Salvează nivelul").click();
  await page.locator(".toast.err", { hasText: "Nivelul 4 cere" }).waitFor();
  await page.locator("dialog[open] .lp.l3").click();
  await sheetBtn(page, "Salvează nivelul").click();
  await page.getByRole("button", { name: /Operator 01, OP10: nivel 3/ }).waitFor();

  // Backup: export descarcă JSON; o copie malițioasă este respinsă fără a atinge datele.
  await page.goto(BASE + "#/settings");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Descarcă copia (JSON)" }).click()]);
  const saved = JSON.parse(fs.readFileSync(await dl.path(), "utf8"));
  assert.equal(saved.schemaVersion, 2);
  assert.equal(saved.master.lines.length, 2);
  const evil = path.join(os.tmpdir(), "myapp-evil-" + Date.now() + ".json");
  fs.writeFileSync(evil, JSON.stringify({ schemaVersion: 2, tasks: "nu", __proto__: { polluted: 1 } }));
  await page.locator("input[type=file]").setInputFiles(evil);
  await page.locator(".toast.err", { hasText: "format nevalid" }).waitFor();
  assert.equal(await page.evaluate(async () => (await import("./js/state.js")).S.doc.master.lines.length), 2);
  assert.equal(await page.evaluate(() => ({}).polluted), undefined);
  fs.unlinkSync(evil);

  // Offline: după instalarea Service Worker-ului, aplicația pornește fără rețea.
  await page.goto(BASE);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await ctx.setOffline(true);
  await page.reload();
  await page.locator(".hero, .head").first().waitFor();
  await ctx.setOffline(false);
  assert.deepEqual(errors, []);
  await ctx.close();
}

// Schimbul meu: ieri (25) schimbul 1; la 03:43 pe 26 aplicația arată schimbul 1 din 26, care urmează.
async function myShiftFlow(browser) {
  const { ctx, page, errors } = await fresh(browser);
  await page.clock.setFixedTime(new Date(2026, 10, 26, 3, 43, 0));
  await page.goto(BASE + "manifest.json");
  await page.evaluate(async () => { const { emptyDoc } = await import("./js/core/doc.js"); const d = emptyDoc(false);
    d.master.lines.push({ id: "l1", name: "Linia A", machines: [], pnIds: [] });
    await new Promise((ok) => { const r = indexedDB.open("caiet-sef-schimb", 1); r.onupgradeneeded = () => r.result.createObjectStore("local");
      r.onsuccess = () => { const tx = r.result.transaction("local", "readwrite"); tx.objectStore("local").put(d, "v2"); tx.oncomplete = () => { r.result.close(); ok(); }; }; }); });
  await page.goto(BASE);
  await page.locator(".hero").waitFor();
  await page.locator(".hero-day", { hasText: "26 nov. · Schimbul 1 · urmează" }).waitFor();
  await page.locator(".shiftbtn", { hasText: "începe în 2 h 17 min" }).waitFor();
  await page.clock.setFixedTime(new Date(2026, 10, 26, 14, 30, 0));
  await page.reload();
  await page.locator(".shiftbtn", { hasText: "Schimbul 1 · 27 nov." }).waitFor();
  assert.deepEqual(errors, []);
  await ctx.close();
}
// Un caiet demo vechi (date fictive) găsit pe dispozitiv este înlocuit cu catalogul real.
async function demoCleanupFlow(browser) {
  const { ctx, page, errors } = await fresh(browser);
  await page.goto(BASE + "manifest.json");
  await page.evaluate(async () => {
    const { emptyDoc } = await import("./js/core/doc.js");
    const d = emptyDoc(false);
    d.master.lines = ["A", "B"].map((x, i) => ({ id: "l" + i, name: "Linia " + x, machines: [], pnIds: [] }));
    d.master.pns = [{ id: "p", code: "PN-TEST-001" }];
    d.master.people = [{ id: "o", name: "Operator 01" }];
    await new Promise((ok, no) => { const r = indexedDB.open("caiet-sef-schimb", 1); r.onupgradeneeded = () => r.result.createObjectStore("local");
      r.onsuccess = () => { const tx = r.result.transaction("local", "readwrite"); tx.objectStore("local").put(d, "v2"); tx.oncomplete = () => { r.result.close(); ok(); }; tx.onerror = () => no(tx.error); }; });
  });
  await page.goto(BASE);
  await page.locator(".toast", { hasText: "Datele fictive au fost șterse" }).waitFor();
  const d = await page.evaluate(async () => { const { S } = await import("./js/state.js"); return { lines: S.doc.master.lines.map((l) => l.name), people: S.doc.master.people.length }; });
  assert.equal(d.lines.length, 0);
  assert.equal(d.people, 0);
  assert.deepEqual(errors, []);
  await ctx.close();
}

async function legacyFlow(browser) {
  const { ctx, page, errors } = await fresh(browser);
  await page.goto(BASE + "manifest.json");
  await page.evaluate(() => new Promise((ok, no) => {
    const r = indexedDB.open("caiet-sef-schimb", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("local");
    r.onsuccess = () => {
      const tx = r.result.transaction("local", "readwrite");
      tx.objectStore("local").put({ schemaVersion: 1, templates: [], settings: { equipment: ["Linia V1", "Linia V2"], hours: ["06:00", "14:00", "22:00"], zone: "Z" },
        pages: [{ blocks: [{ type: "table", cols: [{ id: "c", key: "name", name: "Nume" }], rows: [{ id: "r1", values: { c: "Operator 09" } }] },
          { type: "skills", levels: { r1: { "Linia V1": 2 } } }] }] }, "caiet");
      tx.oncomplete = () => { r.result.close(); ok(); };
      tx.onerror = () => no(tx.error);
    };
  }));
  await page.goto(BASE);
  await page.locator(".toast", { hasText: "Importat din v4.4" }).waitFor();
  const d = await page.evaluate(async () => { const { S } = await import("./js/state.js"); return { lines: S.doc.master.lines.map((l) => l.name), quals: Object.values(S.doc.quals) }; });
  assert.deepEqual(d.lines, ["Linia V1", "Linia V2"]);
  assert.equal(d.quals[0].level, 3);
  assert.equal(d.quals[0].migrated, true);
  const legacy = await page.evaluate(async () => (await import("./js/core/store.js")).loadLegacy());
  assert.equal(legacy.settings.equipment.length, 2, "caietul v4.4 rămâne neatins");
  assert.deepEqual(errors, []);
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {});
  try {
    await realFlow(browser);
    console.log("ok - flux real: catalog, plan+baseline, pornire cu oră reală, raport, persistență, rutină, incident, sarcină, matrice, backup, offline");
    await myShiftFlow(browser);
    console.log("ok - schimbul meu: S1 din 26 la 03:43, apoi S1 din 27 după încheiere");
    await demoCleanupFlow(browser);
    console.log("ok - datele fictive vechi sunt eliminate");
    await legacyFlow(browser);
    console.log("ok - migrare v4.4 fără a modifica documentul vechi");
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
