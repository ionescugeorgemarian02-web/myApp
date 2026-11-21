# Caietul Șefului de Schimb

Caiet personal în limba română pentru lucru în trei schimburi. Include zece pagini de pornire pentru rutina zilnică, predarea schimbului, echipă, indicatori și primele 90 de zile.

## Deschide caietul

[Deschide Caietul Șefului de Schimb în browser](https://ionescugeorgemarian02-web.github.io/myApp/). Revino la același link în același browser pentru a continua cu datele salvate. După prima încărcare completă cu internet, caietul se poate redeschide și offline.

## Cum lucrezi în versiunea 2.4

- **Azi** reunește termenele de urmărit și rutina schimbului. Deschide rutina pentru a bifa un punct sau a-i adăuga mai multe notițe. În **Acțiuni de schimb** găsești predarea, registrul de probleme și rezumatul.
- **Notițe** adună observațiile din toate schimburile. Pentru o problemă de remediat până la ora 20:00, apasă **Notiță nouă**, scrie ce trebuie făcut și introdu **20:00** în câmpul **Oră**. Aplicația completează automat data de azi dacă lipsește. Poți alege și altă dată sau poți salva un termen fără oră.
- În agendă, o notiță devine restantă după ce trece minutul ales. Un termen fără oră rămâne valabil toată ziua. Atinge textul pentru editare sau bifează notița pentru a o muta la **Finalizate**.
- **Caiet** grupează paginile de lucru în dosare. Poți deschide un dosar sau căuta direct în toate paginile și notițele. În interiorul unei pagini, **Editează** deschide uneltele de organizare.
- **Setări** se deschide din pictograma din antet. Aici găsești programul schimburilor, aspectul, copiile de siguranță și opțiunile de instalare.

## Backup și recuperare

În **Setări → Copie de siguranță → Salvează copia**, salvează copia completă în Fișiere sau Descărcări. După șapte zile, caietul îți amintește să faci următoarea copie. Pentru recuperare, deschide **Setări → Copie de siguranță → Încarcă o copie**, alege fișierul și confirmă înlocuirea. Pentru a păstra și caietul curent, exportă-l înainte. Resetarea din Setări necesită două confirmări.

Înregistrările sunt păstrate în browserul telefonului, în IndexedDB. Aplicația cere stocare persistentă, iar telefonul decide dacă o acordă. Ștergerea datelor browserului, pierderea telefonului sau folosirea altui browser poate duce la pierderea accesului la caiet. Fișierele exportate conțin datele completate. Păstrează-le într-un loc privat și nu le încărca în repository.

Când apare **Versiune nouă disponibilă – actualizează**, apasă butonul. Datele rămân neatinse. Aplicația finalizează salvarea înainte de reîncărcare.

## Cum ceri modificări

În secțiunea **Issues → New issue** a repository-ului, descrie pagina, ce faci acum și ce ai vrea să poți face. Folosește exemple fictive. Nu atașa backupul, date de producție sau nume reale.

## Rulare pe calculator (pentru modificări)

Nu e nevoie de instalare. Din folderul proiectului rulează `python3 -m http.server 8000` și deschide http://localhost:8000.

Pentru mentenanță, sursele sunt HTML, CSS și module JavaScript fără build. La publicarea modificărilor, mărește versiunea cache-ului din sw.js și actualizează lista de fișiere pentru funcționarea offline.
