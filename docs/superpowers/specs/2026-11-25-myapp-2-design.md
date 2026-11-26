# myApp 2.0 — Supervisor Control Center (design)

Sursa cerințelor: MASTER PROMPT myApp 2.0 (conversația din 25.11.2026). Documentul consemnează **deciziile luate** pe baza auditului. Utilizatorul a cerut explicit execuție fără runde de întrebări, deci deciziile marcate „decizie” sunt ale arhitectului și se pot corecta.

## Intenție

Șeful de schimb lucrează de pe telefon și gestionează simultan linii, oameni, calitate, incidente și sarcini. Aplicația devine centrul de comandă al schimbului: PLAN → EXECUȚIE → MONITORIZARE → REACȚIE → RESPONSABILITATE → VERIFICARE → ÎMBUNĂTĂȚIRE. Rutina EPT organizează ziua.

## Constatări din audit (v4.4)

- Modelul de date este generic (pagini → blocuri → rânduri cu coloane dinamice). Indicatorii se deduc căutând coloane după nume. Asta e fragil și nu permite relații Plan / Execuție / Master Data.
- `js/ept.js` conține în codul public **denumirile reale ale celor 13 linii**, contrar regulii de confidențialitate.
- Calificarea folosește indicii 0–3 („Neinstruit…Poate instrui”), iar 0 înseamnă lipsă înregistrare. Calificarea este pe linie, nu pe operație.
- Nu există plan orar, evenimente de stare cu oră reală, OEE calculat, incidente cu ciclu de viață, alocare pe operație, 8D sau LPA versionat.
- Persistența este bună și se reutilizează ca principiu: IndexedDB, un document, revizie pentru conflicte între file, backup JSON validat, protecție CSV.

## Abordări

| Abordare | Pro | Contra | Verdict |
| --- | --- | --- | --- |
| A. Reskin al v4.4 | Risc mic | Modelul generic blochează Plan / Execuție / OEE | Respinsă: contrazice cererea |
| B. Framework (React/Vite) | Ecosistem | Build, dependențe, offline mai complex, fără câștig măsurat | Respinsă: fără justificare |
| **C. Rescriere vanilla ES modules, model de date nou, migrare din v4** | Offline, fără build, domeniu testabil în Node | Volum mare de cod | **Aleasă** |

## Decizii

1. **Tehnologie:** HTML, CSS, module ES vanilla, IndexedDB și Service Worker, ca înainte. Nicio dependență la rulare.
2. **Date:** un document `schemaVersion: 2` salvat sub cheia `v2` în aceeași bază. Documentul v4.4 (`caiet`) **nu se șterge**. La prima pornire se importă liniile, oamenii, calificările și problemele deschise.
3. **Separare:** `master` (linii, mașini, PN-uri, oameni, coduri, checklisturi), `plans` (ce trebuia), `events` / `reports` / `incidents` / `audits` (ce s-a întâmplat). Totalurile se calculează din sursă.
4. **Calificare 1–4** exact ca în cerință. „Neevaluat” = lipsa înregistrării. Migrare v4: 1→2, 2→3, 3→4, cu marcajul „migrat, de reconfirmat”. Indexul 0 nu se convertește, pentru că înseamnă lipsă de înregistrare.
5. **Timp:** data de lucru = data începerii schimbului. Intervalele orare se calculează din programul schimbului. Pauzele sunt configurabile și implicit goale, pentru că nu se inventează reguli locale.
6. **Stare linie** = ultimul eveniment valid cu `at ≤ t`. Ora reală se poate alege. Corecțiile păstrează istoricul. Downtime-ul se calculează din stări, deci incidentele legate de aceeași oprire nu dublează minutele.
7. **OEE:** formulele de pe oee.com. Agregarea pe PN-uri diferite folosește timp ideal ponderat: OEE = Σ(Good×ICT)/ΣPPT, Q = Σ(Good×ICT)/Σ(Total×ICT), deci A×P×Q = OEE exact. Good = piese bune la prima trecere (fără rework). Minutele fără status fac Availability „Date insuficiente”.
8. **Plan orar:** metodele uniform, minute productive, timp de ciclu și manual. Suma este exactă (cel mai mare rest). Planul confirmat devine **baseline** imuabil, iar modificările sunt revizii cu motiv.
9. **Rutina EPT:** șablonul păstrează activitățile din fișa existentă, fără nume reale. Instanțele sunt cheiate `activitate@perioadă`, deci nu apar duplicate la redeschidere. Statusul se calculează din fereastra de timp și din rezultat. Rezultatul OK/NOK/N/A este separat de status.
10. **Asistent:** reguli explicabile și configurabile (praguri în setări), fără API AI.
11. **Design:** identitate „semnal de hală” (detaliat în `docs/design-system.md`).
12. **Confidențialitate:** modul Instruire are date sintetice marcate. Modul real pornește gol, cu catalog configurabil.

## Non-obiective

APS/MRP, sincronizare multi-user, autentificare, integrare ERP/MES/PLC/CMMS, notificări transmise efectiv, salarizare.

## Rămâne la latitudinea implementării

Granularitatea vizualizărilor secundare și ordinea exactă a cardurilor, cu criteriul ierarhiei după urgență.
