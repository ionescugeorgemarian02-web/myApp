// Rutina EPT Supervisor (fișa de rutină a supervizorului) și liniile din subordine.
// Modul fără DOM: datele fișei, glosarul și calculele folosite de ecrane,
// sfaturi, raport și analiză.
import { id } from "./ui.js";
import { weekKey, linesBlock, lineEntries, lineTotals } from "./metrics.js";

export const SECTIONS = [
  { id: "before", title: "Înainte de începutul schimbului", short: "Înainte", tone: "gray" },
  { id: "start", title: "La începutul schimbului", short: "Început", tone: "yellow" },
  { id: "during", title: "În timpul schimbului", short: "În timpul", tone: "green" },
  { id: "end", title: "La sfârșitul schimbului", short: "Sfârșit", tone: "blue" },
  { id: "rules", title: "Reguli", short: "Reguli", tone: "red" },
];
export const sectionOf = (sec) => SECTIONS.find((s) => s.id === sec) || SECTIONS[2];
export const FREQ_NAMES = { zi: "Zilnic", "2h": "La 2 ore", sapt: "Săptămânal" };
export const ESCALATION =
  "Proces de escaladare: dacă o anumită sarcină nu poate fi îndeplinită, indiferent de motiv, superiorul direct trebuie informat imediat.";

export const LINES = [
  "Fam B1", "Fam B2", "PSA 3", "P6 JLR", "DEGASS", "AMG/CCC", "M282",
  "JLR 663", "GDI", "UFC", "Valve", "PL65 RM", "X90 Audi",
];

const EIP = "Verificarea purtării EIP (mănuși, mânecuțe/jachete, dopuri de urechi, ochelari, bocanci) de către personalul din subordine";
// [secțiune, activitate, ce verifici, frecvență, termen din glosar, etichetă, observație din fișă]
const FORM = [
  ["before", "Întâlnire cu supervizorul de pe schimbul anterior", "Informare cu privire la subiectele actualizate conform planului de producție (calitate, materiale etc.)", "zi"],
  ["before", "Întâlnire cu supervizorul de pe schimbul anterior", "Informare despre proiecte și priorități în toate zonele de lucru", "zi"],
  ["before", "Întâlnire cu supervizorul de pe schimbul anterior", "Probleme și riscuri de defecțiuni", "zi"],
  ["before", "Pregătirea informațiilor pentru schimb și TOP 5", "Revizuiește emailurile pentru reclamații de la clienți și distribuirea alertelor de calitate, cât și instruirea personalului", "zi", "build"],
  ["before", "Pregătirea informațiilor pentru schimb și TOP 5", "Confirmarea Build Schedule / comenzilor (notarea priorităților pentru Top 5 produse/linii/celule)", "zi", "build"],
  ["before", "Pregătirea informațiilor pentru schimb și TOP 5", "Confirmarea disponibilității mașinilor", "zi", "build"],
  ["before", "Pregătirea informațiilor pentru schimb și TOP 5", "Confirmarea inventarului pentru a realiza planul de producție", "zi", "build"],
  ["before", "Stoc blocat", "Verificarea stocului de materiale blocate din ultimele 24 de ore", "zi", "stoc"],
  ["before", "TOP 5", "Asistarea Team Leaderului în pregătirea TOP 5, prin împărtășirea informațiilor deja colectate", "zi", "top5"],
  ["before", "HSE", EIP, "zi", "hse"],
  ["before", "TOP 5", "Asistarea la TOP 5 în una dintre echipe (verificarea informațiilor primite / folosirea documentului de coaching)", "zi", "top5"],
  ["start", "Distribuirea forței de muncă", "Revizuirea forței de muncă", "zi"],
  ["start", "Distribuirea forței de muncă", "Distribuirea operatorilor pe celule/linii după necesitate, în conformitate cu prioritățile", "zi", "prioA"],
  ["start", "Evaluarea rebuturilor", "Participă/conduce ședința de revizuire a rebuturilor/materialelor și reacționează în consecință", "zi", "rebut"],
  ["start", "Indicatori de performanță și reacție", "Efectuarea auditului LPA pe liniile de producție conform planificării", "sapt", "lpa"],
  ["during", "Prima piesă", "Verifică dacă prima piesă a fost realizată, este în locul special dedicat și dacă formularul de First Off este completat corect. Verifică dacă fișele de parametri sunt actualizate.", "zi", "first"],
  ["during", "Cerințele clientului", "Status pentru îndeplinirea cerințelor / comenzilor de producție. Dacă există deviații negative, problema trebuie escaladată.", "2h", "cerinte", "lines"],
  ["during", "Team Leader Routine", "Verifică cel puțin 2 formulare de TL Routine pe schimb", "zi", "tlr"],
  ["during", "Status producție", "Revizuiește panourile EPT, inclusiv norma orară (dacă informația este corectă și acurată), și acționează în consecință", "2h", "ept", "lines"],
  ["during", "Line QPS", "Participă/conduce întâlnirile 8D QPS în funcție de necesitate", "zi", "qps"],
  ["during", "Line QPS", "Revizuiește Line QPS la fiecare celulă, oferă suport sau escaladează dacă este necesar", "zi", "qps"],
  ["during", "EPU TOP 5", "Întâlnire cu EPU Managerul (EPU Top 5 / revizuire scrap / 1 la 1)", "zi", "epu"],
  ["during", "Standardizarea muncii", "Auditarea muncii standardizate cu Team Leaderul (cu fiecare de 2 ori pe săptămână): identificarea variabilităților, găsirea îmbunătățirilor. Notează numele Team Leaderului și ideile.", "zi", "sw"],
  ["during", "HSE", "Verifică echipamentul de protecție", "zi", "hse"],
  ["during", "HSE", "Verificarea zilnică a regulilor de siguranță", "zi", "hse"],
  ["during", "TPM & 5S", "Verifică efectuarea mentenanței autonome pe liniile de producție", "zi", "tpm"],
  ["during", "Calitate", "Măsoară un component (produs): o linie/celulă pe zi", "zi", "q8", "rotation"],
  ["during", "Calitate", "Audit 8 Baze ale Calității", "sapt", "q8"],
  ["during", "Evaluarea performanței cu TL", "Audit SW făcut în timpul săptămânii: verificarea auditurilor făcute de TL și identificarea ideilor de îmbunătățire", "sapt", "sw"],
  ["during", "Evaluarea performanței cu TL", "Verificarea matricelor de calificare pentru liniile de producție și a planului de training", "sapt", "matrice"],
  ["during", "Evaluarea performanței cu TL", "Indicatori de performanță: revizuire și reacție", "sapt"],
  ["during", "Evaluarea performanței cu TL", "Rutinele și dificultățile întâlnite: verifică reacția și escaladarea corectă. Este nevoie de actualizare, având în vedere problema?", "sapt"],
  ["during", "Utilizarea Team Leaderului", "Reacție în caz de absenteism: evită să pui TL mai mult de 1/2 zi pe linie (notează numărul de TL pe linie și timpul petrecut pe linie)", "zi", "tl", "",
    "Din fișă: TL sunt folosiți în linii atunci când este necesar (1 TL are în subordine aproximativ 2 linii)."],
  ["during", "Idei de îmbunătățire", "Câte idei sunt pentru HSE? Este nevoie de o reacție imediată? (da/nu)", "sapt"],
  ["during", "HSE", EIP + ", după reîntoarcerea din pauze", "zi", "hse"],
  ["end", "Raport de schimb", "Completează și actualizează cartea schimbului pentru schimbul următor", "zi", "carte"],
  ["end", "Evaluarea schimbului", "Verifică și semnează formularul de rutină al Team Leaderilor", "zi", "tlr"],
  ["end", "Evaluarea rebutului", "Evaluarea rebuturilor realizate pe parcursul schimbului", "zi", "rebut"],
  ["end", "Verificare WIP pentru schimbul următor", "Verifică dacă sunt suficiente materiale la stațiile de lucru. Dacă nu sunt, oferă suport pentru furnizarea de materiale pentru schimbul următor.", "zi", "wip"],
  ["end", "5S", "Verifică rutina de curățenie a liniilor", "zi", "s5"],
  ["end", "5S", "Verificarea cutiilor roșii: sunt goale și curate", "zi", "s5"],
  ["end", "5S", "Turul de final de schimb, cu EPU Managerul", "zi", "epu"],
  ["end", "Status producție", "Verificarea tuturor datelor: sunt complete și actualizate", "zi", "ept"],
  ["end", "Predarea schimbului", "Pregătește documentul de predare a schimbului", "zi", "carte"],
  ["end", "Predarea schimbului", "Întâlnire cu supervizorul schimbului următor pentru predare", "zi", "carte"],
  ["rules", "Gestionarea posturilor de lucru", "Identificarea locurilor de muncă cu prioritate A și asigurarea numărului de operatori necesari", "zi", "prioA"],
  ["rules", "Disciplina", "Se asigură că operatorii pot munci pe liniile de producție, prin asigurarea materiei prime și funcționarea mașinilor", "zi"],
];

// Explicații generale din industria auto. „intern: true” = termen al fabricii,
// de confirmat cu șeful.
export const GLOSSARY = {
  build: { term: "Build Schedule", text: "Planul de producție pe comenzi: ce produci, cât și în ce ordine. Notezi prioritățile ca să le duci în TOP 5." },
  stoc: { term: "Stoc blocat", text: "Materiale sau piese puse deoparte (blocate), de obicei pentru o suspiciune de calitate. Verifici ce s-a blocat în ultimele 24 de ore, de ce și dacă îți afectează planul (lipsă de material sau piese de re-verificat)." },
  top5: { term: "TOP 5", text: "Ședința scurtă de început de schimb a echipei, condusă de Team Leader, pe câteva subiecte-cheie (de regulă siguranță, calitate, livrare, oameni, probleme). Tu îi dai informațiile adunate înainte de schimb și asiști la una dintre ședințe ca să-l îndrumi (coaching).", intern: true },
  hse: { term: "HSE / EIP", text: "HSE = sănătate, securitate și mediu. EIP = echipament individual de protecție." },
  rebut: { term: "Rebut (scrap)", text: "Piese neconforme, aruncate sau de reparat. La ședința de rebut se discută ce s-a rebutat, de ce și ce acțiune se ia." },
  lpa: { term: "Audit LPA", text: "Layered Process Audit: audit scurt, cu o listă fixă de întrebări, făcut pe linie de mai multe niveluri (TL, supervizor, manager). Verifici dacă procesul se face după standard. Planificarea spune pe ce linie și când." },
  first: { term: "Prima piesă (First Off)", text: "Prima piesă după pornire, schimbare de reper sau reglaj. Se verifică și se păstrează într-un loc dedicat, cu formularul de First Off completat. Fișele de parametri au valorile setate pe mașini (de exemplu la sudură): verifici că sunt la zi." },
  cerinte: { term: "Cerințele clientului", text: "La fiecare 2 ore verifici dacă producția acoperă comenzile. Dacă ești în urmă (deviație negativă), escaladezi imediat." },
  ept: { term: "Panourile EPT / norma orară", text: "Tablele de producție de la linii, unde se notează pe oră ce s-a produs față de normă. Verifici că cifrele sunt corecte și reacționezi la abateri.", intern: true },
  tlr: { term: "TL Routine", text: "Formularul de rutină al Team Leaderului: fișa lui, la nivelul lui. Verifici cel puțin 2 pe schimb (completate, corecte, cu reacție la NU) și le semnezi la final." },
  qps: { term: "QPS / 8D", text: "QPS = Quick Problem Solving, rezolvarea rapidă a problemelor. Line QPS = tabla sau foaia de probleme a liniei. 8D = metoda în 8 pași pentru probleme serioase sau reclamații: echipă, descriere, izolare, cauză, acțiuni, verificare, prevenire, închidere.", intern: true },
  epu: { term: "EPU Manager", text: "Managerul unității de producție de care aparții. Întâlnirea zilnică: TOP 5 pe unitate, revizuirea rebutului și discuția unu la unu. Turul de final de schimb îl faci tot cu el.", intern: true },
  sw: { term: "Muncă standardizată (SW)", text: "Felul stabilit în care se face o operație: pași, ordine, timp. O auditezi împreună cu TL: urmărești operatorul, notezi abaterile (variabilitatea) și ideile de îmbunătățire. Cu fiecare TL de 2 ori pe săptămână." },
  tpm: { term: "TPM și 5S", text: "TPM = Total Productive Maintenance. Mentenanța autonomă = curățare, ungere, strângere și inspecție simplă făcute de operatori după un plan. 5S = sortare, ordonare, curățenie, standardizare, disciplină." },
  q8: { term: "Calitate / 8 Baze", text: "Măsori zilnic un produs de pe o linie, prin rotație (aplicația îți propune linia zilei). „8 Baze ale Calității” e un audit intern: cere lista lui de verificare.", intern: true },
  matrice: { term: "Matrice de calificare", text: "Tabelul cu cine ce posturi știe și la ce nivel. Planul de training spune cine ce trebuie să învețe și până când. În aplicație o ții la pagina „Polivalență”." },
  tl: { term: "Utilizarea Team Leaderului", text: "TL nu trebuie folosit ca operator mai mult de jumătate de schimb, altfel nu-și mai face rutina. Notezi câți TL au lucrat pe linie și cât timp (câmpul „TL pe linie” din Liniile mele)." },
  carte: { term: "Cartea schimbului / predarea", text: "Registrul de predare: ce s-a produs, probleme, mașini oprite, calitate, absențe, ce rămâne de urmărit. În aplicație: pagina „Predare schimb” și butonul „Rezumat”." },
  wip: { term: "WIP", text: "Work In Progress: material și piese aflate în lucru la posturi. La final verifici să rămână suficient material pentru schimbul următor." },
  s5: { term: "Cutiile roșii", text: "Containerele pentru piese neconforme. La final de schimb trebuie să fie goale (piesele evaluate) și curate." },
  prioA: { term: "Posturi cu prioritate A", text: "Posturile critice care trebuie ocupate mereu, cu numărul necesar de operatori. Lista lor trebuie cerută de la șef.", intern: true },
};

export function formItems() {
  return FORM.map(([sec, group, title, freq, term = "", tag = "", hint = ""]) => ({
    id: id(), title, details: hint, ready: "", notes: "", due: "", priority: "normal",
    checked: false, checkedAt: null, no: false, slots: [], problem: "",
    sec, group, freq, term, tag,
  }));
}
export const isForm = (b) => !!b && b.type === "routine" && b.form === "ept";
export function formBlock(data) {
  for (const p of data.pages)
    if (!p.archived) for (const b of p.blocks) if (isForm(b)) return { p, b };
  return null;
}
export const isWeekly = (i) => i.freq === "sapt";
export const dailyItems = (b) => b.items.filter((i) => !isWeekly(i));
export const weeklyItems = (b) => b.items.filter(isWeekly);
// Activitățile săptămânale se bifează o dată pe săptămână, nu pe schimb.
export const weekRead = (b, date) => b.weekly?.[weekKey(date)] || {};
export function weekWrite(b, date) {
  if (!b.weekly || typeof b.weekly !== "object") b.weekly = {};
  return (b.weekly[weekKey(date)] ||= {});
}
// Starea unei activități: "da", "nu" sau "".
export function itemState(b, i, date) {
  if (isWeekly(i)) return weekRead(b, date)[i.id]?.v || "";
  return i.checked ? "da" : i.no ? "nu" : "";
}

// ——— Timpul în schimb ———
const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const toTime = (m) => String(Math.floor(m / 60) % 24).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
export function shiftWindow(hours, shift) {
  const start = toMin(hours[shift - 1]), end = toMin(hours[shift % 3]);
  return { start, len: (end - start + 1440) % 1440 || 1440, from: hours[shift - 1], to: hours[shift % 3] };
}
// Minute trecute din schimb; peste durată înseamnă că schimbul ales n-a început.
export function minutesInto(ctx) {
  const w = shiftWindow(ctx.hours, ctx.shift);
  return (toMin(ctx.time) - w.start + 1440) % 1440;
}
export function shiftClock(ctx) {
  const w = shiftWindow(ctx.hours, ctx.shift);
  // Schimbul încheiat (păstrat până pornești următorul) e socotit complet.
  if (ctx.ended) return { ...w, elapsed: w.len, left: 0, before: false, ended: true };
  const m = minutesInto(ctx);
  if (m >= w.len) return { ...w, elapsed: 0, left: w.len, before: true, startsIn: 1440 - m };
  return { ...w, elapsed: m, left: w.len - m, before: false };
}
export function phaseOf(ctx) {
  const k = shiftClock(ctx);
  if (k.before) return "before";
  if (k.elapsed < 60) return "start";
  if (k.left <= 60) return "end";
  return "during";
}
// Verificările la 2 ore: 2, 4, 6, 8 ore de la începutul schimbului.
export function slotTimes(hours, shift) {
  const w = shiftWindow(hours, shift), out = [];
  for (let m = 120; m <= w.len; m += 120) out.push(toTime(w.start + m));
  return out;
}
export const twoHourItems = (b) => b.items.filter((i) => i.freq === "2h");
export function slotState(b, ctx) {
  const times = slotTimes(ctx.hours, ctx.shift);
  const items = twoHourItems(b);
  const k = shiftClock(ctx);
  const slots = times.map((time, i) => {
    const at = (i + 1) * 120;
    // O activitate marcată DA (sau NU, escaladată) nu mai cere verificarea orei.
    const done = items.length > 0 && items.every((x) => x.checked || x.no || x.slots?.[i]);
    const open = !k.before && !k.ended;
    return { i, time, done, passed: !k.before && k.elapsed >= at, late: open && !done && k.elapsed >= at + 15, soon: open && !done && k.elapsed >= at - 30 && k.elapsed < at + 15 };
  });
  // Verificarea de acum e cea mai recentă oră ajunsă și nebifată.
  const open = slots.filter((s) => s.late || s.soon);
  return { slots, due: open[open.length - 1] || null, next: slots.find((s) => !s.done && !s.passed) || null, late: slots.filter((s) => s.late) };
}
// Marchează (sau anulează) verificarea i pentru toate activitățile de 2 ore.
export function setSlot(b, i, on, total) {
  for (const x of twoHourItems(b)) {
    x.slots = Array.from({ length: total }, (_, k) => !!x.slots?.[k]);
    x.slots[i] = on;
    if (on && x.slots.every(Boolean) && !x.no) {
      x.checked = true;
      x.checkedAt ||= new Date().toISOString();
    }
  }
}

// ——— Situația fișei pe schimbul curent ———
export function formStatus(b, ctx) {
  const daily = dailyItems(b), weekly = weeklyItems(b), week = weekRead(b, ctx.date);
  const bySec = Object.fromEntries(SECTIONS.map((s) => [s.id, { da: 0, nu: 0, total: 0, pending: [] }]));
  for (const i of daily) {
    const s = bySec[i.sec] || bySec.during;
    s.total++;
    if (i.checked) s.da++;
    else if (i.no) s.nu++;
    else s.pending.push(i);
  }
  const da = daily.filter((i) => i.checked).length, nu = daily.filter((i) => i.no).length;
  return {
    da, nu, total: daily.length, open: daily.length - da - nu,
    weekDone: weekly.filter((i) => week[i.id]?.v === "da").length,
    weekNo: weekly.filter((i) => week[i.id]?.v === "nu").length,
    weekTotal: weekly.length,
    weekPending: weekly.filter((i) => !week[i.id]?.v),
    bySec,
    nuItems: daily.filter((i) => i.no),
  };
}
// Ce urmează acum: activitățile nefăcute ale fazei curente, apoi ale celor următoare.
export function nextUp(b, ctx, limit = 3) {
  const st = formStatus(b, ctx);
  const phase = phaseOf(ctx);
  const order = ["before", "start", "during", "end"];
  const at = phase === "before" ? 0 : phase === "start" ? 0 : order.indexOf(phase);
  // Verificările la 2 ore au rândul lor separat (ora de acum), nu intră în listă.
  const pending = (s) => st.bySec[s].pending.filter((i) => i.freq !== "2h");
  const ahead = order.slice(at).flatMap(pending);
  const behind = order.slice(0, at).flatMap(pending);
  return { phase, list: ahead.slice(0, limit), behind, status: st };
}
// Linia pe care se măsoară azi un component (rotație zilnică prin linii).
export function lineOfDay(lines, date) {
  if (!lines.length) return "";
  const d = new Date(date + "T12:00");
  const n = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
  return lines[n % lines.length];
}

// ——— Liniile: ritmul față de plan ———
// În schimbul curent, planul se compară cu ce ar fi trebuit produs până acum.
export function linePace(entry, fraction = 1) {
  if (!(entry.plan > 0) || entry.real == null) return null;
  const expected = entry.plan * Math.min(1, Math.max(0, fraction));
  return {
    pct: (entry.real / entry.plan) * 100,
    expected,
    pace: expected > 0 ? (entry.real / expected) * 100 : null,
  };
}
export function linesNow(data, ctx, key = ctx.key) {
  const lb = linesBlock(data);
  if (!lb) return null;
  const k = key === ctx.key ? shiftClock(ctx) : { before: false, elapsed: 1, len: 1, start: 0 };
  const fraction = k.before ? 0 : k.elapsed / k.len;
  // O linie pornită mai târziu (ex. după 4 ore) are planul raportat la cât a rulat.
  const runFraction = (e) => {
    if (e.st === "off") return 0;
    if (!e.onAt || key !== ctx.key || k.before) return fraction;
    const on = (toMin(e.onAt) - k.start + 1440) % 1440;
    if (on >= k.len) return fraction;
    return Math.max(0, (k.elapsed - on) / Math.max(1, k.len - on));
  };
  const entries = lineEntries(data, key).map((e) => ({ ...e, pace: e.st === "off" ? null : linePace(e, runFraction(e)) }));
  return {
    ...lb, entries, totals: lineTotals(entries), fraction,
    stopped: entries.filter((e) => e.st === "stop"),
    off: entries.filter((e) => e.st === "off"),
    warned: entries.filter((e) => e.st === "warn"),
    behind: fraction >= 0.125 ? entries.filter((e) => e.pace?.pace != null && e.pace.pace < 90) : [],
  };
}
