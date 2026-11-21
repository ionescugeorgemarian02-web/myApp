// Afișarea sfaturilor și executarea acțiunilor propuse de ele.
import { app } from "../state.js";
import { el, btn, icon } from "../ui.js";
import { AREA_NAMES } from "../advice.js";
import { newRow } from "../blocks/table.js";
import { handover } from "../logic.js";
import { safetyBlock } from "../metrics.js";
import { colByKey } from "../records.js";

const LEVEL_NAMES = { critical: "Urgent", warn: "Atenție", info: "Sugestie", good: "Bine" };
const findPage = (test) => app.data.pages.find((p) => !p.archived && test(p));

export function runAction(a) {
  const c = app.current;
  switch (a.kind) {
    case "page": {
      const p = app.data.pages.find((x) => x.id === a.pageId);
      if (p) app.openPage(p, a.key);
      break;
    }
    case "route":
      location.hash = a.route;
      break;
    case "settings":
      if (a.key) app.open.add(a.key);
      location.hash = "Setări";
      break;
    case "handover": {
      const ho = handover();
      if (!ho) return;
      if (!ho.r) {
        ho.r = newRow(ho.b, c);
        const zone = colByKey(ho.b, "handoverZone");
        if (zone && app.data.settings.zone) ho.r.values[zone.id] = app.data.settings.zone;
        app.save();
      }
      app.openPage(ho.p, "row-" + ho.r.id);
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
      const p = findPage((x) => x.title === "Plan 30-60-90") || findPage((x) => x.group === "Primele 90 de zile");
      if (p) app.openPage(p);
      break;
    }
  }
}
export function newSafetyEvent(type) {
  const s = safetyBlock(app.data);
  if (!s) return;
  const r = newRow(s.b, app.current);
  const col = colByKey(s.b, "safetyType");
  if (type && col) r.values[col.id] = type;
  app.save();
  app.openPage(s.p, "row-" + r.id);
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
