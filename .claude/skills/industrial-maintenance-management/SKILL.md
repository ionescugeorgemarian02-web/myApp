---
name: industrial-maintenance-management
description: Managementul mentenanței industriale în myApp. Acoperă avarii, raportarea incidentelor la utilaje, clasificarea defectelor, codurile de oprire, ierarhia utilaj/post de lucru, responsabilul incidentului, starea intervenției, mentenanța preventivă, autonomă și corectivă, TPM în practică, MTTR, MTBF, escaladarea, istoricul incidentelor și analiza defectelor recurente. Distinge monitorizarea digitală de controlul fizic al utilajelor. Folosește-l când modifici registrul opririlor, codurile de oprire, ierarhia echipamentelor sau orice flux legat de defecte și intervenții. Formulele MTTR și MTBF sunt în oee-performance-engineering.
---

# Managementul mentenanței industriale

## Principiul de bază

**myApp monitorizează și înregistrează. Nu controlează.** Aplicația nu se conectează la PLC, SCADA sau CMMS, nu pornește și nu oprește echipamente și nu modifică parametri. Orice integrare viitoare necesită autorizare explicită și este doar de citire.

## Când se activează

- Modifici registrul opririlor (câmpuri, durate, cauze).
- Proiectezi coduri de oprire sau ierarhia linie → stație → echipament.
- Construiești istoricul și analiza defectelor recurente.
- Adaugi stări pentru intervenții (raportat → în lucru → rezolvat → verificat).

## Metodologie

1. **Ierarhie stabilă:** Zonă → Linie → Stație / post → Echipament. Se folosesc id-uri, nu nume, ca chei. Vezi `references/taxonomy.md`.
2. **Incidentul** are: echipament, început, sfârșit (sau „în curs”), simptom, cod, impact (siguranță / calitate / producție), rol responsabil, stare, acțiune.
3. **Codurile de oprire** au două niveluri (categorie → cauză) și se pot mapa pe Six Big Losses (`oee-performance-engineering/references/loss-analysis.md`). Lista este configurabilă. Codul „necodificat” este permis și vizibil.
4. **Durata** se calculează din timpi, nu se tastează separat, când ambii timpi există. Un incident deschis nu intră în MTTR.
5. **Defecte recurente:** același echipament și același cod de mai multe ori într-o fereastră locală (de ex. 3 în 7 zile). Rezultatul este un semnal pentru RCA (`automotive-quality-engineering`). Ca model de diagnostic se poate folosi `breakdown-diagnosis` din pluginul de manufacturing.
6. **Tipuri de mentenanță:** corectivă (după defect), preventivă (planificată, pe timp sau pe ciclu), autonomă (curățare, inspecție, ungere făcute de operator). Conceptul TPM este definit în `lean-manufacturing`.

## Reguli

- Nicio presupunere despre cauză fără dovadă. Diagnosticul rămâne „ipoteză” până la confirmarea tehnicianului.
- Siguranța se afișează înaintea oricărui diagnostic.
- Exemplele folosesc echipamente sintetice (`Robot sudură A1`, `Presă P-TEST`).

## Referințe

- `references/taxonomy.md`: ierarhie, stări, coduri exemplu, câmpuri minime.

## Criterii de validare

- [ ] Niciun flux nu trimite comenzi către echipamente.
- [ ] Incidentele deschise sunt excluse din MTTR și numărate separat.
- [ ] Recurența se calculează pe id de echipament și cod, cu fereastră configurabilă.
- [ ] Teste cu incidente sintetice: deschis, închis, fără cod, suprapus.
