# Poka-Yoke: metode și funcții

Sunt două dimensiuni **independente**. Un dispozitiv are o metodă și o funcție.

## Funcții (cum reacționează) — confirmat LEI

| Funcție | Efect | Exemplu |
| --- | --- | --- |
| **Oprire / control** (Shutdown, Control) | Procesul nu poate continua până la corectare. LEI: cele mai puternice | Presa nu pornește fără piesă poziționată |
| **Avertizare** (Warning) | Semnal luminos sau sonor, iar operatorul decide | Buzzer la lipsa unei componente |

## Metode (cum detectează) — practică uzuală (Shingo)

| Metodă | Principiu | Exemplu sintetic |
| --- | --- | --- |
| **1. Contact** | Detectează forma, dimensiunea, poziția sau prezența prin contact fizic sau senzor | Știft de ghidare care permite montarea piesei într-o singură orientare |
| **2. Valoare fixă** (Fixed-Value, constant number) | Verifică dacă s-a efectuat numărul corect de mișcări sau de componente | Contor: 4 suduri pe piesă, iar piesa nu se eliberează la 3 |
| **3. Pași de mișcare** (Motion-Step, sequence) | Verifică ordinea corectă a pașilor | Senzorii impun pasul 2 numai după pasul 1 |

## Matrice

| | Avertizare | Oprire / control |
| --- | --- | --- |
| Contact | Lumină când lipsește piesa | Mașina nu pornește fără piesă |
| Valoare fixă | Alarmă la număr incomplet | Blocarea eliberării piesei |
| Pași de mișcare | Mesaj „pas omis” | Interblocarea secvenței |

## În myApp

Aplicația nu comandă echipamente. Poka-Yoke se folosește **în software** (validări care împiedică o eroare de introducere) și **ca date** (checklist de verificare a dispozitivelor Poka-Yoke la început de schimb).

Exemple de software:
- Butonul de închidere a unei probleme rămâne inactiv până la completarea dovezii (oprire/control).
- Avertizarea la realizat > plan × 1,5 (avertizare).
