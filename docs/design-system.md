# myApp 2.0 — Design system „Andon”

Ghidat de `frontend-design`, `ui-ux-pro-max` (stil recomandat: Minimalism/Swiss + Flat, Real-Time Monitoring, Data-Dense Dashboard; pereche tipografică condensată Barlow) și `industrial-dashboard-ux`.

## Idee

Interfața e un tablou de hală, nu un SaaS. Totul este monocrom (oțel, beton, cerneală). **Culoarea apare numai ca semnal de stare**, ca pe un turn Andon. Când un ecran e colorat, ceva cere atenție. Elementul memorabil este **rigla schimbului**: o bandă de 8 celule orare care arată timpul scurs, ora curentă și realizarea pe fiecare oră.

Respins intenționat: aproape-negru + accent galben (v4.4), carduri identice rotunjite, gradiente, glassmorphism, umbre decorative, etichete ALL CAPS.

## Culoare (tokens în `css/tokens.css`)

| Rol | Light | Dark |
| --- | --- | --- |
| Fundal (beton) | `#E4E8EA` | `#12181D` |
| Suprafață | `#FBFCFC` | `#1A2228` |
| Suprafață 2 | `#EEF1F3` | `#212B32` |
| Linie | `#CBD3D7` | `#2E3A43` |
| Cerneală | `#12202A` | `#E8EDF0` |
| Text secundar | `#4A5862` | `#B3BEC5` |
| În funcțiune | `#1E8E50` | `#34C47C` |
| Atenție | `#A86400` | `#F5A524` |
| Oprit | `#C93A2E` | `#FF6B5E` |
| Changeover | `#2F62C8` | `#77A2FF` |
| Neplanificat | `#75828B` | `#75828B` |
| Necunoscut | hașură gri | hașură gri |

Acțiunea principală folosește cerneala ca umplere (alb pe cerneală), nu o culoare de brand. Fiecare stare are și text sau formă, nu doar culoare.

## Tipografie

- **Barlow Semi Condensed 600** (local, OFL): cifre, titluri, etichete de linie. Folosește `tabular-nums`.
- **system-ui**: text curent, formulare.
- Scară: 12 / 13.5 / 15 / 17 / 20 / 26 / 34 / 48 px. Line-height 1.35 pentru text, 1.05 pentru cifre mari.
- Etichetele sunt scrise cu literă mică (sentence case), fără ALL CAPS.

## Spațiu și formă

- Grilă de 4 px: 4, 8, 12, 16, 20, 24, 32, 40.
- Raze: 3 (chip), 6 (control), 10 (panou), 14 (bottom sheet). Panourile au margine de 1 px, nu umbră.
- Ținte tactile ≥ 44 px (48 pentru acțiunile principale), cu spațiu ≥ 8 px între acțiuni opuse.

## Layout

- **Telefon:** bară de schimb sus (schimb, timp rămas, starea salvării); navigare jos (Azi, Producție, Echipă, Calitate, Mai mult) plus butonul de acțiune rapidă „+” în zona degetului mare. Respectă safe-area.
- **Desktop ≥ 1024 px:** sidebar de 240 px cu secțiuni și subpagini, conținut de maxim 1200 px, panou contextual unde e util.
- Tabelele largi au o reprezentare alternativă pe telefon (rânduri-card sau listă pe operator).

## Componente

Bară de schimb, navigare, buton (primar / secundar / pericol / text), chip de stare, câmp numeric cu tastatură numerică, selector cu căutare (bottom sheet), control segmentat, bottom sheet, toast cu Undo, empty state cu acțiune, error state, KPI, riglă de schimb, rândul de linie (rail), tabel compact, Kanban, heatmap, Pareto, Gantt, grafic plan vs. realizat.

## Mișcare

Doar ca răspuns la o acțiune (deschiderea unui sheet, confirmare). Durata ≤ 160 ms. `prefers-reduced-motion` dezactivează tot.
