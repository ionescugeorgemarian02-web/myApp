# Caietul Șefului de Schimb

Caiet personal în limba română pentru lucru în trei schimburi. Include zece pagini de pornire pentru rutina zilnică, predarea schimbului, echipă, indicatori și primele 90 de zile.

## Deschide caietul

[Deschide Caietul Șefului de Schimb în browser](https://ionescugeorgemarian02-web.github.io/myApp/). Revino la același link în același browser pentru a continua cu datele salvate. După prima încărcare completă cu internet, caietul se poate redeschide și offline.

## Cum lucrezi în versiunea 2.3

- În **Azi → Ghid rapid** găsești pașii pentru începutul, desfășurarea și predarea schimbului. Alege intervalul orar și bifează punctele terminate. **Doar nebifate** îți arată ce mai ai de făcut.
- La **Preiau schimbul de la colegul anterior** sau la orice alt punct, apasă creionul, apoi **Adaugă notiță**. Scrie observația, alege prioritatea și, dacă e nevoie, un termen. Apasă **Salvează**. Poți repeta pentru fiecare lucru de urmărit.
- În **Notițe** găsești observațiile din toate schimburile. Poți corecta textul sau termenul apăsând pe notiță. Bifează o notiță ca să o muți în **Finalizate**, de unde o poți redeschide. Bifa punctului din rutină este independentă.
- **Azi → Notițe de urmărit** afișează notițele deschise importante, scadente azi sau restante. Notițele vechi de la punctele de rutină, inclusiv din istoricul schimburilor, sunt preluate la actualizare. Textele din blocurile de notițe au legături către paginile lor în fila **Notițe**.
- **Predare** deschide formularul schimbului. **Problemă** adaugă o fișă în registru. **Rezumat** îți arată mesajul înainte de copiere sau distribuire.
- În **Pagini**, alege o pagină sau caută după titlu, notițe ori conținutul unei înregistrări. Apasă **Pagină nouă** pentru a crea una. Folosește **Editează** în interiorul paginii pentru a schimba structura, a adăuga blocuri sau a configura câmpuri.
- În **Setări**, poți ajusta programul celor trei schimburi. Apasă **Aplică programul** după completarea celor trei ore. Secțiunea **Deschiderea caietului** explică și cum poți adăuga o pictogramă pe telefon.

## Backup și recuperare

În **Setări → Salvează copia**, salvează copia completă în Fișiere sau Descărcări. După șapte zile, caietul îți amintește să faci următoarea copie. Pentru recuperare, deschide **Setări → Încarcă o copie**, alege fișierul și confirmă înlocuirea. Pentru a păstra și caietul curent, exportă-l înainte. Resetarea din Setări necesită două confirmări.

Înregistrările sunt păstrate în browserul telefonului, în IndexedDB. Aplicația cere stocare persistentă, iar telefonul decide dacă o acordă. Ștergerea datelor browserului, pierderea telefonului sau folosirea altui browser poate duce la pierderea accesului la caiet. Fișierele exportate conțin datele completate. Păstrează-le într-un loc privat și nu le încărca în repository.

Când apare **Versiune nouă disponibilă – actualizează**, apasă butonul. Datele rămân neatinse. Aplicația finalizează salvarea înainte de reîncărcare.

## Cum ceri modificări

În secțiunea **Issues → New issue** a repository-ului, descrie pagina, ce faci acum și ce ai vrea să poți face. Folosește exemple fictive. Nu atașa backupul, date de producție sau nume reale.

## Rulare pe calculator (pentru modificări)

Nu e nevoie de instalare. Din folderul proiectului rulează `python3 -m http.server 8000` și deschide http://localhost:8000.

Pentru mentenanță, sursele sunt HTML, CSS și module JavaScript fără build. La publicarea modificărilor, mărește versiunea cache-ului din sw.js și actualizează lista de fișiere pentru funcționarea offline.
