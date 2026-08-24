import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { Theme, ResolvedTheme } from "../types/reader";

/**
 * Returns CSS filter for PDF canvas background and text inversion based on theme.
 * Keeps contrast sharp and preserves colors via hue rotation.
 */
export const getPdfFilter = (theme: ResolvedTheme | Theme | string): string => {
  if (theme === "amoled") {
    // Pure pitch-black AMOLED filter: 100% inverted with hue rotated to preserve color fidelity and boost contrast
    return "invert(1) hue-rotate(180deg) contrast(1.05)";
  }
  if (theme === "dark") {
    // Dark slate/charcoal filter: comfortable dark background with crisp off-white text and high contrast
    return "invert(0.88) hue-rotate(180deg) contrast(1.15) brightness(0.95)";
  }
  // Light / Default
  return "none";
};

export const resolveTheme = (t: Theme): ResolvedTheme => {
  if (t === "system") {
    const prefersDark = typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "light";
  }
  return t;
};

export const resolveIsDark = (t: Theme): boolean => {
  const resolved = resolveTheme(t);
  return resolved === "dark" || resolved === "amoled";
};

export function useTheme(): [boolean, Theme, (t: Theme) => void, ResolvedTheme] {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      return (localStorage.getItem("folio-theme") as Theme) || "system";
    } catch {
      return "system";
    }
  });
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(theme));
  const [isDark, setIsDark] = useState(() => resolveIsDark(theme));

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    const resolved = resolveTheme(t);
    setResolvedTheme(resolved);
    setIsDark(resolved === "dark" || resolved === "amoled");
    try {
      localStorage.setItem("folio-theme", t);
    } catch {
      // Ignore storage write errors (e.g. private browsing)
    }
  }, []);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const h = () => {
      const resolved = resolveTheme("system");
      setResolvedTheme(resolved);
      setIsDark(resolved === "dark" || resolved === "amoled");
    };
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, [theme]);

  return [isDark, theme, setTheme, resolvedTheme];
}

export const DarkCtx = createContext(false);
export const useDark = () => useContext(DarkCtx);

export const ThemeCtx = createContext<ResolvedTheme>("light");
export const useThemeMode = () => useContext(ThemeCtx);

export const dk = (l: string, d: string, isDark: boolean) => (isDark ? d : l);
export const tm = (l: string, d: string, a: string, t: ResolvedTheme | Theme) => {
  if (t === "amoled") return a;
  if (t === "dark") return d;
  return l;
};

