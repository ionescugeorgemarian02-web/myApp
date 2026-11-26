# Skilluri de proiect pentru myApp

Instrumente de **dezvoltare** pentru Claude Code. Aplicația aflată în exploatare nu le încarcă și nu depinde de ele.

## Hartă de proprietate (o competență are un singur skill „proprietar”)

| Subiect | Proprietar | Doar trimit la el |
| --- | --- | --- |
| Formule KPI (OEE, A/P/Q, FPY, rebut, MTTR, MTBF), unități, date lipsă | `oee-performance-engineering` | toate |
| Takt, cycle time, capacitate, echilibrare, secvențiere, plan vs. realizat | `production-planning` | lean, ops |
| Principii, metode și instrumente Lean, 6S, risipe, SMED, TPM (concept) | `lean-manufacturing` | ops, maintenance |
| 8D, RCA, Ishikawa, 5 Why (metodă), CAPA, FMEA, SPC, MSA, APQP, PPAP, Poka-Yoke | `automotive-quality-engineering` | lean, maintenance |
| Rutina supervizorului, EPT, LPA, Gemba walk, predare schimb, escaladare | `manufacturing-operations` | task, workforce |
| Avarii, coduri de oprire, ierarhie utilaje, mentenanță PM/AM/CM | `industrial-maintenance-management` | oee |
| Prezență, rostering, matrice de calificare (nivelurile 1–4), instruire | `workforce-and-qualification-management` | planning |
| Sarcini, termene, RACI, rutine recurente, urmărirea acțiunilor | `industrial-task-management` | ops, quality |
| UI industrial, dashboard, formulare mobile, vizualizări | `industrial-dashboard-ux` | — |
| Arhitectura codului myApp, date, PWA offline, migrări, teste | `principal-software-architect` | toate |
| Strategie, prioritizare, analiză de gap, contestarea cerințelor | `strategic-production-advisor` | — |

## Reguli comune

Toate skillurile aplică `_shared/data-rules.md` (date lipsă, fără date reale, fără date inventate) și citează din `_shared/sources.md` (ce a fost verificat, ce este doar practică uzuală și ce este ipoteză).

## Pluginuri complementare (instalate la nivel de sesiune, nu în aplicație)

- `claude-for-manufacturing` — referințe metodologice: `daily-production-report`, `breakdown-diagnosis`, `root-cause-capa`, `inspection-to-capa`, `ncr-writeup`, `data-consolidate`. Nu conecta ERP, M365 sau Fusion fără autorizare explicită.
- `superpowers` — proces de inginerie: `brainstorming`, `writing-plans`, `test-driven-development`, `systematic-debugging`, `verification-before-completion`.
- `ui-ux-pro-max` — baza de date locală de stiluri, palete și ghiduri UX, consultată de `industrial-dashboard-ux`.
