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

## Cum e organizată aplicația (versiunea 2.0)

Jos ai trei file: **Azi**, **Pagini** și **Setări**.

**Azi** – tot ce-ți trebuie în schimb:
- schimbul curent, orele și un cerc cu progresul rutinei; atingi 1 / 2 / 3 ca să alegi alt schimb;
- trei butoane rapide: **Predare** (deschide predarea schimbului curent, cu data și schimbul completate), **Rezumat** (trimite rezumatul către șef pe WhatsApp, e-mail sau SMS) și **Problemă** (notează o problemă nouă);
- rutina schimbului de bifat; la **⋯** scrii notițe sau pui termen;
- **De urmărit**: termenele depășite (cu roșu), cele de azi și problemele deschise.

**Pagini** – caietul, pe grupe: *În schimb*, *Echipa*, *Primele 90 de zile*. Sus e căutarea în tot caietul. Jos: pagină nouă, șabloane și paginile arhivate.

În tabele (Echipa, Probleme, Predare…) fiecare rând apare pe scurt; atingi rândul ca să-l deschizi și să-l completezi.

**Editează** (sus, pe fiecare pagină) – abia aici apar butoanele de organizare: redenumire, pictogramă, grup, mutare, duplicare, ștergere, configurarea câmpurilor, export CSV, adăugare de blocuri. Apasă **Gata** când termini. După o ștergere ai câteva secunde butonul **Anulează**.

**Setări** – orele schimburilor, tema (luminoasă / întunecată), copia de siguranță și instalarea pe telefon.

## Backup și recuperare

În **Setări → Salvează copia**, salvează copia completă în Fișiere sau Descărcări. După șapte zile, caietul îți amintește să faci următoarea copie. Pentru recuperare, deschide **Setări → Încarcă o copie**, alege fișierul și confirmă înlocuirea. Pentru a păstra și caietul curent, exportă-l înainte. Resetarea din Setări necesită două confirmări.

Înregistrările sunt păstrate în browserul telefonului, în IndexedDB. Aplicația cere stocare persistentă, iar telefonul decide dacă o acordă. Ștergerea datelor browserului, pierderea telefonului sau folosirea altui browser poate duce la pierderea accesului la caiet. Fișierele exportate conțin datele completate. Păstrează-le într-un loc privat și nu le încărca în repository.

Când apare **Versiune nouă disponibilă – actualizează**, apasă butonul. Datele rămân neatinse. Aplicația finalizează salvarea înainte de reîncărcare.

## Cum ceri modificări

În secțiunea **Issues → New issue** a repository-ului, descrie pagina, ce faci acum și ce ai vrea să poți face. Folosește exemple fictive. Nu atașa backupul, date de producție sau nume reale.

## Rulare pe calculator (pentru modificări)

Nu e nevoie de instalare. Din folderul proiectului rulează `python3 -m http.server 8000` și deschide http://localhost:8000.

Pentru mentenanță, sursele sunt HTML, CSS și module JavaScript fără build. La publicarea modificărilor, mărește versiunea cache-ului din sw.js și actualizează lista de fișiere pentru funcționarea offline.
