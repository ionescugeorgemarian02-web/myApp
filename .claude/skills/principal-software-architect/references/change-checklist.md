# Checklist de schimbare

## Înainte

- [ ] Problema este descrisă, cu comportamentul actual și cel dorit.
- [ ] Modulul proprietar este identificat, la fel și testele afectate.
- [ ] S-a decis dacă schimbarea atinge schema de date, SW-ul sau exportul.
- [ ] Datele sintetice pentru teste sunt pregătite.

## În timpul

- [ ] Testul eșuează înainte de implementare (pentru logică).
- [ ] Logica stă în modul pur, iar UI-ul în views/blocks.
- [ ] Nu apare cod mort și nu apare duplicarea regulilor de domeniu.

## Schema de date

- [ ] Valoarea implicită pentru câmpul nou se setează în `migrate()`.
- [ ] Restaurarea backup-urilor vechi a fost testată.
- [ ] Exportul CSV / JSON include câmpul, dacă e relevant.

## PWA

- [ ] Fișierul nou este adăugat în `sw.js`, iar versiunea cache-ului este crescută.
- [ ] Aplicația funcționează offline după reîncărcare.

## La final

- [ ] `node --test tests/*.mjs` trece.
- [ ] Testul de browser trece (dacă s-a atins UI-ul): `PLAYWRIGHT_MODULE=... node tests/browser.cjs`.
- [ ] Captura mobilă înainte / după există (dacă s-a atins UI-ul).
- [ ] `git diff` a fost revizuit: fără date reale, fără secrete.
- [ ] README și versiunea sunt actualizate (convenția proiectului).
