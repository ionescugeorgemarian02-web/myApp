// Matricea de polivalență: cine poate lucra pe ce post.
// Măsoară competențe pentru organizarea muncii, nu performanța oamenilor.
import { el, btn } from "../ui.js";
import { app } from "../state.js";
import { skillsCoverage, SKILL_LEVELS, teamBlock } from "../metrics.js";

const SHORT = ["–", "1", "2", "3"];

export function skills(b, c) {
  const box = el("div", "", "skills");
  function draw() {
    const cov = skillsCoverage(app.data);
    box.replaceChildren();
    const legend = el("ul", "", "skillLegend");
    SKILL_LEVELS.forEach((name, i) => {
      const li = el("li");
      li.append(el("span", SHORT[i], "skillDot l" + i), el("span", name));
      legend.append(li);
    });
    box.append(el("p", "Atinge o căsuță pentru a schimba nivelul. Un post e acoperit sigur cu cel puțin 2 oameni autonomi.", "formHelp"), legend);
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
      el("strong", Math.round(cov.index) + "%"),
      el("span", " din posturi au cel puțin 2 oameni autonomi" + (cov.gaps.length ? " · descoperite: " + cov.gaps.map((g) => g.post).join(", ") : "")),
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
        const level = b.levels[person.id]?.[post] ?? 0;
        const td = el("td");
        const cell = btn(SHORT[level], () => {
          const next = (level + 1) % 4;
          b.levels[person.id] ||= {};
          if (next) b.levels[person.id][post] = next;
          else delete b.levels[person.id][post];
          if (!Object.keys(b.levels[person.id]).length) delete b.levels[person.id];
          c.save();
          const scroll = wrap.scrollLeft;
          draw();
          box.querySelector(".skillScroll").scrollLeft = scroll;
          box.querySelector(`[data-cell="${CSS.escape(person.id + "|" + post)}"]`)?.focus();
        }, "skillCell l" + level);
        cell.dataset.cell = person.id + "|" + post;
        cell.setAttribute("aria-label", person.name + ", " + post + ": " + SKILL_LEVELS[level]);
        td.append(cell);
        tr.append(td);
      }
      table.append(tr);
    }
    const foot = el("tr", "", "skillFoot");
    const label = el("th", "Autonomi");
    label.scope = "row";
    foot.append(label);
    for (const x of cov.coverage) {
      const td = el("td", String(x.autonomous), x.autonomous < 2 ? "gap" : "");
      foot.append(td);
    }
    table.append(foot);
    wrap.append(table);
    box.append(wrap);
  }
  draw();
  return box;
}
