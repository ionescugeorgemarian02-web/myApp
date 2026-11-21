import assert from "node:assert/strict";
import test from "node:test";
import { compareNotes, createNote, needsReminder, takeLegacyPageNotes } from "../js/notes.js";

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
