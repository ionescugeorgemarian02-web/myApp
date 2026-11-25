# Formule de planificare

| Mărime | Formulă | Unitate | Statut |
| --- | --- | --- | --- |
| Takt time | timp disponibil de producție / cerere | min/buc | Confirmat (LEI) |
| Cycle time | măsurat, pe stație sau pe proces | min/buc | Confirmat (LEI, definiție) |
| Ținta pe interval | timp productiv în interval / cycle time planificat | buc | Practică uzuală |
| Ținta cu OEE de planificare | timp productiv × OEE planificat / ICT | buc | Practică uzuală. OEE-ul planificat este o ipoteză afișată |
| Capacitatea liniei | timp disponibil / cycle time al bottleneck-ului | buc | Practică uzuală |
| Încărcare | cerere × cycle time / timp disponibil | % | Practică uzuală |
| Operatori minimi teoretici | ⌈ Σ conținut de muncă / takt ⌉ | pers. | Practică uzuală |
| Eficiența echilibrării | Σ conținut de muncă / (nr. stații × cycle time max) | % | Practică uzuală |
| Ritm față de oră | realizat / (țintă × fracția de schimb scursă) | % | Local (existent în ecranul Producție) |

## Ținta orară — algoritm

1. Pornește de la intervalele schimbului confirmate în setări.
2. Pentru fiecare interval: timp productiv = durata − suprapunerea cu pauzele planificate.
3. Țintă = ⌊ timp productiv / cycle time ⌋. Cycle time-ul lipsă dă țintă `null`.
4. Diferența de rotunjire se cumulează și se adaugă în ultimul interval, ca suma țintelor să egaleze planul schimbului. Dacă se adoptă, regula se documentează.
5. Changeover-ul planificat în interval scade din timpul productiv.

## Exemplu sintetic

Interval 06:00–07:00, pauză 06:30–06:40, cycle time 0,8 min. Timp productiv = 50 min. Țintă = ⌊50 / 0,8⌋ = 62 buc.
