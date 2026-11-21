import { input, now } from "../ui.js";
export function note(b, c) {
  return input(
    "Textul notiței",
    b.text,
    (v) => {
      b.text = v;
      b.updated = now();
      c.save();
    },
    "area",
  );
}
