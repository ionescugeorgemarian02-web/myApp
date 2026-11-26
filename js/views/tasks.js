// ACTION CENTER — cine, ce, până când, în ce stadiu, cine verifică. Listă și Kanban.
import { h, put, btn, icon, tag, kpi, sect, seg, chips, empty, note, sheet, field, input, area, select, picker, toast, promptSheet } from "../ui/kit.js";
import { S, ctx, commit, now, byId, lineName, personName } from "../state.js";
import { TASK_STATUS, PRIORITY, SOURCES, nextStatuses, setStatus, isOpen, isOverdue, sortTasks, spawnNext } from "../domain/tasks.js";
import { taskFromSheet, peopleItems, linesItems, pageHead } from "./common.js";
import { toCsv, download } from "../core/store.js";

let mode = "list", filter = "open", owner = null;
const TONE = { open: "warn", progress: "change", blocked: "stop", done: "run", verified: "run", cancelled: "idle" };
const PTONE = { critical: "stop", high: "warn", normal: "plain", low: "idle" };
export function tasksView(_p, q) {
  const doc = S.doc, today = ctx().workDay;
  if (q.get("f")) { filter = q.get("f"); history.replaceState(null, "", "#/tasks"); }
  const openId = q.get("open");
  if (openId) { history.replaceState(null, "", "#/tasks"); setTimeout(() => editTask(openId), 0); }
  const F = { open: isOpen, overdue: (t) => isOverdue(t, today), today: (t) => isOpen(t) && t.due === today, verify: (t) => t.status === "done", all: () => true };
  const list = sortTasks(doc.tasks.filter((t) => (F[filter] || F.open)(t) && (!owner || t.ownerId === owner)), today);
  return h("div", null,
    pageHead("Sarcini", "Aplicația este locală: alocarea nu trimite notificări", [btn("Export CSV", exportCsv, "ghost", "download"), btn("Sarcină nouă", () => taskFromSheet({ heading: "Sarcină nouă" }), "primary", "plus")]),
    h("div.kpis.c4", null, kpi("Deschise", String(doc.tasks.filter(isOpen).length)), kpi("Depășite", String(doc.tasks.filter((t) => isOverdue(t, today)).length), "", doc.tasks.some((t) => isOverdue(t, today)) ? "stop" : ""),
      kpi("Azi", String(doc.tasks.filter((t) => isOpen(t) && t.due === today).length)), kpi("De verificat", String(doc.tasks.filter((t) => t.status === "done").length), "finalizate, neverificate")),
    h("div.filters", { style: { marginTop: "16px" } }, chips([["open", "Deschise"], ["overdue", "Depășite"], ["today", "Azi"], ["verify", "De verificat"], ["all", "Toate"]], filter, (v) => { filter = v; S.render(); }),
      h("div.row", null, picker("Responsabil", peopleItems(), owner, (v) => { owner = v; S.render(); }, { allowNone: true, noneLabel: "Oricine" }), seg([["list", "Listă"], ["kanban", "Kanban"]], mode, (v) => { mode = v; S.render(); }))),
    !list.length ? empty("Nicio sarcină aici", "Sarcinile vin din rutină, producție, incidente, audituri, 8D și idei Kaizen.", null)
      : mode === "list" ? h("div.list", { style: { marginTop: "12px" } }, list.map((t) => taskRow(t, today)))
        : h("div.kanban.scrollx", { style: { marginTop: "12px" } }, ["open", "progress", "blocked", "done", "verified"].map((s) => h("div.kcol", null,
          h("div.kh", null, TASK_STATUS[s], h("span.num", null, String(list.filter((t) => t.status === s).length))),
          list.filter((t) => t.status === s).map((t) => h("button.kcard", { type: "button", onclick: () => editTask(t.id), class: isOverdue(t, today) ? "late" : "" },
            h("b", null, t.title), h("small", null, (personName(t.ownerId) !== "—" ? personName(t.ownerId) : t.dept || "fără responsabil") + (t.due ? " · " + t.due : "")), tag(PTONE[t.priority], PRIORITY[t.priority])))))));
}
function taskRow(t, today) {
  return h("button.item.task", { type: "button", onclick: () => editTask(t.id), class: isOverdue(t, today) ? "late" : "" },
    h("span.pmark.p-" + t.priority, { "aria-hidden": "true" }),
    h("div.main", null, h("div.t", null, t.title),
      h("div.s", null, [personName(t.ownerId) !== "—" ? personName(t.ownerId) : t.dept || "fără responsabil", t.due ? (isOverdue(t, today) ? "depășit " : "până ") + t.due : "fără termen", t.lineId ? lineName(t.lineId) : "", SOURCES[t.source?.type] || ""].filter(Boolean).join(" · "))),
    h("div.end", null, tag(TONE[t.status], TASK_STATUS[t.status])), icon("right", "chev"));
}
export function editTask(id) {
  const t = S.doc.tasks.find((x) => x.id === id);
  if (!t) return toast("Sarcina nu mai există.", { err: true });
  const f = structuredClone(t);
  const body = h("div.fields");
  const draw = () => put(body, 
    h("div.row.wrap", null, tag(TONE[t.status], TASK_STATUS[t.status]), tag(PTONE[t.priority], PRIORITY[t.priority]), tag("plain", "Sursa: " + (SOURCES[t.source?.type] || "—") + (t.source?.label ? " · " + t.source.label : ""))),
    field("Ce trebuie făcut", input(f.title, (v) => (f.title = v))),
    field("Descriere", area(f.desc, (v) => (f.desc = v), { rows: 2 })),
    picker("Cine trebuie să facă", peopleItems(), f.ownerId, (v) => { f.ownerId = v; draw(); }, { allowNone: true, noneLabel: "Doar departament" }),
    h("div.fields.c2", null, field("Departament", select([["", "—"], ...S.doc.settings.departments.map((d) => [d, d])], f.dept, (v) => (f.dept = v))), field("Până când", input(f.due, (v) => (f.due = v), { type: "date" }))),
    field("Prioritate", seg(Object.entries(PRIORITY), f.priority, (v) => { f.priority = v; draw(); })),
    picker("Cine verifică", peopleItems(), f.verifierId, (v) => { f.verifierId = v; draw(); }, { allowNone: true, noneLabel: "Eu (supervizor)" }),
    picker("Linie", linesItems(), f.lineId, (v) => { f.lineId = v; draw(); }, { allowNone: true, noneLabel: "Fără linie" }),
    field("Recurență", select([["", "Fără"], ["day", "Zilnic"], ["week", "Săptămânal"]], f.recurrence || "", (v) => (f.recurrence = v || null)), "La finalizare se creează instanța următoare."),
    field("Observații", area(f.notes, (v) => (f.notes = v), { rows: 2 })),
    field("Dovadă / verificare", area(f.evidence, (v) => (f.evidence = v), { rows: 2, placeholder: "Ce s-a constatat la verificare" })),
    h("div", null, h("span.small.muted", null, "Schimbă stadiul:"), h("div.actions", { style: { marginTop: "6px" } }, nextStatuses(t.status).map((s) => btn(TASK_STATUS[s], () => move(s), s === "verified" ? "primary" : s === "cancelled" ? "danger" : "")))),
    h("details", null, h("summary.small.muted", null, "Istoric"), h("ul.small", null, t.history.map((x) => h("li", null, new Date(x.at).toLocaleString("ro-RO") + " · " + TASK_STATUS[x.status] + (x.reason ? " · " + x.reason : ""))))));
  const move = async (s) => {
    let reason;
    if (s === "cancelled") { reason = await promptSheet("Motivul anulării", "De ce se anulează?"); if (!reason) return; }
    const r = commit((d) => {
      const x = d.tasks.find((y) => y.id === id);
      Object.assign(x, { ...f, status: x.status, history: x.history });
      setStatus(x, s, now(), { evidence: f.evidence, reason });
      if (s === "done") spawnNext(d.tasks, x, now());
    }, TASK_STATUS[s]);
    if (r.ok) sh.close();
  };
  draw();
  const sh = sheet({ title: "Sarcină", body, footer: [btn("Salvează", () => {
    if (!f.title.trim()) return toast("Titlul nu poate fi gol.", { err: true });
    commit((d) => { const x = d.tasks.find((y) => y.id === id); Object.assign(x, { ...f, status: x.status, history: x.history }); }, "Sarcină salvată");
    sh.close();
  }, "primary")] });
}
function exportCsv() {
  const rows = [["Titlu", "Responsabil", "Departament", "Termen", "Prioritate", "Stare", "Linie", "Sursa", "Dovadă"],
    ...S.doc.tasks.map((t) => [t.title, personName(t.ownerId), t.dept, t.due, PRIORITY[t.priority], TASK_STATUS[t.status], t.lineId ? lineName(t.lineId) : "", SOURCES[t.source?.type] || "", t.evidence])];
  download("sarcini-" + ctx().workDay + ".csv", toCsv(rows), "text/csv");
}
