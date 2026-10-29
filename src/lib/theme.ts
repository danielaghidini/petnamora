export type Theme = "light" | "dark";
export const DEFAULT_THEME: Theme = "light";

const STORAGE_KEY = "petnamora:theme";
const CHANGE_EVENT = "petnamora:theme-change";

// Runs before the page paints so the saved preference also applies to dialogs
// and the first server-rendered frame.
export const themeInitializationScript = `(() => {
  let theme;
  try { theme = localStorage.getItem(${JSON.stringify(STORAGE_KEY)}); } catch {}
  if (theme !== 'light' && theme !== 'dark') {
    theme = ${JSON.stringify(DEFAULT_THEME)};
  }
  document.documentElement.dataset.theme = theme;
})();`;

export function getTheme(): Theme {
  const theme = document.documentElement.dataset.theme;
  return theme === "light" || theme === "dark" ? theme : DEFAULT_THEME;
}

export function getServerTheme(): Theme {
  return DEFAULT_THEME;
}

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // The selector still works when browser storage is unavailable.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeToTheme(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    const saved = event.newValue;
    document.documentElement.dataset.theme =
      saved === "light" || saved === "dark" ? saved : DEFAULT_THEME;
    onChange();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}
