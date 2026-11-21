// Instrucțiunile implicite se afișează și în caietele existente, după titlul
// sarcinii sau cheia câmpului. Instrucțiunile scrise de utilizator au prioritate.
import { norm } from "./ui.js";

const gemba = "Mergi la posturi pe traseul permis. Verifică protecția, piesele suspecte, planul față de realizat, ordinea și acoperirea. Întreabă «Ce te blochează acum?» și «Ce abatere ai observat?». În Tur pe linie, marchează verificările și notează abaterile în Probleme.";
const preluare = "Citește fișa schimbului anterior cu colegul care predă. Întreabă «Ce risc rămâne deschis?» și «Ce verific prima dată?». Repetă prioritatea, responsabilul și ora verificării, apoi confirmă preluarea în Predare.";
const briefing = "Adună echipa la început. Spune ținta, riscul principal și cine lucrează la fiecare post. Întreabă «Cu ce începem?» și «Ce îți lipsește ca să pornești?»";
const protectie = "Privește de pe traseul permis dacă protecția cerută este purtată la fiecare post. Întreabă «Lipsește ceva pentru lucrul în siguranță?». Consemnează și anunță lipsurile conform procedurii.";
const plan = "Ia planul și totalul realizat pentru același interval și aceeași linie. Dacă diferă, întreabă «Când a început pierderea?» și «Ce a limitat producția?». Notează diferența și motivul confirmat.";
const predare = "Rezumați ce funcționează, ce e oprit și ce riscuri rămân. Scrie pentru fiecare acțiune cine o face și până când. Cere colegului să repete prima verificare și confirmă după ce ați revizuit fișa.";
const raport = "Spune rezultatul, abaterea principală și măsura luată. Precizează ce decizie sau sprijin ceri și când revii cu date. Folosește canalul aprobat.";
const unuLaUnu = "Întreabă în privat «Ce te împiedică să lucrezi după standard?» și «Ce sprijin ți-ar fi util?». Alegeți o acțiune, un responsabil și data la care reveniți.";
const datePornire = "Cere cifra oficială, definiția și perioada de referință. Scrie sursa și compară ulterior doar intervale măsurate în același fel.";

const taskInstructions = new Map(Object.entries({
  "Citește predarea": preluare,
  "Verifică problemele deschise": "Deschide Probleme și ia întâi fișele critice și restante. Pentru fiecare întreabă «Ce este sub control acum?» și «Cine verifică următorul pas?». Confirmă responsabilul și termenul.",
  "Confirmă prioritățile": "Alege cu colegul sau managerul ce rezolvați întâi în funcție de risc și termen. Scrie maximum trei priorități, cu rezultat și oră de verificare.",
  "Verifică resursele": "Compară planul cu materialele, sculele, echipamentul disponibil și oamenii alocați. Întreabă «Ce nu ajunge până la următorul lot?». Notează lipsa și cui o semnalezi.",
  "Ține briefingul": briefing,
  "Confirmă obiectivele și riscurile": "Spune ce cantitate și ce criteriu de calitate urmăriți. Arată riscul concret semnalat în predare și întreabă «Ce ne face să oprim și pe cine anunțăm?»",
  "Verifică acoperirea posturilor": "Compară prezența și alocarea din Echipa cu nivelul cerut în Polivalență. Confirmă dreptul de lucru la post. Dacă lipsește acoperirea, cere sprijin și actualizează alocarea aprobată.",
  "Escaladează blocajele": "Notează unde și când a apărut blocajul, impactul confirmat și ce ați făcut deja. Spune rolului responsabil ce decizie sau ajutor ceri și la ce oră ai nevoie de răspuns.",
  "Fă un tur Gemba": gemba,
  "Compară planul cu realizatul": plan,
  "Reacționează la abateri": "Verifică abaterea la post față de standard. Aplică măsura imediată permisă și anunță rolul responsabil. Notează ce rămâne expus și când verifici din nou.",
  "Urmărește problemele și acțiunile": "Întreabă responsabilul «Ce ai făcut? Ce dovadă ai? Ce te blochează?». Actualizează starea și termenul în Probleme, apoi escaladează blocajele care rămân.",
  "Comunică schimbările": "Spune ce se schimbă, de când și pe cine afectează. Cere echipei să repete noua ordine sau verificarea esențială. Lasă o notă dacă decizia trece în schimbul următor.",
  "Oferă feedback și sprijin": "Spune în privat ce ai observat și ce efect a avut. Întreabă «Cum ai văzut tu situația?» și conveniți un pas și o reverificare. Recunoaște concret ce a mers bine.",
  "Confirmă producția": "Compară totalurile cu evidența aprobată pentru schimb. Verifică planul, realizatul, rebutul și minutele de oprire. Completează golurile doar când ai o sursă confirmată.",
  "Actualizează problemele": "Revizuiește fișele active înainte de predare. Scrie starea reală, măsura în vigoare și următorul termen. Închide numai după ce ai consemnat dovada și concluzia.",
  "Verifică acțiunile critice": "Mergi la post cu responsabilul și verifică dacă măsura este încă aplicată. Întreabă «Ce rămâne în risc dacă predăm acum?». Treci rezultatul și următoarea verificare în Predare.",
  "Pregătește predarea": predare,
  "Notează o lecție": "Scrie un fapt care a ajutat sau a întârziat schimbul. Adaugă ce repeți sau ce schimbi data viitoare. Pune termen dacă ai de verificat efectul.",
  "Preiau schimbul de la colegul anterior.": preluare,
  "Ședința de început (5–10 min): ținta zilei, avertismente de siguranță și calitate, cine unde lucrează.": briefing,
  "Verific echipamentul de protecție.": protectie,
  "Tur pe linie: siguranță, calitate, plan față de realizat, ordine (5S), oameni.": gemba,
  "Verific producția pe oră față de plan.": plan,
  "Predau schimbul colegului următor.": predare,
  "Trimit rezumatul către șef.": raport,
  "Cer fișa postului": "Cere managerului documentul valabil. Parcurge-l împreună cu el și clarifică ce decizi, ce verifici și când escaladezi.",
  "Tur complet de la materia primă la livrare": "Urmărește fizic materialul pe traseul permis. Notează unde se verifică, așteaptă și se predă. Întreabă cine răspunde la fiecare transfer.",
  "Trec numele și postul fiecărui om în „Echipa”": "Compară alocarea cu lista aprobată. În caiet trece identificatorul neutru, postul și schimbul, apoi verifică dacă lipsește vreo alocare.",
  "Cer planul de control și instrucțiunile de lucru": "Cere documentele aplicabile la fiecare post. Verifică versiunea afișată și roagă un operator să îți arate criteriul de acceptare.",
  "Acces și instruire SAP pentru raportarea producției": "Cere accesul prin canalul intern și roagă un coleg autorizat să îți arate raportarea. Exersează cu el și verifică unde se corectează o înregistrare.",
  "Trec cifrele de pornire în „Indicatori”": datePornire,
  "Discuții unu la unu: următoarele persoane": unuLaUnu,
  "Discuții unu la unu: continui": unuLaUnu,
  "Rezolv problema mică și spun echipei a cui a fost ideea": "Aplică schimbarea aprobată și observă rezultatul. Spune echipei ce a funcționat și recunoaște contribuția cu acordul persoanei.",
  "Prezint șefului planul 30-60-90 și cifrele de pornire": "Arată reperele, perioada de referință și sursele. Întreabă ce are prioritate și ce sprijin este disponibil. Consemnează deciziile.",
  "Ziua 30: discuții unu la unu cu toată echipa și primele observații prezentate șefului.": "Compară discuțiile făcute cu lista echipei. Grupează temele comune fără nume și prezintă două fapte, o prioritate și sprijinul necesar.",
  "Ziua 60: o îmbunătățire implementată și măsurată.": "Alege o schimbare aprobată și măsoară înainte și după în aceleași condiții. Notează efectul și cine va verifica dacă se menține.",
  "Ziua 90: raport cu cifrele față de cele de pornire.": "Pune alături valoarea de pornire, valoarea curentă și sursa pentru fiecare indicator. Spune ce rămâne incert și ce decizie ceri.",
  "Cunoaște echipa, rolurile și responsabilitățile": "Mergi la fiecare post și întreabă «De ce răspunzi la schimb?» și «Pe cine anunți la o abatere?». Verifică răspunsul cu alocarea oficială.",
  "Urmărește fluxul din amonte către aval": "Parcurge traseul permis de la material la produs finit. Întreabă la fiecare transfer «Ce primești, ce verifici și ce predai?». Desenează pașii și locurile de așteptare.",
  "Identifică riscurile majore și învață regulile de siguranță": "Fă turul cu rolul de siguranță. Cere riscurile pe post, punctele de alarmare și cine poate opri sau autoriza reluarea. Repetă pașii de urmat.",
  "Învață criteriile de calitate și circuitul produsului suspect": "Cere planul de control și un exemplu de piesă conformă. Întreabă «Unde separăm produsul suspect și cine îl eliberează?». Verifică traseul și formularul.",
  "Observă predarea și urmărirea acțiunilor": "Asistă la o predare. Alege o acțiune rămasă deschisă și urmărește dacă noul schimb știe responsabilul, termenul și verificarea.",
  "Cere definițiile, sursele și pragurile KPI oficiale": "Cere proprietarului fiecărui indicator formula, perioada, sursa și pragul aprobat. Înregistrează referința în Indicatori operaționali sau în Dicționarul KPI.",
  "Stabilește legăturile cu Quality, Maintenance, Logistics și HR": "Întreabă fiecare rol «Când vă contactez, pe ce canal și cu ce informații?». Notează canalul aprobat și ce să pregătești înainte de apel.",
  "Întreabă managerul despre mandat, escaladare, evaluare, raportare și politica pentru date": "Cere exemple de decizii pe care le poți lua, de situații de escaladat și de rapoarte așteptate. Confirmă ce date pot intra în caiet și notează acordul.",
  "Stabilește o rutină de management cu echipa": "Alege cu echipa orele pentru briefing, tur, controlul planului și predare. Testează-le un schimb și ajustează ce nu se potrivește fluxului.",
  "Urmărește consecvent problemele și termenele": "Revizuiește registrul la aceeași oră în fiecare schimb. Ia întâi criticele și restantele. Confirmă cu fiecare responsabil ce livrează și până când.",
  "Îmbunătățește briefingul și predarea": "Observă ce informație lipsește sau se pierde. Adaugă o întrebare de confirmare și verifică în schimbul următor dacă prioritatea a fost înțeleasă.",
  "Înțelege cauzele pierderilor din date comparabile": "Compară intervale cu aceeași linie, definiție și acoperire. Alege pierderea principală și verifică la post ce s-a întâmplat înainte de a numi cauza.",
  "Propune o îmbunătățire mică, măsurabilă": "Alege o pierdere observată și definește un rezultat măsurabil. Cere aprobarea pentru o probă scurtă, apoi compară rezultatul cu valoarea de pornire.",
  "Clarifică și consolidează responsabilitățile": "Alege o acțiune la care răspund mai multe roluri. Stabiliți cine execută, cine verifică și cine decide. Cere fiecăruia să confirme pasul lui.",
  "Fă coaching pe post cu verificare": "Roagă persoana să explice standardul, arată un pas și las-o să-l repete. Întreabă ce a verificat și programați o repetare observată.",
  "Lucrează la o problemă recurentă prin metode validate": "Adună exemple comparabile și verifică diferențele la post. Confirmă ipoteza cu date. Alege cu rolul competent metoda și dovada cerută pentru corecție.",
  "Revizuiește eficacitatea urmăririi acțiunilor": "Compară acțiunile la termen cu cele restante. Deschide câteva fișe închise și verifică dacă au dovezi. Ajustează frecvența verificărilor cu echipa.",
  "Evaluează tendințele KPI pe perioade comparabile": "Alege perioade cu aceeași definiție, zonă și acoperire. Marchează lipsurile de date și explică abaterile confirmate înainte de a trage o concluzie.",
  "Verifică eficacitatea acțiunilor": "Repetă măsurarea după corecție în condiții comparabile. Notează perioada, rezultatul și dacă abaterea a revenit. Păstrează acțiunea deschisă dacă dovada lipsește.",
  "Standardizează îmbunătățirile aprobate": "Cere actualizarea documentului aplicabil, explică schimbarea în briefing și verifică la post că echipa o poate demonstra.",
  "Pregătește rezultatele, incertitudinile și următoarele decizii pentru manager": "Pune alături valoarea de pornire, rezultatul și sursa. Spune ce rămâne incert, ce ai încercat și ce decizie ceri până la următorul reper.",
}).map(([title, instruction]) => [norm(title), instruction]));

export function taskGuidance(item) {
  const title = norm(item.title);
  return item.details?.trim() || taskInstructions.get(title) || taskInstructions.get(title.split(" · ").slice(1).join(" · ")) || "";
}

const auditInstructions = new Map(Object.entries({
  "Echipamentul de protecție e purtat corect la toate posturile": protectie,
  "Apărătorile și senzorii de siguranță funcționează": "Privește dacă protecțiile sunt la loc și întreabă operatorul dacă verificarea autorizată de pornire a trecut. La o lipsă, marchează NOK și anunță rolul responsabil.",
  "Instrucțiunile de lucru sunt afișate și respectate": "Compară versiunea vizibilă la post cu documentul valabil. Cere operatorului să îți arate un pas critic și criteriul după care îl verifică.",
  "Piesele suspecte sunt separate și etichetate": "Verifică zona aprobată de separare și eticheta lotului. Întreabă «Ce cantitate este reținută și cine decide ce urmează?»",
  "Producția pe oră e în linie cu planul": plan,
  "Opririle sunt anunțate la mentenanță": "Cere ora sesizării, echipamentul și confirmarea că mentenanța a primit mesajul. Notează următoarea actualizare.",
  "Ordine și curățenie (5S) la posturi": "Compară postul cu reperul vizual aprobat. Verifică accesul, sculele și obiectele lăsate în afara locului. Notează exact unde apare abaterea.",
  "Toate posturile sunt ocupate conform planului": "Compară oamenii prezenți cu alocarea afișată. Confirmați nivelul cerut la post și notați operațiile fără acoperire.",
  "Zona și căile de acces au fost verificate conform cerințelor locale.": "Parcurge căile permise și observă accesul, obstacolele și marcajele. Notează punctul exact dacă traseul este blocat sau reperul lipsește.",
  "Riscurile observabile și măsurile deschise au fost revizuite.": "Compară situația din zonă cu alertele deschise. Întreabă dacă măsura rămâne aplicată și cine verifică următorul pas.",
  "Obiectele păstrate au locul stabilit și accesibil.": "Ia două sau trei obiecte folosite des și verifică locul marcat și accesul. Întreabă ce obiect este greu de găsit în timpul lucrului.",
  "Situația de la post corespunde reperului vizual aprobat.": "Compară postul cu fotografia sau marcajul aprobat. Notează obiectul și locul unde apare diferența.",
  "Instrucțiunea aprobată și versiunea aplicabilă sunt accesibile.": "Cere operatorului să îți arate instrucțiunea folosită și compară numărul de versiune cu referința valabilă.",
  "Pașii observați sunt comparați cu instrucțiunea valabilă.": "Observă un ciclu de lucru și urmărește un pas critic. Dacă diferă de instrucțiune, întreabă «Ce te împiedică să urmezi pasul?»",
  "Produsul suspect este identificabil și separat în aria aprobată.": "Verifică eticheta, cantitatea și locul de separare conform standardului. Confirmă ce lot sau interval este afectat.",
  "Notificarea și responsabilul urmează procesul local.": "Confirmă cine a fost anunțat, la ce oră și cine decide dispoziția produsului. Notează răspunsul sau termenul de revenire.",
  "Zonele de transfer și stocurile intermediare sunt vizibile.": "Verifică marcajele de transfer, identificarea stocului și ce așteaptă procesarea. Întreabă unde se acumulează material.",
  "Blocajele și schimbările de prioritate sunt comunicate.": "Verifică dacă operația următoare știe ce lot intră primul, de când și cine a transmis schimbarea.",
  "Materialele necesare următoarei secvențe sunt disponibile sau lipsurile sunt consemnate.": "Compară lista de materiale pentru următorul lot cu ce este efectiv la post. Notează codul aprobat, cantitatea lipsă și ora estimată de sosire.",
  "Identificarea materialelor urmează cerințele de la post.": "Compară eticheta materialului cu cerința operației. Verifică dacă tipul și lotul pot fi urmărite conform standardului.",
  "Predarea și prioritățile au fost revizuite.": "Arată ultima predare echipei și cere cuiva să repete riscul deschis și prima verificare. Notează neclaritățile ca acțiuni.",
  "Acoperirea operațiilor și verificările locale de pornire sunt confirmate.": "Verifică alocarea, competența cerută și documentarea verificărilor de pornire. Semnalează orice lipsă înainte de reluare, conform procedurii.",
  "Acțiunile urgente au rol responsabil și termen.": "Deschide fișele urgente. Confirmă cu rolul numit ce face și până la ce oră. Marchează NOK dacă lipsește unul dintre aceste răspunsuri.",
  "Eficacitatea este verificată cu o dovadă pentru acțiunile propuse spre închidere.": "Cere măsurarea sau proba de după corecție. Verifică rezultatul față de criteriul stabilit și notează referința în fișa problemei.",
}).map(([title, instruction]) => [norm(title), instruction]));

export function auditGuidance(item) {
  return (typeof item.details === "string" && item.details.trim()) || auditInstructions.get(norm(item.title)) || "";
}

export const intervalGuidance = {
  zone: "Verifică linia pe al cărei raport te bazezi.",
  shift: "Alege schimbul în care s-a lucrat intervalul.",
  date: "La schimbul de noapte, folosește data la care a început schimbul.",
  start: "Folosește ora reală. Dacă ai o propunere, verifică dacă intervalele sunt consecutive.",
  end: "Pune data calendaristică următoare dacă ai trecut de miezul nopții.",
  plan: "Ia ținta aprobată pentru acest interval, în bucăți.",
  produced: "Notează totalul din aceeași perioadă. Scrie 0 dacă n-a ieșit nicio piesă și lasă gol dacă cifra lipsește.",
  good: "Numără piesele conforme la final, inclusiv cele devenite conforme după reprelucrare.",
  scrap: "Numără doar piesele clasificate drept rebut în interval.",
  rework: "Numără piesele care au avut nevoie de reprelucrare, inclusiv dacă sunt bune la final.",
  firstPass: "Numără piesele conforme de la prima trecere, înainte de reprelucrare.",
  plannedTime: "Introdu minutele programate pentru producție în acest interval.",
  downtime: "Adună minutele de oprire din interval, fără să numeri aceeași oprire de două ori.",
  equipment: "Notează postul sau mașina la care a apărut abaterea.",
  cause: "Notează ce cauză a fost confirmată. Dacă încă o verifici, precizează asta.",
  action: "Scrie ce s-a schimbat la post și ce verificare arată efectul.",
  problemId: "Leagă fișa existentă dacă abaterea are deja responsabil și urmărire în Probleme.",
};

const owner = "Notează rolul care a acceptat următorul pas, de exemplu Mentenanță sau Calitate.";
const deadline = "Alege data până la care rolul responsabil a confirmat verificarea sau livrarea.";
const workDate = "La schimbul de noapte, folosește data la care a început schimbul.";
const verify = "Notează ce ai verificat, când și ce rezultat ai obținut față de criteriul stabilit.";
const context = { data: workDate, schimb: intervalGuidance.shift, equipment: intervalGuidance.equipment };
const handoverGuidance = {
  ...context,
  handoverZone: intervalGuidance.zone,
  "situatia productiei / probleme": "Scrie ce funcționează și ce abatere rămâne. Exemplu «Linia A funcționează. La postul 2 se verifică primele 5 piese din lotul următor.»",
  probleme: "Scrie ce abatere rămâne deschisă, unde este și ce trebuie verificat la preluare.",
  "echipamente oprite sau instabile": "Notează echipamentul, starea, de când și cine confirmă dacă poate fi repornit.",
  "masini oprite": "Notează echipamentul, starea, de când și cine confirmă dacă poate fi repornit.",
  safetySummary: "Spune ce risc rămâne, ce măsură e în vigoare și cine verifică dacă se menține.",
  materialShortage: "Notează materialul, cantitatea lipsă și ora confirmată sau estimată pentru aprovizionare.",
  deliveryRisk: "Scrie ce lot sau termen e în risc, ce diferență ai față de plan și ce decizie este necesară.",
  "calitate / rebut": "Spune ce defect a apărut, ce lot poate fi afectat și ce rămâne separat sau de verificat.",
  "lipsuri de personal sau competente": "Notează posturile neacoperite, nivelul care lipsește și sprijinul cerut.",
  absente: "Spune ce posturi sunt afectate și cum se acoperă operația. Folosește roluri sau identificatori neutri.",
  handoverActions: "Scrie câte o acțiune cu rol și termen. Exemplu «Verifică senzorul la postul 2 · Mentenanță · 14:30».",
  handoverEscalation: "Spune cui ai transmis blocajul, ce decizie ceri și până când revii cu date.",
  nextChecks: "Scrie exact ce se verifică, unde, când și cui i se comunică rezultatul.",
  "prioritati pentru schimbul urmator": "Alege prima acțiune și spune ce urmează după ea, cu responsabil și termen.",
  "de urmarit": "Notează ce poate reapărea și la ce oră se verifică din nou.",
  plan: "Folosește planul aprobat pentru întregul schimb, în bucăți.",
  produced: "Folosește totalul confirmat pentru schimb, în aceeași arie ca planul.",
  scrap: "Numără doar piesele clasificate drept rebut în schimb.",
  downtime: "Notează totalul confirmat al minutelor de oprire din schimb.",
  planned: "Ia efectivul planificat din lista aprobată pentru schimb.",
  present: "Numără persoanele prezente în aceeași arie ca efectivul planificat.",
  prepared: "Bifează după ce ai verificat situația, riscurile și acțiunile cu rolurile și termenele lor.",
  received: "Repetă colegului primul risc și prima verificare, cu responsabil și oră. Bifează după ce sunt clare.",
};
const problemGuidance = {
  ...context,
  incidentShift: intervalGuidance.shift,
  problem: "Scrie ce ai observat, unde și când. Exemplu «3 piese zgâriate la postul 2, între 10:00 și 10:30».",
  impact: "Alege ce este afectat în primul rând. Descrie impacturile suplimentare în fișă.",
  urgency: "Alege după urgența intervenției și regulile locale. Escaladează imediat dacă riscul o cere.",
  containment: "Notează măsura deja luată, aria acoperită și ora. Exemplu «Lotul a fost separat la 10:35. Calitatea verifică loturile vecine».",
  responsabil: owner,
  termen: deadline,
  stare: "Folosește În lucru când acțiunea a început și Verificare când testezi efectul. Închide după dovadă și concluzie.",
  escalation: "Scrie cui raportezi, ce risc rămâne, ce decizie ceri și când revii cu o actualizare.",
  "cauza (5 de ce)": "Pornește de la faptul observat. Întreabă «De ce s-a întâmplat?» și verifică fiecare răspuns la post înainte de a trece mai departe.",
  actiune: "Descrie corecția aplicată cauzei. Exemplu «Mentenanța a schimbat ghidajul uzat și a verificat reglajul».",
  effectiveness: verify,
  closureNote: "Consemnează dacă abaterea a revenit și ce verificare rămâne după închidere.",
  defectCategory: "Folosește aceeași categorie pentru același defect, ca să-l poți regăsi în Analiză.",
};
const safetyGuidance = {
  ...context,
  safetyType: "Alege Incident pentru un eveniment produs, Near-miss pentru unul evitat la limită și Observație pentru o condiție semnalată. Urmează clasificarea locală.",
  "ce s-a intamplat": "Scrie faptele observate, locul și ora. Exemplu «La 08:20, un ambalaj a căzut în zona de transfer».",
  gravitate: "Selectează severitatea conform criteriilor locale și anunță rolul responsabil dacă situația o cere.",
  "actiune imediata": "Notează cum a fost pusă zona în siguranță conform procedurii, pe cine ai anunțat și când.",
  stare: "Ține fișa deschisă până când măsura este urmărită și rezultatul confirmat conform procedurii locale.",
};
const stopGuidance = {
  ...context,
  stopDate: workDate,
  stopEquipment: intervalGuidance.equipment,
  stopCause: intervalGuidance.cause,
  stopMinutes: "Calculează de la oprire la reluarea confirmată. Lasă gol cât timp oprirea continuă sau durata lipsește.",
  "masura luata": "Scrie ce ai semnalat, cui, ce intervenție a fost confirmată și când verifici reluarea.",
};
const teamGuidance = {
  name: "Folosește un identificator neutru, de exemplu OP-07.",
  post: "Notează postul atribuit conform alocării aprobate.",
  "instruit pe posturile": "Notează posturile pentru care instruirea a fost confirmată. Actualizează nivelul în Polivalență.",
  observatii: "Notează doar informația de lucru necesară, de exemplu o verificare cu mentorul la următorul schimb.",
  teamShift: "Alege schimbul alocat pentru calculul necesarului din Polivalență.",
};
const oneOnOneGuidance = {
  data: "Alege data la care a avut loc discuția.",
  "identificator neutru": teamGuidance.name,
  nume: teamGuidance.name,
  "blocaj operational": "Întreabă «Ce te oprește să lucrezi cum trebuie?». Notează un exemplu concret dat de coleg.",
  "ce il incurca": "Întreabă «Ce te oprește să lucrezi cum trebuie?». Notează un exemplu concret dat de coleg.",
  "schimbare convenita": "Scrie ce ați convenit să încercați și cum veți judeca rezultatul.",
  "ce as schimba / ce n-as schimba": "Întreabă «Ce ai schimba prima dată? Ce merită păstrat?». Notează doar aspectele de lucru.",
  "ce il motiveaza": "Întreabă «Ce te ajută să faci treabă bună?» și notează un sprijin concret.",
  "sprijin necesar": "Întreabă «De ce ajutor ai nevoie de la mine sau de la alt rol?». Notează cine poate oferi sprijinul.",
  "ce am promis": "Scrie angajamentul pe care îl poți verifica la discuția următoare.",
  "termen promisiune": deadline,
  rezolvat: "Bifează după ce ai revenit cu răspunsul și ați verificat rezultatul.",
};
const learningGuidance = {
  learningDate: "Notează data la care ai agreat acțiunea sau ai consemnat ideea.",
  learningKind: "Alege Instruire pentru o operație de învățat, Coaching pentru sprijin la post sau Idee pentru o îmbunătățire.",
  "identificator neutru sau rol": teamGuidance.name,
  "post / operatie": "Numește operația concretă pe care o exersați sau o îmbunătățiți.",
  "actiune sau propunere": "Scrie ce face persoana și criteriul după care verificați rezultatul.",
  "rol responsabil": owner,
  termen: deadline,
  learningOutcome: verify,
  learningClosedDate: "Scrie data verificării rezultatului, după ce acțiunea a fost finalizată.",
  stare: "Treci la Închis când ai consemnat rezultatul verificat și data finalizării.",
};
const contactGuidance = {
  departament: "Alege rolul care poate răspunde la escaladare, de exemplu Calitate sau Logistică.",
  "rol de contact": "Notează funcția de apelat, de exemplu «Tehnician de serviciu».",
  "canal aprobat": "Scrie canalul folosit în fabrică, de exemplu «Extensia internă de serviciu».",
  "ce cere de la mine": "Întreabă ce informații să pregătești. Exemplu «Post, ora abaterii, lot și măsura luată».",
};
const decisionGuidance = {
  data: "Notează când a fost luată decizia.",
  decizia: "Scrie alegerea, de când se aplică și ce rezultat așteptați.",
  "context si variante": "Notează ce a declanșat decizia, variantele discutate și motivul alegerii.",
  "cine decide": "Consemnează rolul cu mandat pentru decizie.",
  "cine a fost consultat": "Notează rolurile care au confirmat riscurile și resursele.",
  "termen revizuire": "Stabilește ziua când verifici dacă decizia a avut efectul așteptat.",
  rezolvat: "Bifează după ce ai verificat efectul sau după ce ai consemnat o nouă decizie.",
};
const indicatorGuidance = {
  indicator: "Folosește denumirea din raportarea oficială, ca să poți compara aceeași măsură în timp.",
  "valoare de pornire": datePornire,
  sursa: "Scrie raportul aprobat și perioada din care ai preluat cifra.",
  "sapt. 2": "Măsoară cu aceeași formulă și aceeași acoperire ca la pornire.",
  "sapt. 4": "Măsoară cu aceeași formulă și aceeași acoperire ca la pornire.",
  "sapt. 8": "Măsoară cu aceeași formulă și aceeași acoperire ca la pornire.",
  "tinta la ziua 90": "Trece ținta agreată cu managerul în aceeași unitate ca valoarea de pornire.",
  "definitie operationala": "Spune când se numără un caz și ce intră în arie.",
  "formula validata": "Scrie numărătorul, numitorul și tratamentul datelor lipsă, după regula confirmată.",
  unitate: "Păstrează unitatea din sursa validată, de exemplu bucăți, minute sau procent.",
  "sursa autorizata": "Notează raportul sau registrul aprobat și rolul care publică datele.",
  perioada: "Precizează intervalul măsurat, de exemplu pe schimb sau pe săptămână.",
  "prag propus": "Cere pragul rolului care răspunde de indicator și confirmă dacă e minim sau maxim.",
  "validat intern": "Bifează după ce proprietarul confirmă definiția, formula, sursa și pragul.",
};

const recordTypes = [
  ["prepared", handoverGuidance], ["problem", problemGuidance], ["safetyType", safetyGuidance],
  ["stopEquipment", stopGuidance], ["name", teamGuidance], ["learningKind", learningGuidance],
  ["ce am promis", oneOnOneGuidance], ["departament", contactGuidance], ["decizia", decisionGuidance],
  ["valoare de pornire", indicatorGuidance], ["definitie operationala", indicatorGuidance],
];

export function recordGuidance(block) {
  return recordTypes.find(([key]) => block.cols.some((col) => col.key === key || norm(col.name) === key))?.[1] || {};
}
