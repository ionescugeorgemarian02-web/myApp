# Model de date recomandat pentru planificare

Este o propunere pentru etapa următoare, nu o implementare. Orice schimbare de schemă trece prin `principal-software-architect` (migrare în `js/store.js → migrate()` și teste).

| Entitate | Câmpuri minime | Observații |
| --- | --- | --- |
| Linie | id, nume, zonă, stații[] | Există deja „Liniile mele” (13 linii configurate). Se reutilizează |
| Part number | id, cod (sintetic în teste), familie, cycle time per linie | Familia ajută secvențierea |
| Plan de schimb | data de lucru, schimb, linie, PN, cantitate | Data de lucru = data începerii schimbului |
| Interval | început, sfârșit, linie, PN, plan, realizat, rebut, opriri | Există ca „intervale de producție” |
| Comandă de lucru | id, PN, cantitate, termen, stare | Opțional. Fără sincronizare ERP |
| Changeover | linie, PN din → PN în, durată planificată/reală | Alimentează SMED |

Reguli: id-uri stabile, nu nume, ca referințe. Valorile lipsă se păstrează ca `null`. Câmpurile noi au valori implicite sigure în `migrate()`.
