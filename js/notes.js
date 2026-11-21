import { day, id, now, validDate } from "./ui.js";

export function createNote(text, source = null, priority = "normal", due = "", dueTime = "") {
  return { id: id(), text, priority, due, dueTime: due ? dueTime : "", done: false, createdAt: now(), source };
}

const localTime = () => new Date().toTimeString().slice(0, 5);

export function deadlineState(note, date = day(), time = localTime()) {
  if (!note.due) return "none";
  if (note.due < date) return "late";
  if (note.due > date) return "future";
  return note.dueTime && note.dueTime < time ? "late" : "today";
}

export function needsReminder(note, date = day(), time = localTime()) {
  const state = deadlineState(note, date, time);
  return !note.done && (note.priority === "important" || state === "late" || state === "today");
}

const dueOrder = { late: 0, today: 1, future: 2, none: 2 };

export function compareNotes(a, b, date = day(), time = localTime()) {
  return Number(a.done) - Number(b.done) ||
    dueOrder[deadlineState(a, date, time)] - dueOrder[deadlineState(b, date, time)] ||
    Number(b.priority === "important") - Number(a.priority === "important") ||
    Number(!a.due) - Number(!b.due) ||
    a.due.localeCompare(b.due) ||
    Number(!a.dueTime) - Number(!b.dueTime) ||
    (a.dueTime || "").localeCompare(b.dueTime || "") ||
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
