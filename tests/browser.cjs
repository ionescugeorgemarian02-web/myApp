const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright-core");
const assert = require("node:assert/strict");
async function mobileShift(browser, base) {
  const context = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  try {
    const page = await context.newPage();
    page.setDefaultTimeout(8000);
    const runtimeErrors = [];
    page.on("pageerror", (error) => runtimeErrors.push(error.message));
    await page.clock.install({time:new Date(2026,10,23,12,59,40)});
    await page.clock.pauseAt(new Date(2026,10,23,12,59,45));
    await page.goto(base);
    await page.getByRole("button",{name:"Am înțeles"}).click();
    // Zona implicită este Sudură, cu toate liniile ei; testul o schimbă din Setări.
    await page.getByText(/^Sudură · 13 linii$/).waitFor();
    await page.evaluate(async () => (await import("./js/state.js")).app.navigate("Setări", "settings-line", "zone"));
    assert.equal(await page.getByLabel("Zona sau linia curentă").evaluate((node) => node === document.activeElement), true);
    await page.getByLabel("Zona sau linia curentă").fill("Linia A");
    await page.getByRole("button",{name:"Azi",exact:true}).click();
    await page.getByRole("button",{name:"Confirmă programul",exact:true}).click();
    assert.equal(await page.getByLabel("Schimb 1",{exact:true}).evaluate((node) => node === document.activeElement), true);
    await page.getByLabel("Schimb 2",{exact:true}).fill("14:10");
    await page.getByRole("button",{name:"Aplică programul"}).click();
    await page.getByText("Programul a fost aplicat").waitFor();
    await page.getByRole("button",{name:"Azi",exact:true}).click();
    await page.getByRole("button",{name:"Adaugă interval", exact:true}).waitFor();
    // Rutina EPT: activitățile fazei curente, fără instrucțiuni generice.
    const now = page.locator(".nowCard");
    await now.getByRole("heading",{name:"În timpul schimbului"}).waitFor();
    assert.equal(await now.locator(".eptHow").count(), 0);
    await page.clock.runFor(15 * 60 * 1000);
    const attention = page.locator(".attentionRegion");
    await attention.getByRole("heading",{name:"Predare neverificată · schimbul se termină la 14:10"}).waitFor();
    await now.getByRole("heading",{name:"La sfârșitul schimbului"}).waitFor();
    await page.getByLabel("Alege schimbul").selectOption("2");
    await attention.getByRole("button",{name:"Adaugă interval"}).waitFor();
    await page.getByLabel("Alege schimbul").selectOption("1");
    await attention.getByRole("button",{name:"Continuă predarea"}).click();
    const situation = page.getByLabel("Situația producției / probleme");
    assert.equal(await situation.evaluate((node) => node === document.activeElement), true);
    const counts = () => page.evaluate(async () => {
      const {app} = await import("./js/state.js");
      const {handoverBlock, problemsBlock} = await import("./js/metrics.js");
      return [handoverBlock(app.data).b.rows.length, problemsBlock(app.data).b.rows.length];
    });
    assert.deepEqual(await counts(), [0,0]);
    await situation.fill("Predare de zi verificată");
    await page.getByLabel("Predare verificată").check();
    assert.deepEqual(await counts(), [1,0]);
    await page.getByRole("button",{name:"Azi",exact:true}).click();
    await attention.getByRole("heading",{name:"Predarea este verificată"}).waitFor();
    await page.clock.setSystemTime(new Date(2026,10,23,14,15));
    await page.clock.runFor(5000);
    // Schimbul 1 rămâne deschis, marcat încheiat, până pornești schimbul următor.
    await page.getByText("Schimb încheiat la 14:10",{exact:true}).waitFor();
    await page.getByRole("button",{name:"Începe schimbul 2",exact:true}).click();
    await attention.getByRole("button",{name:"Preia schimbul",exact:true}).click();
    const previousRow = page.locator(".record[open]").filter({hasText:"Schimb 1"});
    const previousSituation = previousRow.getByLabel("Situația producției / probleme");
    assert.equal(await previousSituation.inputValue(), "Predare de zi verificată");
    assert.equal(await previousSituation.evaluate((field) =>
      Boolean(field.compareDocumentPosition(field.closest(".record").querySelector('[data-field="received"]')) & Node.DOCUMENT_POSITION_FOLLOWING)), true);
    await previousRow.getByLabel("Preluare verificată").check();
    await page.getByRole("button",{name:"Azi",exact:true}).click();
    await attention.getByRole("button",{name:"Adaugă interval",exact:true}).waitFor();
    await page.clock.setSystemTime(new Date(2026,10,24,5,35));
    await page.clock.runFor(5000);
    await page.getByRole("button",{name:"Începe schimbul 3",exact:true}).click();
    await attention.getByRole("heading",{name:"Predare neverificată · schimbul se termină la 06:00"}).waitFor();
    await page.getByText(/luni, 23 noiembrie 2026/i).waitFor();
    await page.getByText("Raportează",{exact:true}).click();
    await page.getByRole("button",{name:"Problemă",exact:true}).click();
    assert.deepEqual(await counts(), [1,0]);
    await page.getByLabel("Problemă",{exact:true}).fill("Abatere la testul de ambalare");
    await page.getByLabel("Prioritate",{exact:true}).selectOption("Critică");
    await page.getByLabel("Termen",{exact:true}).fill("2026-11-23");
    await page.getByRole("button",{name:"Azi",exact:true}).click();
    const primary = attention.locator(".attentionPanel[data-level=critical] .primary");
    await attention.getByRole("heading",{name:"Problemă critică deschisă"}).waitFor();
    assert.equal(await attention.getByText("Abatere la testul de ambalare", {exact:false}).count(), 1);
    for (const target of [attention.locator(".attentionPanel[data-level=critical]"), primary]) {
      const box = await target.boundingBox();
      assert.ok(box.y >= 56 && box.y + box.height <= 786, JSON.stringify(box));
      assert.ok(box.width >= 44 && box.height >= 44);
    }
    await attention.getByRole("button",{name:"Ciornă SBAR"}).click();
    await page.getByRole("dialog",{name:"Ciornă SBAR"}).getByLabel("Situație",{exact:true}).inputValue()
      .then((value) => assert.equal(value, "Abatere la testul de ambalare"));
    await page.getByRole("dialog").getByRole("button",{name:"Renunță"}).click();
    await primary.click();
    const containment = page.getByLabel("Măsură imediată / containment");
    assert.equal(await containment.evaluate((node) => node === document.activeElement), true);
    await page.evaluate(async () => {
      const {app} = await import("./js/state.js");
      const {problemsBlock} = await import("./js/metrics.js");
      const {p,b} = problemsBlock(app.data);
      app.openPage(p, "row-" + b.rows[0].id, "responsabil");
    });
    assert.equal(await page.getByLabel("Responsabil").evaluate((node) => node === document.activeElement), true);
    await page.getByLabel("Stare",{exact:true}).selectOption("Închis");
    for (const [label, value] of [
      ["Acțiune","Verificat ghidajul"], ["Dovada eficacității","Trei teste conforme"], ["Concluzie de închidere","Ambalare conformă"],
    ]) {
      const field = page.getByLabel(label,{exact:true});
      assert.equal(await field.getAttribute("aria-invalid"), "true");
      await field.fill(value);
    }
    await page.getByLabel("Stare",{exact:true}).selectOption("Închis");
    await page.getByRole("button",{name:"Azi",exact:true}).click();
    assert.equal(await attention.getByRole("heading",{name:"Problemă critică deschisă"}).count(), 0);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    await context.setOffline(true);
    const dialog = page.getByRole("dialog");
    await attention.getByRole("button",{name:"Adaugă interval"}).click();
    assert.equal(await dialog.getByLabel("Schimb",{exact:true}).inputValue(),"3");
    assert.equal(await dialog.getByLabel("Data de lucru").inputValue(),"2026-11-23");
    await dialog.getByLabel("Început").fill("2026-11-23T23:30");
    await dialog.getByLabel("Sfârșit").fill("2026-11-24T00:30");
    await dialog.getByText("23 nov. 2026 23:30 → 24 nov. 2026 00:30", {exact:true}).waitFor();
    await dialog.getByLabel("Plan (buc)",{exact:true}).fill("10");
    await dialog.getByLabel("Realizat total (buc)").fill("0");
    await dialog.getByRole("button",{name:"Salvează"}).click();
    await dialog.waitFor({state:"hidden"});
    await page.clock.runFor(100);
    await page.getByText("0 din 10 buc · 1 interval raportat", {exact:true}).waitFor();
    await attention.getByRole("button",{name:"Adaugă interval"}).click();
    assert.equal(await dialog.getByLabel("Început").inputValue(), "2026-11-24T00:30");
    await dialog.getByRole("button",{name:"Renunță"}).click();
    await page.getByRole("button",{name:"Producție",exact:true}).click();
    const realized = page.locator(".figure").filter({hasText:"Realizat"});
    await realized.getByText("0",{exact:true}).waitFor();
    await page.getByText("Salvat pe dispozitiv",{exact:true}).waitFor();
    await page.reload();
    await page.getByRole("heading",{name:"Producție"}).waitFor();
    await page.getByLabel("Data de lucru").fill("2026-11-23");
    await page.getByLabel("Schimb",{exact:true}).selectOption("3");
    await realized.getByText("0",{exact:true}).waitFor();
    await page.locator(".figure").filter({hasText:"Abatere"}).getByText("-10",{exact:true}).waitFor();
    await context.setOffline(false);
    if (process.env.MYAPP_LEGACY_BACKUP) {
      await page.getByRole("button",{name:"Setări"}).click();
      await page.getByText("Copie de siguranță",{exact:true}).click();
      await page.locator('input[type="file"]').setInputFiles(process.env.MYAPP_LEGACY_BACKUP);
      await dialog.getByRole("button",{name:"Înlocuiește"}).click();
      await page.getByText("Copie restaurată",{exact:true}).waitFor();
      const original = JSON.parse(require("node:fs").readFileSync(process.env.MYAPP_LEGACY_BACKUP, "utf8"));
      const restored = await page.evaluate(async () => {
        const {app} = await import("./js/state.js");
        return { zone: app.data.settings.zone, intervals: app.data.intervals };
      });
      assert.deepEqual(restored.intervals, original.intervals);
      assert.equal(restored.zone, original.settings.zone);
      console.log("Chromium: import verificat cu o copie exportată din versiunea 3.2.");
    }
    for (const width of [320, 390, 900, 1280]) {
      await page.setViewportSize({width,height:844});
      for (const route of ["Azi", "Producție", "Predare", "Probleme", "Caiet"]) {
        await page.getByRole("navigation").getByRole("button",{name:route,exact:true}).click();
        await page.waitForFunction((name) => document.querySelector("nav [aria-current=page]")?.textContent === name, route);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width, route);
        if (route === "Producție") {
          await page.getByRole("button",{name:"Interval nou"}).click();
          assert.ok(await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth));
          await dialog.getByRole("button",{name:"Renunță"}).click();
        } else if (route === "Probleme") {
          await page.getByRole("button",{name:"Problemă nouă"}).click();
          await page.getByLabel("Problemă",{exact:true}).waitFor();
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
        } else if (route === "Predare") {
          await page.getByLabel("Predare verificată").waitFor();
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
        }
      }
    }
    await page.getByRole("button",{name:"Setări"}).click();
    await page.getByText("Aspect",{exact:true}).click();
    await page.getByRole("button",{name:"Luminoasă",exact:true}).click();
    await page.getByRole("button",{name:"Azi",exact:true}).click();
    await page.keyboard.press("Tab");
    const mainAction = page.locator(".attentionRegion .nextAction");
    await mainAction.focus();
    assert.equal(await mainAction.evaluate((node) => getComputedStyle(node).outlineStyle), "solid");
    assert.deepEqual(runtimeErrors, []);
    console.log("Chromium 320/390/900/1280px: configurare, atenționări în timp real, schimb de noapte, fișe în ciornă, focus, SBAR, realizat zero și salvare offline.");
  } finally { await context.close(); }
}
(async () => {
  const browser = await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE || "/usr/bin/chromium", args:["--no-sandbox"]});
  try {
    const context = await browser.newContext({viewport:{width:360,height:780},deviceScaleFactor:2,isMobile:true,hasTouch:true});
    const page = await context.newPage();
    context.setDefaultTimeout(9000);
    const base = process.env.MYAPP_TEST_URL || "http://127.0.0.1:8124/";
    const errors = [];
    const requests = [];
    page.on("request", (request) => requests.push(request.url()));
    page.on("pageerror", (e)=>errors.push(e.message));
    await page.goto(base);
    await page.getByRole("button",{name:"Am înțeles"}).click();
    await page.getByRole("heading",{name:"Panou de schimb"}).waitFor();
    await page.getByText("Fără raportări",{exact:true}).first().waitFor();
    await page.evaluate(()=>navigator.serviceWorker.ready);
    await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),360);
    await page.evaluate(async () => (await import("./js/state.js")).app.navigate("Setări", "settings-line", "zone"));
    await page.getByLabel("Zona sau linia curentă").fill("DEMO A");
    await page.getByRole("button",{name:"Producție",exact:true}).click();
    await page.getByRole("button",{name:"Interval nou"}).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Zonă / linie").fill("DEMO A");
    const date = await dialog.getByLabel("Data de lucru").inputValue();
    await dialog.getByLabel("Început").fill(date+"T06:00");
    await dialog.getByLabel("Sfârșit").fill(date+"T07:00");
    await dialog.getByLabel("Plan (buc)",{exact:true}).fill("10");
    await dialog.getByLabel("Realizat total (buc)").fill("8");
    await dialog.getByText("Calitate, timp și cauze", {exact:true}).click();
    await dialog.getByLabel("Rebut (buc)").fill("9");
    await dialog.getByRole("button",{name:"Salvează"}).click();
    await dialog.getByText("Verifică reconcilierea", {exact:false}).waitFor();
    const scrapField = dialog.getByLabel("Rebut (buc)");
    assert.equal(await scrapField.evaluate((field) => field === document.activeElement), true);
    const descriptions = () => scrapField.evaluate((field) => (field.getAttribute("aria-describedby") || "").split(" ")
      .filter(Boolean).map((id) => document.getElementById(id).textContent));
    assert.match((await descriptions()).join(" "), /Verifică reconcilierea/);
    await scrapField.fill("1");
    assert.deepEqual(await descriptions(), [], "fără instrucțiuni generice; eroarea dispare după corecție");
    await dialog.getByRole("button",{name:"Salvează"}).click();
    await page.locator(".figure").filter({hasText:"Realizat"}).getByText("8",{exact:true}).waitFor();
    await page.getByText("Salvat pe dispozitiv",{exact:true}).waitFor();
    await context.setOffline(true);
    await page.reload();
    await page.getByRole("heading",{name:"Producție"}).waitFor();
    await page.getByLabel("Zonă / linie").fill("DEMO A");
    await page.locator(".figure").filter({hasText:"Realizat"}).getByText("8",{exact:true}).waitFor();
    await page.goto(new URL("?mod=instruire", base).href);
    await page.getByText("INSTRUIRE · Folosește numai date fictive.").waitFor();
    await page.getByRole("button",{name:"Am înțeles"}).click();
    await page.getByRole("heading",{name:"Panou de schimb"}).waitFor();
    await page.getByRole("button",{name:"Producție",exact:true}).click();
    await page.getByLabel("Zonă / linie").fill("DEMO A");
    await page.getByText("Date indisponibile pentru această selecție.").waitFor();
    await page.goto(new URL("?mod=instruire#Leadership", base).href);
    await page.getByRole("heading", { name: "Asistent de leadership" }).waitFor();
    await page.getByLabel("Situația din schimb").selectOption("Abatere discutată individual");
    await page.getByText("Feedback SBI", { exact: true }).click();
    await page.getByText("Feedback precis, cu impact și pas următor.").waitFor();
    await page.getByLabel("Situație de comunicare").selectOption("Escaladarea unei opriri");
    await page.getByLabel("Situație", { exact: true }).fill("Oprire fictivă");
    await page.getByRole("button", { name: "Previzualizează rezumatul" }).click();
    await dialog.getByText(/INSTRUIRE · DATE FICTIVE.*Oprire fictivă/s).waitFor();
    await dialog.getByRole("button", { name: "Renunță" }).click();
    await page.goto(new URL("?mod=instruire#Indicatori", base).href);
    await page.getByRole("heading", { name: "Indicatori operaționali" }).waitFor();
    await page.getByText("Livrare", { exact: true }).click();
    const planKpi = page.locator(".kpiDefinition").filter({ has: page.getByRole("heading", { name: /^Atingerea planului/ }) });
    await planKpi.getByText("Prag și referință", { exact: true }).click();
    await planKpi.getByLabel("Prag (%)", { exact: true }).fill("95");
    await planKpi.getByLabel("Prag validat intern").check();
    await page.getByText("Prag marcat ca validat").waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 360);
    await page.goto(base);
    await page.getByRole("heading", { name: "Panou de schimb" }).waitFor();
    await page.getByRole("navigation").getByRole("button", { name: "Predare", exact: true }).click();
    await page.getByText(/Fișă personală de sprijin/).waitFor();
    await page.getByLabel("Predare verificată").click();
    assert.equal(await page.getByLabel("Predare verificată").isChecked(), false);
    assert.equal(await page.getByLabel("Situația producției / probleme").evaluate((field) => field === document.activeElement), true);
    await page.getByLabel("Situația producției / probleme").fill("Date de test <b>literal</b>");
    await page.getByLabel("Predare verificată").check();
    await page.getByLabel("Preluare verificată").check();
    await page.getByRole("button", { name: "Rezumatul acestei fișe" }).click();
    await dialog.getByText(/Date de test <b>literal<\/b>/).waitFor();
    assert.equal(await dialog.locator("b").count(), 0);
    await dialog.getByRole("button", { name: "Renunță" }).click();
    await page.getByLabel("Materiale lipsă").fill("Verificare nouă");
    assert.equal(await page.getByLabel("Predare verificată").isChecked(), false);
    assert.equal(await page.getByLabel("Preluare verificată").isChecked(), false);

    await page.goto(base);
    await page.getByText("Raportează", { exact: true }).click();
    await page.getByRole("button", { name: "Problemă", exact: true }).click();
    await page.getByLabel("Problemă", { exact: true }).fill("DEMO problemă");
    await page.locator("summary").filter({hasText:"Cauză și corecție"}).click();
    await page.getByLabel("Acțiune", { exact: true }).fill("Corecție");
    await page.getByRole("combobox", { name: /^Stare/ }).selectOption("Închis");
    assert.notEqual(await page.getByRole("combobox", { name: /^Stare/ }).inputValue(), "Închis");
    assert.equal(await page.getByLabel("Dovada eficacității").evaluate((field) => field === document.activeElement), true);
    await page.getByLabel("Dovada eficacității").fill("Trei măsurători");
    await page.getByLabel("Concluzie de închidere").fill("Rezultat consemnat");
    await page.getByRole("combobox", { name: /^Stare/ }).selectOption("Închis");
    assert.equal(await page.getByRole("combobox", { name: /^Stare/ }).inputValue(), "Închis");
    await page.getByLabel("Filtrează").selectOption("Deschise");
    await page.getByText("Nicio problemă pentru acest filtru.").waitFor();
    await page.getByLabel("Filtrează").selectOption("Închise");
    await page.getByText("DEMO problemă · Corecție", { exact: true }).waitFor();

    await page.goto(new URL("#Leadership", base).href);
    await page.getByRole("button", { name: "Planul meu de dezvoltare" }).click();
    await page.getByRole("checkbox", { name: /Cunoaște echipa, rolurile și responsabilitățile/ }).waitFor();
    assert.equal(await page.getByText(/Mergi la fiecare post și întreabă/).count(), 0, "fără instrucțiuni generice");
    await page.getByRole("checkbox", { name: /Cunoaște echipa, rolurile și responsabilitățile/ }).check();
    await page.getByLabel(/Detalii pentru Cunoaște echipa/).click();
    await page.getByText("Opțiunile punctului", { exact: true }).filter({ visible: true }).click();
    await page.getByLabel("Termenul punctului").fill("2026-11-29");
    await page.getByRole("button", { name: "Adaugă notiță" }).click();
    await dialog.getByLabel("Notiță").fill("DEMO · întrebări pentru manager");
    await dialog.getByRole("button", { name: "Salvează" }).click();
    await page.getByText("DEMO · întrebări pentru manager", { exact: true }).waitFor();

    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 360);
    async function openPage(title) {
      await page.getByRole("button", { name: "Caiet", exact: true }).click();
      const search = page.getByRole("searchbox", { name: "Caută în tot caietul" });
      await search.fill(title);
      await page.locator(".searchResults button").first().click();
    }
    await openPage("Audituri și verificări personale");
    await page.getByRole("heading", { name: /Audituri și verificări personale/ }).waitFor();
    const safetyWalk = page.getByRole("group", { name: /Zona și căile de acces/ });
    if (!await safetyWalk.isVisible()) await page.getByText("Safety walk", { exact: true }).first().click();
    assert.equal(await page.getByText(/Parcurge căile permise și observă accesul/).count(), 0, "fără instrucțiuni generice");
    await safetyWalk.getByRole("button", { name: "NOK", exact: true }).click();
    assert.equal(await safetyWalk.getByRole("button", { name: "NOK", exact: true }).getAttribute("aria-pressed"), "true");

    await page.getByRole("button", { name: "Setări" }).click();
    await page.getByText("Copie de siguranță", { exact: true }).click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Salvează copia" }).click();
    const download = await downloadPromise;
    const file = await download.path();
    const backup = JSON.parse(require("node:fs").readFileSync(file, "utf8"));
    assert.equal(backup.intervals[0].zone, "DEMO A");
    assert.equal(backup.training, undefined);
    await page.locator('input[type="file"]').setInputFiles(file);
    await dialog.getByRole("button", { name: "Înlocuiește" }).click();
    await page.getByText("Copie restaurată", { exact: true }).waitFor();

    await page.goto(base);
    await page.reload();
    await page.getByRole("heading", { name: "Panou de schimb" }).waitFor();
    const second = await context.newPage();
    await second.goto(base);
    await second.getByRole("heading", { name: "Panou de schimb" }).waitFor();
    await page.getByRole("button", { name: "Adaugă notiță" }).click();
    await dialog.getByLabel("Notiță").fill("Prima filă");
    await dialog.getByRole("button", { name: "Salvează" }).click();
    await dialog.waitFor({ state: "hidden" });
    await page.evaluate(async () => (await import("./js/store.js")).flush());
    await page.getByText("Salvat pe dispozitiv", { exact: true }).waitFor();
    await second.getByRole("button", { name: "Adaugă notiță" }).click();
    await second.getByRole("dialog").getByLabel("Notiță").fill("A doua filă");
    await second.getByRole("dialog").getByRole("button", { name: "Salvează" }).click();
    await second.getByRole("dialog").waitFor({ state: "hidden" });
    await second.getByText("Modificări nesalvate", { exact: true }).waitFor();
    await second.reload();
    await second.getByRole("button", { name: "Caiet", exact: true }).click();
    await second.getByRole("button", { name: "Notițe", exact: true }).click();
    await second.getByText("Prima filă", { exact: true }).waitFor();
    assert.equal(await second.getByText("A doua filă", { exact: true }).count(), 0);
    assert.ok(requests.every((request) => new URL(request).origin === new URL(base).origin));
    assert.deepEqual(errors,[]);
    await mobileShift(browser, base);
    console.log("Chromium 360px: validare și stocare offline, moduri separate, leadership/SBAR, KPI, predare, afișare text literal, probleme, plan 90 de zile, audit, backup/restaurare, conflict între file, cereri de rețea locale.");
  } finally { await browser.close(); }
})().catch((error)=>{console.error(error);process.exitCode=1;});
