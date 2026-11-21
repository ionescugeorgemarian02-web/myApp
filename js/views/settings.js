import { app } from "../state.js";
import { el, btn, input, details, confirmAsk, toast } from "../ui.js";
import { backup, restore, replaceNotebook, validHours, flush } from "../store.js";
import { seed, organize } from "../seed.js";

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
const hoursDrafts = new WeakMap();
const deviceTheme = matchMedia("(prefers-color-scheme: dark)");

export function applyTheme(preference) {
  const light = preference === "Luminoasă" || (preference === "Automat" && !deviceTheme.matches);
  const root = document.documentElement;
  const theme = light ? "Luminoasă" : "Întunecată";
  if (root.dataset.theme === theme) return;
  root.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]').content =
    getComputedStyle(root).getPropertyValue("--bg").trim();
}

deviceTheme.addEventListener("change", () => {
  if (app.data?.settings.theme === "Automat") applyTheme("Automat");
});

function card(title) {
  const section = el("div", "", "settingsBody");
  section.append(el("h2", title));
  return section;
}

function schedule(preferences) {
  const section = card("Programul schimburilor");
  const draft = hoursDrafts.get(preferences) || [...preferences.hours];
  const row = el("div", "", "scheduleTimes");
  const message = el("p", "", "scheduleMessage");
  message.id = "scheduleMessage";
  message.setAttribute("aria-live", "polite");

  const apply = btn("Aplică programul", async () => {
    if (!validHours(draft)) return;
    preferences.hours = [...draft];
    delete preferences.slot;
    delete preferences.shift;
    hoursDrafts.delete(preferences);
    app.refresh();
    try {
      await flush();
      toast("Programul a fost aplicat");
    } catch {
      toast("Salvarea a eșuat. Verifică spațiul liber din browser.");
    }
  }, "primary", "check");

  function validate() {
    const changed = draft.some((h, i) => h !== preferences.hours[i]);
    const valid = validHours(draft);
    apply.disabled = !valid || !changed;
    message.textContent = !valid
      ? "Completează cele trei ore în ordine crescătoare."
      : changed ? "Program modificat. Apasă „Aplică programul” pentru salvare." : "";
    message.classList.toggle("invalid", !valid);
    row.querySelectorAll("input").forEach((field, i) => {
      field.setAttribute("aria-invalid", !draft[i] || (i > 0 && draft[i] <= draft[i - 1]));
    });
  }

  draft.forEach((hour, i) => {
    const field = input("Schimb " + (i + 1), hour, (value) => {
      draft[i] = value;
      hoursDrafts.set(preferences, draft);
      validate();
    }, "time");
    field.querySelector("input").setAttribute("aria-describedby", message.id);
    row.append(field);
  });
  validate();
  section.append(
    el("p", "Alege ora de început pentru fiecare schimb. Caietul folosește aceste ore pe pagina Azi.", "hint"),
    row, message, apply,
  );
  return section;
}

function appearance(preferences) {
  const section = card("Aspect");
  const choices = el("div", "", "segmented light");
  choices.setAttribute("role", "group");
  choices.setAttribute("aria-label", "Tema caietului");
  for (const theme of ["Întunecată", "Luminoasă", "Automat"]) {
    const selected = preferences.theme === theme;
    const choice = btn(theme, () => {
      preferences.theme = theme;
      app.refresh();
    }, selected ? "on" : "");
    choice.setAttribute("aria-pressed", selected);
    choices.append(choice);
  }
  section.append(el("p", "„Automat” folosește tema dispozitivului.", "hint"), choices);
  return section;
}

async function switchNotebook(next) {
  const main = document.querySelector("main"), header = document.querySelector("header");
  main.inert = header.inert = true;
  try {
    organize(next);
    await replaceNotebook(next);
    app.data = next;
    app.undo = null;
    app.editing = null;
    app.open.clear();
    app.render();
  } finally {
    main.inert = header.inert = false;
  }
}

function backupCard(data) {
  const section = card("Copie de siguranță");
  const feedback = el("p", "", "settingsFeedback");
  feedback.setAttribute("role", "status");
  section.append(el("p", "Caietul se salvează în acest browser. Descarcă o copie pentru a-l recupera sau pentru a-l muta pe alt dispozitiv.", "hint"));
  if (data.settings.backup)
    section.append(el("p", "Ultimul export · " + new Date(data.settings.backup).toLocaleDateString("ro"), "settingsMetadata"));

  const file = el("input");
  file.type = "file";
  file.accept = ".json,application/json";
  file.hidden = true;
  file.onchange = async () => {
    const selected = file.files[0];
    if (!selected) return;
    try {
      const next = await restore(selected);
      const pages = next.pages.length;
      if (await confirmAsk("Înlocuiești caietul?",
        "Fișierul „" + selected.name + "” conține " + pages + (pages === 1 ? " pagină." : " pagini.") +
        " Restaurarea înlocuiește toate datele din caietul deschis.", "Înlocuiește", true)) {
        await switchNotebook(next);
        toast("Copie restaurată");
      }
    } catch (e) {
      feedback.textContent = "Import nereușit. " + e.message;
    } finally {
      file.value = "";
    }
  };
  const actions = el("div", "", "btnRow");
  actions.append(btn("Salvează copia", () => {
    const date = Date.now();
    backup({ ...data, settings: { ...data.settings, backup: date } });
    data.settings.backup = date;
    app.refresh();
  }, "primary", "download"), btn("Încarcă o copie", () => file.click(), "", "upload"), file);
  section.append(actions, feedback);
  return section;
}

export function settings(version) {
  const main = document.querySelector("main"), data = app.data;
  const grid = el("div", "", "settingsGrid");
  main.append(el("h1", "Setări", "title"), grid);
  function addSection(body, key) {
    const heading = body.querySelector("h2");
    const section = details(heading.textContent, "settings-" + key, "settingsSection");
    section.name = "settings-sections";
    heading.remove();
    section.append(body);
    grid.append(section);
  }
  addSection(schedule(data.settings), "schedule");
  addSection(appearance(data.settings), "appearance");
  addSection(backupCard(data), "backup");

  const access = card("Deschiderea caietului");
  access.append(el("p", "Revino la același link în același browser pentru a continua unde ai rămas.", "hint"));
  if (app.standalone()) access.append(el("p", "Aplicația este instalată.", "settingsMetadata"));
  else if (app.installPrompt) access.append(btn("Instalează aplicația", app.install, "", "phone"));
  else {
    const guide = details("Cum adaug o pictogramă pe telefon?", "install-guide", "settingsHelp");
    const instructions = [
      "Android · În meniul Chrome, alege „Adaugă pe ecranul de pornire”.",
      "iPhone · În Safari, alege Partajare, apoi „Adaugă pe ecranul principal”.",
    ];
    if (isIOS) instructions.reverse();
    for (const text of instructions) guide.append(el("p", text, "desc"));
    access.append(guide);
  }
  if (navigator.storage?.persisted) {
    const storage = el("p", "", "settingsMetadata");
    access.append(storage);
    navigator.storage.persisted().then((persistent) => {
      storage.textContent = persistent ? "Stocare persistentă activă." : "Stocare standard în browser.";
    }).catch(() => storage.remove());
  }
  addSection(access, "access");

  const reset = details("Resetarea caietului", "reset-settings", "settingsReset");
  reset.append(el("p", "Pornești din nou cu paginile inițiale. Pentru a păstra ce ai scris, descarcă întâi o copie.", "desc"));
  reset.append(btn("Resetează caietul", async () => {
    if (await confirmAsk("Resetezi caietul?", "Toate datele din acest browser vor fi șterse.", "Continuă", true) &&
      await confirmAsk("Ștergi toate înregistrările?", "După resetare le poți recupera doar dintr-o copie descărcată.", "Șterge tot", true)) {
      try {
        await switchNotebook(seed());
        toast("Caiet resetat");
      } catch {
        toast("Resetarea a eșuat. Verifică spațiul liber și încearcă din nou.");
      }
    }
  }, "danger", "trash"));
  main.append(reset, el("p", "Caietul Șefului de Schimb · versiunea " + version, "footer"));
}
