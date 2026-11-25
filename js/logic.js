import { app } from "./state.js";
import { norm, roDate, validDate, showText, toast } from "./ui.js";
import { isClosed, rowLabel } from "./records.js";
import { shiftRecords, recordKpis, safetyEvents, oneOnOnes, ninetyDays, LINE_STATES } from "./metrics.js";
import { formStatus, linesNow } from "./ept.js";
import { fmt } from "./charts.js";
export const progress = (items) =>
  items.filter((i) => i.checked).length + "/" + items.length;
export const active = () => app.data.pages.filter((p) => !p.archived);
// Toate lucrurile cu termen, nebifate sau nerezolvate, cele mai vechi primele.
export function deadlines() {
  let list = [];
  for (let p of active())
    for (let b of p.blocks) {
      for (let i of b.items || [])
        if (!i.checked && validDate(i.due))
          list.push({ due: i.due, text: i.title, p, key: "item-" + i.id });
      const dueColumns = b.cols?.filter((col) =>
        col.type === "date" && norm(col.name).includes("termen"),
      );
      if (!dueColumns?.length) continue;
      for (let r of b.rows || []) {
        if (isClosed(b, r)) continue;
        for (let col of dueColumns)
          if (validDate(r.values[col.id]))
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
            list.push({ text: rowLabel(b, r), p, key: "row-" + r.id,
              kind: b.cols.some((c) => c.key === "safetyType") ? "Siguranță · deschis" : "Problemă deschisă" });
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
  const rec = shiftRecords(app.data).find((x) => x.key === c.key);
  if (rec) {
    const k = recordKpis(rec), parts = [];
    if (rec.plan != null && rec.produced != null) parts.push("Realizat " + fmt(rec.produced, 0) + " din " + fmt(rec.plan, 0) + " buc (" + fmt(k.planPct) + "%)");
    if (k.scrapPct != null) parts.push("Rebut " + fmt(rec.scrap, 0) + " buc (" + fmt(k.scrapPct) + "%)");
    if (rec.downtime != null) parts.push("Oprire " + fmt(rec.downtime, 0) + " min");
    if (rec.planned != null && rec.present != null) parts.push("Prezenți " + fmt(rec.present, 0) + "/" + fmt(rec.planned, 0));
    if (parts.length) lines.push("", ...parts.map((x) => "▪ " + x));
  }
  const safety = safetyEvents(app.data).filter((e) => e.date === c.workDay);
  if (safety.length) {
    lines.push("", "Siguranță: " + safety.length + " eveniment(e)");
    for (const e of safety) lines.push("  – " + e.label);
  }
  if (ho?.r) {
    lines.push("");
    for (let col of ho.b.cols) {
      let v = ho.r.values[col.id];
      if (ho.skip.includes(col.id) || col.key || v === "" || v == null || v === false)
        continue;
      lines.push(`• ${col.name}: ${v === true ? "da" : v}`);
    }
  }
  const ln = linesNow(app.data, { ...c, hours: h });
  if (ln?.totals.checked) {
    const t = ln.totals;
    lines.push("", `Linii: ${t.ok} OK · ${t.warn} atenție · ${t.stop} oprite` + (t.checked < t.total ? ` · ${t.total - t.checked} neverificate` : ""));
    for (const e of ln.entries.filter((x) => x.st === "stop" || x.st === "warn" || x.obs.trim()))
      lines.push(`  – ${e.name}: ${LINE_STATES[e.st] || "–"}` + (e.real != null ? `, ${fmt(e.real, 0)}${e.plan ? "/" + fmt(e.plan, 0) : ""} buc` : "") +
        (e.reb ? `, rebut ${fmt(e.reb, 0)}` : "") + (e.obs.trim() ? ` – ${e.obs.trim()}` : ""));
  }
  for (let p of active())
    for (let b of p.blocks)
      if (b.type === "routine" && b.form) {
        const st = formStatus(b, c);
        lines.push("", `${b.title}: ${st.da}/${st.total} DA · ${st.nu} NU`);
        for (const i of st.nuItems) lines.push(`  – NU · ${i.group}${i.notes.trim() ? ": " + i.notes.trim() : ""}`);
      } else if (b.type === "routine") {
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

// Raportul săptămânal pentru șef: cifre, comparații, probleme, priorități.
export function weekReport(cur, prev) {
  const data = app.data, c = app.current;
  const pct = (v) => (v == null ? "–" : fmt(v) + "%");
  const arrow = (a, b) => (a == null || b == null ? "" : a > b ? " (▲ față de " + pct(b) + ")" : a < b ? " (▼ față de " + pct(b) + ")" : " (la fel)");
  const k = cur.kpis, pk = prev.kpis;
  const lines = [
    "Raport săptămâna " + cur.number + " · " + roDate(cur.start) + " – " + roDate(cur.end),
    "",
    "Siguranță: " + cur.safety.incidents + " incidente, " + cur.safety.nearMiss + " near-miss, " + cur.safety.observations + " observații",
    "Plan realizat: " + pct(k.planPct) + arrow(k.planPct, pk.planPct),
    "Rebut: " + pct(k.scrapPct) + arrow(k.scrapPct, pk.scrapPct),
    "Minute de oprire: " + (k.downtime == null ? "–" : fmt(k.downtime, 0)) + (pk.downtime != null ? " (săpt. trecută " + fmt(pk.downtime, 0) + ")" : ""),
    "Absențe: " + pct(k.absencePct),
    "Schimburi raportate: " + cur.records.length,
    "",
    "Angajamente închise la termen: " + (cur.commitments.closed ? cur.commitments.onTime + " din " + cur.commitments.closed + " (" + pct(cur.commitments.rate) + ")" : "niciunul cu termen"),
    "Probleme: " + cur.problemsOpened + " noi, " + cur.problemsClosed + " închise, " + openProblems().filter((x) => x.kind === "Problemă deschisă").length + " deschise acum",
  ];
  const one = oneOnOnes(data, c);
  if (one.team.length) lines.push("Discuții 1:1 în ultimele 30 de zile: " + one.team.filter((x) => x.days != null && x.days <= 30).length + " din " + one.team.length);
  const review = data.reviews?.[cur.key];
  const priorities = review?.priorities.filter((p) => p.trim()) || [];
  if (priorities.length) {
    lines.push("", "Prioritățile săptămânii următoare:");
    priorities.forEach((p, i) => lines.push("  " + (i + 1) + ". " + p));
  }
  if (review?.note?.trim()) lines.push("", "Ce am învățat: " + review.note.trim());
  const ninety = ninetyDays(data, c);
  if (ninety && !ninety.done) lines.push("", "Ziua " + ninety.day + " din 90 în funcție.");
  return lines.join("\n");
}
