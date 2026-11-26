# Taxonomia mentenanței

## Ierarhie

```
Zonă (ex. Zona Test)
└── Linie (Linia A)
    └── Stație / post (Post 1)
        └── Echipament (Robot sudură A1, Dispozitiv D-01)
```

## Stările unui incident

`raportat` → `în lucru` (rolul responsabil a preluat) → `rezolvat` (echipamentul funcționează) → `verificat` (producția confirmă: First Off OK). Se poate redeschide. Fiecare tranziție are oră și rol.

## Coduri de oprire — EXEMPLU de configurare

| Categorie | Cod | Factor OEE |
| --- | --- | --- |
| Defect echipament | AV-01 mecanic, AV-02 electric, AV-03 sculă | Availability |
| Setup | SU-01 schimbare reper, SU-02 reglaj | Availability |
| Micro-opriri | MS-01 alimentare, MS-02 senzor | Performance |
| Organizatoric | OR-01 lipsă material, OR-02 lipsă operator | Availability (sau exclus din PPT, după regula locală) |
| Calitate | QA-01 blocare calitate | Availability |
| Necodificat | NC-00 | nedeterminat, vizibil |

## Câmpuri minime

id, echipamentId, început, sfârșit|null, simptom, cod, impact[], rolResponsabil, stare, acțiune, legătură problemă (opțional).
