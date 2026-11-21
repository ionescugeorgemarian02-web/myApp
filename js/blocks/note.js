import { input, now } from "../ui.js";
export function note(b, c) {
  let f = input(
    "",
    b.text,
    (v) => {
      b.text = v;
      b.updated = now();
      c.save();
    },
    "area",
  );
  f.classList.add("noteField");
  f.querySelector("textarea").placeholder = "Scrie aici…";
  f.querySelector("textarea").setAttribute("aria-label", b.title);
  return f;
}
