import { el, btn, input, details, id, day, toolsFor, norm } from "./ui.js";
import { load, save, flush, persist, backup, restore } from "./store.js";
import { seed, page, block } from "./seed.js";
import { note } from "./blocks/note.js";
import { section } from "./blocks/section.js";
import { checklist } from "./blocks/checklist.js";
import { table, newRow, isClosed, rowLabel } from "./blocks/table.js";
import { routine } from "./blocks/routine.js";
import { journal } from "./blocks/journal.js";
const VERSION = "1.1";
const main = document.querySelector("main"),
  nav = document.querySelector("nav");
const names = {
  section: "Titlu de secțiune",
  note: "Notiță",
  checklist: "Listă de bifat",
  table: "Tabel",
  routine: "Rutină zilnică",
  journal: "Jurnal",
};
const renderers = { section, note, checklist, table, routine, journal };
let data = await load(seed).catch((e) => {
    main.textContent = "Caietul nu poate fi deschis. " + e.message;
    throw e;
  }),
  undo = null,
  current,
  shiftKey,
  installPrompt = null;
document.addEventListener("click", persist, { once: true });
const standalone = () =>
  matchMedia("(display-mode: standalone)").matches ||
  navigator.standalone === true;
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
// Android/Chrome oferă instalarea printr-un eveniment pe care îl păstrăm.
addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installPrompt = e;
  // Nu redesenăm cât timp utilizatorul scrie într-un câmp.
  if (!document.activeElement?.matches("input, textarea, select")) render();
});
addEventListener("appinstalled", () => {
  installPrompt = null;
  render();
});
async function install() {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice.catch(() => {});
  installPrompt = null;
  render();
}
// Ziua de lucru începe odată cu schimbul 1 și se termină în dimineața următoare.
function clock() {
  const d = new Date(),
    local = day(d),
    time =
      ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2),
    hours = data.settings.hours;
  let automatic = hours.findLastIndex((h) => h <= time) + 1 || 3;
  if (time < hours[0]) d.setDate(d.getDate() - 1);
  let slot = day(d) + "/" + automatic,
    shift = data.settings.slot === slot ? data.settings.shift : automatic;
  return {
    date: local,
    workDay: day(d),
    shift,
    slot,
    key: day(d) + " · Schimb " + shift,
  };
}
// La revenirea într-un schimb deja deschis, recuperăm bifările lui.
function sync() {
  current = clock();
  let dirty = false;
  for (let p of data.pages)
    for (let b of p.blocks)
      if (b.type === "routine" && b.key !== current.key) {
        if (b.key) b.history[b.key] = structuredClone(b.items);
        let previous = b.history[current.key] || [];
        for (let i of b.items) {
          let old = previous.find((x) => x.id === i.id);
          Object.assign(i, {
            checked: old?.checked || false,
            checkedAt: old?.checkedAt || null,
            notes: old?.notes || "",
            updated: old?.updated || null,
          });
        }
        delete b.history[current.key];
        b.key = current.key;
        dirty = true;
      }
  shiftKey = current.key;
  if (dirty) save(data);
}
function persistData() {
  data.pages.forEach((p, i) => (p.order = i));
  save(data);
}
function refresh() {
  persistData();
  render();
}
function remove(a, x) {
  let pos = a.indexOf(x);
  undo = () => {
    a.splice(pos, 0, x);
    undo = null;
    refresh();
  };
  a.splice(pos, 1);
  refresh();
}
function clone(x) {
  let v = structuredClone(x);
  v.id = id();
  return v;
}
const progress = (items) =>
  items.filter((i) => i.checked).length + "/" + items.length;
const active = () => data.pages.filter((p) => !p.archived);
const roDate = (iso, opts = { day: "numeric", month: "short" }) =>
  new Intl.DateTimeFormat("ro", opts).format(new Date(iso + "T12:00"));
function openPage(p) {
  location.hash = "p/" + p.id;
}
function title(text, sub) {
  let h = el("h1", text);
  main.append(h);
  if (sub) main.append(el("p", sub, "sub"));
}
function card(text) {
  let s = el("section", "", "card");
  s.append(el("h2", text));
  return s;
}
function pageView(p, c) {
  main.append(
    btn("‹ Înapoi la pagini", () => (location.hash = "Pagini"), "plain"),
  );
  title((p.emoji ? p.emoji + " " : "") + p.title);
  let manage = toolsFor(data.pages, p, c, true, clone);
  manage.append(
    input("Emoji", p.emoji, (v) => {
      p.emoji = v;
      c.save();
    }),
    btn(p.archived ? "Reactivează pagina" : "Arhivează pagina", () => {
      p.archived = !p.archived;
      refresh();
    }),
    btn("Salvează ca șablon", () => {
      data.templates.push(clone(p));
      refresh();
      alert("Șablon salvat.");
    }),
  );
  main.append(manage);
  for (let b of p.blocks) {
    let s = card(b.title);
    if (b.items) s.append(el("small", progress(b.items) + " bifate"));
    s.append(renderers[b.type](b, c), toolsFor(p.blocks, b, c, true, clone));
    main.append(s);
  }
  let add = details("＋ Adaugă bloc", "add-" + p.id);
  for (let [k, t] of Object.entries(names))
    add.append(
      btn(t, () => {
        let name = prompt("Denumire bloc", t);
        if (name) {
          p.blocks.push(block(k, name));
          refresh();
        }
      }),
    );
  main.append(add);
}
function pages() {
  title("Pagini", "Paginile și șabloanele caietului tău.");
  main.append(
    btn("＋ Pagină nouă", () => {
      let t = prompt("Titlul paginii");
      if (t?.trim()) {
        let p = page(t.trim());
        data.pages.push(p);
        refresh();
        openPage(p);
      }
    }),
  );
  let archived = details("Pagini arhivate", "archived");
  for (let p of data.pages) {
    let items = p.blocks.flatMap((b) => b.items || []),
      b = btn((p.emoji || "▤") + "　" + p.title, () => openPage(p), "pageLink");
    b.append(el("small", items.length ? progress(items) + " bifate　›" : "›"));
    (p.archived ? archived : main).append(b);
  }
  main.append(archived);
  let s = card("Șabloane");
  if (!data.templates.length)
    s.append(el("p", "Poți salva o pagină ca șablon din meniul Organizare."));
  for (let t of data.templates)
    s.append(
      btn("＋ " + t.title, () => {
        let p = clone(t);
        p.archived = false;
        data.pages.push(p);
        refresh();
        openPage(p);
      }),
      btn("Șterge șablonul", () => remove(data.templates, t)),
    );
  main.append(s);
}
// Toate lucrurile cu termen, nebifate sau nerezolvate.
function deadlines() {
  let list = [];
  for (let p of active())
    for (let b of p.blocks) {
      for (let i of b.items || [])
        if (i.due && !i.checked && b.type !== "routine")
          list.push({ due: i.due, text: i.title, p });
      for (let r of b.rows || []) {
        if (isClosed(b, r)) continue;
        for (let col of b.cols)
          if (
            col.type === "date" &&
            norm(col.name).includes("termen") &&
            r.values[col.id]
          )
            list.push({ due: r.values[col.id], text: rowLabel(b, r), p });
      }
    }
  return list.sort((a, b) => a.due.localeCompare(b.due));
}
// Rândurile din tabele care au câmpul „Stare” și nu sunt închise.
function openProblems() {
  let list = [];
  for (let p of active())
    for (let b of p.blocks)
      if (b.type === "table" && b.cols.some((c) => norm(c.name) === "stare"))
        for (let r of b.rows)
          if (!isClosed(b, r) && rowLabel(b, r) !== "Rând fără text")
            list.push({ text: rowLabel(b, r), p });
  return list;
}
// Intrarea din jurnal pentru ziua de lucru și schimbul curent.
function handover() {
  for (let p of active())
    for (let b of p.blocks) {
      if (b.type !== "journal") continue;
      let dateCol = b.cols.find(
          (c) => c.type === "date" && norm(c.name) === "data",
        ),
        shiftCol = b.cols.find((c) => norm(c.name) === "schimb");
      if (!dateCol || !shiftCol) continue;
      let r = [...b.rows]
        .reverse()
        .find(
          (r) =>
            r.values[dateCol.id] === current.workDay &&
            r.values[shiftCol.id] === String(current.shift),
        );
      return { p, b, r, skip: [dateCol.id, shiftCol.id] };
    }
  return null;
}
function report() {
  const h = data.settings.hours,
    s = current.shift,
    lines = [
      `Rezumat schimb ${s} (${h[s - 1]}–${h[s % 3]}) · ${roDate(
        current.workDay,
        { weekday: "long", day: "numeric", month: "long" },
      )}`,
    ];
  let ho = handover();
  if (ho?.r) {
    lines.push("");
    for (let col of ho.b.cols) {
      let v = ho.r.values[col.id];
      if (ho.skip.includes(col.id) || v === "" || v == null || v === false)
        continue;
      lines.push(`• ${col.name}: ${v === true ? "da" : v}`);
    }
  }
  for (let p of active())
    for (let b of p.blocks)
      if (b.type === "routine") {
        let left = b.items.filter((i) => !i.checked);
        lines.push("", `${b.title}: ${progress(b.items)} făcute`);
        for (let i of left) lines.push(`  – nefăcut: ${i.title}`);
      }
  let probs = openProblems();
  if (probs.length) {
    lines.push("", `Probleme deschise (${probs.length}):`);
    for (let x of probs.slice(0, 5)) lines.push(`  – ${x.text}`);
  }
  let late = deadlines().filter((d) => d.due < current.date);
  if (late.length) lines.push("", `Termene depășite: ${late.length}`);
  return lines.join("\n");
}
async function share(text) {
  if (navigator.share)
    try {
      await navigator.share({ text });
      return;
    } catch (e) {
      if (e.name === "AbortError") return;
    }
  try {
    await navigator.clipboard.writeText(text);
    alert("Rezumatul a fost copiat. Lipește-l în mesaj (WhatsApp, e-mail).");
  } catch {
    prompt("Copiază rezumatul:", text);
  }
}
function today(c) {
  title(
    "Azi",
    new Intl.DateTimeFormat("ro", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date()),
  );
  if (installPrompt && !standalone())
    main.append(
      btn("⤓ Instalează caietul pe telefon", install, "install"),
    );
  const hero = el("section", "", "hero"),
    h = data.settings.hours;
  hero.append(
    el("small", "●　 SCHIMB CURENT"),
    el("h2", "Schimbul " + current.shift),
    el("p", "◷　" + h[current.shift - 1] + " – " + h[current.shift % 3]),
  );
  let shifts = el("div", "", "shifts");
  for (let i = 1; i <= 3; i++)
    shifts.append(
      btn(
        "Schimb " + i,
        () => {
          data.settings.slot = current.slot;
          data.settings.shift = i;
          refresh();
        },
        i === current.shift ? "chosen" : "",
      ),
    );
  hero.append(shifts);
  main.append(hero);
  let recent = [];
  for (let p of active())
    for (let b of p.blocks) {
      if (b.type === "routine") {
        let s = card(b.title);
        s.classList.add("routine");
        let done = b.items.filter((i) => i.checked).length;
        s.append(el("span", progress(b.items) + " bifate", "count"));
        let bar = el("progress");
        bar.max = b.items.length || 1;
        bar.value = done;
        bar.setAttribute("aria-label", "Progres rutină");
        s.append(bar, routine(b, c, true));
        main.append(s);
      }
      if (b.type === "note" && b.text) recent.push([b.updated, b.text, p]);
      for (let i of b.items || [])
        if (i.notes) recent.push([i.updated, i.notes, p]);
    }
  // Predarea schimbului și rezumatul pentru șef.
  let s = card("Predarea schimbului"),
    ho = handover();
  if (ho && !ho.r) {
    s.append(
      el("p", "Nu ai completat încă predarea pentru schimbul acesta."),
      btn("＋ Completează predarea", () => {
        newRow(ho.b, current);
        persistData();
        openPage(ho.p);
      }),
    );
  } else if (ho)
    s.append(
      el("p", "Predarea pentru schimbul acesta este începută."),
      btn("Deschide predarea ›", () => openPage(ho.p)),
    );
  let preview = details("Vezi rezumatul", "report");
  preview.append(el("pre", report(), "report"));
  s.append(
    btn("✉ Trimite rezumatul către șef", () => share(report()), "primary"),
    preview,
  );
  main.append(s);
  // Termene: restante și pentru azi.
  let all = deadlines(),
    late = all.filter((d) => d.due < current.date),
    now = all.filter((d) => d.due === current.date);
  s = card("Termene");
  if (!late.length && !now.length)
    s.append(el("p", "Niciun termen restant sau pentru azi."));
  for (let [list, tag, cls] of [
    [late, "", "late"],
    [now, "azi", "todayTag"],
  ])
    for (let d of list) {
      let b = btn("", () => openPage(d.p), "pageLink");
      let label = el("span", d.text);
      b.append(
        label,
        el("small", (tag || "restant · " + roDate(d.due)) + "　›", cls),
      );
      s.append(b);
    }
  main.append(s);
  let probs = openProblems();
  if (probs.length) {
    s = card("Probleme deschise");
    s.append(el("span", String(probs.length), "count"));
    for (let x of probs.slice(0, 6))
      s.append(btn(x.text + "　›", () => openPage(x.p), "pageLink"));
    main.append(s);
  }
  s = card("Ultimele notițe");
  recent = recent
    .sort((a, b) => String(b[0]).localeCompare(String(a[0])))
    .slice(0, 5);
  if (!recent.length) s.append(el("p", "Nu ai scris încă notițe."));
  for (let [, v, p] of recent)
    s.append(btn(v + " ›", () => openPage(p), "pageLink"));
  main.append(s);
}
function search() {
  title("Căutare");
  let results = el("div");
  main.append(
    input(
      "Caută în toate paginile",
      "",
      (q) => {
        results.replaceChildren();
        if (!q.trim()) return;
        for (const p of data.pages) {
          let texts = [
            p.title,
            ...p.blocks.flatMap((b) => [
              b.title,
              b.text,
              ...(b.items || []).flatMap((i) => [
                i.title,
                i.notes,
                i.ready,
                i.details,
                i.due,
              ]),
              ...(b.cols || []).map((c) => c.name),
              ...(b.rows || []).flatMap((r) => Object.values(r.values)),
            ]),
          ];
          let match = texts.find(
            (t) => t && typeof t !== "boolean" && norm(t).includes(norm(q)),
          );
          if (match)
            results.append(
              btn(
                (p.archived ? "[arhivată] " : "") + p.title + "　›",
                () => openPage(p),
                "pageLink",
              ),
              el("p", String(match), "match"),
            );
        }
        if (!results.childElementCount)
          results.append(el("p", "Niciun rezultat."));
      },
      "search",
    ),
    results,
  );
}
function settings() {
  title("Setări");
  let s = card("Aplicația pe telefon");
  if (standalone())
    s.append(el("p", "✓ Caietul rulează ca aplicație instalată."));
  else if (installPrompt)
    s.append(btn("⤓ Instalează pe telefon", install, "primary"));
  else
    s.append(
      el(
        "p",
        isIOS
          ? "Pe iPhone: deschide pagina în Safari, apasă Partajare (pătratul cu săgeată) → „Adaugă pe ecranul principal”."
          : "Pe Android: în Chrome apasă ⋮ (sus, dreapta) → „Adaugă pe ecranul de pornire” → Instalează.",
      ),
    );
  let st = el("p", "Stocare: se verifică…");
  s.append(st, el("p", "Versiunea " + VERSION));
  navigator.storage?.persisted?.().then(
    (ok) =>
      (st.textContent = ok
        ? "✓ Stocare persistentă acordată – telefonul nu șterge datele singur."
        : "Stocare obișnuită – fă backup regulat (Exportă JSON)."),
    () => (st.textContent = ""),
  ) ?? (st.textContent = "");
  main.append(s);
  s = card("Afișare");
  s.append(
    input(
      "Temă",
      data.settings.theme,
      (v) => {
        data.settings.theme = v;
        refresh();
      },
      "select",
      ["Automat", "Luminoasă", "Întunecată"],
    ),
  );
  main.append(s);
  s = card("Orele schimburilor");
  data.settings.hours.forEach((h, i) =>
    s.append(
      input(
        "Început schimb " + (i + 1),
        h,
        (v) => {
          let hours = [...data.settings.hours];
          hours[i] = v;
          if (v && hours[0] < hours[1] && hours[1] < hours[2]) {
            data.settings.hours = hours;
            refresh();
          } else {
            alert("Orele de început trebuie să fie în ordine crescătoare.");
            render();
          }
        },
        "time",
      ),
    ),
  );
  main.append(s);
  s = card("Copie de siguranță");
  if (data.settings.backup)
    s.append(
      el(
        "p",
        "Ultimul backup: " +
          new Date(data.settings.backup).toLocaleDateString("ro"),
      ),
    );
  s.append(
    btn("Exportă JSON", () => {
      data.settings.backup = Date.now();
      persistData();
      backup(data);
      render();
    }),
  );
  let l = el("label", "Importă un fișier JSON"),
    f = el("input");
  f.type = "file";
  f.accept = ".json,application/json";
  f.onchange = async () => {
    try {
      let next = await restore(f.files[0]);
      if (confirm("Înlocuiești întregul caiet cu această copie?")) {
        data = next;
        undo = null;
        refresh();
        await flush();
      }
    } catch (e) {
      alert("Import nereușit. " + e.message);
    }
    f.value = "";
  };
  l.append(f);
  s.append(l);
  main.append(
    s,
    btn(
      "Resetează caietul",
      () => {
        if (
          confirm("Resetezi caietul la conținutul inițial?") &&
          confirm("Confirmi ștergerea tuturor datelor locale?")
        ) {
          data = seed();
          undo = null;
          refresh();
        }
      },
      "danger",
    ),
  );
}
// keep = true păstrează meniurile deschise (de ex. după o bifă).
function render(keep = true) {
  const open = keep
    ? new Set(
        [...main.querySelectorAll("details[open][data-key]")].map(
          (d) => d.dataset.key,
        ),
      )
    : new Set();
  sync();
  document.documentElement.dataset.theme = data.settings.theme;
  const route = decodeURIComponent(location.hash.slice(1)) || "Azi";
  main.replaceChildren();
  nav.replaceChildren();
  let c = { ...current, save: persistData, refresh, render, remove };
  if (undo) main.append(btn("↶ Anulează ultima ștergere", undo));
  if (Date.now() - data.settings.backup > 7 * 86400000 && route !== "Setări")
    main.append(
      btn("Este timpul pentru backup　›", () => (location.hash = "Setări")),
    );
  let p =
    route.startsWith("p/") && data.pages.find((x) => x.id === route.slice(2));
  if (p) pageView(p, c);
  else if (route === "Pagini" || route.startsWith("p/")) pages();
  else if (route === "Căutare") search();
  else if (route === "Setări") settings();
  else today(c);
  for (let d of main.querySelectorAll("details[data-key]"))
    if (open.has(d.dataset.key)) d.open = true;
  for (let [n, icon] of [
    ["Azi", "◴"],
    ["Pagini", "▤"],
    ["Căutare", "⚲"],
    ["Setări", "⚙"],
  ]) {
    let active = route === n || (n === "Pagini" && route.startsWith("p/"));
    let b = btn("", () => (location.hash = n), active ? "active" : "");
    let symbol = el("span", icon);
    symbol.ariaHidden = "true";
    b.append(symbol, el("strong", n));
    if (active) b.setAttribute("aria-current", "page");
    nav.append(b);
  }
}
window.addEventListener("hashchange", () => {
  render(false);
  scrollTo(0, 0);
});
render(false);
setInterval(() => {
  let now = clock();
  if (now.key !== shiftKey || now.date !== current.date) render();
}, 10000);
if ("serviceWorker" in navigator) {
  let hadController = !!navigator.serviceWorker.controller;
  const reg = await navigator.serviceWorker
    .register("./sw.js")
    .catch(() => null);
  function update() {
    if (reg?.waiting && navigator.serviceWorker.controller)
      document.querySelector("#update").replaceChildren(
        btn("Versiune nouă – reîncarcă", async () => {
          await flush();
          reg.waiting.postMessage("activate");
        }),
      );
  }
  update();
  if (reg) reg.onupdatefound = () => {
    const worker = reg.installing;
    if (worker) worker.onstatechange = update;
  };
  navigator.serviceWorker.addEventListener("controllerchange", async () => {
    if (hadController) {
      await flush();
      location.reload();
    } else hadController = true;
  });
  // Verificăm actualizări când aplicația revine în prim-plan.
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) reg?.update().catch(() => {});
  });
}
