import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { Theme } from "../types/reader";

export function useTheme(): [boolean, Theme, (t: Theme) => void] {
  const prefersDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolve = (t: Theme) => t === "dark" || (t === "system" && prefersDark());
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      return (localStorage.getItem("folio-theme") as Theme) || "system";
    } catch {
      return "system";
    }
  });
  const [isDark, setIsDark] = useState(() => resolve(theme));

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    setIsDark(resolve(t));
    try {
      localStorage.setItem("folio-theme", t);
    } catch {}
  }, []);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const h = () => setIsDark(prefersDark());
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, [theme]);

  return [isDark, theme, setTheme];
}

export const DarkCtx = createContext(false);
export const useDark = () => useContext(DarkCtx);
export const dk = (l: string, d: string, isDark: boolean) => (isDark ? d : l);
