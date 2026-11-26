---
name: oee-performance-engineering
description: Calculul și validarea indicatorilor de performanță în myApp. Acoperă OEE (Availability, Performance, Quality), Six Big Losses, analiza opririlor, rata de rebut, First Pass Yield, MTBF, MTTR, Pareto, eficiența producției, urmărirea oră cu oră, unitățile de măsură și tratarea datelor lipsă sau invalide. Folosește-l când scrii, verifici sau testezi cod care calculează sau afișează un KPI numeric (js/production.js, js/quality.js, js/metrics.js, js/charts.js) sau când utilizatorul întreabă cum se calculează un indicator. Nu îl folosi pentru designul vizual al graficelor (industrial-dashboard-ux) sau pentru planificarea țintelor (production-planning).
---

# OEE și ingineria performanței

Skillul este sursa unică pentru formulele KPI din proiect. Celelalte skilluri trimit aici și nu redefinesc formulele.

## Când se activează

- Adaugi sau modifici calculul unui indicator (OEE, A, P, Q, FPY, rebut, MTTR, MTBF, plan %, abatere).
- Scrii teste pentru funcții de calcul.
- Analizezi date de oprire (Pareto, Six Big Losses).
- Verifici dacă un KPI afișat are sursă, formulă, unitate și perioadă.

## Metodologie

1. **Definește intrările.** Pentru fiecare variabilă stabilește unitatea (min, s, buc), sursa (câmpul din IndexedDB) și perioada. Folosește tabelul din `references/formulas.md`.
2. **Validează intrările.** Aplică `nonnegative()` din `js/production.js`. Respinge valorile imposibile: Good Count > Total Count, Run Time > Planned Production Time, Ideal Cycle Time ≤ 0. Le marchezi ca invalide și nu le „corectezi”.
3. **Calculează componentele separat.** A, P și Q au valori proprii. OEE = A × P × Q numai dacă toate trei sunt cunoscute.
4. **Nu limita în tăcere.** Performance > 100 % indică un Ideal Cycle Time greșit sau un Total Count greșit (oee.com: „should never be greater than 100%”). Afișezi un avertisment de date. Nu tai valoarea la 100 %.
5. **Agregă corect.** Pe mai multe intervale sau linii agregi numărătorii și numitorii, apoi împarți. Nu faci media procentelor. Vezi `references/formulas.md#agregare`.
6. **Etichetează acoperirea.** „OEE pe 6 din 8 ore raportate”. Lipsa nu se interpretează ca 0 sau 100 %.
7. **Testează.** Fiecare formulă nouă primește teste `node --test` cu date sintetice: caz normal, date lipsă, zero la numitor, valoare invalidă și agregare.

## Reguli

- Fără date inventate. Fără valori implicite de 100 % pentru A, P sau Q necunoscute.
- 85 % nu este un standard. Ținta OEE este o setare locală (vezi `_shared/sources.md`).
- Opririle planificate (pauze, lipsă comenzi) se exclud din Planned Production Time doar dacă regula locală o cere. Regula se configurează și se afișează lângă indicator.
- MTBF și MTTR cer evenimente cu început și sfârșit. O oprire fără durată nu intră în medie. Se raportează separat ca incompletă.
- Unitățile se convertesc o singură dată, la intrare. Intern se folosesc minute pentru timp și bucăți pentru cantitate.
- Rotunjirea se face doar la afișare.

## Referințe

- `references/formulas.md`: formule, variabile, unități, agregare, cazuri limită (citește-l înainte de orice calcul).
- `references/loss-analysis.md`: Six Big Losses, Pareto după minute și după frecvență, analiza oră cu oră.
- Plugin `claude-for-manufacturing`: skillul `daily-production-report` (structura raportului de dimineață) și regula „absent is not zero”.

## Exemplu (date sintetice)

Linia A, schimb de 480 min, 30 min pauză planificată, 45 min oprire neplanificată, Ideal Cycle Time 0,5 min/buc, 700 buc produse, 665 bune:
- Planned Production Time = 450 min. Run Time = 405 min. A = 405 / 450 = 90,0 %.
- P = (0,5 × 700) / 405 = 86,4 %. Q = 665 / 700 = 95,0 %.
- OEE = 0,900 × 0,864 × 0,950 = 73,9 %. Verificare: (665 × 0,5) / 450 = 73,9 %.

Dacă Good Count lipsește: A și P se afișează, Q și OEE apar ca „date incomplete: lipsesc piesele bune”.

## Criterii de validare

- [ ] Fiecare KPI are formulă, unitate, sursă și perioadă documentate (vezi `KPI_DEFINITIONS` din `js/quality.js`).
- [ ] Cele două forme de calcul ale OEE dau același rezultat pe datele de test.
- [ ] Testele acoperă: lipsă, zero la numitor, invalid, P > 100 % și agregare pe intervale.
- [ ] Nicio componentă necunoscută nu apare ca 0 % sau 100 %.
- [ ] `node --test tests/*.mjs` trece.
