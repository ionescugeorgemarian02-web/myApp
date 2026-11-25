# Formule KPI — referință unică

Statut: **C** = confirmat în `_shared/sources.md`, **U** = practică uzuală, **L** = definiție locală de confirmat.

## Variabile

| Variabilă | Unitate | Definiție | Statut |
| --- | --- | --- | --- |
| Planned Production Time (PPT) | min | Timpul schimbului minus opririle planificate excluse local | C (principiu), L (ce se exclude) |
| Stop Time | min | Opririle din PPT, planificate (setup) și neplanificate | C |
| Run Time | min | PPT − Stop Time | C |
| Ideal Cycle Time (ICT) | min/buc | Cel mai rapid ciclu atins în condiții optime | C |
| Total Count | buc | Toate piesele pornite: bune + rebut + reprelucrate | C |
| Good Count | buc | Piese bune din prima trecere, fără reprelucrare | C |

## Formule

| Indicator | Formulă | Unitate | Statut |
| --- | --- | --- | --- |
| Availability | Run Time / PPT | % | C |
| Performance | (ICT × Total Count) / Run Time | % | C |
| Quality | Good Count / Total Count | % | C |
| OEE | A × P × Q = (Good Count × ICT) / PPT | % | C |
| Rată de rebut | Σ rebut / Σ total | % | U (în aplicație: `scrap` din `KPI_DEFINITIONS`) |
| First Pass Yield | Σ bune din prima trecere / Σ total procesat | % | U |
| Atingerea planului | Σ realizat / Σ plan | % | L (în aplicație: `plan`) |
| Abatere | Σ realizat − Σ plan | buc | L |
| MTBF | Timp de funcționare / număr de defecte | min sau h | U |
| MTTR | Σ durate de reparație / număr de reparații | min | U, L (start = semnalare sau sosire tehnician?) |

## Agregare

- **OEE pe mai multe intervale sau linii:** Σ(Good × ICT) / Σ PPT. ICT diferă pe produs, deci se calculează pe fiecare rând și apoi se însumează.
- **A agregat:** Σ Run Time / Σ PPT. **Q agregat:** Σ Good / Σ Total.
- Media aritmetică a procentelor dă rezultate greșite la volume diferite. Nu se folosește.
- Un interval cu orice componentă lipsă se exclude din agregatul OEE și se numără la „neraportate”.

## Cazuri limită

| Caz | Comportament |
| --- | --- |
| PPT = 0 | A, OEE = null („fără timp planificat”) |
| Run Time = 0 | P = null. A = 0 % este valid |
| Total Count = 0 cu Run Time > 0 | P = 0 % este valid. Q = null |
| Good > Total | invalid, null + mesaj |
| P > 100 % | se afișează valoarea + avertisment „verifică ICT / numărarea” |
| Câmp text „12,5” | acceptat ca 12.5 (`nonnegative`) |
| Valoare negativă | invalidă, null |

## Teste sintetice minime

```js
// tests/*.test.mjs — exemplu de formă, nu cod existent
test("OEE: forma A×P×Q egală cu forma simplă", () => { /* 450, 405, 0.5, 700, 665 -> 0.739 */ });
test("OEE: Good lipsă -> null, nu 100%", () => {});
test("Agregare: nu media procentelor", () => {});
```
