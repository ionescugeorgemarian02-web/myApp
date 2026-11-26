// ECHIPĂ — pontaj, alocare, matrice de calificare 1–4, training. Sugestiile nu decid: supervizorul alege.
import { h, put, btn, icon, tag, kpi, sect, seg, chips, empty, note, sheet, field, input, area, select, picker, toast, item, confirmSheet } from "../ui/kit.js";
import { S, ctx, commit, now, byId, lineName, personName } from "../state.js";
import { uid } from "../core/doc.js";
import { LEVELS, levelOf, setLevel, qualKey, presentIds, assign, conflicts, coverage, suggestions, riskPosts } from "../domain/workforce.js";
import { linesItems, peopleItems, machineItems, pageHead, backLink } from "./common.js";

let tab = "attendance", cat = "all", matrixLine = null, selecting = false, selected = new Set();
export function teamView(parts, _q, st) {
  if (parts[0]) { tab = parts[0]; }
  const doc = S.doc;
  if (!doc.master.people.length) return h("div", null, pageHead("Echipă"), empty("Nicio persoană în catalog", "Adaugă oamenii echipei (folosește identificatori neutri dacă politica o cere).", btn("Deschide catalogul", () => (location.hash = "#/catalog?tab=people"), "primary")));
  const tabs = seg([["attendance", "Pontaj"], ["allocation", "Alocare"], ["matrix", "Matrice"], ["training", "Training"]], tab, (v) => { location.hash = "#/team/" + v; });
  const views = { attendance, allocation, matrix, training };
  return h("div", null, pageHead("Echipă", ctx().shift.name + " · " + st.people.present + " prezenți · deficit " + st.people.gap), tabs, h("div", { style: { marginTop: "16px" } }, (views[tab] || attendance)(st)));
}
function attendance(st) {
  const doc = S.doc, c = ctx();
  const att = doc.attendance[c.sk] || {};
  const statuses = doc.settings.attendance;
  const cats = ["all", ...new Set(doc.master.people.map((p) => p.category).filter(Boolean))];
  const people = doc.master.people.filter((p) => p.active !== false && (cat === "all" || p.category === cat));
  const unmarked = people.filter((p) => !att[p.id]);
  const mark = (ids, s, msg) => commit((d) => { d.attendance[c.sk] ||= {}; for (const id of ids) { if (s) d.attendance[c.sk][id] = s; else delete d.attendance[c.sk][id]; } }, msg);
  const count = (sid) => Object.values(att).filter((x) => x === sid).length;
  return h("div", null,
    h("div.kpis.c4", null, kpi("Prezenți", String(st.people.present), "din " + doc.master.people.filter((p) => p.active !== false).length + " în echipă"),
      kpi("Absenți / concediu", String(count("absent") + count("leave")), count("late") + " întârzieri", ""), kpi("Nemarcați", String(doc.master.people.filter((p) => p.active !== false && !att[p.id]).length), "", unmarked.length ? "warn" : ""),
      kpi("Necesar linii", String(st.people.need), "deficit " + st.people.gap, st.people.gap ? "stop" : "")),
    h("div", { style: { margin: "16px 0 8px" } }, chips(cats.map((x) => [x, x === "all" ? "Toți" : x]), cat, (v) => { cat = v; S.render(); }, "Categorie")),
    h("div.row.wrap", { style: { marginBottom: "8px" } },
      unmarked.length ? btn("Toți nemarcații sunt prezenți (" + unmarked.length + ")", () => mark(unmarked.map((p) => p.id), "present", unmarked.length + " marcați prezenți"), "primary", "check") : null,
      btn(selecting ? "Gata selecția" : "Selectează", () => { selecting = !selecting; selected.clear(); S.render(); }, "ghost", "list"),
      selecting && selected.size ? h("div.row.wrap", null, statuses.map((s) => btn(s.label + " (" + selected.size + ")", () => { mark([...selected], s.id, selected.size + " marcați: " + s.label); selected.clear(); }, "", null))) : null),
    note("Codurile de pontaj sunt configurabile în Setări. Aplicația nu este un sistem de salarizare."),
    h("div.list", { style: { marginTop: "8px" } }, people.map((p) => {
      const cur = att[p.id];
      const meta = statuses.find((s) => s.id === cur);
      return h("div.prow", null,
        selecting ? h("input.pchk", { type: "checkbox", checked: selected.has(p.id), "aria-label": "Selectează " + p.name, onchange: (e) => { e.target.checked ? selected.add(p.id) : selected.delete(p.id); S.render(); } }) : null,
        h("a.pmain", { href: "#/person/" + p.id }, h("b", null, p.name), h("small", null, p.category || "")),
        h("div.pbtns", null,
          h("button.pb", { type: "button", "aria-pressed": String(cur === "present"), class: "ok", onclick: () => mark([p.id], cur === "present" ? null : "present", null) }, "P"),
          h("button.pb", { type: "button", "aria-pressed": String(cur === "absent"), class: "nok", onclick: () => mark([p.id], cur === "absent" ? null : "absent", null) }, "A"),
          h("button.pb.more", { type: "button", "aria-label": "Alt status pentru " + p.name, onclick: () => statusSheet(p, cur, (s) => mark([p.id], s, p.name + ": " + (statuses.find((x) => x.id === s)?.label || "nemarcat"))) }, meta && !["present", "absent"].includes(cur) ? meta.label : "…")));
    })));
}
function statusSheet(p, cur, onPick) {
  const sh = sheet({ title: p.name, body: h("div.list", null, [...S.doc.settings.attendance.map((s) => item({ title: s.label, sub: s.present ? "contează ca prezent" : "nu contează ca prezent", end: cur === s.id ? icon("check") : null, chev: false, onClick: () => { onPick(s.id); sh.close(); } })),
    item({ title: "Nemarcat", chev: false, onClick: () => { onPick(null); sh.close(); } })]) });
}
function allocation(st) {
  const doc = S.doc, c = ctx();
  const conf = conflicts(doc, c.sk);
  const present = presentIds(doc, c.sk);
  const list = doc.assignments[c.sk] || [];
  const lines = st.planned.map((L) => L.line);
  const cov = coverage(doc, c.sk, lines.map((l) => l.id));
  const free = doc.master.people.filter((p) => present.has(p.id) && !list.some((a) => a.personId === p.id));
  const tls = list.filter((a) => a.role === "tl");
  return h("div", null,
    !doc.attendance[c.sk] ? note("Pontajul nu este marcat: alocarea nu poate verifica prezența.", "warn") : null,
    conf.length ? [sect("Conflicte (" + conf.length + ")"), h("div.stack", null, conf.slice(0, 5).map(confNote)), conf.length > 5 ? h("details", null, h("summary.small.muted", null, "Încă " + (conf.length - 5)), h("div.stack", null, conf.slice(5).map(confNote))) : null] : note("Fără conflicte de alocare.", "run"),
    sect("Disponibili pentru redistribuire", h("span.aside", null, free.length + " prezenți nealocați")),
    free.length ? h("div.chipline", null, free.map((p) => h("a.pchip", { href: "#/person/" + p.id }, p.name))) : h("p.small.muted", null, "Toți prezenții sunt alocați."),
    sect("Linii planificate"),
    !lines.length ? note("Niciun plan pentru acest schimb. Planificarea definește necesarul pe linie.", "warn") : null,
    h("div.alloc", null, lines.map((l) => {
      const cv = cov.find((x) => x.lineId === l.id);
      const mine = list.filter((a) => a.lineId === l.id);
      const gapSug = cv.gap > 0 ? suggestions(doc, c.sk, l.id).slice(0, 3) : [];
      return h("div.panel.pad.alloccard", null,
        h("div.row.between", null, h("b.num.big2", null, l.name), h("span", null, tag(cv.gap ? "stop" : "run", cv.present + "/" + (cv.need || "?") + " operatori"))),
        h("div.list.compact", null, mine.map((a) => {
          const m = l.machines.find((x) => x.id === a.machineId);
          const lv = levelOf(doc, a.personId, l.id, a.machineId);
          const need = m?.requiredLevel || 3;
          return h("div.arow", null, h("span.lvl.l" + (lv?.level || 0), { title: lv ? LEVELS[lv.level].label : "Neevaluat" }, lv ? String(lv.level) : "—"),
            h("span.amain", null, h("b", null, personName(a.personId)), h("small", null, (a.role === "tl" ? "TL pe linie" : m?.name || "linie") + (present.has(a.personId) ? "" : " · nu este prezent") + (lv && lv.level < need ? " · sub nivelul " + need : "") + (lv?.scope === "linie" ? " · evaluare pe linie" : ""))),
            h("button.ibtn", { type: "button", "aria-label": "Elimină alocarea", onclick: () => commit((d) => (d.assignments[c.sk] = d.assignments[c.sk].filter((x) => x.id !== a.id)), "Alocare eliminată") }, icon("close")));
        })),
        gapSug.length ? h("div.sug", null, h("small.muted", null, "Propuneri (decizia îți aparține):"), gapSug.map((s) => btn(s.person.name + " · nivel " + s.level.level, () => commit((d) => assign(d, c.sk, { personId: s.person.id, lineId: l.id }), s.person.name + " alocat pe " + l.name), "ghost", "plus"))) : null,
        btn("Alocă", () => allocSheet(l), "", "plus"));
    })),
    tls.length ? [sect("Team Leaderi pe linie"), h("div.stack", null, tls.map((a) => {
      const mins = a.from && a.to ? (Number(a.to.slice(0, 2)) * 60 + Number(a.to.slice(3)) - Number(a.from.slice(0, 2)) * 60 - Number(a.from.slice(3)) + 1440) % 1440 : null;
      return note(personName(a.personId) + " pe " + lineName(a.lineId) + (mins !== null ? " · " + mins + " min" : "") + (mins !== null && mins > doc.settings.thresholds.tlLineMaxMin ? " · peste regula locală de " + doc.settings.thresholds.tlLineMaxMin + " min (configurabilă)" : ""), mins > doc.settings.thresholds.tlLineMaxMin ? "warn" : "");
    }))] : null);
}
const confNote = (x) => note(x.text, x.type === "double" || x.type === "nosupport" || x.type === "absent" ? "stop" : "warn");
function allocSheet(l) {
  const c = ctx();
  const f = { personId: null, machineId: null, role: "operator", from: "", to: "" };
  const present = presentIds(S.doc, c.sk);
  const busy = new Set((S.doc.assignments[c.sk] || []).map((a) => a.personId));
  const body = h("div.fields");
  const draw = () => {
    const items = S.doc.master.people.filter((p) => p.active !== false).map((p) => {
      const lv = levelOf(S.doc, p.id, l.id, f.machineId);
      return { id: p.id, label: p.name, sub: [present.has(p.id) ? "prezent" : "neprezent", busy.has(p.id) ? "deja alocat" : "liber", lv ? "nivel " + lv.level : "neevaluat"].join(" · "), score: (present.has(p.id) ? 10 : 0) + (busy.has(p.id) ? 0 : 5) + (lv?.level || 0) };
    }).sort((a, b) => b.score - a.score);
    put(body, seg([["operator", "Operator"], ["tl", "Team Leader pe linie"]], f.role, (v) => { f.role = v; draw(); }),
      f.role === "operator" ? picker("Post / mașină", machineItems(l.id), f.machineId, (v) => { f.machineId = v; draw(); }, { allowNone: true, noneLabel: "Linia (fără post)" }) : null,
      picker("Persoana", items, f.personId, (v) => { f.personId = v; draw(); }),
      h("div.fields.c2", null, field("De la", input(f.from, (v) => (f.from = v), { type: "time" }), "opțional"), field("Până la", input(f.to, (v) => (f.to = v), { type: "time" }), "opțional")));
  };
  draw();
  const sh = sheet({ title: "Alocare · " + l.name, body, footer: [btn("Renunță", () => sh.close()), btn("Alocă", () => {
    const r = commit((d) => assign(d, c.sk, { ...f, lineId: l.id }), personName(f.personId) + " alocat");
    if (r.ok) sh.close();
  }, "primary")] });
}
function matrix() {
  const doc = S.doc;
  const lines = doc.master.lines.filter((l) => l.active !== false);
  if (!lines.length) return empty("Fără linii", "Matricea se construiește pe linii și operații.", null);
  matrixLine ||= lines[0].id;
  const L = byId(doc.master.lines, matrixLine) || lines[0];
  const posts = L.machines.length ? L.machines : [{ id: null, name: "Linie", requiredLevel: 3 }];
  const people = doc.master.people.filter((p) => p.active !== false && p.role !== "tl");
  const risk = riskPosts(doc).filter((r) => r.line.id === L.id);
  const cell = (p, m) => {
    const lv = levelOf(doc, p.id, L.id, m.id);
    return h("button.mc.l" + (lv?.level || 0) + (lv?.migrated ? ".mig" : ""), { type: "button", onclick: () => evalSheet(p, L, m), "aria-label": p.name + ", " + m.name + ": " + (lv ? "nivel " + lv.level : "neevaluat") },
      lv ? String(lv.level) : "·");
  };
  const covRow = posts.map((m) => people.filter((p) => (levelOf(doc, p.id, L.id, m.id)?.level || 0) >= (m.requiredLevel || 3)).length);
  return h("div", null,
    h("div.filters", null, picker("Linie", linesItems(), L.id, (v) => { matrixLine = v; S.render(); })),
    h("div.levels", null, [1, 2, 3, 4].map((n) => h("span", null, h("i.mc.l" + n, null, String(n)), LEVELS[n].label)), h("span", null, h("i.mc.l0", null, "·"), "Neevaluat")),
    risk.length ? note("Posturi cu risc (sub 2 oameni de nivel ≥ 3): " + risk.map((r) => r.machine.name + " (" + r.qualified + ")").join(", ") + ".", "warn") : null,
    doc.master.people.some((p) => Object.keys(doc.quals).some((k) => k.startsWith(p.id) && doc.quals[k].migrated)) ? note("Unele niveluri sunt migrate din v4.4 (marcate cu contur punctat). Reconfirmă-le la următoarea evaluare.", "") : null,
    h("div.matrix.scrollx", null, h("table.mt", null,
      h("thead", null, h("tr", null, h("th", null, "Operator"), posts.map((m) => h("th", null, h("span", null, m.name), h("small", null, "nec. " + (m.requiredLevel || 3)))))),
      h("tbody", null, people.map((p) => h("tr", null, h("th", null, h("a", { href: "#/person/" + p.id }, p.name)), posts.map((m) => h("td", null, cell(p, m)))))),
      h("tfoot", null, h("tr", null, h("th", null, "Calificați ≥ necesar"), covRow.map((n) => h("td.num", { class: n < 2 ? "neg" : "" }, String(n))))))));
}
function evalSheet(p, L, m) {
  const doc = S.doc;
  const cur = levelOf(doc, p.id, L.id, m.id);
  const exact = doc.quals[qualKey(p.id, L.id, m.id)];
  const f = { level: exact?.level || null, evaluator: "", date: new Date().toISOString().slice(0, 10), note: "", next: exact?.next || "" };
  const body = h("div.fields");
  const draw = () => put(body, 
    h("p.small.muted", null, L.name + " · " + m.name + " · necesar nivel " + (m.requiredLevel || 3)),
    cur ? note("Nivel actual " + cur.level + " (" + (cur.scope === "linie" ? "evaluare pe linie" : "pe post") + ", " + cur.date + (cur.evaluator ? ", " + cur.evaluator : "") + ")" + (cur.migrated ? " · migrat din v4.4, de reconfirmat" : "")) : note("Neevaluat pe acest post."),
    h("div.levelpick", null, [1, 2, 3, 4].map((n) => h("button.lp.l" + n, { type: "button", "aria-pressed": String(f.level === n), onclick: () => { f.level = n; draw(); } }, h("b.num", null, String(n)), h("small", null, LEVELS[n].label)))),
    h("div.fields.c2", null, field("Evaluator", input(f.evaluator, (v) => (f.evaluator = v), { placeholder: "Rol sau nume" })), field("Data evaluării", input(f.date, (v) => (f.date = v), { type: "date" }))),
    field("Următoarea evaluare", input(f.next, (v) => (f.next = v), { type: "date" }), "opțional"),
    field("Observații", area(f.note, (v) => (f.note = v), { rows: 2 })),
    exact?.history?.length ? h("details", null, h("summary.small", null, "Istoric (" + exact.history.length + ")"), h("ul.small", null, exact.history.map((x) => h("li", null, x.date + " · nivel " + x.level + (x.evaluator ? " · " + x.evaluator : ""))))) : null);
  draw();
  const sh = sheet({ title: p.name, body, footer: [
    exact ? btn("Șterge evaluarea", async () => { if (await confirmSheet("Ștergi evaluarea?", "Postul devine „neevaluat” pentru " + p.name + ".", "Șterge", true)) { commit((d) => delete d.quals[qualKey(p.id, L.id, m.id)], "Evaluare ștearsă"); sh.close(); } }, "ghost") : null,
    btn("Salvează nivelul", () => {
      if (!f.level) return toast("Alege nivelul.", { err: true });
      const r = commit((d) => { const e = setLevel(d, p.id, L.id, m.id, f.level, f, now()); e.next = f.next; }, p.name + ": nivel " + f.level);
      if (r.ok) sh.close();
    }, "primary")] });
}
function training() {
  const doc = S.doc;
  const list = doc.trainings;
  return h("div", null,
    h("div.row.between", null, h("p.small.muted", null, "Plan de dezvoltare: cine învață ce post, cu ce instructor (nivel 4), până când."), btn("Training nou", () => trainingSheet(), "primary", "plus")),
    list.length ? h("div.list", { style: { marginTop: "12px" } }, list.map((t) => item({ title: personName(t.personId) + " → " + lineName(t.lineId) + (t.machineId ? " · " + (byId(doc.master.lines, t.lineId)?.machines.find((m) => m.id === t.machineId)?.name || "") : ""),
      sub: "țintă nivel " + t.target + " · instructor " + personName(t.instructorId) + (t.due ? " · până la " + t.due : ""), end: tag(t.status === "done" ? "run" : t.due && t.due < ctx().workDay ? "stop" : "warn", t.status === "done" ? "Finalizat" : "În curs"),
      onClick: () => trainingSheet(t) }))) : empty("Niciun training planificat", "Folosește posturile cu risc din matrice pentru a decide ce instruiești.", null));
}
function trainingSheet(existing) {
  const f = existing ? { ...existing } : { id: uid(), personId: null, lineId: null, machineId: null, instructorId: null, target: 3, due: "", status: "open", note: "" };
  const body = h("div.fields");
  const draw = () => {
    const instructors = S.doc.master.people.filter((p) => f.lineId && (levelOf(S.doc, p.id, f.lineId, f.machineId)?.level || 0) === 4).map((p) => ({ id: p.id, label: p.name, sub: "nivel 4" }));
    put(body, picker("Operator", peopleItems((p) => p.role !== "tl"), f.personId, (v) => { f.personId = v; draw(); }),
      picker("Linie", linesItems(), f.lineId, (v) => { f.lineId = v; f.machineId = null; draw(); }),
      f.lineId ? picker("Post", machineItems(f.lineId), f.machineId, (v) => { f.machineId = v; draw(); }, { allowNone: true, noneLabel: "Toată linia" }) : null,
      picker("Instructor (nivel 4 pe post)", instructors.length ? instructors : peopleItems(), f.instructorId, (v) => { f.instructorId = v; draw(); }, { allowNone: true }),
      h("div.fields.c2", null, field("Nivel țintă", select([[2, "2"], [3, "3"], [4, "4"]], f.target, (v) => (f.target = Number(v)))), field("Termen", input(f.due, (v) => (f.due = v), { type: "date" }))),
      field("Stare", seg([["open", "În curs"], ["done", "Finalizat"]], f.status, (v) => { f.status = v; draw(); })),
      f.status === "done" ? note("Finalizarea training-ului nu schimbă automat nivelul. Evaluează în matrice.", "warn") : null);
  };
  draw();
  const sh = sheet({ title: existing ? "Training" : "Training nou", body, footer: [btn("Salvează", () => {
    if (!f.personId || !f.lineId) return toast("Alege operatorul și linia.", { err: true });
    commit((d) => { const i = d.trainings.findIndex((x) => x.id === f.id); if (i >= 0) d.trainings[i] = f; else d.trainings.push(f); }, "Training salvat");
    sh.close();
  }, "primary")] });
}
export function personView([id]) {
  const doc = S.doc, c = ctx();
  const p = byId(doc.master.people, id);
  if (!p) return h("div", null, backLink("#/team", "Echipă"), empty("Persoana nu există", "", null));
  const quals = Object.entries(doc.quals).filter(([k]) => k.startsWith(p.id + "|")).map(([k, v]) => {
    const [, post] = k.split("|"); const [lineId, mid] = post.split(":");
    const l = byId(doc.master.lines, lineId);
    return { l, m: l?.machines.find((x) => x.id === mid), v };
  }).filter((x) => x.l);
  const att = doc.attendance[c.sk]?.[p.id];
  const asg = (doc.assignments[c.sk] || []).filter((a) => a.personId === p.id);
  return h("div", null, backLink("#/team", "Echipă"), pageHead(p.name, (p.category || "") + " · " + (doc.settings.attendance.find((s) => s.id === att)?.label || "pontaj nemarcat") + (asg.length ? " · alocat pe " + asg.map((a) => lineName(a.lineId)).join(", ") : "")),
    sect("Calificări (" + quals.length + ")"),
    quals.length ? h("div.list", null, quals.sort((a, b) => b.v.level - a.v.level).map((q) => h("div.item", null, h("span.lvl.l" + q.v.level, null, String(q.v.level)), h("div.main", null, h("div.t", null, q.l.name + " · " + (q.m?.name || "linie")), h("div.s", null, LEVELS[q.v.level].label + " · " + q.v.date + (q.v.migrated ? " · migrat" : "")))))) : note("Nicio evaluare."),
    sect("Training"), h("div.list", null, doc.trainings.filter((t) => t.personId === p.id).map((t) => h("div.item", null, h("div.main", null, h("div.t", null, lineName(t.lineId) + " → nivel " + t.target), h("div.s", null, t.status === "done" ? "finalizat" : "în curs" + (t.due ? " · " + t.due : "")))))));
}
