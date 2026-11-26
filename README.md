# myApp — Centrul de comandă al șefului de schimb

PWA în limba română pentru coordonarea unui schimb în producția automotive. Rutina EPT organizează ziua, iar producția, oamenii, calitatea, incidentele și sarcinile formează un singur sistem: **plan → execuție → monitorizare → reacție → responsabilitate → verificare → îmbunătățire**.

Tehnologie: HTML, CSS, module JavaScript (fără build, fără dependențe), IndexedDB, Service Worker. Funcționează offline după prima încărcare.

**Introdu date interne doar dacă politica angajatorului permite utilizarea aplicației și a dispozitivului.** Datele rămân în browserul de pe dispozitiv. Aplicația nu le criptează, nu le sincronizează și nu le trimite nicăieri. Modul **Instruire** (`?mod=instruire`) folosește exclusiv date sintetice, separate de datele reale.

## Navigare

| Secțiune | Ce găsești |
| --- | --- |
| **Azi** | Centrul de comandă: rigla schimbului (ora curentă și realizarea pe fiecare oră), realizat față de plan, abatere, „Necesită atenția ta” (reguli explicabile, fiecare cu dovada și linkul spre rezolvare), ce urmează în rutina EPT, linii, oameni, incidente, sarcini. |
| **Rutina mea EPT** | Cele cinci etape ale fișei EPT (Înainte, Început, În timpul, Sfârșit, Reguli) cu vederile „Ce fac acum”, Timeline, Săptămâna și Reguli. Statusul (Urmează, Disponibil, În lucru, Finalizat, Neîndeplinit, Depășit, Neaplicabil) se ține separat de rezultat (OK, NOK, N/A). NOK → acțiune cu responsabil și termen. „Nu pot îndeplini” consemnează escaladarea. Aplicația nu trimite mesaje. Frecvențele se configurează. |
| **Producție** | Cele 13 linii dintr-o privire (status, PN, oameni, rigla orelor, abatere) și pagina fiecărei linii: Pornește, Oprește, Nu rulează, Reia, Schimbă PN, cu „Acum” sau „Ora reală”. Corecțiile păstrează istoricul. Butoanele sunt înregistrări digitale, nu comenzi către utilaje. |
| **Planificare** | Plan pe schimb: mai multe PN-uri pe linie, ore, target, ciclu, operatori, prioritate. Planul orar se distribuie uniform, după minutele productive, din timpul de ciclu sau manual. Suma pe ore este exact targetul. Baseline-ul confirmat nu se mai schimbă; replanificarea este o revizie cu motiv. Include Gantt, conflicte și capacitate față de target. |
| **Raport orar** | Linia știe intervalul, PN-ul și targetul; tu introduci doar cifrele. Butonul „0” confirmă zero, iar un câmp gol rămâne lipsă. PN-ul se poate schimba în mijlocul orei. Downtime-ul se calculează din evenimente. |
| **Performanță (OEE)** | Availability, Performance, Quality și OEE afișate separat, după formulele de pe oee.com. Agregarea pe PN-uri diferite folosește timpul ideal ponderat. Lipsa datelor apare ca „—” cu motivul. Mai conține realizarea planului, FPY, rebut, Pareto opriri și rebut, heatmap linii × ore, trend și distribuția timpului. |
| **Incidente** | Linie → mașină → defect → timp → responsabil. Stări de la Deschis la Închis, cu ore reale. Durata intervenției este separată de downtime-ul liniei. MTTR, MTBF (cu prag de date), recurențe, Pareto. Legătură cu sarcini și 8D. |
| **Echipă** | Pontaj rapid (individual sau prin selecție multiplă), alocare pe linie și post cu conflicte (absent alocat, dublă alocare, nivel insuficient, nivel 1–2 fără suport) și propuneri de redistribuire. Decizia rămâne la tine. Matricea de calificare are exact 4 niveluri, iar „neevaluat” este afișat separat. Include training și plan de dezvoltare. |
| **Calitate și Lean** | First Off, LPA (Layer 1–3, plan și checklist versionat), Gemba walk cu TIMWOOD, bottleneck și deviații, audit 6S, Poka-Yoke (3 metode × 2 funcții), 8D D0–D8 cu porți (cauză verificată cu dovadă, eficacitate măsurată), Kaizen PDCA, Lean 4 (Takt, Flow, Zero Defect, Pull). Aplicația nu revendică conformitate IATF sau ISO. |
| **Sarcini** | Action Center: cine, ce, până când, în ce stadiu, cine verifică. Listă și Kanban, recurență, verificare cu dovadă, export CSV. |
| **Predare** | Raport generat din module; scrii doar materialele/WIP, prioritățile și observațiile. Se poate copia, descărca și salva în istoric. |
| **Mai mult** | Cataloage (linii, operații, PN-uri cu ICT, oameni, coduri de defect), setări (program, pauze, praguri, temă, coduri de pontaj), backup. |

## Date și confidențialitate

- Repository-ul este public. Nu conține date reale. Cataloagele tale (linii, oameni, PN-uri) le configurezi pe dispozitiv și nu ajung în cod.
- **Datele versiunii v4.4 nu se șterg.** La prima pornire, myApp 2 importă liniile, oamenii, calificările și problemele deschise. Nivelurile v4 se convertesc 1→2, 2→3, 3→4 și sunt marcate „de reconfirmat”. Lipsa unei evaluări rămâne „neevaluat”. Setări → „Descarcă datele caietului v4.4” exportă documentul vechi neatins.
- **Setări → Copie de siguranță** descarcă JSON-ul complet. Restaurarea validează fișierul (format, câmpuri, chei periculoase, maximum 32 MB) și cere confirmare.
- Datele pot deveni inaccesibile dacă ștergi datele browserului, pierzi telefonul sau se schimbă adresa aplicației. Exportă regulat.
- Lucrează într-o singură filă: dacă altă filă a salvat între timp, salvarea este refuzată ca să nu suprascrie datele.

## Dezvoltare și verificare

```sh
python3 -m http.server 8124 --bind 127.0.0.1
node --test tests/*.mjs
```

Testul de browser (opțional) folosește Chromium și Playwright, instalate în afara repository-ului:

```sh
npm install --prefix /tmp/myapp-test playwright-core
PLAYWRIGHT_MODULE=/tmp/myapp-test/node_modules/playwright-core node tests/browser.cjs
```

Variabile: `MYAPP_TEST_URL`, `CHROMIUM_EXECUTABLE`.

Structură:
- `js/core` — timp, numere, document, persistență, migrare, date sintetice
- `js/domain` — logică pură, testată în Node
- `js/ui` — kit DOM sigur și grafice SVG
- `js/views` — ecrane

Design system: `docs/design-system.md`. Decizii: `docs/superpowers/specs/`. Progres: `PROGRESS.md`. La adăugarea unui fișier, actualizează lista și versiunea din `sw.js`.

## Publicare

GitHub Pages servește `main`, folderul rădăcină. Publicarea se face printr-un pull request aprobat. Pe dispozitiv, acceptă actualizarea („Versiune nouă disponibilă → Actualizează”) după ce ai salvat lucrul.
