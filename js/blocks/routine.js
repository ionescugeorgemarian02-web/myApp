import { checklist } from "./checklist.js";
import { el, details } from "../ui.js";
export function routine(b, c, compact) {
  let n = checklist(b, c, compact);
  if (!compact) {
    let d = details("Istoricul schimburilor", "hist-" + b.id, "history");
    let entries = Object.entries(b.history).reverse();
    if (!entries.length) d.append(el("p", "Încă nu există schimburi încheiate.", "empty"));
    for (let [k, items] of entries) {
      let done = items.filter((i) => i.checked);
      d.append(
        el("h4", k + " · " + done.length + "/" + items.length),
        el("p", done.map((i) => i.title).join(" • ") || "Niciun punct bifat", "desc"),
      );
    }
    n.append(d);
  }
  return n;
}
