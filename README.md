# Caietul Șefului de Schimb

Caiet personal în limba română pentru lucru în trei schimburi. Include rutina schimbului, predarea cu cifre, registrul de probleme, siguranță, tur pe linie, echipă și polivalență, indicatori calculați automat, analiza săptămânii și sfaturi generate din datele tale.

## Deschide caietul

[Deschide Caietul Șefului de Schimb în browser](https://ionescugeorgemarian02-web.github.io/myApp/). Revino la același link în același browser pentru a continua cu datele salvate. După prima încărcare completă cu internet, caietul se poate redeschide și offline.

## Cum lucrezi în versiunea 3.0

Jos ai patru secțiuni: **Azi**, **Analiză**, **Notițe** și **Caiet**. **Setări** se deschide din pictograma din antet.

### Prima configurare (2 minute)
1. **Setări → Linia mea**: scrie posturile și mașinile liniei, câte unul pe rând. Lista apare la „Post / mașină” în probleme și siguranță și în matricea de polivalență. Tot aici alegi **prima zi în funcție**, pentru planul de 90 de zile.
2. **Caiet → Echipa**: adaugă oamenii schimbului.
3. **Caiet → Indicatori**: completează valorile de pornire. Aplicația le folosește drept reper în grafice și sfaturi.

### În timpul schimbului (Azi)
- **Tura mea** arată cifrele schimbului pe structura SQDCP: Siguranță, Calitate (rebut), Livrare (plan), Cost (minute de oprire), Oameni (prezenți). Atinge o plăcuță sau **Completează cifrele schimbului** ca să deschizi predarea.
- **Sfaturi pentru tura ta**: recomandări generate din datele caietului, fiecare cu un buton care te duce unde trebuie să acționezi.
- **Acțiuni de schimb**: Predare, Problemă, **Siguranță** (incident, near-miss, observație), **Tur pe linie** și Rezumat.
- **De urmărit** și rutina funcționează ca înainte.

### Modulele noi din Caiet
- **Predare schimb** are acum grupul **Cifrele schimbului**: plan, realizat, rebut (buc), minute de oprire, efectiv planificat și prezenți. Fișa arată direct „Plan 96% · Rebut 2,5%”.
- **Probleme și acțiuni** are **Post / mașină** și etapa **Verificare**. La „Închis” se salvează data închiderii, iar vârsta problemei apare în Analiză.
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
Sfaturile sunt calculate pe telefon, din regulile de management aplicate datelor tale: siguranța întâi, probleme repetate pe același post, planul ratat repetat, rebut și opriri în creștere, restanțe vechi, probleme fără responsabil sau termen, discuții 1:1 lipsă, posturi fără înlocuitor, puncte din rutină sărite des. Datele nu sunt trimise nicăieri și aplicația funcționează fără internet.

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
