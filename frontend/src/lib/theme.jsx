import React, { createContext, useContext, useEffect, useState } from "react";
import { Sun, Moon } from "@phosphor-icons/react";

const ThemeCtx = createContext({ theme: "light", toggle: () => {} });

function initialTheme() {
  const stored = localStorage.getItem("arevei-theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(initialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e) => {
      if (!localStorage.getItem("arevei-theme")) setTheme(e.matches ? "dark" : "light");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const toggle = () =>
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      localStorage.setItem("arevei-theme", next);
      return next;
    });

  return <ThemeCtx.Provider value={{ theme, toggle }}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);

export function ThemeToggle({ className = "" }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      data-testid="theme-toggle"
      aria-label="Toggle theme"
      className={`w-9 h-9 rounded-full border border-[color:var(--ar-line)] flex items-center justify-center text-[color:var(--ar-ink-2)] hover:text-[color:var(--ar-ink)] hover:border-[color:var(--ar-ink-3)] transition-colors shrink-0 ${className}`}
    >
      {theme === "dark" ? <Sun size={16} weight="bold" /> : <Moon size={16} weight="bold" />}
    </button>
  );
}
