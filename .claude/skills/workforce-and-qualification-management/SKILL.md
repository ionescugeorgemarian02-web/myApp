---
name: workforce-and-qualification-management
description: Managementul echipei și al calificărilor în myApp. Acoperă planificarea forței de muncă, prezența, rosterul de schimb, alocarea operatorilor, matricea de competențe și de calificare (polivalență), managementul instruirii, echipa, atribuirea sarcinilor pe oameni, matricea de responsabilități, urmărirea competențelor, cross-training și istoricul calificărilor, după modelul cu 4 niveluri al proiectului. Folosește-l când modifici ecranele Echipa, Polivalență, Dezvoltarea echipei sau orice logică ce decide cine poate lucra pe un post. Pentru RACI și sarcini folosește industrial-task-management.
---

# Echipa și calificările

## Modelul de calificare al proiectului (cerință specifică)

| Nivel | Definiție | Poate lucra singur? | Poate instrui? |
| --- | --- | --- | --- |
| **1** | Operator nou | Nu | Nu |
| **2** | Lucrează cu ajutor | Doar cu sprijin | Nu |
| **3** | Lucrează independent și îndeplinește cerințele de calitate și cantitate | Da | Nu |
| **4** | Îndeplinește toate condițiile nivelului 3 și poate instrui alți operatori | Da | Da |

Acesta este modelul utilizatorului, nu un standard extern. Nu se înlocuiește cu alte scale.

**Observație despre codul actual** (de analizat în etapa următoare, nu de modificat acum): `SKILL_LEVELS` din `js/metrics.js` are etichetele „Neinstruit / Cu supraveghere / Autonom / Poate instrui” pe indicii 0–3, iar celula ciclează `% 4`, cu 0 = absent din matrice. Diferențe de verificat: „operator nou” față de „neinstruit”, criteriul explicit de calitate și cantitate pentru nivelul 3, și dacă 0 („necalificat pe post”) rămâne o stare separată de nivelul 1. Orice schimbare cere migrarea datelor existente (`principal-software-architect`).

## Când se activează

- Modifici matricea de calificare, necesarul pe post sau acoperirea pe schimb.
- Adaugi istoricul calificărilor, instruiri sau cross-training.
- Implementezi alocarea operatorilor pe posturi.

## Metodologie

1. **Acoperirea postului** = câți operatori prezenți și alocați ating nivelul minim cerut. Nivelul 3 este minimul implicit pentru lucru independent (configurabil).
2. **Avansarea de nivel** cere dovadă: dată, evaluator (rol) și criteriu îndeplinit. Nivelul 4 cere și confirmarea nivelului 3. Istoricul nu se suprascrie.
3. **Alocarea** verifică: prezența, nivelul ≥ minim pe post, alocarea la cel mult un post simultan și sprijinul disponibil pentru nivelurile 1–2 (un nivel 3 sau 4 pe linie).
4. **Cross-training:** posturile acoperite de un singur operator calificat sunt un risc. Le semnalezi. Planul de instruire folosește un nivel 4 ca instructor.
5. **Prezența** se înregistrează ca număr sau pe id anonim în exemple. Nu se stochează pontaje reale în repository.

## Reguli

- Date personale minime. În teste și exemple: `Operator 01`. Nume reale, matricole sau pontaje nu apar niciodată în cod sau în fixture-uri.
- Aplicația nu verifică autorizări legale sau medicale. Spune explicit asta (există deja în README).
- Indicatorul de acoperire este o „fotografie” a datelor introduse, nu o garanție.

## Referințe

- `references/matrix.md`: structura matricei, reguli de acoperire, vizualizare, exemplu sintetic.

## Criterii de validare

- [ ] Cele 4 niveluri apar exact cu definițiile proiectului.
- [ ] Avansarea are dată, rol evaluator și istoric.
- [ ] Alocarea respinge sau avertizează la: absent, nivel insuficient, dublă alocare, nivel 1–2 fără sprijin.
- [ ] Teste cu echipă sintetică.
