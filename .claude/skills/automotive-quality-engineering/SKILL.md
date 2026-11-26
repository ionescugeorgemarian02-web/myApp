---
name: automotive-quality-engineering
description: Ingineria calității în automotive pentru myApp. Acoperă 8D (D0–D8), analiza cauzei rădăcină, Ishikawa, 5 Why, CAPA, managementul neconformităților, containment, acțiuni corective și preventive, verificarea eficacității, FMEA/PFMEA, Control Plan, SPC, MSA, APQP, PPAP, trasabilitate, First Off, caracteristici critice, quality gates, Red Box, IATF 16949 și ISO 9001, plus cele trei metode Poka-Yoke (contact, valoare fixă, pași de mișcare) separate de funcțiile de avertizare și de oprire. Folosește-l când proiectezi sau verifici fluxul Probleme și acțiuni, fișe NCR sau 8D, câmpuri de calitate, reguli de închidere a acțiunilor sau texte despre standarde de calitate.
---

# Ingineria calității în automotive

## Când se activează

- Modifici fluxul „Probleme și acțiuni”: câmpuri, stări, reguli de închidere.
- Proiectezi fișe 8D, NCR, First Off, Red Box sau quality gate.
- Scrii texte despre IATF, ISO, FMEA, SPC sau MSA.
- Analizezi o problemă de calitate cu date sintetice.

## Metodologie

1. **Descrie problema factual.** Ce, unde, când, cât, cum a fost detectată, comparat cu cerința. Fără cauză în descriere.
2. **Containment imediat** (D3): protejează clientul. Blochează, sortează și marchează (Red Box). Containment-ul nu este acțiune corectivă.
3. **Cauza rădăcină** (D4): două cauze separate. Una explică de ce a apărut defectul (occurrence), cealaltă de ce nu a fost detectat (escape). Fiecare ipoteză se verifică cu date. Ishikawa organizează ipotezele, iar 5 Why urmărește lanțul. Vezi `references/rca-8d.md`.
4. **Acțiuni corective permanente** (D5–D6): fiecare acțiune vizează o cauză verificată și are responsabil, termen și dovadă.
5. **Eficacitatea** se verifică după implementare, cu date (de ex. zero recurențe pe o perioadă definită local). Aplicația cere deja dovada eficacității și concluzia la închidere. Regula se păstrează.
6. **Prevenirea** (D7): actualizezi PFMEA, Control Plan, instrucțiunea de lucru și extinzi măsura la procese similare (lessons learned).
7. **Poka-Yoke:** alegi metoda (contact / valoare fixă / pași de mișcare) și funcția (avertizare / oprire). Vezi `references/poka-yoke.md`.

## Reguli

- **Fără pretenție de conformitate.** Aplicația nu face un proces „conform IATF 16949” sau „certificat ISO 9001”. Certificarea o acordă organisme de certificare prin audit. Formulare acceptate: „sprijină documentarea”, „structură inspirată din 8D”.
- **Nu reproduce standarde.** IATF 16949, ISO 9001 și manualele AIAG/VDA sunt protejate și se vând. Se folosesc doar termenii lor, nu textul.
- **Formatul 8D al clientului are prioritate.** Câmpurile se configurează. Nu se impune o versiune „oficială”.
- **Închiderea** cere acțiune corectivă, dovadă și concluzie. Nu se slăbește regula existentă.
- Ratingurile FMEA (S, O, D) și metoda de prioritizare (RPN sau Action Priority, după AIAG-VDA) sunt alegeri locale. Nu se presupune o metodă.
- Pentru analize reale de date (SPC, clustere pe lot sau schimb) există modelul din pluginul `claude-for-manufacturing`: `root-cause-capa`, `ncr-writeup`, `inspection-to-capa`. Acolo cauzele candidate se clasifică cu dovezi pro și contra.

## Referințe

- `references/rca-8d.md`: D0–D8, Ishikawa (6M), 5 Why, CAPA, câmpuri recomandate.
- `references/poka-yoke.md`: cele trei metode și cele două funcții, cu exemple.
- `references/core-tools.md`: FMEA, Control Plan, SPC, MSA, APQP, PPAP, First Off, Red Box, quality gates (terminologie).

## Exemplu (sintetic)

„Linia A, PN-TEST-001: 12 piese cu cordon de sudură incomplet, detectate la inspecția finală pe schimbul 2.” Containment: blocarea lotului curent și sortarea a 100 % din WIP. D4: o ipoteză de apariție (duză uzată) se verifică cu istoricul schimbărilor de duză. O ipoteză de neidentificare (criteriu vizual neclar) se verifică printr-un test cu probe etalon. Abia după verificare urmează D5.

## Criterii de validare

- [ ] Containment-ul, cauza și acțiunea corectivă sunt câmpuri distincte.
- [ ] Cauzele de apariție și de neidentificare sunt separate.
- [ ] Nicio formulare nu afirmă conformitate sau certificare.
- [ ] Poka-Yoke: metoda și funcția apar separat.
- [ ] Testele folosesc probleme sintetice.
