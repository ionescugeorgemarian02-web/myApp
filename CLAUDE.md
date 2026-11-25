# myApp — Caietul Șefului de Schimb

PWA personală în limba română: HTML, CSS, module ES vanilla, IndexedDB și Service Worker. Nu are build și nu are dependențe la rulare. Se publică pe GitHub Pages din `main`.

## Comenzi

- Teste: `node --test tests/*.mjs`
- Server local: `python3 -m http.server 8124 --bind 127.0.0.1`
- Test de browser (opțional): vezi README, secțiunea „Dezvoltare și verificare”

## Reguli de proiect

- Repository-ul este public. Se folosesc numai date sintetice (`Linia A`, `Operator 01`, `PN-TEST-001`). Nu se comit nume, matricole, pontaje, PN-uri sau volume reale.
- O valoare lipsă nu devine 0 și nici 100 % (`.claude/skills/_shared/data-rules.md`).
- Orice fișier nou se adaugă în `sw.js` și versiunea cache-ului crește. Câmpurile noi trec prin `migrate()` în `js/store.js`.
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
