import { HANDOVER_FIELDS, PROBLEM_FIELDS, closureError, closureMissing, handoverSituation, handoverStatus, readKey, problemMatches } from "../operations.js";
import { csvCell, nonnegative, productionKpis } from "../production.js";
import { el, input, btn, id, details, now, norm, ask, roDate, validDate, iconBtn, toast, confirmShare, fieldError, fieldHint, icon } from "../ui.js";
import { recordGuidance } from "../guidance.js";
import { app } from "../state.js";
import { download } from "../store.js";
import { share } from "../logic.js";
import { isClosed, rowLabel, column, trackLifecycle, colByKey, colByName } from "../records.js";
import { equipmentList } from "../metrics.js";
export { isClosed, rowLabel, column };
const types = {
  Text: "text",
  Număr: "number",
  Dată: "date",
  Bifă: "checkbox",
  "Listă de opțiuni": "select",
};
// Rând nou cu data zilei de lucru și schimbul curent completate automat.
// Rândul nou se deschide imediat pentru completare.
const drafts = new WeakMap();
export function newRow(b, c, draft = false) {
  const values = {};
  for (let col of b.cols) {
    if (col.type === "date" && norm(col.name) === "data")
      values[col.id] = c.workDay;
    if (norm(col.name) === "schimb" || col.key === "incidentShift") values[col.id] = String(c.shift);
    if (col.type === "select" && norm(col.name) === "stare") {
      const initial = col.options.find((value) => norm(value) === "deschis");
      if (initial) values[col.id] = initial;
    }
  }
  const r = { id: id(), created: now(), values };
  if (draft) {
    if (!drafts.has(b)) drafts.set(b, new Map());
    drafts.get(b).set(draftKey(b, c), r);
  }
  else b.rows.push(r);
  app.open.add("row-" + r.id);
  return r;
}
const draftKey = (b, c) => b.type === "journal" ? c.key : "new";
export function draftRow(b, c) {
  return drafts.get(b)?.get(draftKey(b, c)) || newRow(b, c, true);
}
export function handoverDraft(b, c) {
  const row = draftRow(b, c);
  const zone = colByKey(b, "handoverZone");
  if (zone && app.data.settings.zone && !(zone.id in row.values)) row.values[zone.id] = app.data.settings.zone;
  return row;
}
const draftEntry = (b, r) => [...(drafts.get(b) || [])].find(([, row]) => row === r);
const isDraft = (b, r) => Boolean(draftEntry(b, r));
function discardDraft(b, r) {
  drafts.get(b)?.delete(draftEntry(b, r)?.[0]);
}
const fileName = (t) =>
  (norm(t)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "tabel") +
  "-" +
  new Date().toISOString().slice(0, 10) +
  ".csv";
function exportCsv(b) {
  let rows = [
    b.cols.map((x) => x.name),
    ...b.rows.map((r) => b.cols.map((x) => r.values[x.id])),
  ];
  if (app.training) rows.unshift(["INSTRUIRE · DATE FICTIVE"]);
  download(
    fileName((app.training ? "INSTRUIRE-" : "") + b.title),
    "﻿" + rows.map((r) => r.map(csvCell).join(";")).join("\r\n"),
    "text/csv;charset=utf-8",
  );
}
// „Plan 95% · Rebut 1,2% · 40 min oprire” pentru fișa de predare.
export function shiftFigures(b, r) {
  const v = (key) => {
    const col = b.cols.find((c) => c.key === key);
    return col ? nonnegative(r.values[col.id]) : null;
  };
  const fmt = (x) => (Math.round(x * 10) / 10).toLocaleString("ro");
  const out = [];
  const plan = v("plan"), produced = v("produced"), scrap = v("scrap"), down = v("downtime");
  const kpis = productionKpis({ plan, produced, scrap, downtime: down });
  if (kpis.planPct != null) out.push("Plan " + fmt(kpis.planPct) + "%");
  if (kpis.scrapPct != null) out.push("Rebut " + fmt(kpis.scrapPct) + "%");
  if (kpis.downtime != null) out.push(fmt(kpis.downtime) + " min oprire");
  return out.join(" · ");
}
// Rezumatul unui rând închis: titlu + etichete (dată, stare, bifă).
function summaryOf(b, r, c) {
  const journal = b.type === "journal";
  const managed = Boolean(colByKey(b, "problem"));
  const handover = Boolean(colByKey(b, "prepared"));
  let title = el("span", "", "recTitle"),
    meta = el("span", "", "meta");
  if (journal) {
    let date = b.cols.find((x) => x.type === "date" && r.values[x.id]);
    let shift = b.cols.find((x) => norm(x.name) === "schimb" && r.values[x.id]);
    title.textContent =
      (date
        ? roDate(r.values[date.id], { weekday: "short", day: "numeric", month: "short" })
        : r.created
          ? new Date(r.created).toLocaleDateString("ro")
          : "Intrare") + (shift ? " · Schimb " + r.values[shift.id] : "");
    const figures = shiftFigures(b, r);
    if (!handover && figures) meta.append(el("span", figures, "snippet figures"));
    let first = b.cols.find(
      (x) => x.type === "text" && x !== shift && r.values[x.id],
    );
    if (first && !handover) meta.append(el("span", r.values[first.id], "snippet"));
    const zone = handover && readKey(b, r, "handoverZone");
    if (zone) meta.append(el("span", zone, "chip"));
    if (handover && !isDraft(b, r)) {
      const status = readKey(b, r, "received") ? "Preluare verificată"
        : readKey(b, r, "prepared") ? "Predare verificată" : "Predare neverificată";
      meta.append(el("span", status, "chip"));
    }
  } else {
    const label = rowLabel(managed ? { ...b, cols: b.cols.filter((col) => norm(col.name) !== "responsabil") } : b, r);
    title.textContent = label === "Rând fără text" ? "Rând nou – necompletat" : label;
    for (let col of b.cols) {
      let v = r.values[col.id];
      if (managed && norm(col.name) === "responsabil") {
        meta.append(el("span", String(v || "").trim() ? "Responsabil · " + v : "Fără responsabil", "chip"));
        continue;
      }
      if (managed && col.type === "date" && norm(col.name).includes("termen")) {
        const late = validDate(v) && v < c.date && !isClosed(b, r);
        meta.append(el("span", !validDate(v) ? "Fără termen" : (late ? "Restantă · " : "Termen · ") + roDate(v), late ? "chip warn" : "chip"));
        continue;
      }
      if (v === "" || v == null || v === false) continue;
      if (col.type === "select")
        meta.append(
          el(
            "span",
            v,
            "chip" + (col.key === "urgency" && v === "Critică" && !isClosed(b, r) ? " critical"
              : ["inchis", "rezolvat"].includes(norm(v)) ? " done" : ""),
          ),
        );
      else if (col.type === "date") {
        let late = norm(col.name).includes("termen") && !isClosed(b, r);
        meta.append(
          el(
            "span",
            roDate(v),
            "chip" + (late && v < c.date ? " late" : late && v === c.date ? " today" : ""),
          ),
        );
      } else if (col.type === "checkbox") meta.append(el("span", "✓ " + col.name, "chip done"));
    }
  }
  let wrap = el("span", "", "recHead");
  wrap.append(title);
  if (isDraft(b, r)) meta.prepend(el("span", "Ciornă nesalvată", "chip warn"));
  if (meta.childElementCount) wrap.append(meta);
  return wrap;
}
function fieldsConfig(b, c) {
  let settings = details("Configurează câmpurile", "cfg-" + b.id, "config");
  let changed = false;
  settings.addEventListener("toggle", () => {
    if (!settings.open && changed) c.refresh();
  });
  for (const col of b.cols) {
    let d = details(col.name, "col-" + col.id, "colCfg");
    const managedKey = (colByKey(b, "prepared") || colByKey(b, "problem")) &&
      (col.key || ["actiune", "stare", "data", "schimb"].includes(norm(col.name)));
    if (managedKey) {
      d.append(el("p", "Câmp folosit de fluxul operațional.", "formHelp"));
      settings.append(d);
      continue;
    }
    const affectsHandover = colByKey(b, "prepared") && b.rows.some((row) =>
      row.values[colByKey(b, "prepared").id] === true &&
      handoverStatus({ ...b, cols: b.cols.filter((candidate) => candidate !== col) }, row, "prepared"));
    d.append(
      input("Nume", col.name, (v) => {
        col.name = v;
        d.firstElementChild.textContent = v;
        changed = true;
        c.save();
      }),
      ...(!affectsHandover ? [input(
        "Tip",
        Object.keys(types).find((k) => types[k] === col.type),
        (v) => {
          col.type = types[v];
          c.refresh();
        },
        "select",
        Object.keys(types),
      )] : []),
    );
    if (col.type === "select")
      d.append(
        input("Opțiuni separate prin |", col.options.join("|"), (v) => {
          col.options = v.split("|").map((s) => s.trim());
          changed = true;
          c.save();
        }),
      );
    if (!affectsHandover)
      d.append(btn("Șterge câmpul", () => c.remove(b.cols, col), "danger", "trash"));
    settings.append(d);
  }
  settings.append(
    btn(
      "Câmp nou",
      async () => {
        let t = await ask("Nume câmp nou", "", "Adaugă");
        if (t?.trim()) {
          b.cols.push(column(t.trim()));
          c.refresh();
        }
      },
      "add",
      "plus",
    ),
  );
  return settings;
}
function orderedSections(b, sections, lastSection) {
  const pending = new Set(b.cols);
  const result = sections.map(([title, keys, collapsed]) => [
    title, keys.map((key) => colByKey(b, key) || colByName(b, key)).filter((col) => pending.delete(col)), collapsed,
  ]);
  if (pending.size) result.splice(lastSection ? -1 : result.length, 0, ["Alte câmpuri", [...pending], true]);
  return result.filter(([, cols]) => cols.length);
}
function fieldGroups(b) {
  if (colByKey(b, "prepared")) return orderedSections(b, [
    ["Situația de predat", [norm(handoverSituation(b)?.name), "safetySummary", "materialShortage", "deliveryRisk", "echipamente oprite", "lipsuri de personal"]],
    ["Pentru schimbul următor", ["handoverActions", "handoverEscalation", "nextChecks", "prioritati pentru schimbul urmator", "de urmarit"]],
    ["Data, zona și cifrele", ["data", "schimb", "handoverZone", ...SHIFT_KEYS], true],
    ["Verificare și confirmare", ["prepared", "received"]],
  ], true);
  if (colByKey(b, "problem")) return orderedSections(b, [
    ["Înregistrare", ["problem", "impact", "urgency", "containment", "responsabil", "termen", "stare"]],
    ["Escaladare și sprijin", ["escalation"], true],
    ["Cauză și corecție", ["cauza (5 de ce)", "actiune"], true],
    ["Verificare și închidere", ["effectiveness", "closureNote"], true],
    ["Context", ["data", "incidentShift", "equipment"], true],
  ]);
  if (b.cols.some((col) => norm(col.name) === "ce am promis")) return orderedSections(b, [
    ["Discuția", b.cols.map((col) => col.key || norm(col.name))
      .filter((name) => !["ce am promis", "rezolvat"].includes(name) && !name.includes("termen"))],
    ["Ce urmează", b.cols.map((col) => col.key || norm(col.name))
      .filter((name) => ["ce am promis", "rezolvat"].includes(name) || name.includes("termen"))],
  ]);
  if (colByKey(b, "safetyType")) return orderedSections(b, [
    ["Evenimentul", ["data", "schimb", "safetyType", "ce s-a intamplat", "equipment", "gravitate", "actiune imediata", "stare"]],
  ]);
  return [["", b.cols]];
}
const SHIFT_KEYS = new Set(["plan", "produced", "scrap", "downtime", "planned", "present"]);
const longFields = new Set([
  "ce s-a intamplat", "actiune imediata", "decizia", "context si variante",
  "problema", "probleme", "cauza (5 de ce)", "actiune", "de urmarit",
  "observatii", "ce am promis", "ce il incurca", "ce as schimba / ce n-as schimba",
  "ce il motiveaza", "ce cere de la mine",
]);
function recordField(b, col, r, c, { classic = false, changed, guide } = {}) {
  const name = norm(col.name);
  const value = r.values[col.id];
  let type = col.type;
  if (type === "text" && name === "telefon") type = "tel";
  if (!classic && type === "text" && (longFields.has(name) ||
      [...HANDOVER_FIELDS, ...PROBLEM_FIELDS].some(([key]) => key === col.key && key !== "handoverZone") ||
      /^(situatia productiei|echipamente oprite|lipsuri de personal|prioritati pentru schimbul)/.test(name))) type = "area";
  // „Post / mașină” folosește lista din Setări → Linia mea.
  const source = col.key === "equipment" ? equipmentList(app.data) : col.options;
  const options = type === "select" ? ["", ...source.filter(Boolean)] : [];
  // O opțiune scoasă din configurare rămâne vizibilă în fișele deja completate.
  if (type === "select" && value && !options.includes(value)) options.push(value);
  let control;
  const field = input(classic ? "" : col.name, value, (v) => {
    if (!control.validity.badInput && v === (r.values[col.id] ?? (type === "checkbox" ? false : ""))) {
      if (control.getAttribute("aria-invalid") === "true") fieldError(control, "");
      return;
    }
    const wasClosed = isClosed(b, r);
    const candidate = { ...r, values: { ...r.values, [col.id]: v } };
    const closed = isClosed(b, candidate);
    let error = "";
    if (control.validity.badInput || ((SHIFT_KEYS.has(col.key) || col.key === "stopMinutes") && v !== "" && nonnegative(v) === null))
      error = "Introdu o valoare numerică pozitivă sau zero.";
    if (!error && v === true && ["prepared", "received"].includes(col.key))
      error = handoverStatus(b, candidate, col.key);
    if (!error && colByKey(b, "problem") && closed && (!wasClosed || r.closedAt && r.verifiedClosure))
      error = closureError(b, candidate);
    if (error) {
      if (type === "checkbox") control.checked = Boolean(r.values[col.id]);
      else if (type === "select") control.value = r.values[col.id] ?? "";
      const body = field.closest(".recBody");
      const required = [];
      if (col.key === "prepared" || col.key === "received") {
        const missing = col.key === "received" && !handoverStatus(b, r, "prepared")
          ? colByKey(b, "prepared") : handoverSituation(b);
        if (missing) required.push([missing, error]);
      } else if (closed && colByKey(b, "problem") && error === closureError(b, candidate)) {
        for (const missing of closureMissing(b, candidate))
          if (missing) required.push([missing, "Completează „" + missing.name + "” înainte de închidere."]);
      }
      fieldError(control, error);
      const targets = required.map(([missing, message]) => {
        const target = body?.querySelector(`[data-column="${CSS.escape(missing.id)}"]`);
        if (target) {
          target.closest("details")?.setAttribute("open", "");
          fieldError(target, message);
        }
        return target;
      });
      const first = targets.find(Boolean) || control;
      first.focus({ preventScroll: true });
      first.scrollIntoView({ block: "nearest" });
      return;
    }
    if (control.hasAttribute("aria-invalid")) fieldError(control, "");
    const body = field.closest(".recBody");
    if (colByKey(b, "problem") && !closureError(b, candidate)) {
      const status = body?.querySelector('[data-field="stare"]');
      if (status?.getAttribute("aria-invalid") === "true") fieldError(status, "");
    }
    if (colByKey(b, "prepared")) {
      for (const key of ["prepared", "received"]) {
        const check = body?.querySelector(`[data-field="${key}"]`);
        if (check?.getAttribute("aria-invalid") === "true" && !handoverStatus(b, candidate, key))
          fieldError(check, "");
      }
    }
    if (isDraft(b, r)) {
      b.rows.push(r);
      discardDraft(b, r);
    }
    r.values[col.id] = v;
    if (colByKey(b, "prepared") && col.key !== "received") {
      for (const key of (col.key === "prepared" ? ["received"] : ["prepared", "received"])) {
        if (col.key === "prepared" && v === true) break;
        const checkCol = colByKey(b, key);
        if (!checkCol || r.values[checkCol.id] !== true) continue;
        r.values[checkCol.id] = false;
        const form = field.closest(".recBody");
        const check = [...(form?.querySelectorAll("input[data-handover-check]") || [])]
          .find((input) => input.dataset.handoverCheck === key);
        if (check) check.checked = false;
      }
    }
    if (colByKey(b, "problem") && closed && !wasClosed) r.verifiedClosure = true;
    if (wasClosed && !closed) delete r.verifiedClosure;
    trackLifecycle(b, r, wasClosed, now());
    c.save();
    changed?.();
    if (wasClosed !== isClosed(b, r)) c.updateDeadlines?.();
  }, type, options);
  if (col.key === "equipment" && options.length === 1 && !classic) {
    const setup = btn("Adaugă posturile liniei", () => {
      app.navigate("Setări", "settings-line", "zone");
    }, "fieldLink");
    field.append(setup);
  }
  control = field.querySelector("input, textarea, select");
  if (["prepared", "received"].includes(col.key)) control.dataset.handoverCheck = col.key;
  control.dataset.field = col.key || name;
  control.dataset.column = col.id;
  if (classic) control.setAttribute("aria-label", col.name);
  if (type === "select") control.options[0].text = "Alege…";
  if (type === "area") field.classList.add("wideField");
  if (type === "number") {
    control.step = "any";
    control.min = "0";
    control.inputMode = "decimal";
  }
  return fieldHint(field, guide && Object.hasOwn(guide, col.key || name) ? guide[col.key || name] : "");
}
function record(b, r, c, groups, guide) {
  const d = details(summaryOf(b, r, c), "row-" + r.id, "record");
  d.classList.toggle("closed", isClosed(b, r));
  const summary = d.firstElementChild;
  const handoverState = colByKey(b, "prepared") && el("div", "", "handoverState");
  if (handoverState) handoverState.setAttribute("aria-live", "polite");
  function updateHandover() {
    if (!handoverState) return;
    const prepared = readKey(b, r, "prepared") === true;
    const received = readKey(b, r, "received") === true;
    handoverState.replaceChildren(
      el("strong", received ? "Preluare verificată" : prepared ? "Predare verificată" : "Predare neverificată"),
      el("p", handoverStatus(b, r, "prepared") || (received ? "Ambele confirmări sunt înregistrate."
        : prepared ? "Următorul pas este confirmarea preluării." : "Situația este completată. Confirmă verificarea.")),
    );
  }
  function updateSummary() {
    updateHandover();
    c.onProblemEdit?.();
    summary.replaceChildren(summaryOf(b, r, c));
    d.classList.toggle("closed", isClosed(b, r));
  }
  function populate() {
    if (!d.open || d.children.length > 1) return;
    const body = el("div", "", "recBody");
    if (handoverState) {
      updateHandover();
      body.append(el("p", "Fișă personală de sprijin pentru predarea și preluarea schimbului.", "formHelp"));
    }
    for (const [name, cols, collapsed] of groups) {
      const group = el(name ? "fieldset" : "div", "", "formGroup");
      if (name) group.append(el("legend", name));
      const grid = el("div", "", name === "Data și schimbul" ? "recordFields shiftFields" : "recordFields");
      for (const col of cols) {
        grid.append(recordField(b, col, r, c, { changed: updateSummary, guide }));
      }
      group.append(grid);
      if (collapsed) {
        const panel = details([el("span", name), icon("down")], "fields-" + r.id + "-" + name, "formStage");
        group.querySelector("legend")?.classList.add("visuallyHidden");
        panel.append(group);
        body.append(panel);
      } else body.append(group);
    }
    if (handoverState) body.append(handoverState);
    if (b.type === "journal" && r.created) {
      const date = new Date(r.created);
      if (Number.isFinite(date.getTime()))
        body.append(el("small", "Creată pe " + date.toLocaleString("ro", {
          dateStyle: "short", timeStyle: "short",
        }), "createdAt"));
    }
    const foot = el("div", "", "recFoot");
    foot.append(
      btn("Închide fișa", () => {
        d.open = false;
        summary.focus();
      }, "small", "check"),
      btn("Șterge", () => {
        if (isDraft(b, r)) {
          discardDraft(b, r);
          app.open.delete("row-" + r.id);
          c.render();
        } else c.remove(b.rows, r);
      }, "danger small", "trash"),
    );
    if (colByKey(b, "prepared")) {
      foot.prepend(btn("Rezumatul acestei fișe", async () => {
        const text = [b.title, ...b.cols.map((col) => {
          const value = r.values[col.id];
          return col.name + " · " + (value === true ? "Verificată" : col.type === "checkbox" ? "În așteptare" : value === "" || value == null ? "Date indisponibile" : value);
        })].join("\n");
        if (await confirmShare(text, "Rezumat predare–primire")) await share(text);
      }, "small"));
    }
    if (colByKey(b, "problem")) {
      const guide = details("Ghid 5 Why și 8D");
      guide.append(el("p", "5 Why · Pornește de la abaterea observată. Întreabă de ce, verifică fiecare răspuns la post și oprește-te la o cauză demonstrabilă, asupra căreia poți interveni."),
        el("p", "8D · Formează echipa, definește problema, limitează impactul, verifică de ce a apărut și de ce a trecut de control, alege și validează corecția, aplic-o, previno reapariția și documentează închiderea. Folosește 8D complet când este justificat sau cerut local."));
      body.append(guide);
    }
    body.append(foot);
    d.append(body);
  }
  d.addEventListener("toggle", populate);
  populate();
  return d;
}
export function table(b, c) {
  let out = el("div");
  const journal = b.type === "journal";
  const managed = Boolean(colByKey(b, "problem"));
  const staged = managed || Boolean(colByKey(b, "prepared") || colByKey(b, "safetyType"));
  const add = btn(
    managed ? "Problemă nouă" : journal ? "Intrare nouă" : "Adaugă rând",
    () => {
      const r = staged ? draftRow(b, c) : newRow(b, c);
      app.open.add("row-" + r.id);
      if (staged) c.render();
      else c.refresh();
      const target = document.querySelector(`[data-key="row-${CSS.escape(r.id)}"]`);
      target?.querySelector("summary")?.focus({ preventScroll: true });
      target?.scrollIntoView({ block: "start" });
    },
    staged ? "primary" : "add",
    "plus",
  );
  if (c.editing) {
    let tools = el("div", "", "toolbar");
    if (!journal && !colByKey(b, "problem"))
      tools.append(
        btn(
          b.classic ? "Vedere listă" : "Vedere tabel",
          () => {
            b.classic = !b.classic;
            c.refresh();
          },
          "small",
          b.classic ? "cards" : "table",
        ),
      );
    tools.append(btn("Export CSV", () => exportCsv(b), "small", "download"));
    out.append(tools, fieldsConfig(b, c));
  }
  const classic = b.classic && !journal && !managed;
  const guide = recordGuidance(b);
  const help = classic ? "Glisează tabelul lateral pentru a vedea toate coloanele."
    : journal ? "Atinge o intrare pentru a o completa. Modificările se salvează automat."
      : "Deschide o fișă pentru a completa câmpurile. Modificările se salvează automat.";
  out.append(el("p", help, "formHelp"), add);
  // În jurnal, cele mai noi intrări sunt primele.
  const rows = journal ? [...b.rows].reverse() : [...b.rows];
  if (drafts.has(b)) rows.unshift(...drafts.get(b).values());
  if (journal && c.handoverEntry) {
    const index = rows.findIndex((row) => "row-" + row.id === c.handoverEntry);
    if (index > 0) rows.unshift(...rows.splice(index, 1));
  }
  if (!rows.length)
    out.append(
      el("p", journal ? "Nicio intrare încă." : "Niciun rând încă.", "empty"),
    );
  else if (classic) {
    let wrap = el("div", "", "scroll"),
      grid = el("table"),
      tr = el("tr");
    b.cols.forEach((col) => {
      const th = el("th", col.name);
      th.scope = "col";
      const key = col.key || norm(col.name);
      if (Object.hasOwn(guide, key)) th.append(el("small", guide[key], "formHelp tableGuidance"));
      tr.append(th);
    });
    tr.append(el("th"));
    grid.append(tr);
    for (const r of rows) {
      let row = el("tr");
      row.dataset.key = "row-" + r.id;
      row.tabIndex = -1;
      for (const col of b.cols) {
        let td = el("td");
        td.append(recordField(b, col, r, c, { classic: true }));
        row.append(td);
      }
      let td = el("td");
      td.append(iconBtn("trash", "Șterge rândul", () => c.remove(b.rows, r), "danger"));
      row.append(td);
      grid.append(row);
    }
    wrap.append(grid);
    out.append(wrap);
  } else {
    let list = el("div", "", "records" + (staged ? " operationalRecords" : ""));
    const groups = fieldGroups(b);
    let update, sort;
    if (managed) {
      let query = "", filter = "Toate";
      const empty = el("p", "Nicio problemă pentru acest filtru.", "empty");
      empty.hidden = true;
      const dueColumn = b.cols.find((column) => column.type === "date" && norm(column.name).includes("termen"));
      const due = (row) => row.values[dueColumn?.id];
      const rank = (row) => {
        if (isDraft(b, row)) return 0;
        if (isClosed(b, row)) return 6;
        if (readKey(b, row, "urgency") === "Critică") return 1;
        if (validDate(due(row)) && due(row) < c.date) return 2;
        if (readKey(b, row, "urgency") === "Urgentă") return 3;
        return due(row) === c.date ? 4 : 5;
      };
      update = () => {
        let visible = 0;
        for (const [row, item] of entries) {
          const show = problemMatches(b, row, query, filter, c.date);
          item.hidden = !show;
          if (show) visible++;
        }
        empty.hidden = visible !== 0;
      };
      sort = () => {
        const order = entries.slice().sort(([a], [z]) => rank(a) - rank(z) ||
          (validDate(due(a)) ? due(a) : "9999").localeCompare(validDate(due(z)) ? due(z) : "9999"));
        // Reașază fișele în ordinea de citire fără a muta fișa cu focus.
        const focused = order.findIndex(([, item]) => item.contains(document.activeElement));
        let before = null;
        for (let i = order.length - 1; i > focused; i--) {
          const item = order[i][1];
          if (item.nextSibling !== before || item.parentNode !== list) list.insertBefore(item, before);
          before = item;
        }
        if (focused < 0) return;
        before = order[focused][1];
        for (let i = focused - 1; i >= 0; i--) {
          const item = order[i][1];
          if (item.nextSibling !== before) list.insertBefore(item, before);
          before = item;
        }
      };
      list.addEventListener("focusout", (event) => {
        if (!event.target.closest(".record")?.contains(event.relatedTarget)) queueMicrotask(sort);
      });
      const filters = el("div", "", "recordFields");
      filters.append(input("Caută probleme și acțiuni", "", (value) => { query = value; update(); }, "search"),
        input("Filtrează", "Toate", (value) => { filter = value; update(); }, "select",
          ["Toate", "Deschise", "Închise", "Restante", "Urgente / critice"]));
      out.append(filters, empty);
    }
    const entries = rows.map((r) => [r, record(b, r, { ...c, onProblemEdit: update }, groups, guide)]);
    for (const [, item] of entries) list.append(item);
    sort?.();
    update?.();
    out.append(list);
  }

  return out;
}
