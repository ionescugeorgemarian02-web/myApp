import { app } from "./state.js";
import { norm, roDate, showText, toast } from "./ui.js";
import { isClosed, rowLabel } from "./blocks/table.js";
export const progress = (items) =>
  items.filter((i) => i.checked).length + "/" + items.length;
export const active = () => app.data.pages.filter((p) => !p.archived);
// Toate lucrurile cu termen, nebifate sau nerezolvate, cele mai vechi primele.
export function deadlines() {
  let list = [];
  for (let p of active())
    for (let b of p.blocks) {
      for (let i of b.items || [])
        if (i.due && !i.checked)
          list.push({ due: i.due, text: i.title, p, key: "item-" + i.id });
      for (let r of b.rows || []) {
        if (isClosed(b, r)) continue;
        for (let col of b.cols)
          if (
            col.type === "date" &&
            norm(col.name).includes("termen") &&
            r.values[col.id]
          )
            list.push({
              due: r.values[col.id],
              text: rowLabel(b, r),
              p,
              key: "row-" + r.id,
            });
      }
    }
  return list.sort((a, b) => a.due.localeCompare(b.due));
}
// Primul tabel care are câmpul „Stare” (de obicei „Probleme și acțiuni”).
export function problemsTable() {
  for (let p of active())
    for (let b of p.blocks)
      if (b.type === "table" && b.cols.some((c) => norm(c.name) === "stare"))
        return { p, b };
  return null;
}
export function openProblems() {
  let list = [];
  for (let p of active())
    for (let b of p.blocks)
      if (b.type === "table" && b.cols.some((c) => norm(c.name) === "stare"))
        for (let r of b.rows)
          if (!isClosed(b, r) && rowLabel(b, r) !== "Rând fără text")
            list.push({ text: rowLabel(b, r), p, key: "row-" + r.id });
  return list;
}
// Jurnalul de predare (are câmpurile „Data” și „Schimb”) și intrarea curentă.
export function handover() {
  const c = app.current;
  for (let p of active())
    for (let b of p.blocks) {
      if (b.type !== "journal") continue;
      let dateCol = b.cols.find(
          (x) => x.type === "date" && norm(x.name) === "data",
        ),
        shiftCol = b.cols.find((x) => norm(x.name) === "schimb");
      if (!dateCol || !shiftCol) continue;
      let r = [...b.rows]
        .reverse()
        .find(
          (r) =>
            r.values[dateCol.id] === c.workDay &&
            r.values[shiftCol.id] === String(c.shift),
        );
      return { p, b, r, skip: [dateCol.id, shiftCol.id] };
    }
  return null;
}
export function report() {
  const c = app.current,
    h = app.data.settings.hours,
    s = c.shift,
    lines = [
      `Rezumat schimb ${s} (${h[s - 1]}–${h[s % 3]}) · ${roDate(c.workDay, {
        weekday: "long",
        day: "numeric",
        month: "long",
      })}`,
    ];
  let ho = handover();
  if (ho?.r) {
    lines.push("");
    for (let col of ho.b.cols) {
      let v = ho.r.values[col.id];
      if (ho.skip.includes(col.id) || v === "" || v == null || v === false)
        continue;
      lines.push(`• ${col.name}: ${v === true ? "da" : v}`);
    }
  }
  for (let p of active())
    for (let b of p.blocks)
      if (b.type === "routine") {
        lines.push("", `${b.title}: ${progress(b.items)} făcute`);
        for (let i of b.items.filter((i) => !i.checked))
          lines.push(`  – nefăcut: ${i.title}`);
      }
  let probs = openProblems();
  if (probs.length) {
    lines.push("", `Probleme deschise (${probs.length}):`);
    for (let x of probs) lines.push(`  – ${x.text}`);
  }
  let late = deadlines().filter((d) => d.due < c.date);
  if (late.length) {
    lines.push("", `Termene depășite: ${late.length}`);
    for (const d of late) lines.push(`  – ${d.text} · ${roDate(d.due)}`);
  }
  return lines.join("\n");
}
// Pe telefon deschide lista de aplicații (WhatsApp, e-mail…); altfel copiază.
export async function share(text) {
  if (navigator.share)
    try {
      await navigator.share({ text });
      return;
    } catch (e) {
      if (e.name === "AbortError") return;
    }
  try {
    await navigator.clipboard.writeText(text);
    toast("Rezumat copiat – lipește-l în mesaj");
  } catch {
    await showText("Copiază rezumatul", text);
  }
}
