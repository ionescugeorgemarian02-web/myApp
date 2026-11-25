// Sfaturi generate local, pe telefon, din rezultatele caietului.
// Fiecare regulă pornește de la o cifră din aplicație și propune o acțiune.
// Nu se trimite nimic în afara dispozitivului.
import {
  addDays, weekStart, weekSummary, recurrences, problems, commitments, skippedItems,
  oneOnOnes, skillsCoverage, auditStatus, safetyEvents, shiftRecords, recordKpis,
  baselines, ninetyDays, handoverBlock, problemsBlock, safetyBlock, daysBetween, equipmentList,
} from "./metrics.js";
import { formBlock, formStatus, slotState, linesNow } from "./ept.js";

const LEVEL = { critical: 0, warn: 1, info: 2, good: 3 };
const AREA = { S: 0, Q: 1, D: 2, C: 3, P: 4, E: 5 };
export const AREA_NAMES = {
  S: "Siguranță", Q: "Calitate", D: "Livrare", C: "Cost", P: "Oameni", E: "Execuție",
};
const pct = (v) => (v == null ? "–" : (Math.round(v * 10) / 10).toLocaleString("ro") + "%");
const plural = (n, one, many) => n + " " + (n === 1 ? one : many);
const names = (list) => list.slice(0, 3).join(", ") + (list.length > 3 ? " și alții" : "");
const toPage = (p, key) => (p ? { kind: "page", pageId: p.id, key } : null);

export function advice(data, ctx) {
  const out = [];
  const add = (a) => out.push(a);
  const thisWeek = weekStart(ctx.date);
  const cur = weekSummary(data, ctx, thisWeek);
  const prev = weekSummary(data, ctx, addDays(thisWeek, -7));
  const last14 = addDays(ctx.date, -13);
  const records = shiftRecords(data);
  const recent = records.filter((r) => r.date >= addDays(ctx.date, -20));

  // ——— Siguranță ———
  const events = safetyEvents(data);
  const openIncidents = events.filter((e) => e.type === "incident" && !e.closed);
  if (openIncidents.length)
    add({
      id: "safety-open", level: "critical", area: "S",
      title: plural(openIncidents.length, "incident de siguranță deschis", "incidente de siguranță deschise"),
      text: "Siguranța e primul punct al schimbului. Stabilește acțiunea imediată, responsabilul și anunță-l pe șef.",
      action: { label: "Vezi incidentele", ...toPage(openIncidents[0].p, "row-" + openIncidents[0].r.id) },
    });
  const worked = records.filter((r) => r.date >= last14).length;
  const reports = events.filter((e) => e.date >= last14 && e.date <= ctx.date);
  if (safetyBlock(data) && worked >= 5 && !reports.some((e) => e.type === "near-miss"))
    add({
      id: "safety-no-nearmiss", level: "info", area: "S",
      title: "Nicio raportare de near-miss în 14 zile",
      text: "Zero raportări rareori înseamnă zero riscuri. La ședința de început, cere echipei un exemplu de situație „la limită” și notează-l.",
      action: { label: "Raportează un near-miss", kind: "safety" },
    });
  else if (reports.some((e) => e.type === "near-miss") && !reports.some((e) => e.type === "incident"))
    add({
      id: "safety-culture", level: "good", area: "S",
      title: "Echipa raportează situațiile la limită",
      text: plural(reports.filter((e) => e.type === "near-miss").length, "near-miss raportat", "near-miss raportate") +
        " în 14 zile și niciun incident. Mulțumește public celor care au raportat.",
    });
  for (const a of auditStatus(data, ctx.key))
    if (a.unhandled.length)
      add({
        id: "audit-nok-" + a.b.id, level: "warn", area: "S",
        title: plural(a.unhandled.length, "constatare NOK fără acțiune", "constatări NOK fără acțiune"),
        text: "Din turul pe linie: " + names(a.unhandled.map((x) => x.item.title)) + ". Transformă-le în probleme cu responsabil și termen.",
        action: { label: "Deschide turul", ...toPage(a.p) },
      });

  // ——— Calitate ———
  const base = baselines(data);
  if (cur.kpis.scrapPct != null && prev.kpis.scrapPct != null &&
      cur.kpis.scrapPct - prev.kpis.scrapPct >= 0.5 && cur.kpis.scrapPct >= prev.kpis.scrapPct * 1.3)
    add({
      id: "scrap-up", level: "warn", area: "Q",
      title: "Rebutul a crescut: " + pct(prev.kpis.scrapPct) + " → " + pct(cur.kpis.scrapPct),
      text: "Compară schimburile din această săptămână și caută postul sau materialul comun. Pune piesele suspecte deoparte până la decizia calității.",
      action: { label: "Vezi analiza", kind: "route", route: "Analiză" },
    });

  // ——— Livrare ———
  const lastFive = records.filter((r) => recordKpis(r).planPct != null).slice(-5);
  const missed = lastFive.filter((r) => recordKpis(r).planPct < 100);
  if (lastFive.length >= 4 && missed.length >= 3)
    add({
      id: "plan-missed", level: "warn", area: "D",
      title: "Planul nerealizat în " + missed.length + " din ultimele " + lastFive.length + " schimburi",
      text: "Notează la predare cauza principală a fiecărui minus (oprire, absență, material, calitate). După o săptămână alege cauza cea mai frecventă și atac-o.",
      action: { label: "Deschide predarea", kind: "handover" },
    });
  if (base.planPct?.start != null && cur.kpis.planPct != null && cur.records.length >= 3) {
    const better = cur.kpis.planPct > base.planPct.start;
    add({
      id: "plan-baseline", level: better ? "good" : "info", area: "D",
      title: "Plan realizat: " + pct(cur.kpis.planPct) + " față de " + pct(base.planPct.start) + " la pornire",
      text: better ? "Ești peste valoarea de pornire. Spune echipei ce s-a îmbunătățit și de ce." :
        "Ești sub valoarea de pornire. Verifică în Analiză schimburile cu cel mai mic procent.",
    });
  }

  // ——— Cost: opriri și probleme care revin ———
  for (const rec of recurrences(data, ctx).slice(0, 2))
    add({
      id: "recurrence-" + rec.equipment, level: "warn", area: "C",
      title: rec.equipment + ": " + rec.count + " evenimente în 14 zile",
      text: "Același loc revine. Fă analiza „5 De ce” cu operatorul și mentenanța, apoi verifică eficacitatea acțiunii după 7 zile.",
      action: { label: "Vezi problemele", ...toPage(problemsBlock(data)?.p) },
    });
  if (cur.kpis.downtime != null && prev.kpis.downtime != null && prev.kpis.downtime > 0 &&
      cur.kpis.downtime >= prev.kpis.downtime * 1.25 && cur.kpis.downtime - prev.kpis.downtime >= 30)
    add({
      id: "downtime-up", level: "warn", area: "C",
      title: "Opririle au crescut: " + prev.kpis.downtime + " → " + cur.kpis.downtime + " minute",
      text: "Cere mentenanței lista opririlor din săptămână și notează mașina fiecărei probleme ca să apară clasamentul.",
      action: { label: "Vezi analiza", kind: "route", route: "Analiză" },
    });

  // ——— Oameni ———
  const team = oneOnOnes(data, ctx);
  const never = team.team.filter((x) => x.days == null), stale = team.team.filter((x) => x.days > 30);
  if (team.team.length && (never.length || stale.length))
    add({
      id: "one-on-one", level: never.length > team.team.length / 2 ? "info" : "warn", area: "P",
      title: plural(never.length + stale.length, "om fără discuție 1:1 recentă", "oameni fără discuție 1:1 recentă"),
      text: (never.length ? "Încă nediscutat: " + names(never.map((x) => x.name)) + ". " : "") +
        (stale.length ? "Peste 30 de zile: " + names(stale.map((x) => x.name)) + ". " : "") +
        "Programează 15 minute cu fiecare.",
      action: { label: "Deschide 1:1", ...toPage(team.p) },
    });
  if (team.promisesLate)
    add({
      id: "promises-late", level: "warn", area: "P",
      title: plural(team.promisesLate, "promisiune restantă", "promisiuni restante") + " din discuțiile 1:1",
      text: "Credibilitatea ta crește când revii la timp, chiar și cu „încă nu, dar…”. Spune-i omului stadiul azi.",
      action: { label: "Deschide 1:1", ...toPage(team.p) },
    });
  if (cur.kpis.absencePct != null && prev.kpis.absencePct != null && cur.kpis.absencePct - prev.kpis.absencePct >= 3)
    add({
      id: "absence-up", level: "info", area: "P",
      title: "Absențele au crescut: " + pct(prev.kpis.absencePct) + " → " + pct(cur.kpis.absencePct),
      text: "Verifică dacă sunt concentrate pe un schimb sau un post și cine poate acoperi posturile descoperite.",
      action: { label: "Vezi polivalența", ...toPage(skillsCoverage(data).block?.p) },
    });
  const skills = skillsCoverage(data);
  if (skills.posts.length && skills.team.length && skills.gaps.length)
    add({
      id: "skills-gaps", level: "info", area: "P",
      title: plural(skills.gaps.length, "post acoperit", "posturi acoperite") + " de mai puțin de 2 oameni autonomi",
      text: "La o absență, postul rămâne descoperit: " + names(skills.gaps.map((g) => g.post)) + ". Planifică instruire în pereche.",
      action: { label: "Deschide polivalența", ...toPage(skills.block?.p) },
    });

  // ——— Execuție ———
  const now = commitments(data, ctx.date, ctx.date, ctx);
  if (now.lateOld)
    add({
      id: "late-old", level: "critical", area: "E",
      title: plural(now.lateOld, "termen depășit de peste 7 zile", "termene depășite de peste 7 zile"),
      text: "Fiecare restanță veche trebuie să primească o decizie: o faci azi, o reprogramezi cu o dată reală sau o escaladezi.",
      action: { label: "Vezi restanțele", kind: "route", route: "Azi" },
    });
  const probs = problems(data, ctx);
  const loose = probs.filter((x) => !x.closed && (!x.hasOwner || !x.due));
  if (loose.length)
    add({
      id: "problems-not-smart", level: "warn", area: "E",
      title: plural(loose.length, "problemă fără responsabil sau termen", "probleme fără responsabil sau termen"),
      text: "O acțiune fără om și fără dată rămâne intenție. Completează „Responsabil” și „Termen” pentru: " + names(loose.map((x) => x.label)) + ".",
      action: { label: "Completează", ...toPage(loose[0].p, "row-" + loose[0].r.id) },
    });
  const verify = probs.filter((x) => x.status === "verificare" && x.verifyOn && daysBetween(x.verifyOn, ctx.date) >= 7);
  if (verify.length)
    add({
      id: "verify", level: "info", area: "E",
      title: plural(verify.length, "problemă așteaptă verificarea", "probleme așteaptă verificarea"),
      text: "Au trecut 7 zile de la acțiune. Dacă problema nu s-a repetat, închide-o; dacă s-a repetat, reia analiza cauzei.",
      action: { label: "Verifică", ...toPage(verify[0].p, "row-" + verify[0].r.id) },
    });
  if (cur.commitments.closed >= 3 && cur.commitments.rate === 100)
    add({
      id: "ontime-perfect", level: "good", area: "E",
      title: "Toate cele " + cur.commitments.closed + " angajamente ale săptămânii, închise la termen",
      text: "Disciplina de execuție e vizibilă pentru echipă. Păstrează ritmul revizuirii de vineri.",
    });
  else if (cur.commitments.rate != null && prev.commitments.rate != null && cur.commitments.rate + 15 <= prev.commitments.rate)
    add({
      id: "ontime-drop", level: "warn", area: "E",
      title: "Închiderea la termen a scăzut: " + pct(prev.commitments.rate) + " → " + pct(cur.commitments.rate),
      text: "Pune termene mai realiste sau mai puține angajamente simultan. Revizuiește lista în fiecare dimineață.",
      action: { label: "Vezi analiza", kind: "route", route: "Analiză" },
    });

  // ——— Rutina EPT și liniile (schimbul curent) ———
  const hours = ctx.hours || data.settings.hours;
  const here = { ...ctx, hours };
  const ln = ctx.time ? linesNow(data, here) : null;
  if (ln?.stopped.length)
    add({
      id: "line-stop", level: "critical", area: "D",
      title: ln.stopped.length === 1 ? ln.stopped[0].name + " este oprită" : ln.stopped.length + " linii oprite: " + names(ln.stopped.map((e) => e.name)),
      text: "Notează cauza, anunță mentenanța și superiorul direct dacă afectează planul. Mută operatorii pe posturile cu prioritate A.",
      action: { label: "Deschide liniile", ...toPage(ln.p, "line-" + ln.stopped[0].name) },
    });
  if (ln?.behind.length)
    add({
      id: "line-behind", level: "warn", area: "D",
      title: plural(ln.behind.length, "linie în urma planului", "linii în urma planului") + ": " +
        names(ln.behind.map((e) => e.name + " " + Math.round(e.pace.pace) + "%")),
      text: "Procentul arată ritmul față de cât trebuia produs până acum. Cerințele clientului: o deviație negativă se escaladează imediat. Află cauza (oprire, material, oameni, calitate).",
      action: { label: "Vezi liniile", ...toPage(ln.p, "line-" + ln.behind[0].name) },
    });
  const fb = formBlock(data);
  if (fb && ctx.time) {
    const st = formStatus(fb.b, here);
    if (st.nu)
      add({
        id: "routine-nu", level: "warn", area: "E",
        title: plural(st.nu, "activitate marcată NU", "activități marcate NU") + " în rutina EPT",
        text: "Proces de escaladare: superiorul direct trebuie informat imediat. Scrie motivul la Observații pentru: " + names(st.nuItems.map((i) => i.group)) + ".",
        action: { label: "Deschide fișa", ...toPage(fb.p, "item-" + st.nuItems[0].id) },
      });
    const slots = slotState(fb.b, here);
    if (slots.late.length)
      add({
        id: "two-hour-late", level: "warn", area: "D",
        title: "Verificarea de la " + slots.late[slots.late.length - 1].time + " nu e bifată",
        text: "La fiecare 2 ore verifici cerințele clientului și panourile EPT (norma orară) pe fiecare linie. Treci prin linii, notează realizatul și bifează ora.",
        action: { label: "Fă verificarea", ...toPage(ln?.p || fb.p) },
      });
    const weekday = new Date(ctx.date + "T12:00").getDay();
    if (st.weekPending.length && (weekday === 0 || weekday >= 4))
      add({
        id: "weekly-left", level: "info", area: "E",
        title: plural(st.weekPending.length, "activitate săptămânală nefăcută", "activități săptămânale nefăcute"),
        text: "Până la finalul săptămânii: " + names([...new Set(st.weekPending.map((i) => i.group))]) + ".",
        action: { label: "Deschide fișa", ...toPage(fb.p, "item-" + st.weekPending[0].id) },
      });
  }

  // ——— Rutina și predarea ———
  for (const s of skippedItems(data, ctx).slice(0, 1))
    add({
      id: "skipped-" + s.title, level: "info", area: "E",
      title: "Punct sărit des: „" + s.title + "”",
      text: "Nebifat în " + s.skipped + " din ultimele " + s.seen + " schimburi lucrate. E prea greu de făcut, nu mai e util sau trebuie mutat în alt moment?",
      action: { label: "Ajustează rutina", kind: "routine" },
    });
  const ho = handoverBlock(data);
  const current = records.find((r) => r.key === ctx.key);
  const end = ctx.hours?.[ctx.shift % 3];
  if (ho && end && ctx.time) {
    const minutesLeft = ((Number(end.slice(0, 2)) * 60 + Number(end.slice(3))) -
      (Number(ctx.time.slice(0, 2)) * 60 + Number(ctx.time.slice(3))) + 1440) % 1440;
    if (minutesLeft <= 60 && (!current || current.produced == null))
      add({
        id: "handover-now", level: "warn", area: "E",
        title: "Mai ai " + minutesLeft + " de minute din schimb",
        text: "Completează cifrele predării acum, cât sunt proaspete, apoi trimite rezumatul.",
        action: { label: "Completează predarea", kind: "handover" },
      });
  }
  if (recent.length >= 3 && recent.filter((r) => r.produced == null && r.plan == null).length >= recent.length / 2)
    add({
      id: "numbers-missing", level: "info", area: "E",
      title: "Predările din ultimele 3 săptămâni nu au cifre",
      text: "Completează plan, realizat, rebut și minute de oprire (1 minut pe schimb) ca să apară tendințele și sfaturile pe Livrare, Calitate și Cost.",
      action: { label: "Deschide predarea", kind: "handover" },
    });
  if (!equipmentList(data).length)
    add({
      id: "no-equipment", level: "info", area: "E",
      title: "Adaugă liniile tale",
      text: "Cu lista lor ai tabloul liniilor, poți alege locul fiecărei probleme, iar caietul îți arată ce revine și unde lipsește polivalența.",
      action: { label: "Deschide setările", kind: "settings", key: "settings-line" },
    });

  // ——— Primele 90 de zile ———
  const ninety = ninetyDays(data, ctx);
  if (ninety && !ninety.done && ninety.inDays != null && ninety.inDays <= 5)
    add({
      id: "milestone", level: "info", area: "E",
      title: "Reperul zilei " + ninety.next + " vine în " + plural(ninety.inDays, "zi", "zile"),
      text: "Verifică punctele planului pentru ziua " + ninety.next + " și pregătește cifrele față de valorile de pornire pentru discuția cu șeful.",
      action: { label: "Deschide planul", kind: "plan" },
    });

  if (!out.some((a) => a.level !== "good") && cur.records.length)
    add({
      id: "all-good", level: "good", area: "E",
      title: "Nicio abatere importantă săptămâna aceasta",
      text: "Folosește timpul câștigat pentru o îmbunătățire mică, aleasă împreună cu echipa.",
    });
  return out.sort((a, b) => LEVEL[a.level] - LEVEL[b.level] || AREA[a.area] - AREA[b.area]);
}
