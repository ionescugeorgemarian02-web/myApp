// CALITATE ȘI LEAN — First Off, LPA, Gemba (TIMWOOD), 6S, Poka-Yoke, 8D/CAPA, Kaizen, Lean 4. Totul legat de sarcini.
import { h, put, btn, icon, tag, kpi, sect, seg, chips, empty, note, sheet, field, input, area, select, picker, toast, item, confirmSheet } from "../ui/kit.js";
import { S, ctx, commit, now, byId, lineName, personName, pnCode } from "../state.js";
import { uid } from "../core/doc.js";
import { fmtN, fmtPct, nn } from "../core/num.js";
import { fmtDay, fmtHM, isoWeek, addDays, productiveMin, breaksOf } from "../core/time.js";
import { templatesOf, updateTemplate, startAudit, answer, score, finishAudit, recurringNok, TIMWOOD, POKA_METHOD, POKA_FUNCTION, SIX_M, D_STEPS, create8D, canComplete, completeStep, verifyCause, d8Progress, PDCA, kaizenScore } from "../domain/quality.js";
import { runWindow } from "../domain/plan.js";
import { trend } from "../ui/charts.js";
import { taskFromSheet, linesItems, machineItems, peopleItems, pnItems, pageHead, backLink } from "./common.js";

const TYPE_NAME = { lpa: "LPA", gemba: "Gemba walk", firstoff: "First Off", s6: "Audit 6S", q8: "8 baze ale calității" };
export function qualityView(_p, _q, st) {
  const doc = S.doc, c = ctx();
  const running = st.lines.filter((l) => l.status === "run");
  const foDone = running.filter((l) => doc.audits.some((a) => a.type === "firstoff" && a.lineId === l.line.id && a.extra?.sk === c.sk && a.status === "done"));
  const lpaDue = lpaStatus().filter((x) => !x.done);
  const open8D = doc.eightD.filter((d) => d.status !== "closed");
  const pokaDue = doc.poka.filter((p) => pokaOverdue(p));
  const audits = [...doc.audits].filter((a) => a.status === "done").reverse().slice(0, 6);
  const tile = (ic, title, value, sub, href, tone = "", action = null) => h("div.qtile.panel", null, h("a.qt-main", { href }, h("span.qt-ic", null, icon(ic)), h("span", null, h("b", null, title), h("small", null, sub)), h("span.qt-v.num" + (tone ? "." + tone : ""), null, value)), action);
  return h("div", null, pageHead("Calitate", "Înregistrare și monitorizare. Nu înseamnă conformitate sau certificare IATF/ISO."),
    h("div.qgrid", null,
      tile("check", "First Off", foDone.length + "/" + running.length, "linii în funcțiune confirmate", "#/audits/firstoff", foDone.length < running.length ? "warn" : "", btn("Confirmă", () => pickLine("First Off · linia", (id) => (location.hash = "#/audit/new/firstoff?line=" + id)), "ghost")),
      tile("layers", "LPA", !doc.lpaPlan.length ? "—" : lpaDue.length ? lpaDue.length + " de făcut" : "la zi", doc.lpaPlan.length ? doc.lpaPlan.length + " audituri planificate" : "plan neconfigurat", "#/audits/lpa", lpaDue.length ? "warn" : "", btn("Audit", () => pickLine("LPA · linia", (id) => (location.hash = "#/audit/new/lpa?line=" + id)), "ghost")),
      tile("route", "Gemba walk", String(doc.audits.filter((a) => a.type === "gemba" && a.date === c.workDay).length), "azi · observații TIMWOOD", "#/audits/gemba", "", btn("Pornește", () => (location.hash = "#/audit/new/gemba"), "ghost")),
      tile("grid", "5S / 6S", String(doc.audits.filter((a) => a.type === "s6" && isoWeek(a.date) === isoWeek(c.workDay)).length), "audituri săptămâna aceasta", "#/audits/s6", "", btn("Audit", () => (location.hash = "#/audit/new/s6"), "ghost")),
      tile("target", "Poka-Yoke", String(doc.poka.length), pokaDue.length ? pokaDue.length + " verificări restante" : "verificări la zi", "#/poka", pokaDue.length ? "warn" : ""),
      tile("layers", "8D / CAPA", String(open8D.length), "deschise · " + doc.eightD.filter((d) => d.status === "closed").length + " închise", "#/eightd", open8D.length ? "warn" : ""),
      tile("quality", "8 baze ale calității", String(doc.audits.filter((a) => a.type === "q8").length), "conținut de configurat local", "#/audits/q8", "", btn("Audit", () => (location.hash = "#/audit/new/q8"), "ghost")),
      tile("bulb", "Kaizen", String(doc.kaizen.filter((k) => !["closed", "rejected"].includes(k.status)).length), "idei în PDCA", "#/kaizen"),
      tile("chart", "Lean 4", "Takt · Flow", "Zero Defect · Pull", "#/lean")),
    sect("Audituri recente"),
    audits.length ? h("div.list", null, audits.map((a) => auditItem(a))) : note("Niciun audit finalizat."));
}
const pickLine = (title, fn) => import("../ui/kit.js").then(({ pick }) => pick({ title, items: linesItems(), onPick: fn }));
function auditItem(a) {
  const sc = score(a);
  return item({ href: "#/audit/" + a.id, title: TYPE_NAME[a.type] + (a.lineId ? " · " + lineName(a.lineId) : a.zone ? " · " + a.zone : "") + (a.layer ? " · L" + a.layer : ""),
    sub: fmtDay(a.date) + " · v" + a.templateVersion + (a.auditor ? " · " + a.auditor : "") + (a.status === "draft" ? " · ciornă" : ""),
    end: a.status === "done" ? tag(sc.nok ? "nok" : "ok", sc.nok ? sc.nok + " NOK" : fmtPct(sc.ratio, 0)) : tag("warn", "ciornă") });
}
// LPA planificat: plan → făcut în perioadă?
function lpaStatus() {
  const doc = S.doc, c = ctx();
  return doc.lpaPlan.map((p) => {
    const period = p.freq === "daily" ? (a) => a.date === c.workDay : p.freq === "monthly" ? (a) => a.date.slice(0, 7) === c.workDay.slice(0, 7) : (a) => isoWeek(a.date) === isoWeek(c.workDay);
    const done = doc.audits.some((a) => a.type === "lpa" && a.status === "done" && a.lineId === p.lineId && String(a.layer) === String(p.layer) && period(a));
    return { ...p, done };
  });
}
export function auditsList([type]) {
  const doc = S.doc;
  const list = doc.audits.filter((a) => a.type === type).reverse();
  const tpl = templatesOf(doc)[type];
  if (!tpl) return empty("Tip necunoscut", "", null);
  const lines = [...new Set(list.map((a) => a.lineId || a.zone).filter(Boolean))];
  return h("div", null, backLink("#/quality", "Calitate"),
    pageHead(TYPE_NAME[type], "Checklist v" + tpl.version + " · " + tpl.questions.length + " întrebări · istoricul păstrează versiunea folosită",
      [btn("Editează checklistul", () => editTemplate(type), "ghost", "edit"), btn("Audit nou", () => (type === "lpa" || type === "firstoff" ? pickLine(TYPE_NAME[type] + " · linia", (id) => (location.hash = "#/audit/new/" + type + "?line=" + id)) : (location.hash = "#/audit/new/" + type)), "primary", "plus")]),
    type === "lpa" ? lpaPlanPanel() : null,
    type === "firstoff" ? note("Checklist inspirat din fișa ta de First Off. Confirmarea nu înlocuiește formularul oficial.") : null,
    type === "lpa" ? note("Categoriile LPA sunt inspirate din checklistul furnizat, nu un checklist oficial universal.") : null,
    lines.flatMap((w) => recurringNok(doc.audits, type, w)).length ? [sect("NOK recurente"), h("div.stack", null, lines.flatMap((w) => recurringNok(doc.audits, type, w).map((x) => note((byId(doc.master.lines, w)?.name || w) + ": „" + x.text + "” NOK în " + x.n + " din ultimele " + x.of + " audituri", "warn"))))] : null,
    list.filter((a) => a.status === "done").length >= 2 ? [sect("Scor în timp", h("span.aside", null, "ultimele 12 audituri finalizate · N/A exclus")),
      h("div.panel.pad", null, trend(list.filter((a) => a.status === "done").slice(0, 12).reverse().map((a) => ({ label: a.date.slice(8) + "." + a.date.slice(5, 7), v: score(a).ratio })), { label: "Scor audit" }))] : null,
    sect("Istoric"), list.length ? h("div.list", null, list.map(auditItem)) : note("Niciun audit încă."));
}
function lpaPlanPanel() {
  const rows = lpaStatus();
  return h("div.panel.pad", null, h("div.row.between", null, h("h3.ph3", null, "Plan LPA"), btn("Adaugă", () => lpaPlanSheet(), "ghost", "plus")),
    rows.length ? h("div.list.compact", null, rows.map((p) => h("div.arow", null, h("span.lvl.l" + p.layer, null, "L" + p.layer), h("span.amain", null, h("b", null, lineName(p.lineId)), h("small", null, ({ daily: "zilnic", weekly: "săptămânal", monthly: "lunar" })[p.freq] + (p.role ? " · " + p.role : ""))),
      tag(p.done ? "run" : "warn", p.done ? "făcut" : "de făcut"),
      h("button.ibtn", { type: "button", "aria-label": "Elimină", onclick: () => commit((d) => (d.lpaPlan = d.lpaPlan.filter((x) => x.id !== p.id)), "Eliminat din plan") }, icon("close"))))) : h("p.small.muted", null, "Configurează liniile, nivelurile (Layer 1–3), rolurile și frecvențele. Rutina ta prevede LPA săptămânal."));
}
function lpaPlanSheet() {
  const f = { id: uid(), lineId: null, layer: 2, role: "Supervizor", freq: "weekly" };
  const body = h("div.fields");
  const draw = () => put(body, picker("Linie", linesItems(), f.lineId, (v) => { f.lineId = v; draw(); }),
    field("Layer", seg([[1, "Layer 1"], [2, "Layer 2"], [3, "Layer 3"]], f.layer, (v) => { f.layer = v; draw(); })),
    field("Rol", input(f.role, (v) => (f.role = v))), field("Frecvență", select([["daily", "Zilnic"], ["weekly", "Săptămânal"], ["monthly", "Lunar"]], f.freq, (v) => (f.freq = v))));
  draw();
  const sh = sheet({ title: "Plan LPA", body, footer: [btn("Adaugă", () => { if (!f.lineId) return toast("Alege linia.", { err: true }); commit((d) => d.lpaPlan.push(f), "Adăugat în plan"); sh.close(); }, "primary")] });
}
function editTemplate(type) {
  const tpl = templatesOf(S.doc)[type];
  const qs = structuredClone(tpl.questions);
  const body = h("div");
  const draw = () => put(body, note("Salvarea creează versiunea " + (tpl.version + 1) + ". Auditurile vechi păstrează întrebările de atunci."),
    ...qs.map((q, i) => h("div.row", { style: { marginTop: "8px" } }, input(q.text, (v) => (q.text = v), { "aria-label": "Întrebarea " + (i + 1) }), h("button.ibtn", { type: "button", "aria-label": "Elimină", onclick: () => { qs.splice(i, 1); draw(); } }, icon("trash")))),
    btn("Adaugă întrebare", () => { qs.push({ text: "" }); draw(); }, "ghost", "plus"));
  draw();
  const sh = sheet({ title: "Checklist " + TYPE_NAME[type], body, footer: [btn("Salvează versiunea nouă", () => { commit((d) => updateTemplate(d, type, qs, now()), "Checklist v" + (tpl.version + 1)); sh.close(); }, "primary")] });
}
export function auditNew([type], q) {
  const lineId = q.get("line");
  const c = ctx();
  if (!templatesOf(S.doc)[type]) return note("Tip de audit necunoscut.");
  if ((type === "lpa" || type === "firstoff") && !lineId) { setTimeout(() => pickLine(TYPE_NAME[type] + " · linia", (id) => location.replace("#/audit/new/" + type + "?line=" + id)), 0); return h("div", null, backLink("#/quality", "Calitate"), note("Alege linia.")); }
  // Crearea are loc după randare (commit re-randează); o singură creare per adresă.
  const token = location.hash;
  if (creating !== token) {
    creating = token;
    setTimeout(() => {
      const r = commit((d) => {
        const L = st2(lineId);
        return startAudit(d, type, { lineId, layer: type === "lpa" ? S.doc.lpaPlan.find((p) => p.lineId === lineId)?.layer || 2 : null, pnId: L?.activePn || null, extra: { sk: c.sk, trigger: "start" } }, now());
      }, null, { undo: false });
      creating = null;
      if (r.ok) location.replace("#/audit/" + r.result.id);
    }, 0);
  }
  return h("div", null, note("Se pregătește auditul…"));
}
let creating = null;
const st2 = (lineId) => (lineId ? { activePn: S.doc.events.filter((e) => e.lineId === lineId && e.pnId && !e.void).at(-1)?.pnId || null } : null);
export function auditView([id]) {
  const doc = S.doc;
  const a = doc.audits.find((x) => x.id === id);
  if (!a) return h("div", null, backLink("#/quality", "Calitate"), empty("Auditul nu există", "", null));
  const sc = score(a);
  const ro = a.status === "done";
  const set = (qid, patch) => commit(() => answer(a, qid, patch), null, { undo: false });
  const L = byId(doc.master.lines, a.lineId);
  return h("div", null, backLink("#/audits/" + a.type, TYPE_NAME[a.type]),
    pageHead(TYPE_NAME[a.type], [fmtDay(a.date, true), L?.name, a.layer ? "Layer " + a.layer : "", "checklist v" + a.templateVersion].filter(Boolean).join(" · ")),
    h("div.rprog", null, h("i", { style: { width: ((a.questions.length - sc.missing) / a.questions.length) * 100 + "%" } })),
    h("p.small.muted", { style: { margin: "6px 0 12px" } }, (a.questions.length - sc.missing) + "/" + a.questions.length + " răspunsuri · " + sc.ok + " OK · " + sc.nok + " NOK · " + sc.na + " N/A" + (sc.ratio !== null ? " · scor " + fmtPct(sc.ratio, 0) + " (N/A exclus)" : "")),
    h("div.panel.pad.fields", null,
      h("div.fields.c2", null, field("Auditor", input(a.auditor, (v) => (a.auditor = v), { onchange: () => commit(() => 0, null, { undo: false }), disabled: ro })),
        a.type === "firstoff" ? picker("PN", pnItems(a.lineId), a.pnId, (v) => commit(() => (a.pnId = v), null)) : field("Zonă / linie", input(a.zone || L?.name || "", (v) => (a.zone = v), { onchange: () => commit(() => 0, null, { undo: false }), disabled: ro || !!L }))),
      a.type === "firstoff" ? field("Moment", seg([["start", "Pornire"], ["changeover", "Schimbare reper"], ["intervention", "După intervenție"]], a.extra.trigger, (v) => commit(() => (a.extra.trigger = v), null))) : null),
    a.questions.map((q, i) => qRow(a, q, i, set, ro)),
    a.type === "gemba" ? gembaExtra(a, ro) : null,
    ro ? note("Audit finalizat.", "run") : h("div.sticky-actions", null,
      btn("Șterge ciorna", async () => { if (await confirmSheet("Ștergi ciorna?", "Răspunsurile se pierd.", "Șterge", true)) { commit((d) => (d.audits = d.audits.filter((x) => x.id !== a.id)), "Ciornă ștearsă"); location.hash = "#/quality"; } }, "ghost"),
      btn("Finalizează auditul", () => { const r = commit(() => finishAudit(a), "Audit finalizat"); if (r.ok) S.render(); }, "primary big")));
}
function qRow(a, q, i, set, ro) {
  const ans = a.answers[q.id] || {};
  return h("div.qrow.panel.pad" + (ans.r === "nok" ? ".isnok" : ""), null,
    h("div.qtext", null, h("span.num.qn", null, String(i + 1)), h("span", null, q.cat ? h("b", null, q.cat + ": ") : null, q.text)),
    h("div.seg.status", null, ["ok", "nok", "na"].map((r) => h("button", { type: "button", class: r, disabled: ro, "aria-pressed": String(ans.r === r), onclick: () => set(q.id, { r }) }, r === "ok" ? "OK" : r === "nok" ? "NOK" : "N/A"))),
    ans.r === "nok" ? h("div.fields", { style: { marginTop: "10px" } },
      field("Observație", input(ans.obs || "", (v) => (ans.obs = v), { onchange: () => set(q.id, { obs: ans.obs }), disabled: ro })),
      ans.taskId ? h("a.crumb", { href: "#/tasks?open=" + ans.taskId }, icon("link"), "Acțiune: " + (S.doc.tasks.find((t) => t.id === ans.taskId)?.title || "")) :
        h("div.row.wrap", null, field("Acțiune imediată", input(ans.action || "", (v) => (ans.action = v), { onchange: () => set(q.id, { action: ans.action }), disabled: ro, placeholder: "Corectat pe loc" })),
          ro ? null : btn("Responsabil + termen", () => taskFromSheet({ title: q.text, desc: ans.obs || "", lineId: a.lineId, source: { type: a.type === "s6" ? "s5" : a.type, label: TYPE_NAME[a.type] }, onCreated: (t) => set(q.id, { taskId: t.id }) }), "ghost", "plus"))) : null);
}
function gembaExtra(a, ro) {
  const x = (a.extra.gemba ||= { obs: [], bottleneck: { machineId: null, text: "" }, deviation: { text: "", ref: "", period: "", action: "" } });
  const save = () => commit(() => 0, null, { undo: false });
  const L = byId(S.doc.master.lines, a.lineId);
  return h("div", null,
    sect("Observații TIMWOOD", ro ? null : btn("Adaugă", () => gembaObs(a, x), "ghost", "plus")),
    h("div.timwood", null, Object.entries(TIMWOOD).map(([k, v]) => h("span.tw", null, h("b.num", null, k === "P" ? "O" : k), v, h("small.num", null, String(x.obs.filter((o) => o.waste === k).length))))),
    x.obs.length ? h("div.list", null, x.obs.map((o) => h("div.item", null, h("span.tw-k.num", null, o.waste === "P" ? "O₂" : o.waste), h("div.main", null, h("div.t", null, o.text), h("div.s", null, [TIMWOOD[o.waste], o.impact && "impact: " + o.impact, o.idea && "idee: " + o.idea, o.taskId && "acțiune creată"].filter(Boolean).join(" · ")))))) : h("p.small.muted", null, "Nicio observație."),
    sect("Bottleneck"),
    h("div.panel.pad.fields", null, L ? picker("Operația", machineItems(L.id), x.bottleneck.machineId, (v) => { x.bottleneck.machineId = v; save(); }, { allowNone: true }) : null,
      field("Descriere", area(x.bottleneck.text, (v) => (x.bottleneck.text = v), { rows: 2, onchange: save, disabled: ro, placeholder: "Ce limitează fluxul, ce s-a observat" }))),
    sect("Producție cu deviație"),
    h("div.panel.pad.fields", null, note("Înregistrarea nu reprezintă autorizarea oficială a unei deviații."),
      field("Deviația", input(x.deviation.text, (v) => (x.deviation.text = v), { onchange: save, disabled: ro })),
      h("div.fields.c2", null, field("Referința autorizată", input(x.deviation.ref, (v) => (x.deviation.ref = v), { onchange: save, disabled: ro })), field("Perioada", input(x.deviation.period, (v) => (x.deviation.period = v), { onchange: save, disabled: ro }))),
      field("Acțiune necesară", input(x.deviation.action, (v) => (x.deviation.action = v), { onchange: save, disabled: ro }))));
}
function gembaObs(a, x) {
  const o = { id: uid(), waste: "W", text: "", impact: "", idea: "", ownerId: null };
  const body = h("div.fields");
  const draw = () => put(body, field("Categoria de pierdere", h("div.chips.wrapchips", null, Object.entries(TIMWOOD).map(([k, v]) => h("button", { type: "button", "aria-pressed": String(o.waste === k), onclick: () => { o.waste = k; draw(); } }, v)))),
    field("Observație", area(o.text, (v) => (o.text = v), { rows: 2 })), field("Impact", input(o.impact, (v) => (o.impact = v))), field("Idee de îmbunătățire", input(o.idea, (v) => (o.idea = v))));
  draw();
  const sh = sheet({ title: "Observație Gemba", body, footer: [
    btn("Salvează", () => { if (!o.text.trim()) return toast("Scrie observația.", { err: true }); commit(() => x.obs.push(o), "Observație adăugată"); sh.close(); }),
    btn("Salvează + acțiune", () => { if (!o.text.trim()) return toast("Scrie observația.", { err: true }); commit(() => x.obs.push(o), null); sh.close(); taskFromSheet({ title: o.idea || o.text, desc: TIMWOOD[o.waste] + ": " + o.text, lineId: a.lineId, source: { type: "gemba", label: TIMWOOD[o.waste] }, onCreated: (t) => commit(() => (o.taskId = t.id), null) }); }, "primary")] });
}

// ——— Poka-Yoke ———
function pokaOverdue(p) {
  const last = p.checks?.at(-1)?.date;
  const days = { shift: 1, day: 1, week: 7, month: 31 }[p.freq] || 7;
  return !last || last < addDays(ctx().workDay, -days + 1);
}
export function pokaView() {
  const doc = S.doc;
  return h("div", null, backLink("#/quality", "Calitate"),
    pageHead("Poka-Yoke", "Registru și verificări. Aplicația nu controlează fizic dispozitivele.", [btn("Dispozitiv nou", () => pokaSheet(), "primary", "plus")]),
    h("div.pkinfo", null, Object.entries(POKA_METHOD).map(([k, v]) => h("div.panel.pad", null, h("b", null, v.label), h("p.small.muted", null, v.text))),
      h("div.panel.pad", null, h("b", null, "Funcție"), h("p.small.muted", null, "Avertizare: semnal, operatorul decide. Control / prevenire: procesul nu poate continua până la corectare."))),
    doc.poka.length ? h("div.list", { style: { marginTop: "12px" } }, doc.poka.map((p) => {
      const last = p.checks?.at(-1);
      return item({ title: p.error || "Dispozitiv", sub: [lineName(p.lineId), byId(doc.master.lines, p.lineId)?.machines.find((m) => m.id === p.machineId)?.name, p.pnId && pnCode(p.pnId), POKA_METHOD[p.method]?.label, POKA_FUNCTION[p.fn]].filter(Boolean).join(" · "),
        end: last ? tag(last.r === "ok" ? "ok" : "nok", (last.r === "ok" ? "OK " : "NOK ") + last.date.slice(5)) : tag(pokaOverdue(p) ? "warn" : "idle", "neverificat"), onClick: () => pokaSheet(p) });
    })) : empty("Registrul este gol", "Adaugă dispozitivele Poka-Yoke de pe linii, cu metoda, funcția și frecvența verificării.", null));
}
function pokaSheet(existing) {
  const p = existing ? structuredClone(existing) : { id: uid(), lineId: null, machineId: null, pnId: null, error: "", method: "contact", fn: "control", freq: "shift", checks: [], ownerId: null };
  const body = h("div.fields");
  let chk = { r: "ok", note: "" };
  const draw = () => put(body, picker("Linie", linesItems(), p.lineId, (v) => { p.lineId = v; draw(); }),
    p.lineId ? picker("Mașină / operație", machineItems(p.lineId), p.machineId, (v) => { p.machineId = v; draw(); }, { allowNone: true }) : null,
    p.lineId ? picker("PN", pnItems(p.lineId), p.pnId, (v) => { p.pnId = v; draw(); }, { allowNone: true, noneLabel: "Toate PN-urile" }) : null,
    field("Eroarea prevenită", input(p.error, (v) => (p.error = v))),
    field("Metoda", seg(Object.entries(POKA_METHOD).map(([k, v]) => [k, v.label]), p.method, (v) => { p.method = v; draw(); })),
    h("small.muted", null, POKA_METHOD[p.method].text),
    field("Funcția", seg(Object.entries(POKA_FUNCTION), p.fn, (v) => { p.fn = v; draw(); })),
    h("div.fields.c2", null, field("Frecvența verificării", select([["shift", "Pe schimb"], ["day", "Zilnic"], ["week", "Săptămânal"], ["month", "Lunar"]], p.freq, (v) => (p.freq = v))),
      picker("Responsabil", peopleItems(), p.ownerId, (v) => { p.ownerId = v; draw(); }, { allowNone: true })),
    existing ? h("div.panel.pad", null, h("b", null, "Verificare acum"), seg([["ok", "OK"], ["nok", "NOK"]], chk.r, (v) => { chk.r = v; draw(); }, "status"), field("Observație", input(chk.note, (v) => (chk.note = v))),
      btn("Înregistrează verificarea", () => {
        commit((d) => { const x = d.poka.find((y) => y.id === p.id); x.checks.push({ date: ctx().workDay, at: now().toISOString(), r: chk.r, note: chk.note }); }, "Verificare înregistrată");
        sh.close();
        if (chk.r === "nok") taskFromSheet({ title: "Poka-Yoke NOK: " + p.error, lineId: p.lineId, desc: chk.note, source: { type: "poka", label: POKA_METHOD[p.method].label } });
      }, "primary")) : null,
    existing?.checks?.length ? h("details", null, h("summary.small", null, "Istoric verificări (" + existing.checks.length + ")"), h("ul.small", null, existing.checks.slice().reverse().map((x) => h("li", null, x.date + " · " + x.r.toUpperCase() + (x.note ? " · " + x.note : ""))))) : null);
  draw();
  const sh = sheet({ title: existing ? "Poka-Yoke" : "Dispozitiv nou", body, footer: [btn("Salvează", () => {
    if (!p.lineId || !p.error.trim()) return toast("Completează linia și eroarea prevenită.", { err: true });
    commit((d) => { const i = d.poka.findIndex((x) => x.id === p.id); if (i >= 0) d.poka[i] = { ...p, checks: d.poka[i].checks }; else d.poka.push(p); }, "Salvat");
    sh.close();
  }, "primary")] });
}

// ——— 8D ———
export function eightDList() {
  const doc = S.doc;
  return h("div", null, backLink("#/quality", "Calitate"),
    pageHead("8D / CAPA", "Pentru probleme care o justifică, nu pentru fiecare incident minor", [btn("8D nou", async () => {
      const { promptSheet } = await import("../ui/kit.js");
      const title = await promptSheet("8D nou", "Titlul problemei");
      if (title) { const r = commit((d) => create8D(d, { title }, now()), "8D creat"); if (r.ok) location.hash = "#/8d/" + r.result.id; }
    }, "primary", "plus")]),
    doc.eightD.length ? h("div.list", null, [...doc.eightD].reverse().map((d) => item({ href: "#/8d/" + d.id, title: "8D #" + d.no + " · " + d.title,
      sub: (d.lineId ? lineName(d.lineId) + " · " : "") + d8Progress(d) + "/9 etape", end: h("span.d8mini", null, D_STEPS.map(([k]) => h("i", { class: d.steps[k].done ? "on" : "" }))) }))) : empty("Niciun 8D", "Deschide un 8D dintr-un incident, o neconformitate sau o reclamație.", null));
}
export function eightDView([id]) {
  const d = S.doc.eightD.find((x) => x.id === id);
  if (!d) return h("div", null, backLink("#/eightd", "8D"), empty("8D inexistent", "", null));
  const save = () => commit(() => 0, null, { undo: false });
  const step = (k, label, title, content) => {
    const s = d.steps[k];
    const err = s.done ? null : canComplete(d, k);
    return h("details.d8step.panel" + (s.done ? ".done" : ""), { open: !s.done && !D_STEPS.slice(0, D_STEPS.findIndex(([x]) => x === k)).some(([x]) => !d.steps[x].done && x !== "d0") ? true : null },
      h("summary", null, h("span.d8k.num", null, label), h("span.d8t", null, title), s.done ? tag("run", "Finalizat") : tag("idle", "Deschis")),
      h("div.d8body", null,
        h("div.fields.c2", null, picker("Responsabil", peopleItems(), s.owner || null, (v) => { s.owner = v; save(); }, { allowNone: true }), field("Termen", input(s.due, (v) => (s.due = v), { type: "date", onchange: save }))),
        content,
        field("Note / dovezi", area(s.text, (v) => (s.text = v), { rows: 2, onchange: save })),
        s.done ? h("p.small.muted", null, "Finalizat " + new Date(s.doneAt).toLocaleString("ro-RO")) :
          h("div.row.wrap", null, btn("Finalizează " + label, () => commit(() => completeStep(d, k, now()), label + " finalizat"), "primary"), err ? h("span.small.muted", null, err) : null)));
  };
  const list = (arr, label, extra = () => null) => h("div.stack", null, arr.map((x, i) => h("div.row", null, h("span.clip", { style: { flex: 1 } }, "• " + x.text + (x.taskId ? " (acțiune)" : "")), extra(x),
    h("button.ibtn", { type: "button", "aria-label": "Elimină", onclick: () => commit(() => arr.splice(i, 1), null) }, icon("close")))),
  btn("Adaugă " + label, async () => { const { promptSheet } = await import("../ui/kit.js"); const t = await promptSheet("Adaugă " + label, label); if (t) commit(() => arr.push({ id: uid(), text: t }), null); }, "ghost", "plus"));
  return h("div", null, backLink("#/eightd", "8D"),
    pageHead("8D #" + d.no, d.title + (d.lineId ? " · " + lineName(d.lineId) : "")),
    h("div.d8bar", null, D_STEPS.map(([k, l]) => h("span", { class: d.steps[k].done ? "on" : "" }, l))),
    step("d0", "D0", "Pregătire și evaluare inițială", note("Decide dacă problema justifică 8D. Pentru incidente minore folosește acțiuni directe.")),
    step("d1", "D1", "Echipa", field("Membri (roluri)", area(d.team, (v) => (d.team = v), { rows: 2, onchange: save }))),
    step("d2", "D2", "Descrierea problemei (5W2H)", h("div.fields", null, [["what", "Ce"], ["where", "Unde"], ["when", "Când"], ["who", "Cine a detectat"], ["why", "De ce e o problemă"], ["how", "Cum a fost detectat"], ["howMany", "Câte"]].map(([k, l]) => field(l, input(d.w5h2[k], (v) => (d.w5h2[k] = v), { onchange: save }))))),
    step("d3", "D3", "Containment", list(d.containment, "acțiune de containment")),
    step("d4", "D4", "Cauza fundamentală și punctul de scăpare", h("div", null,
      note("O cauză devine confirmată doar cu dovada verificării. Separă cauza de apariție de punctul de scăpare (neidentificare)."),
      h("div.ishi", null, SIX_M.map((m) => h("div.ishi-b", null, h("b", null, m), d.causes.filter((x) => x.m6 === m).map((x) => causeEl(d, x))))),
      btn("Adaugă cauză candidată", () => causeSheet(d), "ghost", "plus"),
      h("h4.ph3", { style: { marginTop: "12px" } }, "5 Why"),
      list(d.whys, "„de ce” verificat"))),
    step("d5", "D5", "Acțiuni corective permanente", list(d.actions, "acțiune corectivă", (x) => x.taskId ? null : btn("Responsabil", () => taskFromSheet({ title: x.text, lineId: d.lineId, source: { type: "eightd", label: "8D #" + d.no }, onCreated: (t) => commit(() => (x.taskId = t.id), null) }), "ghost"))),
    step("d6", "D6", "Implementare și validarea eficacității", h("div.fields", null,
      field("Cum se măsoară eficacitatea", input(d.effectiveness.measure, (v) => (d.effectiveness.measure = v), { onchange: save, placeholder: "Ex. zero recurențe în 4 săptămâni" })),
      field("Rezultat măsurat", area(d.effectiveness.result, (v) => (d.effectiveness.result = v), { rows: 2, onchange: save })),
      h("label.check", null, h("input", { type: "checkbox", checked: d.effectiveness.verified, onchange: (e) => { if (e.target.checked && !d.effectiveness.result.trim()) { e.target.checked = false; return toast("Eficacitatea nu se declară fără rezultat verificabil.", { err: true }); } commit(() => { d.effectiveness.verified = e.target.checked; d.effectiveness.at = now().toISOString(); }, null); } }), "Eficacitate verificată cu rezultatul de mai sus"))),
    step("d7", "D7", "Prevenirea recurenței", note("Actualizează PFMEA, Control Plan, instrucțiunile și extinde la procese similare. Notează documentele în note.")),
    step("d8", "D8", "Închidere și recunoașterea echipei", null));
}
function causeEl(d, x) {
  return h("div.cause." + x.status, null, h("span", null, x.text), h("small", null, (x.kind === "escape" ? "scăpare" : "apariție") + " · " + ({ candidate: "candidată", verified: "verificată", rejected: "respinsă" })[x.status]),
    x.status === "candidate" ? h("div.row", null, btn("Verifică", async () => { const { promptSheet } = await import("../ui/kit.js"); const ev = await promptSheet("Dovada verificării", "Cum a fost confirmată (test, date, reproducere)?", { multiline: true }); if (ev) commit(() => verifyCause(x, ev), "Cauză verificată"); }, "ghost"),
      btn("Respinge", () => commit(() => (x.status = "rejected"), null), "ghost")) : x.evidence ? h("small.muted", null, "Dovadă: " + x.evidence) : null);
}
function causeSheet(d) {
  const x = { id: uid(), text: "", m6: "Mașină", kind: "occurrence", status: "candidate", evidence: "" };
  const body = h("div.fields");
  const draw = () => put(body, field("Cauza", input(x.text, (v) => (x.text = v))), field("Categoria 6M", select(SIX_M.map((m) => [m, m]), x.m6, (v) => (x.m6 = v))),
    field("Tip", seg([["occurrence", "Apariție"], ["escape", "Punct de scăpare"]], x.kind, (v) => { x.kind = v; draw(); })));
  draw();
  const sh = sheet({ title: "Cauză candidată", body, footer: [btn("Adaugă", () => { if (!x.text.trim()) return toast("Scrie cauza.", { err: true }); commit(() => d.causes.push(x), "Cauză adăugată (candidată)"); sh.close(); }, "primary")] });
}

// ——— Kaizen ———
export function kaizenView() {
  const doc = S.doc;
  const list = [...doc.kaizen].sort((a, b) => (kaizenScore(b) || 0) - (kaizenScore(a) || 0));
  return h("div", null, backLink("#/quality", "Calitate"),
    pageHead("Kaizen", "Idei de îmbunătățire în PDCA · estimările sunt separate de rezultatele măsurate", [btn("Idee nouă", () => kaizenSheet(), "primary", "plus")]),
    list.length ? h("div.list", null, list.map((k) => item({ title: k.problem, sub: [k.category, "impact " + (k.impact || "?") + " / efort " + (k.effort || "?"), personName(k.ownerId) !== "—" ? personName(k.ownerId) : "", k.result ? "rezultat măsurat" : k.estimate ? "doar estimare" : ""].filter(Boolean).join(" · "),
      end: h("div.stack-end", null, tag(k.status === "closed" ? "run" : k.status === "rejected" ? "idle" : "change", PDCA[k.status]), h("span.num.small", null, "scor " + (kaizenScore(k) ?? "—"))), onClick: () => kaizenSheet(k) })))
      : empty("Nicio idee încă", "Ideile vin din Gemba, rutină și echipă. Fiecare are responsabil, PDCA și verificare.", null));
}
function kaizenSheet(existing) {
  const k = existing ? structuredClone(existing) : { id: uid(), problem: "", current: "", proposal: "", category: "Productivitate", impact: 3, effort: 2, safety: false, quality: false, urgent: false, ownerId: null, status: "plan", estimate: "", result: "", verification: "", createdAt: now().toISOString() };
  const body = h("div.fields");
  const draw = () => put(body, field("Problema", input(k.problem, (v) => (k.problem = v))), field("Situația actuală", area(k.current, (v) => (k.current = v), { rows: 2 })),
    field("Propunerea", area(k.proposal, (v) => (k.proposal = v), { rows: 2 })),
    h("div.fields.c2", null, field("Categorie", select(["Siguranță", "Calitate", "Productivitate", "Cost", "Ergonomie", "5S"].map((x) => [x, x]), k.category, (v) => (k.category = v))),
      picker("Responsabil", peopleItems(), k.ownerId, (v) => { k.ownerId = v; draw(); }, { allowNone: true })),
    h("div.fields.c2", null, field("Impact estimat (1–5)", seg([1, 2, 3, 4, 5].map((n) => [n, String(n)]), k.impact, (v) => { k.impact = v; draw(); })), field("Efort estimat (1–5)", seg([1, 2, 3, 4, 5].map((n) => [n, String(n)]), k.effort, (v) => { k.effort = v; draw(); }))),
    h("div.row.wrap", null, ...[["safety", "Siguranță"], ["quality", "Calitate"], ["urgent", "Urgent"]].map(([f, l]) => h("label.check", null, h("input", { type: "checkbox", checked: k[f], onchange: (e) => (k[f] = e.target.checked) }), l))),
    field("Etapa PDCA", seg(Object.entries(PDCA), k.status, (v) => { k.status = v; draw(); })),
    field("Estimare (nu rezultat)", input(k.estimate, (v) => (k.estimate = v), { placeholder: "Fără economii financiare inventate" })),
    field("Rezultat real măsurat", area(k.result, (v) => (k.result = v), { rows: 2 })),
    field("Verificare", input(k.verification, (v) => (k.verification = v), { placeholder: "Cine, când, cum" })),
    k.status === "closed" && !k.result.trim() ? note("Închiderea cere rezultatul măsurat.", "warn") : null);
  draw();
  const sh = sheet({ title: existing ? "Idee Kaizen" : "Idee nouă", body, footer: [
    existing ? btn("Creează acțiune", () => { sh.close(); taskFromSheet({ title: k.proposal || k.problem, source: { type: "kaizen", label: k.category } }); }, "ghost") : null,
    btn("Salvează", () => {
      if (!k.problem.trim()) return toast("Descrie problema.", { err: true });
      if (k.status === "closed" && !k.result.trim()) return toast("Închiderea cere rezultatul măsurat.", { err: true });
      commit((d) => { const i = d.kaizen.findIndex((x) => x.id === k.id); if (i >= 0) d.kaizen[i] = k; else d.kaizen.push(k); }, "Idee salvată");
      sh.close();
    }, "primary")] });
}

// ——— Lean 4 ———
export function leanView(_p, _q, st) {
  const doc = S.doc, c = ctx();
  const br = breaksOf(c.workDay, c.shift);
  const takt = st.planned.map((L) => {
    const run = L.plan.runs[0];
    const w = runWindow(run, c.workDay, c.shift);
    const avail = L.plan.runs.reduce((a, r) => { const ww = runWindow(r, c.workDay, c.shift); return a + (ww ? productiveMin(ww.from, ww.to, br) : 0); }, 0);
    const demand = nn(L.line.demandPerShift, true);
    const tk = demand ? (avail * 60) / demand : null;
    const cyc = nn(run?.cycleSec), ict = nn(byId(doc.master.pns, run?.pnId)?.ict);
    return { L, avail, demand, tk, cyc, ict, ok: tk && cyc ? cyc <= tk : null, w };
  });
  const stops = st.lines.reduce((a, L) => a + L.mins.stop + L.mins.notrunning, 0);
  const co = st.lines.reduce((a, L) => a + L.mins.changeover, 0);
  const unk = st.lines.reduce((a, L) => a + L.mins.unknown, 0);
  const mat = doc.events.filter((e) => !e.void && /material/i.test(e.reason || "") && new Date(e.at) >= st.from).length;
  const rows = st.lines.flatMap((L) => L.rows.filter((r) => r.actual !== null && r.good !== null));
  const T = rows.reduce((a, r) => a + r.actual, 0), G = rows.reduce((a, r) => a + r.good, 0), SC = rows.reduce((a, r) => a + r.scrap, 0);
  const running = st.lines.filter((l) => l.status === "run");
  const fo = running.filter((l) => doc.audits.some((a) => a.type === "firstoff" && a.lineId === l.line.id && a.extra?.sk === c.sk && a.status === "done")).length;
  const bottlenecks = doc.audits.filter((a) => a.type === "gemba" && a.extra?.gemba?.bottleneck?.text).slice(-3);
  const recs = [];
  takt.filter((x) => x.ok === false).forEach((x) => recs.push(x.L.line.name + ": ciclul planificat (" + x.cyc + " s) depășește takt-ul (" + fmtN(x.tk, 1) + " s). Echilibrează linia sau revizuiește capacitatea."));
  if (takt.some((x) => !x.demand)) recs.push("Cererea clientului pe schimb nu este configurată pe toate liniile: takt-ul nu poate fi calculat (Catalog → Linii).");
  if (co > 0 && co >= stops / 2) recs.push("Changeover-ul (" + Math.round(co) + " min) este semnificativ față de opriri: candidat pentru SMED.");
  if (unk > 30) recs.push(Math.round(unk) + " min fără status de linie: înregistrează pornirile pentru o imagine corectă a fluxului.");
  if (running.length > fo) recs.push((running.length - fo) + " linii rulează fără First Off confirmat în schimb.");
  if (T && SC / T > 0.02) recs.push("Rebut " + fmtPct(SC / T) + ": verifică Pareto pe linie și containment-ul.");
  const pillar = (k, title, items) => h("div.lean.panel.pad", null, h("div.lean-h", null, h("span.num", null, k), h("b", null, title)), h("dl.lean-l", null, items.map(([a, b]) => [h("dt", null, a), h("dd", null, b)])));
  return h("div", null, backLink("#/quality", "Calitate"),
    pageHead("Lean 4", "Takt · Flow · Zero Defect · Pull — din datele schimbului; „—” = date insuficiente"),
    h("div.leangrid", null,
      pillar("T", "Takt", [["Linii cu takt calculabil", takt.filter((x) => x.tk).length + "/" + takt.length], ...takt.slice(0, 6).map((x) => [x.L.line.name, x.tk ? "takt " + fmtN(x.tk, 1) + " s · ciclu " + (x.cyc ?? "—") + " s · ICT " + (x.ict ?? "—") + " s" : "cerere neconfigurată"]),
        ["Bottleneck observat", bottlenecks.length ? bottlenecks.map((a) => lineName(a.lineId) + ": " + a.extra.gemba.bottleneck.text).join("; ") : "niciun Gemba cu bottleneck"]]),
      pillar("F", "Flow", [["Opriri", Math.round(stops) + " min"], ["Changeover", Math.round(co) + " min"], ["Fără status", Math.round(unk) + " min"], ["Opriri „material”", String(mat)], ["WIP", "neînregistrat în aplicație"]]),
      pillar("Z", "Zero Defect", [["FPY", fmtPct(T ? G / T : null)], ["Rebut", fmtPct(T ? SC / T : null)], ["First Off", fo + "/" + running.length + " linii"], ["Poka-Yoke restante", String(doc.poka.filter(pokaOverdue).length)], ["8D deschise", String(doc.eightD.filter((d) => d.status !== "closed").length)]]),
      pillar("P", "Pull", [["Cerere vs. plan", takt.filter((x) => x.demand).map((x) => x.L.line.name + ": " + fmtN(x.demand) + " / " + fmtN(x.L.planTotal)).join("; ") || "cerere neconfigurată"], ["Kanban / reaprovizionare", "fără date în aplicație; nu se simulează"]])),
    sect("Recomandări explicabile"),
    recs.length ? h("div.stack", null, recs.map((r) => note(r, "warn"))) : note("Nicio recomandare pe baza datelor existente.", "run"));
}
