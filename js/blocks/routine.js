import { checklist } from "./checklist.js";
import { el, details } from "../ui.js";
export function routine(b, c, compact) {
  let n = checklist(b, c, compact);
  if (!compact) {
    let d = details("Istoricul schimburilor", "hist-" + b.id);
    for (let [k, items] of Object.entries(b.history).reverse()) {
      d.append(
        el("h3", k),
        el(
          "p",
          items
            .filter((i) => i.checked)
            .map((i) => i.title)
            .join(" • ") || "Niciun punct bifat",
        ),
      );
    }
    n.append(d);
  }
  return n;
}
