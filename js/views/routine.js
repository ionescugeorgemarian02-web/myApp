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
let viewMode = "sheet";
const open = new Set();        // rânduri bifate deschise manual
const folded = new Map();      // etape pliate / desfăcute de utilizator
const FREQ_SHORT = { shift: "Zilnic", "2h": "La fiecare 2 ore", afterBreak: "După pauză", weekly: "Săptămânal", twiceWeekly: "2× pe săptămână", rule: "Zilnic" };
const isDone = (r) => r.status === "done" || r.status === "missed" || r.status === "na";
export function routineView(_p, q, st) {
  const c = ctx(), t = now();
  const rows = routineFor(S.doc, c.workDay, c.shift, t);
  const prog = progress(rows);
  const focus = q.get("focus");
  if (focus) { open.add(focus); viewMode = "sheet"; history.replaceState(null, "", "#/routine"); setTimeout(() => document.getElementById("r-" + focus)?.scrollIntoView({ block: "center" }), 50); }
  const head = h("div.head", null,
    h("div", null, h("h1", null, "Rutina EPT"), h("p", null, "EPT Supervisor Routine · " + c.shift.name + " · " + c.shift.start + "–" + c.shift.end)),
    h("div.actions", null, btn("Configurează", () => configSheet(), "ghost", "settings")));
  const summary = h("div.rsum.panel", null,
    h("div.rs-big", null, h("span.num", null, prog.done + "/" + prog.total), h("small", null, "bifate · " + fmtPct(prog.ratio, 0))),
    h("div.rs-phases", null, PHASES.map((p) => {
      const pr = progress(rows.filter((r) => r.act.phase === p.id));
      return h("button.rsp.ph-" + p.id, { type: "button", onclick: () => { viewMode = "sheet"; folded.set(p.id, false); S.render(); setTimeout(() => document.getElementById("ph-" + p.id)?.scrollIntoView({ block: "start" }), 50); } },
        h("span", null, p.short), h("span.pbar", null, h("i", { style: { width: (pr.ratio || 0) * 100 + "%" } })), h("span.num.small", null, pr.done + "/" + pr.total));
    })),
    h("div.rs-flags", null, prog.overdue ? tag("stop", prog.overdue + " depășite") : null, prog.nok ? tag("nok", prog.nok + " NU") : null, !prog.overdue && !prog.nok ? tag("run", "La zi") : null));
  const mode = seg([["sheet", "Fișa"], ["now", "Acum"], ["week", "Săptămâna"]], viewMode, (v) => { viewMode = v; S.render(); });
  let body;
  if (viewMode === "sheet") {
    body = PHASES.map((p) => {
      const rs = rows.filter((r) => r.act.phase === p.id && !r.inst.weekly);
      const pr = progress(rs);
      const complete = rs.length > 0 && rs.every(isDone);
      const isFolded = folded.has(p.id) ? folded.get(p.id) : complete;
      return h("section.eband.ph-" + p.id, { id: "ph-" + p.id },
        h("button.eband-h", { type: "button", "aria-expanded": String(!isFolded), onclick: () => { folded.set(p.id, !isFolded); S.render(); } },
          h("span.eb-t", null, p.title), h("span.eb-p.num", null, pr.done + "/" + pr.total), icon(isFolded ? "down" : "close")),
        isFolded ? null : h("div.eband-b", null, rs.map((r) => rowEl(r, st))),
        p.id === "rules" && !isFolded ? h("p.esc-foot", null, "* " + ESCALATION_RULE) : null);
    });
  } else if (viewMode === "now") {
    const list = nowList(rows, 12);
    body = [list.length ? h("div.eband.plain", null, h("div.eband-b", null, list.map((r) => rowEl(r, st)))) : note("Nicio activitate deschisă acum."), h("p.esc-foot", null, "* " + ESCALATION_RULE)];
  } else {
    const w = rows.filter((r) => r.inst.weekly);
    body = [note("Activitățile săptămânale se bifează o dată pe săptămână."), h("div.eband.plain", { style: { marginTop: "12px" } }, h("div.eband-b", null, w.map((r) => rowEl(r, st))))];
  }
  return h("div.routine", null, head, summary, h("div", { style: { margin: "16px 0 12px" } }, mode), body);
}
// Un rând al fișei: deschis (Activitate, Descriere, Frecvență, DA/NU, Observații) sau, după bifare, o singură linie.
function rowEl(r, st) {
  const k = r.inst.key, res = r.entry?.result;
  const set = (patch, msg) => commit((d) => record(d, k, patch, now()), msg, { undo: !!msg });
  const freq = FREQ_SHORT[r.act.freq] + (r.inst.label && !r.inst.weekly ? " · " + r.inst.label : "");
  if (isDone(r) && !open.has(k)) {
    const yes = res === "ok";
    return h("div.erow.small-row", { id: "r-" + k },
      h("button.er-compact", { type: "button", onclick: () => { open.add(k); S.render(); }, "aria-label": r.act.group + ": " + r.act.title + ", " + (yes ? "DA" : res === "nok" ? "NU" : "N/A") + ". Atinge pentru detalii." },
        h("span.er-mark." + (yes ? "yes" : res === "nok" ? "no" : "na"), null, icon(yes ? "check" : res === "nok" ? "close" : "right")),
        h("span.er-ct", null, h("b", null, r.act.group), h("span.clip", null, r.act.title)),
        h("span.er-res." + (yes ? "yes" : "no"), null, yes ? "DA" : res === "nok" ? "NU" : r.status === "missed" ? "Escaladat" : "N/A"),
        r.entry?.at ? h("span.er-time.num", null, fmtHM(new Date(r.entry.at))) : null),
      res === "nok" && !r.entry?.taskId ? h("button.er-act", { type: "button", onclick: () => nokFlow(r) }, icon("plus"), "Acțiune") : null);
  }
  let noteV = r.entry?.note || "";
  return h("div.erow.st-" + r.status, { id: "r-" + k },
    h("div.er-top", null, h("b.er-act-name", null, r.act.group), h("span.er-freq", null, freq),
      r.status === "overdue" ? tag("stop", "Depășit") : r.status === "upcoming" && !r.inst.weekly ? tag("idle", "de la " + fmtHM(r.inst.from)) : null,
      isDone(r) ? h("button.ibtn.er-fold", { type: "button", "aria-label": "Strânge", onclick: () => { open.delete(k); S.render(); } }, icon("down")) : null),
    h("p.er-desc", null, r.act.title),
    r.act.desc ? h("p.er-hint", null, r.act.desc) : null,
    h("div.er-yn", null,
      h("button.yn.yes", { type: "button", "aria-pressed": String(res === "ok"), onclick: () => { open.delete(k); set({ result: "ok", note: noteV }, null); } }, icon("check"), "DA"),
      h("button.yn.no", { type: "button", "aria-pressed": String(res === "nok"), onclick: () => { open.delete(k); set({ result: "nok", note: noteV }, null); } }, icon("close"), "NU"),
      h("button.yn.more", { type: "button", "aria-label": "Mai multe opțiuni", onclick: () => itemSheet(r, st) }, "…")),
    h("input.input.er-obs", { value: noteV, placeholder: "Observații", "aria-label": "Observații: " + r.act.title, oninput: (e) => (noteV = e.target.value),
      onchange: () => { if (r.entry || noteV) commit((d) => record(d, k, { note: noteV }, now()), null, { undo: false }); } }));
}
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
