let db,
  writing,
  pending,
  revision = 0;
function status(text, state) {
  const label = document.querySelector("#status");
  if (label.textContent !== text) label.textContent = text;
  label.parentElement.dataset.state = state;
}
function hasThreeTimes(hours) {
  return Array.isArray(hours) && hours.length === 3 &&
    hours.every((h) => typeof h === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(h));
}
export function validHours(hours) {
  return hasThreeTimes(hours) && hours[0] < hours[1] && hours[1] < hours[2];
}
export function migrate(data) {
  // Fiecare versiune viitoare va transforma aici copia anterioară.
  if (
    data?.schemaVersion !== 1 ||
    !Array.isArray(data.pages) ||
    !Array.isArray(data.templates) ||
    !data.settings
  )
    throw Error("Format de caiet necunoscut.");
  const str = (x) => typeof x === "string";
  const validItem = (i) =>
    i &&
    ["id", "title", "details", "ready", "notes", "due"].every((k) =>
      str(i[k]),
    ) &&
    typeof i.checked === "boolean";
  const validBlock = (b) => {
    if (!b || !str(b.title) || !str(b.id)) return false;
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
        return Array.isArray(b.items) && b.items.every(validItem);
      case "journal":
      case "table":
        return (
          Array.isArray(b.cols) &&
          b.cols.every(
            (c) =>
              c &&
              str(c.id) &&
              str(c.name) &&
              ["text", "number", "date", "checkbox", "select"].includes(
                c.type,
              ) &&
              Array.isArray(c.options) && c.options.every(str),
          ) &&
          Array.isArray(b.rows) &&
          b.rows.every(
            (r) => r && str(r.id) && r.values && typeof r.values === "object" &&
              !Array.isArray(r.values) &&
              Object.values(r.values).every((v) =>
                v == null || ["string", "boolean", "number"].includes(typeof v),
              ),
          )
        );
      default:
        return false;
    }
  };
  if (
    ![...data.pages, ...data.templates].every(
      (p) =>
        p &&
        str(p.id) &&
        str(p.title) &&
        Array.isArray(p.blocks) &&
        p.blocks.every(validBlock),
    ) ||
    !hasThreeTimes(data.settings.hours)
  )
    throw Error("Structură incompletă.");
  return data;
}
export async function load(seed) {
  db = await new Promise((ok, no) => {
    let r = indexedDB.open("caiet-sef-schimb", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("local");
    r.onsuccess = () => ok(r.result);
    r.onerror = () => no(r.error);
  });
  let data = await new Promise((ok, no) => {
    let r = db.transaction("local").objectStore("local").get("caiet");
    r.onsuccess = () => ok(r.result);
    r.onerror = () => no(r.error);
  });
  if (data === undefined) {
    data = seed();
    save(data);
    await flush();
  }
  return migrate(data);
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
    tx.objectStore("local").put(data, "caiet");
    tx.oncomplete = resolve;
    tx.onabort = () => reject(tx.error);
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
    status("Salvat", "saved");
  } catch (error) {
    status("Salvare eșuată", "error");
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
export function backup(data) {
  download(
    "caiet-" + new Date().toISOString().slice(0, 10) + ".json",
    JSON.stringify(data, null, 2),
    "application/json",
  );
}
export async function restore(file) {
  const contents = await file.text();
  let parsed;
  try {
    parsed = JSON.parse(contents.replace(/^\uFEFF/, ""));
  } catch {
    throw Error("Alege fișierul JSON descărcat din caiet.");
  }
  const notebook = migrate(parsed);
  if (!validHours(notebook.settings.hours))
    throw Error("Orele schimburilor din copie trebuie să fie în ordine crescătoare.");
  return notebook;
}
