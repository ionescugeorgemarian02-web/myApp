// RUTINA MEA EPT — timeline operațional pe etape. Statusul (timp) e separat de rezultat (OK/NOK/N/A).
import { h, btn, icon, tag, seg, sheet, field, area, select, sect, toast, note } from "../ui/kit.js";
import { S, ctx, commit, now } from "../state.js";
import { routineFor, progress, nowList, record, PHASES, FREQ, STATUS, ESCALATION_RULE, templateOf, defaultTemplate } from "../domain/routine.js";
import { fmtHM } from "../core/time.js";
import { fmtPct } from "../core/num.js";
import { taskFromSheet } from "./common.js";
import { presentIds, conflicts } from "../domain/workforce.js";

const ST_TONE = { done: "run", overdue: "stop", available: "warn", progress: "change", upcoming: "idle", missed: "stop", na: "idle" };
const LINKS = {
  handover: ["#/handover", "Predarea schimbului"], incidents: ["#/incidents", "Incidente"], quality: ["#/quality", "Calitate"],
  planning: ["#/planning", "Planificare"], production: ["#/production", "Linii"], tasks: ["#/tasks", "Sarcini"], team: ["#/team", "Echipa"],
  allocation: ["#/team/allocation", "Alocarea personalului"], scrap: ["#/oee?tab=scrap", "Rebuturi"], lpa: ["#/audit/new/lpa", "Audit LPA"],
  oee: ["#/oee", "Indicatori"], firstoff: ["#/audit/new/firstoff", "First Off"], report: ["#/production?f=reports", "Rapoarte orare"],
  eightd: ["#/eightd", "8D / QPS"], kaizen: ["#/kaizen", "Idei Kaizen"], s5: ["#/audit/new/s6", "Audit 6S"], gemba: ["#/audit/new/gemba", "Gemba walk"], matrix: ["#/team/matrix", "Matricea de calificare"],
};
let viewMode = "now";
export function routineView(_p, q, st) {
  const c = ctx(), t = now();
  const rows = routineFor(S.doc, c.workDay, c.shift, t);
  const prog = progress(rows);
  const focus = q.get("focus");
  if (focus) { const r = rows.find((x) => x.inst.key === focus); if (r) setTimeout(() => itemSheet(r, st), 0); history.replaceState(null, "", "#/routine"); }
  const byPhase = PHASES.map((p) => ({ p, rows: rows.filter((r) => r.act.phase === p.id && !r.inst.weekly) }));
  const head = h("div.head", null,
    h("div", null, h("h1", null, "Rutina mea EPT"), h("p", null, "Supervisor standard work · " + c.shift.name + " · " + c.shift.start + "–" + c.shift.end)),
    h("div.actions", null, btn("Configurează", () => configSheet(), "ghost", "settings")));
  const summary = h("div.rsum.panel", null,
    h("div.rs-big", null, h("span.num", null, fmtPct(prog.ratio, 0)), h("small", null, prog.done + " din " + prog.total + " finalizate")),
    h("div.rs-phases", null, byPhase.filter((x) => x.p.id !== "rules").map(({ p, rows: rs }) => {
      const pr = progress(rs);
      return h("div.rsp.ph-" + p.id, null, h("span", null, p.short), h("span.pbar", null, h("i", { style: { width: (pr.ratio || 0) * 100 + "%" } })), h("span.num.small", null, pr.done + "/" + pr.total));
    })),
    h("div.rs-flags", null, prog.overdue ? tag("stop", prog.overdue + " depășite") : null, prog.nok ? tag("nok", prog.nok + " NOK") : null, !prog.overdue && !prog.nok ? tag("run", "La zi") : null));
  const mode = seg([["now", "Acum"], ["timeline", "Timeline"], ["week", "Săptămâna"], ["rules", "Reguli"]], viewMode, (v) => { viewMode = v; S.render(); });
  let body;
  if (viewMode === "now") {
    const list = nowList(rows, 12);
    const up = rows.filter((r) => r.status === "upcoming" && !r.inst.weekly).sort((a, b) => a.inst.from - b.inst.from).slice(0, 4);
    body = [sect("Ce trebuie să fac acum"), list.length ? h("div.rlist", null, list.map((r) => rowEl(r, st))) : note("Nicio activitate deschisă în acest moment."),
      up.length ? [sect("Urmează"), h("div.rlist", null, up.map((r) => rowEl(r, st)))] : null];
  } else if (viewMode === "timeline") {
    body = byPhase.filter((x) => x.p.id !== "rules").map(({ p, rows: rs }) => h("section.phase.ph-" + p.id, null,
      h("div.ph-h", null, h("span.ph-dot"), h("h2", null, p.title), h("span.small.muted", null, progress(rs).done + "/" + progress(rs).total)),
      groupBy(rs).map(([g, items]) => h("div.ph-g", null, h("div.ph-gt", null, g), h("div.rlist", null, items.map((r) => rowEl(r, st))))))).flat();
  } else if (viewMode === "week") {
    const w = rows.filter((r) => r.inst.weekly);
    body = [note("Activitățile săptămânale rămân deschise toată săptămâna și se bifează o singură dată. Frecvențele se configurează (ex. LPA, audit de muncă standardizată de 2 ori pe săptămână)."),
      h("div.rlist", { style: { marginTop: "12px" } }, w.map((r) => rowEl(r, st)))];
  } else {
    const rules = rows.filter((r) => r.act.phase === "rules");
    body = [h("div.rule-esc.panel.pad", null, icon("alert"), h("div", null, h("b", null, "Regula de escaladare"), h("p.small", null, ESCALATION_RULE + " Aplicația nu trimite mesaje: consemnează doar că ai informat."))),
      h("div.rlist", { style: { marginTop: "12px" } }, rules.map((r) => rowEl(r, st)))];
  }
  return h("div.routine", null, head, summary, h("div", { style: { margin: "16px 0 4px" } }, mode), body);
}
function groupBy(rows) {
  const m = new Map();
  for (const r of rows) m.set(r.act.group, [...(m.get(r.act.group) || []), r]);
  return [...m];
}
function rowEl(r, st) {
  const res = r.entry?.result;
  const window = r.inst.rule ? "permanent" : r.inst.weekly ? r.inst.label : fmtHM(r.inst.from) + "–" + fmtHM(r.inst.to) + (r.inst.label ? " · " + r.inst.label : "");
  return h("button.ritem.st-" + r.status + ".ph-" + r.act.phase, { type: "button", onclick: () => itemSheet(r, st) },
    h("span.ri-mark", { "aria-hidden": "true" }, r.status === "done" ? icon(res === "nok" ? "alert" : "check") : null),
    h("span.ri-main", null, h("span.ri-t", null, r.act.title), h("span.ri-s", null, r.act.group + " · " + window)),
    h("span.ri-end", null, tag(ST_TONE[r.status], STATUS[r.status]), res ? tag(res === "ok" ? "ok" : res === "nok" ? "nok" : "idle", res === "ok" ? "OK" : res === "nok" ? "NOK" : "N/A") : null,
      r.entry?.taskId ? tag("plain", "acțiune") : null));
}
// Date din alte module care ajută verificarea (precompletare, nu confirmare automată).
function contextFor(link, st) {
  const c = ctx();
  if (link === "allocation" || link === "team") {
    const pres = presentIds(S.doc, c.sk).size;
    const conf = conflicts(S.doc, c.sk).length;
    return "Prezenți " + pres + (st.people.need ? " din necesar " + st.people.need : "") + ", deficit " + st.people.gap + ", " + conf + " conflicte de alocare.";
  }
  if (link === "report" || link === "production") {
    const miss = st.lines.reduce((a, l) => a + l.rows.filter((r) => r.state === "overdue").length, 0);
    return st.counts.run + " linii în funcțiune, " + st.counts.stop + " oprite, " + st.counts.unknown + " fără status; " + miss + " rapoarte orare restante.";
  }
  if (link === "firstoff") {
    const running = st.lines.filter((l) => l.status === "run");
    const done = running.filter((l) => S.doc.audits.some((a) => a.type === "firstoff" && a.lineId === l.line.id && a.extra?.sk === c.sk && a.status === "done"));
    return "First Off confirmat pe " + done.length + " din " + running.length + " linii în funcțiune.";
  }
  if (link === "incidents") return S.doc.incidents.filter((i) => !["closed", "verified", "resolved"].includes(i.status)).length + " incidente active.";
  if (link === "tasks") return S.doc.tasks.filter((t) => !["done", "verified", "cancelled"].includes(t.status)).length + " sarcini deschise.";
  if (link === "oee") return "OEE schimb: " + (st.oee?.oee != null ? fmtPct(st.oee.oee, 0) : "date insuficiente") + ".";
  return null;
}
function itemSheet(r, st) {
  const k = r.inst.key;
  let noteV = r.entry?.note || "", evidence = r.entry?.evidence || "";
  const save = (patch, msg) => { const res = commit((d) => record(d, k, { ...patch, note: noteV, evidence }, now()), msg); if (res.ok) sh.close(); };
  const link = LINKS[r.act.link];
  const ctxText = contextFor(r.act.link, st);
  const body = h("div.fields", null,
    h("div.row.wrap", null, tag(ST_TONE[r.status], STATUS[r.status]), tag("plain", FREQ[r.act.freq]), r.inst.label ? tag("plain", r.inst.label) : null),
    h("p.muted.small", null, r.act.group + (r.inst.rule || r.inst.weekly ? "" : " · fereastra " + fmtHM(r.inst.from) + "–" + fmtHM(r.inst.to))),
    ctxText ? note("Din aplicație: " + ctxText + " Confirmă verificarea pe teren.") : null,
    link ? btn(link[1], () => { sh.close(); location.hash = link[0]; }, "", "link") : null,
    r.act.result === "check"
      ? field("Rezultatul verificării", h("div.seg.status", null,
        h("button", { type: "button", class: "ok", "aria-pressed": String(r.entry?.result === "ok"), onclick: () => save({ result: "ok" }, "OK înregistrat") }, "DA / OK"),
        h("button", { type: "button", class: "nok", "aria-pressed": String(r.entry?.result === "nok"), onclick: () => { save({ result: "nok" }, "NOK înregistrat"); nokFlow(r); } }, "NU / NOK"),
        r.act.naAllowed ? h("button", { type: "button", "aria-pressed": String(r.entry?.state === "na"), onclick: () => save({ state: "na", result: "na" }, "Marcat neaplicabil") }, "N/A") : null))
      : btn(r.status === "done" ? "Finalizat" : "Marchează finalizat", () => save({ result: "ok" }, "Finalizat"), "primary big block", "check"),
    field("Observație", area(noteV, (v) => (noteV = v), { rows: 2, placeholder: "Ce ai constatat" })),
    field("Dovadă (opțional)", area(evidence, (v) => (evidence = v), { rows: 1, placeholder: "Ex. formular semnat, număr fișă" })),
    r.entry?.taskId ? h("a.crumb", { href: "#/tasks?open=" + r.entry.taskId }, icon("link"), "Acțiune asociată") : btn("Creează acțiune", () => { sh.close(); nokFlow(r); }, "ghost", "plus"),
    h("div.row.wrap", null,
      btn("În lucru", () => save({ state: "progress" }, "În lucru"), "", "clock"),
      btn("Nu pot îndeplini", () => escalate(r, () => sh.close()), "danger", "alert"),
      r.entry ? btn("Resetează", () => { commit((d) => record(d, k, { reset: true }), "Resetat"); sh.close(); }, "ghost") : null),
    r.entry?.history?.length ? h("details", null, h("summary.small.muted", null, "Istoric"), h("ul.small", null, r.entry.history.map((x) => h("li", null, fmtHM(new Date(x.at)) + " · " + (x.result || x.state || "—"))))) : null);
  const sh = sheet({ title: r.act.title, body });
}
function nokFlow(r) {
  taskFromSheet({ title: r.act.title, heading: "NOK → problemă → acțiune", source: { type: "routine", label: r.act.group },
    onCreated: (t) => commit((d) => record(d, r.inst.key, { taskId: t.id }, now())) });
}
function escalate(r, done) {
  let why = "";
  const sh = sheet({ title: "Nu pot îndeplini activitatea", body: h("div.fields", null, note(ESCALATION_RULE, "warn"),
    field("Motiv", area(why, (v) => (why = v), { rows: 2 })),
    h("p.small.muted", null, "Aplicația consemnează că ai informat superiorul. Nu trimite niciun mesaj.")),
  footer: [btn("Renunță", () => sh.close()), btn("Consemnează: superior informat", () => {
    if (!why.trim()) { toast("Scrie motivul.", { err: true }); return; }
    commit((d) => record(d, r.inst.key, { state: "missed", escalated: true, escalatedAt: now().toISOString(), note: why }, now()), "Consemnat ca neîndeplinit, cu escaladare");
    sh.close(); done();
  }, "primary")] });
}
function configSheet() {
  const tpl = structuredClone(templateOf(S.doc));
  const body = h("div", null, note("Activează doar ce se aplică procedurii tale. Frecvențele sunt configurabile; nu interpretăm procedura internă."),
    PHASES.map((p) => [h("h3.cfg-h", null, p.title), ...tpl.filter((a) => a.phase === p.id).map((a) => h("div.cfg-row", null,
      h("label.check", null, h("input", { type: "checkbox", checked: a.active !== false, onchange: (e) => (a.active = e.target.checked) }), h("span.small", null, a.title)),
      select(Object.entries(FREQ), a.freq, (v) => (a.freq = v), { "aria-label": "Frecvență" })))]));
  const sh = sheet({ title: "Configurează rutina", body, footer: [
    btn("Implicit", () => { commit((d) => (d.routine.template = defaultTemplate()), "Rutina implicită restaurată"); sh.close(); }, "ghost"),
    btn("Salvează", () => { commit((d) => (d.routine.template = tpl), "Rutina actualizată"); sh.close(); }, "primary")] });
}
