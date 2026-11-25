# Tipare UI industriale

## Paleta de stare (semantică; valorile hex se aleg din tokenurile existente)

| Stare | Sens | Reacție așteptată | Indicator dublu |
| --- | --- | --- | --- |
| OK | În parametri | niciuna | ✓ + „OK” |
| Atenție | Abatere sub prag de escaladare | urmărește | ! + „Atenție” |
| Oprit / Critic | Oprire sau prag depășit | acționează / escaladează | ■ + „Oprită” |
| Fără date | Neraportat | completează | — + „Necompletat” |

## Card KPI

```
┌──────────────────────────┐
│ Realizat / Țintă   Linia A│
│  412 / 450 buc            │  ← cifra mare
│  −38 față de ritm  ! Atenție│
│  Ultimul interval: 10:00  │  ← vechimea datelor
└──────────────────────────┘
```

## Formular operator (raportare oră)

1. Linia și ora sunt precompletate.
2. Câmpurile mari: Realizat, Rebut. Opțional: Oprire (min) + cod.
3. „Salvează” rămâne fix jos, în zona degetului mare.
4. După salvare: confirmare scurtă + Undo.

## Timeline schimb

O axă orizontală pentru durata schimbului, câte un rând pe linie, segmente colorate pe stare. La atingerea unui segment apar codul, durata și acțiunea. Pe telefon timeline-ul se poate derula orizontal **în interiorul componentei**, nu în pagină.

## Heatmap

Scară secvențială cu o singură nuanță, plus valoarea numerică la atingere. Celulele fără date sunt hașurate, nu albe (albul s-ar confunda cu zero).

## Pareto

Barele sunt sortate descrescător, cu linia cumulativă în %. Se poate comuta între minute și frecvență. Se afișează N total.

## Gantt / plan

Rânduri pe linie, blocuri pe PN, changeover ca bloc distinct (hașurat). Ora curentă apare ca linie verticală.
