import { day, id, now, validDate } from "./ui.js";

export function createNote(text, source = null, priority = "normal", due = "") {
  return { id: id(), text, priority, due, done: false, createdAt: now(), source };
}

export function needsReminder(note, date = day()) {
  return !note.done && (note.priority === "important" || (note.due !== "" && note.due <= date));
}

function dueGroup(note, date) {
  if (note.due && note.due < date) return 0;
  if (note.due === date) return 1;
  return 2;
}

export function compareNotes(a, b, date = day()) {
  return Number(a.done) - Number(b.done) ||
    dueGroup(a, date) - dueGroup(b, date) ||
    Number(b.priority === "important") - Number(a.priority === "important") ||
    Number(!a.due) - Number(!b.due) ||
    a.due.localeCompare(b.due) ||
    b.createdAt.localeCompare(a.createdAt) ||
    a.id.localeCompare(b.id);
}

// În caietele vechi fiecare punct avea o singură căsuță de notițe.
// Păstrăm și observațiile schimburilor trecute, cu originea și termenul lor.
export function takeLegacyPageNotes(page) {
  const notes = [];
  for (const block of page.blocks) {
    if (block.type !== "checklist" && block.type !== "routine") continue;
    const key = block.type === "routine" && typeof block.key === "string" ? block.key : "";
    const groups = [[key, block.items]];
    if (block.type === "routine")
      for (const entry of Object.entries(block.history)) groups.push(entry);
    for (const [shiftKey, items] of groups) {
      for (const item of items) {
        if (!item.notes.trim()) continue;
        const source = { pageId: page.id, blockId: block.id, itemId: item.id, title: item.title, shiftKey };
        const note = createNote(item.notes, source, item.priority === "important" ? "important" : "normal",
          validDate(item.due) ? item.due : "");
        if (typeof item.updated === "string" && Number.isFinite(Date.parse(item.updated)))
          note.createdAt = new Date(item.updated).toISOString();
        else if (validDate(shiftKey.slice(0, 10)))
          note.createdAt = new Date(shiftKey.slice(0, 10) + "T12:00").toISOString();
        notes.push(note);
        item.notes = "";
      }
    }
  }
  return notes;
}
