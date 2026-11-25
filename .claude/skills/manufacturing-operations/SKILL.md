---
name: manufacturing-operations
description: Managementul operațional al schimbului (shop floor) pentru myApp. Acoperă MES din perspectiva supervizorului, Shop Floor Management, Daily Production Management, Supervisor Standard Work, managementul schimbului, Layered Process Audits (LPA), Gemba Walk, fișa EPT, First Off Check, QPS, managementul escaladărilor, predarea schimbului, managementul vizual și standardized work. Folosește-l când modifici ecranele Azi, Rutina (fișa EPT), Predare schimb, auditurile sau fluxurile de escaladare, ori când trebuie judecat dacă o funcție se potrivește ritmului real al unui schimb.
---

# Operațiuni de producție (shop floor)

## Când se activează

- Modifici rutina EPT, verificările la 2 ore, auditurile personale sau LPA.
- Proiectezi predarea sau preluarea schimbului, SBAR sau escaladări.
- Stabilești ce vede supervizorul în fiecare fază a schimbului.

## Modelul schimbului

| Fază | Ce trebuie să ofere aplicația | Fluxul existent |
| --- | --- | --- |
| Înainte | Preluare: riscuri, acțiuni deschise, efectiv | Predare → Preluare |
| Început | Start-up: siguranță, First Off, alocare | Rutina „Început” |
| În timpul | Ritm vs. țintă, opriri, verificări periodice, gemba | Producție, verificări la 2 ore |
| Sfârșit | Totaluri, probleme deschise, predare | Rutina „Sfârșit”, Predare |

## Metodologie

1. **Leader Standard Work:** fiecare activitate are moment, durată estimată, rezultat (DA / NU / N.A.) și reacție la NU. Un NU deschide observația și poate crea o problemă. Fluxul există și se păstrează.
2. **LPA:** aceleași întrebări scurte, auditate pe niveluri ierarhice cu frecvențe diferite. Fiecare NOK generează o acțiune. Întrebările se configurează local.
3. **Gemba walk:** observare → întrebare → consemnare. Nu se rezolvă din birou ce nu s-a văzut.
4. **Escaladarea** are nivel, prag de timp, rol responsabil și canal. Matricea se configurează local. Exemple de praguri sunt în `references/escalation-handover.md`. Aplicația nu trimite notificări externe fără autorizare.
5. **Predarea schimbului** separă faptele (cifre, stări) de riscuri și de acțiuni deschise. Preluarea confirmă. Modificarea ulterioară invalidează confirmarea (regulă existentă).
6. **Managementul vizual:** fiecare culoare înseamnă o stare cu o reacție definită. Implementarea UI este în `industrial-dashboard-ux`.

## Reguli

- EPT, QPS și formatele de audit sunt **convenții locale**. Definiția lor se confirmă intern (vezi `docs/cercetare.md`). Nu se prezintă ca standarde.
- Fișa personală completează procesul oficial. Nu îl înlocuiește.
- Fără nume reale în exemple. Se folosesc roluri: Team Leader, Quality, Maintenance, Logistics.
- Acțiunile rezultate se urmăresc prin `industrial-task-management`. Problemele de calitate trec prin `automotive-quality-engineering`.

## Referințe

- `references/escalation-handover.md`: matrice de escaladare exemplu, structura predării și SBAR.
- `references/audits.md`: LPA, First Off, structura unui checklist auditabil.

## Criterii de validare

- [ ] Fiecare activitate de rutină are rezultat și reacție la NU.
- [ ] Escaladarea are prag, rol și termen. Pragurile sunt configurabile.
- [ ] Predarea separă faptele, riscurile și acțiunile. Confirmarea se invalidează la modificare.
- [ ] Nicio funcție nu presupune acces la MES, ERP sau mașini.
