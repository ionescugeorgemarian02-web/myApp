---
name: production-planning
description: Planificarea producției pentru myApp. Acoperă Master Production Schedule, planul oră cu oră, plan vs. realizat, gestiunea part number-urilor, alocarea pe linii și a operatorilor, capacitate, cycle time, takt time, bottleneck, echilibrarea liniei, schimbările de reper (changeover), secvențierea, WIP, comenzile de lucru, calculul țintelor de producție și planificarea strategică a resurselor. Folosește-l când proiectezi sau modifici funcții de plan, ținte orare, capacitate sau alocare în aplicație. Formulele KPI de rezultat (OEE, rebut) sunt în oee-performance-engineering. Calificarea oamenilor este în workforce-and-qualification-management.
---

# Planificarea producției

## Când se activează

- Calculezi ținte de producție (pe schimb, pe oră, pe linie).
- Modelezi part number-uri, rute, cycle time, capacitate sau alocarea pe linii.
- Proiectezi ecrane de plan vs. realizat, secvențiere sau changeover.
- Evaluezi un bottleneck sau echilibrarea unei linii.

## Când NU

- Pentru calculul OEE și al calității, folosește `oee-performance-engineering`.
- Pentru cine e calificat pe ce post, folosește `workforce-and-qualification-management`.

## Metodologie

1. **Separă cererea de capacitate.** Takt = timp disponibil / cerere (LEI, confirmat). Takt descrie ritmul cerut de client. Cycle time descrie ritmul măsurat al procesului. Nu le confunda.
2. **Ținta orară se calculează.** Țintă(interval) = timp productiv în interval / cycle time planificat. Pauzele planificate scad timpul productiv. Rotunjirea se face în jos la bucăți întregi și se afișează regula. Vezi `references/planning-formulas.md`.
3. **Plan vs. realizat** se compară pe același interval, pe același PN și pe aceeași linie. Un interval nerapotat rămâne „necompletat”.
4. **Bottleneck-ul** este stația cu cel mai mare cycle time efectiv sau cu cea mai mare încărcare față de takt. Se identifică din date, nu din opinie.
5. **Echilibrarea:** număr minim teoretic de operatori = Σ conținut de muncă / takt (se rotunjește în sus). Diferența până la efectivul real este pierdere de echilibrare.
6. **Changeover-ul** se planifică explicit în secvență, ca timp de setup (o pierdere de Availability). Pentru reducerea lui se folosește SMED din `lean-manufacturing`.
7. **Secvențierea** ține cont de: termen, familie de reper (reduce schimbările), disponibilitatea materialului și calificarea operatorilor. Heijunka nivelează mixul (vezi `lean-manufacturing`).
8. **WIP:** limita de stoc între stații este o setare locală. Depășirea ei este un semnal vizual, nu o eroare.

## Reguli

- Aplicația sprijină decizia supervizorului. Nu emite comenzi de lucru în ERP și nu se conectează la ERP fără autorizare.
- PN-urile din teste sunt sintetice (`PN-TEST-001`).
- Orice capacitate calculată arată ipotezele: OEE presupus, efectiv, ture.
- Planul de schimb poate traversa miezul nopții. Data de lucru este data începerii schimbului (convenția existentă în aplicație).

## Referințe

- `references/planning-formulas.md`: takt, ținte orare, capacitate, echilibrare, încărcare (cu exemple sintetice).
- `references/data-model.md`: entități recomandate (PN, linie, rută, plan, interval, comandă de lucru) și legătura cu datele existente.

## Exemplu (sintetic)

Cerere 900 buc/zi, 2 schimburi × 450 min productive. Takt = 900 min / 900 buc = 1,0 min/buc. Cycle time-ul măsurat al stației lente este 1,2 min. Bottleneck-ul nu poate susține cererea: capacitate = 900 / 1,2 = 750 buc/zi. Deficitul este de 150 buc/zi. Opțiunile (ore suplimentare, reducerea cycle time-ului, al doilea post) trec prin `strategic-production-advisor`.

## Criterii de validare

- [ ] Takt și cycle time apar ca mărimi distincte, cu unități.
- [ ] Ținta orară scade pauzele planificate și respectă schimbul de noapte.
- [ ] Teste pentru: interval parțial, pauză în interval, cycle time lipsă (țintă = null) și trecerea peste miezul nopții.
- [ ] Nicio țintă nu se calculează din date lipsă presupuse.
