// Sincronizează în loc un obiect cu o copie, păstrând identitatea obiectelor existente
// (vederile țin referințe la entități; după rollback ele rămân valide).
export function restoreInto(target, source) {
  if (Array.isArray(target) && Array.isArray(source)) {
    target.length = source.length;
    source.forEach((v, i) => (isPlain(v) && isPlain(target[i]) && Array.isArray(v) === Array.isArray(target[i]) ? restoreInto(target[i], v) : (target[i] = v)));
    return target;
  }
  for (const k of Object.keys(target)) if (!Object.hasOwn(source, k)) delete target[k];
  for (const [k, v] of Object.entries(source))
    if (isPlain(v) && isPlain(target[k]) && Array.isArray(v) === Array.isArray(target[k])) restoreInto(target[k], v); else target[k] = v;
  return target;
}
const isPlain = (x) => !!x && typeof x === "object";
