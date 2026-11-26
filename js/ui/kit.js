// Kit UI: DOM sigur (doar textContent / atribute), iconițe SVG, componente.
const SVGNS = "http://www.w3.org/2000/svg";
export function h(tag, props, ...kids) {
  const [name, ...cls] = tag.split(".");
  const el = document.createElement(name || "div");
  if (cls.length) el.className = cls.join(" ");
  applyProps(el, props);
  append(el, kids);
  return el;
}
export function s(tag, props, ...kids) {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(props || {})) if (v !== null && v !== undefined && v !== false) el.setAttribute(k, String(v));
  append(el, kids);
  return el;
}
function applyProps(el, props) {
  if (!props) return;
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") el.className = [el.className, v].filter(Boolean).join(" ");
    else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else if (k === "dataset") Object.assign(el.dataset, v);
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "value") el.value = v;
    else if (k === "checked") el.checked = !!v;
    else if (k === "text") el.textContent = v;
    else el.setAttribute(k, v === true ? "" : String(v));
  }
}
// Înlocuiește conținutul, aplatizând array-urile (replaceChildren nu le aplatizează).
export function put(el, ...kids) {
  el.replaceChildren();
  append(el, kids);
  return el;
}
function append(el, kids) {
  for (const k of kids.flat(Infinity)) {
    if (k === null || k === undefined || k === false) continue;
    el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
}

const P = {
  today: "M3 12h4l2-6 4 12 2-6h6",
  production: "M3 20V9l5 3V9l5 3V5h4l1 15z M3 20h18",
  team: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M2.5 20c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5 M16 4.3a3.3 3.3 0 0 1 0 6.4 M18 14.6c2 .6 3.2 2.5 3.5 5.4",
  quality: "M12 3l7.5 3v5.5c0 4.6-3.2 8-7.5 9.5-4.3-1.5-7.5-4.9-7.5-9.5V6z M8.5 12l2.5 2.5 4.5-5",
  more: "M4 7h16 M4 12h16 M4 17h10",
  plus: "M12 5v14 M5 12h14",
  right: "M9 6l6 6-6 6",
  left: "M15 6l-6 6 6 6",
  down: "M6 9l6 6 6-6",
  close: "M6 6l12 12 M18 6L6 18",
  check: "M5 12.5l4.5 4.5L19 7.5",
  alert: "M12 4l9 16H3z M12 10v4.5 M12 17.5v.5",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7v5l3 2",
  play: "M8 5.5v13l10.5-6.5z",
  stop: "M6.5 6.5h11v11h-11z",
  swap: "M7 7h12l-3.5-3.5 M17 17H5l3.5 3.5",
  pause: "M8 5v14 M16 5v14",
  wrench: "M14.5 6.5a4 4 0 0 0 5 5l-9 9a2.1 2.1 0 0 1-3-3l9-9a4 4 0 0 0-2-2z",
  list: "M9 6h11 M9 12h11 M9 18h11 M4.5 6h.5 M4.5 12h.5 M4.5 18h.5",
  calendar: "M4 6.5h16V20H4z M4 10.5h16 M8.5 3.5v5 M15.5 3.5v5",
  chart: "M4 20V4 M4 20h16 M8 16v-5 M12 16V8 M16 16v-3",
  flag: "M5 21V4 M5 4h11l-2 4 2 4H5",
  search: "M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13z M15.5 15.5L20 20",
  edit: "M4 20h4L19 9l-4-4L4 16z M13.5 6.5l4 4",
  trash: "M5 7h14 M10 7V4.5h4V7 M7 7l1 13h8l1-13",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4.5 20.5c.9-3.6 3.9-5.5 7.5-5.5s6.6 1.9 7.5 5.5",
  layers: "M12 4l9 5-9 5-9-5z M3 14l9 5 9-5",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9z M12 12.5v-1",
  book: "M5 4.5h10a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3z M5 17a3 3 0 0 1 3-3h10",
  download: "M12 4v11 M7.5 10.5L12 15l4.5-4.5 M5 20h14",
  upload: "M12 15V4 M7.5 8.5L12 4l4.5 4.5 M5 20h14",
  grid: "M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z",
  route: "M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M8 17h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7",
  box: "M4 8l8-4 8 4v8l-8 4-8-4z M4 8l8 4 8-4 M12 12v8",
  bolt: "M13 3L5 13.5h6L10 21l8-10.5h-6z",
  handover: "M4 12h11 M11 7.5L15.5 12 11 16.5 M19 4.5v15",
  bulb: "M9 18h6 M10 21h4 M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.3 1 2.1h5c0-.8.4-1.6 1-2.1A6 6 0 0 0 12 3z",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 13.5l1.6 1.2-2 3.4-1.9-.6a7.6 7.6 0 0 1-2 1.2l-.4 2h-4l-.4-2a7.6 7.6 0 0 1-2-1.2l-1.9.6-2-3.4 1.6-1.2a7.4 7.4 0 0 1 0-2.4L3 9.9l2-3.4 1.9.6a7.6 7.6 0 0 1 2-1.2l.4-2h4l.4 2a7.6 7.6 0 0 1 2 1.2l1.9-.6 2 3.4-1.6 1.2a7.4 7.4 0 0 1 0 2.4z",
  copy: "M8 8h11v12H8z M5 16V4h11",
  history: "M4 12a8 8 0 1 0 2.4-5.7 M4 4v4.5h4.5 M12 8v4l3 2",
  eye: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1 M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
};
export function icon(name, cls) {
  return s("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": 1.8, "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true", class: cls },
    s("path", { d: P[name] || P.right }));
}
export function btn(label, onClick, cls = "", ic = null, attrs = {}) {
  return h("button.btn" + (cls ? "." + cls.split(" ").join(".") : ""), { type: "button", onclick: onClick, ...attrs }, ic ? icon(ic) : null, label);
}
export const ibtn = (ic, label, onClick, attrs = {}) => h("button.ibtn", { type: "button", "aria-label": label, title: label, onclick: onClick, ...attrs }, icon(ic));
export const tag = (tone, text, extra = "") => h("span.tag" + (tone ? "." + tone : "") + (extra ? "." + extra : ""), null, text);
export const num = (v) => h("span.num", null, v);
// <label> doar pentru un control de formular simplu; grupurile de butoane primesc role="group" cu nume propriu.
export function field(label, control, hint, err) {
  const simple = control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement;
  const kids = [h("span", null, label), control, hint ? h("small", null, hint) : null, err ? h("span.err", null, err) : null];
  return simple ? h("label.field", null, kids) : h("div.field", { role: "group", "aria-label": label }, kids);
}
export function input(value, onInput, attrs = {}) {
  return h("input.input", { value: value ?? "", oninput: (e) => onInput?.(e.target.value), ...attrs });
}
export function numInput(value, onInput, attrs = {}) {
  return h("input.input", { value: value ?? "", inputmode: "numeric", pattern: "[0-9]*", autocomplete: "off", oninput: (e) => onInput?.(e.target.value), ...attrs });
}
export function area(value, onInput, attrs = {}) {
  return h("textarea.area", { oninput: (e) => onInput?.(e.target.value), ...attrs }, value ?? "");
}
export function select(options, value, onChange, attrs = {}) {
  const el = h("select.select", { onchange: (e) => onChange(e.target.value), ...attrs },
    options.map(([v, l]) => h("option", { value: v, selected: String(v) === String(value ?? "") }, l)));
  return el;
}
export function seg(options, value, onChange, cls = "") {
  return h("div.seg" + (cls ? "." + cls : ""), { role: "group" }, options.map(([v, l, c]) =>
    h("button", { type: "button", class: c || "", "aria-pressed": String(v === value), onclick: () => onChange(v) }, l)));
}
export function chips(options, value, onChange, label = "Filtre") {
  return h("div.chips", { role: "group", "aria-label": label }, options.map(([v, l]) =>
    h("button", { type: "button", "aria-pressed": String(v === value), onclick: () => onChange(v) }, l)));
}
export function empty(title, text, action) {
  return h("div.empty", null, h("h3", null, title), h("p", null, text), action || null);
}
export const note = (text, tone = "") => h("div.note" + (tone ? "." + tone : ""), { role: tone === "stop" ? "alert" : null }, text);
export function kpi(label, value, detail, tone = "", href = null) {
  const kids = [h("div.l", null, label), h("div.v", null, value), detail ? h("div.d", null, detail) : null];
  return href ? h("a.kpi" + (tone ? "." + tone : ""), { href }, kids) : h("div.kpi" + (tone ? "." + tone : ""), null, kids);
}
export function sect(title, aside) {
  return h("div.sect", null, h("h2", null, title), aside || null);
}
export function item({ title, sub, end, href, onClick, lead, chev = true }) {
  const kids = [lead || null, h("div.main", null, h("div.t.clip", null, title), sub ? h("div.s", null, sub) : null), end ? h("div.end", null, end) : null, chev ? icon("right", "chev") : null];
  if (href) return h("a.item", { href }, kids);
  return h("button.item", { type: "button", onclick: onClick }, kids);
}

// ——— Sheet ———
let sheetStack = [];
export function sheet({ title, body, footer, onClose, wide = false }) {
  const dlg = h("dialog.sheet", { "aria-label": title, style: wide ? { maxWidth: "860px" } : null });
  const close = () => { if (dlg.open) dlg.close(); };
  dlg.append(h("div.sheet-h", null, h("h2", null, title), ibtn("close", "Închide", close)), h("div.sheet-b", null, body));
  if (footer) dlg.append(h("div.sheet-f", null, footer));
  dlg.addEventListener("close", () => { dlg.remove(); sheetStack = sheetStack.filter((x) => x !== dlg); onClose?.(); });
  dlg.addEventListener("click", (e) => { if (e.target === dlg) close(); });
  document.body.append(dlg);
  sheetStack.push(dlg);
  dlg.showModal();
  const first = dlg.querySelector(".sheet-b input, .sheet-b select, .sheet-b textarea");
  if (first && !first.hasAttribute("data-noauto")) setTimeout(() => first.focus({ preventScroll: true }), 30);
  return { close, el: dlg, setBody: (b) => put(dlg.querySelector(".sheet-b"), b) };
}
export const sheetOpen = () => sheetStack.length > 0;
export function confirmSheet(title, text, okLabel = "Confirmă", danger = false) {
  return new Promise((resolve) => {
    let ok = false;
    const sh = sheet({ title, body: h("p", null, text), onClose: () => resolve(ok),
      footer: [btn("Renunță", () => sh.close()), btn(okLabel, () => { ok = true; sh.close(); }, danger ? "danger" : "primary")] });
  });
}
export function promptSheet(title, label, { value = "", required = true, okLabel = "Salvează", multiline = false } = {}) {
  return new Promise((resolve) => {
    let v = value, done = null;
    const ctl = multiline ? area(v, (x) => (v = x)) : input(v, (x) => (v = x));
    const sh = sheet({ title, body: field(label, ctl), onClose: () => resolve(done),
      footer: [btn("Renunță", () => sh.close()), btn(okLabel, () => { if (required && !v.trim()) { ctl.setAttribute("aria-invalid", "true"); ctl.focus(); return; } done = v.trim(); sh.close(); }, "primary")] });
  });
}
// Selector cu căutare (listă lungă: linii, oameni, PN-uri).
export function pick({ title, items, value, onPick, allowNone = false, noneLabel = "Nimic" }) {
  let q = "";
  const list = h("div.list");
  const draw = () => {
    const nq = q.trim().toLowerCase();
    const vis = items.filter((i) => !nq || (i.label + " " + (i.sub || "")).toLowerCase().includes(nq));
    put(list, ...(allowNone ? [item({ title: noneLabel, onClick: () => { onPick(null); sh.close(); }, chev: false })] : []),
      ...vis.map((i) => item({ title: i.label, sub: i.sub, end: i.id === value ? icon("check") : i.end || null, chev: false, onClick: () => { onPick(i.id); sh.close(); } })));
    if (!vis.length) list.append(h("div.item", null, h("div.s", null, "Niciun rezultat.")));
  };
  const search = input("", (v) => { q = v; draw(); }, { placeholder: "Caută…", type: "search", "aria-label": "Caută" });
  const sh = sheet({ title, body: [items.length > 7 ? h("div.search", null, search) : null, list] });
  draw();
  return sh;
}
export function picker(label, items, value, onPick, opts = {}) {
  const cur = items.find((i) => i.id === value);
  return h("div.field", null, h("span", null, label), h("button.picker", { type: "button", onclick: () => pick({ title: label, items, value, onPick, ...opts }) },
    cur ? h("span.clip", null, cur.label) : opts.allowNone && opts.noneLabel ? h("span.clip", null, opts.noneLabel) : h("span.ph", null, opts.placeholder || "Alege…"), icon("down")));
}

// ——— Toast ———
export function toast(text, { undo, err = false, ms = 3800, label = "Anulează" } = {}) {
  let box = document.querySelector(".toasts");
  if (!box) { box = h("div.toasts", { "aria-live": "polite" }); document.body.append(box); }
  const t = h("div.toast" + (err ? ".err" : ""), { role: err ? "alert" : "status" }, h("span", null, text),
    undo ? h("button", { type: "button", onclick: () => { undo(); t.remove(); } }, label) : null);
  box.append(t);
  setTimeout(() => t.remove(), undo ? 6500 : ms);
}

// Tabel cu etichete pe celule: pe telefon devine listă de carduri (clasa stackable).
export function table(headers, rows, { stack = true, onRow } = {}) {
  return h("div.tablewrap", null, h("table.t" + (stack ? ".stackable" : ""), null,
    h("thead", null, h("tr", null, headers.map((x) => h("th", null, x)))),
    h("tbody", null, rows.map((r) => h("tr", onRow ? { onclick: () => onRow(r), style: { cursor: "pointer" } } : null,
      r.cells.map((c, i) => h("td", { "data-label": headers[i], class: c?.cls || null }, c?.v !== undefined ? c.v : c)))))));
}
// Acord numeral: plural(1, "oră", "ore") → „1 oră”; plural(3, …) → „3 ore”.
export const plural = (n, one, many) => n + " " + (n === 1 ? one : many);
