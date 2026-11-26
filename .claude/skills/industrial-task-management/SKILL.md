---
name: industrial-task-management
description: Managementul sarcinilor și al acțiunilor în producție pentru myApp. Acoperă planificarea, atribuirea și prioritizarea sarcinilor, persoana responsabilă, termenele, sarcinile recurente, rutinele supervizorului, urmărirea acțiunilor, escaladarea sarcinilor întârziate, verificarea finalizării, responsabilitatea, RACI, fluxurile pe schimburi, managementul zilnic și urmărirea acțiunilor corective. Folosește-l când modifici Probleme și acțiuni, angajamentele din Notițe, listele de sarcini, termenele sau regulile de închidere și de restanță. Conținutul tehnic al unui 8D este în automotive-quality-engineering.
---

# Managementul sarcinilor industriale

## Când se activează

- Adaugi sau modifici câmpurile unei acțiuni (responsabil, termen, prioritate, stare).
- Implementezi sarcini recurente, rutine sau restanțe.
- Definești reguli de închidere și de verificare a finalizării.
- Construiești RACI sau vederi „ce am de făcut azi”.

## Modelul unei acțiuni

| Câmp | Regulă |
| --- | --- |
| Titlu | Verb + obiect („Înlocuiește duza robotului A1”) |
| Sursa | Problemă, audit, predare, gemba, idee |
| Responsabil | Un singur rol sau un singur id accountable (A din RACI) |
| Termen | Dată + schimb opțional. Fără termen = „nedefinit”, vizibil |
| Prioritate | Derivată din impact (siguranță > calitate > livrare > cost) și termen, nu aleasă liber |
| Stare | deschisă → în lucru → finalizată → verificată (sau anulată, cu motiv) |
| Dovadă | Cerută la verificare pentru acțiunile corective |

## Metodologie

1. **Un singur Accountable** per acțiune. R poate fi mai mulți, C și I sunt opționali. Vezi `references/raci.md`.
2. **Restanța** se calculează automat: termen < data curentă de lucru și stare ≠ verificată/anulată. Nu se marchează manual.
3. **Escaladarea restanțelor** urmează matricea din `manufacturing-operations`.
4. **Recurența** (zilnic, pe schimb, săptămânal) generează instanțe noi. Nu redeschide instanța veche. Istoricul rămâne intact.
5. **Finalizat ≠ verificat.** Acțiunile corective se închid numai cu dovadă și concluzie (regulă existentă în aplicație).
6. **Ordonarea în listă:** critice și restante primele (comportament existent), apoi după termen.

## Reguli

- Responsabilul apare ca rol în exemple, nu ca nume real.
- O acțiune nu se șterge. Se anulează cu motiv.
- Ora și data se raportează la data de lucru a schimbului (schimbul de noapte = data începerii).

## Referințe

- `references/raci.md`: RACI, exemple pe roluri industriale, reguli de validare.

## Criterii de validare

- [ ] Exact un Accountable per acțiune.
- [ ] Restanța se calculează, nu se introduce.
- [ ] Recurența creează instanțe noi.
- [ ] Închiderea acțiunilor corective cere dovadă.
- [ ] Teste: termen azi, termen ieri, schimb de noapte peste miezul nopții, acțiune anulată.
