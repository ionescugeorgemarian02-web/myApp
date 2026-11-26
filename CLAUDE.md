# myApp 2 — Centrul de comandă al șefului de schimb

PWA în limba română: HTML, CSS, module ES vanilla, IndexedDB și Service Worker. Nu are build și nu are dependențe la rulare. Se publică pe GitHub Pages din `main`.

## Arhitectură

- `js/core/` — timp (schimb peste miezul nopții), numere (lipsă ≠ 0), documentul v2 (`doc.js`: `ensureShape`, `sanitize`), `store.js` (IndexedDB, cheia `v2`; v4.4 rămâne în `caiet`), `migrate.js` (v4 → v2); datele sintetice doar în `tests/fixtures/demo.mjs` (aplicația nu are date fictive). Cele 13 linii ale utilizatorului sunt în `DEFAULT_LINES` (`doc.js`), la cererea lui explicită din 26.11.2026, fără date de producție; „schimbul meu”: `settings.myShiftId` + `myShiftOccurrence()`
- `js/domain/` — logică pură testată: `plan`, `lines` (evenimente → stare), `reports`, `oee`, `shift` (situația schimbului), `routine` (EPT), `incidents`, `tasks`, `workforce` (niveluri 1–4), `quality`, `assistant`, `handover`
- `js/ui/kit.js` — `h()` doar cu `textContent`; `put()` în loc de `replaceChildren` cu array-uri; `field()` pune `<label>` doar pe controale simple
- `js/views/` — ecranele. Nu apela `commit()` în timpul randării (re-randează)
- Model: master data (`master`) / plan (`plans`) / execuție (`events`, `reports`, `incidents`, `audits`); totalurile se calculează din sursă

## Comenzi

- Teste: `node --test tests/*.mjs`; browser: `PLAYWRIGHT_MODULE=… node tests/browser.cjs` (server pornit)
- Server local: `python3 -m http.server 8124 --bind 127.0.0.1`
- Test de browser (opțional): vezi README, secțiunea „Dezvoltare și verificare”

## Reguli de proiect

- Repository-ul este public. Excepție aprobată de utilizator: denumirile celor 13 linii. În rest, numai date sintetice în teste; nu se comit nume de oameni, matricole, pontaje, PN-uri sau volume reale.
- O valoare lipsă nu devine 0 și nici 100 % (`.claude/skills/_shared/data-rules.md`).
- Orice fișier nou se adaugă în `sw.js` și versiunea cache-ului crește. Câmpurile noi primesc valori implicite în `ensureShape()` (`js/core/doc.js`); importul v4 este în `js/core/migrate.js`.
- Fără framework nou și fără rescriere fără justificare măsurată.
- Fără conectarea ERP, M365, Fusion sau a sistemelor companiei fără autorizare explicită.
- Fără commit, push sau deploy fără acordul utilizatorului.

## Ce skill se folosește

Harta completă a skillurilor este în `.claude/skills/README.md`. Pe scurt:
- cod și structură → `principal-software-architect`; ecrane și CSS → `industrial-dashboard-ux` (are prioritate față de `frontend-design` pentru stilul industrial)
- formule KPI → `oee-performance-engineering`; plan și takt → `production-planning`
- calitate și 8D → `automotive-quality-engineering`; termeni Lean → `lean-manufacturing`
- rutină și predare → `manufacturing-operations`; opriri → `industrial-maintenance-management`
- echipă și niveluri 1–4 → `workforce-and-qualification-management`; acțiuni și RACI → `industrial-task-management`
- funcții noi și prioritizare → `strategic-production-advisor`
- proces de lucru: `superpowers:brainstorming` → `superpowers:writing-plans` → `superpowers:test-driven-development` → `superpowers:verification-before-completion`
