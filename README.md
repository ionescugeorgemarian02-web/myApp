# Caietul Șefului de Schimb

Caiet personal în limba română pentru lucru în trei schimburi. Include zece pagini de pornire pentru rutina zilnică, predarea schimbului, echipă, indicatori și primele 90 de zile.

## Cum o pornești pe telefon

Aplicația este o pagină web care se instalează ca aplicație (PWA). Nu are nevoie de Magazin Play sau App Store și merge și fără internet după prima deschidere.

**O singură dată, pe GitHub (de pe calculator sau telefon):**

1. Unește pull request-ul în ramura **main** (butonul **Merge pull request**).
2. Deschide repository-ul **myApp → Settings → Pages**.
3. La **Source** alege **Deploy from a branch**, apoi ramura **main** și folderul **/ (root)** și apasă **Save**.
4. Așteaptă 1–2 minute. Adresa aplicației va fi: **https://ionescugeorgemarian02-web.github.io/myApp/**

**Pe telefon:**

1. Deschide adresa de mai sus (cu internet, prima dată).
2. **Android (Chrome):** apare butonul **⤓ Instalează caietul pe telefon** pe pagina Azi. Dacă nu apare: **⋮ → Adaugă pe ecranul de pornire → Instalează**.
3. **iPhone (Safari):** **Partajare → Adaugă pe ecranul principal**.
4. Deschide caietul din pictogramă. Verifică o dată în modul avion că se deschide.
5. În **Azi**, verifică schimbul curent. Poți alege alt schimb atingând numărul lui. În **Setări** poți modifica ora de început a fiecărui schimb. Sfârșitul unui schimb este începutul următorului. Schimbul de noapte aparține zilei în care a început.

## Ce e nou în versiunea 1.1

- **Predarea schimbului pe pagina Azi:** buton care creează intrarea de predare pentru schimbul curent, cu data și schimbul completate.
- **✉ Trimite rezumatul către șef:** generează un text cu predarea, rutina (ce nu s-a făcut), problemele deschise și termenele depășite și îl trimite direct în WhatsApp, e-mail sau SMS (pe calculator îl copiază).
- **Termene restante:** pe Azi apar și termenele depășite (cu roșu), nu doar cele de azi. Rândurile închise sau rezolvate nu mai apar.
- **Probleme deschise:** lista problemelor cu stare diferită de „Închis”, direct pe Azi.
- **Meniurile rămân deschise** după o bifă sau o modificare (înainte se închideau la fiecare bifă).
- **Jurnalul** arată intrările noi primele, iar butonul **+ Intrare nouă** este sus.
- **Export CSV** cu numele tabelului și data în numele fișierului.
- **Setări → Aplicația pe telefon:** buton de instalare, starea stocării și data ultimului backup.
- Aplicația caută singură versiuni noi când o redeschizi.

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

## Cum ceri modificări

În secțiunea **Issues → New issue** a repository-ului, descrie pagina, ce faci acum și ce ai vrea să poți face. Folosește exemple fictive. Nu atașa backupul, date de producție sau nume reale.

## Rulare pe calculator (pentru modificări)

Nu e nevoie de instalare. Din folderul proiectului rulează `python3 -m http.server 8000` și deschide http://localhost:8000.

Pentru mentenanță, sursele sunt HTML, CSS și module JavaScript fără build. La publicarea modificărilor, mărește versiunea cache-ului din sw.js și actualizează lista de fișiere pentru funcționarea offline.
