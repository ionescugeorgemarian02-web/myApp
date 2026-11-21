import { app } from "../state.js";
import { el, btn, input, confirmAsk, toast } from "../ui.js";
import { backup, restore, flush } from "../store.js";
import { seed } from "../seed.js";
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
function card(title) {
  let s = el("section", "", "card");
  s.append(el("h2", title));
  return s;
}
export function settings(version) {
  const main = document.querySelector("main"),
    data = app.data;
  main.append(el("h1", "Setări", "title"));
  // Schimburi.
  let s = card("Orele schimburilor");
  s.append(el("p", "Sfârșitul unui schimb este începutul următorului.", "hint"));
  let row = el("div", "", "threeCols");
  data.settings.hours.forEach((h, i) =>
    row.append(
      input(
        "Schimb " + (i + 1),
        h,
        (v) => {
          let hours = [...data.settings.hours];
          hours[i] = v;
          if (v && hours[0] < hours[1] && hours[1] < hours[2]) {
            data.settings.hours = hours;
            app.save();
            toast("Ore salvate");
          } else toast("Orele trebuie să fie în ordine crescătoare");
        },
        "time",
      ),
    ),
  );
  s.append(row);
  main.append(s);
  // Temă.
  s = card("Aspect");
  let seg = el("div", "", "segmented light");
  for (let t of ["Automat", "Luminoasă", "Întunecată"])
    seg.append(
      btn(
        t,
        () => {
          data.settings.theme = t;
          app.refresh();
        },
        data.settings.theme === t ? "on" : "",
      ),
    );
  s.append(seg);
  main.append(s);
  // Backup.
  s = card("Copie de siguranță");
  s.append(
    el(
      "p",
      "Datele stau doar pe acest telefon. Salvează o copie cel puțin o dată pe săptămână." +
        (data.settings.backup
          ? " Ultima: " + new Date(data.settings.backup).toLocaleDateString("ro") + "."
          : ""),
      "hint",
    ),
  );
  let f = el("input");
  f.type = "file";
  f.accept = ".json,application/json";
  f.hidden = true;
  f.onchange = async () => {
    try {
      let next = await restore(f.files[0]);
      if (
        await confirmAsk(
          "Înlocuiești caietul?",
          "Tot conținutul actual va fi înlocuit cu copia aleasă.",
          "Înlocuiește",
          true,
        )
      ) {
        app.data = next;
        app.undo = null;
        app.refresh();
        await flush();
        toast("Copie restaurată");
      }
    } catch (e) {
      toast("Import nereușit. " + e.message);
    }
    f.value = "";
  };
  let actions = el("div", "", "btnRow");
  actions.append(
    btn(
      "Salvează copia",
      () => {
        data.settings.backup = Date.now();
        app.save();
        backup(data);
        app.render();
      },
      "primary",
      "download",
    ),
    btn("Încarcă o copie", () => f.click(), "", "upload"),
    f,
  );
  s.append(actions);
  main.append(s);
  // Aplicația pe telefon.
  s = card("Aplicația pe telefon");
  if (app.standalone()) s.append(el("p", "✓ Rulează ca aplicație instalată.", "hint"));
  else if (app.installPrompt) s.append(btn("Instalează pe telefon", app.install, "primary", "phone"));
  else
    s.append(
      el(
        "p",
        isIOS
          ? "Pe iPhone: deschide pagina în Safari → Partajare → „Adaugă pe ecranul principal”."
          : "Pe Android: în Chrome apasă ⋮ → „Adaugă pe ecranul de pornire” → Instalează.",
        "hint",
      ),
    );
  let st = el("p", "", "hint");
  s.append(st);
  navigator.storage?.persisted?.().then((ok) => {
    st.textContent = ok
      ? "✓ Stocare permanentă – telefonul nu șterge datele singur."
      : "Stocare obișnuită – fă backup regulat.";
  });
  main.append(s);
  // Resetare.
  s = card("Resetare");
  s.append(
    el("p", "Șterge tot și pornește de la paginile inițiale.", "hint"),
    btn(
      "Resetează caietul",
      async () => {
        if (
          (await confirmAsk("Resetezi caietul?", "Toate datele de pe telefon vor fi șterse.", "Continuă", true)) &&
          (await confirmAsk("Ești sigur?", "Operația nu poate fi anulată. Ai salvat o copie?", "Șterge tot", true))
        ) {
          app.data = seed();
          app.undo = null;
          app.refresh();
          toast("Caiet resetat");
        }
      },
      "danger",
      "trash",
    ),
  );
  main.append(s, el("p", "Caietul Șefului de Schimb · versiunea " + version, "footer"));
}
