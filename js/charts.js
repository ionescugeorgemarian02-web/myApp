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

// ——— Grafice mari pentru secțiunea Progres ———
// SVG cu proporții fixe (se scalează uniform), cu axe, grilă și valori.
const W = 340, H = 170, L = 34, R = 10, T = 14, B = 24;
function scale(values, { min, max, ref } = {}) {
  const known = values.filter((v) => v != null);
  const extra = [ref].filter((v) => v != null);
  let lo = min ?? Math.min(...known, ...extra), hi = max ?? Math.max(...known, ...extra);
  if (!Number.isFinite(lo)) { lo = 0; hi = 1; }
  if (hi === lo) { hi += Math.max(1, Math.abs(hi) * 0.1); lo -= min == null ? Math.max(1, Math.abs(lo) * 0.1) : 0; }
  const pad = (hi - lo) * 0.12;
  if (min == null) lo -= pad;
  if (max == null) hi += pad;
  if (min == null && lo < 0 && known.every((v) => v >= 0)) lo = 0;
  return { lo, hi, y: (v) => T + (H - T - B) * (1 - (v - lo) / (hi - lo)) };
}
function frame(labels, sc, unit, digits, integer = false) {
  const s = document.createElementNS(NS, "svg");
  s.setAttribute("viewBox", `0 0 ${W} ${H}`);
  s.setAttribute("class", "chart");
  s.setAttribute("aria-hidden", "true");
  for (let i = 0; i <= 3; i++) {
    const v = sc.lo + ((sc.hi - sc.lo) * i) / 3, y = sc.y(v);
    s.append(node("line", { x1: L, x2: W - R, y1: y, y2: y, class: "grid" }));
    const t = node("text", { x: L - 6, y: y + 3.5, class: "axis", "text-anchor": "end" });
    t.textContent = fmt(v, integer ? 0 : Math.abs(sc.hi - sc.lo) < 6 ? Math.max(1, digits) : 0) + (unit === "%" ? "%" : "");
    s.append(t);
  }
  const step = (W - L - R) / labels.length;
  const every = Math.ceil(labels.length / 7);
  labels.forEach((label, i) => {
    if (i % every && i !== labels.length - 1) return;
    const t = node("text", { x: L + step * (i + 0.5), y: H - 7, class: "axis", "text-anchor": "middle" });
    t.textContent = label;
    s.append(t);
  });
  return { s, x: (i) => L + step * (i + 0.5), step };
}
function refLine(s, sc, value, cls, label) {
  if (value == null) return;
  const y = sc.y(value);
  s.append(node("line", { x1: L, x2: W - R, y1: y, y2: y, class: cls }));
  if (!label) return;
  const t = node("text", { x: L + 4, y: y - 4, class: "refLabel " + cls, "text-anchor": "start" });
  t.textContent = label;
  s.append(t);
}
function legend(items) {
  const ul = el("ul", "", "legend");
  for (const [name, cls] of items) {
    const li = el("li");
    li.append(el("span", "", "swatch " + cls), el("span", name));
    ul.append(li);
  }
  return ul;
}
// Linii pe săptămâni, cu valoarea de pornire și ținta (linii punctate).
export function lineChart({ labels, series, unit = "", digits = 1, baseline, target, ref, refLabel, min, max, label }) {
  const fig = el("figure", "", "chartBox");
  const all = series.flatMap((x) => x.values);
  const sc = scale(all, { min, max, ref: [baseline, target, ref].find((v) => v != null) });
  [baseline, target, ref].forEach((v) => { if (v != null) { sc.lo = Math.min(sc.lo, v); sc.hi = Math.max(sc.hi, v); } });
  const { s, x } = frame(labels, sc, unit, digits);
  refLine(s, sc, ref, "refMain", refLabel && ref !== sc.hi ? refLabel : "");
  refLine(s, sc, baseline, "refBase", "pornire " + fmt(baseline, digits) + (unit === "%" ? "%" : ""));
  refLine(s, sc, target, "refTarget", "țintă " + fmt(target, digits) + (unit === "%" ? "%" : ""));
  series.forEach((ser, k) => {
    let d = "", open = false;
    ser.values.forEach((v, i) => {
      if (v == null) { open = false; return; }
      d += (open ? "L" : "M") + x(i).toFixed(1) + " " + sc.y(v).toFixed(1);
      open = true;
    });
    if (k === 0 && series.length === 1) {
      // Zona de sub linie, pentru citire rapidă a nivelului.
      const pts = ser.values.map((v, i) => [v, i]).filter(([v]) => v != null);
      if (pts.length > 1)
        s.append(node("path", { d: `M${x(pts[0][1])} ${H - B}` + pts.map(([v, i]) => `L${x(i)} ${sc.y(v)}`).join("") + `L${x(pts.at(-1)[1])} ${H - B}Z`, class: "area " + ser.cls }));
    }
    s.append(node("path", { d, class: "line " + ser.cls }));
    ser.values.forEach((v, i) => {
      if (v == null) return;
      const last = i === ser.values.findLastIndex((u) => u != null);
      s.append(node("circle", { cx: x(i), cy: sc.y(v), r: last ? 4 : 2.6, class: "dot " + ser.cls + (last ? " last" : "") }));
      if (last) {
        const t = node("text", { x: x(i), y: sc.y(v) - 8, class: "value", "text-anchor": i > labels.length - 2 ? "end" : "middle" });
        t.textContent = fmt(v, digits) + (unit === "%" ? "%" : "");
        s.append(t);
      }
    });
  });
  fig.setAttribute("role", "img");
  fig.setAttribute("aria-label", label + ": " + series.map((ser) => ser.name + " " + ser.values.map((v, i) => labels[i] + " " + (v == null ? "fără date" : fmt(v, digits) + unit)).join(", ")).join("; "));
  fig.append(s);
  if (series.length > 1 || baseline != null || target != null)
    fig.append(legend([...series.map((ser) => [ser.name, ser.cls]), ...(baseline != null ? [["Valoare de pornire", "refBase"]] : []), ...(target != null ? [["Țintă", "refTarget"]] : [])]));
  return fig;
}
// Coloane pe săptămâni: grupate (unele lângă altele) sau stivuite.
export function columnChart({ labels, series, stacked = false, unit = "", label, line }) {
  const fig = el("figure", "", "chartBox");
  const totals = labels.map((_, i) => stacked ? series.reduce((sum, ser) => sum + (ser.values[i] || 0), 0) : Math.max(0, ...series.map((ser) => ser.values[i] || 0)));
  const lineVals = line ? line.values : [];
  // Numărători: axa are doar valori întregi (0, n, 2n, 3n).
  const top = Math.max(0, ...totals, ...lineVals.filter((v) => v != null));
  const hi = Math.max(3, Math.ceil((top * 1.15) / 3) * 3);
  const sc = { lo: 0, hi, y: (v) => T + (H - T - B) * (1 - v / hi) };
  const { s, x, step } = frame(labels, sc, unit, 0, true);
  const bw = Math.min(26, (step * 0.72) / (stacked ? 1 : series.length));
  labels.forEach((_, i) => {
    let base = 0;
    series.forEach((ser, k) => {
      const v = ser.values[i] || 0;
      if (!v) return;
      const x0 = stacked ? x(i) - bw / 2 : x(i) - (bw * series.length) / 2 + k * bw;
      const y1 = sc.y(base + v), y0 = sc.y(base);
      s.append(node("rect", { x: x0 + 0.5, y: y1, width: bw - 1, height: Math.max(1, y0 - y1), rx: 2.5, class: "col " + ser.cls }));
      if (!stacked && v) {
        const t = node("text", { x: x0 + bw / 2, y: y1 - 3, class: "value small", "text-anchor": "middle" });
        t.textContent = fmt(v, 0);
        s.append(t);
      }
      if (stacked) base += v;
    });
    if (stacked && totals[i]) {
      const t = node("text", { x: x(i), y: sc.y(totals[i]) - 3, class: "value small", "text-anchor": "middle" });
      t.textContent = fmt(totals[i], 0);
      s.append(t);
    }
  });
  if (line) {
    let d = "", open = false;
    line.values.forEach((v, i) => {
      if (v == null) { open = false; return; }
      d += (open ? "L" : "M") + x(i) + " " + sc.y(v);
      open = true;
    });
    s.append(node("path", { d, class: "line " + line.cls }));
    line.values.forEach((v, i) => v != null && s.append(node("circle", { cx: x(i), cy: sc.y(v), r: 2.6, class: "dot " + line.cls })));
  }
  fig.setAttribute("role", "img");
  fig.setAttribute("aria-label", label + ": " + labels.map((l, i) => l + " " + series.map((ser) => ser.name + " " + (ser.values[i] || 0)).join(", ")).join("; "));
  fig.append(s, legend([...series.map((ser) => [ser.name, ser.cls]), ...(line ? [[line.name, line.cls]] : [])]));
  return fig;
}
// Inel de progres (0–100%) cu valoarea în mijloc.
export function ring(value, { label, text, sub, cls = "" } = {}) {
  const box = el("div", "", "ring " + cls);
  const r = 34, len = 2 * Math.PI * r, part = value == null ? 0 : Math.max(0, Math.min(100, value)) / 100;
  const s = document.createElementNS(NS, "svg");
  s.setAttribute("viewBox", "0 0 84 84");
  s.setAttribute("aria-hidden", "true");
  s.append(node("circle", { cx: 42, cy: 42, r, class: "ringTrack" }),
    node("circle", { cx: 42, cy: 42, r, class: "ringValue", "stroke-dasharray": len, "stroke-dashoffset": len * (1 - part), transform: "rotate(-90 42 42)" }));
  const mid = el("div", "", "ringText");
  mid.append(el("strong", text ?? (value == null ? "–" : fmt(value, 0) + "%")));
  const wrap = el("div", "", "ringGraphic");
  wrap.append(s, mid);
  box.append(wrap, el("span", label, "ringLabel"));
  if (sub) box.append(el("small", sub, "ringSub"));
  box.setAttribute("role", "img");
  box.setAttribute("aria-label", label + ": " + (text ?? (value == null ? "fără date" : fmt(value, 0) + "%")) + (sub ? ", " + sub : ""));
  return box;
}
