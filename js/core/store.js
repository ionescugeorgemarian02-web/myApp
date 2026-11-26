// Persistență locală IndexedDB (aceeași bază ca v4.4, cheie nouă „v2”). Datele nu sunt criptate de aplicație.
// Caietul v4.4 („caiet”) rămâne neatins.
import { ensureShape, sanitize } from "./doc.js";

const DB = "caiet-sef-schimb";
let db, key, revision = null, pending = null, writing = null, listener = () => {};
export const onStatus = (fn) => (listener = fn);
function open() {
  return new Promise((ok, no) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore("local");
    r.onsuccess = () => ok(r.result);
    r.onerror = () => no(r.error);
  });
}
function get(k) {
  return new Promise((ok, no) => {
    const tx = db.transaction("local");
    const req = tx.objectStore("local").get(k);
    tx.oncomplete = () => ok(req.result);
    tx.onabort = () => no(tx.error);
  });
}
export async function loadDoc(training) {
  db ||= await open();
  key = training ? "v2-instruire" : "v2";
  const [doc, rev] = await Promise.all([get(key), get(key + "-rev")]);
  revision = rev ?? null;
  return doc === undefined ? null : ensureShape(doc);
}
export const loadLegacy = async () => { db ||= await open(); return get("caiet"); };
function write(doc) {
  return new Promise((ok, no) => {
    const tx = db.transaction("local", "readwrite");
    const st = tx.objectStore("local");
    const next = crypto.randomUUID();
    let conflict = false;
    const r = st.get(key + "-rev");
    r.onsuccess = () => {
      if ((r.result ?? null) !== revision) { conflict = true; tx.abort(); return; }
      st.put(doc, key);
      st.put(next, key + "-rev");
    };
    tx.oncomplete = () => { revision = next; ok(); };
    tx.onabort = () => no(conflict ? Error("Datele au fost modificate în altă filă. Exportă o copie, apoi reîncarcă pagina.") : tx.error || Error("Scrierea locală a eșuat."));
  });
}
export function saveDoc(doc) {
  pending = doc;
  listener("pending");
  return flush();
}
export function flush() {
  if (!writing && pending)
    writing = (async () => {
      try {
        while (pending) { const d = pending; pending = null; await write(d); }
        listener("saved");
      } catch (e) { listener("error", e); throw e; } finally { writing = null; }
    })();
  return writing || Promise.resolve();
}
addEventListener("visibilitychange", () => { if (document.hidden) flush().catch(() => {}); });
export function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
export function exportDoc(doc) {
  download("myapp2-" + (doc.training ? "INSTRUIRE-" : "") + new Date().toISOString().slice(0, 10) + ".json", JSON.stringify(doc), "application/json");
}
export async function readBackup(file, training) {
  if (file.size > 32 * 1024 * 1024) throw Error("Copia depășește limita de 32 MB.");
  let parsed;
  try { parsed = JSON.parse((await file.text()).replace(/^﻿/, "")); } catch { throw Error("Fișierul nu este JSON valid."); }
  const doc = ensureShape(sanitize(parsed));
  if (!!doc.training !== !!training) throw Error("Copia aparține celuilalt mod (" + (doc.training ? "Instruire" : "real") + "). Deschide modul potrivit.");
  return doc;
}
// Înainte de înlocuire, documentul curent se păstrează sub „<cheie>-prev” (o singură copie).
export async function replaceDoc(doc) {
  await flush();
  const prev = await get(key);
  if (prev !== undefined) await new Promise((ok, no) => { const tx = db.transaction("local", "readwrite"); tx.objectStore("local").put(prev, key + "-prev"); tx.oncomplete = ok; tx.onabort = () => no(tx.error); });
  await write(doc);
}
export const loadPrevious = async () => { db ||= await open(); return get(key + "-prev"); };
export function persistStorage() {
  return navigator.storage?.persist?.().catch(() => false);
}
// CSV sigur: valorile care încep cu =, +, -, @ sunt neutralizate (CSV injection).
export function csvCell(v) {
  const t = String(v ?? "");
  const isNumber = typeof v === "number" || /^-?\d+([.,]\d+)?$/.test(t);
  const safe = !isNumber && (/^[\s\uFEFF]*[=+\-@＝＋－＠]/u.test(t) || /^[\t\r\n]/.test(t)) ? "'" + t : t;
  return '"' + safe.replaceAll('"', '""') + '"';
}
export const toCsv = (rows) => "﻿" + rows.map((r) => r.map(csvCell).join(";")).join("\r\n");
