// Afișarea sfaturilor și executarea acțiunilor propuse de ele.
import { app } from "../state.js";
import { el, btn, icon, input, actions, openDialog, norm, fieldHint } from "../ui.js";
import { AREA_NAMES } from "../advice.js";
import { draftRow, handoverDraft } from "../blocks/table.js";
import { handover, previousHandover, share } from "../logic.js";
import { safetyBlock } from "../metrics.js";
import { handoverSituation, readKey } from "../operations.js";
import { SBAR_LABELS, sbarText } from "../leadership.js";
import { colByKey, colByName } from "../records.js";

const LEVEL_NAMES = { critical: "Critică", warn: "Atenție", info: "Sugestie", good: "Bine" };
const findPage = (test) => app.data.pages.find((p) => !p.archived && test(p));

export function runAction(a) {
  const c = app.current;
  switch (a.kind) {
    case "page": {
      const p = app.data.pages.find((x) => x.id === a.pageId);
      if (p) app.openPage(p, a.key, a.field);
      break;
    }
    case "route":
      app.navigate(a.route, a.key, a.field);
      break;
    case "settings":
      app.navigate("Setări", a.key, a.field);
      break;
    case "handover": {
      const ho = a.previous ? previousHandover(c) : handover(c);
      if (!ho || (a.previous && !ho.r)) return;
      const row = ho.r || handoverDraft(ho.b, c);
      const field = a.field === "prepared" ? handoverSituation(ho.b) : a.field && colByKey(ho.b, a.field);
      app.navigate("Predare", "row-" + row.id, field && (field.key || norm(field.name)));
      break;
    }
    case "safety":
      newSafetyEvent("Near-miss");
      break;
    case "routine": {
      const p = findPage((x) => x.blocks.some((b) => b.type === "routine"));
      if (p) {
        app.editing = p.id;
        app.openPage(p);
      }
      break;
    }
    case "plan": {
      const p = findPage((x) => x.professionalPlan) || findPage((x) => x.title === "Plan 30-60-90") || findPage((x) => x.group === "Primele 90 de zile");
      if (p) app.openPage(p);
      break;
    }
  }
}
export function newSafetyEvent(type) {
  const s = safetyBlock(app.data);
  if (!s) return;
  const r = draftRow(s.b, app.current);
  const col = colByKey(s.b, "safetyType");
  if (type && col) r.values[col.id] = type;
  app.openPage(s.p, "row-" + r.id);
}
export async function escalationDraft(entry) {
  const { b, r } = entry;
  const value = (key) => readKey(b, r, key) || "";
  const named = (name) => r.values[colByName(b, name)?.id] || "";
  const fields = [
    value("problem") || named("ce s-a intamplat"),
    [entry.opened || entry.date, entry.equipment, app.data.settings.zone].filter(Boolean).join(" · "),
    [value("impact"), value("containment") || named("actiune imediata")].filter(Boolean).join(" · "),
    value("escalation"),
  ];
  const form = el("div", "", "sbarDraft");
  if (app.training) form.append(el("p", "INSTRUIRE · DATE FICTIVE", "practiceBanner"));
  form.append(el("p", "Verifică datele și completează solicitarea înainte de copiere.", "formHelp"));
  const prompts = [
    "Ce s-a întâmplat și ce necesită atenție acum?",
    "Unde, când și în ce condiții a apărut?",
    "Care este impactul confirmat și ce măsură este deja aplicată?",
    "Cui ceri ajutor, ce decizie aștepți și până când?",
  ];
  SBAR_LABELS.forEach((label, i) => {
    form.append(fieldHint(input(label, fields[i], (v) => { fields[i] = v; }, "area"), prompts[i]));
  });
  if (await openDialog(() => [el("h2", "Ciornă SBAR"), form, actions("Copiază")]) === "ok")
    await share(sbarText("Escaladare SBAR", fields));
}
export function adviceCard(a) {
  const card = el("article", "", "advice");
  card.dataset.level = a.level;
  const head = el("div", "", "adviceHead");
  head.append(el("span", AREA_NAMES[a.area], "adviceArea"), el("span", LEVEL_NAMES[a.level], "adviceLevel"));
  card.append(head, el("h3", a.title), el("p", a.text));
  if (a.action?.kind) card.append(btn(a.action.label, () => runAction(a.action), "small adviceAction", "chevron"));
  return card;
}
export function adviceSection(list, { limit = list.length, title = "Sfaturi inteligente", more } = {}) {
  const section = el("section", "", "adviceSection");
  const head = el("div", "", "todaySectionHead");
  const h = el("h2");
  h.append(icon("spark"), el("span", title));
  head.append(h, el("span", String(list.filter((a) => a.level !== "good").length), "agendaCount"));
  section.append(head, el("p", "Generate pe telefon din datele caietului. Nimic nu pleacă din aplicație.", "formHelp"));
  if (!list.length) section.append(el("p", "Completează predarea și registrele; sfaturile apar pe măsură ce caietul are date.", "empty"));
  const grid = el("div", "", "adviceGrid");
  for (const a of list.slice(0, limit)) grid.append(adviceCard(a));
  section.append(grid);
  if (more && list.length > limit) section.append(btn(more.label + " (" + list.length + ")", more.run, "todayMore", "chevron"));
  return section;
}
