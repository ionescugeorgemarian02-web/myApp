// Grafice mici, desenate local (fără biblioteci), lizibile pe telefon.
// Fiecare grafic are o descriere text pentru cititoarele de ecran.
import { el } from "./ui.js";

const NS = "http://www.w3.org/2000/svg";
export const fmt = (v, digits = 1) =>
  v == null ? "–" : (Math.round(v * 10 ** digits) / 10 ** digits).toLocaleString("ro");

function svg(w, h, cls) {
  const s = document.createElementNS(NS, "svg");
  s.setAttribute("viewBox", `0 0 ${w} ${h}`);
  s.setAttribute("preserveAspectRatio", "none");
  s.setAttribute("class", cls);
  s.setAttribute("aria-hidden", "true");
  return s;
}
function node(tag, attrs) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
}
// Linie mică de tendință; golurile (fără date) întrerup linia.
export function sparkline(values, { baseline = null, better = "up" } = {}) {
  const w = 120, h = 36, pad = 4;
  const s = svg(w, h, "spark");
  const known = values.filter((v) => v != null);
  if (!known.length) return s;
  const all = baseline != null ? [...known, baseline] : known;
  let min = Math.min(...all), max = Math.max(...all);
  if (max === min) { max += 1; min -= 1; }
  const x = (i) => (values.length === 1 ? w / 2 : pad + (i * (w - 2 * pad)) / (values.length - 1));
  const y = (v) => h - pad - ((v - min) * (h - 2 * pad)) / (max - min);
  if (baseline != null)
    s.append(node("line", { x1: 0, x2: w, y1: y(baseline), y2: y(baseline), class: "sparkBase" }));
  let path = "", open = false;
  values.forEach((v, i) => {
    if (v == null) { open = false; return; }
    path += (open ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1);
    open = true;
  });
  s.append(node("path", { d: path, class: "sparkLine" }));
  const lastIndex = values.findLastIndex((v) => v != null);
  s.append(node("circle", { cx: x(lastIndex), cy: y(values[lastIndex]), r: 2.6, class: "sparkDot " + better }));
  return s;
}
// Bare verticale pe schimburi, cu linie de referință (de ex. 100% din plan).
export function bars(items, { ref = null, unit = "", label, warnAbove = null, warnBelow = null, digits = 0 } = {}) {
  const box = el("figure", "", "bars");
  box.setAttribute("role", "img");
  box.setAttribute("aria-label", label + ": " + items.map((i) => i.label + " " + (i.value == null ? "fără date" : fmt(i.value) + unit)).join(", "));
  const known = items.map((i) => i.value).filter((v) => v != null);
  const max = Math.max(ref ?? 0, ...known, 1) * 1.08;
  const plot = el("div", "", "barPlot");
  if (ref != null) {
    const line = el("span", "", "barRef");
    line.style.bottom = (ref / max) * 100 + "%";
    line.append(el("small", fmt(ref, 0) + unit));
    plot.append(line);
  }
  for (const i of items) {
    const col = el("div", "", "barCol");
    const bar = el("span", "", "bar");
    if (i.value == null) bar.classList.add("empty");
    else {
      bar.style.height = Math.max(2, (i.value / max) * 100) + "%";
      if ((warnAbove != null && i.value > warnAbove) || (warnBelow != null && i.value < warnBelow)) bar.classList.add("warn");
      bar.append(el("small", fmt(i.value, digits)));
    }
    col.append(bar);
    plot.append(col);
  }
  const axis = el("div", "", "barAxis");
  for (const i of items) axis.append(el("span", i.label));
  box.append(plot, axis);
  return box;
}
// Bare orizontale (clasament), de ex. evenimente pe post.
export function ranking(items, { unit = "", label } = {}) {
  const list = el("ol", "", "ranking");
  list.setAttribute("aria-label", label);
  const max = Math.max(1, ...items.map((i) => i.value));
  for (const i of items) {
    const li = el("li");
    const bar = el("span", "", "rankBar");
    bar.style.width = (i.value / max) * 100 + "%";
    li.append(el("span", i.label, "rankLabel"), bar, el("strong", fmt(i.value, 0) + unit));
    list.append(li);
  }
  return list;
}
