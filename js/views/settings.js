// MAI MULT — meniu, setări (program, praguri, temă, pontaj), cataloage (master data), backup și limitele stocării locale.
import { h, put, btn, icon, tag, sect, seg, chips, empty, note, sheet, field, input, numInput, area, select, toast, item, confirmSheet, promptSheet } from "../ui/kit.js";
import { S, ctx, commit, now, byId, applyTheme, VERSION } from "../state.js";
import { uid, emptyDoc } from "../core/doc.js";
import { nn } from "../core/num.js";
import { validHM } from "../core/time.js";
import { exportDoc, readBackup, replaceDoc, loadLegacy, download } from "../core/store.js";
import { migrateV4 } from "../core/migrate.js";
import { pageHead, backLink } from "./common.js";

export function moreView() {
  const link = (href, ic, t, s) => item({ href, title: t, sub: s, lead: h("span.lead-ic", null, icon(ic)) });
  return h("div", null, pageHead("Mai mult"),
    h("div.list", null,
      link("#/tasks", "list", "Sarcini", "Action Center: listă și Kanban"),
      link("#/handover", "handover", "Predarea schimbului", "Generată automat din date"),
      link("#/routine", "check", "Rutina mea EPT", "Supervisor standard work"),
      link("#/oee", "chart", "Rapoarte și analiză", "OEE, Pareto, trenduri"),
      link("#/incidents", "wrench", "Istoric incidente", "MTTR, MTBF, recurențe"),
      link("#/catalog", "box", "Cataloage", "Linii, mașini, PN-uri, oameni, coduri de defect"),
      link("#/settings", "settings", "Setări și backup", "Program, praguri, temă, copii de siguranță")),
    h("p.tiny.faint", { style: { marginTop: "16px" } }, "myApp " + VERSION + " · date locale, fără sincronizare · " + (S.training ? "caiet de exersare" : "caiet real")));
}

export function settingsView() {
  const doc = S.doc, st = doc.settings;
  const save = (msg) => commit(() => 0, msg, { undo: false });
  return h("div", null, backLink("#/more", "Mai mult"), pageHead("Setări"),
    sect("Aspect"),
    h("div.panel.pad", null, field("Temă", seg([["auto", "Automată"], ["light", "Luminoasă"], ["dark", "Întunecată"]], st.theme, (v) => { commit(() => (st.theme = v), null, { undo: false }); applyTheme(); }))),
    sect("Schimbul meu"),
    h("div.panel.pad.stack", null,
      field("În ce schimb lucrez", seg([...st.shifts.map((x) => [x.id, x.name]), ["", "După ceas"]], st.myShiftId || "", (v) => commit(() => (st.myShiftId = v || null), "Schimbul meu: " + (st.shifts.find((x) => x.id === v)?.name || "după ceas")))),
      note("Aplicația afișează schimbul tău: în timpul lui, ziua curentă; după ce se termină, trece la același schimb din ziua următoare. La rotație, schimbă aici.")),
    sect("Programul schimburilor"),
    h("div.panel.pad.stack", null, st.shifts.map((sh) => h("div.shiftcfg", null,
      h("b", null, sh.name),
      h("div.fields.c2", null, ...["start", "end"].map((k) => field(k === "start" ? "Început" : "Final", input(sh[k], null, { type: "time",
        onchange: (e) => { const v = e.target.value; if (!validHM(v)) { toast("Ora nu este validă.", { err: true }); e.target.value = sh[k]; return; } commit(() => (sh[k] = v), "Program salvat"); } })))),
      h("div.small.muted", null, "Pauze: " + (sh.breaks.length ? sh.breaks.map((b) => b.start + "–" + b.end).join(", ") : "niciuna configurată")),
      h("div.row.wrap", null, btn("Adaugă pauză", async () => {
        const v = await promptSheet("Pauză · " + sh.name, "Interval (ex. 10:00-10:20)");
        const m = /^(\d{2}:\d{2})\s*[-–]\s*(\d{2}:\d{2})$/.exec(v || "");
        if (!m || !validHM(m[1]) || !validHM(m[2])) { if (v) toast("Format: 10:00-10:20", { err: true }); return; }
        commit(() => sh.breaks.push({ start: m[1], end: m[2] }), "Pauză adăugată");
      }, "ghost", "plus"), sh.breaks.length ? btn("Șterge pauzele", () => commit(() => (sh.breaks = []), "Pauze șterse"), "ghost") : null))),
      note("Pauzele scad minutele productive din plan și din OEE. Nu sunt presupuse: configurează-le după programul real."),
      note("Atenție: schimbarea orelor reinterpretează intervalele orare ale schimburilor deja raportate. Modifică programul între schimburi.", "warn")),
    sect("Praguri pentru asistent"),
    h("div.panel.pad.fields.c2", null, ...[["oeeTarget", "Țintă OEE (%) · world class 85"], ["underTarget", "Sub target (%)"], ["stopAlertMin", "Alertă oprire (min)"], ["escalateStopMin", "Escaladare oprire (min)"], ["reportGraceMin", "Toleranță raport orar (min)"], ["tlLineMaxMin", "TL pe linie, maxim (min, regulă locală)"]].map(([k, l]) =>
      field(l, numInput(st.thresholds[k], (v) => { const n = nn(v, true); if (n !== null) st.thresholds[k] = n; }, { onchange: () => save("Prag salvat") })))),
    sect("Liste configurabile"),
    h("div.panel.pad.stack", null, listEditor("Departamente", st.departments), listEditor("Categorii de personal", st.personCategories), listEditor("Categorii de incident", st.incidentCategories),
      h("div", null, h("b", null, "Coduri de pontaj"), h("p.small.muted", null, st.attendance.map((a) => a.label + (a.present ? " (prezent)" : "")).join(", ")), btn("Adaugă cod", async () => {
        const v = await promptSheet("Cod de pontaj", "Denumire"); if (!v) return;
        const present = await confirmSheet("Contează ca prezent?", "„" + v + "” înseamnă că persoana este disponibilă pentru alocare?", "Da, prezent");
        commit(() => st.attendance.push({ id: "c" + uid().slice(0, 6), label: v, present }), "Cod adăugat");
      }, "ghost", "plus"))),
    sect("Copie de siguranță"),
    h("div.panel.pad.stack", null,
      note("Datele sunt salvate doar în acest browser (IndexedDB) și nu sunt criptate de aplicație. Ștergerea datelor browserului, pierderea telefonului sau schimbarea adresei aplicației le fac inaccesibile. Exportă regulat și păstrează copia într-un loc aprobat.", "warn"),
      h("div.row.wrap", null, btn("Descarcă copia (JSON)", () => exportDoc(doc), "primary", "download"),
        h("label.btn", null, icon("upload"), "Restaurează din copie", h("input.sr", { type: "file", accept: "application/json,.json", onchange: (e) => restore(e.target.files[0]) }))),
      !S.training ? btn("Descarcă datele caietului v4.4 (neatinse)", async () => { const old = await loadLegacy(); if (!old) return toast("Nu există caiet v4.4 pe acest dispozitiv."); download("caiet-v44-" + ctx().workDay + ".json", JSON.stringify(old), "application/json"); }, "ghost", "history") : null,
      !S.training ? btn("Reimportă din v4.4", async () => {
        const old = await loadLegacy(); if (!old) return toast("Nu există caiet v4.4.");
        if (!(await confirmSheet("Înlocuiești datele v2?", "Datele myApp 2 de pe dispozitiv se înlocuiesc cu importul din v4.4. Exportă întâi o copie.", "Înlocuiește", true))) return;
        const d = migrateV4(old, now()); await replaceDoc(d); location.reload();
      }, "ghost") : null),
    sect("Mod de lucru"),
    h("div.panel.pad.stack", null,
      S.training ? note("Caiet de exersare, separat de datele reale. Nu conține date fictive.", "warn") : note("Introdu date interne doar dacă politica angajatorului permite utilizarea dispozitivului."),
      S.training ? btn("Înapoi la caietul real", () => (location.href = location.pathname)) : null));
}
function listEditor(title, arr) {
  return h("div", null, h("b", null, title), h("div.chipline", null, arr.map((x, i) => h("span.pchip", null, x, h("button.x", { type: "button", "aria-label": "Șterge " + x, onclick: () => commit(() => arr.splice(i, 1), "Șters") }, "×"))),
    h("button.pchip.add", { type: "button", onclick: async () => { const v = await promptSheet(title, "Denumire"); if (v) commit(() => arr.push(v), "Adăugat"); } }, "+ adaugă")));
}
async function restore(file) {
  if (!file) return;
  try {
    const d = await readBackup(file, S.training);
    if (!(await confirmSheet("Restaurezi copia?", "Datele curente se înlocuiesc cu copia din " + (d.createdAt || "").slice(0, 10) + ". Exportă întâi datele curente dacă ai nevoie de ele.", "Restaurează", true))) return;
    await replaceDoc(d);
    location.reload();
  } catch (e) { toast(e.message, { err: true, ms: 8000 }); }
}

// ——— Cataloage (master data) ———
let ctab = "lines";
export function catalogView(_p, q) {
  if (q.get("tab")) { ctab = q.get("tab"); history.replaceState(null, "", "#/catalog"); }
  const doc = S.doc;
  const tabs = seg([["lines", "Linii " + doc.master.lines.length], ["pns", "PN-uri " + doc.master.pns.length], ["people", "Oameni " + doc.master.people.length], ["faults", "Defecte " + doc.master.faults.length]], ctab, (v) => { ctab = v; S.render(); });
  const T = { lines: linesTab, pns: pnsTab, people: peopleTab, faults: faultsTab };
  return h("div", null, backLink("#/more", "Mai mult"), pageHead("Cataloage", "Master data · configurate local; nu se publică nicăieri"),
    note("Cataloagele tale rămân doar pe acest dispozitiv."),
    h("div", { style: { margin: "12px 0" } }, tabs), T[ctab]());
}
const bulk = (title, label, fn) => async () => { const v = await promptSheet(title, label, { multiline: true, okLabel: "Adaugă" }); if (v) commit((d) => fn(d, v.split(/\r?\n/).map((x) => x.trim()).filter(Boolean)), "Adăugat"); };
function linesTab() {
  const doc = S.doc;
  return h("div", null, h("div.row.wrap", null, btn("Linie nouă", () => lineSheet(), "primary", "plus"), btn("Adaugă mai multe (câte una pe rând)", bulk("Linii noi", "Denumiri, câte una pe rând", (d, names) => names.forEach((n) => d.master.lines.push({ id: uid(), code: n, name: n, zone: d.settings.zone || "", machines: [], pnIds: [], tlId: null, requiredOps: null, active: true }))), "ghost")),
    doc.master.lines.length ? h("div.list", { style: { marginTop: "12px" } }, doc.master.lines.map((l) => item({ title: l.name + (l.active === false ? " (inactivă)" : ""), sub: [l.zone, l.machines.length + " operații", "necesar " + (l.requiredOps ?? "—") + " operatori", (l.pnIds || []).length + " PN-uri", l.demandPerShift ? "cerere " + l.demandPerShift + "/schimb" : ""].filter(Boolean).join(" · "), onClick: () => lineSheet(l) })))
      : empty("Nicio linie", "Adaugă cele 13 linii/programe ale tale. Le poți adăuga pe toate odată.", null));
}
function lineSheet(existing) {
  const l = existing ? structuredClone(existing) : { id: uid(), code: "", name: "", zone: S.doc.settings.zone || "", machines: [], pnIds: [], tlId: null, requiredOps: null, demandPerShift: null, active: true };
  const body = h("div.fields");
  const draw = () => put(body, 
    h("div.fields.c2", null, field("Denumire", input(l.name, (v) => (l.name = v))), field("Identificator", input(l.code, (v) => (l.code = v)))),
    h("div.fields.c3", null, field("Zonă", input(l.zone, (v) => (l.zone = v))), field("Operatori necesari", numInput(l.requiredOps ?? "", (v) => (l.requiredOps = nn(v, true)))), field("Cerere / schimb", numInput(l.demandPerShift ?? "", (v) => (l.demandPerShift = nn(v, true))), "pentru takt")),
    field("Team Leader responsabil", select([["", "—"], ...S.doc.master.people.filter((p) => p.role === "tl").map((p) => [p.id, p.name])], l.tlId || "", (v) => (l.tlId = v || null))),
    h("b", null, "Mașini / operații"),
    ...l.machines.map((m, i) => h("div.row", null, input(m.name, (v) => (m.name = v), { "aria-label": "Mașina " + (i + 1) }),
      select([[1, "nec. 1"], [2, "nec. 2"], [3, "nec. 3"], [4, "nec. 4"]], m.requiredLevel || 3, (v) => (m.requiredLevel = Number(v)), { "aria-label": "Nivel necesar", style: { maxWidth: "110px" } }),
      h("button.ibtn", { type: "button", "aria-label": "Elimină", onclick: () => { l.machines.splice(i, 1); draw(); } }, icon("trash")))),
    btn("Adaugă operație", () => { l.machines.push({ id: uid(), name: "OP" + (l.machines.length + 1) * 10, op: "", requiredLevel: 3 }); draw(); }, "ghost", "plus"),
    h("b", null, "PN-uri compatibile"),
    h("div.chipline", null, S.doc.master.pns.map((p) => h("button.pchip", { type: "button", "aria-pressed": String(l.pnIds.includes(p.id)), onclick: () => { l.pnIds = l.pnIds.includes(p.id) ? l.pnIds.filter((x) => x !== p.id) : [...l.pnIds, p.id]; draw(); } }, p.code))),
    h("label.check", null, h("input", { type: "checkbox", checked: l.active !== false, onchange: (e) => (l.active = e.target.checked) }), "Activă"));
  draw();
  const sh = sheet({ title: existing ? l.name : "Linie nouă", body, wide: true, footer: [btn("Salvează", () => {
    if (!l.name.trim()) return toast("Scrie denumirea.", { err: true });
    commit((d) => { const i = d.master.lines.findIndex((x) => x.id === l.id); if (i >= 0) d.master.lines[i] = l; else d.master.lines.push(l); }, "Linie salvată");
    sh.close();
  }, "primary")] });
}
function pnsTab() {
  const doc = S.doc;
  return h("div", null, h("div.row.wrap", null, btn("PN nou", () => pnSheet(), "primary", "plus"), btn("Adaugă mai multe", bulk("PN-uri noi", "Coduri, câte unul pe rând", (d, codes) => codes.forEach((c) => d.master.pns.push({ id: uid(), code: c, name: "", ict: null, cycleSec: null }))), "ghost")),
    note("ICT (timpul ideal de ciclu) este necesar pentru OEE. Nu se inventează: fără ICT, Performance apare „Date insuficiente”."),
    doc.master.pns.length ? h("div.list", { style: { marginTop: "12px" } }, doc.master.pns.map((p) => item({ title: p.code, sub: [p.name, "ICT " + (p.ict ?? "—") + " s", "ciclu " + (p.cycleSec ?? "—") + " s"].filter(Boolean).join(" · "), end: !p.ict ? tag("warn", "ICT lipsă") : null, onClick: () => pnSheet(p) }))) : empty("Niciun PN", "Adaugă PN-urile cu timpii confirmați.", null));
}
function pnSheet(existing) {
  const p = existing ? { ...existing } : { id: uid(), code: "", name: "", ict: null, cycleSec: null };
  const sh = sheet({ title: existing ? p.code : "PN nou", body: h("div.fields", null, field("Cod", input(p.code, (v) => (p.code = v))), field("Denumire", input(p.name, (v) => (p.name = v))),
    h("div.fields.c2", null, field("ICT ideal (s/buc)", numInput(p.ict ?? "", (v) => (p.ict = nn(v)), { inputmode: "decimal" }), "cel mai rapid ciclu posibil"), field("Ciclu planificat (s/buc)", numInput(p.cycleSec ?? "", (v) => (p.cycleSec = nn(v)), { inputmode: "decimal" }), "confirmat pentru plan"))),
  footer: [btn("Salvează", () => {
    if (!p.code.trim()) return toast("Scrie codul.", { err: true });
    if (p.ict && p.cycleSec && p.cycleSec < p.ict) return toast("Ciclul planificat nu poate fi mai rapid decât ICT-ul ideal.", { err: true });
    commit((d) => { const i = d.master.pns.findIndex((x) => x.id === p.id); if (i >= 0) d.master.pns[i] = p; else d.master.pns.push(p); }, "PN salvat"); sh.close();
  }, "primary")] });
}
function peopleTab() {
  const doc = S.doc;
  return h("div", null, h("div.row.wrap", null, btn("Persoană nouă", () => personSheet(), "primary", "plus"), btn("Adaugă mai multe", bulk("Oameni noi", "Nume sau identificatori neutri, câte unul pe rând", (d, names) => names.forEach((n) => d.master.people.push({ id: uid(), name: n, role: "operator", category: "Operator", shiftId: null, active: true }))), "ghost")),
    doc.master.people.length ? h("div.list", { style: { marginTop: "12px" } }, doc.master.people.map((p) => item({ title: p.name + (p.active === false ? " (inactiv)" : ""), sub: [p.team, p.category, p.role === "tl" ? "Team Leader" : ""].filter(Boolean).join(" · "), onClick: () => personSheet(p) }))) : empty("Nicio persoană", "Adaugă echipa.", null));
}
function personSheet(existing) {
  const p = existing ? { ...existing } : { id: uid(), name: "", role: "operator", category: "Operator", shiftId: null, active: true };
  const body = h("div.fields");
  const draw = () => put(body, field("Nume / identificator", input(p.name, (v) => (p.name = v))),
    field("Rol", seg([["operator", "Operator"], ["tl", "Team Leader"], ["aux", "Auxiliar"]], p.role, (v) => { p.role = v; draw(); })),
    field("Categorie", select(S.doc.settings.personCategories.map((x) => [x, x]), p.category, (v) => (p.category = v))),
    field("Echipă", input(p.team || "", (v) => (p.team = v.trim()), { list: "teams", placeholder: "Ex. Echipa 1" }), "Alege o echipă existentă sau scrie una nouă"),
    h("datalist", { id: "teams" }, [...new Set(S.doc.master.people.map((x) => x.team).filter(Boolean))].map((t) => h("option", { value: t }))),
    h("label.check", null, h("input", { type: "checkbox", checked: p.active !== false, onchange: (e) => (p.active = e.target.checked) }), "Activ"));
  draw();
  const sh = sheet({ title: existing ? p.name : "Persoană nouă", body, footer: [btn("Salvează", () => {
    if (!p.name.trim()) return toast("Scrie numele.", { err: true });
    commit((d) => { const i = d.master.people.findIndex((x) => x.id === p.id); if (i >= 0) d.master.people[i] = p; else d.master.people.push(p); }, "Salvat"); sh.close();
  }, "primary")] });
}
function faultsTab() {
  const doc = S.doc;
  return h("div", null, btn("Cod nou", async () => {
    const v = await promptSheet("Cod de defect", "Cod și denumire (ex. AV-01 Defect mecanic)");
    const m = /^(\S+)\s+(.+)$/.exec(v || "");
    if (m) commit((d) => d.master.faults.push({ id: uid(), code: m[1], name: m[2], loss: "availability" }), "Cod adăugat");
  }, "primary", "plus"),
  doc.master.faults.length ? h("div.list", { style: { marginTop: "12px" } }, doc.master.faults.map((f, i) => h("div.item", null, h("div.main", null, h("div.t", null, f.code + " · " + f.name), h("div.s", null, ({ availability: "Availability", performance: "Performance", quality: "Quality" })[f.loss])),
    h("button.ibtn", { type: "button", "aria-label": "Șterge", onclick: () => commit((d) => d.master.faults.splice(i, 1), "Cod șters") }, icon("trash"))))) : empty("Niciun cod", "Codurile de defect fac Pareto-ul utilizabil. Lista se configurează local.", null));
}
