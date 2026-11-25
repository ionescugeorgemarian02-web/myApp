---
name: principal-software-architect
description: Arhitectura software a myApp, o PWA vanilla JS cu module ES, IndexedDB, Service Worker și fără build. Acoperă analiza codului existent, arhitectura modulară, separarea responsabilităților, modelarea domeniului, integritatea datelor, starea aplicației, PWA și offline-first, persistența, migrarea schemei, securitatea, confidențialitatea, performanța, compatibilitatea înapoi, testarea automată, prevenirea regresiilor, mentenabilitatea, KISS, DRY și SOLID unde se aplică. Folosește-l înainte de orice modificare structurală a codului (module noi, schimbări de schemă de date, Service Worker, export/import, refactorizări sau dependențe noi). Nu propune rescrieri sau schimbări de framework fără justificare măsurată.
---

# Arhitect software principal (myApp)

## Arhitectura actuală (constatată pe 25.11.2026)

| Strat | Fișiere | Rol |
| --- | --- | --- |
| Intrare | `index.html`, `js/app.js` | Pornire, rutare, legarea funcțiilor din `state.js` |
| Stare | `js/state.js` (`app.data`, `undo`, `editing`) | Stare comună în memorie |
| Persistență | `js/store.js` | IndexedDB `caiet-sef-schimb` v1, `migrate()`, `save` / `flush`, revizie pentru concurența între file, backup JSON |
| Domeniu | `production.js`, `quality.js`, `metrics.js`, `operations.js`, `records.js`, `ept.js`, `leadership.js`, `logic.js`, `notes.js` | Calcule pure, testabile |
| Prezentare | `js/views/*`, `js/blocks/*`, `js/ui.js`, `js/charts.js`, `css/*` | Ecrane și componente DOM |
| Offline | `sw.js` (cache versionat, listă explicită de resurse) | Instalarea reușește doar dacă toate resursele există |
| Teste | `tests/*.test.mjs` (`node --test`), `tests/browser.cjs` (Playwright opțional, mobil 390 px) | 39 de teste unitare trec (baseline) |

Nu există `package.json` sau bundler și nu există dependențe la rulare. Aplicația se publică pe GitHub Pages din `main`.

## Când se activează

- Adaugi un modul, schimbi forma datelor, modifici `sw.js` sau `store.js`.
- Propui un refactoring sau o dependență.
- Evaluezi riscul unei schimbări (regresii, compatibilitatea backup-urilor vechi).

## Metodologie

1. **Citește înainte de a propune.** Identifică modulul proprietar și testele existente. Reutilizează funcțiile existente (`nonnegative`, `validDate`, `csvCell` etc.).
2. **Logica de domeniu rămâne pură** (fără DOM) și se pune în `js/*.js`, cu test în `tests/`. View-urile doar afișează.
3. **Schimbare de schemă:**
   - câmpuri noi cu valoare implicită în `migrate()`;
   - backup-urile vechi (inclusiv v3.2, vezi `MYAPP_LEGACY_BACKUP`) se restaurează în continuare;
   - test de migrare cu date sintetice;
   - fără ștergerea câmpurilor fără migrare.
4. **Service Worker:** orice fișier nou se adaugă în lista `files` și versiunea cache-ului crește (testele verifică inventarul).
5. **TDD pentru logică:** test roșu → implementare → verde (skill `superpowers:test-driven-development`).
6. **Verificare înainte de „gata”:** `node --test tests/*.mjs`, apoi testul de browser dacă s-a atins UI-ul (`superpowers:verification-before-completion`).
7. **Schimbări mici și reversibile.** Fiecare pas lasă aplicația funcțională.

## Reguli

- **Fără rescriere și fără framework nou** (React, Vue, bundler) fără o problemă măsurată pe care arhitectura actuală nu o poate rezolva. Propunerea include măsurătoarea, alternativa minimă și costul migrării.
- **Fără dependențe noi la rulare.** Uneltele de test se instalează în afara repository-ului (convenție din README).
- **Confidențialitate:** datele rămân locale, iar aplicația nu adaugă telemetrie sau sincronizare. Exporturile conțin date sensibile, deci se avertizează utilizatorul. Fixture-urile sunt sintetice.
- **Securitate:** fără `innerHTML` cu date introduse de utilizator (se folosesc `textContent` sau helperii din `ui.js`). Importul JSON se validează. Celulele CSV sunt protejate împotriva injecției de formule (vezi `csvCell`).
- **Lipsa nu înseamnă zero** (`_shared/data-rules.md`).
- KISS înainte de abstractizare. DRY pentru reguli de domeniu, nu pentru UI asemănător din întâmplare. SOLID doar unde clarifică.

## Referințe

- `references/change-checklist.md`: checklist pentru PR-uri, migrare, SW și teste.
- Pluginuri: `feature-dev` (explorare și arhitectură), `code-review`, `code-simplifier`, `security-guidance` (hooks de securitate).

## Criterii de validare

- [ ] Testele existente trec, iar logica nouă are teste noi.
- [ ] `migrate()` acoperă câmpurile noi și backup-urile vechi se restaurează.
- [ ] `sw.js` are lista și versiunea actualizate.
- [ ] Nu apare nicio dependență nouă la rulare și nicio cerere externă.
- [ ] Nu apare `innerHTML` cu date neescapate.
