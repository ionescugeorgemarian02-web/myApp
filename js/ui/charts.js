// Grafice SVG fără dependențe. Culorile vin din CSS (clase), deci respectă tema.
import { h, s } from "./kit.js";
import { fmtN, fmtPct } from "../core/num.js";
import { fmtHM } from "../core/time.js";

// Banda de atingere pe oră: run ≥ 100 %, ok ≥ prag, warn < prag, stop < prag − 15, lipsă = hașurat.
export function band(actual, plan, under = 90) {
  if (plan === null || plan === undefined) return "none";
  if (actual === null || actual === undefined) return "missing";
  if (plan === 0) return actual > 0 ? "run" : "zero";
  const p = (actual / plan) * 100;
  return p >= 100 ? "run" : p >= under ? "ok" : p >= under - 15 ? "warn" : "stop";
}
// Rigla schimbului: 8 celule orare, acul orei curente, starea fiecărei ore.
export function ruler(rows, { now, from, to, under = 90, compact = false, onSlot } = {}) {
  const el = h("div.ruler" + (compact ? ".compact" : ""), { role: "img", "aria-label": "Realizarea pe ore în schimb" });
  const cells = h("div.rcells");
  for (const r of rows) {
    const future = r.slot.from > now;
    const cur = now >= r.slot.from && now < r.slot.to;
    const b = r.state === "na" ? "na" : future || (cur && r.actual === null) ? "future" : band(r.actual, r.plan, under);
    const cell = h(onSlot ? "button.rc" : "div.rc", {
      class: "b-" + b + (cur ? " cur" : ""), type: onSlot ? "button" : null, onclick: onSlot ? () => onSlot(r) : null,
      title: r.slot.label + " · plan " + fmtN(r.plan) + " · realizat " + fmtN(r.actual),
      "aria-label": onSlot ? r.slot.label + ", plan " + fmtN(r.plan) + ", realizat " + fmtN(r.actual) : null,
    }, compact ? null : h("span.rh", null, fmtHM(r.slot.from)), compact ? null : h("span.rv.num", null, r.actual === null ? (future ? "" : "—") : fmtN(r.actual)));
    cells.append(cell);
  }
  el.append(cells);
  if (now > from && now < to) {
    const pct = ((now - from) / (to - from)) * 100;
    el.append(h("div.needle", { style: { left: pct + "%" } }));
  }
  return el;
}
const W = 640;
function frame(height, label) {
  return s("svg", { viewBox: `0 0 ${W} ${height}`, class: "chart", role: "img", "aria-label": label });
}
// Plan vs. realizat pe ore + linie cumulată (deltă).
export function planActual(rows, { under = 90 } = {}) {
  const H = 200, pad = 26, bw = (W - pad * 2) / Math.max(1, rows.length);
  const max = Math.max(1, ...rows.map((r) => Math.max(r.plan || 0, r.actual || 0)));
  const y = (v) => H - pad - (v / max) * (H - pad * 2);
  const svg = frame(H, "Plan și realizat pe ore");
  svg.append(s("line", { x1: pad, x2: W - pad, y1: H - pad, y2: H - pad, class: "axis" }));
  rows.forEach((r, i) => {
    const x = pad + i * bw;
    if (r.plan !== null) svg.append(s("rect", { x: x + bw * 0.12, y: y(r.plan), width: bw * 0.76, height: H - pad - y(r.plan), class: "bar-plan" }));
    if (r.actual !== null) svg.append(s("rect", { x: x + bw * 0.26, y: y(r.actual), width: bw * 0.48, height: H - pad - y(r.actual), class: "bar-" + band(r.actual, r.plan, under) }));
    else if (r.slot.to <= new Date()) svg.append(s("rect", { x: x + bw * 0.26, y: H - pad - 6, width: bw * 0.48, height: 6, class: "bar-missing" }));
    svg.append(s("text", { x: x + bw / 2, y: H - 8, class: "lbl", "text-anchor": "middle" }, fmtHM(r.slot.from)));
  });
  return svg;
}
// Cumulat plan vs. realizat (linii).
export function cumulative(rows) {
  const H = 160, pad = 22;
  const max = Math.max(1, ...rows.map((r) => Math.max(r.cumPlan || 0, r.cumActual || 0)));
  const n = rows.length;
  const x = (i) => pad + ((W - pad * 2) * (i + 1)) / n;
  const y = (v) => H - pad - (v / max) * (H - pad * 2);
  const svg = frame(H, "Producție cumulată");
  svg.append(s("line", { x1: pad, x2: W - pad, y1: H - pad, y2: H - pad, class: "axis" }));
  const line = (key, cls) => {
    const pts = rows.map((r, i) => (r[key] === null || (key === "cumActual" && r.actual === null && r.slot.to > new Date()) ? null : [x(i), y(r[key])])).filter(Boolean);
    if (pts.length) svg.append(s("polyline", { points: [[pad, H - pad], ...pts].map((p) => p.join(",")).join(" "), class: cls }));
  };
  line("cumPlan", "ln-plan");
  line("cumActual", "ln-actual");
  return svg;
}
// Bare orizontale (Pareto) cu procent cumulat.
export function paretoBars(rows, { unit = "min", max = 8 } = {}) {
  const list = rows.slice(0, max);
  if (!list.length) return null;
  const top = Math.max(...list.map((r) => r.value));
  return h("div.pareto", null, list.map((r) => h("div.pr", null,
    h("span.pk.clip", { title: r.key }, r.key),
    h("span.pb", null, h("i", { style: { width: (r.value / top) * 100 + "%" } })),
    h("span.pv.num", null, fmtN(r.value) + " " + unit),
    h("span.pc.num", null, fmtPct(r.cum, 0)))));
}
// Distribuția timpului: run / changeover / stop / necunoscut.
export function timeSplit(m) {
  const parts = [["run", m.run, "În funcțiune"], ["change", m.changeover, "Changeover"], ["stop", m.stop + (m.notrunning || 0), "Oprit"], ["unknown", m.unknown, "Fără status"]];
  const tot = parts.reduce((a, p) => a + p[1], 0);
  if (!tot) return null;
  return h("div.split-bar", null,
    h("div.sb", { role: "img", "aria-label": parts.map((p) => p[2] + " " + Math.round(p[1]) + " min").join(", ") },
      parts.filter((p) => p[1] > 0).map((p) => h("i.t-" + p[0], { style: { flexGrow: String(p[1]) } }))),
    h("div.sl", null, parts.filter((p) => p[1] > 0).map((p) => h("span", null, h("i.t-" + p[0]), p[2] + " " + Math.round(p[1]) + " min"))));
}
// Heatmap linie × oră (atingere %).
export function heatmap(lines, { under = 90, onCell } = {}) {
  const cols = lines[0]?.rows.length || 8;
  return h("div.heat", { style: { gridTemplateColumns: "minmax(64px, 96px) repeat(" + cols + ", minmax(28px, 1fr))" } },
    h("span"), (lines[0]?.rows || []).map((r) => h("span.hh.num", null, fmtHM(r.slot.from).slice(0, 2))),
    lines.map((L) => [h("span.hl.clip", null, L.line.name),
      L.rows.map((r) => {
        const b = r.state === "na" ? "na" : r.slot.from > new Date() ? "future" : band(r.actual, r.plan, under);
        return h(onCell ? "button.hc" : "span.hc", { class: "b-" + b, type: onCell ? "button" : null, onclick: onCell ? () => onCell(L, r) : null,
          title: L.line.name + " " + r.slot.label + ": " + (r.plan ? fmtPct(r.actual !== null ? r.actual / r.plan : null, 0) : "fără plan") });
      })]));
}
// Gantt: segmente de stare pe axa schimbului.
export function gantt(rowsData, from, to, { now } = {}) {
  const span = to - from;
  const el = h("div.gantt");
  const hours = [];
  for (let t = from.getTime(); t <= to.getTime(); t += 3600000) hours.push(t);
  el.append(h("div.gx", null, h("span"), h("div.gt", null, hours.map((t) => h("span", { style: { left: ((t - from) / span) * 100 + "%" } }, fmtHM(new Date(t)).slice(0, 2))))));
  for (const r of rowsData) {
    const track = h("div.gtr", null, r.segments.map((g) => h("i.t-" + (g.status === "notrunning" ? "stop" : g.status === "changeover" ? "change" : g.status), {
      style: { left: ((g.from - from) / span) * 100 + "%", width: ((g.to - g.from) / span) * 100 + "%" }, title: g.status + " " + fmtHM(g.from) + "–" + fmtHM(g.to) })),
      (r.blocks || []).map((b) => h("b.gb" + (b.co ? ".co" : ""), { style: { left: ((b.from - from) / span) * 100 + "%", width: ((b.to - b.from) / span) * 100 + "%" }, title: b.label }, b.label)),
      now && now > from && now < to ? h("span.gnow", { style: { left: ((now - from) / span) * 100 + "%" } }) : null);
    el.append(h("div.grow", null, h("span.gl.clip", null, r.label), track));
  }
  return el;
}
// Trend zilnic (OEE etc.) ca puncte + linie, valori lipsă = goluri.
export function trend(points, { label = "Trend", fmt = (v) => fmtPct(v, 0), target = null } = {}) {
  const H = 140, pad = 22;
  const vals = points.map((p) => p.v).filter((v) => v !== null);
  if (!vals.length) return null;
  const max = Math.max(1, ...vals), n = points.length;
  const x = (i) => pad + ((W - pad * 2) * i) / Math.max(1, n - 1);
  const y = (v) => H - pad - (v / max) * (H - pad * 2);
  const svg = frame(H, label);
  svg.append(s("line", { x1: pad, x2: W - pad, y1: H - pad, y2: H - pad, class: "axis" }));
  if (target !== null) svg.append(s("line", { x1: pad, x2: W - pad, y1: y(target), y2: y(target), class: "ln-target" }), s("text", { x: W - pad, y: y(target) - 5, class: "lbl", "text-anchor": "end" }, "țintă " + fmt(target)));
  let seg = [];
  const flush = () => { if (seg.length > 1) svg.append(s("polyline", { points: seg.join(" "), class: "ln-actual" })); seg = []; };
  points.forEach((p, i) => {
    if (p.v === null) { flush(); return; }
    seg.push(x(i) + "," + y(p.v));
    svg.append(s("circle", { cx: x(i), cy: y(p.v), r: 3.5, class: "dot" }, s("title", null, p.label + ": " + fmt(p.v))));
  });
  flush();
  points.forEach((p, i) => { if (i % Math.ceil(n / 7) === 0) svg.append(s("text", { x: x(i), y: H - 6, class: "lbl", "text-anchor": "middle" }, p.label)); });
  return svg;
}
// A / P / Q / OEE ca bare orizontale cu valoare; lipsa are motiv.
export function apq(r) {
  const rows = [["Availability", r?.a, r?.why?.a], ["Performance", r?.p, r?.why?.p], ["Quality", r?.q, r?.why?.q], ["OEE", r?.oee, r?.why?.oee || r?.why?.all]];
  return h("div.apq", null, rows.map(([k, v, why]) => h("div.ar" + (k === "OEE" ? ".oee" : ""), null,
    h("span.ak", null, k),
    h("span.ab", null, v !== null && v !== undefined ? h("i", { style: { width: Math.min(100, v * 100) + "%" } }) : h("i.none")),
    h("span.av.num", null, v !== null && v !== undefined ? fmtPct(v) : "—"),
    v === null || v === undefined ? h("span.aw", null, why || "Date insuficiente") : null)));
}

// Indicatorul OEE: cifra mare, bara 0–100 % și reperul țintei (world class 85 %, configurabil).
export function oeeGauge(r, target = 85, note = "") {
  const v = r?.oee ?? null;
  const b = v === null ? "none" : v * 100 >= target ? "run" : v * 100 >= target - 20 ? "warn" : "stop";
  const gap = v === null ? null : v * 100 - target;
  return h("div.ogauge.ob-" + b, null,
    h("div.og-top", null,
      h("div", null, h("span.og-l", null, "OEE"), h("span.og-v.num", null, v === null ? "—" : fmtN(v * 100, 1) + " %")),
      h("div.og-gap", null, v === null ? h("span", null, r?.why?.oee || r?.why?.all || "Date insuficiente") :
        [h("b.num", null, (gap >= 0 ? "+" : "−") + fmtN(Math.abs(gap), 1) + " pp"), h("span", null, gap >= 0 ? "peste țintă" : "sub țintă")])),
    h("div.og-track", { role: "img", "aria-label": "OEE " + (v === null ? "necunoscut" : fmtN(v * 100, 1) + " %") + ", țintă " + target + " %" },
      v !== null ? h("i.og-fill", { style: { width: Math.min(100, v * 100) + "%" } }) : null,
      h("span.og-target", { style: { left: target + "%" } }, h("small", null, "World class " + target + " %"))),
    h("div.og-scale.num", null, h("span", null, "0"), h("span", null, "50"), h("span", null, "100 %")),
    note ? h("p.og-note", null, note) : null);
}
