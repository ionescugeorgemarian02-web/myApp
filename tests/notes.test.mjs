import assert from "node:assert/strict";
import test from "node:test";
import { compareNotes, createNote, deadlineState, needsReminder, takeLegacyPageNotes } from "../js/notes.js";

test("o notiță rămâne distinctă în fiecare schimb după migrare", () => {
  const item = {
    id: "preluare", title: "Preiau schimbul", checked: true, notes: "Revin la mentenanță",
    priority: "important", due: "2026-11-23", updated: "2026-11-21T08:00:00Z",
  };
  const current = "2026-11-21 · Schimb 1";
  const earlier = "2026-11-20 · Schimb 3";
  const page = { id: "pagina", blocks: [{
    id: "rutina", type: "routine", key: current, items: [item],
    history: { [earlier]: [{ ...item, notes: "Verific stocul", due: "2026-11-22" }] },
  }] };
  const notes = takeLegacyPageNotes(page);
  assert.deepEqual(notes.map((n) => [n.text, n.source.shiftKey, n.due, n.done]), [
    ["Revin la mentenanță", current, "2026-11-23", false],
    ["Verific stocul", earlier, "2026-11-22", false],
  ]);
  assert.equal(new Set(notes.map((n) => n.id)).size, 2);
  assert.deepEqual(takeLegacyPageNotes(page), []);
});

test("Azi afișează restanțele, termenele de azi și notițele importante deschise", () => {
  const today = "2026-11-21";
  const overdue = createNote("Restantă", null, "normal", "2026-11-20");
  const due = createNote("Astăzi", null, "normal", today);
  const important = createNote("Importantă", null, "important");
  const later = createNote("Mâine", null, "normal", "2026-11-22");
  const done = { ...overdue, done: true };
  const reminders = [important, later, done, due, overdue]
    .filter((n) => needsReminder(n, today)).sort((a, b) => compareNotes(a, b, today));
  assert.deepEqual(reminders, [overdue, due, important]);
});

test("termenul cu oră devine restant după minutul ales, iar cel cu dată la schimbarea zilei", () => {
  const date = "2026-11-21";
  const timed = createNote("Verific piesele", null, "normal", date, "14:05");
  const allDay = { due: date }; // Copie veche, fără câmpul dueTime.
  assert.equal(deadlineState(timed, date, "14:04"), "today");
  assert.equal(deadlineState(timed, date, "14:05"), "today");
  assert.equal(deadlineState(timed, date, "14:06"), "late");
  assert.equal(deadlineState(allDay, date, "23:59"), "today");
  assert.equal(deadlineState(timed, "2026-11-20", "23:59"), "future");
  assert.equal(deadlineState(allDay, "2026-11-22", "00:00"), "late");
  assert.equal(deadlineState({ due: "" }, date, "12:00"), "none");
});

test("la aceeași prioritate, orele apropiate preced termenele pentru întreaga zi", () => {
  const date = "2026-11-21";
  const notes = ["", "17:00", "07:30", "11:15", "18:00"]
    .map((time) => createNote("Termen", null, "normal", date, time))
    .sort((a, b) => compareNotes(a, b, date, "09:00"));
  assert.deepEqual(notes.map((note) => note.dueTime), ["07:30", "11:15", "17:00", "18:00", ""]);
});

test("importul acceptă copii fără oră și respinge o oră nevalidă sau fără dată", async () => {
  globalThis.document = new EventTarget();
  let restore;
  try {
    ({ restore } = await import("../js/store.js"));
  } finally {
    delete globalThis.document;
  }
  const note = createNote("Predare", null, "normal", "2026-11-21", "23:59");
  const read = () => restore(new Blob([JSON.stringify({
    schemaVersion: 1, pages: [], templates: [], settings: { hours: ["06:00", "14:00", "22:00"] }, notes: [note],
  })]));
  assert.equal((await read()).notes[0].dueTime, "23:59");
  delete note.dueTime;
  assert.equal((await read()).notes[0].due, "2026-11-21");
  for (const badTime of ["24:00", "13:60", "8:04", null]) {
    note.dueTime = badTime;
    await assert.rejects(read, /notițe/);
  }
  note.due = "";
  note.dueTime = "08:00";
  await assert.rejects(read, /notițe/);
});
