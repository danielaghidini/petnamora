"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import {
  getServerTheme,
  getTheme,
  setTheme,
  subscribeToTheme,
} from "@/lib/theme";

export function ThemeSelector() {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getTheme,
    getServerTheme,
  );

  return (
    <div className="theme-selector" role="group" aria-label="Tema da interface">
      <button
        type="button"
        aria-label="Tema claro"
        aria-pressed={theme === "light"}
        onClick={() => setTheme("light")}
      >
        <Sun size={16} aria-hidden="true" />
        <span>Claro</span>
      </button>
      <button
        type="button"
        aria-label="Tema escuro"
        aria-pressed={theme === "dark"}
        onClick={() => setTheme("dark")}
      >
        <Moon size={16} aria-hidden="true" />
        <span>Escuro</span>
      </button>
    </div>
  );
}
