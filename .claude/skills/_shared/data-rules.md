# Reguli comune de date și confidențialitate

Se aplică tuturor skillurilor din `.claude/skills/`.

## 1. Lipsa unei valori nu înseamnă zero sau 100 %

- O valoare necompletată, invalidă sau negativă acolo unde nu are sens rămâne `null`. Nu devine 0 și nu devine 100 %.
- Un indicator compus (de ex. OEE) se calculează numai când toate componentele sunt cunoscute. Altfel se afișează „date incomplete” și se numește componenta lipsă.
- Aplicația face deja asta: `nonnegative()` în `js/production.js` întoarce `null` pentru valori invalide. Codul nou păstrează convenția.
- Un total parțial se etichetează ca parțial („3 din 5 intervale raportate”). Nu se extrapolează.
- Un raport afirmă vechimea datelor („ultimul interval: 14:00”) înainte de concluzii.

## 2. Cifrele se calculează și nu se transcriu

Orice procent, total sau „N din M” dintr-un răspuns provine dintr-un calcul rulat pe date (test, script, funcție). Nu provine dintr-o estimare din memorie. O afirmație negativă („nu există opriri”) spune pe ce filtru se bazează.

## 3. Date în teste

- Testele automate folosesc date sintetice (`Linia A`, `PN-TEST-001`), ca să nu depindă de producția reală.
- Datele reale ale utilizatorului (linii, PN-uri, plan) pot fi în aplicație, la cererea lui explicită (26.11.2026).

## 4. Fără conectări implicite

Niciun skill nu conectează ERP, SAP, MES, CMMS, Microsoft 365, Autodesk Fusion sau PLC-uri fără autorizarea explicită a utilizatorului. Aplicația monitorizează și înregistrează. Nu comandă echipamente.

## 5. Normativ vs. recomandare

Fiecare afirmație se încadrează într-o categorie: **CONFIRMAT** (sursă verificată în `sources.md`), **PRACTICĂ UZUALĂ** (literatură larg folosită, neverificată textual) sau **IPOTEZĂ / DE CONFIRMAT LOCAL**. Nu se afirmă conformitate IATF 16949 / ISO 9001 pe baza funcțiilor aplicației.
