// Turul pe linie: listă fixă verificată în fiecare schimb cu OK / NOK.
// O constatare NOK devine, cu o atingere, problemă cu responsabil și termen.
import { el, btn, details, toolsFor, ask, id, icon, roDate, input } from "../ui.js";
import { auditGuidance } from "../guidance.js";
import { app } from "../state.js";
import { problemsBlock } from "../metrics.js";
import { colByKey, colByName } from "../records.js";
import { newRow } from "./table.js";

function createProblem(b, item, run, c) {
  const pb = problemsBlock(app.data);
  if (!pb) return;
  const r = newRow(pb.b, c);
  const text = colByKey(pb.b, "problem") || colByName(pb.b, "problema");
  if (text) r.values[text.id] = item.title + " (constatat la turul pe linie)";
  run[item.id].problem = r.id;
  app.save();
  app.openPage(pb.p, "row-" + r.id);
}

export function audit(b, c) {
  const box = el("div", "", "audit");
  const run = (b.runs[c.key] || {});
  const checked = b.items.filter((i) => run[i.id]).length;
  const nok = b.items.filter((i) => run[i.id]?.s === "nok").length;
  const head = el("p", "", "auditStatus");
  head.append(
    el("strong", checked + " din " + b.items.length + " verificate"),
    el("span", nok ? nok + " NOK" : checked ? "fără NOK" : "turul nu a început", nok ? "chip late" : "chip"),
  );
  const bar = el("progress", "", "routineBar");
  bar.max = b.items.length || 1;
  bar.value = checked;
  bar.setAttribute("aria-label", "Progresul turului");
  box.append(el("p", "Verifică fiecare punct la post. Alege OK dacă standardul este respectat sau NOK când ai observat o abatere. Din NOK creezi o problemă și îi dai responsabil și termen.", "formHelp"));
  box.append(el("p", "Turul schimbului " + c.shift + " · " + roDate(c.workDay, { weekday: "short", day: "numeric", month: "short" }) + ". Bifele pornesc de la zero la fiecare schimb.", "formHelp"), head, bar);
  const list = el("div", "", "auditList");
  const pb = problemsBlock(app.data);
  for (const item of b.items) {
    const row = el("div", "", "auditRow");
    row.dataset.key = "audit-" + item.id;
    row.tabIndex = -1;
    const result = run[item.id];
    if (result) row.dataset.result = result.s;
    row.append(el("span", item.title, "auditTitle"));
    const instructions = el("p", auditGuidance(item), "formHelp");
    instructions.id = "audit-help-" + id();
    instructions.hidden = !instructions.textContent;
    const choice = el("div", "", "auditChoice");
    choice.setAttribute("role", "group");
    choice.setAttribute("aria-label", item.title);
    if (!instructions.hidden) choice.setAttribute("aria-describedby", instructions.id);
    for (const [s, label] of [["ok", "OK"], ["nok", "NOK"]]) {
      const on = result?.s === s;
      const button = btn(label, () => {
        if (on) delete run[item.id];
        else run[item.id] = { s };
        b.runs[c.key] = run;
        c.refresh();
      }, on ? "on " + s : s);
      button.setAttribute("aria-pressed", String(on));
      choice.append(button);
    }
    row.append(choice, instructions);
    if (result?.s === "nok") {
      const linked = result.problem && pb?.b.rows.find((r) => r.id === result.problem);
      if (linked)
        row.append(btn("Problemă creată – deschide", () => app.openPage(pb.p, "row-" + linked.id), "fieldLink", "alert"));
      else if (pb)
        row.append(btn("Creează problemă", () => createProblem(b, item, run, c), "small", "plus"));
    }
    if (c.editing) {
      const tools = toolsFor(b.items, item, c, { rename: true });
      tools.classList.add("auditTools");
      const edit = input("Instrucțiuni de verificare", item.details || "", (value) => {
        item.details = value;
        instructions.textContent = auditGuidance(item);
        instructions.hidden = !instructions.textContent;
        if (instructions.hidden) choice.removeAttribute("aria-describedby");
        else choice.setAttribute("aria-describedby", instructions.id);
        c.save();
      }, "area");
      edit.classList.add("auditTools");
      if (!item.details) edit.querySelector("textarea").placeholder = instructions.textContent;
      row.append(edit, tools);
    }
    list.append(row);
  }
  if (!b.items.length) list.append(el("p", "Niciun punct de verificat. Apasă „Editează” și adaugă punctele turului.", "empty"));
  box.append(list);
  if (c.editing)
    box.append(btn("Adaugă punct de verificat", async () => {
      const title = await ask("Punct nou în tur", "", "Adaugă");
      if (title?.trim()) {
        b.items.push({ id: id(), title: title.trim() });
        c.refresh();
      }
    }, "add", "plus"));
  // Tururile anterioare, pe scurt.
  const past = Object.entries(b.runs).filter(([k, r]) => k !== c.key && Object.keys(r).length)
    .sort(([a], [b]) => b.localeCompare(a)).slice(0, 14);
  if (past.length) {
    const history = details([el("span", "Tururile anterioare (" + past.length + ")"), icon("down")], "audit-history-" + b.id, "history");
    for (const [key, r] of past) {
      const values = Object.values(r);
      const bad = b.items.filter((i) => r[i.id]?.s === "nok").map((i) => i.title);
      history.append(
        el("h4", key + " · " + values.length + " verificate · " + bad.length + " NOK"),
        el("p", bad.length ? "NOK: " + bad.join(" • ") : "Niciun NOK raportat", "desc"),
      );
    }
    box.append(history);
  }
  return box;
}
