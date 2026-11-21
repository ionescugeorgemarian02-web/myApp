// Starea comună a aplicației. Funcțiile (refresh, remove…) sunt puse de app.js.
export const app = {
  data: null,
  current: null,
  undo: null,
  editing: null,
  installPrompt: null,
  open: new Set(),
};
