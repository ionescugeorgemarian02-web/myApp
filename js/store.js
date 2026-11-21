let db,
  timer,
  pending,
  revision = 0;
const status = (text) => (document.querySelector("#status").textContent = text);
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
          !Object.values(b.history).every(Array.isArray)
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
              Array.isArray(c.options),
          ) &&
          Array.isArray(b.rows) &&
          b.rows.every(
            (r) => r && str(r.id) && r.values && typeof r.values === "object",
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
    !Array.isArray(data.settings.hours) ||
    data.settings.hours.length !== 3 ||
    !data.settings.hours.every((h) => /^([01]\d|2[0-3]):[0-5]\d$/.test(h))
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
  status("Se salvează…");
  clearTimeout(timer);
  timer = setTimeout(() => flush().catch(() => {}), 300);
}
export async function flush() {
  clearTimeout(timer);
  if (!pending) return;
  let version = revision;
  try {
    await new Promise((ok, no) => {
      let tx = db.transaction("local", "readwrite");
      tx.objectStore("local").put(pending, "caiet");
      tx.oncomplete = ok;
      tx.onabort = () => no(tx.error);
    });
    if (version === revision) {
      pending = null;
      status("Salvat");
    }
  } catch (e) {
    status("Salvare eșuată");
    throw e;
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
  return migrate(JSON.parse(await file.text()));
}
