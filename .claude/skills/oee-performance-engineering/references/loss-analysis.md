# Analiza pierderilor

## Six Big Losses (oee.com — confirmat)

| Pierdere | Factor OEE | Exemple de cod de oprire (sintetic, de configurat local) |
| --- | --- | --- |
| Equipment Failure | Availability | `AV-01 defect mecanic`, `AV-02 sculă ruptă` |
| Setup and Adjustments | Availability | `SU-01 schimbare reper`, `SU-02 reglaj` |
| Idling and Minor Stops | Performance | `MS-01 blocaj alimentare`, `MS-02 senzor` |
| Reduced Speed | Performance | rezultă din calcul (P < 100 %), nu din cod |
| Process Defects | Quality | rebut în regim stabil |
| Reduced Yield | Quality | rebut la pornire / după schimbare |

Pragul de „minor stop” față de „breakdown” (de ex. < 5 min) este o **regulă locală**. Se configurează. Nu se presupune.

## Pareto

- Fă două clasamente: **după minute** (impact) și **după frecvență** (recurență). Ele răspund la întrebări diferite. Afișează-le pe amândouă.
- Pe Pareto apare linia cumulativă și numărul total de evenimente. Opririle fără cod se grupează în „necodificat”, iar categoria nu se ascunde.
- Orizont minim recomandat: cel puțin câteva schimburi. Pe un singur schimb, Pareto e anecdotic și se spune asta.

## Oră cu oră

- Ținta orară = plan pe interval, din `production-planning`. Abaterea orară = realizat − țintă.
- O oră neraportată apare „necompletată”, nu „0 buc”.
- Abaterea cumulată pe schimb arată tendința. Comentariul de cauză se leagă de codul de oprire.

## Semnale de date suspecte

- Sumă opriri > PPT.
- Performance > 100 %.
- Același eveniment introdus de două ori (aceeași linie, începuturi suprapuse).
- Interval cu realizat, dar fără plan.
