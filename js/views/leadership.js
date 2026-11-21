import { app } from "../state.js";
import { btn, confirmShare, details, el, input } from "../ui.js";
import { share } from "../logic.js";
import { SBAR, SBAR_LABELS, SCENARIOS, TECHNIQUES, sbarText } from "../leadership.js";

export function leadershipView() {
  const main = document.querySelector("main");
  const content = el("section", "", "card leadershipView");
  const guides = el("div", "", "records");
  const communication = el("section", "", "card leadershipView");
  const techniqueLabels = ["Când", "Obiectiv", "Pași", "Exemplu fictiv", "De evitat", "Formulare"];
  const filterNames = ["Toate ghidurile", ...SCENARIOS.map(([name]) => name)];
  const development = app.data.pages.find((p) => p.professionalPlan && !p.archived);
  content.append(el("h1", "Asistent de leadership"),
    input("Situația din schimb", filterNames[0], (value) => drawGuides(value), "select", filterNames),
    guides);
  if (development) content.append(btn("Planul meu de dezvoltare", () => app.openPage(development), "primary"));
  function drawGuides(filter) {
    guides.replaceChildren();
    const indices = SCENARIOS.find(([name]) => name === filter)?.[1] || TECHNIQUES.map((_, index) => index);
    for (const index of indices) {
      const [title, ...sections] = TECHNIQUES[index];
      const guide = details(title, "leadership-" + index, "record leadershipGuide");
      for (const [i, text] of sections.entries())
        guide.append(el("h3", techniqueLabels[i]), el("p", text));
      guides.append(guide);
    }
  }
  drawGuides(filterNames[0]);
  const form = el("div", "", "recordFields");
  const values = new Map();
  function drawTemplate(name) {
    const [, ...prompts] = SBAR.find(([title]) => title === name);
    if (!values.has(name)) values.set(name, ["", "", "", ""]);
    const draft = values.get(name);
    form.replaceChildren();
    SBAR_LABELS.forEach((label, index) => {
      const field = input(label, draft[index], (value) => { draft[index] = value; }, "area");
      field.querySelector("textarea").placeholder = prompts[index];
      form.append(field);
    });
    form.append(btn("Previzualizează rezumatul", async () => {
      const text = sbarText(name, draft);
      if (await confirmShare(text, "Rezumat SBAR")) await share(text);
    }, "primary"));
  }
  const names = SBAR.map(([title]) => title);
  communication.append(el("h2", "Șabloane de comunicare SBAR"),
    el("p", "Ciorne pentru această pagină. Copiază rezumatul dacă ai nevoie să-l păstrezi.", "formHelp"),
    input("Situație de comunicare", names[0], drawTemplate, "select", names), form);
  drawTemplate(names[0]);
  main.append(content, communication);
}
