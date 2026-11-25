# Audit inițial și priorități

Bază analizată: `f2f953a`, branch `main`. Inventarul urmărit conține aplicația statică, active locale și un catalog separat de abilități de design în `.agents`. PWA nu importă catalogul. Nu există workflow GitHub urmărit în baza analizată.

| Componentă | Ce există | Ce trebuie corectat |
| --- | --- | --- |
| Azi, Caiet, Notițe și Analiză | Program pentru trei schimburi, agendă cu termene, predare, SQDCP, sfaturi, analiză și progres | Lipsa raportării apare ca zero la siguranță. Planul lipsă și producția zero trebuie diferențiate. Unele recomandări impun praguri și frecvențe generice. |
| Module operaționale | Jurnale și tabele configurabile, verificări, rutină, registru de probleme, matrice, liste de dezvoltare | Predarea are lacune. O problemă poate fi închisă fără dovadă. Matricea folosește un prag fix. Șabloanele vechi sugerează date personale și procese locale neverificate. |
| Date | IndexedDB `caiet-sef-schimb`, versiunea 1, magazinul `local`, cheia `caiet`. Migrare de pagini, note și câmpuri | Scrierea întregului document din două file poate pierde actualizări. Importul înlocuiește caietul după confirmare și are nevoie de o validare mai strictă. |
| Export | JSON, export local CSV, rezumate prin meniul sistemului sau clipboard | CSV trebuie să neutralizeze celulele interpretate ca formule. Rezumatele trebuie să folosească o acțiune explicită de copiere. |
| Prezentare și offline | HTML/CSS și module native, texte introduse prin DOM, active locale preîncărcate, activare manuală a versiunii | Teste de rulare pe mobil, cache complet și restaurare IndexedDB lipsesc din baza inițială. |
| Teste inițiale | Executat `node --test tests/*.mjs` | 16 trecute, 0 eșuate. |

Ordine: confidențialitate, export, validare și corectitudinea KPI; apoi predare, probleme și rutină; apoi leadership și dezvoltare; apoi configurarea indicatorilor și acoperirii. Păstrăm structura caietului și extindem aditiv câmpurile existente.
