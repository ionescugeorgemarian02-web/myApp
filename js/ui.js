// Construim elementele prin DOM, inclusiv pentru textul introdus de utilizator.
import { app } from "./state.js";
export function el(tag, text = "", cls = "") {
  const n = document.createElement(tag);
  if (text !== "") n.textContent = text;
  if (cls) n.className = cls;
  return n;
}
// Pictograme simple, desenate cu linii (text fix, nu date introduse).
const ICONS = {
  notes: '<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 8h8M8 12h8M8 16h4"/>',
  today:
    '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  folder: '<path d="M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  pages:
    '<path d="M4 19.5V5a2 2 0 0 1 2-2h14v15H6a2 2 0 0 0-2 2zm0 0a2 2 0 0 0 2 2h14"/><path d="M8 7h8M8 11h6"/>',
  chat: '<path d="M4 4h16v12H9l-5 4zM8 8h8M8 12h5"/>',
  settings:
    '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  send: '<path d="M21 3 10 14"/><path d="m21 3-7 18-4-7-7-4z"/>',
  handover:
    '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2.5h6V4M9 10h6M9 14h6M9 18h3"/>',
  alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.5"/>',
  up: '<path d="m18 15-6-6-6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  trash:
    '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  rename: '<path d="M4 7V4h16v3M9 20h6M12 4v16"/>',
  archive:
    '<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v12h14V8M10 12h4"/>',
  template:
    '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 10h16M10 10v10"/>',
  more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  upload: '<path d="M12 15V3M7 8l5-5 5 5M5 21h14"/>',
  table:
    '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16"/>',
  cards:
    '<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/>',
  phone:
    '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="M12 9v4M12 16v.5"/>',
  audit: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="m8.5 11 1.5 1.5 3-3M8.5 17h7"/>',
};
const NS = "http://www.w3.org/2000/svg";
export function icon(name) {
  const s = document.createElementNS(NS, "svg");
  s.setAttribute("viewBox", "0 0 24 24");
  s.setAttribute("aria-hidden", "true");
  s.setAttribute("class", "icon");
  s.innerHTML = ICONS[name] || "";
  return s;
}
export function btn(text, fn, cls = "", ic) {
  const b = el("button", "", cls);
  b.type = "button";
  if (ic) b.append(icon(ic));
  if (text) b.append(el("span", text));
  b.onclick = fn;
  return b;
}
// Buton doar cu pictogramă; textul apare pentru cititoarele de ecran.
export function iconBtn(ic, label, fn, cls = "") {
  const b = btn("", fn, "iconBtn " + cls, ic);
  b.setAttribute("aria-label", label);
  b.title = label;
  return b;
}
export const id = () => crypto.randomUUID(),
  now = () => new Date().toISOString();
export function day(d = new Date()) {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}
export function input(label, value, change, type = "text", options = []) {
  const l = el("label", "", "field"),
    n = el(
      type === "select" ? "select" : type === "area" ? "textarea" : "input",
    );
  if (label) {
    const caption = el("span", label);
    caption.id = "label-" + id();
    n.setAttribute("aria-labelledby", caption.id);
    l.append(caption);
  }
  if (type === "select") for (const v of options) n.add(new Option(v, v));
  else if (type !== "area") n.type = type;
  if (type === "checkbox") {
    n.checked = !!value;
    l.classList.add("inline");
  } else n.value = value ?? "";
  if (type === "area") {
    n.rows = 2;
    const grow = () => {
      if (!n.getClientRects().length) return;
      n.style.height = "auto";
      n.style.height = n.scrollHeight + 2 + "px";
    };
    n.addEventListener("input", grow);
    requestAnimationFrame(grow);
  }
  n.oninput = () => change(type === "checkbox" ? n.checked : n.value);
  l.append(n);
  return l;
}
export function fieldHint(field, text) {
  if (!text) return field;
  const control = field.querySelector("input, textarea, select");
  if (!control.hasAttribute("aria-labelledby") && !control.hasAttribute("aria-label")) {
    const label = field.firstElementChild;
    label.id ||= "label-" + id();
    control.setAttribute("aria-labelledby", label.id);
  }
  const hint = el("span", text, "fieldHelp");
  hint.id = "help-" + id();
  control.setAttribute("aria-describedby", hint.id);
  field.append(hint);
  return field;
}
export function fieldError(control, message) {
  const field = control.closest(".field");
  let hint = field.querySelector(".fieldError");
  if (!hint) {
    hint = el("span", "", "fieldError");
    hint.id = "error-" + id();
    hint.setAttribute("role", "alert");
    field.append(hint);
  }
  hint.hidden = !message;
  hint.textContent = message;
  control.setAttribute("aria-invalid", String(Boolean(message)));
  const descriptions = (control.getAttribute("aria-describedby") || "").split(/\s+/).filter((id) => id && id !== hint.id);
  if (message) descriptions.push(hint.id);
  if (descriptions.length) control.setAttribute("aria-describedby", descriptions.join(" "));
  else control.removeAttribute("aria-describedby");
}
// Secțiune care se deschide la atingere; starea se ține minte cât timp
// aplicația e deschisă, ca să nu se închidă după o bifă.
export function details(label, key, cls = "") {
  const d = el("details", "", cls);
  const s = el("summary");
  if (typeof label === "string") s.textContent = label;
  else s.append(...[label].flat());
  d.append(s);
  if (key) {
    d.dataset.key = key;
    if (app.open.has(key)) d.open = true;
    d.addEventListener("toggle", () =>
      d.open ? app.open.add(key) : app.open.delete(key),
    );
  }
  return d;
}
// Bară de unelte pentru un element dintr-o listă: mutare, duplicare, ștergere.
export function toolsFor(a, x, ctx, { rename, copy } = {}) {
  const bar = el("div", "", "toolbar");
  if (rename)
    bar.append(
      iconBtn("rename", "Redenumește", async () => {
        let s = await ask("Redenumește", x.title);
        if (s?.trim()) {
          x.title = s.trim();
          ctx.refresh();
        }
      }),
    );
  for (const [ic, label, step] of [
    ["up", "Mută mai sus", -1],
    ["down", "Mută mai jos", 1],
  ]) {
    let b = iconBtn(ic, label, () => {
      let i = a.indexOf(x),
        j = i + step;
      if (!a[j]) return;
      [a[i], a[j]] = [a[j], a[i]];
      ctx.refresh();
    });
    b.disabled = !a[a.indexOf(x) + step];
    bar.append(b);
  }
  if (copy)
    bar.append(
      iconBtn("copy", "Duplică", () => {
        a.splice(a.indexOf(x) + 1, 0, copy(x));
        ctx.refresh();
      }),
    );
  bar.append(iconBtn("trash", "Șterge", () => ctx.remove(a, x), "danger"));
  return bar;
}
// Ferestre proprii în locul celor ale browserului.
const dlg = () => document.querySelector("dialog");
export function openDialog(build) {
  return new Promise((resolve) => {
    const d = dlg(),
      form = d.querySelector("form");
    form.method = "dialog";
    form.replaceChildren(...build());
    d.returnValue = "";
    d.setAttribute("aria-label", form.querySelector("h2").textContent);
    d.onclose = () => resolve(d.returnValue);
    d.showModal();
    form.querySelector("input, textarea")?.focus();
  });
}
export function actions(ok, danger) {
  const row = el("div", "", "dlgActions"),
    cancel = el("button", "Renunță", "ghost"),
    okb = el("button", ok, danger ? "primary dangerFill" : "primary");
  cancel.value = "cancel";
  cancel.formNoValidate = true;
  okb.value = "ok";
  // „OK” e primul în pagină ca tasta Enter să-l aleagă; CSS îl afișează în dreapta.
  row.append(okb, cancel);
  return row;
}
export async function ask(title, value = "", ok = "Salvează") {
  let f = el("input");
  f.value = value;
  f.setAttribute("aria-label", title);
  const r = await openDialog(() => [el("h2", title), f, actions(ok)]);
  return r === "ok" ? f.value : null;
}
export async function confirmAsk(title, text = "", ok = "Confirmă", danger) {
  const r = await openDialog(() => [
    el("h2", title),
    ...(text ? [el("p", text)] : []),
    actions(ok, danger),
  ]);
  return r === "ok";
}
export async function confirmShare(text, title = "Rezumatul schimbului") {
  const preview = el("pre", (app.training ? "INSTRUIRE · DATE FICTIVE\n\n" : "") + text, "reportPreview");
  return (await openDialog(() => [
    el("h2", title),
    preview,
    actions("Copiază"),
  ])) === "ok";
}
export async function showText(title, text) {
  let f = el("textarea");
  f.value = text;
  f.readOnly = true;
  f.rows = 12;
  const close = el("button", "Gata", "primary");
  close.value = "ok";
  const row = el("div", "", "dlgActions");
  row.append(close);
  await openDialog(() => [el("h2", title), f, row]);
}
export function toast(text, action, label) {
  const box = document.querySelector("#toasts"),
    t = el("div", "", "toast");
  t.append(el("span", text));
  if (action)
    t.append(
      btn(label, () => {
        action();
        t.remove();
      }),
    );
  box.replaceChildren(t);
  setTimeout(() => t.remove(), action ? 6000 : 2500);
}
// Comparare de text fără diacritice și fără majuscule.
export const norm = (v) =>
  String(v ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
const formatters = new Map();
const shortDate = { day: "numeric", month: "short" };
export function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T12:00");
  return Number.isFinite(date.getTime()) && day(date) === value;
}
export function roDate(iso, opts = shortDate) {
  if (!validDate(iso)) return String(iso ?? "");
  const key = JSON.stringify(opts);
  if (!formatters.has(key)) formatters.set(key, new Intl.DateTimeFormat("ro", opts));
  return formatters.get(key).format(new Date(iso + "T12:00"));
}
