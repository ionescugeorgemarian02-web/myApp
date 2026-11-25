// Matricea de polivalență: cine poate lucra pe ce post.
// Măsoară competențe pentru organizarea muncii, nu performanța oamenilor.
import { el, btn, details, input } from "../ui.js";
import { app } from "../state.js";
import { skillsCoverage, SKILL_LEVELS, teamBlock } from "../metrics.js";

const SHORT = ["–", "1", "2", "3"];

export function skills(b, c) {
  const box = el("div", "", "skills");
  let shift = c.shift;
  const config = app.data.settings.skillConfig || { labels: [...SKILL_LEVELS], requirements: [] };
  function save() {
    app.data.settings.skillConfig = config;
    c.save();
  }
  function draw() {
    const cov = skillsCoverage(app.data, shift);
    box.replaceChildren();
    const legend = el("ul", "", "skillLegend");
    config.labels.forEach((name, i) => {
      const li = el("li");
      li.append(el("span", SHORT[i], "skillDot l" + i), el("span", name));
      legend.append(li);
    });
    box.append(el("p", "Alocă schimbul în Echipa, apoi setează necesarul și nivelul minim pentru fiecare post. Atinge celula om–post până afișează nivelul confirmat. Verifică prezența, autorizarea și dacă aceeași persoană este alocată simultan la două posturi.", "formHelp"),
      input("Schimb pentru acoperire", shift, (value) => { shift = Number(value); draw(); }, "select", ["1", "2", "3"]), legend);
    const settings = details("Niveluri și necesar pe schimb", "skill-requirements");
    const inputs = el("div", "", "recordFields");
    config.labels.forEach((name, index) => {
      const field = input("Denumirea nivelului " + index, name, (value) => {
        if (value.trim()) { config.labels[index] = value.trim(); save(); }
      });
      field.querySelector("input").addEventListener("change", draw);
      inputs.append(field);
    });
    for (const { post, requirement } of cov.coverage) {
      const row = el("fieldset", "", "formGroup");
      row.append(el("legend", post + " · schimbul " + shift));
      let level = requirement?.level ?? 2;
      const set = (count) => {
        config.requirements = config.requirements.filter((r) => r.post !== post || r.shift !== shift);
        if (count !== null) config.requirements.push({ post, shift, level, count });
        save();
      };
      const count = input("Necesar (gol = neconfigurat)", requirement?.count, (value) => {
        const number = Number(value);
        if (value === "" && !control.validity.badInput) set(null);
        else if (Number.isSafeInteger(number) && number >= 0) set(number);
      }, "number");
      const control = count.querySelector("input");
      control.min = "0";
      control.addEventListener("change", draw);
      row.append(count, input("Nivel minim", String(level), (value) => {
        level = Number(value);
        if (control.value !== "" && control.validity.valid) set(Number(control.value));
        draw();
      }, "select", ["1", "2", "3"]));
      inputs.append(row);
    }
    settings.append(inputs);
    box.append(settings);
    if (!cov.posts.length || !cov.team.length) {
      const empty = el("div", "", "emptyState");
      if (!cov.posts.length) {
        empty.append(el("p", "Adaugă posturile și mașinile liniei în Setări.", "empty"));
        empty.append(btn("Adaugă posturile", () => {
          app.open.add("settings-line");
          location.hash = "Setări";
        }, "small", "plus"));
      }
      if (!cov.team.length) {
        empty.append(el("p", "Adaugă oamenii schimbului în pagina Echipa.", "empty"));
        const team = teamBlock(app.data);
        if (team) empty.append(btn("Deschide Echipa", () => app.openPage(team.p), "small", "chevron"));
      }
      box.append(empty);
      return;
    }
    const index = el("p", "", "skillIndex");
    box.append(index);
    index.append(
      el("strong", cov.index === null ? "Neconfigurat" : Math.round(cov.index) + "%"),
      el("span", " · acoperire pentru posturile cu necesar configurat" + (cov.gaps.length ? " · descoperite: " + cov.gaps.map((g) => g.post).join(", ") : "")),
    );
    const wrap = el("div", "", "scroll skillScroll");
    const table = el("table", "", "skillTable");
    const head = el("tr");
    const corner = el("th", "Om / post");
    corner.scope = "col";
    head.append(corner);
    for (const post of cov.posts) {
      const th = el("th", post);
      th.scope = "col";
      head.append(th);
    }
    table.append(head);
    for (const person of cov.team) {
      const tr = el("tr");
      const th = el("th", person.name);
      th.scope = "row";
      tr.append(th);
      for (const post of cov.posts) {
        const personLevels = Object.hasOwn(b.levels, person.id) ? b.levels[person.id] : {};
        const level = Object.hasOwn(personLevels, post) ? personLevels[post] : 0;
        const td = el("td");
        const cell = btn(SHORT[level], () => {
          const next = (level + 1) % 4;
          if (next) Object.defineProperty(personLevels, post, { value: next, configurable: true, enumerable: true, writable: true });
          else delete personLevels[post];
          if (Object.keys(personLevels).length)
            Object.defineProperty(b.levels, person.id, { value: personLevels, configurable: true, enumerable: true, writable: true });
          else delete b.levels[person.id];
          c.save();
          const scroll = wrap.scrollLeft;
          draw();
          box.querySelector(".skillScroll").scrollLeft = scroll;
          box.querySelector(`[data-cell="${CSS.escape(person.id + "|" + post)}"]`)?.focus();
        }, "skillCell l" + level);
        cell.dataset.cell = person.id + "|" + post;
        cell.setAttribute("aria-label", person.name + ", " + post + ": " + config.labels[level]);
        td.append(cell);
        tr.append(td);
      }
      table.append(tr);
    }
    const foot = el("tr", "", "skillFoot");
    const label = el("th", "Eligibili / necesar");
    label.scope = "row";
    foot.append(label);
    for (const x of cov.coverage) {
      const td = el("td", x.requirement ? x.autonomous + "/" + x.requirement.count : "Neconfigurat", x.gap ? "gap" : "");
      foot.append(td);
    }
    table.append(foot);
    wrap.append(table);
    box.append(wrap);
  }
  draw();
  return box;
}
