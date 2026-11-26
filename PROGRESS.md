# myApp 2.0 — progres și status

Actualizat: 25.11.2026. Statusurile urmează cerința: IMPLEMENTAT ȘI VERIFICAT / IMPLEMENTAT, DAR NEVERIFICAT COMPLET / PARȚIAL / NEIMPLEMENTAT / BLOCAT.

„Verificat” înseamnă teste Node pe domeniu și/sau fluxul Playwright `tests/browser.cjs`, plus inspecție vizuală la 360–1440 px.

| Modul | Status | Dovadă / limită |
| --- | --- | --- |
| Design system „Andon”, shell, navigare (jos + sidebar), light/dark | IMPLEMENTAT ȘI VERIFICAT | Capturi la 360, 390, 430, 768, 1440 px, light și dark; fără scroll orizontal la nivel de pagină |
| Centru de comandă (Azi) + „Necesită atenția ta” | IMPLEMENTAT ȘI VERIFICAT | Test: fără date → fără alerte; fiecare alertă are dovadă și rută |
| Rutina EPT (5 etape, statusuri, OK/NOK/N/A, NOK → acțiune, escaladare, frecvențe) | IMPLEMENTAT ȘI VERIFICAT | Teste: instanțe fără duplicate, 2h, depășit; browser: OK persistă după reîncărcare |
| Rutina „după pauză” | IMPLEMENTAT, DAR NEVERIFICAT COMPLET | Apare doar după ce pauzele sunt configurate în Setări |
| Catalog linii / mașini / PN / oameni / coduri | IMPLEMENTAT ȘI VERIFICAT | Browser: adăugare în bloc, PN cu ICT |
| Linii: overview, pagina liniei, evenimente cu oră reală, corecții cu istoric | IMPLEMENTAT ȘI VERIFICAT | Teste: oprire peste 2 ore, corecție, anulare; browser: pornire la 06:10 |
| Planificare: rulări multiple, metode de distribuire, baseline imuabil, revizii cu motiv, Gantt, conflicte, capacitate | IMPLEMENTAT ȘI VERIFICAT | Teste: exemplul 760, pauză, ciclu, baseline; browser: baseline confirmat |
| Changeover planificat ca bloc distinct în plan | IMPLEMENTAT ȘI VERIFICAT | Test de domeniu: zero target, inclus în timpul planificat; hașurat în Gantt |
| Raport orar (precompletat, PN în mijlocul orei, zero confirmat vs. lipsă, stări) | IMPLEMENTAT ȘI VERIFICAT | Teste + browser (persistență după reîncărcare) |
| OEE (A, P, Q separat, agregare ponderată, „—” cu motiv), Pareto, heatmap, trend, filtre linie/PN/perioadă | IMPLEMENTAT ȘI VERIFICAT | Test: A×P×Q = forma simplă pe PN-uri eterogene; filtrul PN exclude orele mixte (explicit) |
| Incidente: flux, stări, ore reale, MTTR, MTBF cu prag, recurențe, Pareto, 8D | IMPLEMENTAT ȘI VERIFICAT | Teste + browser (incident creează oprire, fără dublare) |
| Echipă: pontaj (inclusiv multi-select), alocare, conflicte, sugestii | IMPLEMENTAT ȘI VERIFICAT | Test: absent alocat, dublă alocare, nivel 2 fără suport, sugestii |
| Matrice de calificare 1–4, istoric, risc pe post, migrare v4 | IMPLEMENTAT ȘI VERIFICAT | Teste + browser (nivelul 4 cere nivelul 3) |
| Training / plan de dezvoltare | IMPLEMENTAT, DAR NEVERIFICAT COMPLET | Fără test automat de UI |
| Utilizarea TL pe linie (regulă locală configurabilă) | PARȚIAL | Se calculează doar din alocările TL cu interval orar |
| Sarcini: listă, Kanban, recurență, verificare cu dovadă, CSV | IMPLEMENTAT ȘI VERIFICAT | Teste + browser |
| First Off, LPA (Layer 1–3, plan, versiuni), Gemba TIMWOOD, 6S, 8 baze | IMPLEMENTAT ȘI VERIFICAT | Test: versiunea veche păstrează întrebările, N/A exclus, NOK cere acțiune |
| Comparația între audituri 5S/6S (și LPA, Gemba) | IMPLEMENTAT, DAR NEVERIFICAT COMPLET | Trend de scor (ultimele 12) + NOK recurente pe întrebare; fără test automat de UI |
| Poka-Yoke (3 metode × 2 funcții, verificări, NOK → acțiune) | IMPLEMENTAT, DAR NEVERIFICAT COMPLET | Fără test automat de UI |
| 8D D0–D8 cu porți (cauză verificată cu dovadă, eficacitate măsurată), 6M, 5 Why | IMPLEMENTAT ȘI VERIFICAT | Test de domeniu |
| Registru separat de neconformități (NCR) / Red Box | PARȚIAL | Acoperit prin LPA, 8D și sarcini; nu există registru NCR dedicat |
| Kaizen PDCA (estimare separată de rezultat) | IMPLEMENTAT, DAR NEVERIFICAT COMPLET | Fără test automat de UI |
| Lean 4 (Takt, Flow, Zero Defect, Pull) cu recomandări explicabile | IMPLEMENTAT, DAR NEVERIFICAT COMPLET | Takt cere „Cerere / schimb” pe linie; WIP și Kanban nu au date (spus explicit) |
| Predare automată, istoric, export | IMPLEMENTAT ȘI VERIFICAT | Test de domeniu |
| PWA offline, actualizare versiune | IMPLEMENTAT ȘI VERIFICAT | Browser: reîncărcare offline după instalarea SW |
| Backup / restore, respingerea importurilor malițioase | IMPLEMENTAT ȘI VERIFICAT | Teste + browser |
| Migrare v4.4 fără modificarea documentului vechi | IMPLEMENTAT ȘI VERIFICAT | Teste + browser |

## Priorități rămase

1. Registru NCR / Red Box dedicat, legat de containment și 8D.
2. Comparația changeover planificat vs. real (SMED) din evenimente.
3. Filtrarea trendului de audit pe zonă/linie.
4. Teste de browser pentru Training, Poka-Yoke, Kaizen și Lean 4.
