# Caietul Șefului de Schimb

Caiet personal în limba română pentru lucru în trei schimburi. Include zece pagini de pornire pentru rutina zilnică, predarea schimbului, echipă, indicatori și primele 90 de zile.

## Deschidere și instalare

Adresa prevăzută după publicarea pe GitHub Pages este [Caietul Șefului de Schimb](https://ionescugeorgemarian02-web.github.io/caietul-sefului-de-schimb/).

1. Deschide adresa pe telefon cu internet la prima utilizare.
2. Pe Android, în Chrome, apasă **⋮ → Adaugă pe ecranul de pornire → Instalează**. Pe iPhone, în Safari, apasă **Partajare → Adaugă pe ecranul principal**.
3. Deschide caietul din pictogramă și verifică dacă îl poți redeschide în modul avion. Folosește aceeași pictogramă pentru înregistrările zilnice.
4. În **Azi**, verifică schimbul curent. Poți alege alt schimb atingând numărul lui. În **Setări** poți modifica ora de început a fiecărui schimb. Sfârșitul unui schimb este începutul următorului. Schimbul de noapte aparține zilei în care a început.

## Folosire în timpul schimbului

- Bifează punctele din rutină. La **Detalii** poți scrie notițe, stabili termenul și marca prioritatea. Așteaptă indicatorul **Salvat** înainte de a închide caietul.
- La schimbarea schimbului, rutina pornește cu bife noi. Găsești **Istoricul schimburilor** în **Pagini → Rutina schimbului**.
- În **Pagini**, deschide o pagină sau adaugă una nouă. **Organizare** permite redenumirea, duplicarea, mutarea și ștergerea. Poți arhiva o pagină sau o poți salva ca șablon. Șabloanele păstrează și conținutul paginii copiate.
- **Adaugă bloc** permite combinarea notițelor, listelor, tabelelor și jurnalelor. La tabele și jurnale, **Configurează câmpurile** stabilește ce completezi. Poți schimba tipul și numele câmpurilor. Închide meniul pentru a vedea modificările. Pentru Excel, folosește **Export CSV** (UTF-8, separator punct și virgulă).
- Ultima ștergere poate fi anulată în aceeași sesiune. **Căutare** caută și în paginile arhivate.

## Backup și recuperare

În **Setări → Exportă JSON**, salvează copia completă în Fișiere sau Descărcări. După șapte zile, caietul îți amintește să faci următoarea copie. Pentru recuperare, deschide **Setări → Importă un fișier JSON**, alege fișierul și confirmă înlocuirea. Pentru a păstra și caietul curent, exportă-l înainte. Resetarea din Setări necesită două confirmări.

Înregistrările sunt păstrate în browserul telefonului, în IndexedDB. Aplicația cere stocare persistentă, iar telefonul decide dacă o acordă. Ștergerea datelor browserului, pierderea telefonului sau folosirea altui browser poate duce la pierderea accesului la caiet. Fișierele exportate conțin datele completate. Păstrează-le într-un loc privat și nu le încărca în repository.

Când apare **Versiune nouă – reîncarcă**, apasă butonul pentru actualizare. Aplicația finalizează salvarea înainte de reîncărcare.

## Publicare pe GitHub Pages

1. În GitHub, creează un repository public numit **caietul-sefului-de-schimb**. Bifează opțiunea de creare a unui README pentru a inițializa ramura **main**.
2. Dezarhivează proiectul. În repository, alege **Add file → Upload files** și trage în pagină conținutul folderului dezarhivat, inclusiv folderele css, js și icons. Verifică dacă index.html se află direct în rădăcină. Confirmă cu **Commit changes** pe main.
3. Deschide **Settings → Pages**, alege **Deploy from a branch**, apoi **main** și **/ (root)** și apasă **Save**.
4. După publicare, deschide **Visit site** din aceeași secțiune. Dacă folosești alt cont sau alt nume de repository, actualizează adresa de la începutul acestui README.

## Cum ceri modificări

În secțiunea **Issues → New issue** a repository-ului, descrie pagina, ce faci acum și ce ai vrea să poți face. Folosește exemple fictive. Nu atașa backupul, date de producție sau nume reale.

Pentru mentenanță, sursele sunt HTML, CSS și module JavaScript fără build. La publicarea modificărilor, mărește versiunea cache-ului din sw.js și actualizează lista de fișiere pentru funcționarea offline.
