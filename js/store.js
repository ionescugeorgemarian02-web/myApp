import { closureError, handoverStatus, readKey, validInterval } from "./operations.js";
import { takeLegacyPageNotes } from "./notes.js";
import { norm, validDate, toast } from "./ui.js";

let db,
  writing,
  pending,
  revision = 0,
  notebookKey,
  storedRevision;
function status(text, state) {
  const label = document.querySelector("#status");
  if (label.textContent !== text) label.textContent = text;
  label.parentElement.dataset.state = state;
}
function validTime(time) {
  return typeof time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
}
function hasThreeTimes(hours) {
  return Array.isArray(hours) && hours.length === 3 && hours.every(validTime);
}
export function validHours(hours) {
  return hasThreeTimes(hours) && hours[0] < hours[1] && hours[1] < hours[2];
}
export function migrate(data) {
  if (
    data?.schemaVersion !== 1 ||
    !Array.isArray(data.pages) ||
    !Array.isArray(data.templates) ||
    !data.settings
  )
    throw Error("Format de caiet necunoscut.");
  const str = (x) => typeof x === "string";
  const safeId = (x) => str(x) && x.length > 0 && !["__proto__", "constructor", "prototype"].includes(x);
  const unique = (items) => new Set(items.map((item) => item.id)).size === items.length;
  const isObject = (x) => !!x && typeof x === "object" && !Array.isArray(x);
  const validItem = (i) =>
    i &&
    safeId(i.id) && ["title", "details", "ready", "notes", "due"].every((k) =>
      str(i[k]),
    ) &&
    typeof i.checked === "boolean";
  const validBlock = (b) => {
    if (!b || !str(b.title) || !safeId(b.id)) return false;
    switch (b.type) {
      case "section":
        return true;
      case "note":
        return str(b.text);
      case "routine":
        if (
          !b.history ||
          typeof b.history !== "object" ||
          Array.isArray(b.history) ||
          !Object.values(b.history).every((items) => Array.isArray(items) && items.every(validItem))
        )
          return false;
      case "checklist":
        return Array.isArray(b.items) && b.items.every(validItem) && unique(b.items);
      case "journal":
      case "table":
        return (
          Array.isArray(b.cols) &&
          b.cols.every(
            (c) =>
              c &&
              safeId(c.id) &&
              str(c.name) &&
              ["text", "number", "date", "checkbox", "select"].includes(
                c.type,
              ) &&
              Array.isArray(c.options) && c.options.every(str),
          ) &&
          unique(b.cols) && Array.isArray(b.rows) &&
          b.rows.every(
            (r) => r && safeId(r.id) && r.values && typeof r.values === "object" &&
              !Array.isArray(r.values) &&
              Object.values(r.values).every((v) =>
                v == null || ["string", "boolean"].includes(typeof v) || Number.isFinite(v),
              ),
          ) && unique(b.rows) &&
          b.rows.every((r) =>
            (!r.verifiedClosure || !closureError(b, r)) &&
            (readKey(b, r, "prepared") !== true || !handoverStatus(b, r, "prepared")) &&
            (readKey(b, r, "received") !== true || !handoverStatus(b, r, "received")))
        );
      case "audit":
        return Array.isArray(b.items) && b.items.every((i) => i && safeId(i.id) && str(i.title)) &&
          unique(b.items) && isObject(b.runs) && Object.values(b.runs).every((run) => isObject(run) &&
            Object.values(run).every((v) => isObject(v) && ["ok", "nok"].includes(v.s) &&
              (v.problem === undefined || str(v.problem))));
      case "skills":
        return isObject(b.levels) && Object.values(b.levels).every((person) => isObject(person) &&
          Object.values(person).every((level) => [0, 1, 2, 3].includes(level)));
      default:
        return false;
    }
  };
  if (
    ![...data.pages, ...data.templates].every(
      (p) =>
        p &&
        safeId(p.id) &&
        str(p.title) &&
        Array.isArray(p.blocks) &&
        p.blocks.every(validBlock) && unique(p.blocks),
    ) ||
    !hasThreeTimes(data.settings.hours) || !unique(data.pages) || !unique(data.templates)
  )
    throw Error("Structură incompletă.");
  const kpis = data.settings.kpis;
  if (kpis !== undefined && (!isObject(kpis) || !Object.values(kpis).every((kpi) =>
    isObject(kpi) && (kpi.target === null || Number.isFinite(kpi.target)) &&
    ["min", "max"].includes(kpi.direction) && typeof kpi.confirmed === "boolean" &&
    (!kpi.confirmed || kpi.target !== null) && str(kpi.reference))))
    throw Error("Configurația indicatorilor este nevalidă.");
  const skillConfig = data.settings.skillConfig;
  if (skillConfig !== undefined && (!isObject(skillConfig) ||
      !Array.isArray(skillConfig.labels) || skillConfig.labels.length !== 4 ||
      !skillConfig.labels.every((value) => str(value) && value.trim()) ||
      !Array.isArray(skillConfig.requirements) || !skillConfig.requirements.every((r) =>
        isObject(r) && str(r.post) && r.post.trim() && [1, 2, 3].includes(r.shift) &&
        [1, 2, 3].includes(r.level) && Number.isSafeInteger(r.count) && r.count >= 0) ||
      new Set(skillConfig.requirements.map((r) => JSON.stringify([r.shift, r.post]))).size !== skillConfig.requirements.length))
    throw Error("Configurația competențelor este nevalidă.");
  if (data.settings.zone !== undefined && !str(data.settings.zone))
    throw Error("Zona este nevalidă.");
  if (data.intervals !== undefined) {
    if (!Array.isArray(data.intervals) || data.intervals.some((r) => validInterval(r)) ||
        new Set(data.intervals.map((r) => r.id)).size !== data.intervals.length)
      throw Error("Intervalele de producție sunt nevalide.");
    const endByZone = new Map();
    for (const r of [...data.intervals].sort((a, b) => a.start.localeCompare(b.start))) {
      const zone = norm(r.zone);
      if (r.start < (endByZone.get(zone) || "")) throw Error("Copia conține intervale suprapuse.");
      endByZone.set(zone, r.end);
    }
  }
  if (data.settings.privacyAcknowledged !== undefined && data.settings.privacyAcknowledged !== true)
    throw Error("Preferința de confidențialitate este nevalidă.");
  if (data.settings.equipment !== undefined &&
      (!Array.isArray(data.settings.equipment) || !data.settings.equipment.every(str)))
    throw Error("Lista posturilor este nevalidă.");
  if (data.reviews !== undefined && (!isObject(data.reviews) || !Object.values(data.reviews).every((r) =>
    isObject(r) && Array.isArray(r.priorities) && r.priorities.every(str) && str(r.note ?? ""))))
    throw Error("Revizuirile săptămânale sunt nevalide.");
  if (data.notes === undefined) data.notes = [];
  const validSource = (s) => s === null || (s &&
    ["pageId", "blockId", "itemId", "title", "shiftKey"].every((k) => str(s[k])));
  const validNote = (n) => n && str(n.id) && n.id.length > 0 &&
    str(n.text) && n.text.trim().length > 0 && ["normal", "important"].includes(n.priority) &&
    (n.due === "" || validDate(n.due)) &&
    (n.dueTime === undefined || n.dueTime === "" || (n.due && validTime(n.dueTime))) &&
    typeof n.done === "boolean" &&
    str(n.createdAt) && /^\d{4}-\d{2}-\d{2}T/.test(n.createdAt) &&
    Number.isFinite(Date.parse(n.createdAt)) && validSource(n.source);
  if (!Array.isArray(data.notes) || !data.notes.every(validNote) ||
    new Set(data.notes.map((n) => n.id)).size !== data.notes.length)
    throw Error("Lista de notițe este incompletă sau nevalidă.");
  for (const page of data.pages) {
    for (const note of takeLegacyPageNotes(page)) data.notes.push(note);
  }
  return data;
}
export async function load(seed, training = false) {
  notebookKey = training ? "instruire" : "caiet";
  db = await new Promise((ok, no) => {
    let r = indexedDB.open("caiet-sef-schimb", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("local");
    r.onsuccess = () => ok(r.result);
    r.onerror = () => no(r.error);
  });
  const [stored, token] = await new Promise((resolve, reject) => {
    const tx = db.transaction("local");
    const store = tx.objectStore("local");
    const data = store.get(notebookKey);
    const version = store.get(notebookKey + "-revision");
    tx.oncomplete = () => resolve([data.result, version.result]);
    tx.onabort = () => reject(tx.error);
  });
  storedRevision = token;
  let data = stored;
  const previousCount = data?.notes?.length;
  data = migrate(data === undefined ? seed() : data);
  if (data.notes.length !== previousCount) {
    save(data);
    await flush();
  }
  return data;
}
export function save(data) {
  pending = data;
  revision++;
  status("Se salvează…", "pending");
  flush().catch(() => {});
}
export function flush() {
  if (!writing && pending) {
    writing = writePending().finally(() => { writing = null; });
  }
  return writing || Promise.resolve();
}
function writeNotebook(data) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("local", "readwrite");
    const store = tx.objectStore("local");
    const nextRevision = crypto.randomUUID();
    const token = store.get(notebookKey + "-revision");
    let conflict = false;
    token.onsuccess = () => {
      if (token.result !== storedRevision) {
        conflict = true;
        tx.abort();
        return;
      }
      store.put(data, notebookKey);
      store.put(nextRevision, notebookKey + "-revision");
    };
    tx.oncomplete = () => {
      storedRevision = nextRevision;
      resolve();
    };
    tx.onabort = () => reject(conflict
      ? Error("Caietul a fost modificat în altă filă. Descarcă o copie a acestei sesiuni, apoi reîncarcă pagina.")
      : tx.error || Error("Scrierea locală a fost întreruptă."));
  });
}
// Confirmă înlocuirea pe disc înainte ca interfața să afișeze alt caiet.
export async function replaceNotebook(data) {
  await flush();
  await writeNotebook(data);
}
async function writePending() {
  try {
    while (pending) {
      const version = revision;
      await writeNotebook(pending);
      if (version === revision) pending = null;
    }
    status("Salvat pe dispozitiv", "saved");
  } catch (error) {
    status("Modificări nesalvate", "error");
    toast(error.message || "Salvarea locală a eșuat.");
    throw error;
  }
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) flush().catch(() => {});
});
export function persist() {
  return navigator.storage?.persist?.().catch(() => false);
}
export function download(name, text, type) {
  let url = URL.createObjectURL(new Blob([text], { type })),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
export function backup(data, training = false) {
  download(
    (training ? "caiet-INSTRUIRE-" : "caiet-") + new Date().toISOString().slice(0, 10) + ".json",
    JSON.stringify(training ? { ...data, training: true } : data, null, 2),
    "application/json",
  );
}
export async function restore(file, training = false) {
  if (file.size > 32 * 1024 * 1024)
    throw Error("Copia depășește limita de import de 32 MB.");
  const contents = await file.text();
  let parsed;
  try {
    parsed = JSON.parse(contents.replace(/^\uFEFF/, ""));
  } catch {
    throw Error("Alege fișierul JSON descărcat din caiet.");
  }
  if (parsed && parsed.training !== (training ? true : undefined))
    throw Error("Deschide copia în modul în care a fost exportată.");
  const notebook = migrate(parsed);
  if (!validHours(notebook.settings.hours))
    throw Error("Orele schimburilor din copie trebuie să fie în ordine crescătoare.");
  return notebook;
}
