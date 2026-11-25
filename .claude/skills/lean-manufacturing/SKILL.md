---
name: lean-manufacturing
description: Referință Lean Manufacturing pentru myApp. Acoperă takt, flux, zero defecte, pull, Kanban, Just in Time, Jidoka, Kaizen, PDCA, Value Stream Mapping, 5S și 6S, cele 7 risipe (TIMWOOD) și 8 risipe (DOWNTIME), SMED, TPM, Standard Work, 5 Why, Gemba, Andon, Heijunka și îmbunătățirea continuă. Distinge principiile de metode și de instrumente. Folosește-l când o funcție a aplicației implementează sau explică un concept Lean (texte de ajutor, checklisturi 6S, registre Kaizen, Andon vizual) sau când trebuie verificată corectitudinea terminologiei Lean. Pentru 8D, RCA și Poka-Yoke detaliat folosește automotive-quality-engineering.
---

# Lean Manufacturing

## Când se activează

- Scrii texte de ajutor, glosar sau ghiduri în aplicație care folosesc termeni Lean.
- Proiectezi funcții de 6S, Kaizen, Andon, Kanban, SMED sau standard work.
- Verifici dacă o clasificare din aplicație este standard sau doar o convenție internă.

## Taxonomie (de respectat în texte și cod)

| Nivel | Ce este | Exemple |
| --- | --- | --- |
| **Scop / principii** | De ce | Valoare pentru client, flux, pull, perfecțiune, respect pentru oameni |
| **Piloni TPS** | Structura sistemului Toyota | Just-in-time și Jidoka (LEI: „the two pillars”) |
| **Metode / sisteme** | Cum organizezi | Heijunka, Kanban (pull), Standard Work, TPM, SMED, Kaizen, PDCA |
| **Instrumente** | Cu ce lucrezi | VSM, 5S/6S, Andon, Poka-Yoke, 5 Why, tabel de combinare a muncii |

Detalii și definiții sursate: `references/glossary.md`.

## Reguli

- **Nu prezenta convenții drept standarde.** 6S, TIMWOOD și DOWNTIME sunt variante sau mnemonice didactice. Le marchezi ca atare (vezi `_shared/sources.md`).
- **Takt ≠ cycle time ≠ lead time.** Formulele sunt în `production-planning`.
- **TPM** este definit aici (cele trei sensuri ale lui „total”, LEI). Practica PM/AM este în `industrial-maintenance-management`. Pierderile se calculează în `oee-performance-engineering`.
- **5 Why** se folosește aici ca instrument de gemba. Metodologia completă (verificarea fiecărui „de ce”, combinarea cu Ishikawa) este în `automotive-quality-engineering`.
- **Poka-Yoke:** LEI confirmă două tipuri de funcție, Shutdown și Warning. Cele trei metode (contact, valoare fixă, pași de mișcare) sunt detaliate în `automotive-quality-engineering`.
- Andon semnalează o anomalie și cere reacție. Pe ecran, Andon este o stare, nu o decorație.
- Kaizen nu înseamnă doar „idei”. O idee devine Kaizen când are problemă, cauză, contramăsură, rezultat măsurat și standard actualizat (PDCA).

## Aplicarea în myApp (orientativ)

- 6S: checklist cu OK/NOK pe zonă, NOK generează acțiune (`industrial-task-management`).
- Kaizen: registrul „Idei” există deja în „Dezvoltarea echipei”. Completarea logică este rezultatul și standardul actualizat.
- Andon / management vizual: starea liniei OK / Atenție / Oprită există deja. Detaliile UI sunt în `industrial-dashboard-ux`.
- SMED: înregistrarea changeover-ului cu durata pe faze (intern / extern) permite îmbunătățirea.

## Referințe

- `references/glossary.md`: definiții cu statut (confirmat LEI / practică uzuală).
- `references/wastes-and-6s.md`: TIMWOOD, DOWNTIME, 5S/6S, SMED. Toate marcate ca practică uzuală.

## Criterii de validare

- [ ] Fiecare termen folosit în UI are definiția din glosar și statutul ei.
- [ ] Nicio afirmație de tip „standardul Lean cere…” fără sursă.
- [ ] Principiile, metodele și instrumentele nu sunt amestecate în aceeași listă fără etichetă.
