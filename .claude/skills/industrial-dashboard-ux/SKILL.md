---
name: industrial-dashboard-ux
description: Design UI/UX industrial pentru myApp, pe telefon, într-un mediu de producție. Acoperă design inspirat din HMI, dashboard OEE și de control al producției, interfața de raportare orară, vizualizarea datelor, ierarhia informației, formulare pentru operatori, navigare pentru supervizori, interacțiune mobile-first, stări operaționale codificate prin culoare, Gantt și timeline, heatmap, Pareto, vizualizarea matricei de calificare, accesibilitate, prevenirea erorilor, progressive disclosure și management vizual. Folosește-l când creezi sau modifici ecrane, componente, CSS, grafice sau formulare în myApp. Prioritatea este claritatea, viteza și numărul mic de apăsări, nu animațiile decorative.
---

# UX pentru dashboard industrial

## Când se activează

- Orice modificare în `css/`, `js/views/`, `js/blocks/`, `js/charts.js` sau `index.html`.
- Proiectarea unui ecran, formular, grafic sau a unei stări vizuale.

## Principii (în ordinea priorității)

1. **Lizibil dintr-o privire, pe telefon, în hală.** Cifra principală are cel mai mare text. Eticheta și unitatea sunt mereu vizibile. Contrastul minim respectă WCAG AA (4,5:1 text, 3:1 elemente grafice).
2. **Puține apăsări pentru raportare.** Raportarea unui interval sau a unei opriri durează cel mult 3 apăsări de la ecranul Azi. Valorile implicite sunt inteligente (ora următoare, ultima linie). Tastatura numerică apare pentru câmpurile numerice (`inputmode="numeric"`).
3. **Ținte tactile ≥ 44 × 44 px** (mănuși, mâini ocupate), cu spațiere între acțiuni opuse (DA / NU).
4. **Culoarea înseamnă stare, nu decor.** Paleta de stare este fixă: OK / Atenție / Oprit / Fără date. Fiecare stare are și text sau iconiță (accesibilitate pentru daltonism). „Fără date” are o culoare neutră proprie, niciodată verde.
5. **Progressive disclosure.** Rezumatul vine primul. Detaliul se deschide la cerere. Câmpurile avansate stau în „Detalii”.
6. **Prevenirea erorilor.** Validarea are loc la introducere, cu mesaj lângă câmp. Acțiunile distructive cer confirmare și oferă Undo (mecanismul există în `app.undo`). Poka-Yoke software: butonul rămâne inactiv până când datele obligatorii sunt complete.
7. **Fără animații decorative.** Tranzițiile sunt de maximum 150 ms și doar funcționale. Se respectă `prefers-reduced-motion`.
8. **Offline și rapid.** Nicio dependență CDN la rulare. Fonturile sunt locale (`fonts/`). Interacțiunea răspunde sub 100 ms.

## Vizualizări — alegere

| Întrebare | Vizualizare | Notă |
| --- | --- | --- |
| Suntem pe plan acum? | Card KPI + bară de progres față de ritmul orar | Cifra realizat / țintă + abatere cu semn |
| Unde pierdem timp? | Pareto (minute și frecvență) | Linie cumulativă, categoria „necodificat” vizibilă |
| Când s-a oprit? | Timeline / Gantt pe linie | Stările pe axa timpului schimbului |
| Unde se repetă? | Heatmap linie × oră sau cod × zi | Scară secvențială + valoare la atingere |
| A, P, Q, OEE | Patru cifre separate + componenta limitativă evidențiată | Nu doar un gauge |
| Cine poate lucra unde? | Matrice de calificare cu nivelul afișat ca număr | Culoarea dublează numărul |

Detalii: `references/patterns.md`. Pentru culori și tipuri de grafic se poate interoga baza locală `ui-ux-pro-max` (plugin), adaptată la paleta de stare de mai sus.

## Reguli

- Respectă stilul existent (`css/style.css` și tokenurile existente). Nu introduce framework CSS.
- Textele sunt în română, scurte, la imperativ pe butoane („Salvează”, „Raportează oprire”).
- Un KPI fără date se afișează „—” cu explicație. Nu se afișează „0 %” sau „100 %”.
- Verificarea vizuală se face cu capturi Playwright la lățime de telefon (360–412 px), cu date sintetice (vezi `tests/browser.cjs`).

## Criterii de validare

- [ ] Contrast AA verificat și ținte ≥ 44 px.
- [ ] Fiecare stare colorată are și text sau iconiță.
- [ ] Raportarea unui interval cere ≤ 3 apăsări de la Azi.
- [ ] Nu apare scroll orizontal la 360 px.
- [ ] `prefers-reduced-motion` este respectat.
- [ ] Captură înainte / după pentru fiecare schimbare de ecran.
