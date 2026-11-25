# Caietul Șefului de Schimb

Caiet personal în limba română pentru lucru în trei schimburi. Include rutina EPT Supervisor, starea celor 13 linii pe schimb, predarea cu cifre, registrul de probleme, siguranță, tur pe linie, echipă și polivalență, indicatori calculați automat, analiza săptămânii și sfaturi generate din datele tale.

## Deschide caietul

[Deschide Caietul Șefului de Schimb în browser](https://ionescugeorgemarian02-web.github.io/myApp/). Revino la același link în același browser pentru a continua cu datele salvate. După prima încărcare completă cu internet, caietul se poate redeschide și offline.

## Cum lucrezi în versiunea 4.0

Jos ai cinci secțiuni: **Azi**, **Rutina**, **Linii**, **Analiză** și **Caiet**. **Notițele** sunt în **Caiet** (primul rând). **Setări** se deschide din pictograma din antet.

### Rutina EPT Supervisor
- Fila **Rutina** conține fișa ta de hârtie, cu toate cele 47 de activități, pe aceleași secțiuni colorate: **Înainte de începutul schimbului** (gri), **La începutul schimbului** (galben), **În timpul schimbului** (verde), **La sfârșitul schimbului** (albastru) și **Reguli** (roșu).
- La fiecare activitate apeși **DA** sau **NU**. La NU se deschid **Observațiile** și apare butonul **Creează problemă**, cu responsabil și termen. Procesul de escaladare din fișă este scris la final.
- **Cerințele clientului** și **Status producție** au cele 4 verificări la 2 ore (de ex. 08:00, 10:00, 12:00 și 14:00 în schimbul 1).
- Activitățile **săptămânale** (LPA, 8 Baze ale Calității, Audit SW, matrice etc.) se bifează o dată pe săptămână și rămân bifate până luni.
- Butonul **?** de lângă o activitate explică termenul (TOP 5, Stoc blocat, QPS/8D, EPU, LPA…). Termenele marcate „intern” trebuie confirmate cu șeful.
- La **Calitate**, aplicația propune zilnic linia pe care măsori un component, prin rotație.
- Fișa pornește goală la fiecare schimb. Schimburile încheiate rămân la **Fișele schimburilor anterioare**. **Trimite fișa** o trimite ca text, iar **Descarcă pentru Excel** o salvează ca fișier CSV.

### Liniile mele
- Fila **Linii** arată cele 13 linii: Fam B1, Fam B2, PSA 3, P6 JLR, DEGASS, AMG/CCC, M282, JLR 663, GDI, UFC, Valve, PL65 RM și X90 Audi. Lista se schimbă din **Setări → Liniile mele**.
- Fiecare linie are starea **OK / Atenție / Oprită**, iar la **Cifre și observații** treci plan, realizat, rebut, minute de oprire, operatori și ore TL pe linie.
- **Ritmul** compară realizatul cu cât trebuia produs până la ora curentă. Sub 90% primești un sfat de escaladare.
- Bifează ora la **Verificările la 2 ore**. Bifa intră automat și în fișa EPT.
- Totalurile liniilor intră automat în **Tura mea**, în **Rezumat** și în **Analiză** (cardul **Pe linii**).

### În timpul schimbului (Azi)
- **Antetul** arată schimbul, cât a mai rămas din el, cât ai bifat din rutină și câte linii ai verificat.
- Acțiunile rapide sunt la vedere: **Notiță**, **Problemă**, **Siguranță**, **Predare** și **Rezumat**.
- **Acum în rutină** îți arată următoarele activități din faza schimbului în care ești, cu DA/NU direct, plus verificarea la 2 ore care urmează sau e întârziată.
- **Liniile mele**: toate liniile dintr-o privire, colorate după stare.
- **Planul primei săptămâni** arată punctele zilei de azi din „Săptămâna 1” (luni, 23 noiembrie – vineri, 27 noiembrie) și câte au rămas din zilele trecute.
- **Tura mea** (SQDCP), **Sfaturi pentru tura ta** și **De urmărit**.

### Prima configurare (2 minute)
1. **Setări → Liniile mele**: verifică lista liniilor. Tot aici alegi **prima zi în funcție**, folosită pentru planul primei săptămâni și pentru cel de 90 de zile.
2. **Caiet → Echipa**: adaugă oamenii schimbului.
3. **Caiet → Indicatori**: completează valorile de pornire. Aplicația le folosește drept reper în grafice și sfaturi.

La actualizarea de la versiunea 3.1 se păstrează toate datele. Vechea listă „Rutina schimbului” trece în **Caiet → Arhivă**, de unde o poți reactiva.

### Modulele noi din Caiet
- **Predare schimb** are acum grupul **Cifrele schimbului**: plan, realizat, rebut (buc), minute de oprire, efectiv planificat și prezenți. Fișa arată direct „Plan 96% · Rebut 2,5%”.
- **Probleme și acțiuni** are **Linie / post** și etapa **Verificare**. La „Închis” se salvează data închiderii, iar vârsta problemei apare în Analiză.
- **Siguranță**: registru de incidente, near-miss și observații.
- **Tur pe linie**: 8 puncte verificate în fiecare schimb cu OK/NOK. Un NOK devine problemă cu o atingere. Punctele se modifică din **Editează**.
- **Polivalență**: matrice oameni × posturi (– neinstruit, 1 cu supraveghere, 2 autonom, 3 poate instrui). Arată posturile acoperite de mai puțin de 2 oameni autonomi.
- **Registru de decizii**: șablon în Caiet → Șabloane.
- Paginile din **Primele 90 de zile** arată „Ziua X din 90” și pot genera un **raport de progres**. Pagina **Indicatori** afișează valorile calculate automat pe ultimele 4 săptămâni.

### Analiză (revizuirea săptămânii)
- **Sfaturi inteligente**: toate recomandările, ordonate după urgență, cu siguranța pe primul loc.
- **Angajamente închise la termen**: metrica principală (notițe, puncte din liste, probleme, promisiuni 1:1, decizii).
- **Indicatorii săptămânii (SQDCP)** cu comparație față de săptămâna trecută și tendința pe 8 săptămâni.
- Grafice pe schimburi, problemele cele mai vechi, clasamentul pe posturi, rutina și turul, echipa (discuții 1:1, promisiuni, polivalență), siguranța.
- **Revizuirea săptămânii**: 3 priorități și ce ai învățat. **Raport pentru șef** trimite tot rezumatul pe WhatsApp sau e-mail.
- Săgețile din antet te duc la săptămânile anterioare.
- Fila **Progres** (lângă „Săptămâna”) arată evoluția în timp pe 4, 8 sau 13 săptămâni:
  - inele pentru ziua din cele 90, angajamentele închise la termen, rutina bifată, posturile acoperite și discuțiile 1:1;
  - grafice pentru plan realizat (cu linia de 100%, valoarea de pornire și ținta), rebut, minute de oprire, absențe, disciplina de execuție, probleme (noi, închise, rămase deschise) și siguranță.

  Fiecare grafic arată valoarea actuală și cât s-a schimbat în perioadă (verde dacă e mai bine, roșu dacă e mai rău).

### Despre sfaturi
Sfaturile sunt calculate pe telefon, din regulile de management aplicate datelor tale: siguranța întâi, linii oprite sau în urma planului, verificarea la 2 ore întârziată, activități NU din rutina EPT și cele săptămânale rămase, probleme repetate pe același post, planul ratat repetat, rebut și opriri în creștere, restanțe vechi, probleme fără responsabil sau termen, discuții 1:1 lipsă, posturi fără înlocuitor, puncte din rutină sărite des. Datele nu sunt trimise nicăieri și aplicația funcționează fără internet.

### Notițe
Pentru o problemă de remediat până la ora 20:00, apasă **Notiță nouă**, scrie ce trebuie făcut și introdu **20:00** în câmpul **Oră**. O notiță bifată este mutată la **Finalizate**, iar momentul finalizării contează la „închise la termen”.

## Backup și recuperare

În **Setări → Copie de siguranță → Salvează copia**, salvează copia completă în Fișiere sau Descărcări. După șapte zile, caietul îți amintește să faci următoarea copie. Pentru recuperare, deschide **Setări → Copie de siguranță → Încarcă o copie**, alege fișierul și confirmă înlocuirea. Pentru a păstra și caietul curent, exportă-l înainte. Resetarea din Setări necesită două confirmări.

Înregistrările sunt păstrate în browserul telefonului, în IndexedDB. Aplicația cere stocare persistentă, iar telefonul decide dacă o acordă. Ștergerea datelor browserului, pierderea telefonului sau folosirea altui browser poate duce la pierderea accesului la caiet. Fișierele exportate conțin datele completate. Păstrează-le într-un loc privat și nu le încărca în repository.

Când apare **Versiune nouă disponibilă – actualizează**, apasă butonul. Datele rămân neatinse. Aplicația finalizează salvarea înainte de reîncărcare.

## Cum ceri modificări

În secțiunea **Issues → New issue** a repository-ului, descrie pagina, ce faci acum și ce ai vrea să poți face. Folosește exemple fictive. Nu atașa backupul, date de producție sau nume reale.

## Rulare pe calculator (pentru modificări)

Nu e nevoie de instalare. Din folderul proiectului rulează `python3 -m http.server 8000` și deschide http://localhost:8000.

Testele rulează cu `node --test tests/*.mjs`.

Pentru mentenanță, sursele sunt HTML, CSS și module JavaScript fără build. Calculele (js/metrics.js) și sfaturile (js/advice.js) nu depind de interfață. La publicarea modificărilor, mărește versiunea cache-ului din sw.js și actualizează lista de fișiere pentru funcționarea offline.
