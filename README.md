# Caietul Șefului de Schimb

PWA personală, în limba română, pentru coordonarea unui schimb în producție. Aplicația folosește HTML, CSS, module JavaScript și IndexedDB. Rapoartele se pot copia și salva local.

**Introdu date interne doar dacă politica angajatorului permite utilizarea aplicației și a dispozitivului personal.** Browserul păstrează datele local. Aplicația nu le criptează și nu le sincronizează. Copiile JSON și CSV conțin datele completate. Folosește roluri și identificatori neutri și păstrează copiile într-un loc aprobat. În modul Instruire folosește exclusiv date fictive.

## Pe telefon

1. Deschide adresa aprobată cu internet și așteaptă încărcarea completă. Pe Android folosește meniul Chrome → **Instalează** sau **Adaugă pe ecranul de pornire**. Pe iPhone folosește Safari → **Partajare → Adaugă pe ecranul principal**.
2. Pornește cu **Setări → Confidențialitate și instruire → Deschide modul de instruire**. Caietul de instruire este separat. Ecranul, rezumatele și exporturile sunt marcate. După încărcare, activează modul avion și redeschide aplicația pentru a verifica offline pe telefonul tău.
3. Dacă politica locală permite, revino la caietul personal. În **Setări → Linia mea**, configurează zona și posturile. Confirmă orele în **Programul schimburilor**. Pentru caiete noi, data planului este 23 noiembrie 2026. Caietele existente își păstrează data, editabilă din **Linia mea**.
4. Deschide același URL și folosește același browser sau aceeași pictogramă pentru a regăsi datele. Verifică persistența după instalare, deoarece platforma poate folosi un spațiu separat pentru aplicația de pe ecranul principal.

## Fluxuri principale

| Ecran | Ce faci |
| --- | --- |
| **Azi** | Vezi data de lucru, zona și schimbul. Prima atenționare trimite direct la fișa de rezolvat. Incidentele și problemele critice au prioritate și permit redactarea unei ciorne SBAR. Urmează rutina pe etape și indicatorii. Folosește **Raportează** pentru predare, probleme și siguranță, sau **Adaugă notiță**. |
| **Producție** | Adaugi intervale cu început și sfârșit, inclusiv peste miezul nopții, pentru o zonă și un schimb. Înregistrezi plan, realizat, calitate, timp, cauză și acțiune. Poți lega o problemă sau deschide **Analiză**. Totalurile din acest ecran acoperă numai intervalele afișate și cer valori complete pentru indicatorul calculat. |
| **Predare schimb** | Completezi cifrele și starea schimbului, apoi confirmi verificarea. Preluarea cere mai întâi o predare verificată. Modificarea fișei invalidează confirmările. Rezumatul poate fi copiat. Fișa personală se folosește în completarea procesului oficial. |
| **Probleme și acțiuni** | Înregistrezi impact, containment, rol funcțional, termen, escaladare, cauză și corecție. Închiderea cere acțiunea corectivă, dovada eficacității și o concluzie. Cauți după text și filtrezi după stare, termene și urgență. |
| **Caiet** | Deschizi Analiză, Notițe, Leadership și SBAR, planul de dezvoltare, echipa, polivalența, audituri personale, registrul opririlor și dicționarul KPI local. Pentru un caiet migrat poți copia modelul cronologic din secțiunea Șabloane. Arhivează rutina precedentă dacă vrei să păstrezi istoricul și să afișezi doar modelul nou. |
| **Analiză** | Vezi graficele istorice din sursele existente. **Indicatori operaționali și praguri** adaugă perioada editabilă, sursa, formula, unitatea și pragul per KPI. Pentru indicatorii de producție selectează zona. Pentru OEE, MTTR și MTBF rămâne disponibil dicționarul documentar până la definirea datelor necesare. |

Cu programul confirmat, panoul amintește verificarea predării în ultima oră a schimbului în curs. Schimbul de noapte folosește data de lucru la care a început. Deschiderea unei predări sau probleme noi pornește o ciornă în fila curentă, iar prima editare validă o înregistrează. Intervalele de producție se înregistrează cu **Salvează**.

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
