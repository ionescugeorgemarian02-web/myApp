# Matricea de calificare

## Structură

Rânduri = operatori (id), coloane = posturi. Celula conține nivelul 1–4, „—” dacă operatorul nu e calificat pe post, data ultimei evaluări și, opțional, data reevaluării.

## Necesar pe post și schimb

`{ post, schimb, nivelMinim, număr }`. Exemplu: Post 1, schimbul 1, minim nivel 3, 2 operatori.

## Acoperire

- Post acoperit dacă numărul de operatori prezenți și alocați cu nivel ≥ nivelMinim ≥ număr.
- Acoperire schimb = posturi acoperite / posturi cu necesar configurat. Un post fără necesar configurat nu intră în numitor.
- Risc „bus factor”: posturi cu un singur operator de nivel ≥ 3 în toată echipa.

## Vizualizare

Celule colorate pe nivel, cu text vizibil (numărul nivelului), nu doar culoare. Celula se modifică printr-o atingere, cu confirmare dacă scade nivelul. Detalii în `industrial-dashboard-ux`.

## Exemplu sintetic

| | Post 1 | Post 2 | Post 3 |
| --- | --- | --- | --- |
| Operator 01 | 4 | 3 | — |
| Operator 02 | 3 | 1 | 2 |
| Operator 03 | — | 3 | 3 |

Post 3 are un singur operator de nivel 3 (Operator 03). Rezultatul este un risc de cross-training, cu Operator 02 drept candidat (nivel 2).
