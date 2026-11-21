import { id } from "./ui.js";
import { item } from "./blocks/checklist.js";
import { column } from "./blocks/table.js";
export function block(type, title) {
  return {
    id: id(),
    type,
    title,
    ...({
      note: { text: "" },
      checklist: { items: [] },
      routine: { items: [], history: {}, key: "" },
      table: { cols: [], rows: [] },
      journal: { cols: [], rows: [] },
    }[type] || {}),
  };
}
export const GROUPS = [
  "În schimb",
  "Echipa",
  "Primele 90 de zile",
  "Paginile mele",
];
const KNOWN = {
  "Rutina schimbului": ["✅", 0],
  "Predare schimb": ["🔁", 0],
  "Probleme și acțiuni": ["⚠️", 0],
  "Notițe libere": ["📝", 0],
  Echipa: ["👥", 1],
  "Unu la unu": ["💬", 1],
  Contacte: ["📞", 1],
  "Săptămâna 1": ["🗓️", 2],
  "Plan 30-60-90": ["🎯", 2],
  Indicatori: ["📊", 2],
};
// Paginile fără grup primesc grupul și pictograma potrivite (și în caietele vechi).
export function organize(data) {
  let changed = false;
  // „Automat” era valoarea inițială a caietelor anterioare.
  if (!data.settings.appearanceVersion) {
    if (!data.settings.theme || data.settings.theme === "Automat")
      data.settings.theme = "Întunecată";
    data.settings.appearanceVersion = 1;
    changed = true;
  }
  for (const p of [...data.pages, ...data.templates])
    if (typeof p.group !== "string") {
      const k = KNOWN[p.title];
      p.group = GROUPS[k ? k[1] : 3];
      if (k && !p.emoji) p.emoji = k[0];
      changed = true;
    }
  return changed;
}
export const page = (title, blocks = [], group = GROUPS[3]) => ({
  id: id(),
  title,
  emoji: "",
  group,
  order: 0,
  archived: false,
  blocks,
});
export function seed() {
  let week = page("Săptămâna 1");
  const days = [
    [
      "Luni",
      [
        [
          "Discuție cu șeful (20–30 min)",
          "Ce înseamnă un schimb bun? După ce mă evaluezi? Ce pot decide singur? Cum vrei să-ți raportez?",
          "Am notat 3–5 priorități și cum vrea raportul.",
        ],
        ["Cer fișa postului", "", "O am pe hârtie sau pe email."],
        [
          "Discursul de început de schimb (max 2 min)",
          "3 standarde: siguranța nu se negociază, nicio piesă îndoielnică nu pleacă mai departe, ne vorbim cu respect. 3 promisiuni: răspund la orice problemă în 24 de ore, nu critic pe nimeni în fața altora, vă apăr când aveți dreptate. Anunț discuțiile unu la unu.",
          "L-am ținut.",
        ],
        [
          "Tur complet de la materia primă la livrare",
          "",
          "Pot desena fluxul zonei mele pe o foaie.",
        ],
        [
          "Trec numele și postul fiecărui om în „Echipa”",
          "",
          "Tabelul are tot schimbul.",
        ],
        [
          "Asist la predarea schimbului",
          "Producție, probleme, mașini oprite, calitate, absențe.",
          "Știu ce se predă și cum.",
        ],
        [
          "Rezumat de 3 rânduri către șef",
          "Ce s-a produs, ce probleme au fost, ce am făcut.",
          "L-am trimis.",
        ],
      ],
    ],
    [
      "Marți",
      [
        [
          "Verific echipamentul de protecție și apărătorile pe toate posturile",
          "La sudură: mască, mănuși, aspirație.",
          "Am raportat tot ce lipsește.",
        ],
        [
          "Cer planul de control și instrucțiunile de lucru",
          "",
          "Le am pentru fiecare post din zona mea.",
        ],
        [
          "Aflu procedura pentru piese suspecte",
          "Unde se pun, cine decide, ce formular se completează.",
          "O pot explica unui operator.",
        ],
        [
          "Discuții unu la unu: primele 3 persoane",
          "Răspunsurile le trec în „Unu la unu”.",
          "3 rânduri completate.",
        ],
      ],
    ],
    [
      "Miercuri",
      [
        [
          "Acces și instruire SAP pentru raportarea producției",
          "",
          "Am făcut singur o raportare.",
        ],
        [
          "Cunosc șefii de la mentenanță, calitate și logistică",
          "Îi întreb: „Ce aveți nevoie de la schimbul meu?”",
          "Am numele și telefonul lor în „Contacte”.",
        ],
        [
          "Trec cifrele de pornire în „Indicatori”",
          "",
          "Toate cele 5 cifre sunt trecute, cu sursa lor.",
        ],
        [
          "Discuții unu la unu: următoarele persoane",
          "",
          "Încă 3–4 rânduri completate.",
        ],
      ],
    ],
    [
      "Joi",
      [
        [
          "Testul celor 3 întrebări la fiecare operator",
          "Știe ce se așteaptă de la el? Are materialele și sculele? E pus unde e cel mai bun?",
          "Unde e „nu”, am notat ce lipsește.",
        ],
        [
          "Aleg o problemă mică de rezolvat rapid",
          "Ceva ce îi enervează pe toți și se rezolvă în câteva zile.",
          "Are responsabil și termen.",
        ],
        [
          "Tur pe linie cu listă fixă, la aceeași oră",
          "Siguranță, calitate, plan față de realizat, ordine (5S), oameni.",
          "Lista e scrisă și folosită.",
        ],
        ["Discuții unu la unu: continui", "", "Rânduri noi completate."],
      ],
    ],
    [
      "Vineri",
      [
        [
          "Rezolv problema mică și spun echipei a cui a fost ideea",
          "",
          "Rezolvată și anunțată.",
        ],
        [
          "Prezint șefului planul 30-60-90 și cifrele de pornire",
          "",
          "Șeful a văzut planul și și-a dat părerea.",
        ],
        [
          "Cer feedback șefului",
          "Ce fac bine? Ce ar trebui să îmbunătățesc?",
          "Am 1 lucru de păstrat și 1 de corectat.",
        ],
        [
          "Verific dacă am vorbit unu la unu cu toată echipa",
          "Cine a rămas, programez în săptămâna 2.",
          "100% făcut sau programat.",
        ],
      ],
    ],
  ];
  for (const [d, rows] of days) {
    let b = block("checklist", "Lista de bifat");
    b.items = rows.map((r) => item(...r));
    week.blocks.push(block("section", d), b);
  }
  function list(title, type, rows) {
    let b = block(type, title);
    b.items = rows.map((t) => item(t));
    return page(title, [b]);
  }
  function grid(title, type, cols, rows = []) {
    let b = block(type, title);
    b.cols = cols.map((s) => column(...(Array.isArray(s) ? s : [s])));
    b.rows = rows.map((t) => ({ id: id(), values: { [b.cols[0].id]: t } }));
    return page(title, [b]);
  }
  let pages = [
    list("Rutina schimbului", "routine", [
      "Preiau schimbul de la colegul anterior.",
      "Ședința de început (5–10 min): ținta zilei, avertismente de siguranță și calitate, cine unde lucrează.",
      "Verific echipamentul de protecție.",
      "Tur pe linie: siguranță, calitate, plan față de realizat, ordine (5S), oameni.",
      "Verific producția pe oră față de plan.",
      "Predau schimbul colegului următor.",
      "Trimit rezumatul către șef.",
    ]),
    grid("Predare schimb", "journal", [
      ["Data", "date"],
      ["Schimb", "select", ["1", "2", "3"]],
      "Produs față de plan",
      "Probleme",
      "Mașini oprite",
      "Calitate / rebut",
      "Absențe",
      "De urmărit",
    ]),
    grid("Echipa", "table", [
      "Nume",
      "Post",
      "Telefon",
      "Instruit pe posturile",
      "Observații",
    ]),
    grid("Unu la unu", "table", [
      ["Data", "date"],
      "Nume",
      "Ce îl încurcă",
      "Ce aș schimba / ce n-aș schimba",
      "Ce îl motivează",
      "Ce am promis",
      ["Termen promisiune", "date"],
      ["Rezolvat", "checkbox"],
    ]),
    grid(
      "Indicatori",
      "table",
      [
        "Indicator",
        ["Valoare de pornire", "number"],
        "Sursa",
        ...["Săpt. 2", "Săpt. 4", "Săpt. 8", "Ținta la ziua 90"].map((x) => [
          x,
          "number",
        ]),
      ],
      [
        "Accidente și incidente evitate la limită",
        "Rebut / FPY (%)",
        "OEE (%)",
        "Plan realizat (%)",
        "Absențe (%)",
      ],
    ),
    list("Plan 30-60-90", "checklist", [
      "Ziua 30: discuții unu la unu cu toată echipa și primele observații prezentate șefului.",
      "Ziua 60: o îmbunătățire implementată și măsurată.",
      "Ziua 90: raport cu cifrele față de cele de pornire.",
    ]),
    grid("Contacte", "table", [
      "Departament",
      "Nume",
      "Telefon",
      "Ce cere de la mine",
    ]),
    grid("Probleme și acțiuni", "table", [
      ["Data", "date"],
      "Problemă",
      "Cauza (5 De ce)",
      "Acțiune",
      "Responsabil",
      ["Termen", "date"],
      ["Stare", "select", ["Deschis", "În lucru", "Închis"]],
    ]),
    page("Notițe libere", [block("note", "Notițe libere")]),
    week,
  ];
  // Ordinea: întâi ce folosești zilnic, apoi echipa, apoi planul de început.
  const order = Object.keys(KNOWN);
  pages.sort((a, b) => order.indexOf(a.title) - order.indexOf(b.title));
  pages.forEach((p, i) => {
    p.order = i;
    delete p.group;
  });
  const out = {
    schemaVersion: 1,
    notes: [],
    pages,
    templates: [],
    settings: {
      theme: "Întunecată",
      hours: ["06:00", "14:00", "22:00"],
      createdAt: Date.now(),
      backup: null,
    },
  };
  organize(out);
  return out;
}
