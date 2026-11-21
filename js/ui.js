// Construim elementele prin DOM, inclusiv pentru textul introdus de utilizator.
export function el(tag, text = "", cls = "") {
  const n = document.createElement(tag);
  if (text !== "") n.textContent = text;
  if (cls) n.className = cls;
  return n;
}
export function btn(text, fn, cls = "") {
  const b = el("button", text, cls);
  b.type = "button";
  b.onclick = fn;
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
  const l = el("label", label),
    n = el(
      type === "select" ? "select" : type === "area" ? "textarea" : "input",
    );
  if (type === "select") for (const v of options) n.add(new Option(v, v));
  else if (type !== "area") n.type = type;
  if (type === "checkbox") n.checked = !!value;
  else n.value = value ?? "";
  n.oninput = () => change(type === "checkbox" ? n.checked : n.value);
  l.append(n);
  return l;
}
export function details(label) {
  const d = el("details");
  d.append(el("summary", label));
  return d;
}
export function toolsFor(a, x, ctx, rename, copy) {
  const d = details("Organizare");
  if (rename)
    d.append(
      btn("Redenumește", () => {
        let s = prompt("Denumire", x.title);
        if (s?.trim()) {
          x.title = s.trim();
          ctx.refresh();
        }
      }),
    );
  if (copy)
    d.append(
      btn("Duplică", () => {
        a.splice(a.indexOf(x) + 1, 0, copy(x));
        ctx.refresh();
      }),
    );
  for (const [label, step] of [
    ["↑ Sus", -1],
    ["↓ Jos", 1],
  ]) {
    let i = a.indexOf(x),
      j = i + step,
      b = btn(label, () => {
        [a[i], a[j]] = [a[j], a[i]];
        ctx.refresh();
      });
    b.disabled = !a[j];
    d.append(b);
  }
  d.append(btn("Șterge", () => ctx.remove(a, x)));
  return d;
}
