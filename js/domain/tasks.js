// Action Center: sarcini cu responsabil, termen, verificare și recurență.
import { uid } from "../core/doc.js";
import { addDays } from "../core/time.js";

export const TASK_STATUS = { open: "Deschis", progress: "În lucru", blocked: "Blocat", done: "Finalizat", verified: "Verificat", cancelled: "Anulat" };
export const PRIORITY = { critical: "Critică", high: "Ridicată", normal: "Normală", low: "Scăzută" };
export const SOURCES = {
  manual: "Manual", routine: "Rutină", production: "Producție", incident: "Incident", lpa: "LPA", gemba: "Gemba",
  s5: "5S/6S", hse: "HSE", eightd: "8D", scrap: "Rebut", maintenance: "Mentenanță", kaizen: "Kaizen", firstoff: "First Off", poka: "Poka-Yoke",
};
const NEXT = {
  open: ["progress", "blocked", "done", "cancelled"],
  progress: ["blocked", "done", "cancelled", "open"],
  blocked: ["progress", "cancelled"],
  done: ["verified", "progress"],
  verified: [],
  cancelled: ["open"],
};
export const nextStatuses = (s) => NEXT[s] || [];
export function createTask(list, data, now = new Date()) {
  if (!String(data.title || "").trim()) throw Error("Scrie ce trebuie făcut.");
  const t = {
    id: uid(), title: String(data.title).trim(), desc: data.desc || "", category: data.category || "",
    source: data.source || { type: "manual" }, lineId: data.lineId || null, machineId: data.machineId || null,
    ownerId: data.ownerId || null, dept: data.dept || "", verifierId: data.verifierId || null,
    priority: data.priority || "normal", due: data.due || "", shiftKey: data.shiftKey || null, status: "open",
    notes: data.notes || "", evidence: "", recurrence: data.recurrence || null, seriesId: data.seriesId || null,
    createdAt: now.toISOString(), history: [{ at: now.toISOString(), status: "open" }],
  };
  list.push(t);
  return t;
}
export function setStatus(task, to, now = new Date(), { evidence, reason } = {}) {
  if (!nextStatuses(task.status).includes(to)) throw Error("Tranziție nepermisă.");
  if (to === "verified" && !String(evidence ?? task.evidence ?? "").trim()) throw Error("Verificarea cere o dovadă (ce s-a constatat).");
  if (to === "cancelled" && !String(reason || "").trim()) throw Error("Scrie motivul anulării.");
  if (evidence !== undefined) task.evidence = evidence;
  task.status = to;
  task.history.push({ at: now.toISOString(), status: to, reason: reason || undefined });
  return task;
}
export const isOpen = (t) => !["done", "verified", "cancelled"].includes(t.status);
export const isOverdue = (t, today) => isOpen(t) && !!t.due && t.due < today;
const PR = { critical: 0, high: 1, normal: 2, low: 3 };
export function sortTasks(list, today) {
  return [...list].sort((a, b) => Number(isOverdue(b, today)) - Number(isOverdue(a, today)) || PR[a.priority] - PR[b.priority] ||
    String(a.due || "9999").localeCompare(String(b.due || "9999")));
}
// Recurență: la finalizare se creează instanța următoare; istoricul rămâne pe instanța veche.
export function spawnNext(list, task, now = new Date()) {
  if (!task.recurrence || !task.due) return null;
  const step = { day: 1, week: 7 }[task.recurrence] || 1;
  const seriesId = task.seriesId || task.id;
  const due = addDays(task.due, step);
  if (list.some((t) => t.seriesId === seriesId && t.due === due)) return null;
  task.seriesId = seriesId;
  return createTask(list, { ...task, due, seriesId, source: task.source }, now);
}
