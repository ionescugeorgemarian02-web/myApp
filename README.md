# Caietul Șefului de Schimb

PWA personală, în limba română, pentru coordonarea unui schimb în producție. Aplicația folosește HTML, CSS, module JavaScript și IndexedDB. Rapoartele se pot copia și salva local.

**Introdu date interne doar dacă politica angajatorului permite utilizarea aplicației și a dispozitivului personal.** Browserul păstrează datele local. Aplicația nu le criptează și nu le sincronizează. Copiile JSON și CSV conțin datele completate. Folosește roluri și identificatori neutri și păstrează copiile într-un loc aprobat. În modul Instruire folosește exclusiv date fictive.

## Pe telefon

1. Deschide adresa aprobată cu internet și așteaptă încărcarea completă. Pe Android folosește meniul Chrome → **Instalează** sau **Adaugă pe ecranul de pornire**. Pe iPhone folosește Safari → **Partajare → Adaugă pe ecranul principal**.
2. Pornește cu **Setări → Confidențialitate și instruire → Deschide modul de instruire**. Caietul de instruire este separat. Ecranul, rezumatele și exporturile sunt marcate. După încărcare, activează modul avion și redeschide aplicația pentru a verifica offline pe telefonul tău.
3. Dacă politica locală permite, revino la caietul personal. Zona de lucru este **Sudură** și cuprinde toate cele 13 linii. O poți verifica în **Setări → Zona și liniile**. Un interval raportat pe o linie (ex. PSA 3) intră și în totalul zonei Sudură. Confirmă orele în **Programul schimburilor**. Pentru caiete noi, data planului este 23 noiembrie 2026. Caietele existente își păstrează data, editabilă din **Linia mea**.
4. Deschide același URL și folosește același browser sau aceeași pictogramă pentru a regăsi datele. Verifică persistența după instalare, deoarece platforma poate folosi un spațiu separat pentru aplicația de pe ecranul principal.

## Fluxuri principale

| Ecran | Ce faci |
| --- | --- |
| **Azi** | Vezi data de lucru, schimbul, cât a mai rămas din el, câte activități EPT ai bifat și câte linii ai verificat. Cardul **Acum în rutina EPT** arată următoarele activități din faza schimbului, cu DA/NU direct, și verificarea la 2 ore care urmează sau e întârziată. **Liniile mele** arată cele 13 linii colorate după stare. **Planul primei săptămâni** arată punctele zilei din „Săptămâna 1”. Vezi data de lucru, zona și schimbul. Vezi alertele critice și deschizi direct fișele lor sau o ciornă SBAR. Panoul afișează următoarea acțiune a schimbului, permite adăugarea unui interval și deschide etapa curentă a rutinei. Din **Raportează** înregistrezi o problemă sau un eveniment de siguranță. |
| **Rutina** | Fișa EPT Supervisor, cu cele 47 de activități pe secțiunile colorate de pe hârtie: Înainte (gri), Început (galben), În timpul (verde), Sfârșit (albastru), Reguli (roșu). Apeși DA sau NU. La NU se deschid Observațiile și poți crea o problemă. Butonul **?** explică termenul (TOP 5, Stoc blocat, QPS/8D, EPU…), iar **Cum o fac** dă pașii practici. Verificările la 2 ore și activitățile săptămânale se bifează separat. Fișa pornește goală la fiecare schimb, iar schimburile încheiate rămân în istoric. **Trimite fișa** o copiază ca text, iar **Descarcă pentru Excel** o salvează în CSV. |
| **Producție** | Sus ai **Liniile mele**: cele 13 linii (Fam B1, Fam B2, PSA 3, P6 JLR, DEGASS, AMG/CCC, M282, JLR 663, GDI, UFC, Valve, PL65 RM, X90 Audi), fiecare cu starea OK / Atenție / Oprită, plan, realizat, rebut, minute de oprire, operatori și ore TL. Ritmul compară realizatul cu cât trebuia produs până la ora curentă. Bifa orei la **Verificările la 2 ore** intră și în fișa EPT. Totalurile liniilor completează indicatorii schimbului și rezumatul. Dedesubt adaugi intervale din **Azi** sau **Producție**. Formularul propune începutul de la finalul ultimului interval din același context, când se potrivește, și afișează ambele date la trecerea peste miezul nopții. Înregistrezi plan, realizat, calitate, timp, cauză și acțiune. Poți lega o problemă sau deschide **Analiză**. Totalurile din acest ecran acoperă numai intervalele afișate și cer valori complete pentru indicatorul calculat. |
| **Predare schimb** | În fila **Predare**, consulți întâi situația și riscurile, apoi acțiunile și rolurile responsabile. Cifrele se extind separat, înainte de confirmare. Preluarea cere mai întâi o predare verificată. Modificarea fișei invalidează confirmările. Rezumatul poate fi copiat. Fișa personală se folosește în completarea procesului oficial. |
| **Probleme și acțiuni** | Problemele critice și restante apar primele, cu responsabil și termen. Înregistrezi măsura imediată lângă impact și prioritate. Cauza, corecția și dovada eficacității se completează în fișă. Închiderea cere acțiunea corectivă, dovada eficacității și o concluzie. Cauți după text și filtrezi după stare, termene și urgență. |
| **Caiet** | Deschizi Analiză, Notițe, Leadership și SBAR, planul de dezvoltare, echipa, polivalența, audituri personale, registrul opririlor și dicționarul KPI local. Pentru un caiet migrat poți copia modelul cronologic din secțiunea Șabloane. Arhivează rutina precedentă dacă vrei să păstrezi istoricul și să afișezi doar modelul nou. |
| **Analiză** | Vezi graficele istorice și sursa fiecărui indicator SQDCP, cu starea raportărilor. **Indicatori operaționali și praguri** adaugă perioada editabilă, sursa, formula, unitatea și pragul per KPI. Pentru indicatorii de producție selectează zona. Pentru OEE, MTTR și MTBF rămâne disponibil dicționarul documentar până la definirea datelor necesare. |

Cu programul confirmat, rutina deschide etapa de început în prima oră, etapa de final în ultima oră și etapa de lucru între ele. În ultima oră, panoul pune predarea în prim-plan. Schimbul de noapte folosește data de lucru la care a început. Instrucțiunile scurte apar sub punctele din rutină, tur și planul de dezvoltare și lângă câmpurile de completat. Pentru un punct personal, poți scrie instrucțiuni din detaliile punctului sau din modul Editează. Deschiderea unei predări sau probleme noi pornește o ciornă în fila curentă, iar prima editare validă o înregistrează. Intervalele de producție se înregistrează cu **Salvează**.

La **Polivalență**, alocă întâi schimbul în **Echipa** și folosește „Niveluri și necesar pe schimb” pentru criterii. Indicatorul arată acoperirea pe post pe baza alocării și nivelului înregistrat, fără a verifica prezența, autorizarea sau conflictele de alocare între posturi. Ghidurile, formularele și orele orientative trebuie verificate față de practica locală.

## Backup și recuperare

- **Setări → Copie de siguranță → Salvează copia** descarcă fișierul JSON complet. Verifică fișierul în Descărcări și păstrează-l separat de telefon dacă politica permite.
- **Încarcă o copie** validează fișierul și cere confirmarea înlocuirii. Exportă întâi caietul curent. Restaurează copiile de instruire în modul Instruire.
- În tabelele care permit export, **Editează → Export CSV** descarcă tabelul. Funcția de copiere a rapoartelor folosește clipboardul sau afișează textul selectabil.
- Folosește o filă pentru editare. Dacă altă filă a salvat între timp, cea veche afișează o eroare și păstrează ciorna în sesiunea deschisă. Exportă sesiunea dacă ai modificări de recuperat, apoi reîncarcă.
- Datele pot deveni inaccesibile dacă se șterge stocarea browserului, se pierde dispozitivul sau se schimbă originea aplicației. Restaurarea înlocuiește documentul caietului după confirmare.

## Dezvoltare și verificare

Rulează din directorul proiectului:

```sh
python3 -m http.server 8124 --bind 127.0.0.1
node --test tests/*.mjs
```

Deschide `http://127.0.0.1:8124/`. Service Worker cere HTTPS sau localhost. Testul opțional de browser folosește Chromium și `playwright-core`. Instalează pachetul în afara repository-ului sau indică un modul disponibil:

```sh
npm install --prefix /tmp/myapp-test playwright-core
PLAYWRIGHT_MODULE=/tmp/myapp-test/node_modules/playwright-core node tests/browser.cjs
```

Variabile opționale: `MYAPP_TEST_URL`, `CHROMIUM_EXECUTABLE` și `MYAPP_LEGACY_BACKUP` (calea către o copie de test exportată din versiunea 3.2). Testul folosește un profil izolat și date fictive. La schimbări ale aplicației actualizează versiunea și lista de resurse din `sw.js`. Testele verifică inventarul de resurse.

## Publicare manuală

GitHub Pages este configurat pentru `main`, folderul rădăcină. După aprobarea publicării, revizuiește branchul, verifică impactul pe un URL local și exportă o copie din versiunea curentă dacă politica permite. Integrează branchul în `main` printr-un pull request, apoi verifică etapa Pages și URL-ul public. Pe dispozitiv, acceptă actualizarea Service Worker după ce ai salvat lucrul și testează o redeschidere offline.

## Documentație

- [Capturi mobile înainte și după](docs/capturi/README.md)
- [Audit inițial](docs/audit.md)
- [Cercetarea publică și verificările interne](docs/cercetare.md)
- [Prima mea zi, conducerea schimbului și planul pe 90 de zile](docs/ghid-supervizor.md)
